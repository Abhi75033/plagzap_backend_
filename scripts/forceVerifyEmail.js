/**
 * Direct Database Update - Set emailVerified to true for specific user
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function forceVerifyEmail(userEmail) {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Direct update using updateOne
        const result = await mongoose.connection.db.collection('users').updateOne(
            { email: userEmail.toLowerCase() },
            {
                $set: {
                    emailVerified: true,
                    emailVerificationToken: null,
                    emailVerificationExpires: null
                }
            }
        );

        console.log(`\n📊 Update result:`, result);

        if (result.matchedCount === 0) {
            console.error(`❌ No user found with email: ${userEmail}`);
        } else if (result.modifiedCount === 0) {
            console.log(`⚠️ User found but no changes made (maybe already verified?)`);
        } else {
            console.log(`✅ Successfully verified email for: ${userEmail}`);
        }

        // Verify the update
        const user = await mongoose.connection.db.collection('users').findOne(
            { email: userEmail.toLowerCase() }
        );

        console.log(`\n✅ Confirmed user data:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   emailVerified: ${user.emailVerified}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

// Get email from command line
const email = process.argv[2] || 'abhishekyadav1112.21@gmail.com';
forceVerifyEmail(email);
