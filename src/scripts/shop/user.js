import { Mu, MuMx, attrToSelector } from '../mu';
import { ShopMxSubscriber } from './helper/subscriber';
import { ViewTemplateMixin } from './helper/viewmx';

export class UserController {
  constructor() {
    this.user = null;
    // prepare prop setters
    this._setUser = this._setProp.bind(this, 'profile');
    this._setAddress = this._setProp.bind(this, 'address');
    this._setCard = this._setProp.bind(this, 'card');
    // echo local profile to global context
    this.on('user.profile', p => this.context.set('global.profile', p));
    // initialize user when ready
    this.mu.on('ready', () => {
      this.getUser()
        .then(() => this.context.emit('user.ready'));
    });
  }

  _clear() {
    this._setUser(null);
    this._setAddress(null);
    this._setCard(null);
    return this;
  }

  _setProp(prop, val) {
    Object.assign(this, {[`_${prop}`]: val});
    this.emit(`user.${prop}`, val);
    return val;
  }

  _userError(err) {
    this._clear().emit('user.error', err);
  }

  _getRes(res, setter) {
    if (res.data && res.data.status_code !== 500) {
      return setter(res.data);
    } else {
      return Promise.reject(res.data);
    }
  }

  _postRes(res) {
    if (res.data && res.data.status_code !== 500) {
      return res.data;
    } else {
      return Promise.reject(res.data.error);
    }
  }

  getUser() {
    // NOTE: the customers service reads from the session cookie and therefore the {id} param is ignored
    const id = this._user ? this._user.id : 'id';
    return this.mu.api.get(`/customers/${id}`)
      .then(res => this._getRes(res, this._setUser))
      .catch(e => this._userError(e))
  }

  register(profile) {
    return this.mu.api.post('/register', profile)
      .then(() => this.getUser());
  }

  login(username, password) {
    return this.mu.api.get('/login', {
      auth: { username, password }
    }).then(() => this.getUser());
  }

  logout() {
    this.mu.api.get('/logout')
      .then(res => this._clear())
      .catch(e => this._userError(e));
  }

  /**
   * get user shipping address
   */
  address() {
    return this.mu.api.get('/address')
      .then(res => this._getRes(res, this._setAddress))
      .catch(() => this._setAddress(null));
  }

  /**
   * update user address
   * @param {*} address 
   */
  saveAddress(address) {
    const { id } = this._address || {};
    // the "backend" only supports one address
    return Promise.resolve(id && this.mu.api.delete(`/addresses/${id}`).catch())
      .then(() => this.mu.api.post('/addresses', address))
      .then(res => this._postRes(res))
      .then(() => this.address());
  }

  /**
   * get stored card information
   */
  card() {
    return this.mu.api.get('/card')
      .then(res => this._getRes(res, this._setCard))
      .catch(() => this._setCard(null));
  }

  /**
   * store user card information
   */
  saveCard(card) {
    const { id } = this._card || {};
    return Promise.resolve(id && this.mu.api.delete(`/cards/${id}`).catch())
      .then(() => this.mu.api.post('/cards', card))
      .then(res => this._postRes(res))
      .then(() => this.card());
  }
}


const USER_MICRO = {
  VIEW: 'mu-user-view',
  TOOLBAR: 'mu-user-toolbar',
  ADDRESS: 'mu-user-address',
  PAYMENT: 'mu-user-payment',
};


/**
 * Mixin for user-dependent /views/{viewName} rendering
 * @param {*} ctor 
 * @param {string} [attr] 
 * @param {string} [viewName] 
 */
export const UserViewMixin = (ctor, attr, viewName) => class extends MuMx.compose(ctor,
  [ViewTemplateMixin, attr, viewName],
  ShopMxSubscriber,
  ) {

  constructor() {
    super();
    // listen to user change
    this.subscribe('user.profile', this.mu.user, this.onUpdate.bind(this, 'profile'))
      .subscribe('user.address', this.mu.user, this.onUpdate.bind(this, 'address'))
      .subscribe('user.card', this.mu.user, this.onUpdate.bind(this, 'card'));
  }

  _debug(...args) {
    // console.log(...args);
  }

  onUpdate(prop, data) {
    return this.render({ [prop]: data });
  }
}

