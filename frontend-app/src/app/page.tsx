'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gql, useQuery, useMutation } from '@apollo/client';

// --- GRAPHQL QUERIES ---
const GET_DATA = gql`
  query GetData($email: String!) {
    rooms { id, number, price, facilities, status, tenantEmail }
    myRoom(email: $email) { id, number, price, facilities }
    myPayments(email: $email) { id, month, amount, status, proofImage }
    myComplaints(email: $email) { id, description, status, date }
    complaints { id, userEmail, roomNumber, description, status, date }
    payments { id, userEmail, roomNumber, amount, month, status, proofImage }
  }
`;

const BOOK_ROOM = gql` mutation BookRoom($id: ID!) { bookRoom(id: $id) { id, status } } `;
const CREATE_ROOM = gql` mutation CreateRoom($number: String!, $price: Int!, $facilities: String) { createRoom(number: $number, price: $price, facilities: $facilities) { id } } `;
const UPDATE_ROOM = gql` mutation UpdateRoom($id: ID!, $status: String!) { updateRoomStatus(id: $id, status: $status) { id } } `;
const DELETE_ROOM = gql` mutation DeleteRoom($id: ID!) { deleteRoom(id: $id) } `;
const CREATE_COMPLAINT = gql` mutation CreateComplaint($desc: String!, $room: String!) { createComplaint(description: $desc, roomNumber: $room) { id } } `;
const PAY_BILL = gql` mutation PayBill($id: ID!, $proof: String!) { uploadPaymentProof(id: $id, proofImage: $proof) { id } } `;
const ADMIN_CONFIRM_PAY = gql` mutation ConfirmPay($id: ID!) { confirmPayment(id: $id) { id } } `;
const ADMIN_UPDATE_COMPLAINT = gql` mutation UpdateComplaint($id: ID!, $status: String!) { updateComplaintStatus(id: $id, status: $status) { id } } `;

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home'); 
  
  const [desc, setDesc] = useState('');
  const [proof, setProof] = useState('');
  const [newRoom, setNewRoom] = useState({ number: '', price: '', facilities: '' });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) {
      router.push('/login'); 
    } else {
      setUser(JSON.parse(u));
    }
  }, [router]);

  const { data, refetch } = useQuery(GET_DATA, { 
    variables: { email: user?.email || '' },
    pollInterval: 2000,
    skip: !user 
  });

  const [bookRoom] = useMutation(BOOK_ROOM, { onCompleted: () => { alert('Berhasil Booking!'); refetch(); } });
  const [createComplaint] = useMutation(CREATE_COMPLAINT, { onCompleted: () => { alert('Laporan Terkirim'); setDesc(''); refetch(); } });
  const [payBill] = useMutation(PAY_BILL, { onCompleted: () => { alert('Bukti Terupload'); setProof(''); refetch(); } });
  
  const [createRoom] = useMutation(CREATE_ROOM, { onCompleted: () => { alert('Kamar Dibuat'); setNewRoom({number:'', price:'', facilities:''}); refetch(); } });
  const [updateRoom] = useMutation(UPDATE_ROOM, { onCompleted: () => refetch() });
  const [deleteRoom] = useMutation(DELETE_ROOM, { onCompleted: () => { alert('Kamar Berhasil Dihapus'); refetch(); } });
  const [confirmPay] = useMutation(ADMIN_CONFIRM_PAY, { onCompleted: () => refetch() });
  const [updateComplaint] = useMutation(ADMIN_UPDATE_COMPLAINT, { onCompleted: () => refetch() });

  if (!user) return <div className="min-h-screen flex items-center justify-center text-white font-bold text-xl">Memuat...</div>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR: Putih dengan Header Biru */}
      <aside className="w-full md:w-64 bg-white/90 backdrop-blur-md shadow-xl h-screen sticky top-0 flex flex-col z-10 border-r border-white/50">
        <div className="p-6 border-b border-blue-50 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
          <h1 className="text-2xl font-bold tracking-tight">Kost Apps</h1>
          <p className="text-sm opacity-90 mt-1 font-light">Hai, {user.name}</p>
          <span className="text-xs font-bold uppercase bg-white/20 text-white px-2 py-1 rounded mt-3 inline-block border border-white/30">{user.role}</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
        
        <div className="p-4 border-t border-blue-50 bg-blue-50/30">
          <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="w-full bg-white text-red-500 border border-red-200 py-2 rounded-lg font-bold hover:bg-red-50 transition-colors shadow-sm">Logout</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* === USER: CARI KAMAR === */}
        {user.role === 'user' && activeTab === 'home' && (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">Katalog Kamar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data?.rooms.map((r:any) => (
                <div key={r.id} className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-white/50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold text-gray-800">{r.number}</h3>
                    <Badge status={r.status} />
                  </div>
                  <div className="mb-4 bg-brand-light p-3 rounded-xl">
                    <p className="text-brand-blue font-extrabold text-2xl">Rp {r.price.toLocaleString()}</p>
                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                      <span>✨</span> {r.facilities}
                    </p>
                  </div>
                  
                  {r.status === 'TERSEDIA' ? (
                    <button onClick={() => { if(confirm('Sewa kamar ini?')) bookRoom({variables:{id:r.id}, context:{headers:{'x-user-payload':JSON.stringify(user)}}}) }} 
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-200 transition-all">
                      Sewa Sekarang
                    </button>
                  ) : (
                    <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-bold cursor-not-allowed border border-gray-200">
                      Tidak Tersedia
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === USER: KAMAR SAYA === */}
        {user.role === 'user' && activeTab === 'myroom' && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">Kamar Saya</h2>
            {data?.myRoom ? (
              <div className="bg-white p-8 rounded-2xl shadow-xl border-l-8 border-brand-blue max-w-2xl">
                <h3 className="text-4xl font-bold text-gray-800 mb-2">Kamar {data.myRoom.number}</h3>
                <div className="w-full h-px bg-gray-200 my-4"></div>
                <p className="text-lg text-gray-600 mb-6">Fasilitas: <span className="font-semibold text-brand-blue">{data.myRoom.facilities}</span></p>
                <div className="bg-brand-light p-6 rounded-xl text-brand-dark flex justify-between items-center border border-blue-100">
                  <span>Biaya Sewa</span>
                  <span className="font-bold text-xl">Rp {data.myRoom.price.toLocaleString()}<span className="text-sm font-normal">/bulan</span></span>
                </div>
              </div>
            ) : (
              <div className="bg-white/90 p-8 rounded-2xl shadow-lg text-center max-w-md mx-auto mt-10 backdrop-blur-sm">
                <p className="text-gray-600 text-lg mb-4">Anda belum menyewa kamar.</p>
                <button onClick={()=>setActiveTab('home')} className="bg-brand-blue text-white px-6 py-2 rounded-full font-bold hover:bg-brand-dark shadow-md">Cari Kamar</button>
              </div>
            )}
          </div>
        )}

        {/* === USER: TAGIHAN === */}
        {user.role === 'user' && activeTab === 'billing' && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">Riwayat Tagihan</h2>
            <div className="space-y-4 max-w-4xl">
              {data?.myPayments.map((p:any) => (
                <div key={p.id} className="bg-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-center hover:shadow-lg transition border border-white/60">
                  <div className="flex items-center gap-4">
                    <div className="bg-brand-light p-4 rounded-full text-brand-blue text-xl">
                      💰
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-800">{p.month}</p>
                      <p className="text-brand-blue font-bold text-xl">Rp {p.amount.toLocaleString()}</p>
                      {p.proofImage && <p className="text-xs text-green-600 mt-1 bg-green-50 px-2 py-1 rounded inline-block border border-green-100">✅ Bukti Terkirim</p>}
                    </div>
                  </div>
                  <div className="text-right mt-4 md:mt-0 flex flex-col items-end gap-2">
                    <Badge status={p.status} />
                    {p.status === 'MENUNGGU' && (
                      <div className="flex gap-2 mt-2">
                        <input type="text" placeholder="Link/Nama Bukti..." className="border border-gray-300 p-2 text-sm rounded-lg w-48 focus:ring-2 focus:ring-brand-blue outline-none" 
                          value={proof} onChange={e=>setProof(e.target.value)} />
                        <button onClick={()=>payBill({variables:{id:p.id, proof}})} className="bg-brand-blue text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-dark shadow-md">
                          Upload
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {data?.myPayments.length === 0 && <p className="text-white opacity-90 font-medium">Belum ada tagihan.</p>}
            </div>
          </div>
        )}

        {/* === USER: PENGADUAN === */}
        {user.role === 'user' && activeTab === 'complaint' && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">Laporan & Komplain</h2>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 max-w-3xl border border-white/60">
              <h3 className="font-bold mb-4 text-gray-700 flex items-center gap-2">📝 Buat Laporan Baru</h3>
              <div className="flex gap-3">
                <input type="text" placeholder="Ada masalah apa? (Contoh: Air mati)" className="flex-1 border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-red-400 outline-none" 
                  value={desc} onChange={e=>setDesc(e.target.value)} />
                <button onClick={() => { if(data?.myRoom) createComplaint({variables:{desc, room: data.myRoom.number}, context:{headers:{'x-user-payload':JSON.stringify(user)}}}) }} 
                  className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-600 shadow-red-200 shadow-md transition-all">
                  Lapor
                </button>
              </div>
              {!data?.myRoom && <p className="text-xs text-red-400 mt-2 italic">*Anda harus punya kamar dulu untuk melapor.</p>}
            </div>

            <div className="grid gap-4 max-w-3xl">
              {data?.myComplaints.map((c:any) => (
                <div key={c.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:bg-brand-light transition">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-bold text-gray-800">{c.description}</p>
                      <p className="text-xs text-gray-400">{c.date}</p>
                    </div>
                  </div>
                  <Badge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === ADMIN: MANAJEMEN KAMAR === */}
        {user.role === 'admin' && activeTab === 'home' && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">Manajemen Kamar</h2>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border-t-4 border-brand-blue">
              <h3 className="font-bold mb-4 text-gray-700">Tambah Kamar Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input placeholder="No. Kamar (A-01)" className="border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-blue outline-none" value={newRoom.number} onChange={e=>setNewRoom({...newRoom, number:e.target.value})} />
                <input placeholder="Harga (Rp)" type="number" className="border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-blue outline-none" value={newRoom.price} onChange={e=>setNewRoom({...newRoom, price:e.target.value})} />
                <input placeholder="Fasilitas" className="border p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-blue outline-none" value={newRoom.facilities} onChange={e=>setNewRoom({...newRoom, facilities:e.target.value})} />
                <button onClick={()=>createRoom({variables:{number:newRoom.number, price:parseInt(newRoom.price), facilities:newRoom.facilities}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} 
                  className="bg-brand-blue text-white rounded-lg font-bold hover:bg-brand-dark shadow-md">Simpan</button>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-white/50">
              <table className="w-full text-left">
                <thead className="bg-brand-light border-b border-blue-100">
                  <tr>
                    <th className="p-5 font-bold text-gray-600">No. Kamar</th>
                    <th className="p-5 font-bold text-gray-600">Penghuni</th>
                    <th className="p-5 font-bold text-gray-600">Status</th>
                    <th className="p-5 font-bold text-gray-600 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.rooms.map((r:any) => (
                    <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-5 font-bold text-gray-800">{r.number}</td>
                      <td className="p-5 text-gray-500">{r.tenantEmail || <span className="text-gray-300 italic">- Kosong -</span>}</td>
                      <td className="p-5"><Badge status={r.status} /></td>
                      <td className="p-5 flex justify-end gap-2">
                        {r.status === 'TERSEDIA' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'RENOVASI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-200">🛠 Renovasi</button>}
                        {r.status === 'RENOVASI' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'TERSEDIA'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-green-100 text-green-600 px-3 py-1.5 rounded-lg font-bold hover:bg-green-200">✅ Tersedia</button>}
                        {r.status === 'DIPESAN' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'TERISI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200">🤝 Terima</button>}
                        
                        <button 
                          onClick={() => { if(confirm('⚠️ PERINGATAN: Hapus kamar ini permanen?')) deleteRoom({variables:{id:r.id}, context:{headers:{'x-user-payload':JSON.stringify(user)}}}) }} 
                          className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100 ml-1 border border-red-100"
                        >
                          🗑 Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === ADMIN: KEUANGAN === */}
        {user.role === 'admin' && activeTab === 'admin_finance' && (
          <div>
             <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">Verifikasi Pembayaran</h2>
             <div className="grid gap-4 max-w-4xl">
               {data?.payments.map((p:any) => (
                 <div key={p.id} className="bg-white p-5 rounded-2xl shadow-md flex justify-between items-center hover:shadow-lg transition">
                   <div>
                     <p className="font-bold text-gray-800 text-lg">{p.userEmail}</p>
                     <div className="text-sm text-gray-500 mt-1">
                        Kamar <span className="font-bold text-gray-700">{p.roomNumber}</span> • {p.month}
                     </div>
                     <p className="text-brand-blue font-bold mt-1">Rp {p.amount.toLocaleString()}</p>
                     {p.proofImage ? 
                        <a href="#" className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded mt-2 inline-block hover:underline">📎 Lihat Bukti: {p.proofImage}</a> 
                        : <p className="text-xs text-red-400 mt-2">Belum upload bukti</p>}
                   </div>
                   <div className="flex flex-col items-end gap-3">
                     <Badge status={p.status} />
                     {p.status === 'MENUNGGU' && p.proofImage && (
                       <button onClick={()=>confirmPay({variables:{id:p.id}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} 
                        className="bg-green-500 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-600 shadow-green-200 shadow-md">
                        Konfirmasi Lunas
                       </button>
                     )}
                   </div>
                 </div>
               ))}
               {data?.payments.length === 0 && <p className="text-white opacity-80">Belum ada data pembayaran.</p>}
             </div>
          </div>
        )}

        {/* === ADMIN: KOMPLAIN === */}
        {user.role === 'admin' && activeTab === 'admin_complaints' && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">Daftar Komplain Masuk</h2>
            <div className="grid gap-4 max-w-4xl">
              {data?.complaints.map((c:any) => (
                <div key={c.id} className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-red-400 hover:translate-x-1 transition-transform">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-sm">{c.roomNumber}</span> 
                        {c.description}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Pelapor: {c.userEmail} • {c.date}</p>
                    </div>
                    <Badge status={c.status} />
                  </div>
                  
                  <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100">
                    {c.status === 'DITERIMA' && <button onClick={()=>updateComplaint({variables:{id:c.id, status:'DIPROSES'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-sm bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-bold hover:bg-yellow-200">🛠 Proses Perbaikan</button>}
                    {c.status === 'DIPROSES' && <button onClick={()=>updateComplaint({variables:{id:c.id, status:'SELESAI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-200">✅ Selesai</button>}
                    {c.status === 'SELESAI' && <span className="text-xs text-gray-400 font-bold bg-gray-50 px-3 py-1 rounded-full">Laporan Ditutup</span>}
                  </div>
                </div>
              ))}
               {data?.complaints.length === 0 && <p className="text-white opacity-80">Tidak ada komplain baru.</p>}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// Components
function NavBtn({label, active, onClick}: any) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 mb-1 ${active ? 'bg-blue-50 text-brand-blue font-bold shadow-sm ring-1 ring-blue-100' : 'text-gray-600 hover:bg-gray-50 hover:text-brand-blue'}`}>
      {label}
    </button>
  );
}

function Badge({status}: {status:string}) {
  const styles: any = {
    TERSEDIA: 'bg-green-100 text-green-700 border-green-200',
    DIPESAN: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    TERISI: 'bg-blue-100 text-blue-700 border-blue-200',
    RENOVASI: 'bg-red-100 text-red-700 border-red-200',
    MENUNGGU: 'bg-orange-100 text-orange-700 border-orange-200',
    LUNAS: 'bg-green-100 text-green-700 border-green-200',
    DITERIMA: 'bg-red-100 text-red-700 border-red-200',
    DIPROSES: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    SELESAI: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100 border-gray-200'}`}>{status}</span>;
}