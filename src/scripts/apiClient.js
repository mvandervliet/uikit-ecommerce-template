'use strict';

(function(mu) {
  mu.http = mu.http || axios.create({
    baseURL: '/api',
  });
})((window || {}).mu = (window || {}).mu || {});
