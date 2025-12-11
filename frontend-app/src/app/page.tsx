'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gql, useQuery, useMutation } from '@apollo/client';

// --- GRAPHQL QUERIES & MUTATIONS ---
const GET_DATA = gql`
  query GetData($email: String!) {
    rooms { id, number, price, facilities, status, tenantEmail }
    myRoom(email: $email) { id, number, price, facilities }
    myPayments(email: $email) { id, month, amount, status, proofImage }
    myComplaints(email: $email) { id, description, status, date }
    # Admin Data
    complaints { id, userEmail, roomNumber, description, status, date }
    payments { id, userEmail, roomNumber, amount, month, status, proofImage }
  }
`;

const BOOK_ROOM = gql` mutation BookRoom($id: ID!) { bookRoom(id: $id) { id, status } } `;
const CREATE_ROOM = gql` mutation CreateRoom($number: String!, $price: Int!, $facilities: String) { createRoom(number: $number, price: $price, facilities: $facilities) { id } } `;
const UPDATE_ROOM = gql` mutation UpdateRoom($id: ID!, $status: String!) { updateRoomStatus(id: $id, status: $status) { id } } `;
const CREATE_COMPLAINT = gql` mutation CreateComplaint($desc: String!, $room: String!) { createComplaint(description: $desc, roomNumber: $room) { id } } `;
const PAY_BILL = gql` mutation PayBill($id: ID!, $proof: String!) { uploadPaymentProof(id: $id, proofImage: $proof) { id } } `;
const ADMIN_CONFIRM_PAY = gql` mutation ConfirmPay($id: ID!) { confirmPayment(id: $id) { id } } `;
const ADMIN_UPDATE_COMPLAINT = gql` mutation UpdateComplaint($id: ID!, $status: String!) { updateComplaintStatus(id: $id, status: $status) { id } } `;

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home'); // home, billing, complaint, admin_rooms, admin_finance, admin_complaints

  // Forms State
  const [desc, setDesc] = useState('');
  const [proof, setProof] = useState('');
  const [newRoom, setNewRoom] = useState({ number: '', price: '', facilities: '' });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) router.push('/login');
    else setUser(JSON.parse(u));
  }, [router]);

  const { data, refetch } = useQuery(GET_DATA, { 
    variables: { email: user?.email || '' },
    pollInterval: 2000,
    skip: !user 
  });

  // --- MUTATIONS ---
  const [bookRoom] = useMutation(BOOK_ROOM, { onCompleted: () => { alert('Berhasil Booking!'); refetch(); } });
  const [createComplaint] = useMutation(CREATE_COMPLAINT, { onCompleted: () => { alert('Laporan Terkirim'); setDesc(''); refetch(); } });
  const [payBill] = useMutation(PAY_BILL, { onCompleted: () => { alert('Bukti Terupload'); setProof(''); refetch(); } });
  
  // Admin Mutations
  const [createRoom] = useMutation(CREATE_ROOM, { onCompleted: () => { alert('Kamar Dibuat'); setNewRoom({number:'', price:'', facilities:''}); refetch(); } });
  const [updateRoom] = useMutation(UPDATE_ROOM, { onCompleted: () => refetch() });
  const [confirmPay] = useMutation(ADMIN_CONFIRM_PAY, { onCompleted: () => refetch() });
  const [updateComplaint] = useMutation(ADMIN_UPDATE_COMPLAINT, { onCompleted: () => refetch() });

  if (!user) return <div className="p-10">Loading Auth...</div>;

  // --- COMPONENTS RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white shadow-lg h-screen sticky top-0 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-700">Kost Apps</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome, {user.name}</p>
          <span className="text-xs font-bold uppercase bg-gray-200 px-2 py-1 rounded mt-2 inline-block">{user.role}</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {user.role === 'user' && (
            <>
              <NavBtn label="🏠 Cari Kamar" active={activeTab==='home'} onClick={()=>setActiveTab('home')} />
              <NavBtn label="🛏️ Kamar Saya" active={activeTab==='myroom'} onClick={()=>setActiveTab('myroom')} />
              <NavBtn label="💳 Tagihan & Bayar" active={activeTab==='billing'} onClick={()=>setActiveTab('billing')} />
              <NavBtn label="📢 Pengaduan" active={activeTab==='complaint'} onClick={()=>setActiveTab('complaint')} />
            </>
          )}
          {user.role === 'admin' && (
            <>
              <NavBtn label="🏨 Manajemen Kamar" active={activeTab==='home'} onClick={()=>setActiveTab('home')} />
              <NavBtn label="💰 Keuangan" active={activeTab==='admin_finance'} onClick={()=>setActiveTab('admin_finance')} />
              <NavBtn label="🛠️ Komplain Masuk" active={activeTab==='admin_complaints'} onClick={()=>setActiveTab('admin_complaints')} />
            </>
          )}
        </nav>
        
        <div className="p-4 border-t">
          <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="w-full bg-red-100 text-red-600 py-2 rounded font-bold hover:bg-red-200">Logout</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* --- USER: CARI KAMAR (HOME) --- */}
        {user.role === 'user' && activeTab === 'home' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Katalog Kamar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data?.rooms.map((r:any) => (
                <div key={r.id} className="bg-white p-5 rounded-lg shadow hover:shadow-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold">{r.number}</h3>
                    <Badge status={r.status} />
                  </div>
                  <p className="text-blue-600 font-bold text-xl">Rp {r.price.toLocaleString()}</p>
                  <p className="text-gray-500 text-sm mt-1">{r.facilities}</p>
                  {r.status === 'TERSEDIA' && (
                    <button onClick={() => { if(confirm('Sewa kamar ini?')) bookRoom({variables:{id:r.id}, context:{headers:{'x-user-payload':JSON.stringify(user)}}}) }} 
                      className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Sewa Sekarang</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- USER: KAMAR SAYA --- */}
        {user.role === 'user' && activeTab === 'myroom' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Informasi Sewa Pribadi</h2>
            {data?.myRoom ? (
              <div className="bg-white p-8 rounded-lg shadow max-w-2xl border-l-4 border-blue-500">
                <h3 className="text-3xl font-bold text-gray-800 mb-2">Kamar {data.myRoom.number}</h3>
                <p className="text-gray-600 mb-4">Fasilitas: {data.myRoom.facilities}</p>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="font-bold text-blue-800">Harga Sewa: Rp {data.myRoom.price.toLocaleString()}/bulan</p>
                  <p className="text-sm text-blue-600 mt-1">Jatuh Tempo: Tanggal 10 setiap bulan</p>
                </div>
              </div>
            ) : <p className="text-gray-500">Anda belum menyewa kamar.</p>}
          </div>
        )}

        {/* --- USER: TAGIHAN --- */}
        {user.role === 'user' && activeTab === 'billing' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Riwayat Tagihan</h2>
            <div className="space-y-4">
              {data?.myPayments.map((p:any) => (
                <div key={p.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{p.month}</p>
                    <p className="text-gray-600">Total: Rp {p.amount.toLocaleString()}</p>
                    {p.proofImage && <p className="text-xs text-green-600 mt-1">Bukti terupload: {p.proofImage}</p>}
                  </div>
                  <div className="text-right">
                    <Badge status={p.status} />
                    {p.status === 'MENUNGGU' && (
                      <div className="mt-2 flex gap-2">
                        <input type="text" placeholder="Link/Nama File Bukti" className="border p-1 text-sm rounded w-32" 
                          value={proof} onChange={e=>setProof(e.target.value)} />
                        <button onClick={() => payBill({variables:{id:p.id, proof}})} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Upload</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- USER: PENGADUAN --- */}
        {user.role === 'user' && activeTab === 'complaint' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Laporan Kerusakan</h2>
            <div className="bg-white p-6 rounded shadow mb-8">
              <h3 className="font-bold mb-4">Buat Laporan Baru</h3>
              <div className="flex gap-4">
                <input type="text" placeholder="Keluhan (misal: AC Panas)" className="flex-1 border p-2 rounded" 
                  value={desc} onChange={e=>setDesc(e.target.value)} />
                <button onClick={() => { if(data?.myRoom) createComplaint({variables:{desc, room: data.myRoom.number}, context:{headers:{'x-user-payload':JSON.stringify(user)}}}) }} 
                  className="bg-red-600 text-white px-6 py-2 rounded font-bold">Lapor</button>
              </div>
            </div>
            <div className="space-y-3">
              {data?.myComplaints.map((c:any) => (
                <div key={c.id} className="bg-white p-4 rounded border border-gray-200 flex justify-between">
                  <div>
                    <p className="font-bold">{c.description}</p>
                    <p className="text-xs text-gray-500">{c.date}</p>
                  </div>
                  <Badge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- ADMIN: MANAJEMEN KAMAR --- */}
        {user.role === 'admin' && activeTab === 'home' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Manajemen Kamar</h2>
            {/* Form Tambah */}
            <div className="bg-white p-6 rounded shadow mb-8 border-l-4 border-purple-500">
              <h3 className="font-bold mb-4">Tambah Kamar Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input placeholder="No. Kamar" className="border p-2 rounded" value={newRoom.number} onChange={e=>setNewRoom({...newRoom, number:e.target.value})} />
                <input placeholder="Harga" type="number" className="border p-2 rounded" value={newRoom.price} onChange={e=>setNewRoom({...newRoom, price:e.target.value})} />
                <input placeholder="Fasilitas" className="border p-2 rounded" value={newRoom.facilities} onChange={e=>setNewRoom({...newRoom, facilities:e.target.value})} />
                <button onClick={()=>createRoom({variables:{number:newRoom.number, price:parseInt(newRoom.price), facilities:newRoom.facilities}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} 
                  className="bg-purple-600 text-white rounded font-bold">Simpan</button>
              </div>
            </div>
            
            {/* List Kamar */}
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-4">No.</th>
                    <th className="p-4">Penghuni</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rooms.map((r:any) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-bold">{r.number}</td>
                      <td className="p-4">{r.tenantEmail || '-'}</td>
                      <td className="p-4"><Badge status={r.status} /></td>
                      <td className="p-4 flex gap-2">
                        {r.status === 'TERSEDIA' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'RENOVASI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">Set Renovasi</button>}
                        {r.status === 'RENOVASI' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'TERSEDIA'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Set Tersedia</button>}
                        {r.status === 'DIPESAN' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'TERISI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Terima Penghuni</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ADMIN: KEUANGAN --- */}
        {user.role === 'admin' && activeTab === 'admin_finance' && (
          <div>
             <h2 className="text-2xl font-bold mb-6">Verifikasi Pembayaran</h2>
             <div className="grid gap-4">
               {data?.payments.map((p:any) => (
                 <div key={p.id} className="bg-white p-4 rounded shadow flex justify-between items-center border border-gray-200">
                   <div>
                     <p className="font-bold">{p.userEmail} - Kamar {p.roomNumber}</p>
                     <p className="text-sm text-gray-500">{p.month} - Rp {p.amount.toLocaleString()}</p>
                     {p.proofImage ? <p className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">Bukti: {p.proofImage}</p> : <p className="text-xs text-red-400">Belum upload bukti</p>}
                   </div>
                   <div className="flex items-center gap-4">
                     <Badge status={p.status} />
                     {p.status === 'MENUNGGU' && p.proofImage && (
                       <button onClick={()=>confirmPay({variables:{id:p.id}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} 
                        className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700">Konfirmasi Lunas</button>
                     )}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* --- ADMIN: KOMPLAIN --- */}
        {user.role === 'admin' && activeTab === 'admin_complaints' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Penanganan Komplain</h2>
            <div className="grid gap-4">
              {data?.complaints.map((c:any) => (
                <div key={c.id} className="bg-white p-4 rounded shadow border-l-4 border-red-400">
                  <div className="flex justify-between">
                    <h3 className="font-bold text-gray-800">{c.roomNumber} - {c.description}</h3>
                    <Badge status={c.status} />
                  </div>
                  <p className="text-sm text-gray-500 mb-2">Pelapor: {c.userEmail} ({c.date})</p>
                  
                  <div className="flex gap-2 mt-2">
                    {c.status === 'DITERIMA' && <button onClick={()=>updateComplaint({variables:{id:c.id, status:'DIPROSES'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded font-bold">Proses Perbaikan</button>}
                    {c.status === 'DIPROSES' && <button onClick={()=>updateComplaint({variables:{id:c.id, status:'SELESAI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded font-bold">Selesai</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---
function NavBtn({label, active, onClick}: any) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded transition ${active ? 'bg-blue-600 text-white shadow-md font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
      {label}
    </button>
  );
}

function Badge({status}: {status:string}) {
  const colors: any = {
    TERSEDIA: 'bg-green-100 text-green-700',
    DIPESAN: 'bg-yellow-100 text-yellow-700',
    TERISI: 'bg-blue-100 text-blue-700',
    RENOVASI: 'bg-red-100 text-red-700',
    MENUNGGU: 'bg-orange-100 text-orange-700',
    LUNAS: 'bg-green-100 text-green-700',
    DITERIMA: 'bg-red-100 text-red-700',
    DIPROSES: 'bg-yellow-100 text-yellow-700',
    SELESAI: 'bg-gray-200 text-gray-700',
  };
  return <span className={`px-2 py-1 rounded text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
}