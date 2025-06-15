const express = require("express");
const mongoose = require("mongoose");
const { PDFDocument } = require("pdf-lib");
const Contrat = require("../models/Contrat");
const Utilisateur = require("../models/Utilisateur");
const Offre = require("../models/Offre");
const Avenant = require("../models/Avenant");
const authMiddleware = require("../middlewares/auth");
const Pointage = require("../models/Pointage");
const Profil = require("../models/Profil");
const Notification = require("../models/Notification");
const Article = require("../models/Article");
const Entretien = require("../models/Entretien");

const router = express.Router();

// Validation des data URLs pour les signatures
const isValidDataURL = (dataURL) => {
  if (typeof dataURL !== "string") {
    console.error("Invalid data URL: not a string", { dataURL });
    return false;
  }
  const isValid = dataURL.startsWith("data:image/png;base64,") && dataURL.length > 100;
  if (!isValid) {
    console.error("Invalid data URL:", dataURL.substring(0, 50) + "...");
  }
  return isValid;
};

// Validation des data URLs pour les PDFs
const isValidPDFDataURL = (dataURL) => {
  if (typeof dataURL !== "string") {
    console.error("Invalid PDF data URL: not a string", { dataURL });
    return false;
  }
  const isValid = dataURL.startsWith("data:application/pdf;base64,") && dataURL.length > 100;
  if (!isValid) {
    console.error("Invalid PDF data URL:", {
      dataURL: dataURL.substring(0, 50) + "...",
      startsWith: dataURL.startsWith("data:application/pdf;base64,"),
      length: dataURL.length,
    });
  }
  return isValid;
};

