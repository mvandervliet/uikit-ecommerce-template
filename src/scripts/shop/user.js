(function(M){
  'use strict';
  M.macro('User', function User() {
    var self = this;
    this.data = null;

    this.onReady = function() {

    };

    this.refresh = function() {

    };

    this.logout = function() {
      return this.mu.api.get('/logout')
        .then(function(res) {
          self.data = null;
          return res;
        });
    };

  });
})(window.mu);