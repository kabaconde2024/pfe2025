const express = require('express');
const router = express.Router();
const ProfilCv = require('../models/ProfilCv');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const isAuthenticated = require('../middlewares/auth');

// Configuration Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'Uploads/cvs/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cv-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    mimetype && extname ? cb(null, true) : cb(new Error('Seuls les fichiers PDF, DOC et DOCX sont autorisés'));
  }
});

// Créer un nouveau profil
router.post('/creer', isAuthenticated, upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "Veuillez uploader un CV" 
      });
    }

    // Validation des champs requis
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: "Le nom du profil est requis"
      });
    }

    if (!req.body.competences || JSON.parse(req.body.competences).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Au moins une compétence est requise"
      });
    }

    if (!req.body.metier) {
      return res.status(400).json({
        success: false,
        message: "Le métier du profil est requis"
      });
    }

    const newProfilCv = new ProfilCv({
      name: req.body.name,
      competences: JSON.parse(req.body.competences),
      metier: req.body.metier,
      user: req.userId,
      cv: {
        filename: req.file.filename,
        path: req.file.path,
        url: `/Uploads/cvs/${req.file.filename}`
      }
    });

    await newProfilCv.save();
    
    res.status(201).json({
      success: true,
      message: "Profil créé avec succès",
      data: newProfilCv
    });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    
    console.error("Erreur création profil:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.errors
    });
  }
});

// Lister tous les profils
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const profils = await ProfilCv.find({ user: req.userId }).sort({ createdAt: -1 });

    const profilsWithFullUrls = profils.map(profil => {
      if (profil.cv) {
        return {
          ...profil.toObject(),
          cv: {
            ...profil.cv,
            url: `${req.protocol}://${req.get('host')}${profil.cv.url}`
          }
        };
      }
      return profil;
    });

    res.json(profilsWithFullUrls);
  } catch (error) {
    console.error("Error fetching profils:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Récupérer un profil spécifique
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const profil = await ProfilCv.findOne({ _id: req.params.id, user: req.userId });
    if (!profil) return res.status(404).json({ message: "Profil non trouvé" });

    if (profil.cv) {
      profil.cv.url = `${req.protocol}://${req.get('host')}${profil.cv.url}`;
    }

    res.json(profil);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour un profil
router.put('/:id', isAuthenticated, upload.single('cv'), async (req, res) => {
  try {
    const profil = await ProfilCv.findOne({ _id: req.params.id, user: req.userId });
    if (!profil) {
      return res.status(404).json({ 
        success: false,
        message: "Profil non trouvé ou non autorisé" 
      });
    }

    // Supprimer l'ancien fichier si un nouveau est uploadé
    if (req.file && profil.cv?.path) {
      fs.unlink(profil.cv.path, (err) => {
        if (err) console.error("Erreur suppression fichier:", err);
      });
    }

    const updateData = {
      name: req.body.name,
      competences: JSON.parse(req.body.competences),
      metier: req.body.metier,
      ...(req.file && {
        cv: {
          filename: req.file.filename,
          path: req.file.path,
          url: `/Uploads/cvs/${req.file.filename}`
        }
      })
    };

    const updatedProfil = await ProfilCv.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    res.json({
      success: true,
      message: "Profil mis à jour avec succès",
      data: updatedProfil
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Supprimer un profil
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const profil = await ProfilCv.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.userId
    });

    if (!profil) {
      return res.status(404).json({ 
        success: false,
        message: "Profil non trouvé ou vous n'avez pas les droits" 
      });
    }

    // Suppression physique du fichier
    if (profil.cv?.path) {
      fs.unlink(profil.cv.path, (err) => {
        if (err) console.error("Erreur suppression fichier:", err);
      });
    }

    res.json({ 
      success: true,
      message: "Profil supprimé avec succès",
      deletedId: req.params.id
    });
  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur lors de la suppression",
      error: error.message 
    });
  }
});

// Route pour compter les profils
router.get('/count', isAuthenticated, async (req, res) => {
  try {
    const count = await ProfilCv.countDocuments({ user: req.userId });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;