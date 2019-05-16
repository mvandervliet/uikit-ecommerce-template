import { Mu, MuMx } from '../mu';
import { ShopMxSubscriber } from './helper/subscriber';
import { Badge } from './components/badge';
import { ViewTemplateMixin } from './helper/viewmx';

// some fixed business info
const CART = {
  SHIPPING_STANDARD: 4.99,
  FREE_THRESHOLD: 100,
  TAX_RATE: 0,
};

export class CartController {
  constructor() {
    this.getCart = this.getCart.bind(this);
    this.mu.on('ready', () => this.mu.user.on('user.profile', this.getCart));
  }

  _conditioner(items) {
    return items.map(item => ({
      ...item,
      rowUnitPrice: item.unitPrice.toFixed(2),
      rowTotalPrice: (item.quantity * item.unitPrice).toFixed(2),
    }));
  }

  getCart() {
    this.mu.api.get('/cart')
      .then(res => this.data = this._conditioner(res.data))
      .then(() => this.emit('contents', this.contents()));
  }

  add(item, quantity) {
    const { api, ui } = this.mu;
    const { id, name } = item; 
    return api.post('/cart', { id, quantity })
      .then(this.getCart)
      .then(() => ui.notification(`"${name}" added to cart!`, {
        status: 'success',
        timeout: 1e3
      }));
  }

  update(item, quantity) {
    const { id } = item;
    return this.mu.api.post('/cart/update', { id, quantity })
      .then(this.getCart);
  }

  remove(item) {
    const { id, name } = item;
    return this.mu.api.delete(`/cart/${id}`)
      .then(this.getCart);
  }

  contents() {
    return this.data || [];
  }

  size() {
    return this.contents()
      .map(item => item.quantity || 1)
      .reduce((total, qty) => total + qty, 0);
  }

  totals() {
    const subtotal = this.contents()
      .map(item => (item.quantity || 1) * item.unitPrice)
      .reduce((total, line) => total + line, 0);
    let discounts = 0;
    const tax = subtotal * CART.TAX_RATE;
    const shipRate = CART.SHIPPING_STANDARD;
    let shipping = shipRate;
    if( subtotal >= CART.FREE_THRESHOLD) {
      discounts += shipping;
      shipping = 0;
    }
    const total = subtotal + tax + shipping;

    return { subtotal, shipRate, shipping, discounts, tax, total };
  }

  totalsToFixed() {
    const totals = this.totals();
    Object.keys(totals).forEach(k => totals[k] = totals[k].toFixed(2));
    return totals;
  }

  combined() {
    // resolve with corresponding sku records from catalog svc
    const { catalog } = this.mu;
    const contents = this.contents();
    
    return Promise.all(contents.map(item => catalog.product(item.itemId)))
      // map to {[id]: product} hash
      .then(products => Object.assign({}, ...products.map(p => ({[p.id]: p}))))
      // map to a new object for mixed use
      .then(pMap => contents.map(item => ({
        item,
        product: pMap[item.itemId],
        actions: {
          update: this.update.bind(this, pMap[item.itemId]),
          remove: this.remove.bind(this, pMap[item.itemId]),
        }
      })));
  }
}

class CartSubscriber extends MuMx.compose(null, ShopMxSubscriber) {
  constructor() {
    super();
    this.listener = this.listener.bind(this);
    this.subscribe('contents', this.mu.cart, this.listener);
  }

  listener(cart) {
    
  }
}

/**
 * off canvas cart
 */
export class MuCart extends MuMx.compose(
  CartSubscriber,
  ViewTemplateMixin) {
  
  viewTemplateDelegate() {
    return this._ctxProp('template') || // source the template remotely
      null; // use node contents
  }

  listener(rows) {
    // const cartCtl = this.mu.cart;
    const { cart } = this.mu;
    const size = cart.size();
    const rawTotals = cart.totals();
    const totals = cart.totalsToFixed();

    // load corresponding sku records
    return cart.combined()
      .then(items => items.map(row => ({
        ...row,
        // qty manipulations
        qty: {
          inc: this.increment.bind(this, row, 1),
          dec: this.increment.bind(this, row, -1),
          change: this.qtyChange.bind(this, row),
        }
      })))
      .then(items => this.render({
        items,
        size,
        totals,
        rawTotals,
      }));
  }

  increment(row, amnt) {
    const { item: { quantity } } = row;
    const v = Math.max(1, quantity + amnt);
    return row.actions.update(v);
  }

  qtyChange(row, e) {
    const v = Math.max(1, ~~e.target.value);
    e.target.value = v;
    return row.actions.update(v);
  }

}

/**
 * Cart contents badge indicator
 */
export class CartBadge extends CartSubscriber {

  onMount() {
    this.badge = new Badge(this.node, this.view);
    super.onMount();
  }

  listener(cart) {
    this.badge.render(this.mu.cart.size());
  }
}

export default Mu.macro('cart', CartController)
  .micro('cart.view', '[mu-cart]', MuCart)
  .micro('cart.badge', '[mu-cart-badge]', CartBadge);