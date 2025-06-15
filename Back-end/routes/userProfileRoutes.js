const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ProfilUser = require('../models/ProfilUser');
const CV = require('../models/CV');
const Utilisateur = require('../models/Utilisateur');

// Configuration Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../uploads/cvs/');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
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
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
      }
    }
  });
  
  // POST /api/profil_user
  router.post("/", upload.single('cv'), async (req, res) => {
      try {
          const { metier, user } = req.body;
          
          // Conversion des compétences en tableau
          let competences = [];
          if (req.body.competences) {
              competences = Array.isArray(req.body.competences) 
                  ? req.body.competences 
                  : req.body.competences.split(',').map(c => c.trim()).filter(c => c);
          }
  
          // Validation
          if (!metier || competences.length === 0 || !user) {
              return res.status(400).json({ 
                  success: false,
                  message: "Métier, compétences et utilisateur sont obligatoires" 
              });
          }
  
          // Vérification utilisateur
          const utilisateur = await Utilisateur.findById(user);
          if (!utilisateur) {
              return res.status(404).json({ 
                  success: false,
                  message: "Utilisateur non trouvé" 
              });
          }
  
          // Gestion du CV
          let cvId = null;
          if (req.file) {
              const nouveauCV = new CV({
                  filename: req.file.filename,
                  path: req.file.path,
                  originalName: req.file.originalname,
                  mimetype: req.file.mimetype,
                  size: req.file.size,
                  user: user
              });
              const cvSauvegarde = await nouveauCV.save();
              cvId = cvSauvegarde._id;
          }
  
          // Création du profil
          const nouveauProfil = new ProfilUser({
              metier,
              competences,
              cv: cvId,
              user
          });
  
          const profilSauvegardé = await nouveauProfil.save();
  
          // Mise à jour de l'utilisateur
          await Utilisateur.findByIdAndUpdate(
              user,
              { $addToSet: { profilUser: profilSauvegardé._id } }
          );
  
          res.status(201).json({
              success: true,
              message: "Profil créé avec succès",
              data: await ProfilUser.findById(profilSauvegardé._id)
                                .populate('user')
                                .populate('cv')
          });
  
      } catch (error) {
          console.error("Erreur:", error);
          
          // Nettoyage en cas d'erreur
          if (req.file?.path && fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
          }
  
          res.status(500).json({ 
              success: false,
              message: error.message.includes("PDF") 
                    ? error.message 
                    : "Erreur lors de la création du profil"
          });
      }
  });

// Récupérer tous les profils avec leurs CV
router.get("/", async (req, res) => {
    try {
        const profils = await ProfilUser.find()
            .populate('user')
            .populate('cv');
        res.status(200).json(profils);
    } catch (error) {
        console.error("Erreur récupération profils:", error);
        res.status(500).json({ 
            message: "Erreur lors de la récupération des profils",
            error: error.message
        });
    }
});

// Récupérer un profil spécifique
router.get("/:id", async (req, res) => {
    try {
        const profil = await ProfilUser.findById(req.params.id)
            .populate('user')
            .populate('cv');
        
        if (!profil) {
            return res.status(404).json({ message: "Profil non trouvé" });
        }
        
        res.status(200).json(profil);
    } catch (error) {
        console.error("Erreur récupération profil:", error);
        res.status(500).json({ 
            message: "Erreur lors de la récupération du profil",
            error: error.message
        });
    }
});

// Mettre à jour un profil (sans CV)
router.put("/:id", async (req, res) => {
    try {
        const { metier, competences } = req.body;
        
        const updatedProfil = await ProfilUser.findByIdAndUpdate(
            req.params.id,
            { 
                metier,
                competences: Array.isArray(competences) ? competences : [competences]
            },
            { new: true, runValidators: true }
        ).populate('user').populate('cv');
        
        if (!updatedProfil) {
            return res.status(404).json({ message: "Profil non trouvé" });
        }
        
        res.status(200).json({
            message: "Profil mis à jour avec succès",
            profil: updatedProfil
        });
    } catch (error) {
        console.error("Erreur mise à jour profil:", error);
        res.status(500).json({ 
            message: "Erreur lors de la mise à jour du profil",
            error: error.message
        });
    }
});

// Mettre à jour uniquement le CV d'un profil
router.patch("/:id/cv", upload.single('cv'), async (req, res) => {
    try {
        const profil = await ProfilUser.findById(req.params.id);
        if (!profil) {
            return res.status(404).json({ message: "Profil non trouvé" });
        }

        // Supprimer l'ancien CV si existe
        if (profil.cv) {
            const ancienCV = await CV.findById(profil.cv);
            if (ancienCV && fs.existsSync(ancienCV.path)) {
                fs.unlinkSync(ancienCV.path);
            }
            await CV.findByIdAndDelete(profil.cv);
        }

        let cvDocument = null;
        
        // Gestion du nouveau CV
        if (req.file) {
            cvDocument = new CV({
                filename: req.file.filename,
                path: req.file.path,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                user: profil.user
            });
            await cvDocument.save();
        }

        // Mise à jour de la référence du CV dans le profil
        profil.cv = cvDocument ? cvDocument._id : null;
        await profil.save();

        res.status(200).json({
            message: "CV mis à jour avec succès",
            profil: await ProfilUser.findById(req.params.id).populate('cv')
        });

    } catch (error) {
        console.error("Erreur mise à jour CV:", error);
        
        // Nettoyage en cas d'erreur
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlink(req.file.path, err => {
                if (err) console.error("Erreur suppression fichier:", err);
            });
        }

        res.status(500).json({ 
            message: "Erreur lors de la mise à jour du CV",
            error: error.message
        });
    }
});

// Supprimer un profil
router.delete("/:id", async (req, res) => {
    try {
        const profil = await ProfilUser.findById(req.params.id);
        if (!profil) {
            return res.status(404).json({ message: "Profil non trouvé" });
        }

        // Supprimer le CV associé si existe
        if (profil.cv) {
            const cv = await CV.findById(profil.cv);
            if (cv && fs.existsSync(cv.path)) {
                fs.unlinkSync(cv.path);
            }
            await CV.findByIdAndDelete(profil.cv);
        }

        // Supprimer la référence du profil dans l'utilisateur
        await Utilisateur.findByIdAndUpdate(
            profil.user,
            { $pull: { profilUser: profil._id } }
        );

        // Supprimer le profil
        await ProfilUser.findByIdAndDelete(req.params.id);

        res.status(204).send();
    } catch (error) {
        console.error("Erreur suppression profil:", error);
        res.status(500).json({ 
            message: "Erreur lors de la suppression du profil",
            error: error.message
        });
    }
});

module.exports = router;