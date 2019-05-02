(function(M){
  'use strict';
  
  M.macro('Page', function PageController() {
    var self = this;
    var alias = { home: [/^\/$/] };
    var errPage = '50x';
    var pages = {
      '50x':      '50x.html',
      '404':      '404.html',
      about:      'about.html',
      account:    'account.html',
      article:    'article.html',
      blog:       'blog.html',
      brands:     'brands.html',
      cart:       'cart.html',
      catalog:    'catalog.html',
      category:   'category.html',
      checkout:   'checkout.html',
      compare:    'compare.html',
      contact:    'contacts.html',
      delivery:   'delivery.html',
      faq:        'faq.html',
      favorites:  'favorites.html',
      home:       'index.html',
      news:       'news.html',
      personal:   'personal.html',
      product:    'product.html',
      settings:   'settings.html',
      subcategory:'subcategory.html'
    };

    function setPage(page) {
      self.emit(page);
    }

    function pageHref(page) {
      return pages[page];
    };

    // hooks
    this.onReady = function() {
      var router = this.mu.router;
      // register pages with the router
      Object.keys(pages).forEach(function(route) {
        router.register(route, pages[route], alias[route]);
      });
      // resolve the initial page
      var page = router.initial('404');
      // set the page
      setPage(page);
    };

    /**
     * handle back nav
     */
    this.onRouterBack = function(state) {
      var page = (state && state.name) || this.router.resolve();
      this.load(page).then(setPage.bind(null, page));
    };

    /**
     * respond to router
     */
    this.onRouterUpdate = function(page, search, params) {
      this.load(page).then(setPage.bind(null, page));
    };

    /**
     * load a new page
     */
    this.load = function(page) {
      var root = this.mu.root;
      var url = pageHref(page);
      return this.view.load(url)
        .then(function(html) {
          // update root dom
          var doc = self.view.virtual(html); // render full page in virtual DOM
          var node = doc.querySelector(root.selector); // locate related root node
          self.view.apply(root.element, (node ? node.innerHTML : html)); // swap root content
        }).catch(function(e) {
          return page !== errPage ? self.load(errPage) : Promise.reject(e);
        });
    };

  });

})(window.mu);