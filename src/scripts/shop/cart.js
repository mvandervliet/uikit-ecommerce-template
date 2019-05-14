import { Mu, MuMx } from '../mu';
import { ShopMxSubscriber } from './helper/subscriber';
import { Badge } from './components/badge';

export class CartController {
  constructor() {
    this.getCart = this.getCart.bind(this);
    this.mu.on('ready', () => this.mu.user.on('user.profile', this.getCart));
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

  getCart() {
    this.mu.api.get('/cart')
      .then(res => this.data = res.data)
      .then(() => this.emit('contents', this.contents()));
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
export class MiniCart extends CartSubscriber {

  listener(cart) {
    console.log('TODO minicart', cart);
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
  .micro('cart.mini', '[mu-minicart]', MiniCart)
  .micro('cart.badge', '[mu-cart-badge]', CartBadge);