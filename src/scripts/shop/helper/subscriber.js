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
  subscribe(event, publisher, listener) {
    this._shopMxSubs.add({ event, publisher, listener });
  }

  onMount() {
    this._shopMxSubs.forEach(sub => sub.publisher.on(sub.event, sub.listener));
    return super.onMount && super.onMount();
  }

  onDispose() {
    this._shopMxSubs.forEach(sub => sub.publisher.off(sub.event, sub.listener))
    this._shopMxSubs.clear();
    return super.onDispose && super.onDispose();
  }

}
