
/**
 * 
 * @param {*} ctor 
 */
export const MuCtxAttrMixin = ctor => class extends ctor {

  // getter for ctx property name
  _ctxAttrProp(attr) {
    return attr && this.node.getAttribute(attr);
  }

  // handler to make any changes to the attribute value before reading in context
  _ctxAttrPropKey(str) {
    return str;
  }
  
  _ctxKey(attr) {
    return this._ctxAttrPropKey(this._ctxAttrProp(attr));
  }

  // getter for the value in ctx
  _ctxAttrValue(attr) {
    const key = this._ctxKey(attr);
    return key && this.context.get(key);
  }

};

export const MuCtxSingleAttrMixin = (ctor, attr) => class extends MuCtxAttrMixin(ctor) {
  _ctxAttrProp() {
    return super._ctxAttrProp(attr);
  }
  _ctxAttrValue() {
    return super._ctxAttrValue(attr);
  }
}


/**
 * bind attributes to target props in the context
 * @param {*} ctor 
 * @param  {...string} attributes 
 */
export const MuCtxSetterMixin = (ctor, ...attributes) => class extends MuCtxAttrMixin(ctor) {
  
  onMount() {
    attributes
      .map(attr => ({ attr, prop: this._ctxAttrProp(attr) }))
      .filter(m => m.prop)
      .forEach(m => this.context.set(m.prop, this.valueForCtx(m.attr)));
    return super.onMount && super.onMount();
  }

  onDispose() {
    attributes
      .map(attr => this._ctxAttrProp(attr))
      .filter(p => !!p)
      .forEach(p => this.context.set(p, null));
    return super.onDispose && super.onDispose();
  }

  /**
   * This should be implemented for each unique attribute specified in the factory
   */
  valueForCtx(attr) {
    return this;
  }

};

/**
 * 
 * @param {function} ctor 
 * @param  {...[string, string]} tuples - map of the [attributeName, eventName]
 */
export const MuCtxEventBindingMixin = (ctor, ...tuples) => class extends MuCtxAttrMixin(ctor) {
  constructor(...args) {
    super(...args);

    this._ctxEventBindings = tuples.map(([attr, event]) => ({
      attr,
      event: event || attr, // if same,
      handler: this._ctxEventHandler.bind(this, attr),
    }));
  }

  _ctxEventHandler(attr, e) {
    const prop = this._ctxAttrValue(attr);
    return prop && prop(e);
  }

  onMount() {
    this._ctxEventBindings
      .forEach(def => this.node.addEventListener(def.event, def.handler));
    return super.onMount && super.onMount();
  }

  onDispose() {
    this._ctxEventBindings
      .forEach(def => this.node.removeEventListener(def.event, def.handler));
    return super.onDispose && super.onDispose();
  }

};
