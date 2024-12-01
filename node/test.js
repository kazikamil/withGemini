require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');

const app = express();
const PORT = 4000;

// Configurez OAuth2
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:4000/auth/google/callback' // URL de redirection
);

// Route pour générer et rediriger vers l'URL d'autorisation
app.get('/auth/google', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // Obligatoire pour obtenir un refresh token
    scope: ['https://www.googleapis.com/auth/gmail.send'], // Permissions requises
  });
  res.redirect(authUrl);
});

// Route de callback pour gérer la réponse de Google
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;

  try {
    // Échangez le code d'autorisation contre des tokens
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    console.log('Access Token:', tokens.access_token);
    console.log('Refresh Token:', tokens.refresh_token);

    res.send('Authentification réussie ! Vous pouvez maintenant envoyer des e-mails.');
  } catch (error) {
    console.error('Erreur lors de l\'échange du code pour les tokens :', error);
    res.status(500).send('Erreur lors de l\'authentification.');
  }
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
  console.log(`Accédez à http://localhost:${PORT}/auth/google pour démarrer l'authentification.`);
});
