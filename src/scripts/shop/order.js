import { Mu, MuMx, attrToSelector } from '../mu';
import { ShopMxSubscriber } from './helper/subscriber';
import { ViewTemplateMixin } from './helper/viewmx';
import { MxCtxInsulator } from './helper/insulator';

export class OrderController {
  create() {
    const { api, cart } = this.mu;
    return api.post('/orders')
      .then(res => res.data)
      .then(order => cart.empty().then(() => order));
  }

  list() {
    return this.mu.api.get('/orders');
  }
}

const ORDER_MU = {
  CHECKOUT: 'mu-checkout',
};

let id = 0;

export class MuCheckout extends MuMx.compose(null,
  // MxCtxInsulator,
  ViewTemplateMixin,
  // [ViewTemplateMixin, null, 'orderCheckout.html']
) {
  constructor() {
    super();
    id++;
  }

  onMount() {
    console.log('CHECKOUT mounting', id);
    super.onMount();
    this.context.set('order.ready', this.orderReady.bind(this));
    this.context.set('order.submit', this.submitOrder.bind(this));
    console.log('checkout render', id);
    this.render();
  }

  onDispose() {
    // console.log('CHECKOUT disposed', id);
    return super.onDispose && super.onDispose();
  }

  orderReady() {
    const submit = this.context.get('submitting');
    // TODO: address, and card
    return !submit && true;
  }

  submitOrder() {
    const { order, router } = this.mu; 
    return this.render({ submitting: true })
      .then(() => order.create())
      .then(o => router.go('orders', { id: o.id }))
      .catch(error => this.render({ error, submitting: false }))
  }
}

export default Mu.macro('order', OrderController)
  .micro('order.checkout', attrToSelector(ORDER_MU.CHECKOUT), MuCheckout);

