const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const crypto = require('crypto'); // TAMBAHAN: Untuk generate ID unik

const app = express();
const PORT = 3000;

// Izinkan Frontend mengakses Gateway
app.use(cors({ origin: true, credentials: true }));

// --- [BARU] ENTERPRISE PATTERN: DISTRIBUTED TRACING ---
// Middleware ini menyuntikkan ID unik ke setiap request yang masuk
app.use((req, res, next) => {
  const traceId = req.headers['x-request-id'] || crypto.randomUUID();
  req.headers['x-request-id'] = traceId; // Simpan di header
  
  // Log request di level Gateway
  console.log(`[GATEWAY] 🟢 Inbound Request: ${req.method} ${req.url} | 🆔 TraceID: ${traceId}`);
  next();
});

// Proxy ke REST API (User Service)
app.use('/users', createProxyMiddleware({
  target: process.env.REST_API_URL || 'http://rest-api:3001',
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    // [PENTING] Teruskan Trace ID ke Service User
    proxyReq.setHeader('x-request-id', req.headers['x-request-id']);
  }
}));

// Proxy ke GraphQL (Kost Service)
app.use('/graphql', createProxyMiddleware({
  target: process.env.GRAPHQL_API_URL || 'http://graphql-api:4000',
  changeOrigin: true,
  ws: true,
  onProxyReq: (proxyReq, req) => {
    // [PENTING] Teruskan Trace ID & User Payload
    proxyReq.setHeader('x-request-id', req.headers['x-request-id']);
    if (req.headers['x-user-payload']) {
      proxyReq.setHeader('x-user-payload', req.headers['x-user-payload']);
    }
  }
}));

app.listen(PORT, () => console.log(`🚀 Gateway Service running on port ${PORT}`));