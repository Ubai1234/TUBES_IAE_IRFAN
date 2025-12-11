'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Login gagal');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      alert('Login Berhasil!');
      router.push('/'); 
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Background otomatis gradasi dari globals.css
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-xl bg-opacity-95">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Masuk Kost Apps</h1>
          <p className="text-gray-500 text-sm mt-2">Silakan login untuk melanjutkan</p>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-100 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
            <input type="email" required className="w-full border border-gray-300 p-3 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-brand-blue outline-none transition-all"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input type="password" required className="w-full border border-gray-300 p-3 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-brand-blue outline-none transition-all"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:to-blue-600 transition-all disabled:opacity-70 transform hover:-translate-y-0.5">
            {loading ? 'Memproses...' : 'Masuk Sekarang'}
          </button>
        </form>
        <p className="text-center mt-8 text-sm text-gray-600">
          Belum punya akun? <a href="/register" className="text-brand-blue font-bold hover:underline">Daftar disini</a>
        </p>
      </div>
    </div>
  );
}