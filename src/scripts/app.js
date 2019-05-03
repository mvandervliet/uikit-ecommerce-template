// load deps

import 'core-js/features/promise';

// load app modules
import { Mu } from './shop/mu';
import './shop/ui';
import './shop/api';
import './shop/router';
import './shop/page';
import './shop/cart';
import './shop/user';

// Run Mu Shop
export default Mu.init(document.getElementById('app'), {
  root: '#app',
  baseViewUrl: '/views',
});
