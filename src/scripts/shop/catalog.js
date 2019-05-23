import { Mu, MuMx, attrToSelector, MuCtxInheritOnly, MuCtxSetterMixin } from '../mu';
import { ShopMxSubscriber } from './helper/subscriber';
import { ViewTemplateMixin } from './helper/viewmx';
import { MxCtxInsulator } from './helper/mixins';

export class CatalogController {
  constructor() {
    this._serviceUri = '/catalogue';
    this._serviceReg = new RegExp(`^(${this._serviceUri})`);
    this._normalize = this._normalize.bind(this);
    this._handleRes = this._handleRes.bind(this);
  }

  _normalize(product) {
    // create route link
    product.href = `product.html?id=${product.id}`;
    // map product images from API to the respective ingress
    product.imageUrl = (product.imageUrl || [])
      .map(src => src.replace(this._serviceReg, '/api$1'));
    product.image = product.imageUrl[0];
    // fix price format
    product.price = product.price.toFixed(2);
    // create pseudo shortdesc
    product.shortDescription = product.description.split('.').shift();
    // create pseudo type/attributes
    product.type = (product.tags || product.category || []).join(', ');
    product.attributes = ['weight', 'product_size', 'colors']
      .filter(p => product[p] && product[p] !== "0")
      .map(p => ({ name: p.replace(/[_-]/, ' '), value: product[p] }));
    // backcompat
    product.count = product.count || product.qty || 0;
    product.name = product.name || product.title || '';

    return product;
  }

  _handleRes(res) {
    if (res.data && !(res.data.status_code > 200)) {
      return res.data;
    } else {
      return Promise.reject(`${res.data.status_text}: ${res.data.error}`);
    }
  }

  search(params) {
    const { router, api } = this.mu;
    const qs = typeof params === 'string' ? params : router.querystring(params || {});
    return api.get(`${this._serviceUri}?${qs}`)
      .then(this._handleRes)
      .then(data => data.map(this._normalize));
  }

  product(id) {
    return this.mu.api.get(`${this._serviceUri}/${id}`)
      .then(this._handleRes)
      .then(sku => this._normalize(sku));
  }
}

const CATALOG_MU = {
  // FILTERS
  // RESULTS
  // SEARCH
  // 
  CATEGORY: 'mu-category',
  PRODUCTS: 'mu-products',
  TILE: 'mu-product-tile',
};

export class CategoryPage extends MuMx.compose(null, 
  MxCtxInsulator,
  ShopMxSubscriber,
  ViewTemplateMixin,
) {
  
  onInit() {
    // console.log('cat.category', 'INIT', this.context._id);
    this.connectProducts = this.connectProducts.bind(this);
    this.skusLoaded = this.skusLoaded.bind(this);
    this.subscribe('products', this.context, this.connectProducts);
  }

  onMount() {
    super.onMount();
    const { router, root } = this.mu;
    const { category, search } = router.queryparams() || {};
    
    // update title
    root.context.set('page.title', category || (search && 'Search') || 'Browse');

    // configure context binding
    return this.render({
      filterChange: this.setFilters.bind(this),
      search: {
        category,
        term: search,
      }
    });
  }

  connectProducts(products) {
    products.on('loaded', this.skusLoaded);
  }

  skusLoaded(skus) {
    const brands = this._propGroup(skus, 'brand');
    const categories = this._propGroup(skus, 'category');

    this.context.set('filters', { brands, categories });
    // console.log({
    //   brands,
    //   categories,
    // });
  }

  setFilters(form, e) {

  }

  /**
   * create an attribute grouping from sku results
   * @param {*} skus 
   * @param {*} prop 
   */
  _propGroup(skus, prop) {
    const hash = skus.map(sku => [].concat(sku[prop]))
      .reduce((g, vals) => {
        vals.forEach(val => g[val] = (g[val] || 0) + 1);
        return g;
      }, {});

    return Object.keys(hash)
      .map(value => ({
        value,
        count: hash[value]
      }))
  }

}

