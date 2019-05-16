import { Mu, MuMx } from '../mu';
import { MuCtxSingleAttrMixin, MuCtxAttrMixin } from '../bindings';
import { attrToSelector } from '../util';

const LOGICAL_ATTR = {
  ATTR: 'mu-attr',
  CLASS: 'mu-class',
  EACH: 'mu-each',
  HTML: 'mu-html',
  IF: 'mu-if',
  SWITCH: 'mu-switch', // TODO
  GLOBAL: 'mu-global',
};


/**
 * MuIF micro - conditional display based on context property
 */
export class MuIF extends MuMx.compose(null, [MuCtxSingleAttrMixin, LOGICAL_ATTR.IF]) {

  onInit() {
    this.refresh = this.refresh.bind(this);
    return super.onInit && super.onInit();
  }

  onMount() {
    const { parentNode } = this.node;
    const virtual = this.view.virtual();
    this.ifComment = virtual.createComment(LOGICAL_ATTR.IF);
    // create placeholder target and
    parentNode.insertBefore(this.ifComment, this.node);
    parentNode.removeChild(this.node);

    // clone the original node for re-use
    const c = this.nodeCopy = this.node.cloneNode(true);
    c.removeAttribute(LOGICAL_ATTR.IF); // prevent re-binding

    this.refresh();
    this.context.on(this._ctxKey(), this.refresh);
    return super.onMount && super.onMount();
  }

  onDispose() {
    this.falsey();
    this.context.off(this._ctxKey(), this.refresh);
    const { parentNode } = this.ifComment;
    parentNode && parentNode.removeChild(this.ifComment);
    return super.onDispose && super.onDispose();
  }

  falsey() {
    const { ifNode, ifComment } = this;
    if (ifNode) {
      const { parentNode } = ifComment;
      this.view.dispose(ifNode, true);
      this.ifNode = null;
      return parentNode && 
        parentNode.contains(ifNode) && 
        parentNode.removeChild(ifNode);
    }
  }

  refresh() {
    const test = this._ctxAttrBool();
    const exist = this.ifNode && !!this.ifNode.parentNode;
    if (test) {
      if (!exist) {
        const { parentNode } = this.ifComment;
        const node = this.ifNode = this.nodeCopy.cloneNode(true);
        const insert = parentNode && parentNode.insertBefore(node, this.ifComment);
        this.view.attach(node, this.context.child());
        return insert;
      }
    } else {
      this.falsey();
    }
  }
}

/**
 * MuEach micro
 * @example
 * <li mu-each="things" mu-each-as="item">
 *   <a mu-html="item"></a>
 * </li>
 */
export class MuEach extends MuMx.compose(null, [MuCtxSingleAttrMixin, LOGICAL_ATTR.EACH]) {

  onInit() {
    this.eachNodes = [];
    this.refresh = this.refresh.bind(this);
    return super.onInit && super.onInit();
  }

  onMount() {
    // capture some ivars
    const { parentNode } = this.node;

    const virtual = this.view.virtual();
    this.eachComment = virtual.createComment(LOGICAL_ATTR.EACH);
    parentNode.insertBefore(this.eachComment, this.node);
    parentNode.removeChild(this.node);

    // clone the node for re-use
    const c = this.original = this.node.muOriginal();
    c.removeAttribute(LOGICAL_ATTR.EACH); // prevent re-binding

    // console.log('MOUNTED each', this.original);
    this.refresh();
    this.context.on(this._ctxKey(), this.refresh);
    super.onMount && super.onMount();
  }

  onDispose() {
    // console.log('DISPOSED each', this.original);
    this.context.off(this._ctxKey(), this.refresh);
    return super.onDispose && super.onDispose();
  }

