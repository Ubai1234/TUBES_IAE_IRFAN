'use client';

import { useState, useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';

// --- DEFINISI GRAPHQL QUERY & MUTATION ---
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

const CREATE_ROOM = gql`
  mutation CreateRoom($number: String!, $price: Int!, $facilities: String) {
    createRoom(number: $number, price: $price, facilities: $facilities) {
      id
      number
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

const DELETE_ROOM = gql`
  mutation DeleteRoom($id: ID!) {
    deleteRoom(id: $id)
  }
`;

// --- TIPE DATA ---
interface Room {
  id: string;
  number: string;
  price: number;
  facilities: string;
  status: 'TERSEDIA' | 'DIPESAN' | 'TERISI';
}

export default function Home() {
  // State untuk Role (Simulasi Login)
  const [role, setRole] = useState<'admin' | 'user'>('user');
  
  // State Form
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomPrice, setNewRoomPrice] = useState('');
  const [newRoomFacilities, setNewRoomFacilities] = useState('');

  // Apollo Client Hooks
  const { loading, error, data, refetch } = useQuery(GET_ROOMS);
  
  const [createRoom] = useMutation(CREATE_ROOM, { 
    onCompleted: () => {
      refetch();
      setNewRoomNumber('');
      setNewRoomPrice('');
      setNewRoomFacilities('');
      alert('Kamar berhasil ditambahkan!');
    } 
  });

  const [bookRoom] = useMutation(BOOK_ROOM, {
    onCompleted: () => {
      refetch();
      alert('Berhasil booking kamar!');
    },
    onError: (err) => alert(err.message)
  });

  const [deleteRoom] = useMutation(DELETE_ROOM, {
    onCompleted: () => refetch()
  });

  // --- HANDLERS ---
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createRoom({
      variables: {
        number: newRoomNumber,
        price: parseInt(newRoomPrice),
        facilities: newRoomFacilities
      },
      context: {
        headers: {
          // Simulasi mengirim data user lewat header (sesuai logika backend server.js tadi)
          'x-user-payload': JSON.stringify({ email: 'admin@test.com', role: 'admin' })
        }
      }
    });
  };

  const handleBook = (id: string) => {
    bookRoom({
      variables: { id },
      context: {
        headers: {
          'x-user-payload': JSON.stringify({ email: 'user@test.com', role: 'user' })
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    if(!confirm('Hapus kamar ini?')) return;
    deleteRoom({
      variables: { id },
      context: {
        headers: {
          'x-user-payload': JSON.stringify({ email: 'admin@test.com', role: 'admin' })
        }
      }
    });
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      
      {/* HEADER & ROLE SWITCHER */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded shadow">
        <h1 className="text-2xl font-bold text-blue-600">🏠 Kost Management App</h1>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Simulasi Login sebagai:</span>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
            className="border p-2 rounded bg-gray-50 font-bold"
          >
            <option value="user">Anak Kost (User)</option>
            <option value="admin">Pemilik Kost (Admin)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI: DAFTAR KAMAR */}
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4">Daftar Kamar</h2>
          
          {loading && <p>Loading data...</p>}
          {error && <p className="text-red-500">Error: {error.message}</p>}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data?.rooms.map((room: Room) => (
              <div key={room.id} className={`p-4 rounded shadow border-l-4 ${
                room.status === 'TERSEDIA' ? 'bg-white border-green-500' : 
                room.status === 'DIPESAN' ? 'bg-yellow-50 border-yellow-500' : 'bg-gray-200 border-gray-500'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">Kamar {room.number}</h3>
                    <p className="text-gray-600">Rp {room.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-1">{room.facilities}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${
                    room.status === 'TERSEDIA' ? 'bg-green-100 text-green-800' : 
                    room.status === 'DIPESAN' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-300 text-gray-800'
                  }`}>
                    {room.status}
                  </span>
                </div>

                {/* TOMBOL AKSI BERDASARKAN ROLE */}
                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                  
                  {/* Jika User & Kamar Tersedia -> Muncul Tombol BOOK */}
                  {role === 'user' && room.status === 'TERSEDIA' && (
                    <button 
                      onClick={() => handleBook(room.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                    >
                      Sewa Sekarang
                    </button>
                  )}

                  {/* Jika Admin -> Muncul Tombol DELETE */}
                  {role === 'admin' && (
                    <button 
                      onClick={() => handleDelete(room.id)}
                      className="text-red-500 hover:text-red-700 text-sm underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KOLOM KANAN: FORM ADMIN (Hanya muncul jika Admin) */}
        <div>
          {role === 'admin' ? (
            <div className="bg-white p-6 rounded shadow sticky top-4">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Tambah Kamar Baru</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nomor Kamar</label>
                  <input 
                    type="text" 
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full border p-2 rounded"
                    placeholder="Contoh: A-101"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Harga (Per Bulan)</label>
                  <input 
                    type="number" 
                    value={newRoomPrice}
                    onChange={(e) => setNewRoomPrice(e.target.value)}
                    className="w-full border p-2 rounded"
                    placeholder="1500000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fasilitas</label>
                  <textarea 
                    value={newRoomFacilities}
                    onChange={(e) => setNewRoomFacilities(e.target.value)}
                    className="w-full border p-2 rounded"
                    placeholder="AC, WiFi, dll..."
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold"
                >
                  + Simpan Kamar
                </button>
              </form>
            </div>
          ) : (
            // Info box untuk User
            <div className="bg-blue-50 p-6 rounded border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">👋 Selamat Datang!</h3>
              <p className="text-sm text-blue-700">
                Silakan pilih kamar yang statusnya <strong>TERSEDIA</strong> dan klik tombol "Sewa Sekarang".
              </p>
              <div className="mt-4 text-xs text-gray-500">
                (Ubah dropdown di atas menjadi 'Pemilik Kost' untuk menambah kamar)
              </div>
            </div>
          )}
        </div>

      </div>x
    </div>
  );
}