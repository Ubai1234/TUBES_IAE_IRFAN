const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Izinkan Frontend mengakses Gateway
app.use(cors({ origin: true, credentials: true }));

// Proxy ke REST API (Untuk Login & Register)
app.use('/users', createProxyMiddleware({
  target: 'http://rest-api:3001',
  changeOrigin: true,
}));

// Proxy ke GraphQL (Untuk Data Kamar/Tagihan)
// Penting: Meneruskan header user payload agar backend tahu siapa yang login
app.use('/graphql', createProxyMiddleware({
  target: 'http://graphql-api:4000',
  changeOrigin: true,
  ws: true,
  onProxyReq: (proxyReq, req) => {
    if (req.headers['x-user-payload']) {
      proxyReq.setHeader('x-user-payload', req.headers['x-user-payload']);
    }
  }
}));

app.listen(PORT, () => console.log(`🚀 Gateway running on port ${PORT}`));