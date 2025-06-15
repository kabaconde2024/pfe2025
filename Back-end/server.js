const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // Modification de cet import
const utilisateurRoutes = require('./routes/utilisateurRoutes');
const profilRoutes = require("./routes/profilRoutes"); // Assurez-vous que le chemin est correct
const menuRoutes = require('./routes/menuRoutes'); // Mettez à jour le chemin selon votre structure de dossier
const contratRoutes = require('./routes/contratRoutes'); // Ajoutez votre chemin correct ici
const entrepriseRoutes = require("./routes/entrepriseRoutes");
const userProfileRoutes = require('./routes/userProfileRoutes'); // Chemin pour le ProfilUser
const candidatureRoutes = require("./routes/candidatures"); // Assurez-vous que le chemin est correct
const articlesRouter = require('./routes/ArticleRoutes'); // Ajustez le chemin si nécessaire
const avenantRoutes = require("./routes/avenantRoutes");
const pointageRoutes = require('./routes/pointageRoutes');
const entretienRoutes = require('./routes/entretienRoute'); // Assurez-vous que le chemin est correct
const fichesDePaieRoutes = require('./routes/fichesDePaieRoutes'); // Utilisez le chemin correct
const annoncesRoutes = require("./routes/annonces");
const emailRoutes = require('./routes/email');
const profilCvRoutes = require('./routes/ProfilCvRoutes'); 
const notificationRoutes = require('./routes/notifications');
const missionRoutes = require("./routes/missionRoutes");
const FormationRoute = require("./routes/FormationRoute");
const Notification = require('./models/Notification');
const authenticateToken = require('./middlewares/auth');

const offreRoutes = require("./routes/offreRoutes");

const app = express();
const path = require("path");


// Activer CORS et JSON
app.use(cors());
app.use(express.json({ limit: '100mb' })); // Ajoutez la limite ici
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Connexion à MongoDB
const DB_URI = 'mongodb://localhost:27017/PFE2025'; // Remplace par ton URL MongoDB
mongoose.connect(DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connexion à MongoDB réussie !'))
.catch(err => console.error('❌ Erreur de connexion à MongoDB :', err));

// Configuration de la session
app.use(session({
    secret: 'votre_secret_de_session', // Changez ceci par un secret fort
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: DB_URI }), // Changement ici
    cookie: { maxAge: 180 * 60 * 1000 } // Durée de vie de la session (ex: 3 heures)
}));

app.get('/', (req, res) => {
    res.send('Bienvenue sur mon projet Node.js avec MongoDB !');
});



// Specific routes first
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

// Generic /api routes last
app.use('/api', utilisateurRoutes);
app.use('/api', articlesRouter);
app.use('/api', avenantRoutes);
app.use('/api', emailRoutes);

app.use("/contrats", express.static(path.join(__dirname, "public/contrats")));

// Error handler
app.use((err, req, res, next) => {
    console.error(`[ERROR] Global error: ${err.message}`, err.stack);
    res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: err.message
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚗 Serveur démarré sur http://localhost:${PORT}`);
});