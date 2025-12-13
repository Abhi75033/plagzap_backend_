console.time('Total Startup Time');
console.log(`[${new Date().toISOString()}] Starting server process...`);

require('dotenv').config();
console.log(`[${new Date().toISOString()}] Dotenv loaded`);

const app = require('./app');
console.log(`[${new Date().toISOString()}] App module loaded`);

const connectDB = require('./config/db');
console.log(`[${new Date().toISOString()}] DB config loaded`);

const PORT = process.env.PORT || 5001;

const http = require('http');
const { Server } = require('socket.io');

// Connect to Database
console.log(`[${new Date().toISOString()}] Initiating DB connection...`);
connectDB();

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for now, tighten for prod
    methods: ["GET", "POST"]
  }
});

// Initialize Socket Controllers
require('./controllers/socketController')(io); // Legacy team chat/video
require('./controllers/socketVideoController')(io); // New Google Meet-style video

console.log(`[${new Date().toISOString()}] Calling httpServer.listen...`);
const server = httpServer.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server callback triggered`);
  console.log(`Server running on port ${PORT}`);
  console.timeEnd('Total Startup Time');
});
