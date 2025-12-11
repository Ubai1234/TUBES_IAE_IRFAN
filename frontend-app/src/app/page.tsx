'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gql, useQuery, useMutation } from '@apollo/client';

// --- GRAPHQL QUERIES (KOST APP) ---
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
const DELETE_ROOM = gql` mutation DeleteRoom($id: ID!) { deleteRoom(id: $id) } `; // <-- FITUR BARU
const CREATE_COMPLAINT = gql` mutation CreateComplaint($desc: String!, $room: String!) { createComplaint(description: $desc, roomNumber: $room) { id } } `;
const PAY_BILL = gql` mutation PayBill($id: ID!, $proof: String!) { uploadPaymentProof(id: $id, proofImage: $proof) { id } } `;
const ADMIN_CONFIRM_PAY = gql` mutation ConfirmPay($id: ID!) { confirmPayment(id: $id) { id } } `;
const ADMIN_UPDATE_COMPLAINT = gql` mutation UpdateComplaint($id: ID!, $status: String!) { updateComplaintStatus(id: $id, status: $status) { id } } `;

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home'); 
  
  // State Form
  const [desc, setDesc] = useState('');
  const [proof, setProof] = useState('');
  const [newRoom, setNewRoom] = useState({ number: '', price: '', facilities: '' });

  // Cek Login
  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) {
      router.push('/login'); 
    } else {
      setUser(JSON.parse(u));
    }
  }, [router]);

  // Ambil Data dari Backend
  const { data, refetch } = useQuery(GET_DATA, { 
    variables: { email: user?.email || '' },
    pollInterval: 2000, // Update otomatis tiap 2 detik
    skip: !user 
  });

  // --- ACTIONS ---
  const [bookRoom] = useMutation(BOOK_ROOM, { onCompleted: () => { alert('Berhasil Booking!'); refetch(); } });
  const [createComplaint] = useMutation(CREATE_COMPLAINT, { onCompleted: () => { alert('Laporan Terkirim'); setDesc(''); refetch(); } });
  const [payBill] = useMutation(PAY_BILL, { onCompleted: () => { alert('Bukti Terupload'); setProof(''); refetch(); } });
  
  // Admin Actions
  const [createRoom] = useMutation(CREATE_ROOM, { onCompleted: () => { alert('Kamar Dibuat'); setNewRoom({number:'', price:'', facilities:''}); refetch(); } });
  const [updateRoom] = useMutation(UPDATE_ROOM, { onCompleted: () => refetch() });
  const [deleteRoom] = useMutation(DELETE_ROOM, { onCompleted: () => { alert('Kamar Berhasil Dihapus'); refetch(); } }); // <-- FITUR BARU
  const [confirmPay] = useMutation(ADMIN_CONFIRM_PAY, { onCompleted: () => refetch() });
  const [updateComplaint] = useMutation(ADMIN_UPDATE_COMPLAINT, { onCompleted: () => refetch() });

  if (!user) return <div className="min-h-screen flex items-center justify-center">Memuat Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white shadow-lg h-screen sticky top-0 flex flex-col z-10">
        <div className="p-6 border-b bg-blue-700 text-white">
          <h1 className="text-2xl font-bold">Kost Apps</h1>
          <p className="text-sm opacity-80 mt-1">Halo, {user.name}</p>
          <span className="text-xs font-bold uppercase bg-white text-blue-800 px-2 py-1 rounded mt-2 inline-block">{user.role}</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {user.role === 'user' && (
            <>
              <NavBtn label="🏠 Cari Kamar" active={activeTab==='home'} onClick={()=>setActiveTab('home')} />
              <NavBtn label="🛏️ Kamar Saya" active={activeTab==='myroom'} onClick={()=>setActiveTab('myroom')} />
              <NavBtn label="💳 Tagihan" active={activeTab==='billing'} onClick={()=>setActiveTab('billing')} />
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

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* === FITUR USER: CARI KAMAR === */}
        {user.role === 'user' && activeTab === 'home' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Katalog Kamar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data?.rooms.map((r:any) => (
                <div key={r.id} className="bg-white p-5 rounded-lg shadow hover:shadow-lg border border-gray-200 transition">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{r.number}</h3>
                    <Badge status={r.status} />
                  </div>
                  <p className="text-blue-600 font-bold text-xl">Rp {r.price.toLocaleString()}</p>
                  <p className="text-gray-500 text-sm mt-1 mb-4">{r.facilities}</p>
                  
                  {r.status === 'TERSEDIA' ? (
                    <button onClick={() => { if(confirm('Sewa kamar ini?')) bookRoom({variables:{id:r.id}, context:{headers:{'x-user-payload':JSON.stringify(user)}}}) }} 
                      className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Sewa Sekarang</button>
                  ) : (
                    <button disabled className="w-full bg-gray-200 text-gray-400 py-2 rounded font-bold cursor-not-allowed">Tidak Tersedia</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === FITUR USER: KAMAR SAYA === */}
        {user.role === 'user' && activeTab === 'myroom' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Kamar Saya</h2>
            {data?.myRoom ? (
              <div className="bg-white p-6 rounded shadow border-l-8 border-blue-500">
                <h3 className="text-3xl font-bold text-gray-800 mb-2">Kamar {data.myRoom.number}</h3>
                <p className="text-lg text-gray-600 mb-4">Fasilitas: {data.myRoom.facilities}</p>
                <div className="bg-blue-50 p-4 rounded text-blue-800">
                  <p className="font-bold">Harga Sewa: Rp {data.myRoom.price.toLocaleString()}/bulan</p>
                </div>
              </div>
            ) : <div className="text-gray-500 italic p-4 bg-white rounded shadow">Anda belum menyewa kamar. Silakan cari di menu Katalog.</div>}
          </div>
        )}

        {/* === FITUR USER: TAGIHAN === */}
        {user.role === 'user' && activeTab === 'billing' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Riwayat Tagihan</h2>
            <div className="space-y-4">
              {data?.myPayments.map((p:any) => (
                <div key={p.id} className="bg-white p-5 rounded shadow flex flex-col md:flex-row justify-between items-center border">
                  <div>
                    <p className="font-bold text-lg text-gray-800">{p.month}</p>
                    <p className="text-blue-600 font-semibold">Rp {p.amount.toLocaleString()}</p>
                    {p.proofImage && <p className="text-xs text-green-600 mt-1 bg-green-50 px-2 py-1 rounded inline-block">✅ Bukti: {p.proofImage}</p>}
                  </div>
                  <div className="text-right mt-4 md:mt-0">
                    <div className="mb-2"><Badge status={p.status} /></div>
                    {p.status === 'MENUNGGU' && (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Nama File Bukti..." className="border p-2 text-sm rounded w-40" 
                          value={proof} onChange={e=>setProof(e.target.value)} />
                        <button onClick={()=>payBill({variables:{id:p.id, proof}})} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700">Upload</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {data?.myPayments.length === 0 && <p className="text-gray-500">Belum ada tagihan.</p>}
            </div>
          </div>
        )}

        {/* === FITUR USER: PENGADUAN === */}
        {user.role === 'user' && activeTab === 'complaint' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Laporan & Komplain</h2>
            
            {/* Form Lapor */}
            <div className="bg-white p-6 rounded shadow mb-8 border border-red-100">
              <h3 className="font-bold mb-4 text-red-600">Buat Laporan Baru</h3>
              <div className="flex gap-4">
                <input type="text" placeholder="Contoh: AC Bocor, Lampu Mati..." className="flex-1 border p-3 rounded focus:ring-2 focus:ring-red-500 outline-none" 
                  value={desc} onChange={e=>setDesc(e.target.value)} />
                <button onClick={() => { if(data?.myRoom) createComplaint({variables:{desc, room: data.myRoom.number}, context:{headers:{'x-user-payload':JSON.stringify(user)}}}) }} 
                  className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700">Kirim Laporan</button>
              </div>
              {!data?.myRoom && <p className="text-xs text-red-400 mt-2">*Anda harus punya kamar dulu untuk melapor.</p>}
            </div>

            {/* List Laporan */}
            <div className="space-y-3">
              {data?.myComplaints.map((c:any) => (
                <div key={c.id} className="bg-white p-4 rounded border border-gray-200 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-800">{c.description}</p>
                    <p className="text-xs text-gray-500">{c.date}</p>
                  </div>
                  <Badge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === FITUR ADMIN: MANAJEMEN KAMAR === */}
        {user.role === 'admin' && activeTab === 'home' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Manajemen Kamar</h2>
            
            {/* Form Tambah */}
            <div className="bg-white p-6 rounded shadow mb-8 border-t-4 border-purple-600">
              <h3 className="font-bold mb-4 text-gray-700">Tambah Kamar Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input placeholder="No. Kamar (A-01)" className="border p-2 rounded" value={newRoom.number} onChange={e=>setNewRoom({...newRoom, number:e.target.value})} />
                <input placeholder="Harga (Rp)" type="number" className="border p-2 rounded" value={newRoom.price} onChange={e=>setNewRoom({...newRoom, price:e.target.value})} />
                <input placeholder="Fasilitas" className="border p-2 rounded" value={newRoom.facilities} onChange={e=>setNewRoom({...newRoom, facilities:e.target.value})} />
                <button onClick={()=>createRoom({variables:{number:newRoom.number, price:parseInt(newRoom.price), facilities:newRoom.facilities}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} 
                  className="bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Simpan Data</button>
              </div>
            </div>
            
            {/* Tabel Kamar */}
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-4 font-bold text-gray-600">No. Kamar</th>
                    <th className="p-4 font-bold text-gray-600">Penghuni</th>
                    <th className="p-4 font-bold text-gray-600">Status</th>
                    <th className="p-4 font-bold text-gray-600">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.rooms.map((r:any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold">{r.number}</td>
                      <td className="p-4 text-gray-500">{r.tenantEmail || '-'}</td>
                      <td className="p-4"><Badge status={r.status} /></td>
                      <td className="p-4 flex items-center gap-2">
                        {/* Tombol Status */}
                        {r.status === 'TERSEDIA' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'RENOVASI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded font-bold hover:bg-orange-200">Set Renovasi</button>}
                        {r.status === 'RENOVASI' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'TERSEDIA'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-green-100 text-green-600 px-3 py-1 rounded font-bold hover:bg-green-200">Set Tersedia</button>}
                        {r.status === 'DIPESAN' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'TERISI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded font-bold hover:bg-blue-200">Terima Penghuni</button>}
                        
                        {/* FITUR BARU: TOMBOL HAPUS */}
                        <button 
                          onClick={() => { if(confirm('⚠️ PERINGATAN: Hapus kamar ini permanen?')) deleteRoom({variables:{id:r.id}, context:{headers:{'x-user-payload':JSON.stringify(user)}}}) }} 
                          className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded font-bold hover:bg-red-200 ml-2"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === FITUR ADMIN: KEUANGAN === */}
        {user.role === 'admin' && activeTab === 'admin_finance' && (
          <div>
             <h2 className="text-2xl font-bold mb-6 text-gray-800">Verifikasi Pembayaran</h2>
             <div className="grid gap-4">
               {data?.payments.map((p:any) => (
                 <div key={p.id} className="bg-white p-4 rounded shadow flex justify-between items-center border border-gray-200">
                   <div>
                     <p className="font-bold text-gray-800">{p.userEmail} - Kamar {p.roomNumber}</p>
                     <p className="text-sm text-gray-500">{p.month} - Rp {p.amount.toLocaleString()}</p>
                     {p.proofImage ? <p className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">📎 Bukti: {p.proofImage}</p> : <p className="text-xs text-red-400 mt-1">Belum upload bukti</p>}
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
               {data?.payments.length === 0 && <p className="text-gray-500">Belum ada data pembayaran.</p>}
             </div>
          </div>
        )}

        {/* === FITUR ADMIN: KOMPLAIN === */}
        {user.role === 'admin' && activeTab === 'admin_complaints' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Daftar Komplain Masuk</h2>
            <div className="grid gap-4">
              {data?.complaints.map((c:any) => (
                <div key={c.id} className="bg-white p-4 rounded shadow border-l-4 border-red-400">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{c.roomNumber} - {c.description}</h3>
                      <p className="text-sm text-gray-500">Pelapor: {c.userEmail} ({c.date})</p>
                    </div>
                    <Badge status={c.status} />
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    {c.status === 'DITERIMA' && <button onClick={()=>updateComplaint({variables:{id:c.id, status:'DIPROSES'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-yellow-100 text-yellow-700 px-4 py-2 rounded font-bold hover:bg-yellow-200">Proses Perbaikan</button>}
                    {c.status === 'DIPROSES' && <button onClick={()=>updateComplaint({variables:{id:c.id, status:'SELESAI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-green-100 text-green-700 px-4 py-2 rounded font-bold hover:bg-green-200">Selesai</button>}
                    {c.status === 'SELESAI' && <span className="text-xs text-gray-400 font-bold">Laporan Ditutup</span>}
                  </div>
                </div>
              ))}
               {data?.complaints.length === 0 && <p className="text-gray-500">Tidak ada komplain baru.</p>}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// Sub-components
function NavBtn({label, active, onClick}: any) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded transition ${active ? 'bg-blue-800 text-white font-bold shadow-inner' : 'text-blue-100 hover:bg-blue-600'}`}>
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