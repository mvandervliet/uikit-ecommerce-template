import { Mu, MuMx } from '../mu';
import { MuCtxSingleAttrMixin } from '../bindings';
import { attrToSelector } from '../util';

const LOGICAL_ATTR = {
  IF: 'mu-if',
  EACH: 'mu-each',
  SWITCH: 'mu-switch',
};

const ifNot = /^\!/;

export class MuIF extends MuMx.compose(null, [MuCtxSingleAttrMixin, LOGICAL_ATTR.IF]) {

  constructor() {
    super();
    this._muIfUpdate = this._muIfUpdate.bind(this);
  }

  _ctxAttrPropKey(prop) {
    if (ifNot.test(prop)){
      this._falsify = true;
    }
    return prop.replace(ifNot, '');
  }

  _evalMuCtxIf() {
    const plainProp = this._ctxAttrProp();
    const ctxVal = this._ctxAttrValue();
    let test = !!ctxVal;
    if (typeof ctxVal === 'function') { // invoke bound test to
      test = ctxVal();
    } else if (!ctxVal && typeof plainProp === 'string') {
      try { test = JSON.parse(plainProp); } catch { }
    }
    return this._falsify ? !test : test;
  }

  onMount() {
    // console.log('mount mu-if', this._ctxAttrProp(), this.context.get());
    this._muIfUpdate();
    this.context.on(this._ctxKey(), this._muIfUpdate);
    
    return super.onMount && super.onMount();
  }

  onDispose() {
    this.context.off(this._ctxKey(), this._muIfUpdate);
    return super.onDispose && super.onDispose();
  }

  _muIfUpdate() {
    const test = this._evalMuCtxIf();
    // console.log('MuIf', this._ctxAttrProp(), test);
    if (!test) {
      this._muIfParent = this._muIfParent || this.node.parentNode;
      this._muIfSib = this._muIfSib || this.node.nextElementSibling;
      this.node.parentNode.removeChild(this.node);
    } else if (this._muIfSib) {
      this._muIfParent.insertBefore(this.node, this._muIfSib);
    } else if (this._muIfParent) {
      this._muIfParent.appendChild(this.node);
    }
  }
}

export class MuEach extends MuMx.compose(null, [MuCtxSingleAttrMixin, LOGICAL_ATTR.EACH]) {
  constructor() {
    super();
    this._muEachUpdate = this._muEachUpdate.bind(this);
  }

  onMount() {
    // capture some ivars
    const { innerHTML, nodeName } = this.node;
    this._tmpl = innerHTML;
    this._nodeName = nodeName;
    // process
    this._muEachUpdate();
    this.context.on(this._ctxKey(), this._muEachUpdate);
    super.onMount && super.onMount();
  }

  onDispose() {
    this.context.off(this._ctxKey(), this._muEachUpdate);
    return super.onDispose && super.onDispose();
  }

  _muEachUpdate() {
    const items = this._ctxAttrValue();
    console.log('TODO: EACH', items, this._tmpl);
    // const virtual = this.view.virtual('<div></div>', 'div');
    // virtual.innerHTML = this._tmpl;
  }
}

export default Mu.micro('logical.if', attrToSelector(LOGICAL_ATTR.IF), MuIF)
  .micro('logical.each', attrToSelector(LOGICAL_ATTR.EACH), MuEach);