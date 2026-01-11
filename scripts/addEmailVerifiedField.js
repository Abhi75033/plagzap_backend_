/**
 * Migration Script: Add emailVerified field to all existing users
 * Run this once to update all users who don't have the emailVerified field
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function addEmailVerifiedField() {
    try {
        // Connect using MONGO_URI (your app uses this, not MONGODB_URI)
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all users where emailVerified doesn't exist or is undefined
        const usersToUpdate = await User.find({
            $or: [
                { emailVerified: { $exists: false } },
                { emailVerified: undefined }
            ]
        });

        console.log(`\n📊 Found ${usersToUpdate.length} users without emailVerified field`);

        if (usersToUpdate.length === 0) {
            console.log('✅ All users already have emailVerified field');
            process.exit(0);
        }

        // Update all users to have emailVerified: false
        const result = await User.updateMany(
            {
                $or: [
                    { emailVerified: { $exists: false } },
                    { emailVerified: undefined }
                ]
            },
            {
                $set: { emailVerified: false }
            }
        );

        console.log(`\n✅ Updated ${result.modifiedCount} users`);
        console.log('   Set emailVerified: false for all users without this field');

        // Verify the update
        const stillMissing = await User.countDocuments({
            $or: [
                { emailVerified: { $exists: false } },
                { emailVerified: undefined }
            ]
        });

        if (stillMissing > 0) {
            console.error(`⚠️ WARNING: ${stillMissing} users still missing emailVerified field`);
        } else {
            console.log('✅ All users now have emailVerified field');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        process.exit(0);
    }
}

addEmailVerifiedField();
