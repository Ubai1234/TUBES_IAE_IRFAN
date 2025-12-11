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

let rooms = [
  { id: '101', number: 'A-101', price: 1500000, facilities: 'AC, KM Dalam', status: ROOM_STATUS.TERSEDIA },
  { id: '102', number: 'A-102', price: 850000, facilities: 'Non-AC, KM Luar', status: ROOM_STATUS.TERSEDIA },
  { id: '201', number: 'B-201', price: 2000000, facilities: 'AC, TV, Water Heater', status: ROOM_STATUS.TERISI, tenantEmail: 'user@kost.com' }
];

let complaints = []; // Menyimpan laporan kerusakan
let payments = [];   // Menyimpan riwayat tagihan & bukti bayar

// Seed Data Pembayaran Dummy
payments.push({
  id: 'pay-1',
  userEmail: 'user@kost.com',
  roomNumber: 'B-201',
  amount: 2000000,
  month: 'Desember 2025',
  status: PAYMENT_STATUS.MENUNGGU,
  proofImage: null
});

// --- SCHEMA (Type Definitions) ---
const typeDefs = `
  type Room {
    id: ID!
    number: String!
    price: Int!
    facilities: String
    status: String!
    tenantEmail: String
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
    # --- FITUR ADMIN ---
    createRoom(number: String!, price: Int!, facilities: String): Room!
    updateRoomStatus(id: ID!, status: String!): Room!
    deleteRoom(id: ID!): Boolean
    updateComplaintStatus(id: ID!, status: String!): Complaint!
    confirmPayment(id: ID!): Payment!
    kickUser(email: String!): Boolean

    # --- FITUR USER (ANAK KOST) ---
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
    
    // Complaint logic
    complaints: () => complaints,
    myComplaints: (_, { email }) => complaints.filter(c => c.userEmail === email),

    // Payment logic
    payments: () => payments,
    myPayments: (_, { email }) => payments.filter(p => p.userEmail === email),
  },
  Mutation: {
    // --- ADMIN MUTATIONS ---
    createRoom: (_, args) => {
      const newRoom = { id: uuidv4(), ...args, status: ROOM_STATUS.TERSEDIA, tenantEmail: null };
      rooms.push(newRoom);
      pubsub.publish('ROOM_UPDATED', { roomUpdated: newRoom });
      return newRoom;
    },
    updateRoomStatus: (_, { id, status }) => {
      const idx = rooms.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Room not found');
      rooms[idx].status = status;
      if (status === ROOM_STATUS.TERSEDIA) rooms[idx].tenantEmail = null; // Reset penghuni jika tersedia
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
    kickUser: (_, { email }) => {
      const idx = rooms.findIndex(r => r.tenantEmail === email);
      if (idx !== -1) {
        rooms[idx].tenantEmail = null;
        rooms[idx].status = ROOM_STATUS.TERSEDIA;
        pubsub.publish('ROOM_UPDATED', { roomUpdated: rooms[idx] });
        return true;
      }
      return false;
    },

    // --- USER MUTATIONS ---
    bookRoom: (_, { id }, context) => {
      if (!context.user) throw new Error('Unauthorized');
      const idx = rooms.findIndex(r => r.id === id);
      if (rooms[idx].status !== ROOM_STATUS.TERSEDIA) throw new Error('Room not available');
      
      rooms[idx].status = ROOM_STATUS.DIPESAN; // Menunggu konfirmasi admin sebenarnya, tapi kita anggap langsung book
      rooms[idx].tenantEmail = context.user.email;
      
      // Generate tagihan pertama otomatis
      payments.push({
        id: uuidv4(),
        userEmail: context.user.email,
        roomNumber: rooms[idx].number,
        amount: rooms[idx].price,
        month: 'Bulan Pertama',
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
      payments[idx].proofImage = proofImage; // Di real app, ini URL dari S3/Cloudinary
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

  httpServer.listen(4000, () => console.log(`🚀 GraphQL Service Ready at port 4000`));
}
startServer();