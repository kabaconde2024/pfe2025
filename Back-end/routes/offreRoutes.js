const express = require("express");
const router = express.Router();
const Offre = require("../models/Offre");
const isAuthenticated = require("../middlewares/auth");
const Candidature = require("../models/Candidature");
const Utilisateur = require('../models/Utilisateur');
const mongoose = require("mongoose"); 
const { isValidObjectId } = mongoose;
const ProfilCv = require("../models/ProfilCv");
const Notification = require('../models/Notification'); // Importez le modèle Notification
const { ObjectId } = mongoose.Types; // Ajoutez cette ligne pour éviter l'erreur

router.post('/creer', isAuthenticated, async (req, res) => {
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  
  try {
      // 1. Validation de l'ID utilisateur
      const userId = req.userId;
      
      if (!isValidObjectId(userId)) {
          console.error("ID utilisateur invalide:", userId);
          return res.status(400).json({ message: "ID utilisateur invalide." });
      }

      // 2. Vérification de l'existence de l'utilisateur et récupération des profils
      const utilisateur = await Utilisateur.findById(userId).populate('profils').lean();
      
      if (!utilisateur) {
          console.warn("Utilisateur non trouvé:", userId);
          return res.status(404).json({ message: "Utilisateur non trouvé." });
      }

      // Vérifiez si l'utilisateur a des profils
      if (!utilisateur.profils || utilisateur.profils.length === 0) {
          console.warn("Aucun profil associé à l'utilisateur:", userId);
          return res.status(403).json({ message: "L'utilisateur doit avoir un profil pour créer des offres." });
      }

      // 3. Filtrer le profil avec le nom "Entreprise"
      const profilEntreprise = utilisateur.profils.find(profil => profil.name === "Entreprise");

      if (!profilEntreprise) {
          console.warn("L'utilisateur n'a pas de profil d'entreprise:", userId);
          return res.status(403).json({ message: "Seules les entreprises peuvent créer des offres." });
      }

      // 4. Validation des champs obligatoires
      const requiredFields = [
          'titre', 'metier', 'nombrePostes', 'typeEmploi', 'adresse', 
          'ville', 'codePostal', 'responsabilite', 'competencesRequises',
          'remuneration', 'description', 'dateExpiration'
      ];
      
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
          console.warn("Champs manquants:", missingFields);
          return res.status(400).json({ 
              message: "Tous les champs obligatoires doivent être remplis.",
              missingFields 
          });
      }

      // 5. Validation de la date d'expiration
      const dateExpiration = new Date(req.body.dateExpiration);
      if (isNaN(dateExpiration.getTime()) || dateExpiration < new Date()) {
          console.warn("Date d'expiration invalide:", req.body.dateExpiration);
          return res.status(400).json({ message: "La date d'expiration doit être une date future valide." });
      }

      // 6. Création de la nouvelle offre avec validation stricte
      const nouvelleOffre = new Offre({
          titre: req.body.titre,
          metier: req.body.metier,
          nombrePostes: Number(req.body.nombrePostes),
          typeEmploi: req.body.typeEmploi,
          adresse: req.body.adresse,
          ville: req.body.ville,
          codePostal: req.body.codePostal,
          responsabilite: req.body.responsabilite,
          competencesRequises: Array.isArray(req.body.competencesRequises) 
              ? req.body.competencesRequises 
              : [req.body.competencesRequises],
          remuneration: req.body.remuneration,
          description: req.body.description,
          commentPostuler: req.body.commentPostuler, // Will use schema default if undefined
          dateExpiration: dateExpiration,
          entreprise: userId,
          status: req.body.status || "brouillon"
      });

      // 7. Validation supplémentaire avant sauvegarde
      try {
          await nouvelleOffre.validate();
      } catch (validationError) {
          console.error("Erreur de validation:", validationError);
          return res.status(400).json({ 
              message: "Données de l'offre invalides",
              errors: validationError.errors 
          });
      }

      // 8. Sauvegarde avec vérification
      const offreSauvegardee = await nouvelleOffre.save();
      
      console.log("Offre créée avec succès:", {
          _id: offreSauvegardee._id,
          entreprise: offreSauvegardee.entreprise,
          titre: offreSauvegardee.titre
      });

      res.status(201).json({
          message: "Offre créée avec succès !",
          offre: {
              ...offreSauvegardee.toObject(),
              entreprise: {
                  _id: utilisateur._id,
                  nom: utilisateur.nom,
                  nomEntreprise: utilisateur.nomEntreprise,
                  profil: {
                      _id: profilEntreprise._id,
                      name: profilEntreprise.name
                  }
              }
          }
      });

  } catch (error) {
      console.error("Erreur lors de la création de l'offre:", error);
      res.status(500).json({ 
          message: "Erreur serveur, veuillez réessayer.",
          error: error.message 
      });
  }
});

