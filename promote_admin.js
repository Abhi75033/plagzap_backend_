require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const promoteUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'name email role');

        if (users.length === 0) {
            console.log('No users found.');
        } else if (users.length === 1) {
            const user = users[0];
            user.role = 'admin';
            await user.save();
            console.log(`Promoted single user ${user.email} to ADMIN.`);
        } else {
            console.log('Multiple users found:');
            users.forEach((u, i) => console.log(`${i + 1}. ${u.email} (${u.role})`));
            console.log('\nPlease update the script with the specific email to promote.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

promoteUser();
