/**
 * Manual Email Verification Script
 * Use this to manually verify a user's email in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function verifyUserEmail(email) {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.error(`❌ User not found with email: ${email}`);
            process.exit(1);
        }

        console.log(`\n📧 User found: ${user.name} (${user.email})`);
        console.log(`   Current emailVerified status: ${user.emailVerified}`);

        // Update emailVerified to true
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        await user.save();
        console.log(`\n✅ Email verified successfully!`);

        // Re-fetch to confirm
        const verifiedUser = await User.findById(user._id);
        console.log(`   Confirmed emailVerified status: ${verifiedUser.emailVerified}`);

        if (!verifiedUser.emailVerified) {
            console.error('⚠️ WARNING: Email verification did not persist!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node verifyUserEmail.js user@example.com');
    process.exit(1);
}

verifyUserEmail(email);