router.get('/entreprise', isAuthenticated, async (req, res) => {
  try {
    // Fetch offers where entreprise matches req.userId
    const offres = await Offre.find({ entreprise: req.userId });
    console.log('Offres renvoyées:', offres); // Log for debugging
    res.json(offres);
  } catch (err) {
    console.error('Erreur lors de la récupération des offres:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/:id/validate', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaireValidation } = req.body;

    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = utilisateur.profils.some(profil => profil.name === 'Admin');
    if (!isAdmin) {
      return res.status(403).json({
        message: "Accès refusé. Seuls les administrateurs peuvent valider une offre."
      });
    }

    const offre = await Offre.findById(id);
    if (!offre) {
      return res.status(404).json({
        message: "Offre non trouvée."
      });
    }

    if (offre.estValidé) {
      return res.status(400).json({
        message: "Cette offre est déjà validée."
      });
    }

    offre.estValidé = true;
    if (commentaireValidation) {
      offre.commentaireValidation = commentaireValidation;
    }
    await offre.save();

    res.status(200).json({
      message: "Offre validée avec succès !",
      offre
    });
  } catch (error) {
    console.error("Erreur lors de la validation de l'offre:", error);
    res.status(500).json({
      message: "Erreur serveur, veuillez réessayer.",
      error: error.message
    });
  }
});

router.put('/:id/reject', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si l'utilisateur est admin
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = utilisateur.profils.some(profil => profil.name === 'Admin');
    if (!isAdmin) {
      return res.status(403).json({
        message: "Accès refusé. Seuls les administrateurs peuvent rejeter une offre."
      });
    }

    // Trouver l'offre
    const offre = await Offre.findById(id);
    if (!offre) {
      return res.status(404).json({
        message: "Offre non trouvée."
      });
    }

    // Vérifier si l'offre est déjà validée ou rejetée
    if (offre.estValidé) {
      return res.status(400).json({
        message: "Cette offre est déjà validée."
      });
    }
    if (offre.status === 'rejeté') {
      return res.status(400).json({
        message: "Cette offre est déjà rejetée."
      });
    }

    // Mettre à jour l'offre
    offre.status = 'rejeté';
    await offre.save();

    // Créer une notification pour l'entreprise
    const notification = new Notification({
      entreprise_id: offre.entreprise, // Utiliser entreprise_id au lieu de utilisateur
      type: 'offre_rejetée',
      data: { message: `Votre offre "${offre.titre}" a été rejetée par l'administrateur.` }, // Fournir data
      offre_id: offre._id, // Utiliser offre_id au lieu de offre
      read: false
    });
    await notification.save();

    res.status(200).json({
      message: "Offre rejetée avec succès !",
      offre
    });
  } catch (error) {
    console.error("Erreur lors du rejet de l'offre:", error);
    res.status(500).json({
      message: "Erreur serveur, veuillez réessayer.",
      error: error.message
    });
  }
});