// Création d'un contrat
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Non autorisé - ID utilisateur manquant" });
    }

    const requiredFields = ["titre", "user", "entreprise", "typeContrat", "dateDebut", "intitulePoste", "tempsTravail", "salaire", "modalitesPaiement"];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `Le champ ${field} est obligatoire`,
          receivedData: req.body,
        });
      }
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(req.body.user)) {
      return res.status(400).json({ success: false, message: "ID utilisateur invalide" });
    }
    if (!mongoose.Types.ObjectId.isValid(req.body.entreprise)) {
      return res.status(400).json({ success: false, message: "ID entreprise invalide" });
    }
    if (req.body.offre && !mongoose.Types.ObjectId.isValid(req.body.offre)) {
      return res.status(400).json({ success: false, message: "ID offre invalide" });
    }
    if (req.body.entretien && !mongoose.Types.ObjectId.isValid(req.body.entretien)) {
      return res.status(400).json({ success: false, message: "ID entretien invalide" });
    }

    // Si un entretien_id est fourni, valider l'entretien
    let foundEntretien = null;
    if (req.body.entretien) {
      foundEntretien = await Entretien.findById(req.body.entretien)
        .populate('candidat_id', 'nom prenom email')
        .populate('entreprise_id', 'nomEntreprise adresseEntreprise');
      if (!foundEntretien) {
        return res.status(404).json({ success: false, message: "Entretien non trouvé" });
      }
      if (foundEntretien.resultat !== 'Positif') {
        return res.status(400).json({ success: false, message: "L'entretien doit avoir un résultat positif pour créer un contrat" });
      }
      if (foundEntretien.type !== 'ANNONCE') {
        return res.status(400).json({ success: false, message: "L'entretien doit être de type ANNONCE pour créer un contrat sans offre" });
      }
      // Vérifier que les IDs correspondent
      if (foundEntretien.candidat_id._id.toString() !== req.body.user) {
        return res.status(400).json({ success: false, message: "L'utilisateur ne correspond pas au candidat de l'entretien" });
      }
      if (foundEntretien.entreprise_id._id.toString() !== req.body.entreprise) {
        return res.status(400).json({ success: false, message: "L'entreprise ne correspond pas à celle de l'entretien" });
      }
    }

    const [foundUser, foundEntreprise, foundOffre] = await Promise.all([
      Utilisateur.findById(req.body.user),
      Utilisateur.findById(req.body.entreprise),
      req.body.offre ? Offre.findById(req.body.offre) : Promise.resolve(null),
    ]);

    if (!foundUser) return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
    if (!foundEntreprise || !foundEntreprise.nomEntreprise)
      return res.status(404).json({ success: false, message: "Entreprise non trouvée ou profil incomplet" });
    if (req.body.offre && !foundOffre) return res.status(404).json({ success: false, message: "Offre non trouvée" });

    const newContrat = new Contrat({
      ...req.body,
      missions: req.body.missions || [],
      articles: req.body.articles || [],
      createdBy: req.userId,
      lastModifiedBy: req.userId,
      entretien: req.body.entretien || null, // Ajouter l'entretien_id si fourni
    });

    const savedContrat = await newContrat.save();

    const populatedContrat = await Contrat.findById(savedContrat._id)
      .populate("user", "nom prenom email")
      .populate("entreprise", "nomEntreprise adresseEntreprise")
      .populate("offre", "titre")
      .populate("articles")
      .populate({
        path: "entretien",
        select: "type date_entretien resultat",
        populate: [
          { path: "candidat_id", select: "nom prenom email" },
          { path: "entreprise_id", select: "nomEntreprise" },
        ],
      });

    res.status(201).json({ success: true, data: populatedContrat });
  } catch (error) {
    console.error("Erreur lors de la création du contrat:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur du serveur", error: error.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const contrat = await Contrat.findOne({
      user: req.userId,
      etat: 'signé',
      $or: [
        { dateFin: { $exists: false } },
        { dateFin: { $gte: new Date() } },
      ],
    })
      .select('typeContrat intitulePoste _id')
      .populate('user', 'nom prenom email')
      .populate('entreprise', 'nomEntreprise');

    if (!contrat) {
      return res.status(404).json({ message: 'Aucun contrat actif trouvé pour cet utilisateur.' });
    }

    const responseData = {
      id: contrat._id,
      typeContrat: contrat.typeContrat,
      intitulePoste: contrat.intitulePoste,
      user: {
        nom: contrat.user.nom,
        prenom: contrat.user.prenom,
        email: contrat.user.email,
      },
      entreprise: {
        nomEntreprise: contrat.entreprise.nomEntreprise,
      },
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Erreur lors de la récupération du contrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Modifier un contrat
router.put("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "ID invalide" });

  try {
    const requiredFields = ["titre", "user", "entreprise", "typeContrat", "dateDebut", "intitulePoste", "tempsTravail", "salaire", "modalitesPaiement"];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `Le champ ${field} est obligatoire`,
          receivedData: req.body,
        });
      }
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(req.body.user)) {
      return res.status(400).json({ success: false, message: "ID utilisateur invalide" });
    }
    if (!mongoose.Types.ObjectId.isValid(req.body.entreprise)) {
      return res.status(400).json({ success: false, message: "ID entreprise invalide" });
    }
    if (req.body.offre && !mongoose.Types.ObjectId.isValid(req.body.offre)) {
      return res.status(400).json({ success: false, message: "ID offre invalide" });
    }

    const [foundUser, foundEntreprise, foundOffre] = await Promise.all([
      Utilisateur.findById(req.body.user),
      Utilisateur.findById(req.body.entreprise),
      req.body.offre ? Offre.findById(req.body.offre) : Promise.resolve(null),
    ]);

    if (!foundUser) return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
    if (!foundEntreprise || !foundEntreprise.nomEntreprise)
      return res.status(404).json({ success: false, message: "Entreprise non trouvée ou profil incomplet" });
    if (req.body.offre && !foundOffre) return res.status(404).json({ success: false, message: "Offre non trouvée" });

    const updated = await Contrat.findByIdAndUpdate(
      id,
      { ...req.body, lastModifiedBy: req.userId },
      { new: true, runValidators: true }
    )
      .populate("user", "nom prenom email")
      .populate("entreprise", "nomEntreprise adresseEntreprise")
      .populate("offre", "titre")
      .populate("articles");

    if (!updated) return res.status(404).json({ success: false, message: "Contrat non trouvé" });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Erreur lors de la modification du contrat:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

// Récupérer tous les contrats
router.get("/", authMiddleware, async (req, res) => {
  try {
    const contrats = await Contrat.aggregate([
      {
        $lookup: {
          from: "utilisateurs",
          localField: "entreprise",
          foreignField: "_id",
          as: "entrepriseData",
        },
      },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "signatureAdmin.user",
          foreignField: "_id",
          as: "adminSignataireData",
        },
      },
      {
        $lookup: {
          from: "offres",
          localField: "offre",
          foreignField: "_id",
          as: "offreData",
        },
      },
      {
        $lookup: {
          from: "missions",
          localField: "missions",
          foreignField: "_id",
          as: "missions",
        },
      },
      {
        $lookup: {
          from: "articles",
          localField: "articles",
          foreignField: "_id",
          as: "articles",
        },
      },
      {
        $project: {
          titre: 1,
          typeContrat: 1,
          user: { $arrayElemAt: ["$userData", 0] },
          entreprise: {
            $cond: {
              if: { $gt: [{ $size: "$entrepriseData" }, 0] },
              then: {
                $mergeObjects: [
                  { _id: { $arrayElemAt: ["$entrepriseData._id", 0] } },
                  {
                    nomEntreprise: { $arrayElemAt: ["$entrepriseData.nomEntreprise", 0] },
                    adresse: { $arrayElemAt: ["$entrepriseData.adresseEntreprise", 0] },
                  },
                ],
              },
              else: null,
            },
          },
          signatureAdmin: {
            user: { $arrayElemAt: ["$adminSignataireData", 0] },
            date: 1,
            signature: 1,
          },
          signatureEntreprise: 1,
          signatureCandidat: 1,
          offre: { $arrayElemAt: ["$offreData", 0] },
          articles: 1,
          avenants: 1,
          fichesDePaie: 1,
          pointages: 1,
          dateDebut: 1,
          dateFin: 1,
          intitulePoste: 1,
          missions: 1,
          tempsTravail: 1,
          salaire: 1,
          modalitesPaiement: 1,
          estComplete: 1,
          etat: 1,
          createdBy: 1,
          lastModifiedBy: 1,
          createdAt: 1,
          updatedAt: 1,
          pdfPath: 1,
          published: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, count: contrats.length, data: contrats });
  } catch (error) {
    console.error("Erreur lors de la récupération des contrats:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

// Récupérer un contrat par ID
router.get("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "ID invalide", receivedId: id });

  try {
    const contrat = await Contrat.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "entreprise",
          foreignField: "_id",
          as: "entrepriseData",
        },
      },
      {
        $lookup: {
          from: "offres",
          localField: "offre",
          foreignField: "_id",
          as: "offreData",
        },
      },
      {
        $lookup: {
          from: "missions",
          localField: "missions",
          foreignField: "_id",
          as: "missions",
        },
      },
      {
        $lookup: {
          from: "articles",
          localField: "articles",
          foreignField: "_id",
          as: "articles",
        },
      },
      {
        $lookup: {
          from: "avenants",
          localField: "_id",
          foreignField: "contrat",
          as: "avenants",
        },
      },
      {
        $addFields: {
          articles: {
            $sortArray: {
              input: "$articles",
              sortBy: { order: 1, createdAt: 1 },
            },
          },
          avenants: {
            $sortArray: {
              input: "$avenants",
              sortBy: { createdAt: 1 },
            },
          },
          missions: {
            $sortArray: {
              input: "$missions",
              sortBy: { order: 1, createdAt: 1 },
            },
          },
        },
      },
      {
        $project: {
          titre: 1,
          typeContrat: 1,
          user: { $arrayElemAt: ["$userData", 0] },
          entreprise: {
            $cond: {
              if: { $gt: [{ $size: "$entrepriseData" }, 0] },
              then: {
                $mergeObjects: [
                  { _id: { $arrayElemAt: ["$entrepriseData._id", 0] } },
                  {
                    nomEntreprise: { $arrayElemAt: ["$entrepriseData.nomEntreprise", 0] },
                    adresseEntreprise: { $arrayElemAt: ["$entrepriseData.adresseEntreprise", 0] },
                  },
                ],
              },
              else: null,
            },
          },
          offre: { $arrayElemAt: ["$offreData", 0] },
          articles: 1,
          avenants: 1,
          fichesDePaie: 1,
          pointages: 1,
          dateDebut: 1,
          dateFin: 1,
          intitulePoste: 1,
          missions: 1,
          tempsTravail: 1,
          salaire: 1,
          modalitesPaiement: 1,
          estComplete: 1,
          etat: 1,
          createdBy: 1,
          lastModifiedBy: 1,
          createdAt: 1,
          updatedAt: 1,
          signatureAdmin: 1,
          signatureEntreprise: 1,
          signatureCandidat: 1,
          published: 1,
          pdfPath: 1,
        },
      },
    ]);

    if (!contrat || contrat.length === 0)
      return res.status(404).json({ success: false, message: "Contrat non trouvé" });

    const contratData = contrat[0];
    console.log(`Détails du contrat ${id}:`, {
      articles: contratData.articles?.length || 0,
      avenants: contratData.avenants?.length || 0,
      missions: contratData.missions?.length || 0,
    });

    res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.status(200).json({ success: true, data: contratData });
  } catch (error) {
    console.error("Erreur lors de la récupération du contrat:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Récupérer le PDF d'un contrat
router.get("/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "ID invalide" });

    const contrat = await Contrat.findById(id).select("pdfPath");
    if (!contrat || !contrat.pdfPath) {
      return res.status(404).json({ success: false, message: "PDF non trouvé" });
    }
    if (!isValidPDFDataURL(contrat.pdfPath)) {
      return res.status(400).json({ success: false, message: "Données PDF invalides" });
    }
    const base64Data = contrat.pdfPath.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(base64Data, "base64");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erreur lors de la récupération du PDF:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

router.post('/:id/approbation-candidat', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { approuve, commentaire } = req.body;
    const userId = req.userId;

    // Validate userId
    if (!userId) {
      console.error('Erreur: userId non défini');
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`Erreur: userId invalide: ${userId}`);
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    // Validate contrat ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`Erreur: ID de contrat invalide: ${id}`);
      return res.status(400).json({ message: 'ID de contrat invalide' });
    }

    // Fetch contract with populated user field
    const contrat = await Contrat.findById(id).populate('user');
    if (!contrat) {
      console.error(`Erreur: Contrat non trouvé pour ID: ${id}`);
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }

    // Check if user field is populated
    if (!contrat.user || !contrat.user._id) {
      console.error(`Erreur: Utilisateur non défini pour le contrat: ${id}`);
      return res.status(400).json({ message: 'Utilisateur non défini pour ce contrat' });
    }

    // Verify user authorization
    if (contrat.user._id.toString() !== userId.toString()) {
      console.error(
        `Erreur: Accès non autorisé. userId: ${userId}, candidatId: ${contrat.user._id}`
      );
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Update approval status
    contrat.approbationCandidat = {
      approuve,
      date: new Date(),
      commentaire: commentaire || '',
    };

    // Update etat based on approvals
    if (contrat.approbationCandidat.approuve === true && contrat.approbationEntreprise?.approuve === true) {
      contrat.etat = "approuve";
    } else if (contrat.approbationCandidat.approuve === true || contrat.approbationEntreprise?.approuve === true) {
      contrat.etat = "approuve_partiellement";
    } else{
      contrat.etat = "en_attente_approbation";
    }

    await contrat.save();
    console.log(`Approbation enregistrée pour le contrat: ${id}`);
    res.status(200).json({ message: 'Approbation enregistrée', data: contrat });
  } catch (err) {
    console.error('Erreur serveur:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur lors de l\'approbation' });
  }
});




router.post('/:id/approbation-entreprise', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { approuve, commentaire } = req.body;
    const userId = req.userId;

    // Validate userId
    if (!userId) {
      console.error('Erreur: userId non défini');
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`Erreur: userId invalide: ${userId}`);
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    // Validate contrat ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`Erreur: ID de contrat invalide: ${id}`);
      return res.status(400).json({ message: 'ID de contrat invalide' });
    }

    // Fetch contract with populated entreprise field
    const contrat = await Contrat.findById(id).populate('entreprise');
    if (!contrat) {
      console.error(`Erreur: Contrat non trouvé pour ID: ${id}`);
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }

    // Check if entreprise field is populated
    if (!contrat.entreprise || !contrat.entreprise._id) {
      console.error(`Erreur: Entreprise non définie pour le contrat: ${id}`);
      return res.status(400).json({ message: 'Entreprise non définie pour ce contrat' });
    }

    // Verify user authorization
    if (contrat.entreprise._id.toString() !== userId.toString()) {
      console.error(
        `Erreur: Accès non autorisé. userId: ${userId}, entrepriseId: ${contrat.entreprise._id}`
      );
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Update approval status
    contrat.approbationEntreprise = {
      approuve,
      date: new Date(),
      commentaire: commentaire || '',
    };

    // Update etat based on approvals
    if (contrat.approbationCandidat?.approuve === true && contrat.approbationEntreprise.approuve === true) {
      contrat.etat = "approuve";
    } else if (contrat.approbationCandidat?.approuve === true || contrat.approbationEntreprise.approuve === true) {
      contrat.etat = "approuve_partiellement";
    } else {
      contrat.etat = "en_attente_approbation";
    }

    await contrat.save();
    console.log(`Approbation enregistrée pour le contrat: ${id}`);
    res.status(200).json({ message: 'Approbation enregistrée', data: contrat });
  } catch (err) {
    console.error('Erreur serveur:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur lors de l\'approbation' });
  }
});


