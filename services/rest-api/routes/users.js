const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const { v4: uuidv4 } = require('uuid');

// --- DATABASE SEMENTARA (In-Memory) ---
// Data ini akan reset jika server restart. 
// Di production nanti bisa diganti MySQL/MongoDB.
const users = [
  {
    id: '1',
    name: 'Admin Juragan',
    email: 'admin@kost.com',
    password: 'admin', 
    role: 'admin'
  },
  {
    id: '2',
    name: 'Anak Kost 1',
    email: 'user@kost.com',
    password: 'user',
    role: 'user'
  }
];

const SECRET_KEY = 'rahasia-negara-api'; // Idealnya taruh di .env

// 1. REGISTER (Pendaftaran Anak Kost Baru)
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  // Validasi Input
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Mohon lengkapi nama, email, dan password.' });
  }

  // Cek apakah email sudah dipakai
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'Email sudah terdaftar. Silakan login.' });
  }

  // Buat User Baru
  const newUser = {
    id: uuidv4(),
    name,
    email,
    password, 
    role: 'user' // Default role: user (Anak Kost)
  };

  users.push(newUser);

  res.status(201).json({ 
    message: 'Registrasi berhasil! Silakan login.', 
    user: { id: newUser.id, email: newUser.email } 
  });
});

// 2. LOGIN (Masuk Aplikasi)
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Cari user berdasarkan email & password
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Email atau password salah!' });
  }

  // Buat Token JWT (Masa berlaku 1 jam)
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  // Kirim response
  res.json({
    message: 'Login berhasil',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// 3. GET ALL USERS (Opsional: Untuk Debugging)
router.get('/', (req, res) => {
  res.json(users);
});

module.exports = router;