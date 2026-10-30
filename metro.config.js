const http = require('http');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const apiPort = Number(process.env.EXPO_PUBLIC_API_PORT || 4000);

function proxyApi(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` };
  const proxyReq = http.request({
    host: '127.0.0.1',
    port: apiPort,
    method: req.method,
    path: req.url,
    headers,
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    if (res.headersSent) return;
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Cannot reach the API on this computer.' }));
  });
  req.pipe(proxyReq);
}

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const url = req.url || '';
      if (url.startsWith('/api/') || url === '/api' || url.startsWith('/uploads/')) {
        proxyApi(req, res);
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
