'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('http://localhost:3000/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal Registrasi');

      alert('Registrasi Berhasil! Silakan Login.');
      router.push('/login');

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-green-600">Daftar Penghuni</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-4">
          <div><label className="block text-sm font-medium">Nama</label><input type="text" required className="w-full border p-2 rounded" value={name} onChange={(e)=>setName(e.target.value)}/></div>
          <div><label className="block text-sm font-medium">Email</label><input type="email" required className="w-full border p-2 rounded" value={email} onChange={(e)=>setEmail(e.target.value)}/></div>
          <div><label className="block text-sm font-medium">Password</label><input type="password" required className="w-full border p-2 rounded" value={password} onChange={(e)=>setPassword(e.target.value)}/></div>
          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Daftar Sekarang</button>
        </form>
        <p className="text-center mt-4 text-sm">Sudah punya akun? <a href="/login" className="text-green-600 font-bold hover:underline">Login</a></p>
      </div>
    </div>
  );
}