'use strict';

import 'core-js/features/map';
import 'core-js/features/set';
import axios from 'axios';
import { attrToSelector } from './util';

const MuUtil = {

  randId: () => Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5),

  /**
   * resolve path to its tree
   */
  propPath(path) {
    return (path || '').split(/[:\.]/).filter(p => !!p);
  },

  /**
   * define property on object
   * @param {*} object
   * @param {*} prop 
   * @param {*} value 
   */
  defineProp(object, prop, value) {
    const path = this.propPath(prop);
    const propName = path.pop();
    const target = path.reduce((last, key) => (last[key] = last[key] || {}), object);
    Object.assign(target, propName ? { [propName]: value } : value);
  },

  mergeProp(object, prop, mixin) {
    this.defineProp(object, prop, mixin);
  },

  /**
   * resolve an object propery by path
   * @param {*} object 
   * @param {*} path 
   */
  resolveProp(object, path) {
    return this.propPath(path)
      .reduce((last, k) => {
        if (!!last && typeof last === 'object') {
          return last[k]
        }
      }, object);
  },

  /**
   * create module definitions for later instantiation
   * @param {*} name - unique module name
   * @param {string} binding - module binding selector
   * @param {Function} ctor - module constructor
   * @param  {...any} args - dependencies
   */
  defineModule(name, binding, ctor, ...args) {
    const mod = { name, binding, ctor, args };
    return mod;
  },

  /**
   * initialize a mu module
   * @param {*} mod - module definition
   * @param {Mu} mu - mu instance
   * @param {MuView} view - mu view
   * @param {MuContext} [context] - module context
   */
  initModule(mod, mu, view, context) {
    const emitter = new MuEmitter(mod.ctor.name);
    const ModCtor = MuMx.pure(mod.ctor, ...mod.args);
    MuUtil.mergeProp(ModCtor.prototype, null, {
      mu, 
      view,
      // emitter
      on: emitter.on.bind(emitter),
      one: emitter.one.bind(emitter),
      off: emitter.off.bind(emitter),
      emit: emitter.emit.bind(emitter),
      // context
      ...(context ? { context } : {}),
    });

    // instantiate
    const instance = new ModCtor();
    // call lifecycle hook
    instance.onInit && instance.onInit();

    return instance;
  },
}


export const MuMx = {
  /**
   * create a pure class by seeing the ctor's arguments
   * @param {function} superclass 
   * @param  {...any} superargs 
   */
  pure(superclass, ...superargs) {
    return this.mixin(superclass, ...superargs);
  },

  /**
   * mixin any class with supplied ctor args
   * @param {*} superclass 
   * @param  {...any} args 
   */
  mixin(superclass, ...superargs) {
    return class extends superclass {
      constructor(...rest) {
        super(...superargs.concat(rest));
      }
    };
  },
  
  /**
   * @TODO WIP!!
   * @param base - base class
   * @param  {...any} mixins 
   */
  compose(base, ...mixins) {
    base = base || class {};
    return mixins
      // normalize to [ctor, ...rest]
      .map(row => [].concat(row))
      // combine mixins into one
      .reduceRight((prev, args) => {
        const factory = args.shift();
        return factory(prev, ...args);
      }, base);
  }

};

/**
 * 
 */
export class MuEmitter {

  constructor(name) {
    this._name = name;
    this._listeners = new Map();
    this._emits = new Map();
    this._id = MuUtil.randId();
  }

  on(hook, listener) {
    const set = this._getSet(hook);
    set.add(listener);
    this._listeners.set(hook, set);
    this._emitLast(hook, listener);
    return this;
  }

  one(hook, listener) {
    // replace all listeners with this one
    this._listeners.set(hook, new Set([listener]));
    return this;
  }

  off(hook, listener) {
    this._getSet(hook).delete(listener);
    return this;
  }

  emit(hook, ...args) {
    this._emits.set(hook, args);
    this._getSet(hook).forEach(l => this._emitLast(hook, l));
    return this;
  }

  emitOnce(hook, ...args) {
    this._getSet(hook).forEach(l => l(...args));
    return this;
  }

  _getSet(hook) {
    return this._listeners.get(hook) || new Set();
  }

