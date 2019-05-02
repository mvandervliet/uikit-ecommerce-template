// load deps
//=require core-js/features/promise
//=require core-js/features/url
//=require core-js/features/url-search-params
//=require axios/dist/axios.min.js
//=require underscore/underscore-min.js

// load app modules
//=require shop/mu.js
//=require shop/router.js
//=require shop/api.js
//=require shop/page.js
//=require shop/cart.js
//=require shop/user.js

// bootstrap the app
mu.init(document.getElementById('app'), {
  root: '#app',
  views: '/views'
});
