'use strict';

import 'core-js/features/map';
import 'core-js/features/set';
import axios from 'axios';
import mustache from 'mustache';

const MuUtil = {
  /**
   * define property on object
   * @param {*} obj 
   * @param {*} prop 
   * @param {*} value 
   * @param {*} writable 
   */
  defineProp: (obj, prop, value, writable) => {
    Object.defineProperty(obj, prop, {
      writable: writable || false,
      value: value,
    });
  },

  /**
   * capture module definitions for later instantiation
   */
  defineModule: (layer, binding, name, ctor, ...args) => {
    var mod = { binding, name, ctor, args };
    MuUtil.defineProp(layer, name, mod);
  },

  /**
   * initialize a mu modure
   * @param {*} mod - module definition
   * @param {Mu} mu - mu instance
   * @param {MuView} view - mu view
   */
  initModule: (mod, mu, view) => {
    const emitter = new MuEmitter(mod.name);
    const { onInit, onMount, onDispose } = mod.ctor.prototype;
    const noop = () => {};
    // create instance prototype ivars
    Object.assign(mod.ctor.prototype, {
      // ivars
      mu,
      view,
      // emitter
      on: emitter.on.bind(emitter),
      off: emitter.off.bind(emitter),
      emit: emitter.emit.bind(emitter),
      // lifecycle
      onInit: onInit || noop,
      onMount: onMount || noop,
      onDispose: onDispose || noop,
    });

    // instantiate
    var instance = new mod.ctor(...mod.args);
    // call lifecycle hook
    instance.onInit && instance.onInit();

    return instance;
  },
}


export class MuEmitter {
  constructor(name) {
    this._name = name;
    this._listeners = new Map();
  }

  on(hook, listener) {
    const set = this._listeners.get(hook) || new Set();
    set.add(listener);
    this._listeners.set(hook, set);
    return this;
  }

  off(hook, listener) {
    const set = this._listeners.get(hook) || new Set();
    set.delete(listener);
    return this;
  }

  emit(hook, ...args) {
    const set = this._listeners.get(hook) || [];
    console.log(`${this._name}::${hook}`);
    set.forEach(l => l(...args));
    return this;
  }

  dispose() {
    this._listeners.clear();
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
  }

  all(sel) {
    return mu.root.element.querySelectorAll(sel);
  }

  one(sel) {
    return mu.root.element.querySelector(sel);
  }

  virtual(html) {
    var parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  load(path) {
    return Promise.resolve(this._viewCache.get(path) || this.loader.get(path).then(res => res.data))
      .then(tmpl => {
        this._viewCache.set(path, tmpl);
        return tmpl;
      });
  }

  loadView(view) {
    const { basePath } = this.options;
    var path = (basePath || '') + '/' + view;
    return this.load(path);
  }

  renderRemote(target, view, data) {
    return this.loadView(view)
      .then(template => this.render(target, template, data));
  }

  render(target, template, data) {
    var output = mustache.render(template || '', data);
    // this.emit('rendered', target, data);
    this.apply(target, output);
  }

  apply(target, html) {
    this.dispose(target);
    target.innerHTML = html;
    this.attach(target);
  }

  dispose(target) {
    const { micro } = this.options;
    Object.getOwnPropertyNames(micro).forEach(function(prop) {
      const mod = micro[prop];
      const nodes = target.querySelectorAll(mod.binding);
      // dispose each node
      Array.apply(null, nodes).forEach(node => {
        const instance = node[mod.name];
        instance.emit('dispose').dispose(); // notify subscribers
        return instance.onDispose && instance.onDispose(); // call lifecycle hook
      });
    });

  }

  attach(target) {
    const { micro } = this.options;
    // bind mu to the generic [mu] selector
    [target].concat(Array.apply(null, target.querySelectorAll('[mu]')))
      .forEach(node => MuUtil.defineProp(node, 'mu', this.mu));

    // bind micros
    Object.getOwnPropertyNames(micro).forEach(prop => {
      var mod = micro[prop];
      var nodes = target.querySelectorAll(mod.binding);
      // instantiate per node
      Array.apply(null, nodes).forEach(node => {
        var instance = MuUtil.initModule(mod, this.mu, this);
        MuUtil.defineProp(instance, 'node', node); // assign node prop to the micro
        MuUtil.defineProp(node, mod.name, instance); // assign the module to the node
        instance.onMount();
      });
    });

    // emit that view was attached
    this.emit('attached', target);
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
   * register a component to the mu namespace (macro)
   * @param {string} name 
   * @param {Function} Macro 
   * @param  {...any} args 
   */
  static macro(name, Macro, ...args) {
    MuUtil.defineModule(this._macro, name, name, Macro, ...args);
    return this;
  }

  /**
   * register a view micro binding
   * @param {string} selector 
   * @param {string} name 
   * @param {Function} Micro 
   * @param  {...any} args 
   */
  static micro(selector, name, Micro, ...args) {
    MuUtil.defineModule(this._micro, selector, name, Micro, ...args);
    return this;
  }

  /**
   * 
   * @param {HTMLElement} main 
   * @param {object} options
   * @param {string} options.root - root node selector
   * @param {string} options.baseViewUrl - base url for view loading
   */
  static init(main, options) {
    const mu = new Mu();
  
    // resolve options for this instance
    const opts = Object.assign({
      root: main.nodeName,
      baseViewUrl: '/views'
    }, options || {});
  
    // create singleton view engine with micro bindings
    var view = new MuView(mu, {
      micro: this._micro,
      basePath: opts.baseViewUrl,
    });
  
    // init macros
    Object.getOwnPropertyNames(this._macro).forEach((prop) => {
      var mod = this._macro[prop];
      var instance = MuUtil.initModule(mod, mu, view, true);
      // assign to the mu instance (as macro)
      MuUtil.defineProp(mu, mod.name, instance);
    });
  
    // attach/assign root object
    MuUtil.defineProp(mu, 'root', {
      element: view.attach(main),
      selector: opts.root,
    });
  
    // emit ready
    mu.emit('ready');
    return mu;
  }
}

Mu._macro = {}; // define static macro singleton modules on mu instance
Mu._micro = {}; // define static micro components for view bindings