router.get("/closed/stats", isAuthenticated, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    const utilisateur = await Utilisateur.findById(req.userId).populate("profils");
    const isAdmin = utilisateur.profils.some((profil) => profil.name === "Admin");
    if (!isAdmin) {
      return res.status(403).json({
        message: "Accès refusé. Seuls les administrateurs peuvent accéder aux statistiques.",
        code: "FORBIDDEN",
      });
    }

    const now = new Date();

    // Récupérer les offres clôturées (dateExpiration < maintenant OU status = "rejeté")
    const offresCloturees = await Offre.find({
      $or: [
        { dateExpiration: { $lt: now } },
        { status: "rejeté" },
      ],
    })
      .populate("entreprise", "nom nomEntreprise")
      .lean();

    // Nombre total d'offres clôturées
    const totalOffres = offresCloturees.length;

    // Répartition par raison de clôture (expirée ou rejetée)
    const repartitionRaison = await Offre.aggregate([
      {
        $match: {
          $or: [
            { dateExpiration: { $lt: now } },
            { status: "rejeté" },
          ],
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$status", "rejeté"] },
              "rejeté",
              "expiré",
            ],
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          raison: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Évolution des offres clôturées par mois
    const evolutionParMois = await Offre.aggregate([
      {
        $match: {
          $or: [
            { dateExpiration: { $lt: now } },
            { status: "rejeté" },
          ],
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$dateExpiration" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          mois: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Répartition par type d'emploi
    const repartitionTypeEmploi = await Offre.aggregate([
      {
        $match: {
          $or: [
            { dateExpiration: { $lt: now } },
            { status: "rejeté" },
          ],
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$typeEmploi", "Non spécifié"] },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          type: "$_id",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Nombre moyen de candidatures par offre clôturée
    const candidaturesStats = await Offre.aggregate([
      {
        $match: {
          $or: [
            { dateExpiration: { $lt: now } },
            { status: "rejeté" },
          ],
        },
      },
      {
        $lookup: {
          from: "candidatures",
          localField: "_id",
          foreignField: "offre",
          as: "candidatures",
        },
      },
      {
        $group: {
          _id: null,
          totalCandidatures: { $sum: { $size: "$candidatures" } },
          totalOffres: { $sum: 1 },
        },
      },
      {
        $project: {
          moyenneCandidatures: {
            $cond: [
              { $eq: ["$totalOffres", 0] },
              0,
              { $divide: ["$totalCandidatures", "$totalOffres"] },
            ],
          },
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      totalOffres,
      offres: offresCloturees,
      repartitionRaison,
      evolutionParMois,
      repartitionTypeEmploi,
      moyenneCandidatures: candidaturesStats[0]?.moyenneCandidatures || 0,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques des offres clôturées:", error);
    res.status(500).json({
      message: "Erreur serveur, veuillez réessayer.",
      error: error.message,
    });
  }
});

router.get('/validated', isAuthenticated, async (req, res) => {
  try {
    const offres = await Offre.find({ estValidé: true }).lean();
    res.status(200).json(offres);
  } catch (error) {
    console.error("Erreur lors de la récupération des offres validées:", error);
    res.status(500).json({
      message: "Erreur serveur, veuillez réessayer.",
      error: error.message
    });
  }
});


router.put('/publiées/en-attente', isAuthenticated, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = utilisateur.profils.some(profil => profil.name === 'Admin');

    if (!isAdmin) {
      return res.status(403).json({
        message: "Accès refusé. Seuls les administrateurs peuvent effectuer cette action."
      });
    }

    // Mettre à jour toutes les offres ayant le statut "publié" en "en attente de validation"
    const result = await Offre.updateMany(
      { status: 'publié' },
      { $set: { status: 'en attente de validation' } }
    );

    // Vérifier si des offres ont été mises à jour
    if (result.modifiedCount === 0) {
      return res.status(404).json({
        message: "Aucune offre publiée n'a été trouvée pour la mise à jour."
      });
    }

    res.status(200).json({
      message: `${result.modifiedCount} offre(s) mise(s) à jour en 'en attente de validation' avec succès !`
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des offres publiées:", error);
    res.status(500).json({
      message: "Erreur serveur, veuillez réessayer.",
      error: error.message
    });
  }
});


router.get('/published', isAuthenticated, async (req, res) => {
  try {
    const offres = await Offre.find({ 
      status: 'publié',
      estValidé: false 
    })
      .sort({ createdAt: -1 })
      .lean();

    // Récupérer tous les ID d'entreprises uniques
    const entreprisesIds = [...new Set(offres.map(o => o.entreprise))];
    
    // Récupérer les entreprises correspondantes
    const entreprises = await Utilisateur.find(
      { _id: { $in: entreprisesIds } },
      'nom nomEntreprise adresseEntreprise telephoneEntreprise paysEntreprise'
    ).lean();

    // Créer un map pour un accès rapide aux infos entreprise
    const entreprisesMap = entreprises.reduce((map, entreprise) => {
      map[entreprise._id.toString()] = {
        id: entreprise._id.toString(),
        nom: entreprise.nom,
        nomEntreprise: entreprise.nomEntreprise || 'Non spécifié',
        adresseEntreprise: entreprise.adresseEntreprise || '',
        telephoneEntreprise: entreprise.telephoneEntreprise || '',
        paysEntreprise: entreprise.paysEntreprise || ''
      };
      return map;
    }, {});

    // Fusionner les données
    const offresFormatees = offres.map(offre => {
      const entrepriseInfo = entreprisesMap[offre.entreprise.toString()] || {
        id: null,
        nom: 'Inconnu',
        nomEntreprise: 'Entreprise inconnue',
        adresseEntreprise: '',
        telephoneEntreprise: '',
        paysEntreprise: ''
      };

      return {
        ...offre,
        entreprise: entrepriseInfo,
        metier: offre.metier || 'Non spécifié',
        ville: offre.ville || 'Non spécifié',
        dateExpiration: offre.dateExpiration || new Date()
      };
    });

    res.status(200).json(offresFormatees);
  } catch (error) {
    console.error("Erreur lors de la récupération des offres publiées non validées:", error);
    res.status(500).json({
      message: "Erreur serveur, veuillez réessayer.",
      error: error.message
    });
  }
});

// Route pour récupérer le nombre total d'offres actives
router.get('/active/count', isAuthenticated, async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    const adminUser = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = adminUser.profils.some(profil => profil.name === 'Admin');
    
    if (!isAdmin) {
      return res.status(403).json({ 
        message: "Accès refusé. Seuls les administrateurs peuvent accéder à cette statistique." 
      });
    }

    const currentDate = new Date();
    const totalActiveOffers = await Offre.countDocuments({
      status: 'publié',
      dateExpiration: { $gt: currentDate },
    });
    res.status(200).json({ totalActiveOffers });
  } catch (error) {
    console.error("Erreur lors de la récupération du nombre d'offres actives :", error);
    res.status(500).json({ message: "Erreur serveur, veuillez réessayer." });
  }
});

router.get("/utilisateur/mes-offres", isAuthenticated, async (req, res) => {
    try {
        const userId = req.userId;
        const utilisateur = await Utilisateur.findById(userId).select('nomEntreprise email').lean();

        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        const offres = await Offre.find({ entreprise: userId })
            .populate({
                path: 'entreprise',
                select: 'nom nomEntreprise email' // Inclure les champs nécessaires
            })
            .populate({
                path: 'candidatures',
                populate: {
                    path: 'candidat',
                    select: 'nom email telephone nomEntreprise'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        const offresFormatees = offres.map(offre => ({
            ...offre,
            metier: offre.metier || 'Non spécifié',
            remuneration: offre.remuneration || 0,
            ville: offre.ville || 'Non spécifié',
            dateExpiration: offre.dateExpiration || new Date(),
            candidatures: offre.candidatures?.length || 0,
            entreprise: {
                ...offre.entreprise,
                nomEntreprise: offre.entreprise?.nomEntreprise || 'Non spécifié' // Gestion des cas où nomEntreprise est absent
            }
        }));

        res.status(200).json(offresFormatees);
    } catch (error) {
        console.error("Erreur:", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
});

const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};
  
router.get("/search", async (req, res) => {
    try {
        const searchTerm = req.query.term;
        let query = {};
  
        if (searchTerm && searchTerm.trim()) {
            const escapedTerm = escapeRegex(searchTerm.trim());
            const searchRegex = new RegExp(escapedTerm, "i");
  
            query = {
                $or: [
                    { titre: searchRegex },
                    { typeEmploi: searchRegex },
                    { adresse: searchRegex },
                    { ville: searchRegex },
                    { codePostal: searchRegex },
                    { responsabilite: searchRegex },
                    { competencesRequises: searchRegex },
                    { remuneration: searchRegex },
                    { description: searchRegex },
                    { commentPostuler: searchRegex }
                ]
            };
  
            console.log("Search query:", JSON.stringify(query, null, 2));
        }
  
        const offres = await Offre.find(query)
            .populate("entreprise", "nom email")
            .sort({ createdAt: -1 })
            .lean();
  
        console.log("Résultats trouvés:", offres.length);
        res.status(200).json(offres);
  
    } catch (error) {
        console.error("ERREUR COMPLÈTE:", error);
        res.status(500).json({ 
            message: "Erreur serveur",
            error: error.message,
            stack: error.stack 
        });
    }
});

router.get('/', async (req, res) => {
    try {
        // 1. Récupérer toutes les offres publiées (sans populate)
        const offres = await Offre.find({ status: 'publié' })
            .sort({ createdAt: -1 })
            .lean();

        // 2. Récupérer tous les ID d'entreprises uniques
        const entreprisesIds = [...new Set(offres.map(o => o.entreprise))];
        
        // 3. Récupérer les entreprises correspondantes
        const entreprises = await Utilisateur.find(
            { _id: { $in: entreprisesIds } },
            'nom nomEntreprise adresseEntreprise telephoneEntreprise paysEntreprise'
        ).lean();

        // 4. Créer un map pour un accès rapide aux infos entreprise
        const entreprisesMap = entreprises.reduce((map, entreprise) => {
            map[entreprise._id.toString()] = {
                id: entreprise._id.toString(), // Ajout de l'ID
                nom: entreprise.nom,
                nomEntreprise: entreprise.nomEntreprise || 'Non spécifié',
                adresseEntreprise: entreprise.adresseEntreprise || '',
                telephoneEntreprise: entreprise.telephoneEntreprise || '',
                paysEntreprise: entreprise.paysEntreprise || ''
            };
            return map;
        }, {});

        // 5. Fusionner les données
        const offresFormatees = offres.map(offre => {
            const entrepriseInfo = entreprisesMap[offre.entreprise.toString()] || {
                id: null, // ID nul si l'entreprise n'est pas trouvée
                nom: 'Inconnu',
                nomEntreprise: 'Entreprise inconnue',
                adresseEntreprise: '',
                telephoneEntreprise: '',
                paysEntreprise: ''
            };

            return {
                ...offre,
                entreprise: entrepriseInfo, // Contenant l'ID et autres infos
                metier: offre.metier || 'Non spécifié',
                ville: offre.ville || 'Non spécifié',
                dateExpiration: offre.dateExpiration || new Date()
            };
        });

        res.status(200).json(offresFormatees);
    } catch (error) {
        console.error('Erreur lors de la récupération des offres:', error);
        res.status(500).json({ 
            message: 'Erreur serveur',
            error: error.message 
        });
    }
});

router.get('/listes-publiees', isAuthenticated, async (req, res) => {
  try {
    console.log("Fetching validated published offers for user:", req.userId);
    const offres = await Offre.find({ 
      status: 'publié',
      estValidé: true 
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log("Found offers:", offres.map(o => ({
      _id: o._id,
      titre: o.titre,
      status: o.status,
      estValidé: o.estValidé
    })));

    // Récupérer tous les ID d'entreprises uniques
    const entreprisesIds = [...new Set(offres.map(o => o.entreprise))];
    
    // Récupérer les entreprises correspondantes
    const entreprises = await Utilisateur.find(
      { _id: { $in: entreprisesIds } },
      'nom nomEntreprise adresseEntreprise telephoneEntreprise paysEntreprise'
    ).lean();

    // Créer un map pour un accès rapide aux infos entreprise
    const entreprisesMap = entreprises.reduce((map, entreprise) => {
      map[entreprise._id.toString()] = {
        id: entreprise._id.toString(),
        nom: entreprise.nom,
        nomEntreprise: entreprise.nomEntreprise || 'Non spécifié',
        adresseEntreprise: entreprise.adresseEntreprise || '',
        telephoneEntreprise: entreprise.telephoneEntreprise || '',
        paysEntreprise: entreprise.paysEntreprise || ''
      };
      return map;
    }, {});

    // Fusionner les données
    const offresFormatees = offres.map(offre => {
      const entrepriseInfo = entreprisesMap[offre.entreprise.toString()] || {
        id: null,
        nom: 'Inconnu',
        nomEntreprise: 'Entreprise inconnue',
        adresseEntreprise: '',
        telephoneEntreprise: '',
        paysEntreprise: ''
      };

      return {
        ...offre,
        entreprise: entrepriseInfo,
        metier: offre.metier || 'Non spécifié',
        ville: offre.ville || 'Non spécifié',
        dateExpiration: offre.dateExpiration || new Date()
      };
    });

    res.status(200).json(offresFormatees);
  } catch (error) {
    console.error("Erreur lors de la récupération des offres publiées validées:", error);
    res.status(500).json({
      message: "Erreur serveur, veuillez réessayer.",
      error: error.message
    });
  }
});


// Incrémentation des consultations d'une offre
router.put("/:id/consultations", isAuthenticated, async (req, res) => {
    try {
        const offreId = req.params.id;

        const offre = await Offre.findById(offreId);
        if (!offre) {
            return res.status(404).json({ message: "Offre non trouvée." });
        }

        offre.nbConsultations += 1;
        await offre.save();

        res.status(200).json({ nbConsultations: offre.nbConsultations });
    } catch (error) {
        console.error("Erreur lors de la mise à jour des consultations:", error);
        res.status(500).json({ message: "Une erreur est survenue lors de la mise à jour des consultations." });
    }
});
router.get("/statistiques/consultations", isAuthenticated, async (req, res) => {
    try {
        const { range } = req.query;
        const userId = req.userId;

        // Validate range parameter
        const validRanges = ["7days", "30days", "90days", "all"];
        if (!validRanges.includes(range)) {
            return res.status(400).json({
                message: "Période invalide. Utilisez 7days, 30days, 90days ou all.",
                code: "INVALID_RANGE",
            });
        }

        // Validate user ID
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "ID utilisateur invalide", code: "INVALID_USER_ID" });
        }

        // Check if user is an enterprise
        const utilisateur = await Utilisateur.findById(userId);
        if (!utilisateur || !utilisateur.nomEntreprise) {
            return res.status(403).json({ message: "Accès réservé aux entreprises", code: "NOT_ENTERPRISE" });
        }

        // Calculate date filter
        let dateFilter = {};
        if (range !== "all") {
            const now = new Date();
            const days = { "7days": 7, "30days": 30, "90days": 90 }[range];
            dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - days)) } };
        }

        // Count published and validated offers
        const nombreOffres = await Offre.countDocuments({
            entreprise: new mongoose.Types.ObjectId(userId),
            status: "publié",
            estValidé: true, // Ajout du filtre estValidé
            ...dateFilter,
        });

        // Get top 5 most viewed offers
        const offres = await Offre.find({
            entreprise: new mongoose.Types.ObjectId(userId),
            status: "publié",
            estValidé: true, // Ajout du filtre estValidé
            ...dateFilter,
        })
            .sort({ nbConsultations: -1 })
            .limit(5)
            .lean();

        // Calculate total and average consultations
        const totalConsultations = offres.reduce((sum, offre) => sum + (offre.nbConsultations || 0), 0);
        const moyenneConsultations = nombreOffres > 0 ? totalConsultations / nombreOffres : 0;

        // Group consultations by job type
        const repartition = await Offre.aggregate([
            {
                $match: {
                    entreprise: new mongoose.Types.ObjectId(userId),
                    status: "publié",
                    estValidé: true, // Ajout du filtre estValidé
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: { $ifNull: ["$typeEmploi", "Non spécifié"] },
                    consultations: { $sum: "$nbConsultations" },
                },
            },
            { $project: { type: "$_id", consultations: 1, _id: 0 } },
            { $sort: { consultations: -1 } },
        ]);

        // Check if data is empty
        if (nombreOffres === 0 && totalConsultations === 0 && repartition.length === 0) {
            return res.status(404).json({
                message: `Aucune offre trouvée pour la période ${range}.`,
                code: "NO_OFFERS_FOUND",
            });
        }

        res.status(200).json({
            totalConsultations,
            moyenneConsultations: parseFloat(moyenneConsultations.toFixed(2)),
            nombreOffres,
            offresPopulaires: offres.map((o) => ({
                titre: o.titre,
                consultations: o.nbConsultations || 0,
                datePublication: o.createdAt,
            })),
            repartitionTypeEmploi: repartition,
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des statistiques de consultations:", error);
        res.status(500).json({
            message: "Erreur serveur lors de la récupération des statistiques",
            code: "SERVER_ERROR",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});
  router.get("/statistiques/evolution-consultations", isAuthenticated, async (req, res) => {
    try {
        const { range } = req.query;
        const userId = req.userId;

        // Validate range parameter
        const validRanges = ["7days", "30days", "90days", "all"];
        if (!validRanges.includes(range)) {
            return res.status(400).json({
                message: "Période invalide. Utilisez 7days, 30days, 90days ou all.",
                code: "INVALID_RANGE",
            });
        }

        // Validate user ID
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "ID utilisateur invalide", code: "INVALID_USER_ID" });
        }

        // Check if user is an enterprise
        const utilisateur = await Utilisateur.findById(userId);
        if (!utilisateur || !utilisateur.nomEntreprise) {
            return res.status(403).json({ message: "Accès réservé aux entreprises", code: "NOT_ENTERPRISE" });
        }

        // Calculate date filter and group format
        let dateFilter = {};
        let groupFormat = "%Y-%m-%d";
        if (range !== "all") {
            const now = new Date();
            const days = { "7days": 7, "30days": 30, "90days": 90 }[range];
            dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - days)) } };
        }
        if (range === "90days") {
            groupFormat = "%Y-%U"; // Week of year (0-53, Sunday start)
        } else if (range === "all") {
            groupFormat = "%Y-%m"; // Monthly grouping
        }

        // Aggregate consultation evolution
        const evolutionData = await Offre.aggregate([
            {
                $match: {
                    entreprise: new mongoose.Types.ObjectId(userId),
                    status: "publié",
                    estValidé: true, // Ajout du filtre estValidé
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: groupFormat, date: "$createdAt" },
                    },
                    count: { $sum: "$nbConsultations" },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    period: {
                        $cond: {
                            if: { $eq: [groupFormat, "%Y-%U"] },
                            then: {
                                $concat: [
                                    { $substr: ["$_id", 0, 4] }, // Year
                                    "-",
                                    {
                                        $cond: [
                                            { $lt: [{ $substr: ["$_id", 5, -1] }, "10"] },
                                            { $concat: ["0", { $substr: ["$_id", 5, -1] }] },
                                            { $substr: ["$_id", 5, -1] },
                                        ],
                                    }, // Pad week with leading zero
                                ],
                            },
                            else: "$_id",
                        },
                    },
                    count: 1,
                    _id: 0,
                },
            },
        ]);

        res.status(200).json(evolutionData);
    } catch (error) {
        console.error("Erreur lors de la récupération de l'évolution des consultations:", error);
        res.status(500).json({
            message: "Erreur serveur lors de la récupération des statistiques",
            code: "SERVER_ERROR",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});
  router.get("/statistiques/repartition-type-emploi", isAuthenticated, async (req, res) => {
    try {
        const { range } = req.query;
        const userId = req.userId;

        // Validate range parameter
        const validRanges = ["7days", "30days", "90days", "all"];
        if (!validRanges.includes(range)) {
            return res.status(400).json({
                message: "Période invalide. Utilisez 7days, 30days, 90days ou all.",
                code: "INVALID_RANGE",
            });
        }

        // Validate user ID
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "ID utilisateur invalide", code: "INVALID_USER_ID" });
        }

        // Check if user is an enterprise
        const utilisateur = await Utilisateur.findById(userId);
        if (!utilisateur || !utilisateur.nomEntreprise) {
            return res.status(403).json({ message: "Accès réservé aux entreprises", code: "NOT_ENTERPRISE" });
        }

        // Calculate date filter
        let dateFilter = {};
        if (range !== "all") {
            const now = new Date();
            const days = { "7days": 7, "30days": 30, "90days": 90 }[range];
            dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - days)) } };
        }

        // Aggregate job type distribution
        const pipeline = [
            {
                $match: {
                    entreprise: new mongoose.Types.ObjectId(userId),
                    status: "publié",
                    estValidé: true, // Ajout du filtre estValidé
                    ...dateFilter,
                },
            },
            {
                $group: {
                    _id: { $ifNull: ["$typeEmploi", "Non spécifié"] },
                    consultations: { $sum: "$nbConsultations" },
                    count: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: null,
                    types: { $push: { type: "$_id", consultations: "$consultations" } },
                    totalConsultations: { $sum: "$consultations" },
                },
            },
            { $unwind: "$types" },
            {
                $project: {
                    _id: 0,
                    type: "$types.type",
                    consultations: "$types.consultations",
                    pourcentage: {
                        $cond: [
                            { $eq: ["$totalConsultations", 0] },
                            0,
                            { $multiply: [{ $divide: ["$types.consultations", "$totalConsultations"] }, 100] },
                        ],
                    },
                },
            },
            { $sort: { consultations: -1 } },
        ];

        const repartition = await Offre.aggregate(pipeline);

        res.status(200).json(repartition);
    } catch (error) {
        console.error("Erreur lors de la récupération de la répartition par type d'emploi:", {
            message: error.message,
            stack: error.stack,
            userId: req.userId,
            query: req.query,
        });
        res.status(500).json({
            message: "Erreur serveur lors de la récupération des statistiques",
            code: "SERVER_ERROR",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});

router.post("/", async (req, res) => {
    const {
        titre,
        description,
        entreprise,
        competencesRequises,
        salaire,
        statut,
        typeContrat, // Champ requis
        dateExpiration // Champ optionnel
    } = req.body;

    const nouvelleOffre = new Offre({
        titre,
        description,
        entreprise,
        competencesRequises,
        salaire,
        statut,
        typeContrat, // Champ requis
        dateExpiration // Champ optionnel
    });

    try {
        const offres = await Offre.find({ status: "publié" }).populate('entreprise', 'nom email');
        res.status(200).json(offres);
    } catch (error) {
        console.error("Erreur lors de la récupération des offres publiées:", error);
        res.status(500).json({ message: "Erreur serveur, veuillez réessayer." });
    }
});

router.put("/:id/publier", isAuthenticated, async (req, res) => {
    try {
      const offre = await Offre.findById(req.params.id);
  
      if (!offre) {
        return res.status(404).json({ message: "Offre non trouvée." });
      }
  
      if (offre.entreprise.toString() !== req.userId) {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à publier cette offre." });
      }
  
      offre.status = "publié";
      await offre.save();
  
      res.status(200).json({ message: "Offre publiée avec succès !", offre });
    } catch (error) {
      console.error("Erreur lors de la publication de l'offre:", error);
      res.status(500).json({ message: "Erreur serveur, veuillez réessayer." });
    }
  });

// Lire une offre par son ID
router.get("/:id", async (req, res) => {
    try {
        const offre = await Offre.findById(req.params.id).populate("entreprise");
        if (!offre) {
            return res.status(404).json({ message: "Offre non trouvée" });
        }
        res.status(200).json(offre);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour une offre
router.put("/:id", isAuthenticated, async (req, res) => {
    try {
        const offre = await Offre.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!offre) {
            return res.status(404).json({ message: "Offre non trouvée" });
        }
        res.status(200).json(offre);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Supprimer une offre
router.delete("/:id", isAuthenticated, async (req, res) => {
    try {
        const offre = await Offre.findByIdAndDelete(req.params.id);
        if (!offre) {
            return res.status(404).json({ message: "Offre non trouvée" });
        }
        res.status(200).json({ message: "Offre supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.get("/utilisateur", isAuthenticated, async (req, res) => {
    try {
        const userId = req.userId; // Assurez-vous que cette valeur est non nulle
        console.log(`Fetching offers for User ID: ${userId}`); // Ajout d'un log pour vérifier le ID de l'utilisateur

        const offres = await Offre.find({ entreprise: userId })
            .populate('entreprise', 'nom email')
            .sort({ createdAt: -1 });

        if (!offres || offres.length === 0) {
            return res.status(404).json({ message: "Aucune offre trouvée pour cet utilisateur." });
        }

        res.status(200).json(offres);
    } catch (error) {
        console.error("Erreur lors de la récupération des offres de l'utilisateur:", error);
        res.status(500).json({ 
            message: "Erreur serveur lors de la récupération des offres",
            error: error.message 
        });
    }
});

router.get("/:id/candidatures", async (req, res) => {
  try {
    const offreId = req.params.id;

    // Vérifier que l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(offreId)) {
      return res.status(400).json({ message: "ID d'offre invalide" });
    }

    const offre = await Offre.findById(offreId);
    if (!offre) {
      return res.status(404).json({ message: "Offre non trouvée" });
    }

    // Récupérer les candidatures avec populate correct
    const candidatures = await Candidature.find({ offre: offreId })
      .populate({
        path: "candidat",
        select: "nom email telephone",
        model: "Utilisateur"
      })
      .populate({
        path: "profilCv",
        select: "titre cv",
        model: "ProfilCv"
      })
      .populate({
        path: "offre",
        select: "titre",
        model: "Offre"
      });

    // Transformer les candidatures pour ajouter les URLs
    const result = candidatures.map(candidature => {
      const obj = candidature.toObject();
      
      // Gestion du CV
      if (obj.profilCv && obj.profilCv.cv) {
        obj.cv = obj.profilCv.cv;
        obj.cv.url = `${req.protocol}://${req.get('host')}/api/candidatures/${obj._id}/cv`;
        delete obj.cv.data; // Supprimer les données binaires
      } else {
        obj.cv = null;
      }

      // Gestion de la vidéo
      if (obj.videoMotivation) {
        obj.videoMotivation.url = `${req.protocol}://${req.get('host')}/api/candidatures/${obj._id}/video`;
        delete obj.videoMotivation.data;
      }

      return obj;
    });

    res.status(200).json({
      count: result.length,
      candidatures: result
    });

  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ 
      message: "Erreur serveur",
      error: error.message 
    });
  }
});

router.put("/:id/favoris", isAuthenticated, async (req, res) => {
    const userId = req.userId;
    const offreId = req.params.id;

    try {
        const offre = await Offre.findById(offreId);
        if (!offre) {
            return res.status(404).json({ message: "Offre non trouvée." });
        }

        // Logs pour le débogage
        console.log("ID Utilisateur:", userId);
        console.log("ID Offre:", offreId);
        console.log("Liste des Favoris avant modification:", offre.utilisateursFavoris);

        const isFavori = offre.utilisateursFavoris.includes(userId);

        if (isFavori) {
            offre.utilisateursFavoris = offre.utilisateursFavoris.filter(id => id.toString() !== userId);
        } else {
            offre.utilisateursFavoris.push(userId);
        }

        await offre.save();

        // Logs après la modification
        console.log("Liste des Favoris après modification:", offre.utilisateursFavoris);

        res.status(200).json({
            message: `Offre ${isFavori ? "retirée" : "ajoutée"} des favoris avec succès !`,
            favoris: offre.utilisateursFavoris
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour des favoris:", error);
        res.status(500).json({ message: "Une erreur est survenue lors de la mise à jour des favoris." });
    }
});

// Route pour récupérer les offres favoris de l'utilisateur connecté
router.get("/utilisateur/mes-favoris", isAuthenticated, async (req, res) => {
    try {
        const userId = req.userId; // ID de l'utilisateur à partir du middleware d'authentification
        
        // Recherche des offres où l'utilisateur a été ajouté à la liste des favoris
        const offres = await Offre.find({ utilisateursFavoris: userId })
            .populate("entreprise", "nom") // Vous pouvez ajuster les champs à peupler
            .lean();

        if (offres.length === 0) {
            return res.status(404).json({ message: "Aucune offre favorite trouvée." });
        }

        res.status(200).json({ offres });
    } catch (error) {
        console.error("Erreur lors de la récupération des offres favorites:", error);
        res.status(500).json({ message: "Erreur serveur, veuillez réessayer" });
    }
});

// Route pour récupérer la liste des offres publiées

module.exports = router;