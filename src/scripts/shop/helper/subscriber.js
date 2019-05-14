/**
 * 
 */
export const ShopMxSubscriber = ctor => class extends ctor {

  constructor(...args) {
    super(...args);
    this._shopMxSubs = new Set();
  }

  /**
   * 
   * @param {*} event 
   * @param {*} publisher 
   * @param {*} listener 
   */
  subscribe(event, publisher, listener, one) {
    this._shopMxSubs.add({ event, publisher, listener, one });
    return this;
  }

  subscribeOne(event, publisher, listener) {
    return this.subscribe(event, publisher, listener, true);
  }

  onMount() {
    const sup = super.onMount && super.onMount();
    this._shopMxSubs.forEach(sub => sub.publisher[sub.one ? 'one' : 'on'](sub.event, sub.listener));
    return sup;
  }

  onDispose() {
    this._shopMxSubs.forEach(sub => sub.publisher.off(sub.event, sub.listener))
    this._shopMxSubs.clear();
    return super.onDispose && super.onDispose();
  }

}
