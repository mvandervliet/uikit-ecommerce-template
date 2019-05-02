(function(M, axios){
  'use strict';
  M.macro('api', function ApiClient() {
    return axios.create({
      baseURL: '/api',
      withCredentials: true,
    });
  });
})(window.mu, window.axios);
