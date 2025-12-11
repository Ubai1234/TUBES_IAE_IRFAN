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

// Izinkan akses dari mana saja (Frontend & Gateway)
app.use(cors({ origin: '*', credentials: true }));

// --- DATA DUMMY (KAMAR) ---
const ROOM_STATUS = {
  TERSEDIA: 'TERSEDIA',
  DIPESAN: 'DIPESAN', // Status setelah anak kost klik sewa
  TERISI: 'TERISI',
};

let rooms = [
  { id: '101', number: 'A-01 (Lantai 1)', price: 1500000, facilities: 'AC, KM Dalam', status: ROOM_STATUS.TERSEDIA },
  { id: '102', number: 'A-02 (Lantai 1)', price: 850000, facilities: 'Non-AC, KM Luar', status: ROOM_STATUS.TERSEDIA },
  { id: '201', number: 'B-01 (Lantai 2)', price: 2000000, facilities: 'AC, TV, Water Heater', status: ROOM_STATUS.TERSEDIA },
  { id: '202', number: 'B-02 (Lantai 2)', price: 850000, facilities: 'Non-AC', status: ROOM_STATUS.TERISI },
];

// --- SCHEMA ---
const typeDefs = `
  type Room {
    id: ID!
    number: String!
    price: Int!
    facilities: String
    status: String!
  }

  type Query {
    rooms: [Room!]!
  }

  type Mutation {
    # Fitur Utama Anak Kost
    bookRoom(id: ID!): Room!
    
    # Fitur Admin (Pelengkap)
    createRoom(number: String!, price: Int!, facilities: String): Room!
    deleteRoom(id: ID!): Boolean
  }

  type Subscription {
    roomUpdated: Room!
  }
`;

// --- RESOLVERS ---
const resolvers = {
  Query: {
    rooms: () => rooms,
  },
  Mutation: {
    // LOGIKA BOOKING (PENTING)
    bookRoom: (_, { id }, context) => {
      // 1. Cari kamar
      const index = rooms.findIndex(r => r.id === id);
      if (index === -1) throw new Error('Kamar tidak ditemukan');
      
      const currentRoom = rooms[index];

      // 2. Validasi Status
      if (currentRoom.status !== ROOM_STATUS.TERSEDIA) {
        throw new Error('Gagal: Kamar ini sudah tidak tersedia!');
      }

      // 3. Ubah Status
      const updatedRoom = { ...currentRoom, status: ROOM_STATUS.DIPESAN };
      rooms[index] = updatedRoom;

      // 4. Kirim Update Realtime
      pubsub.publish('ROOM_UPDATED', { roomUpdated: updatedRoom });
      
      return updatedRoom;
    },

    // Logika Tambah Kamar (Admin)
    createRoom: (_, args) => {
      const newRoom = { id: uuidv4(), ...args, status: ROOM_STATUS.TERSEDIA };
      rooms.push(newRoom);
      pubsub.publish('ROOM_UPDATED', { roomUpdated: newRoom });
      return newRoom;
    },
    
    deleteRoom: (_, { id }) => {
      const idx = rooms.findIndex(r => r.id === id);
      if (idx === -1) return false;
      rooms.splice(idx, 1);
      return true;
    }
  },
  Subscription: {
    roomUpdated: { subscribe: () => pubsub.asyncIterator(['ROOM_UPDATED']) },
  },
};

// --- SERVER STARTUP ---
const schema = makeExecutableSchema({ typeDefs, resolvers });
async function startServer() {
  const httpServer = http.createServer(app);
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const serverCleanup = useServer({ schema, context: (ctx) => ({ pubsub }) }, wsServer);

  const server = new ApolloServer({
    schema,
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