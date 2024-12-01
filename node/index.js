const express = require('express');
const passport = require('passport');
const session = require('express-session');
const jwt=require("jsonwebtoken")
const {google}=require('googleapis')
const youtube=google.youtube('v3')
const auth='AIzaSyBj6RLbVm_4-WYCGqe6CFQrR5ZVuUThmh4'
require('dotenv').config();
require('./auth');
const app = express();
const port = 4000;
const bodyParser = require('body-parser');
const nodeMailer = require('nodemailer');
const cors = require('cors');
app.use(cors());
app.use(session({
  secret: 'f5121dd43c17bb2b8b5c0814b9d5f57cff337c7903d90d06d856c7615b89da4b',
  resave: false,
  saveUninitialized: false
}));
console.log(process.env.JWT_SECRET)
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google', (req, res, next) => {
  // Passez le paramètre `redirect` à l'authentification Google
  const redirectPath = req.query.redirect ; // Valeur par défaut si non spécifié
  console.log({redirectPath})
  passport.authenticate('google', {
    scope: [
      'profile', 
      'email', 
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar'
    ],
    state: redirectPath // Utilisez `state` pour transférer `redirect`
  })(req, res, next);
});

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  
  const redirectPath=req.query.state
  res.redirect(`http://localhost:3000/${redirectPath}?token=${req.user.token}&accessToken=${req.user.accessToken}&refreshToken=${req.user.refreshToken}`);
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});


app.use(bodyParser.json());
// Define a route
app.get('/user', (req, res) => {
  const token = req.header('Authorization');
  console.log(token)
  if (!token) {
    return res.status(401).send('Unauthorized');
  }
    try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.send(decoded);   
  } catch(error)
  {
    console.log(error)
    res.send("Unauthorized")
  }
});
const base64 = require('base-64');

app.post('/send_mail', async (req, res) => {
  try {
    // Configure OAuth2 avec l'access token reçu
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:4000/auth/google/callback'
    );
    oAuth2Client.setCredentials({
      access_token: req.body.accessToken, // Access token fourni dans la requête
    });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    console.log('gmail')
    // Créer l'email avec les informations du corps de la requête
    const email = [
      `From: "${req.body.name}" <${req.body.sEmail}>`,
      `To: ${req.body.rEmail}`,
      `Subject: ${req.body.sujet}`,
      '',
      req.body.message
    ].join('\n');

    // Encoder l'email en base64 URL-safe
    const encodedMessage = base64.encode(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    console.log('encoded')
    // Envoyer l'email
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
     
    console.log('Email envoyé :', response.data);
    res.status(200).send('Un e-mail a été envoyé avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email :', error);
    res.status(500).send("Erreur lors de l'envoi de l'email.");
  }
});

app.post('/createPlaylist', async (req, res) => {
  let { accessToken, title, description } = req.body;
  title="gemini",description="k"
  try {
    const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        snippet: {
          title: title,
          description: description,
        }
      })
    });

    const data = await response.json();
    console.log("create")
    res.json({data})
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).send('Error creating playlist');
  }
});
app.post('/searchVideos',async(req,res)=>{
  const {query}=req.body
  const response = await youtube.search.list({
    auth,
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: 5,
  });
  let videos= response.data.items.map(item => ({
    title: item.snippet.title,
    videoId: item.id.videoId,
    description: item.snippet.description,
  }));
  console.log(videos)
  res.status(200).json({response:videos})
})
app.post('/addVideos', async (req, res) => {
  const { accessToken, playlistId, videos } = req.body;
  console.log({videos})
  try {
    const results = [];
    /*for (const video of videos) {
      console.log(video.videoId)
      const response = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: video.videoId 
            }
          }
        })
      });

      const data = await response.json();
      results.push(data);
    }*/
    console.log(results)
    res.send(results);
  } catch (error) {
    console.error('Error adding videos to playlist:', error);
    res.status(500).send('Error adding videos to playlist');
  }
});
app.post('/addEvent',async(req,res)=>{
  const {accessToken,events}=req.body
  for(let ev of events)
  {
    let event = {
      summary: ev.summary,
      start: ev.start,
      end: ev.end
    };
  
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  
    if (response.ok) {
      const data = await response.json();
      console.log('Event created: %s', data.htmlLink);
    } else {
      console.error('Error creating event:', await response.text());
    }
  }
  
})
// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
