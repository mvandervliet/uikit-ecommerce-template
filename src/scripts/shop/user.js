import { Mu, MuMx, attrToSelector } from '../mu';
import { ShopMxSubscriber } from './helper/subscriber';

export class UserController {
  constructor() {
    this.user = null;
    this.mu.on('ready', this.getUser.bind(this));
  }

  _setUser(user) {
    this.user = user;
    this.context.set('global.profile', user); // set in global context
    this.emit('set.user', user);
    return user;
  }

  _userError(err) {
    this._setUser(null);
    this.emit('user.error', err);
  }

  getUser() {
    const id = this.user ? this.user.id : null;
    return this.mu.api.get(`/customers/${id}`)
      .then(res => {
        if (res.data && res.data.status_code !== 500) {
          return this._setUser(res.data);
        } else {
          return Promise.reject(res.data);
        }
      })
      .catch(e => this._userError(e))
  }

  logout() {
    this.mu.api.get('/logout')
      .then(res => this._setUser(null))
      .catch(e => this._userError(e));
  }

  login(username, password) {
    return this.mu.api.get('/login', {
      auth: { username, password }
    }).then(() => this.getUser());
  }

  register(profile) {
    return this.mu.api.post('/register', profile)
      .then(() => this.getUser());
  }
}


const UserToolbarAttr = 'mu-user-toolbar';
export class UserToolbar extends MuMx.compose(null, ShopMxSubscriber) {
  constructor() {
    super();
    // listen to user change
    this.subscribe('set.user', this.mu.user, this.onUser.bind(this));
    // view context bindings
    this.subscribe('form.auth', this.context, f => f && f.on('submit', this.submitAuth.bind(this)));
    this.subscribe('form.reg', this.context, f => f && f.on('submit', this.submitReg.bind(this)));
  }

  _debug(...args) {
    // console.log('TOOLBAR', this.context.get('classname.nav'), ...args);
  }

  onMount() {
    this.context.set('offcanvas', this.node.getAttribute(UserToolbarAttr) === 'offcanvas');
    super.onMount();
    this._debug('MOUNTED');
  }

  onUser(profile) {
    this._debug('onUser', profile);
    this.render({ profile });
  }

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
    this._debug('SUBMIT AUTH', form);
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

  render(data) {
    this._debug('RENDER');
    return this.view.renderRemote(this.node, 'userToolbar.html', this.context.extend(data));
  }

}

export default Mu.macro('user', UserController)
  .micro('user.toolbar', attrToSelector(UserToolbarAttr), UserToolbar);
