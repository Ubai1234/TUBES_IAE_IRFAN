const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Izinkan Frontend mengakses Gateway
app.use(cors());

// Route GraphQL (Kamar)
app.use('/graphql', createProxyMiddleware({
  target: 'http://graphql-api:4000',
  changeOrigin: true,
  ws: true, // Wajib true agar fitur realtime jalan
}));

// Route User (Login/Register)
app.use('/users', createProxyMiddleware({
  target: 'http://rest-api:3001',
  changeOrigin: true,
}));

// Route ke Frontend
app.use('/', createProxyMiddleware({
  target: 'http://frontend-app:3002',
  changeOrigin: true,
}));

app.listen(3000, () => {
  console.log(`🚀 API Gateway running on http://localhost:3000`);
});