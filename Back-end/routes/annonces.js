const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const path = require("path");
const fs = require("fs");

// Import des modèles
const AnnonceCandidat = require("../models/AnnonceCandidat");
const Utilisateur = require("../models/Utilisateur");
const ProfilUser = require("../models/ProfilUser");
const ProfilCv = require("../models/ProfilCv");

// Middleware d'authentification
const isAuthenticated = require("../middlewares/auth");

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.userId;
    // Validation des champs requis
    const requiredFields = ['titre', 'description', 'typeContrat', 'localisation', 'competencesRequises', 'metier'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Champs manquants: ${missingFields.join(', ')}`,
        code: "MISSING_FIELDS"
      });
    }

    // Vérifier le profil CV si fourni
    if (req.body.profilCv) {
      const profilCv = await ProfilCv.findOne({
        _id: req.body.profilCv,
        user: userId
      });
      if (!profilCv) {
        return res.status(400).json({
          message: "Profil CV non valide ou n'appartenant pas à l'utilisateur",
          code: "INVALID_PROFIL_CV"
        });
      }
    }

    // Création de l'annonce
    const annonce = new AnnonceCandidat({
      titre: req.body.titre,
      description: req.body.description,
      typeContrat: req.body.typeContrat,
      localisation: req.body.localisation,
      competencesRequises: req.body.competencesRequises,
      salaireSouhaite: req.body.salaireSouhaite,
      profilCv: req.body.profilCv,
      metier: req.body.metier,
      candidat: userId,
    });

    await annonce.save();

    // Mise à jour de l'utilisateur
    await Utilisateur.findByIdAndUpdate(userId, {
      $push: { annonces: annonce._id }
    });

    res.status(201).json({
      message: "Annonce créée avec succès",
      annonce: annonce
    });

  } catch (err) {
    console.error("Erreur création annonce:", err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: "Erreur de validation",
        errors,
        code: "VALIDATION_ERROR"
      });
    }
    
    res.status(500).json({ 
      message: "Erreur serveur lors de la création de l'annonce",
      code: "SERVER_ERROR",
      error: err.message
    });
  }
});

// Récupérer les annonces de l'utilisateur
router.get("/mes-annonces", isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 5, typeContrat, localisation } = req.query;
    const query = { candidat: req.userId };

    if (typeContrat) query.typeContrat = typeContrat;
    if (localisation) query.localisation = localisation;

    const annonces = await AnnonceCandidat.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("profilLie", "metier competences")
      .populate("profilCv")
      .populate("entretien", "meet_link date_entretien statut"); // Added population for entretien

    const total = await AnnonceCandidat.countDocuments(query);

    res.status(200).json({
      annonces,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page)
    });

  } catch (err) {
    console.error("Erreur récupération annonces:", err);
    res.status(500).json({ 
      message: "Erreur serveur",
      code: "SERVER_ERROR",
      error: err.message
    });
  }
});

router.get("/recherche", async (req, res) => {
  try {
    const { competences, metier, localisation, page = 1, limit = 10, typeContrat, search } = req.query;
    
    // Condition principale : uniquement le statut "publié"
    const query = { status: "publié" };

    // Suppression de la condition estValide
    if (competences) query.competencesRequises = { $in: competences.split(",") };
    if (metier) query.metier = new RegExp(metier, "i");
    if (localisation) query.localisation = new RegExp(localisation, "i");
    if (typeContrat) query.typeContrat = typeContrat;
    if (search) {
      query.$or = [
        { titre: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const annonces = await AnnonceCandidat.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("candidat", "nom prenom photoProfil")
      .populate("profilLie", "metier competences")
      .populate("profilCv");

    const total = await AnnonceCandidat.countDocuments(query);

    res.status(200).json({
      annonces,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page)
    });

  } catch (err) {
    console.error("Erreur recherche annonces:", err);
    res.status(500).json({ 
      message: "Erreur serveur",
      code: "SERVER_ERROR",
      error: err.message
    });
  }
});

// Modifier une annonce
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const annonceExistante = await AnnonceCandidat.findOne({ 
      _id: id, 
      candidat: userId 
    });

    if (!annonceExistante) {
      return res.status(404).json({ 
        message: "Annonce non trouvée ou non autorisée",
        code: "NOT_FOUND"
      });
    }

    const { profilCv, ...updateData } = req.body;

    if (profilCv && profilCv !== annonceExistante.profilCv?.toString()) {
      const profilValide = await ProfilCv.findOne({
        _id: profilCv,
        user: userId
      });

      if (!profilValide) {
        return res.status(400).json({
          message: "Profil CV non valide ou n'appartenant pas à l'utilisateur",
          code: "INVALID_PROFIL_CV"
        });
      }
      updateData.profilCv = profilCv;
    }

    const updatedAnnonce = await AnnonceCandidat.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      message: "Annonce mise à jour avec succès",
      annonce: updatedAnnonce
    });

  } catch (err) {
    console.error("Erreur mise à jour annonce:", err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: "Erreur de validation",
        errors,
        code: "VALIDATION_ERROR"
      });
    }

    res.status(500).json({ 
      message: "Erreur serveur lors de la mise à jour",
      code: "SERVER_ERROR",
      error: err.message
    });
  }
});

// Supprimer une annonce
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const annonce = await AnnonceCandidat.findOneAndDelete({
      _id: req.params.id,
      candidat: req.userId
    });

    if (!annonce) {
      return res.status(404).json({ 
        message: "Annonce non trouvée ou non autorisée",
        code: "NOT_FOUND"
      });
    }

    res.status(200).json({ message: "Annonce supprimée avec succès" });
  } catch (err) {
    console.error("Erreur suppression annonce:", err);
    res.status(500).json({ 
      message: "Erreur serveur",
      code: "SERVER_ERROR",
      error: err.message
    });
  }
});

// Sauvegarder/retirer une annonce
router.post('/:id/toggle-save', isAuthenticated, async (req, res) => {
  try {
    const annonce = await AnnonceCandidat.findById(req.params.id);
    if (!annonce) {
      return res.status(404).json({ 
        message: 'Annonce non trouvée',
        code: "NOT_FOUND"
      });
    }

    const userId = req.userId;
    const index = annonce.sauvegardesPar.indexOf(userId);

    // Vérifiez si profilCv est requis mais pas défini
    if (!annonce.profilCv) {
      return res.status(400).json({
        message: 'Le profil CV est obligatoire pour sauvegarder cette annonce.',
        code: "PROFILE_CV_REQUIRED"
      });
    }

    // Ajoute ou supprime utilisateur de la liste de sauvegardes
    if (index === -1) {
      annonce.sauvegardesPar.push(userId);
    } else {
      annonce.sauvegardesPar.splice(index, 1);
    }

    await annonce.save();
    res.json({ 
      isSaved: index === -1,
      message: "Opération réussie"
    });
  } catch (err) {
    console.error('Error toggling save:', err);
    res.status(500).json({ 
      message: 'Erreur serveur',
      code: "SERVER_ERROR",
      error: err.message
    });
  }
});

// Récupérer les annonces sauvegardées
router.get('/saved', isAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;

    const [annonces, total] = await Promise.all([
      AnnonceCandidat.find({ sauvegardesPar: req.userId })
        .populate('candidat', 'nom prenom photoProfil')
        .populate('profilLie', 'metier competences')
        .populate('profilCv')
        .skip(skip)
        .limit(limit),
      AnnonceCandidat.countDocuments({ sauvegardesPar: req.userId })
    ]);

    res.json({
      annonces,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching saved annonces:', err);
    res.status(500).json({ 
      message: 'Erreur serveur',
      code: "SERVER_ERROR",
      error: err.message
    });
  }
});
// Récupérer le CV d'une annonce
router.get("/:annonceId/cv", isAuthenticated, async (req, res) => {
  try {
    const { annonceId } = req.params;

    // Validate annonceId
    if (!mongoose.Types.ObjectId.isValid(annonceId)) {
      return res.status(400).json({ message: "ID de l'annonce invalide.", code: "INVALID_ID" });
    }

    // Fetch annonce with populated profilCv
    const annonce = await AnnonceCandidat.findById(annonceId).populate("profilCv");
    if (!annonce) {
      return res.status(404).json({ message: "Annonce non trouvée.", code: "NOT_FOUND" });
    }

    // Check if profilCv and cv subdocument exist
    if (!annonce.profilCv) {
      return res.status(404).json({ message: "Aucun profil CV associé à cette annonce.", code: "CV_NOT_FOUND" });
    }
    if (!annonce.profilCv.cv || !annonce.profilCv.cv.path) {
      return res.status(404).json({ message: "Aucun fichier CV trouvé pour ce profil.", code: "CV_FILE_NOT_FOUND" });
    }

    // Resolve absolute path to CV file
    const cvPath = path.resolve(__dirname, "..", annonce.profilCv.cv.path);

    // Check if file exists
    if (!fs.existsSync(cvPath)) {
      return res.status(404).json({ message: "Fichier CV introuvable sur le serveur.", code: "FILE_NOT_FOUND" });
    }

    // Set response headers
    res.setHeader("Content-Type", annonce.profilCv.cv.mimetype || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${annonce.profilCv.cv.originalname || "CV.pdf"}"`);

    // Send the file
    res.sendFile(cvPath, (err) => {
      if (err) {
        console.error("Erreur envoi fichier CV:", err);
        res.status(500).json({ message: "Erreur lors de l'envoi du CV.", code: "SEND_FILE_ERROR" });
      }
    });
  } catch (error) {
    console.error("Erreur récupération CV:", error);
    res.status(500).json({ 
      message: "Erreur serveur lors de la récupération du CV.", 
      code: "SERVER_ERROR",
      error: error.message 
    });
  }
});





