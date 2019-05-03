import { Mu } from './mu';
import { Badge } from './components/badge';

export class CartController {
  constructor() {
    this.mu.on('ready', this.getCart.bind(this));
  }

  add(item) {

  }

  remove(item) {

  }

  contents() {
    return this.data || [];
  }

  size() {
    return this.contents()
      .map(item => item.quantity || 1)
      .reduce((total, qty) => total + qty, 0);
  }

  subscribe(listener) {
    this.on('contents', listener);
    this.emit('contents', this.contents());
  }

  unsubscribe(listener) {
    this.off('contents', listener);
  }

  getCart() {
    this.mu.api.get('/cart')
      .then(res => this.data = res.data)
      .then(() => this.emit('contents', this.contents()));
  }
}

class CartListener {
  constructor() {
    this.listener = this.listener.bind(this);
  }

  onMount() {
    this.mu.Cart.subscribe(this.listener);
  }

  onDispose() {
    this.mu.Cart.unsubscribe(this.listener);
  }

  listener(cart) {
    
  }
}

/**
 * off canvas cart
 */
export class MiniCart extends CartListener {

  listener(cart) {
    // console.log('minicart', cart);
  }
}

export class CartBadge extends CartListener {

  onMount() {
    this.badge = new Badge(this.node, this.view);
    super.onMount();
  }

  listener(cart) {
    this.badge.render(this.mu.Cart.size());
  }
}

export default Mu.macro('Cart', CartController)
  .micro('[mu-minicart]', 'cart', MiniCart)
  .micro('[mu-cart-badge]', 'cartbadge', CartBadge);