export class Products extends MuMx.compose(null,
  ShopMxSubscriber,
  ViewTemplateMixin,
  [MuCtxSetterMixin, 'ref'],
) {

  onInit() {
    // console.log('cat.products', 'INIT', this.context._id);
    // this.subscribe('attached:cat.products', this.view, this.load.bind(this));
  }
  
  onMount() {
    // console.log('cat.products', 'MOUNT', this.context._id, this.node.parentNode);
    super.onMount();
    this.context.extend({
      // state
      error: null,
      loading: false,
      pagination: {
        max: this._ctxProp('max') || 1e3,
        limit: ~~this._ctxProp('limit'),
        page: 1,
      },
      // actions
      layout: {
        change: {
          grid: this.setLayout.bind(this, 'grid'),
          list: this.setLayout.bind(this, 'list'),
        }
      },
    });

    // Handle load on context-provided property
    const autoload = this._ctxKey('autoload');
    return autoload ?
      this.context.always(autoload, s => s && this.load()) :
      this.load();
  }

  // onDispose() {
  //   console.log('cat.products', 'DISPOSE', this.context._id);
  //   super.onDispose();
  // }

  viewTemplateDelegate() {
    return this._ctxProp('template') || 'productGrid.html';
  }

  setLayout(type, e) {
    const switcher = this.context.get('layout.switch');
    switcher.show(type === 'list' ? 1 : 0);
    this.context.set(`layout.list`, false).set(`layout.grid`, false);
    this.context.set(`layout.${type}`, true);
  }

  load() {
    // console.log('cat.products', 'LOAD', this.context._id);
    const { catalog } = this.mu;
    const { max } = this.context.get('pagination');
    const { category } = this.context.get('search') || {};

    const categories = category && [].concat(category || []);
    const params = {
      ...(max ? { size: max } : {}), // limit total results
      // TODO: fix broken filtering
      // ...(category ? {
      //   categories: categories.join(','),
      //   tags: categories.join(','), // backcompat
      // }: {}),
    };
    
    // console.log('PRODUCTS', params);
    this.render({ loading: true })
      .then(() => catalog.search(params))
      .then(items => {
        this.emit('loaded', items);
        return this.renderPage(items, 1);
      })
      .catch(error => this.render({
        error,
        items: null,
        loading: false,
       }));
  }

  renderPage(items, p) {
    const { limit } = this.context.get('pagination');
    const numPages = limit ? Math.ceil(items.length / limit) : 1;
    const slice = limit ? items.slice().slice((p - 1) * limit, p * limit) : items;
    
    // create client-pagination bindings
    const prev = p > 1 && this.renderPage.bind(this, items, p - 1);
    const next = p < numPages && this.renderPage.bind(this, items, p + 1);
    const hasMore = !!next;
    const pages = Array.apply(null, Array(numPages)).map((n, i) => ({
      number: i + 1,
      isCurrent: p === i + 1,
      click: this.renderPage.bind(this, items, i + 1), 
    }));

    return this.render({
      loading: false,
      items: slice, // this page of items
      pages, // paging
      hasMore,
      actions: {
        prev,
        next, // next page button
      },
    });
  }

}

export class ProductTile extends MuMx.compose(null, ViewTemplateMixin) {
  
  onMount() {
    super.onMount();
    const product = this._ctxAttrValue('product');
    this.render({
      product,
      atc: this.addToCart.bind(this),
    });
  }

  viewTemplateDelegate() {
    return this._ctxProp('template') || 'productCard.html';
  }

  addToCart() {
    const item = this.context.get('product');
    return this.mu.cart.add(item, 1);
  }
}

export default Mu.macro('catalog', CatalogController)
  .micro('cat.category', attrToSelector(CATALOG_MU.CATEGORY), CategoryPage)
  .micro('cat.products', attrToSelector(CATALOG_MU.PRODUCTS), Products)
  .micro('sku.tile', attrToSelector(CATALOG_MU.TILE), ProductTile);
