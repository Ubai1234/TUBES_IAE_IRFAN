const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Izinkan Frontend (Port 3002) mengakses Gateway (Port 3000)
app.use(cors({
  origin: true, 
  credentials: true 
}));

// Route ke REST API (Login/Register/Users)
app.use('/users', createProxyMiddleware({
  target: 'http://rest-api:3001',
  changeOrigin: true,
}));

// Route ke GraphQL API (Rooms/Complaints/Finance)
app.use('/graphql', createProxyMiddleware({
  target: 'http://graphql-api:4000',
  changeOrigin: true,
  ws: true, // Websocket untuk realtime subscription
  onProxyReq: (proxyReq, req) => {
    // Teruskan header user payload agar backend tahu siapa yang login
    if (req.headers['x-user-payload']) {
      proxyReq.setHeader('x-user-payload', req.headers['x-user-payload']);
    }
  }
}));

// Route ke Frontend
app.use('/', createProxyMiddleware({
  target: 'http://frontend-app:3002',
  changeOrigin: true,
}));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});