router.get('/publiees', async (req, res) => {
  try {
    const annonces = await AnnonceCandidat.find({ status: "publié" })
      .populate("candidat", "nom prenom photoProfil")
      .populate("profilCv", "cv")
      .lean();
    console.log(`Found ${annonces.length} published annonces`);
    res.json({ annonces });
  } catch (error) {
    console.error('Erreur dans /publiees:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Erreur lors de la récupération des annonces publiées' });
  }
});

// Publier/Dépublier une annonce
router.put("/:id/toggle-publish", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Vérifier si l'annonce existe et appartient à l'utilisateur
    const annonce = await AnnonceCandidat.findOne({ 
      _id: id, 
      candidat: userId 
    });

    if (!annonce) {
      return res.status(404).json({ 
        message: "Annonce non trouvée ou non autorisée",
        code: "NOT_FOUND"
      });
    }

    console.log(`Toggling publication for annonce ${id}, current status: ${annonce.status}`);

    // Basculer l'état de publication
    if (annonce.status === "publié") {
      await annonce.depublier();
    } else {
      await annonce.publier();
    }

    console.log(`New status: ${annonce.status}`);

    res.status(200).json({
      message: annonce.status === "publié" ? "Annonce publiée avec succès" : "Annonce dépubliée avec succès",
      annonce: annonce.toObject()
    });
  } catch (err) {
    console.error("Erreur lors du basculement de l'état de publication:", {
      message: err.message,
      stack: err.stack,
      annonceId: req.params.id,
      userId: req.userId
    });
    res.status(400).json({ 
      message: "Erreur lors du basculement de l'état de publication",
      code: "VALIDATION_ERROR",
      error: err.message
    });
  }
});



