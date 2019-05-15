import { Mu, MuMx, attrToSelector, MuCtxAttrMixin } from '../mu';
import { ShopMxSubscriber } from './helper/subscriber';
import { ViewTemplateMixin } from './helper/viewmx';

export class CatalogController {
  constructor() {
    this._serviceUri = '/catalogue';
    this._serviceReg = new RegExp(`^(${this._serviceUri})`);
    this._normalize = this._normalize.bind(this);
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
    return product;
  }

  search(params) {
    const { router, api } = this.mu;
    const qs = typeof params === 'string' ? params : router.querystring(params || {});
    return api.get(`${this._serviceUri}?${qs}`)
      .then(res => res.data.map(this._normalize));
  }

  product(id) {
    return this.mu.api.get(`${this._serviceUri}/${id}`)
      .then(res => this._normalize(res.data))
  }
}

const CATALOG_MU = {
  // FILTERS
  // RESULTS
  // SEARCH
  // 
  PRODUCTS: 'mu-products',
  TILE: 'mu-product-tile',
};

export class Products extends MuMx.compose(null, 
  ViewTemplateMixin,
  ShopMxSubscriber
) {

  constructor() {
    super();
    this.subscribe('attached:cat.products', this.view, this.load.bind(this));
  }
  

  onMount() {
    super.onMount();
    this.context.extend({
      // state
      error: null,
      loading: false,
      paginate: this._ctxAttrBool('paginate'),
      limit: this._ctxProp('limit'),
      page: this._ctxProp('page'),
      ids: this._ctxProp('ids'),
      // actions
    });
  }

  viewTemplateDelegate() {
    return this._ctxProp('template') || 'productGrid.html';
  }

  load() {
    const { catalog } = this.mu;
    const { page, limit, tags } = this.context.get();
    const params = {
      page: page || 1, // page size
      size: limit || '', // page size
      tags: (tags || []).join(','), // tag filters
    };
    
    // console.log('PRODUCTS', params);
    this.render({ loading: true })
      .then(() => catalog.search(params))
      .then(items => this.render({ items, loading: false }))
      .catch(e => this.render({ error: e, loading: false }));
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
  .micro('cat.products', attrToSelector(CATALOG_MU.PRODUCTS), Products)
  .micro('sku.tile', attrToSelector(CATALOG_MU.TILE), ProductTile);
