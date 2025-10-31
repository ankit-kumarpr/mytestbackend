require("dotenv").config();

const http = require("http");
const app = require("./app");
const { initSocket } = require("./socket");

const port = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
app.set('io', io);

server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 Socket.IO initialized for real-time notifications`);
});
