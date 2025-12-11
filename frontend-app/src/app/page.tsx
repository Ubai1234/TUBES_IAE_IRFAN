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
  const [activeTab, setActiveTab] = useState('home'); 
  const [desc, setDesc] = useState('');
  const [proof, setProof] = useState('');
  const [newRoom, setNewRoom] = useState({ number: '', price: '', facilities: '' });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) {
      router.push('/login'); // Redirect ke login jika belum ada user
    } else {
      setUser(JSON.parse(u));
    }
  }, [router]);

  const { data, refetch } = useQuery(GET_DATA, { 
    variables: { email: user?.email || '' },
    pollInterval: 2000,
    skip: !user 
  });

  // Mutations
  const [bookRoom] = useMutation(BOOK_ROOM, { onCompleted: () => { alert('Berhasil Booking!'); refetch(); } });
  const [createComplaint] = useMutation(CREATE_COMPLAINT, { onCompleted: () => { alert('Laporan Terkirim'); setDesc(''); refetch(); } });
  const [payBill] = useMutation(PAY_BILL, { onCompleted: () => { alert('Bukti Terupload'); setProof(''); refetch(); } });
  const [createRoom] = useMutation(CREATE_ROOM, { onCompleted: () => { alert('Kamar Dibuat'); setNewRoom({number:'', price:'', facilities:''}); refetch(); } });
  const [updateRoom] = useMutation(UPDATE_ROOM, { onCompleted: () => refetch() });
  const [confirmPay] = useMutation(ADMIN_CONFIRM_PAY, { onCompleted: () => refetch() });
  const [updateComplaint] = useMutation(ADMIN_UPDATE_COMPLAINT, { onCompleted: () => refetch() });

  if (!user) return <div className="p-10 flex justify-center text-lg">Memuat Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-white shadow-lg h-screen sticky top-0 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-700">Kost Apps</h1>
          <p className="text-sm text-gray-500 mt-1">Halo, {user.name}</p>
          <span className="text-xs font-bold uppercase bg-gray-200 px-2 py-1 rounded mt-2 inline-block">{user.role}</span>
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
              <NavBtn label="🛠️ Komplain" active={activeTab==='admin_complaints'} onClick={()=>setActiveTab('admin_complaints')} />
            </>
          )}
        </nav>
        <div className="p-4 border-t">
          <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="w-full bg-red-100 text-red-600 py-2 rounded font-bold hover:bg-red-200">Logout</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Konten User: Cari Kamar */}
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

        {/* Konten User: Kamar Saya */}
        {user.role === 'user' && activeTab === 'myroom' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Kamar Saya</h2>
            {data?.myRoom ? (
              <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
                <h3 className="text-xl font-bold">Kamar {data.myRoom.number}</h3>
                <p>Harga: Rp {data.myRoom.price.toLocaleString()}</p>
                <p>Fasilitas: {data.myRoom.facilities}</p>
              </div>
            ) : <p>Belum ada kamar.</p>}
          </div>
        )}

        {/* Konten User: Tagihan */}
        {user.role === 'user' && activeTab === 'billing' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Tagihan</h2>
            {data?.myPayments.map((p:any) => (
              <div key={p.id} className="bg-white p-4 mb-2 rounded shadow flex justify-between">
                <div>
                  <p className="font-bold">{p.month}</p>
                  <p>Rp {p.amount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <Badge status={p.status} />
                  {p.status === 'MENUNGGU' && (
                    <div className="mt-2 flex gap-2">
                      <input placeholder="Nama Bukti" className="border p-1 text-sm rounded w-24" value={proof} onChange={e=>setProof(e.target.value)} />
                      <button onClick={()=>payBill({variables:{id:p.id, proof}})} className="bg-green-600 text-white px-2 py-1 text-sm rounded">Upload</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Konten User: Pengaduan */}
        {user.role === 'user' && activeTab === 'complaint' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Pengaduan</h2>
            <div className="flex gap-2 mb-4">
              <input placeholder="Keluhan..." className="border p-2 rounded w-full" value={desc} onChange={e=>setDesc(e.target.value)} />
              <button onClick={()=>{if(data?.myRoom) createComplaint({variables:{desc, room:data.myRoom.number}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})}} className="bg-red-600 text-white px-4 rounded">Lapor</button>
            </div>
            {data?.myComplaints.map((c:any) => (
              <div key={c.id} className="bg-white p-3 mb-2 rounded border flex justify-between">
                <p>{c.description}</p>
                <Badge status={c.status} />
              </div>
            ))}
          </div>
        )}

        {/* Konten Admin: Manajemen Kamar */}
        {user.role === 'admin' && activeTab === 'home' && (
           <div>
             <h2 className="text-2xl font-bold mb-6">Manajemen Kamar</h2>
             <div className="bg-white p-4 mb-4 rounded shadow grid grid-cols-4 gap-2">
               <input placeholder="No. Kamar" className="border p-2 rounded" value={newRoom.number} onChange={e=>setNewRoom({...newRoom, number:e.target.value})} />
               <input placeholder="Harga" type="number" className="border p-2 rounded" value={newRoom.price} onChange={e=>setNewRoom({...newRoom, price:e.target.value})} />
               <input placeholder="Fasilitas" className="border p-2 rounded" value={newRoom.facilities} onChange={e=>setNewRoom({...newRoom, facilities:e.target.value})} />
               <button onClick={()=>createRoom({variables:{number:newRoom.number, price:parseInt(newRoom.price), facilities:newRoom.facilities}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="bg-purple-600 text-white rounded font-bold">Tambah</button>
             </div>
             {data?.rooms.map((r:any) => (
               <div key={r.id} className="bg-white p-3 mb-2 rounded border flex justify-between items-center">
                 <span className="font-bold">{r.number}</span>
                 <span className="text-gray-500">{r.tenantEmail || 'Kosong'}</span>
                 <Badge status={r.status} />
                 {r.status === 'DIPESAN' && <button onClick={()=>updateRoom({variables:{id:r.id, status:'TERISI'}, context:{headers:{'x-user-payload':JSON.stringify(user)}}})} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Terima</button>}
               </div>
             ))}
           </div>
        )}
      </main>
    </div>
  );
}

function NavBtn({label, active, onClick}: any) {
  return <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded ${active ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>{label}</button>;
}
function Badge({status}: {status:string}) {
  return <span className="px-2 py-1 bg-gray-200 text-xs rounded font-bold">{status}</span>;
}