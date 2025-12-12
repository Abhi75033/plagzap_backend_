const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Configure Google OAuth
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL || 'https://plagzap-backend-2.onrender.com'}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const userProfile = {
                    id: profile.id,
                    displayName: profile.displayName,
                    email: profile.emails[0].value,
                    picture: profile.photos[0]?.value || null,
                };
                return done(null, userProfile);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

module.exports = passport;
