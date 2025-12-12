console.time('Total Startup Time');
console.log(`[${new Date().toISOString()}] Starting server process...`);

require('dotenv').config();
console.log(`[${new Date().toISOString()}] Dotenv loaded`);

const app = require('./app');
console.log(`[${new Date().toISOString()}] App module loaded`);

const connectDB = require('./config/db');
console.log(`[${new Date().toISOString()}] DB config loaded`);

const PORT = process.env.PORT || 5001;

// Connect to Database
console.log(`[${new Date().toISOString()}] Initiating DB connection...`);
connectDB();

console.log(`[${new Date().toISOString()}] Calling app.listen...`);
const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server callback triggered`);
  console.log(`Server running on port ${PORT}`);
  console.timeEnd('Total Startup Time');
});
