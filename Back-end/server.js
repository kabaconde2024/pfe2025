const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

// Import des routes
const utilisateurRoutes = require('./routes/utilisateurRoutes');
const profilRoutes = require('./routes/profilRoutes');
const menuRoutes = require('./routes/menuRoutes');
const contratRoutes = require('./routes/contratRoutes');
const entrepriseRoutes = require('./routes/entrepriseRoutes');
const userProfileRoutes = require('./routes/userProfileRoutes');
const candidatureRoutes = require('./routes/candidatures');
const articlesRouter = require('./routes/ArticleRoutes');
const avenantRoutes = require('./routes/avenantRoutes');
const pointageRoutes = require('./routes/pointageRoutes');
const entretienRoutes = require('./routes/entretienRoute');
const fichesDePaieRoutes = require('./routes/fichesDePaieRoutes');
const annoncesRoutes = require('./routes/annonces');
const emailRoutes = require('./routes/email');
const profilCvRoutes = require('./routes/ProfilCvRoutes');
const notificationRoutes = require('./routes/notifications');
const missionRoutes = require('./routes/missionRoutes');
const FormationRoute = require('./routes/FormationRoute');
const offreRoutes = require('./routes/offreRoutes');

const app = express();

// Configuration MongoDB Atlas
const DB_URI = process.env.MONGO_URI || 'mongodb+srv://kabaconde:g63yQnrdf2dP0MLU@cluster0.rpsw8o8.mongodb.net/kankadi-internationale?retryWrites=true&w=majority';

// Connexion optimisée à MongoDB Atlas
mongoose.connect(DB_URI)
  .then(() => console.log('✅ Connecté à MongoDB Atlas avec succès'))
  .catch(err => {
    console.error('❌ Échec de connexion à MongoDB:', err.message);
    process.exit(1);
  });

// Middlewares de sécurité
app.use(helmet());
app.use(compression());
app.disable('x-powered-by');

// Configuration CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_PROD_URL, 'https://*.render.com'] 
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middlewares pour le traitement des requêtes
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Configuration de session
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback_secret_123!',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: DB_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60 // 14 jours
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 3, // 3 heures
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true
  }
}));

// Routes statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/contrats', express.static(path.join(__dirname, 'public/contrats')));

// Routes API
app.use('/api/notifications', notificationRoutes);
app.use('/api/profils', profilRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/contrats', contratRoutes);
app.use('/api/entreprises', entrepriseRoutes);
app.use('/api/offres', offreRoutes);
app.use('/api/profil_user', userProfileRoutes);
app.use('/api/candidatures', candidatureRoutes);
app.use('/api/pointage', pointageRoutes);
app.use('/api/entretiens', entretienRoutes);
app.use('/api/fiches-de-paie', fichesDePaieRoutes);
app.use('/api/annonces', annoncesRoutes);
app.use('/api/profilcv', profilCvRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/formation', FormationRoute);
app.use('/api', utilisateurRoutes);
app.use('/api', articlesRouter);
app.use('/api', avenantRoutes);
app.use('/api', emailRoutes);

// Route de base
app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API Kankadi Internationale');
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error: ${err.stack}`);
  res.status(err.status || 500).json({
    success: false,
    message: 'Erreur serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL MongoDB: ${DB_URI.split('@')[1]?.split('/')[0] || DB_URI}`);
});