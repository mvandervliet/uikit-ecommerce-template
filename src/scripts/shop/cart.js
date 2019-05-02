(function(M){
  'use strict';
  M.macro('Cart', function Cart() {
    var self = this;

    // hooks
    this.onReady = function() {
      this.refresh();
    };

    this.refresh = function() {
      return this.mu.api.get('/cart')
        .then(function(res) {
          console.log('cart', res);
        });
    };

  });

})(window.mu);