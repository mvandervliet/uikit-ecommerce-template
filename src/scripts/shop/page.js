import { Mu } from './mu';

const alias = { home: [/^\/$/] };
const errPage = '50x';
const pages = {
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

function pageHref(page) {
  return pages[page];
};

export class PageController {
  constructor() {
    // handle mu initialization
    this.mu.on('ready', () => {
      const router = this.mu.router;
      // register pages with the router
      Object.keys(pages).forEach(function(route) {
        router.register(route, pages[route], alias[route]);
      });
      // resolve the initial page
      var page = router.initial('404');
      // set the page
      this.setPage(page);
    });

    // add router listeners
    this.mu.router.on('back', state => {
      var page = (state && state.name);
      return page && this.update(page);
    }).on('update', (page, search, params) => {
      this.update(page);
    });
  }

  setPage(page) {
    this.emit(page);
  }
  
  update(page) {
    return this.load(page).then(this.setPage.bind(this, page));
  }

  /**
   * load a new page
   */
  load(page) {
    var root = this.mu.root;
    var url = pageHref(page);
    return this.view.load(url)
      .then(html => {
        // update root dom
        var doc = this.view.virtual(html); // render full page in virtual DOM
        var node = doc.querySelector(root.selector); // locate related root node
        this.view.apply(root.element, (node ? node.innerHTML : html)); // swap root content
      }).catch(e => {
        return page !== errPage ? this.load(errPage) : Promise.reject(e);
      });
  }

}

export default Mu.macro('page', PageController);
