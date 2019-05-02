(function(M, w){
  'use strict';

  /**
   * HTML5 push state router
   */
  M.macro('router', function MuRouter() {
    var self = this;
    this._routes = {};
    this._state = null;

    this.history = w.history || {};
    this.location = w.location || {};

    // handle back nav
    w.addEventListener('popstate', function(e) {
      var state = e.state;
      self._state = state;
      self.emit('back', state);
    });

    // state fallback
    ['pushState', 'replaceState'].forEach(function(prop) {
      self.history[prop] = self.history[prop] || function(s, t, r) {
        self.set(r);
      };
    });

    function _push(url, state, title) {
      self._state = state;
      self.history.pushState(state, title, url);
    };

    function _replace(url, state, title) {
      self._state = state;
      self.history.replaceState(state, title, url);
    };

    this.state = function() {
      return this._state;
    }

    this.search = function() {
      return this.location.search;
    };

    this.pathname = function() {
      return this.location.pathname;
    };

    this.querystring = function(q) {
      var query = new URLSearchParams();
      Object.keys(q).forEach(function(p){
        query.set(p, q[p]);
      });
      return query.toString();
    };

    this.queryparams = function(q) {
      q = q.split('?').slice(1).join('?');
      if (q) {
        var query = new URLSearchParams(q);
        var search = {};
        query.forEach(function(key, val) {
          search[key] = val;
        });
        return search;
      }
    };

    /**
     * add a route
     */
    this.register = function(route, path, alias) {
      this._routes[route] = {
        path: path,
        paths: [path].concat(alias || [])
      };
    };


    this.set = function(href) {
      if (this.location.href !== href) {
        this.location = href;
      }
    };

    /**
     * make router/state reflect the params
     */
    this.go = function(name, search, params, replace) {
      var route = this._routes[name];
      var qs = search ? '?' + this.querystring(search) : '';
      var call = replace ? _replace : _push;
      call(route.path + qs, {
        name: name,
        route: route,
        search: search,
        params: params
      });
      this.emit('update', name, search, params, replace);
      return this;
    };

    /**
     * resolve the initial state
     */
    this.initial = function(fallback) {
      var name = this.resolve() || fallback;
      var route = this._routes[name];
      var search = this.queryparams(this.search());
      _replace(null, {
        name: name,
        route: route,
        search: search
      });
      this.emit('initial', name);
      return name;
    };

    /**
     * resolve the registered route name from the pathname
     */
    this.resolve = function(path) {
      path = path || this.pathname();
      var routes = this._routes;
      var route = Object.keys(routes).reduce(function(p, name) {
        return p || (routes[name].paths.reduce(function(m, rule) {
          rule = rule instanceof RegExp ? rule : new RegExp(rule);
          return m || rule.test(path);
        }, false) && name);
      }, null);
      return route;
    };

  });

  /**
   * define the micro binding for router links
   */
  M.micro('[mu-route]', 'route', function MuRoute() {
    
    // micro binding
    this.onMount = function() {
      this.node.addEventListener('click', this.click.bind(this));
    };

    this.click = function(e) {
      e.preventDefault();
      var router = this.mu.router;
      var href = this.node.getAttribute('mu-route-href') || this.node.getAttribute('href') || '';
      var page = router.resolve(href);
      if (page) {
        var query = router.queryparams(href);
        router.go(page, query);
      } else {
        router.set(href);
      }
    };

  });

})(window.mu, window);
