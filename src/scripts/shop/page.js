import { Mu } from '../mu';

const alias = { home: [/^\/$/] };
const errPage = '50x';
const pages = {
  '50x':      '50x.html',
  '404':      '404.html',
  about:      'about.html',
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
  orders:     'orders.html',
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
    this.mu.on('ready', this._initRouter.bind(this));
  }

  _initRouter() {
    const router = this.mu.router;

    // add router listeners
    router.on('back', state => {
      var page = (state && state.name);
      return page && this.update(page);
    }).on('update', (page, search, params) => {
      this.update(page);
    });

    // register pages with the router
    Object.keys(pages).forEach(route => {
      router.register(route, pages[route], alias[route]);
    });
    
    // resolve the initial page
    const nf = '404';
    var page = router.initial(nf);
    return page === nf ? router.go(nf) : this.setPage(nf);
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
    const url = pageHref(page);
    return this.view.load(url)
      .then(html => {
        const { root } = this.mu;
        // update root dom
        const node = this.view.virtual(html, root.selector); // render full page in virtual DOM
        this.view.apply(root.element, (node ? node.innerHTML : html)); // swap root content
      }).catch(e => {
        return page !== errPage ? this.load(errPage) : Promise.reject(e);
      });
  }

}

export default Mu.macro('page', PageController);