  _emitLast(hook, listener) {
    const args = this._emits.get(hook);
    if (args) {
      console.log(`${this._name}::${hook}`);
      listener(...args);
    }
  }

  dispose() {
    this._emits.clear();
    this._listeners.clear();
  }
}

/**
 * 
 */
export class MuContext extends MuEmitter {

  static isContext(data) {
    return data && data instanceof MuContext;
  }

  static toContext(data) {
    return this.isContext(data) ? data : new MuContext(data);
  }

  constructor(ctx) {
    super('MuContext');
    this.data = MuContext.isContext(ctx) ? ctx.get() : { ...(ctx || {}) };
    this.set('ctxId', this._id);
  }

  /**
   * set the context value
   * @param {string} key 
   * @param {*} val 
   */
  set(key, val) {
    MuUtil.mergeProp(this.data, key, val);
    this.emit(key, this.get(key));
    return this;
  }

  /**
   * get context value from key path
   * @param {string} key - path to resolve in the data
   */
  get(key) {
    return MuUtil.resolveProp(this.data, key);
  }

  /**
   * extend the root context with the new object
   * @param {object} data 
   */
  extend(data) {
    return this.set(null, data);
  }

  /**
   * Create a child context
   * @param {*} withData 
   */
  child(withData) {
    return MuContext.toContext({
      ...this.get(),
      ...(withData || {}),
      ctxParent: this,
    });
  }

}

const [PROP_MU, PROP_MUS, PROP_CONTEXT, PROP_CLOAK] = ['mu', 'mus', 'muctx', 'mu-cloak'];

/**
 * Mu client rendering engine
 * @param {Mu} mu - Mu instance
 * @param {object} options - view options 
 * @param {string} options.basePath - base path for view loading
 * @param {object} options.micro - micro module definitions
 */
export class MuView extends MuEmitter {
  constructor(mu, options) {
    super('MuView');
    this.mu = mu;
    this.options = options;
    this.loader = axios.create();
    this._viewCache = new Map();
    this._templatePattern = /\{\{([\w\.:]+)\}\}/; // TODO, make option
  }

  virtual(html, selector) {
    const parser = new DOMParser();
    const virtual = parser.parseFromString(html || '', 'text/html');
    return selector ? virtual.querySelector(selector) : virtual;
  }

  virtualContainer() {
    return this.virtual('<div></div>', 'div');
  }

  load(path) {
    const c = this._viewCache.get(path);
    const p = Promise.resolve(c || this.loader.get(path).then(res => res.data))
    if (!c) {
      this._viewCache.set(path, p);
    }
    return p;
  }

  loadView(view) {
    const { basePath } = this.options;
    var path = (basePath || '') + '/' + view;
    return this.load(path);
  }

  renderRemote(target, view, context) {
    return this.loadView(view)
      .then(template => this.render(target, template, context));
  }

  render(target, template, context) {
    const output = this.interpolate(template, context);
    // this.emit('rendered', target, data);
    return Promise.resolve(this.apply(target, output, context));
  }

  interpolate(template, context) {
    const pattern = this._templatePattern;
    const regGlobal = new RegExp(pattern, 'g');
    const renderCtx = MuContext.toContext(context);
    const raw = template || '';
    return Array.apply(null, raw.match(regGlobal) || [])
      .reduce((out, ph) => {
        const prop = ph.replace(pattern, '$1');
        return out.replace(ph, renderCtx.get(prop) || '');
      }, raw);
  }

  apply(target, html, context) {
    this.dispose(target);
    target.innerHTML = html;
    return this.attach(target, context);
    // const virtual = this.virtual(`<div>${html}</div>`, 'div');
    // const bound = this.attach(virtual, context);
    // target.innerHTML = '';
    // Array.apply(null, bound.children)
    //   .forEach(node => target.appendChild(node));
  }

