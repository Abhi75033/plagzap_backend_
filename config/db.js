const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log(`[${new Date().toISOString()}] Mongoose connecting to: ${process.env.MONGO_URI ? 'URI Provided' : 'NO URI'}`);
        console.time('Mongoose Connect');
        await mongoose.connect(process.env.MONGO_URI);
        console.timeEnd('Mongoose Connect');
        console.log(`[${new Date().toISOString()}] MongoDB Connected`);
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