/**
 * arbitrary any user view
 */
export class UserView extends MuMx.compose(null, [UserViewMixin, USER_MICRO.VIEW]) {

}

/**
 * Specific user-control for toolbar/off-canvas login + registration
 */
export class UserToolbar extends MuMx.compose(null, [UserViewMixin, null, 'userToolbar.html']) {

  constructor() {
    super();
    // view context bindings
    // console.log('TOOLBAR SUBSCRIBING');
    this.subscribeOne('form.auth', this.context, f => f && f.one('submit', this.submitAuth.bind(this)))
      .subscribeOne('form.reg', this.context, f => f && f.one('submit', this.submitReg.bind(this)));
  }

  onMount() {
    // console.log('TOOLBAR MOUNT', this.node);
    this.context.extend({
      inline: this._ctxAttrBool('inline'),
      offcanvas: this.node.getAttribute(USER_MICRO.TOOLBAR) === 'offcanvas',
    });
    this._debug('MOUNTED');
    return super.onMount();
  }

  // onDispose() {
  //   const forms = this.context.get('form') || {};
  //   Object.keys(forms).forEach(name => forms[name].one('submit', () => {}));
  //   return super.onDispose();
  // }

  modal() {
    return this.context.get('ui.modal');
  }

  success(message) {
    this.mu.ui.notification(`<span uk-icon="icon: check"></span> ${message}`, {
      status: 'success',
      pos: 'top-left',
    });
  }

  submitAuth(form, e) {
    console.log('SUBMIT AUTH', form);
    const fields = form.getData();
    const { username, password } = fields;
    this.mu.user.login(username, password)
      .then(u => this.success(`Welcome back ${u.firstName}!`))
      .catch(() => this.renderShow({
        fields,
        register: false,
        error: { auth: 'Invalid Credentials' },
      }));
  }

  submitReg(form, e) {
    this._debug('REGISTER', form);
    const fields = form.getData();
    this.mu.user.register(fields)
      .then(() => this.success(`Welcome ${fields.firstName}`))
      .catch(() => this.renderShow({
        fields,
        register: true,
        error: { reg: `Unable to register username: ${fields.username}` },
      }));
  }

  renderShow(data) {
    return this.render(data)
      .then(() => this.modal().show());
  }

}

export class UserAddress extends MuMx.compose(null, [UserViewMixin, null, 'address.html']) {
  constructor() {
    super();
    this.mu.on('ready', () => this.mu.user.address());
    this.subscribe('form', this.context, f => {
      return f && f.one('submit', this.save.bind(this))
        .on('change', this.change.bind(this));
    });
  }

  onMount() {
    this.context.extend({
      // state
      error: null,
      loading: false,
      editing: this._ctxAttrBool('editing'),
      addressType: this._ctxProp('type') || 'home',
      legend: this._ctxProp('legend'),
      // actions
      edit: this.edit.bind(this)
    });
    super.onMount();
  }

  edit() {
    this._toggleEdit = true;
    this.render({ editing: true });
  }

  loading(loading) {
    return this.render({ loading });
  }

  change(form) {
    // keep form data in sync
    // NOTE: address originally is set by subscriber
    this.context.set('address', form.getData());
  }

  save(form) {
    this.loading(true);
    const address = form.getData();
    this.mu.user.saveAddress(address)
      .then(a => this.done(null, a))
      .catch(e => this.done(e, address));
  }

  done(error, address) {
    return this.render({
      error,
      address,
      loading: false,
      success: !error,
      editing: !!error || !this._toggleEdit,
    });
  }
}

export default Mu.macro('user', UserController)
  .micro('user.view', attrToSelector(USER_MICRO.VIEW), UserView)
  .micro('user.address', attrToSelector(USER_MICRO.ADDRESS), UserAddress)
  .micro('user.toolbar', attrToSelector(USER_MICRO.TOOLBAR), UserToolbar);