  attach(target, context) {
    const { micro } = this.options;
    const commonCtx = context && MuContext.toContext(context);
    const _mus = [];

    // bind mu to the anything with standard [mu] selector
    Array.apply(null, target.querySelectorAll(attrToSelector(PROP_MU)))
      .forEach(node => MuUtil.mergeProp(node, null, {
        [PROP_MU]: this.mu, // direct access to mu
        [PROP_CONTEXT]: this.mu.root.context, // global context
      }));

    // keep mus array on target
    MuUtil.defineProp(target, PROP_MUS, _mus);

    // assign getters on prebound objects
    const any = micro.map(mod => mod.binding).join(',');
    Array.apply(null, target.querySelectorAll(any))
      .forEach(node => {
        const clone = node.cloneNode(true);
        MuUtil.defineProp(node, 'muOriginal', () => clone.cloneNode(true));
      });
    
    // bind micros
    micro.forEach(mod => {
      const nodes = target.querySelectorAll(mod.binding);
      // instantiate per node
      Array.apply(null, nodes).forEach(node => {
        const nodeCtx = MuUtil.resolveProp(node, PROP_CONTEXT);
        const ctx = nodeCtx || commonCtx || MuContext.toContext(); // context may be shared or uniquely scoped
        const instance = MuUtil.initModule(mod, this.mu, this, ctx);
        MuUtil.mergeProp(instance, null, { node }); // assign the node to the instance
        // MuUtil.mergeProp(node, mod.name, instance); // assign the module instance to the node
        _mus.push(instance);
        return instance.onMount && instance.onMount();
      });

      if (nodes.length) {
        this.emitOnce(`attached:${mod.name}`, target, nodes);
      }
    });

    // remove cloak
    target.removeAttribute(PROP_CLOAK);

    // emit that view was attached
    this.emitOnce('attached', target);
    return target;
  }

  dispose(target, andContext) {
    const _mus = MuUtil.resolveProp(target, PROP_MUS);
    const { context: rootCtx } = this.mu.root;
    if (_mus) {
      let m = _mus.shift();
      while (m) {
        m.emit('dispose').dispose();  // dispose emitter
        m.onDispose && m.onDispose(); // dispose hook
        if (andContext && m.context !== rootCtx) { // dispose (non-root) context
          m.context.dispose();
        }
        m = _mus.shift();
      }
    }
    return target;
  }
}

/**
 * Main Mu application 
 */
export class Mu extends MuEmitter {
  
  constructor() {
    super('Mu');
  }

  /**
   * reset Mu
   */
  static reset() {
    this._macro = [];
    this._micro = [];
    return this;
  }

  /**
   * register a component to the mu namespace (macro)
   * @param {string} name 
   * @param {Function} ctor 
   * @param  {...any} args 
   */
  static macro(name, ctor, ...args) {
    this._macro.push(MuUtil.defineModule(name, null, ctor, ...args));
    return this;
  }

  /**
   * register a view micro binding
   * @param {string} name 
   * @param {string} selector 
   * @param {Function} ctor 
   * @param  {...any} args 
   */
  static micro(name, selector, ctor, ...args) {
    this._micro.push(MuUtil.defineModule(name, selector, ctor, ...args));
    return this;
  }

  /**
   * 
   * @param {HTMLElement} main 
   * @param {object} options
   * @param {string} options.root - root node selector
   * @param {string} options.baseViewUrl - base url for view loading
   * @param {*} options.context - global context
   */
  static init(main, options) {
    const mu = new Mu();
  
    // resolve options for this instance
    const opts = Object.assign({
      root: main.nodeName,
      baseViewUrl: '/views',
      context: {},
    }, options || {});
  
    // create singleton view engine with micro bindings
    var view = new MuView(mu, {
      micro: this._micro,
      basePath: opts.baseViewUrl,
    });

    // create global context
    var context = new MuContext(options.context);

    // assign root object
    MuUtil.defineProp(mu, 'root', {
      context,
      element: main,
      selector: opts.root,
    });
  
    // init macros with global context
    this._macro.forEach(mod => {
      var instance = MuUtil.initModule(mod, mu, view, context);
      // assign to the mu instance (as macro)
      MuUtil.mergeProp(mu, mod.name, instance);
    });
  
    // attach main node to view (without any default context)
    view.attach(main, null);
  
    // emit ready
    mu.emit('ready');
    return mu;
  }
}

Mu._macro = []; // define static macro singleton modules on mu instance
Mu._micro = []; // define static micro components for view bindings
