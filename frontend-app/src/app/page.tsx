'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gql, useQuery, useMutation } from '@apollo/client';

// --- GRAPHQL DEFINITIONS ---
const GET_ROOMS = gql`
  query GetRooms {
    rooms {
      id
      number
      price
      facilities
      status
    }
  }
`;

const BOOK_ROOM = gql`
  mutation BookRoom($id: ID!) {
    bookRoom(id: $id) {
      id
      status
    }
  }
`;

const CREATE_ROOM = gql`
  mutation CreateRoom($number: String!, $price: Int!, $facilities: String) {
    createRoom(number: $number, price: $price, facilities: $facilities) {
      id
      number
      status
    }
  }
`;

const DELETE_ROOM = gql`
  mutation DeleteRoom($id: ID!) {
    deleteRoom(id: $id)
  }
`;

// --- MAIN COMPONENT ---
export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // State form admin
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomPrice, setNewRoomPrice] = useState('');
  const [newRoomFacilities, setNewRoomFacilities] = useState('');

  // 1. CEK STATUS LOGIN SAAT LOAD HALAMAN
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      // Jika tidak ada token, tendang ke halaman login
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  // 2. QUERY & MUTATIONS
  const { loading, error, data, refetch } = useQuery(GET_ROOMS, { pollInterval: 2000 });
  
  const [bookRoom] = useMutation(BOOK_ROOM, {
    onCompleted: () => { alert("✅ Berhasil Booking!"); refetch(); },
    onError: (err) => alert("❌ " + err.message)
  });

  const [createRoom] = useMutation(CREATE_ROOM, {
    onCompleted: () => { alert("✅ Kamar dibuat!"); refetch(); setNewRoomNumber(''); setNewRoomPrice(''); setNewRoomFacilities(''); },
    onError: (err) => alert("❌ " + err.message)
  });

  const [deleteRoom] = useMutation(DELETE_ROOM, {
    onCompleted: () => { refetch(); },
    onError: (err) => alert("❌ " + err.message)
  });

  // 3. HANDLERS
  const handleBook = (id: string) => {
    if(!user) return;
    if (confirm(`Sewa kamar ini sekarang?`)) {
      bookRoom({ 
        variables: { id },
        context: { headers: { 'x-user-payload': JSON.stringify(user) } }
      });
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if(!user) return;
    createRoom({
      variables: { number: newRoomNumber, price: parseInt(newRoomPrice), facilities: newRoomFacilities },
      context: { headers: { 'x-user-payload': JSON.stringify(user) } }
    });
  };

  const handleDelete = (id: string) => {
    if(!confirm('Hapus kamar ini?')) return;
    deleteRoom({
      variables: { id },
      context: { headers: { 'x-user-payload': JSON.stringify(user) } }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Tampilan Loading Auth
  if (!user) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Memeriksa akses...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-6">
      {/* HEADER */}
      <nav className="bg-white shadow px-6 py-4 rounded-lg mb-8 flex justify-between items-center border-l-4 border-blue-600">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏠 Aplikasi Kost Enterprise</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800">{user.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {user.role}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-600 hover:text-white transition font-bold text-sm"
          >
            Keluar
          </button>
        </div>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI: DAFTAR KAMAR */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-700">Daftar Kamar Tersedia</h2>
            {loading && <span className="text-sm text-gray-500 animate-pulse">Update data...</span>}
          </div>
          
          {error && <div className="bg-red-100 text-red-600 p-4 rounded">Gagal memuat data server.</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data?.rooms.map((room: any) => (
              <div key={room.id} className={`bg-white p-5 rounded-lg shadow border transition hover:shadow-md ${
                room.status === 'TERSEDIA' ? 'border-green-400' : 'border-gray-200 opacity-80'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-800">Kamar {room.number}</h3>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide ${
                    room.status === 'TERSEDIA' ? 'bg-green-100 text-green-700' : 
                    room.status === 'DIPESAN' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {room.status}
                  </span>
                </div>
                
                <p className="text-blue-600 font-bold text-xl mb-1">Rp {room.price.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                  ✨ {room.facilities || '-'}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                  {/* Tombol Sewa (Hanya User & Kamar Tersedia) */}
                  {user.role === 'user' && room.status === 'TERSEDIA' && (
                    <button 
                      onClick={() => handleBook(room.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-blue-700 w-full"
                    >
                      Sewa Sekarang
                    </button>
                  )}

                  {/* Tombol Hapus (Hanya Admin) */}
                  {user.role === 'admin' && (
                    <button 
                      onClick={() => handleDelete(room.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium underline"
                    >
                      Hapus Kamar
                    </button>
                  )}
                  
                  {/* Status Lain */}
                  {room.status !== 'TERSEDIA' && user.role === 'user' && (
                    <button disabled className="bg-gray-100 text-gray-400 px-4 py-2 rounded-md font-bold text-sm w-full cursor-not-allowed">
                      Tidak Tersedia
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KOLOM KANAN: FORM ADMIN (Hanya tampil jika Admin) */}
        {user.role === 'admin' && (
          <div className="h-fit sticky top-6">
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
              <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                🛠 Tambah Kamar
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Nomor Kamar</label>
                  <input type="text" placeholder="Cth: A-101" className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={newRoomNumber} onChange={e => setNewRoomNumber(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Harga (Rp)</label>
                  <input type="number" placeholder="Cth: 1500000" className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={newRoomPrice} onChange={e => setNewRoomPrice(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Fasilitas</label>
                  <textarea placeholder="AC, Wifi, KM Dalam..." className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500 outline-none h-20" 
                    value={newRoomFacilities} onChange={e => setNewRoomFacilities(e.target.value)} />
                </div>
                <button type="submit" className="w-full bg-gray-800 text-white py-3 rounded-md font-bold hover:bg-black transition shadow-lg">
                  + Simpan Data
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}