router.post('/:id/rejet-candidat', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire } = req.body;
    const userId = req.userId;

    // Validation userId
    if (!userId) {
      console.error(`[${new Date().toISOString()}] Erreur: userId non défini`);
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`[${new Date().toISOString()}] Erreur: userId invalide: ${userId}`);
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    // Validation contrat ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`[${new Date().toISOString()}] Erreur: ID de contrat invalide: ${id}`);
      return res.status(400).json({ message: 'ID de contrat invalide' });
    }

    // Récupérer le contrat avec user et entreprise populés
    const contrat = await Contrat.findById(id).populate('user entreprise');
    if (!contrat) {
      console.error(`[${new Date().toISOString()}] Erreur: Contrat non trouvé pour ID: ${id}`);
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }

    // Vérifier que user est populé
    if (!contrat.user || !contrat.user._id) {
      console.error(`[${new Date().toISOString()}] Erreur: Utilisateur non défini pour le contrat: ${id}`);
      return res.status(400).json({ message: 'Utilisateur non défini pour ce contrat' });
    }

    // Vérifier l'autorisation
    if (contrat.user._id.toString() !== userId.toString()) {
      console.error(
        `[${new Date().toISOString()}] Erreur: Accès non autorisé. userId: ${userId}, candidatId: ${contrat.user._id}`
      );
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Mettre à jour l'état d'approbation
    contrat.approbationCandidat = {
      approuve: false,
      date: new Date(),
      commentaire: commentaire || '',
    };

    contrat.etat = 'rejete';
    await contrat.save();
    console.log(`[${new Date().toISOString()}] Rejet candidat enregistré pour le contrat: ${id}`);

    // Trouver les admins
    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      console.error(`[${new Date().toISOString()}] Erreur: Profil "Admin" non trouvé`);
      return res.status(500).json({ message: 'Aucun profil administrateur trouvé' });
    }

    const adminsViaProfils = await Utilisateur.find({ profils: adminProfil._id });
    const adminsViaUsers = await Utilisateur.find({ _id: { $in: adminProfil.users || [] } });

    const admins = [...new Set([
      ...adminsViaProfils.map(admin => admin._id.toString()),
      ...adminsViaUsers.map(admin => admin._id.toString())
    ])].map(id => new mongoose.Types.ObjectId(id));

    if (admins.length === 0) {
      console.error(`[${new Date().toISOString()}] Erreur: Aucun utilisateur administrateur trouvé`);
      return res.status(500).json({ message: 'Aucun utilisateur administrateur trouvé' });
    }

    // Créer la notification pour le candidat (user_id)
    try {
      if (contrat.user && contrat.user._id) {
        const adminNotifications = admins.map(adminId => {
          const notification = new Notification({
            type: 'CONTRAT_REJETE_CANDIDAT',
            user_id: contrat.user._id, // Correction : user_id pour le candidat
            contrat: contrat._id,
            data: {
              commentaire: commentaire || '',
              candidatId: contrat.user._id,
              contratTitre: contrat.titre || 'Contrat sans titre',
            },
            read: false,
            adminId: adminId,
          });
          console.log(`[${new Date().toISOString()}] Création notification CONTRAT_REJETE_CANDIDAT pour utilisateur: ${contrat.user._id}, adminId: ${adminId}`);
          return notification.save();
        });

        await Promise.all(adminNotifications);
        console.log(`[${new Date().toISOString()}] Notifications CONTRAT_REJETE_CANDIDAT envoyées à ${admins.length} administrateurs`);
      } else {
        console.warn(`[${new Date().toISOString()}] Aucun utilisateur défini pour le contrat: ${id}, notification non créée`);
      }
    } catch (notificationErr) {
      console.error(`[${new Date().toISOString()}] Erreur lors de la création des notifications: ${notificationErr.message}`);
    }

    res.status(200).json({ message: 'Rejet enregistré', data: contrat });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erreur serveur:`, err);
    res.status(500).json({ message: err.message || 'Erreur serveur lors du rejet' });
  }
});

router.post('/:id/rejet-entreprise', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire } = req.body;
    const userId = req.userId;

    // Validation userId
    if (!userId) {
      console.error(`[${new Date().toISOString()}] Erreur: userId non défini`);
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`[${new Date().toISOString()}] Erreur: userId invalide: ${userId}`);
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    // Validation contrat ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`[${new Date().toISOString()}] Erreur: ID de contrat invalide: ${id}`);
      return res.status(400).json({ message: 'ID de contrat invalide' });
    }

    // Récupérer le contrat avec user et entreprise populés
    const contrat = await Contrat.findById(id).populate('user entreprise');
    if (!contrat) {
      console.error(`[${new Date().toISOString()}] Erreur: Contrat non trouvé pour ID: ${id}`);
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }

    // Vérifier que entreprise est populé
    if (!contrat.entreprise || !contrat.entreprise._id) {
      console.error(`[${new Date().toISOString()}] Erreur: Entreprise non définie pour le contrat: ${id}`);
      return res.status(400).json({ message: 'Entreprise non définie pour ce contrat' });
    }

    // Vérifier l'autorisation
    if (contrat.entreprise._id.toString() !== userId.toString()) {
      console.error(
        `[${new Date().toISOString()}] Erreur: Accès non autorisé. userId: ${userId}, entrepriseId: ${contrat.entreprise._id}`
      );
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Mettre à jour l'état d'approbation
    contrat.approbationEntreprise = {
      approuve: false,
      date: new Date(),
      commentaire: commentaire || '',
    };

    contrat.etat = 'rejete';
    await contrat.save();
    console.log(`[${new Date().toISOString()}] Rejet entreprise enregistré pour le contrat: ${id}`);

    // Trouver les admins
    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      console.error(`[${new Date().toISOString()}] Erreur: Profil "Admin" non trouvé`);
      return res.status(500).json({ message: 'Aucun profil administrateur trouvé' });
    }

    const adminsViaProfils = await Utilisateur.find({ profils: adminProfil._id });
    const adminsViaUsers = await Utilisateur.find({ _id: { $in: adminProfil.users || [] } });

    const admins = [...new Set([
      ...adminsViaProfils.map(admin => admin._id.toString()),
      ...adminsViaUsers.map(admin => admin._id.toString())
    ])].map(id => new mongoose.Types.ObjectId(id));

    if (admins.length === 0) {
      console.error(`[${new Date().toISOString()}] Erreur: Aucun utilisateur administrateur trouvé`);
      return res.status(500).json({ message: 'Aucun utilisateur administrateur trouvé' });
    }

    // Créer la notification pour l'entreprise (entreprise_id)
    try {
      if (contrat.entreprise && contrat.entreprise._id) {
        const adminNotifications = admins.map(adminId => {
          const notification = new Notification({
            type: 'CONTRAT_REJETE_ENTREPRISE',
            entreprise_id: contrat.entreprise._id, // Correction : entreprise_id pour l'entreprise
            contrat: contrat._id,
            data: {
              commentaire: commentaire || '',
              entrepriseId: contrat.entreprise._id,
              contratTitre: contrat.titre || 'Contrat sans titre',
            },
            read: false,
            adminId: adminId,
          });
          console.log(`[${new Date().toISOString()}] Création notification CONTRAT_REJETE_ENTREPRISE pour entreprise: ${contrat.entreprise._id}, adminId: ${adminId}`);
          return notification.save();
        });

        await Promise.all(adminNotifications);
        console.log(`[${new Date().toISOString()}] Notifications CONTRAT_REJETE_ENTREPRISE envoyées à ${admins.length} administrateurs`);
      } else {
        console.warn(`[${new Date().toISOString()}] Aucune entreprise définie pour le contrat: ${id}, notification non créée`);
      }
    } catch (notificationErr) {
      console.error(`[${new Date().toISOString()}] Erreur lors de la création des notifications: ${notificationErr.message}`);
    }

    res.status(200).json({ message: 'Rejet enregistré', data: contrat });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erreur serveur:`, err);
    res.status(500).json({ message: err.message || 'Erreur serveur lors du rejet' });
  }
});



