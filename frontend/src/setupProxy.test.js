const { createProxyMiddleware } = require('http-proxy-middleware');
const registerProxy = require('./setupProxy');

jest.mock('http-proxy-middleware', () => ({ createProxyMiddleware: jest.fn(() => 'proxy') }));

it('preserves the browser origin on the API proxy', () => {
  const app = { use: jest.fn() };
  registerProxy(app);
  expect(app.use.mock.calls[0][0]).toBe('/api');
  expect(createProxyMiddleware).toHaveBeenCalledWith(expect.objectContaining({
    target: 'http://localhost:5000',
    changeOrigin: false,
  }));
  expect(createProxyMiddleware.mock.calls[0][0].ws).not.toBe(true);
});