  refresh() {
    const val = this._ctxAttrValue();
    // console.log('EACH RENDER', this.original, val);
    // dispose old
    this.eachNodes = this.eachNodes.reduce((empty, old) => {
      this.view.dispose(old);
      old.parentNode.removeChild(old);
      return empty;
    }, []);
    // resolve new
    return Promise.resolve(typeof val === 'function' ? val() : val)
      .then(items => {
        if (items && items.length) {
          const itemAs = this.original.getAttribute('mu-each-as') || this._ctxKey();
          const { parentNode } = this.eachComment;
          const virtualEnd = this.view.virtualContainer();
          parentNode.insertBefore(virtualEnd, this.eachComment);

          // populate virtual node with items
          items.reduce((last, current) => {
            const fresh = this.original.cloneNode(true);
            last.insertAdjacentElement("afterend", fresh);
            this.view.attach(fresh, this.context.child({ [itemAs]: current }));
            this.eachNodes.push(fresh);
            return fresh;
          }, virtualEnd);

          parentNode.removeChild(virtualEnd);
        }
      });
  }
}

/**
 * MuAttr micro - sets the the node attributes from context
 * @example
 * <input name="name" mu-attr mu-attr-value="fields.name" />
 */
export class MuAttr extends MuMx.compose(null, MuCtxAttrMixin) {

  onMount() {
    this.refresh();
    return super.onMount && super.onMount();
  }

  refresh() {
    const attrReg = new RegExp(`^${LOGICAL_ATTR.ATTR}-([\\w-]+)`);
    const bools = ['disabled', 'checked', 'selected'];
    // resolve all matching attr bindings
    const muAttrs = this.node.getAttributeNames()
      .filter(n => attrReg.test(n));
    // iterate and assign
    muAttrs.forEach(mattr => {
      const att = mattr.replace(attrReg, '$1');
      const bool = !!~bools.indexOf(att);
      const val = bool ? this._ctxAttrBool(mattr) : this._ctxAttrValue(mattr);
      return val ? this.node.setAttribute(att, val) : this.node.removeAttribute(att);
    });
  }
}


/**
 * MuHtml micro
 * @example
 * <div mu-html="ctx.html"></div>
 */
export class MuHtml extends MuMx.compose(null, [MuCtxSingleAttrMixin, LOGICAL_ATTR.HTML]) {

  constructor() {
    super();
    this.refresh = this.refresh.bind(this);
  }

  onMount() {
    this.refresh();
    this.context.on(this._ctxKey(), this.refresh);
    return super.onMount && super.onMount();
  }

  onDispose() {
    this.context.off(this._ctxKey(), this.refresh);
    return super.onDispose && super.onDispose();
  }

  refresh() {
    const val = this._ctxAttrValue();
    return Promise.resolve(typeof val === 'function' ? val() : val)
      .then(html => this.view.apply(this.node, html || '', this.context.child()));
  }
}


export class MuClassLogical extends MuMx.compose(null, [MuCtxSingleAttrMixin, LOGICAL_ATTR.CLASS]) {

  constructor() {
    super();
    this.refresh = this.refresh.bind(this);
  }

  onMount() {
    this.refresh();
    return super.onMount && super.onMount();
  }

  refresh() {
    try {
      const { classList } = this.node;
      const rules = this._ctxAttrValue() || JSON.parse(this._ctxAttrProp().replace(/\'/g,'"'));
      const keys = Object.keys(rules);
      classList.remove(...[].concat(keys.map(c => c.split(/\s+/))));
      keys.forEach(key => this._ctxBool(rules[key]) && classList.add(...key.split(/\s+/)));
    } catch (e) {
      // console.warn(this.constructor.name, e);
    }
  }
}

export default Mu.micro('logical.attr', attrToSelector(LOGICAL_ATTR.ATTR), MuAttr)
  .micro('logical.if', attrToSelector(LOGICAL_ATTR.IF), MuIF)
  .micro('logical.each', attrToSelector(LOGICAL_ATTR.EACH), MuEach)
  .micro('logical.class', attrToSelector(LOGICAL_ATTR.CLASS), MuClassLogical)
  .micro('logical.html', attrToSelector(LOGICAL_ATTR.HTML), MuHtml);