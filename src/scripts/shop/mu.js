(function(Mu, uikit, axios, _) {
  'use strict';

  var _macro = {}; // define macro singleton modules on mu instance
  var _micro = {}; // define micro components for view bindings

  /**
   * Emitter used for child modules
   * @param {*} mu 
   * @param {*} child 
   */
  function MuChildEmitter(mu, child) {
    this.emit = function(hook) {
      hook = child + hook.charAt(0).toUpperCase() + hook.slice(1);
      var args = Array.prototype.slice.call(arguments, 1);
      return mu.emit.apply(mu, [hook].concat(args));
    };
  }

  /**
   * Mu client rendering engine
   * @param {Mu} mu - Mu instance
   * @param {object} options - view options 
   * @param {string} options.path - base path for view loading
   * @param {object} options.micro - micro module definitions
   */
  function MuView(mu, options) {
    var self = this;
    var _cache = {};
    var loader = axios.create({
      // template loader defaults
    });

    this.all = function(sel) {
      return mu.root.element.querySelectorAll(sel);
    };

    this.one = function(sel) {
      return mu.root.element.querySelector(sel);
    };

    this.load = function(path) {
      return Promise.resolve(_cache[path] || loader.get(path).then(function(res) { return res.data; }))
        .then(function(tmpl) {
          _cache[path] = tmpl;
          return tmpl;
        });
    };

    this.loadTemplate = function(view) {
      var path = viewPath + '/' + view;
      return this.load(path).then(function(tmpl) { 
        return _.template(tmpl);
      });
    };

    this.render = function(view, target, data) {
      return this.loadTemplate(view).then(function(template) {
        var html = template(data);
        self.apply(target, html);
        mu.emit('viewRendered', view, data);
      });
    };

    this.apply = function(target, html) {
      target.innerHTML = html;
      this.attach(target);
      uikit.update(target);
    };

    this.attach = function(target) {

      // bind mu
      [target].concat(Array.apply(null, target.querySelectorAll('[mu]')))
        .forEach(function(el) {
          _defineProp(el, 'mu', mu);
        });

      // bind micros
      Object.getOwnPropertyNames(options.micro).forEach(function(prop) {
        var mod = options.micro[prop];
        var nodes = target.querySelectorAll(mod.binding);
        // instantiate per node
        Array.apply(null, nodes).forEach(function(el) {
          var instance = _initModule(mod, mu, self);
          _defineProp(instance, 'node', el); // assign node prop to the micro
          _defineProp(el, mod.name, instance); // assign the module to the node
          instance.onMount();
        });
      });

      mu.emit('viewAttached', target);
      return target;
    };

    this.virtual = function(html) {
      var parser = new DOMParser();
      return parser.parseFromString(html, 'text/html');
    };
  }

  /**
   * define property on object
   * @param {*} obj 
   * @param {*} prop 
   * @param {*} value 
   * @param {*} writable 
   */
  function _defineProp(obj, prop, value, writable) {
    Object.defineProperty(obj, prop, {
      writable: writable || false,
      value: value,
    });
  }

  /**
   * capture module definitions for later instantiation
   */
  function _defineModule(layer, binding, name, ctor) {
    var args = Array.prototype.slice.call(arguments, 3);
    var mod = { binding: binding, name: name, ctor: ctor, args: args };
    _defineProp(layer, name, mod);
  };

  /**
   * 
   * @param {*} mod - module definition
   * @param {Mu} mu - mu instance
   * @param {MuView} view - mu view
   */
  function _initModule(mod, mu, view) {
    // fill lifecycle methods
    var noop = function() {};
    mod.ctor.prototype.onInit = noop;
    mod.ctor.prototype.didMount = noop;
    // instantiate
    var instance = new (Function.prototype.bind.apply(mod.ctor, mod.args));
    var emitter = new MuChildEmitter(mu, mod.name);

    // define ivars on the module
    Object.defineProperties(instance, {
      mu: { value: mu, writable: false }, // mu app instance
      ui: { value: uikit, writable: false }, // uikit
      view: { value: view, writable: false }, // view engine
      emit: { value: emitter.emit, writable: false } // event emitter
    });

    // call lifecycle hook
    instance.onInit && instance.onInit();
    return instance;
  }

  /**
   * register a component to the mu namespace (macro)
   */
  Mu.macro = function(name, Macro) {
    _defineModule.apply(null, [_macro, name].concat(Array.apply(null, arguments)));
    return Mu;
  };

  /**
   * register a component to the mu namespace (macro)
   */
  Mu.micro = function(selector, name, Micro) {
    _defineModule.apply(null, [_micro].concat(Array.apply(null, arguments)));
    return Mu;
  };

  /**
   * Mu initializer
   */
  Mu.init = function(main, o) {
    var mu = new Mu();

    // resolve options for this instance
    var options = _.defaults(o || {}, {
      root: main.nodeName,
      viewPath: '/views'
    });

    // create shared view engine
    var view = new MuView(mu, {
      path: options.viewPath,
      micro: _micro
    });

    // assign root object
    Object.defineProperty(mu, 'root', {
      writable: false,
      value: {
        element: view.attach(main),
        selector: options.root,
      }
    });

    // init macros
    Object.getOwnPropertyNames(_macro).forEach(function(prop) {
      var mod = _macro[prop];
      var instance = _initModule(mod, mu, view, true);
      // assign to the mu instance (as macro)
      _defineProp(mu, mod.name, instance);
    });

    // emit ready
    mu.emit('ready');
  };

  // Mu instance methods
  
  /**
   * mu event emitter
   */
  Mu.prototype.emit = function(hook) {
    var call = "on" + hook.charAt(0).toUpperCase() + hook.slice(1);
    var args = Array.prototype.slice.call(arguments, 1);
    function hasHook(m) {
      return _.isObject(m) && _.isFunction(m[call]);
    }
    console.log('MuEmit::' + call);
    var mu = this;
    Object.getOwnPropertyNames(mu)
      .map(function(prop) { return mu[prop]; })
      .filter(hasHook)
      .forEach(function(m) {
        m[call].apply(m, args);
      });
  };

})(
  (window || {}).mu = (window || {}).mu || function Mu(){}, // mu app
  (window || {}).UIkit, // uikit
  (window || {}).axios, // axios
  (window || {})._ // underscore
);