// Validate an announcement
router.put('/:id/valider', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = utilisateur.profils.some(profil => profil.name === 'Admin');
    if (!isAdmin) {
      return res.status(403).json({
        message: "Accès refusé. Seuls les administrateurs peuvent valider une annonce."
      });
    }

    const annonce = await AnnonceCandidat.findById(id);
    if (!annonce) {
      return res.status(404).json({
        message: "Annonce non trouvée."
      });
    }

    if (annonce.estValide) {
      return res.status(400).json({
        message: "Cette annonce est déjà validée."
      });
    }

    annonce.estValide = true;
    await annonce.save();

    res.status(200).json({
      message: "Annonce validée avec succès !",
      annonce
    });
  } catch (error) {
    console.error("Erreur lors de la validation de l'annonce:", error);
    res.status(500).json({
      message: "Erreur serveur, veuillez réessayer.",
      error: error.message
    });
  }
});

router.put('/:id/rejeter', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = utilisateur.profils.some(profil => profil.name === 'Admin');
    if (!isAdmin) {
      return res.status(403).json({
        message: "Accès refusé. Seuls les administrateurs peuvent rejeter une annonce."
      });
    }

    const annonce = await AnnonceCandidat.findById(id);
    if (!annonce) {
      return res.status(404).json({
        message: "Annonce non trouvée."
      });
    }

    if (annonce.status === "rejeté") {
      return res.status(400).json({
        message: "Cette annonce est déjà rejetée."
      });
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        message: "Une raison de rejet est requise."
      });
    }

    await annonce.rejeter(rejectionReason);

    res.status(200).json({
      message: "Annonce rejetée avec succès !",
      annonce
    });
  } catch (error) {
    console.error("Erreur lors du rejet de l'annonce:", error);
    res.status(500).json({
      message: "Erreur serveur, veuillez réessayer.",
      error: error.message
    });
  }
});

module.exports = router;