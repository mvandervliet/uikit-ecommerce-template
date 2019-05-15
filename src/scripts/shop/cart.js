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
    const tax = subtotal * CART.TAX_RATE;
    const shipRate = CART.SHIPPING_STANDARD;
    const shipping = subtotal >= CART.FREE_THRESHOLD ? 0 : shipRate;
    const total = subtotal + tax + shipping;

    return { subtotal, shipRate, shipping, tax, total };
  }

  totalsToFixed() {
    const totals = this.totals();
    Object.keys(totals).forEach(k => totals[k] = totals[k].toFixed(2));
    return totals;
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
export class MiniCart extends MuMx.compose(
  CartSubscriber,
  [ViewTemplateMixin, null, 'miniCart.html']) {

  listener(cartItems) {
    // const cartCtl = this.mu.cart;
    const { cart, catalog } = this.mu;
    const totals = cart.totalsToFixed();

    // load corresponding sku records
    Promise.all(cartItems.map(item => catalog.product(item.itemId)))
      // map to {[id]: product} hash
      .then(products => Object.assign(...products.map(p => ({[p.id]: p}))))
      // map to a new object for mixed use
      .then(pMap => cartItems.map(item => ({
        item,
        product: pMap[item.itemId],
        remove: cart.remove.bind(cart, pMap[item.itemId]),
      })))
      // render
      .then(items => this.render({
        items,
        totals,
      }));
  }

  // render(data) {
  //   console.log(`will render`, data);
  //   return super.render(data);
  // }

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
  .micro('cart.mini', '[mu-minicart]', MiniCart)
  .micro('cart.badge', '[mu-cart-badge]', CartBadge);