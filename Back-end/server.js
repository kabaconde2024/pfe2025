const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

// Import des routes avec gestion d'erreur
const loadRoute = (routePath) => {
  try {
    return require(routePath);
  } catch (err) {
    console.error(`⚠️ Route non chargée: ${routePath}`);
    const router = express.Router();
    router.all('*', (req, res) => res.status(501).json({ 
      success: false,
      message: 'Endpoint non implémenté'
    }));
    return router;
  }
};

const routes = {
  utilisateur: loadRoute('./routes/utilisateurRoutes'),
  profil: loadRoute('./routes/profilRoutes'),
  menu: loadRoute('./routes/menuRoutes'),
  contrat: loadRoute('./routes/contratRoutes'),
  entreprise: loadRoute('./routes/entrepriseRoutes'),
  userProfile: loadRoute('./routes/userProfileRoutes'),
  candidature: loadRoute('./routes/candidatures'),
  article: loadRoute('./routes/ArticleRoutes'),
  avenant: loadRoute('./routes/avenantRoutes'),
  pointage: loadRoute('./routes/pointageRoutes'),
  entretien: loadRoute('./routes/entretienRoute'),
  fichePaie: loadRoute('./routes/fichesDePaieRoutes'),
  annonce: loadRoute('./routes/annonces'),
  email: loadRoute('./routes/email'),
  profilCv: loadRoute('./routes/profilcvRoutes'),
  notification: loadRoute('./routes/notifications'),
  mission: loadRoute('./routes/missionRoutes'),
  formation: loadRoute('./routes/FormationRoute'),
  offre: loadRoute('./routes/offreRoutes')
};

const app = express();

// Configuration MongoDB Atlas
const DB_URI = process.env.MONGO_URI || 'mongodb+srv://kabaconde:g63yQnrdf2dP0MLU@cluster0.rpsw8o8.mongodb.net/kankadi-internationale?retryWrites=true&w=majority';

// Connexion optimisée avec gestion des erreurs et reconnexion
mongoose.connection.on('connected', () => console.log('✅ Connecté à MongoDB Atlas'));
mongoose.connection.on('error', err => console.error('❌ Erreur MongoDB:', err));
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Déconnecté de MongoDB. Tentative de reconnexion...');
  setTimeout(() => connectDB(), 5000);
});

async function connectDB() {
  try {
    await mongoose.connect(DB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      retryWrites: true,
      retryReads: true
    });
  } catch (err) {
    console.error('❌ Échec de connexion MongoDB:', err.message);
    process.exit(1);
  }
}
connectDB();

// Middleware de logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Limiteur de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limite de requêtes
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Middlewares de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.render.com"],
      connectSrc: ["'self'", "https://*.render.com"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression({
  level: 6,
  threshold: 0,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.disable('x-powered-by');

// Configuration CORS pour production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://pfe2025.onrender.com',
        process.env.FRONTEND_PROD_URL,
        'https://*.render.com'
      ].filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie', 'x-ratelimit-limit', 'x-ratelimit-remaining']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middlewares pour le traitement des requêtes
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Configuration de session sécurisée
app.use(session({
  name: 'kankadi.sid',
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: DB_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60,
    autoRemove: 'interval',
    autoRemoveInterval: 60,
    crypto: {
      secret: process.env.SESSION_CRYPTO_SECRET || require('crypto').randomBytes(32).toString('hex')
    }
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 3,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined
  }
}));

// Routes statiques avec cache
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
};

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));
app.use('/contrats', express.static(path.join(__dirname, 'public/contrats'), staticOptions));

// Chargement dynamique des routes
Object.entries(routes).forEach(([name, router]) => {
  const routePath = `/api/${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
  app.use(routePath, router);
  console.log(`Route configurée: ${routePath}`);
});

// Health check
app.get('/health', (req, res) => {
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    status: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
    dbState: mongoose.STATES[mongoose.connection.readyState],
    timestamp: new Date().toISOString()
  });
});

// Route de base
app.get('/', (req, res) => {
  res.json({
    status: 'API Kankadi Internationale en fonctionnement',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    documentation: 'https://pfe2025.onrender.com/api-docs',
    endpoints: Object.keys(routes).map(name => `/api/${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`)
  });
});

// Gestion des erreurs centralisée
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.error(`[${new Date().toISOString()}] ${err.stack}`);

  res.status(status).json({
    success: false,
    message: isProduction && status === 500 ? 'Erreur serveur' : err.message,
    ...(!isProduction && { stack: err.stack }),
    ...(err.errors && { errors: err.errors })
  });
});

// Gestion des 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint non trouvé',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: Object.keys(routes).map(name => `/api/${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`)
  });
});

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur https://pfe2025.onrender.com`);
  console.log(`Port: ${PORT} | Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Base de données: ${mongoose.connection.host}/${mongoose.connection.name}`);
});

// Gestion propre des arrêts
process.on('SIGTERM', () => {
  console.log('🛑 Réception SIGTERM. Arrêt propre du serveur...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('🔌 Serveur et connexion DB fermés');
      process.exit(0);
    });
  });
});

process.on('unhandledRejection', (err) => {
  console.error('⚠️ Rejet non géré:', err);
});