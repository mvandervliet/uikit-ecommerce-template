import { Mu, MuMx, attrToSelector, MuCtxSingleAttrMixin } from '../mu';
import { ShopMxSubscriber } from './helper/subscriber';

export class CatalogController {
  constructor() {
    // handle mu initialization
    this.mu.on('ready', () => {});
  }

}

const CATALOG_MICRO = {
  TILE: 'mu-shop-tile',
};

export class ProductTile extends MuMx.compose(null,
  ShopMxSubscriber,
  [MuCtxSingleAttrMixin, CATALOG_MICRO.TILE]
) {
  constructor() {
    super();
  }
}

export default Mu.macro('catalog', CatalogController)
  .micro('catalog.tile', attrToSelector(CATALOG_MICRO.TILE), ProductTile);
