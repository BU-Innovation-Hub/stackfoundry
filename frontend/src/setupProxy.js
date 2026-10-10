const { createProxyMiddleware } = require('http-proxy-middleware');

const API_PROXY_OPTIONS = {
  target: process.env.REACT_APP_API_PROXY_TARGET || 'http://localhost:5000',
  changeOrigin: false,
  // The API is HTTP-only. Do not route the frontend dev server's HMR socket to Express.
};

module.exports = app => {
  app.use('/api', createProxyMiddleware(API_PROXY_OPTIONS));
};
module.exports.API_PROXY_OPTIONS = API_PROXY_OPTIONS;
