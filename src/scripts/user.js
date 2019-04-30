'use strict';

(function(mu) {
  function UserController() {
    // constructor
  }
  UserController.prototype.logout = function() {
    return mu.http.get('/logout');
  }

  mu.User = mu.User || new UserController();

})((window || {}).mu = (window || {}).mu || {});