// Vérifier l'état des signatures
router.get("/:id/signature-status", authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "ID invalide" });
  try {
    const contrat = await Contrat.findById(id).select(
      "signatureAdmin signatureEntreprise signatureCandidat estComplete etat dateSignature"
    );
    if (!contrat)
      return res.status(404).json({ success: false, message: "Contrat non trouvé" });

    const user = await Utilisateur.findById(req.userId).populate("profils");
    if (!user || !user.profils || user.profils.length === 0)
      return res.status(404).json({ success: false, message: "Utilisateur ou profil non trouvé" });

    const profileName = user.profils[0].name;
    let hasSigned = false;

    if (profileName === "Admin" && contrat.signatureAdmin?.user?.toString() === req.userId) {
      hasSigned = true;
    } else if (
      profileName === "Entreprise" &&
      contrat.signatureEntreprise?.user?.toString() === req.userId
    ) {
      hasSigned = true;
    } else if (
      profileName === "Candidat" &&
      contrat.signatureCandidat?.user?.toString() === req.userId
    ) {
      hasSigned = true;
    }

    const signatures = {
      Admin: !!contrat.signatureAdmin?.signature,
      Entreprise: !!contrat.signatureEntreprise?.signature,
      Candidat: !!contrat.signatureCandidat?.signature,
    };

    const pendingRoles = Object.entries(signatures)
      .filter(([_, signed]) => !signed)
      .map(([role]) => role);

    const signedRoles = Object.entries(signatures)
      .filter(([_, signed]) => signed)
      .map(([role]) => role);

    res.status(200).json({
      success: true,
      data: {
        hasSigned,
        signatures,
        pendingRoles,
        signedRoles,
        isComplete: contrat.estComplete,
        etat: contrat.etat,
        dateSignature: contrat.dateSignature,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de l'état des signatures:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

// Supprimer un contrat
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "ID invalide" });
  try {
    const deleted = await Contrat.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Contrat non trouvé" });
    res.status(200).json({ success: true, message: "Contrat supprimé" });
  } catch (error) {
    console.error("Erreur lors de la suppression du contrat:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

// Ajout d'un avenant
router.post("/:id/avenants", authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "ID invalide" });
  try {
    const contrat = await Contrat.findById(id);
    if (!contrat) return res.status(404).json({ success: false, message: "Contrat non trouvé" });

    const newAvenant = new Avenant({
      ...req.body,
      contrat: id,
      createdBy: req.userId,
      lastModifiedBy: req.userId,
    });
    const savedAvenant = await newAvenant.save();

    contrat.avenants.push(savedAvenant._id);
    await contrat.save();

    const updatedContrat = await Contrat.findById(id)
      .populate("user", "nom prenom email")
      .populate("entreprise", "nomEntreprise adresseEntreprise")
      .populate("offre", "titre")
      .populate("missions")
      .populate("avenants")
      .populate("articles");

    res.status(201).json({
      success: true,
      message: "Avenant ajouté avec succès",
      data: updatedContrat,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'avenant:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur du serveur", error: error.message });
  }
});

// Mettre à jour le PDF
router.put("/:id/update-pdf", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { pdfData } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "ID invalide" });
  if (!pdfData || !isValidPDFDataURL(pdfData))
    return res.status(400).json({ success: false, message: "Données PDF invalides" });

  try {
    const contrat = await Contrat.findById(id);
    if (!contrat)
      return res.status(404).json({ success: false, message: "Contrat non trouvé" });
    if (!contrat.published)
      return res.status(400).json({ success: false, message: "Le contrat n'est pas publié" });

    const user = await Utilisateur.findById(req.userId).populate("profils");
    if (!user || !user.profils || user.profils.length === 0)
      return res.status(404).json({ success: false, message: "Utilisateur ou profil non trouvé" });

    const profileName = user.profils[0].name.toLowerCase();
    const validRoles = ["admin", "entreprise", "candidat"];
    if (!validRoles.includes(profileName))
      return res.status(403).json({ success: false, message: "Rôle non autorisé" });

    contrat.pdfPath = pdfData;
    contrat.lastModifiedBy = req.userId;
    await contrat.save();

    const updatedContrat = await Contrat.findById(id)
      .populate("user", "nom prenom email")
      .populate("entreprise", "nomEntreprise adresseEntreprise")
      .populate("offre", "titre")
      .populate("articles");

    res.status(200).json({
      success: true,
      message: "PDF mis à jour avec succès",
      data: updatedContrat,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du PDF:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

// Récupérer les pointages liés à un contrat
router.get("/:contratId/pointages", authMiddleware, async (req, res) => {
  try {
    const { contratId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contratId))
      return res.status(400).json({ success: false, message: "ID de contrat invalide" });

    const exists = await Contrat.exists({ _id: contratId });
    if (!exists)
      return res.status(404).json({ success: false, message: "Contrat non trouvé" });

    const pointages = await Pointage.find({ contrat: contratId })
      .populate("utilisateur", "nom prenom email")
      .select("statut utilisateur contrat pointages absences mois_valides createdAt updatedAt");

    res.status(200).json({ success: true, count: pointages.length, data: pointages });
  } catch (error) {
    console.error("Erreur lors de la récupération des pointages:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

// Ajouter une signature

router.post("/:id/signature", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { signature, role, pdfData, signaturePosition } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "ID invalide" });
  if (!signature || !isValidDataURL(signature))
    return res.status(400).json({ success: false, message: "Signature invalide" });
  if (!role || !["admin", "entreprise", "candidat"].includes(role.toLowerCase()))
    return res.status(400).json({ success: false, message: "Rôle invalide" });
  if (!pdfData || !isValidPDFDataURL(pdfData))
    return res.status(400).json({ success: false, message: "Données PDF invalides" });

  try {
    const contrat = await Contrat.findById(id).populate("entreprise", "_id nomEntreprise");
    if (!contrat)
      return res.status(404).json({ success: false, message: "Contrat non trouvé" });

    // Vérifier les approbations avant de permettre la signature
    if (!contrat.approbationCandidat?.approuve || !contrat.approbationEntreprise?.approuve) {
      return res.status(400).json({
        success: false,
        message: "Les approbations du candidat et de l’entreprise sont requises avant la signature",
      });
    }

    const user = await Utilisateur.findById(req.userId).populate("profils");
    if (!user || !user.profils || user.profils.length === 0)
      return res.status(404).json({ success: false, message: "Utilisateur ou profil non trouvé" });

    const profileName = user.profils[0].name.toLowerCase();
    if (profileName !== role.toLowerCase())
      return res.status(403).json({ success: false, message: "Rôle non autorisé pour signer" });

    const signatureField = `signature${role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}`;
    if (contrat[signatureField]?.signature)
      return res.status(400).json({ success: false, message: `Signature ${role} déjà enregistrée` });

    // Mettre à jour l'état à "approuve" si les deux approbations sont true
    if (contrat.approbationCandidat.approuve && contrat.approbationEntreprise.approuve) {
      contrat.etat = "approuve";
    }

    contrat[signatureField] = {
      user: req.userId,
      signature,
      date: new Date(),
    };

    try {
      const { x = 50, y = 50, width = 150, height = 50, page = -1 } = signaturePosition || {};
      const pdfBase64 = pdfData.replace(/^data:application\/pdf;base64,/, "");
      const pdfBytes = Buffer.from(pdfBase64, "base64");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const signatureBase64 = signature.replace(/^data:image\/png;base64,/, "");
      const signatureBytes = Buffer.from(signatureBase64, "base64");
      const signatureImage = await pdfDoc.embedPng(signatureBytes);
      const pages = pdfDoc.getPages();
      const targetPage = page === -1 ? pages[pages.length - 1] : pages[page];
      if (!targetPage) {
        return res.status(400).json({ success: false, message: "Page invalide" });
      }
      targetPage.drawImage(signatureImage, { x, y, width, height });
      const updatedPdfBytes = await pdfDoc.save();
      const updatedPdfBase64 = Buffer.from(updatedPdfBytes).toString("base64");
      contrat.pdfPath = `data:application/pdf;base64,${updatedPdfBase64}`;
    } catch (pdfError) {
      console.error("Erreur lors de la manipulation du PDF:", pdfError.message, pdfError.stack);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de l'ajout de la signature au PDF",
        error: pdfError.message,
      });
    }

    // Vérifier si toutes les signatures sont présentes
    const allSigned =
      contrat.signatureAdmin?.signature &&
      contrat.signatureEntreprise?.signature &&
      contrat.signatureCandidat?.signature;

    if (allSigned) {
      contrat.etat = "signé";
      contrat.estComplete = true;
      contrat.dateSignature = new Date();
    }

    contrat.lastModifiedBy = req.userId;
    await contrat.save();

    const populatedContrat = await Contrat.findById(id)
      .populate("user", "nom prenom email")
      .populate("entreprise", "nomEntreprise adresseEntreprise")
      .populate("offre", "titre")
      .populate("articles");

    res.status(200).json({
      success: true,
      message: "Signature enregistrée et PDF mis à jour avec succès",
      contrat: populatedContrat,
    });
  } catch (error) {
    console.error("Erreur lors de la signature du contrat:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});
// Publier un contrat
router.put("/:id/publier", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { pdfData } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "ID invalide" });
  }

  if (!pdfData || !isValidPDFDataURL(pdfData)) {
    return res.status(400).json({ success: false, message: "Données PDF invalides" });
  }

  try {
    const user = await Utilisateur.findById(req.userId).populate("profils");
    if (!user || !user.profils.some((profil) => profil.name === "Admin")) {
      return res.status(403).json({ success: false, message: "Accès refusé : droits admin requis" });
    }

    const contrat = await Contrat.findById(id)
      .populate("entreprise", "_id nomEntreprise")
      .populate("user", "_id nom prenom")
      .populate("offre", "titre")
      .populate("articles");

    if (!contrat) {
      return res.status(404).json({ success: false, message: "Contrat non trouvé" });
    }

    if (contrat.published) {
      return res.status(400).json({ success: false, message: "Contrat déjà publié" });
    }

    contrat.pdfPath = pdfData;
    contrat.published = true;
    contrat.lastModifiedBy = req.userId;
    await contrat.save();

    const notificationBase = {
      type: "CONTRAT_PUBLIE",
      contrat: contrat._id,
      read: false,
      data: {
        action: "publication",
        contratId: contrat._id,
        titre: contrat.titre,
        date: new Date(),
        admin_id: req.userId,
      },
    };

    if (contrat.user?._id) {
      await Notification.create({
        ...notificationBase,
        user_id: contrat.user._id,
        entreprise_id: null,
        data: {
          ...notificationBase.data,
          message: `Votre contrat "${contrat.titre}" avec ${contrat.entreprise?.nomEntreprise || "l'entreprise"} est maintenant actif.`,
        },
      });
    }

    if (contrat.entreprise?._id) {
      await Notification.create({
        ...notificationBase,
        user_id: null,
        entreprise_id: contrat.entreprise._id,
        data: {
          ...notificationBase.data,
          message: `Votre contrat "${contrat.titre}" avec ${contrat.user?.nom || "le candidat"} est maintenant actif.`,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Contrat publié avec succès",
      data: {
        ...contrat.toObject(),
        isPublished: true,
      },
    });
  } catch (error) {
    console.error("Erreur publication contrat:", {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      contractId: id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      success: false,
      message: "Échec de la publication",
      error: error.message,
      validationErrors: error.errors || null,
    });
  }
});

router.get("/entreprise/publies", authMiddleware, async (req, res) => {
  try {
    const entrepriseId = req.userId;

    const contrats = await Contrat.aggregate([
      {
        $match: {
          entreprise: new mongoose.Types.ObjectId(entrepriseId),
          published: true,
        },
      },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "entreprise",
          foreignField: "_id",
          as: "entrepriseData",
        },
      },
      {
        $lookup: {
          from: "offres",
          localField: "offre",
          foreignField: "_id",
          as: "offreData",
        },
      },
      {
        $lookup: {
          from: "missions",
          localField: "missions",
          foreignField: "_id",
          as: "missions",
        },
      },
      {
        $lookup: {
          from: "articles",
          localField: "articles",
          foreignField: "_id",
          as: "articles",
        },
      },
      {
        $lookup: {
          from: "avenants",
          localField: "_id",
          foreignField: "contrat",
          as: "avenants",
        },
      },
      {
        $addFields: {
          articles: {
            $sortArray: {
              input: "$articles",
              sortBy: { order: 1, createdAt: 1 },
            },
          },
          avenants: {
            $sortArray: {
              input: "$avenants",
              sortBy: { createdAt: 1 },
            },
          },
        },
      },
      {
        $project: {
          titre: 1,
          typeContrat: 1,
          user: { $arrayElemAt: ["$userData", 0] },
          entreprise: {
            $cond: {
              if: { $gt: [{ $size: "$entrepriseData" }, 0] },
              then: {
                $mergeObjects: [
                  { _id: { $arrayElemAt: ["$entrepriseData._id", 0] } },
                  {
                    nomEntreprise: { $arrayElemAt: ["$entrepriseData.nomEntreprise", 0] },
                    adresseEntreprise: { $arrayElemAt: ["$entrepriseData.adresseEntreprise", 0] },
                  },
                ],
              },
              else: null,
            },
          },
          offre: { $arrayElemAt: ["$offreData", 0] },
          articles: 1,
          avenants: 1,
          fichesDePaie: 1,
          pointages: 1,
          dateDebut: 1,
          dateFin: 1,
          intitulePoste: 1,
          missions: 1,
          tempsTravail: 1,
          salaire: 1,
          modalitesPaiement: 1,
          estComplete: 1,
          etat: 1,
          createdBy: 1,
          lastModifiedBy: 1,
          createdAt: 1,
          updatedAt: 1,
          pdfPath: 1,
          published: 1,
          signatureAdmin: 1,
          signatureEntreprise: 1,
          signatureCandidat: 1,
          approbationCandidat: 1,
          approbationEntreprise: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, count: contrats.length, data: contrats });
  } catch (error) {
    console.error("Erreur lors de la récupération des contrats publiés:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

router.get("/candidat/publies", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const contrats = await Contrat.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          published: true,
        },
      },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "entreprise",
          foreignField: "_id",
          as: "entrepriseData",
        },
      },
      {
        $lookup: {
          from: "utilisateurs",
          localField: "signatureAdmin.user",
          foreignField: "_id",
          as: "adminSignataireData",
        },
      },
      {
        $lookup: {
          from: "offres",
          localField: "offre",
          foreignField: "_id",
          as: "offreData",
        },
      },
      {
        $lookup: {
          from: "missions",
          localField: "missions",
          foreignField: "_id",
          as: "missions",
        },
      },
      {
        $lookup: {
          from: "articles",
          localField: "articles",
          foreignField: "_id",
          as: "articles",
        },
      },
      {
        $lookup: {
          from: "avenants",
          localField: "_id",
          foreignField: "contrat",
          as: "avenants",
        },
      },
      {
        $addFields: {
          articles: {
            $sortArray: {
              input: "$articles",
              sortBy: { order: 1, createdAt: 1 },
            },
          },
          avenants: {
            $sortArray: {
              input: "$avenants",
              sortBy: { createdAt: 1 },
            },
          },
        },
      },
      {
        $project: {
          titre: 1,
          typeContrat: 1,
          user: { $arrayElemAt: ["$userData", 0] },
          entreprise: {
            $cond: {
              if: { $gt: [{ $size: "$entrepriseData" }, 0] },
              then: {
                $mergeObjects: [
                  { _id: { $arrayElemAt: ["$entrepriseData._id", 0] } },
                  {
                    nomEntreprise: { $arrayElemAt: ["$entrepriseData.nomEntreprise", 0] },
                    adresseEntreprise: { $arrayElemAt: ["$entrepriseData.adresseEntreprise", 0] },
                  },
                ],
              },
              else: null,
            },
          },
          signatureAdmin: {
            user: { $arrayElemAt: ["$adminSignataireData", 0] },
            date: 1,
            signature: 1,
          },
          signatureEntreprise: 1,
          signatureCandidat: 1,
          approbationCandidat: 1,
          approbationEntreprise: 1,
          offre: { $arrayElemAt: ["$offreData", 0] },
          articles: 1,
          avenants: 1,
          fichesDePaie: 1,
          pointages: 1,
          dateDebut: 1,
          dateFin: 1,
          intitulePoste: 1,
          missions: 1,
          tempsTravail: 1,
          salaire: 1,
          modalitesPaiement: 1,
          estComplete: 1,
          etat: 1,
          createdBy: 1,
          lastModifiedBy: 1,
          createdAt: 1,
          updatedAt: 1,
          pdfPath: 1,
          published: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, count: contrats.length, data: contrats });
  } catch (error) {
    console.error("Erreur lors de la récupération des contrats publiés:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;