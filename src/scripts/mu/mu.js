'use strict';

import 'core-js/features/map';
import 'core-js/features/set';
import axios from 'axios';

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
    const ModCtor = MuMx.mixin(mod.ctor, ...mod.args);
    MuUtil.mergeProp(ModCtor.prototype, null, {
      mu, 
      view,
      // emitter
      on: emitter.on.bind(emitter),
      off: emitter.off.bind(emitter),
      emit: emitter.emit.bind(emitter),
      // context
      ...(context ? { context } : {}),
    });

    // instantiate
    // var instance = new mod.ctor(...mod.args);
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
    const set = this._listeners.get(hook) || new Set();
    set.add(listener);
    this._listeners.set(hook, set);
    this._emitLast(hook, listener);
    return this;
  }

  off(hook, listener) {
    const set = this._listeners.get(hook) || new Set();
    set.delete(listener);
    return this;
  }

  emit(hook, ...args) {
    this._emits.set(hook, args);
    const set = this._listeners.get(hook) || [];
    set.forEach(l => this._emitLast(hook, l));
    return this;
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

  all(sel) {
    return mu.root.element.querySelectorAll(sel);
  }

  one(sel) {
    return mu.root.element.querySelector(sel);
  }

  virtual(html, selector) {
    const parser = new DOMParser();
    const virtual = parser.parseFromString(html, 'text/html');
    return selector ? virtual.querySelector(selector) : virtual;
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
    return this.apply(target, output, context);
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
    Array.apply(null, target.querySelectorAll('[mu]'))
      .forEach(node => MuUtil.defineProp(node, 'mu', this.mu));

    MuUtil.mergeProp(target, null, { _mus });

    // bind micros
    micro.forEach(mod => {
      const nodes = target.querySelectorAll(mod.binding);
      // instantiate per node
      Array.apply(null, nodes).forEach(node => {
        const ctx = commonCtx || MuContext.toContext(); // context may be shared or uniquely scoped
        const instance = MuUtil.initModule(mod, this.mu, this, ctx);
        _mus.push(instance);
        MuUtil.mergeProp(instance, null, { node });
        MuUtil.mergeProp(node, mod.name, instance); // assign the module to the node
        return instance.onMount && instance.onMount();
      });
    });

    // emit that view was attached
    this.emit('attached', target);
    return target;
  }

  dispose(target) {
    const _mus = MuUtil.resolveProp(target, '_mus');
    if (_mus) {
      _mus.forEach(instance => {
        instance.emit('dispose').dispose();
        return instance.onDispose && instance.onDispose();
      });
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
  
    // init macros
    this._macro.forEach(mod => {
      var instance = MuUtil.initModule(mod, mu, view, null);
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
