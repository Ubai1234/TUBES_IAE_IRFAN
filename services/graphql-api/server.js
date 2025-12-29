const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const http = require('http'); 
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws'); 
const { useServer } = require('graphql-ws/lib/use/ws');

const app = express();
const pubsub = new PubSub();

app.use(cors({ origin: '*', credentials: true }));

// --- DATABASE SEMENTARA (MOCK DATA) ---
const ROOM_STATUS = { TERSEDIA: 'TERSEDIA', DIPESAN: 'DIPESAN', TERISI: 'TERISI', RENOVASI: 'RENOVASI' };
const COMPLAINT_STATUS = { DITERIMA: 'DITERIMA', DIPROSES: 'DIPROSES', SELESAI: 'SELESAI' };
const PAYMENT_STATUS = { MENUNGGU: 'MENUNGGU', LUNAS: 'LUNAS' };

// [UPDATE FINAL] Data awal sudah dilengkapi dengan gambar manual
let rooms = [
  { 
    id: '101', 
    number: 'A-101', 
    price: 1500000, 
    facilities: 'AC, KM Dalam', 
    status: ROOM_STATUS.TERSEDIA,
    // Gambar Manual 1
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80' 
  },
  { 
    id: '102', 
    number: 'A-102', 
    price: 850000, 
    facilities: 'Non-AC, KM Luar', 
    status: ROOM_STATUS.TERSEDIA,
    // Gambar Manual 2 (Agar A-102 tidak kosong)
    image: 'https://images.unsplash.com/photo-1512918760532-3ed64bc8066e?auto=format&fit=crop&w=800&q=80'
  },
  { 
    id: '201', 
    number: 'B-201', 
    price: 2000000, 
    facilities: 'AC, TV, Water Heater', 
    status: ROOM_STATUS.TERISI, 
    tenantEmail: 'user@kost.com',
    // Gambar Manual 3
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
  }
];

let complaints = []; 
let payments = [];   

payments.push({
  id: 'pay-1',
  userEmail: 'user@kost.com',
  roomNumber: 'B-201',
  amount: 2000000,
  month: 'Desember 2025',
  status: PAYMENT_STATUS.MENUNGGU,
  proofImage: null
});

// --- SCHEMA ---
const typeDefs = `
  type Room {
    id: ID!
    number: String!
    price: Int!
    facilities: String
    status: String!
    tenantEmail: String
    image: String  # Field Image
  }
  type Complaint {
    id: ID!
    userEmail: String!
    roomNumber: String!
    description: String!
    status: String!
    date: String!
  }
  type Payment {
    id: ID!
    userEmail: String!
    roomNumber: String!
    amount: Int!
    month: String!
    status: String!
    proofImage: String
  }
  type Query {
    rooms: [Room!]!
    myRoom(email: String!): Room
    complaints: [Complaint!]!
    myComplaints(email: String!): [Complaint!]!
    payments: [Payment!]!
    myPayments(email: String!): [Payment!]!
  }
  type Mutation {
    # Update mutation createRoom agar menerima input image
    createRoom(number: String!, price: Int!, facilities: String, image: String): Room!
    
    updateRoomStatus(id: ID!, status: String!): Room!
    deleteRoom(id: ID!): Boolean
    updateComplaintStatus(id: ID!, status: String!): Complaint!
    confirmPayment(id: ID!): Payment!
    createBill(roomNumber: String!, month: String!, year: String!, amount: Int!): Payment!
    
    bookRoom(id: ID!): Room! 
    
    createComplaint(description: String!, roomNumber: String!): Complaint!
    uploadPaymentProof(id: ID!, proofImage: String!): Payment!
  }
  type Subscription {
    roomUpdated: Room!
  }
`;

