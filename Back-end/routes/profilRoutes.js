const express = require("express");
const Profil = require("../models/Profil");
const isAuthenticated = require("../middlewares/auth");
const Utilisateur = require('../models/Utilisateur');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path')



router.post('/create-file', (req, res) => {
    const { targetFileName, content } = req.body;

    // Mettez à jour le chemin pour pointer vers le bon répertoire
    const dirPath = path.join('C:\\Users\\Fadiga\\OneDrive\\Bureau\\PFE_2025\\GRH\\src\\examples');
    const filePath = path.join(dirPath, `${targetFileName}.js`);

    // Vérifiez si le répertoire existe
    if (!fs.existsSync(dirPath)) {
        return res.status(400).json({ message: 'Le répertoire n\'existe pas, veuillez le créer manuellement.' });
    }

    // Vérifiez si le fichier existe déjà
    if (fs.existsSync(filePath)) {
        return res.status(400).json({ message: 'Le fichier existe déjà.' });
    }

    // Écriture du fichier
    fs.writeFile(filePath, content, (err) => {
        if (err) {
            console.error("Erreur lors de la création du fichier :", err);
            return res.status(500).json({ message: 'Erreur lors de la création du fichier.' });
        }
        res.status(200).json({ message: 'Fichier créé avec succès.' });
    });
});



// Route pour récupérer tous les profils
router.get("/", async (req, res) => {
    try {
      const profils = await Profil.find();
      res.status(200).json(profils);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des profils." });
    }
  });
  
// Route pour récupérer le profil de l'utilisateur connecté
router.get('/Connected', isAuthenticated, async (req, res) => {
    try {
        // Trouver l'utilisateur avec son ID et peupler les profils associés
        const utilisateur = await Utilisateur.findById(req.userId)
            .populate({
                path: 'profils', // Modifiez ici pour peupler 'profils'
                populate: {
                    path: 'menus', // Si vous voulez aussi peupler les menus dans chaque profil
                }
            });
        
        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        // Retourner les profils associés et les détails de l'utilisateur
        return res.status(200).json({ profils: utilisateur.profils, utilisateur });
    } catch (err) {
        console.error("Erreur lors de la récupération de l'utilisateur :", err);
        return res.status(500).json({ message: "Erreur serveur." });
    }
});

// Configuration de multer pour ne pas sauvegarder le fichier sur le disque
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', isAuthenticated, upload.single('photo'), async (req, res) => {
    console.log("Received file:", req.file);
    console.log("User ID:", req.userId);
  
    try {
        const userId = req.userId;
        const profil = await Profil.findOne({ user: userId });
        
        if (!profil) {
            return res.status(404).json({ message: "Profil non trouvé." });
        }
  
        // Mettre à jour la photo dans le profil
        if (req.file) {
            console.log("Avant mise à jour de la photo:", profil.photo); // Log de l'ancienne photo
            profil.photo = {
                data: req.file.buffer,
                contentType: req.file.mimetype,
            };
            console.log("Après mise à jour de la photo:", profil.photo); // Log de la nouvelle photo
        } else {
            return res.status(400).json({ message: "Aucun fichier photo reçu." });
        }

        // Essayez de sauvegarder le profil avec la nouvelle photo
        const updatedProfil = await profil.save();
        console.log("Profil mis à jour:", updatedProfil); // Vérifiez ce qui est retourné après sauvegarde

        res.status(200).json({ message: "Photo téléchargée avec succès", profil: updatedProfil });
    } catch (error) {
        console.error("Erreur lors du téléchargement de la photo:", error);
        res.status(500).send(`Erreur lors du téléchargement de la photo: ${error.message}`);
    }
});

router.get('/photo/:id', async (req, res) => {
    try {
      const profil = await Profil.findById(req.params.id);
      if (!profil || !profil.photo || !profil.photo.data) {
        return res.status(404).json({ message: 'Image non trouvée' });
      }
  
      res.set('Content-Type', profil.photo.contentType);
      res.send(profil.photo.data); // Envoyer les données de l'image
    } catch (error) {
      console.error("Erreur lors de la récupération de la photo:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de la photo." });
    }
  });


  router.post("/", async (req, res) => {
    const { name } = req.body;
    try {
        const newProfil = new Profil({ name });
        await newProfil.save();
        res.status(201).json(newProfil);
    } catch (error) {
        res.status(400).json({ message: "Erreur lors de la création du profil.", error });
    }
});

// Route pour modifier un profil
router.put("/:id", async (req, res) => {
    const { name } = req.body;
    try {
        const updatedProfil = await Profil.findByIdAndUpdate(req.params.id, { name }, { new: true });
        if (!updatedProfil) {
            return res.status(404).json({ message: "Profil non trouvé." });
        }
        res.status(200).json(updatedProfil);
    } catch (error) {
        res.status(400).json({ message: "Erreur lors de la modification du profil.", error });
    }
});

router.delete("/:id", isAuthenticated, async (req, res) => {
    try {
        const deletedProfil = await Profil.findByIdAndDelete(req.params.id);
        if (!deletedProfil) {
            return res.status(404).json({ message: "Profil non trouvé." });
        }
        console.log(`Profil supprimé: ${req.params.id}`);
        res.status(200).json({ message: "Profil supprimé avec succès." });
    } catch (error) {
        console.error("Erreur suppression profil:", error);
        res.status(500).json({ message: "Erreur lors de la suppression du profil.", error });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const profil = await Profil.findById(req.params.id);
        if (!profil) {
            return res.status(404).json({ message: 'Profil non trouvé.' });
        }
        res.json(profil);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du profil.', error });
    }
});

module.exports = router;
