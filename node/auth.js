const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
require('dotenv').config();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:4000/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
  console.log({refreshToken})
  const token = jwt.sign({ id: profile.id, displayName: profile.displayName, email: profile.emails[0].value,accessToken,refreshToken}, process.env.JWT_SECRET);
  return done(null, { profile, token ,accessToken,refreshToken});
}));

passport.serializeUser((user, done) => {
  done(null, user); // Sérialiser l'objet utilisateur complet
});

passport.deserializeUser((user, done) => {
  done(null, user); // Désérialiser l'objet utilisateur complet
});