// --- RESOLVERS ---
const resolvers = {
  Query: {
    rooms: () => rooms,
    myRoom: (_, { email }) => rooms.find(r => r.tenantEmail === email),
    complaints: () => complaints,
    myComplaints: (_, { email }) => complaints.filter(c => c.userEmail === email),
    payments: () => payments,
    myPayments: (_, { email }) => payments.filter(p => p.userEmail === email),
  },
  Mutation: {
    createRoom: (_, args) => {
      // Logika otomatis gambar default untuk kamar BARU
      const defaultImage = 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80';
      
      const newRoom = { 
        id: uuidv4(), 
        ...args, 
        status: ROOM_STATUS.TERSEDIA, 
        tenantEmail: null,
        image: args.image || defaultImage // Pakai inputan user atau default
      };
      rooms.push(newRoom);
      pubsub.publish('ROOM_UPDATED', { roomUpdated: newRoom });
      return newRoom;
    },
    updateRoomStatus: (_, { id, status }) => {
      const idx = rooms.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Room not found');
      rooms[idx].status = status;
      if (status === ROOM_STATUS.TERSEDIA) rooms[idx].tenantEmail = null; 
      pubsub.publish('ROOM_UPDATED', { roomUpdated: rooms[idx] });
      return rooms[idx];
    },
    deleteRoom: (_, { id }) => {
      const idx = rooms.findIndex(r => r.id === id);
      if (idx === -1) return false;
      rooms.splice(idx, 1);
      return true;
    },
    updateComplaintStatus: (_, { id, status }) => {
      const idx = complaints.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Complaint not found');
      complaints[idx].status = status;
      return complaints[idx];
    },
    confirmPayment: (_, { id }) => {
      const idx = payments.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Payment not found');
      payments[idx].status = PAYMENT_STATUS.LUNAS;
      return payments[idx];
    },
    createBill: (_, { roomNumber, month, year, amount }, context) => {
      const room = rooms.find(r => r.number === roomNumber);
      if (!room) throw new Error('Kamar tidak ditemukan');
      if (!room.tenantEmail) throw new Error('Kamar ini kosong');

      const fullMonth = `${month} ${year}`; 
      const newPayment = {
        id: uuidv4(),
        userEmail: room.tenantEmail,
        roomNumber: roomNumber,
        amount: amount,
        month: fullMonth,
        status: PAYMENT_STATUS.MENUNGGU,
        proofImage: null
      };
      payments.push(newPayment);
      return newPayment;
    },

    bookRoom: (_, { id }, context) => {
      if (!context.user) throw new Error('Unauthorized');
      const idx = rooms.findIndex(r => r.id === id);
      if (rooms[idx].status !== ROOM_STATUS.TERSEDIA) throw new Error('Room not available');
      
      // --- LOG TRACING ---
      const traceId = context.req.headers['x-request-id'] || 'no-trace-id';
      console.log(`[GraphQL] 📝 Memproses Booking Kamar ${rooms[idx].number}`);
      console.log(`[GraphQL] 🔗 Terhubung dengan TraceID: ${traceId}`);
      // --------------------

      rooms[idx].status = ROOM_STATUS.DIPESAN; 
      rooms[idx].tenantEmail = context.user.email;
      
      payments.push({
        id: uuidv4(),
        userEmail: context.user.email,
        roomNumber: rooms[idx].number,
        amount: rooms[idx].price,
        month: 'Deposit Awal (Bulan 1)',
        status: PAYMENT_STATUS.MENUNGGU,
        proofImage: null
      });

      pubsub.publish('ROOM_UPDATED', { roomUpdated: rooms[idx] });
      return rooms[idx];
    },

    createComplaint: (_, { description, roomNumber }, context) => {
      if (!context.user) throw new Error('Unauthorized');
      const newComplaint = {
        id: uuidv4(),
        userEmail: context.user.email,
        roomNumber,
        description,
        status: COMPLAINT_STATUS.DITERIMA,
        date: new Date().toISOString().split('T')[0]
      };
      complaints.push(newComplaint);
      return newComplaint;
    },
    uploadPaymentProof: (_, { id, proofImage }) => {
      const idx = payments.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Payment not found');
      payments[idx].proofImage = proofImage; 
      return payments[idx];
    }
  },
  Subscription: {
    roomUpdated: { subscribe: () => pubsub.asyncIterator(['ROOM_UPDATED']) },
  },
};

// --- SERVER SETUP ---
const schema = makeExecutableSchema({ typeDefs, resolvers });
async function startServer() {
  const httpServer = http.createServer(app);
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const serverCleanup = useServer({ schema, context: (ctx) => ({ pubsub }) }, wsServer);

  const server = new ApolloServer({
    schema,
    context: ({ req }) => {
      const userPayload = req.headers['x-user-payload'];
      let user = null;
      if (userPayload) {
        try { user = JSON.parse(userPayload); } catch (e) {}
      }
      return { req, pubsub, user };
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      { async serverWillStart() { return { async drainServer() { await serverCleanup.dispose(); } }; } },
    ],
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => console.log(`🚀 GraphQL Service Ready at port ${PORT}`));
}
startServer();