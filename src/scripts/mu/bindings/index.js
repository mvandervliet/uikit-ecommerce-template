
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
    return (str || '').replace(/^\!/, '');
  }
  
  // resolve the context lookup key
  _ctxKey(attr) {
    return this._ctxAttrPropKey(this._ctxAttrProp(attr));
  }

  // getter for the value in ctx
  _ctxAttrValue(attr) {
    const key = this._ctxKey(attr);
    return key && this.context.get(key);
  }

  // determine boolean or not
  _ctxAttrBool(attr) {
    const expression = this._ctxAttrProp(attr);
    return this._ctxBool(expression);
  }

  _ctxBool(expression) {
    const invert = /^\!/.test(expression || '');
    const ctxKey = this._ctxAttrPropKey(expression);
    const ctxVal = ctxKey && this.context.get(ctxKey);
    let test = !!ctxVal;
    if (typeof ctxVal === 'function') { // invoke bound test to
      test = ctxVal();
    } else if (!ctxVal && typeof expression === 'string') {
      try { test = JSON.parse(expression); } catch { }
    }
    return invert ? !test : test;
  }

};

export const MuCtxSingleAttrMixin = (ctor, attr) => class extends MuCtxAttrMixin(ctor) {
  _ctxAttrProp(a) {
    return super._ctxAttrProp(a || attr);
  }
  _ctxAttrValue(a) {
    return super._ctxAttrValue(a || attr);
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
