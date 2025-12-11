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

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3002', 
    'http://api-gateway:3000', 
    'http://frontend-app:3002',
    'https://studio.apollographql.com' 
  ],
  credentials: true
}));

// --- DATA DUMMY KAMAR KOST ---
const ROOM_STATUS = {
  TERSEDIA: 'TERSEDIA',
  DIPESAN: 'DIPESAN', // Status setelah dibooking user
  TERISI: 'TERISI',   // Status setelah pembayaran dikonfirmasi admin (simulasi)
};

// Data awal (Seed Data)
let rooms = [
  { 
    id: '101', 
    number: 'A-101', 
    price: 1500000, 
    facilities: 'AC, WiFi, KM Dalam', 
    status: ROOM_STATUS.TERSEDIA, 
    owner: 'admin@example.com' 
  },
  { 
    id: '102', 
    number: 'B-202', 
    price: 850000, 
    facilities: 'Non-AC, WiFi, KM Luar', 
    status: ROOM_STATUS.TERISI, 
    owner: 'admin@example.com' 
  }
];

// --- TYPE DEFINITIONS (SCHEMA) ---
const typeDefs = `
  enum RoomStatus {
    TERSEDIA
    DIPESAN
    TERISI
  }

  type Room {
    id: ID!
    number: String!
    price: Int!
    facilities: String
    status: RoomStatus!
    owner: String
  }

  type Query {
    # Semua orang bisa melihat daftar kamar
    rooms: [Room!]!
    # Detail satu kamar
    room(id: ID!): Room
  }

  type Mutation {
    # --- FITUR KHUSUS ADMIN ---
    createRoom(number: String!, price: Int!, facilities: String): Room!
    updateRoomStatus(id: ID!, status: RoomStatus!): Room!
    deleteRoom(id: ID!): Boolean!
    
    # --- FITUR KHUSUS ANAK KOST ---
    bookRoom(id: ID!): Room! 
  }

  type Subscription {
    roomUpdated: Room!
    roomDeleted: ID!
  }
`;

// --- RESOLVERS ---
const resolvers = {
  Query: {
    rooms: () => rooms,
    task: (_, { id }) => rooms.find(r => r.id === id), // Alias untuk kompatibilitas jika ada query lama
    room: (_, { id }) => rooms.find(r => r.id === id),
  },
  Mutation: {
    // 1. Tambah Kamar (Hanya Admin)
    createRoom: (_, { number, price, facilities }, context) => {
      // Cek apakah user login DAN role-nya admin
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Akses Ditolak: Hanya Admin yang bisa menambah kamar.');
      }

      const newRoom = {
        id: uuidv4(),
        number,
        price,
        facilities: facilities || '',
        status: ROOM_STATUS.TERSEDIA,
        owner: context.user.email,
      };
      
      rooms.push(newRoom);
      pubsub.publish('ROOM_UPDATED', { roomUpdated: newRoom });
      return newRoom;
    },
    
    // 2. Booking Kamar (Khusus Anak Kost)
    bookRoom: (_, { id }, context) => {
      if (!context.user) {
        throw new Error('Silakan login terlebih dahulu untuk memesan kamar.');
      }

      const roomIndex = rooms.findIndex(r => r.id === id);
      if (roomIndex === -1) throw new Error('Kamar tidak ditemukan.');
      
      const currentRoom = rooms[roomIndex];
      
      // Validasi: Hanya kamar 'TERSEDIA' yang bisa dibooking
      if (currentRoom.status !== ROOM_STATUS.TERSEDIA) {
        throw new Error('Maaf, kamar ini sudah tidak tersedia.');
      }

      // Ubah status jadi DIPESAN
      const updatedRoom = { ...currentRoom, status: ROOM_STATUS.DIPESAN };
      rooms[roomIndex] = updatedRoom;

      // Notifikasi real-time ke semua client
      pubsub.publish('ROOM_UPDATED', { roomUpdated: updatedRoom });
      return updatedRoom;
    },

    // 3. Update Status Manual (Hanya Admin)
    updateRoomStatus: (_, { id, status }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Akses Ditolak: Hanya Admin yang bisa mengubah status.');
      }

      const roomIndex = rooms.findIndex(r => r.id === id);
      if (roomIndex === -1) throw new Error('Kamar tidak ditemukan.');
      
      rooms[roomIndex].status = status;
      const updatedRoom = rooms[roomIndex];
      
      pubsub.publish('ROOM_UPDATED', { roomUpdated: updatedRoom });
      return updatedRoom;
    },
    
    // 4. Hapus Kamar (Hanya Admin)
    deleteRoom: (_, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('Akses Ditolak: Hanya Admin yang bisa menghapus kamar.');
      }

      const roomIndex = rooms.findIndex(r => r.id === id);
      if (roomIndex === -1) return false;
      
      rooms.splice(roomIndex, 1);
      pubsub.publish('ROOM_DELETED', { roomDeleted: id });
      return true;
    },
  },
  Subscription: {
    roomUpdated: { subscribe: () => pubsub.asyncIterator(['ROOM_UPDATED']) },
    roomDeleted: { subscribe: () => pubsub.asyncIterator(['ROOM_DELETED']) },
  },
};

// --- SERVER SETUP (Tidak Berubah) ---
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ 
    schema,
    context: (ctx) => {
      return { pubsub };
    },
  }, wsServer);

  const server = new ApolloServer({
    schema,
    context: ({ req }) => {
      // Ambil payload user yang dikirim dari API Gateway
      const userPayload = req.headers['x-user-payload'];
      let user = null;
      if (userPayload) {
        try {
          user = JSON.parse(userPayload);
        } catch (e) {
          console.error('Error parsing x-user-payload header:', e);
        }
      }
      return { req, pubsub, user };
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL Room Service running on port ${PORT}`);
    console.log(`🛰  GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🌊 Subscriptions ready at ws://localhost:${PORT}${server.graphqlPath}`);
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'graphql-api (Room Service)',
    timestamp: new Date().toISOString(),
    data: {
      totalRooms: rooms.length,
    }
  });
});

startServer().catch(error => {
  console.error('Failed to start GraphQL server:', error);
  process.exit(1);
});