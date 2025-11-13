const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO Authentication Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.userId || decoded.id; // Support both userId and id
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);

    // Join vendor room for real-time lead notifications
    if (socket.userRole === 'vendor' || socket.userRole === 'individual') {
      const vendorRoom = `vendor_${socket.userId}`;
      socket.join(vendorRoom);
      console.log(`🏪 Vendor ${socket.userId} joined room: ${vendorRoom}`);
    }

    // Join user room
    socket.join(`user_${socket.userId}`);

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });

    // Vendor acknowledges receiving lead
    socket.on('lead_received', (data) => {
      console.log(`Vendor ${socket.userId} received lead: ${data.leadResponseId}`);
    });

    // Notify user when vendor responds
    socket.on('vendor_responded', (data) => {
      const { userId, leadId, status } = data;
      io.to(`user_${userId}`).emit('lead_update', {
        leadId,
        status,
        message: `A vendor has ${status} your lead`
      });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };

