const express = require('express');
const router = express.Router();
const Mission = require('../models/Mission');
const isAuthenticated = require('../middlewares/auth');
const Utilisateur = require('../models/Utilisateur');
const Contrat = require('../models/Contrat');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');

// Validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Configure GridFSBucket
let gfsBucket;
mongoose.connection.once('open', () => {
  gfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'fs',
  });
});

// Configure Multer for PDF files
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});


router.post('/', isAuthenticated, async (req, res) => {
  try {
    // Verify user is an Entreprise
    const user = await Utilisateur.findById(req.userId).populate('profils');
    if (!user || !user.profils.some((p) => p.name === 'Entreprise')) {
      return res.status(403).json({
        success: false,
        message: 'Seul un utilisateur avec un profil Entreprise peut créer une mission',
      });
    }

    // Validate required fields
    const requiredFields = ['nom', 'dateDebut', 'description', 'contrat', 'employee'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `Le champ ${field} est obligatoire`,
        });
      }
    }

    const { nom, description, contrat, employee } = req.body;
    if (!nom.trim() || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et la description ne peuvent pas être vides après nettoyage',
      });
    }

    // Validate ObjectIds
    if (!isValidObjectId(contrat) || !isValidObjectId(employee)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de contrat ou d\'employé invalide',
      });
    }

    // Validate dates
    const dateDebut = new Date(req.body.dateDebut);
    const dateFin = req.body.dateFin ? new Date(req.body.dateFin) : null;
    if (isNaN(dateDebut.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Date de début invalide',
      });
    }
    if (dateFin && (isNaN(dateFin.getTime()) || dateFin <= dateDebut)) {
      return res.status(400).json({
        success: false,
        message: 'La date de fin doit être postérieure à la date de début',
      });
    }

    // Validate contract
    const contract = await Contrat.findOne({
      _id: contrat,
      entreprise: req.userId,
      user: employee,
      etat: 'signé',
    }).populate('entreprise', '_id nom userId');
    if (!contract) {
      return res.status(400).json({
        success: false,
        message: 'Contrat non trouvé ou non signé pour cet employé',
      });
    }

    // Validate employee
    const employeeUser = await Utilisateur.findById(employee);
    if (!employeeUser) {
      return res.status(400).json({
        success: false,
        message: 'Employé non trouvé',
      });
    }

    // Create mission
    const mission = new Mission({
      titre: nom.trim(),
      description: description.trim(),
      dateDebut,
      dateFin,
      statut: req.body.statut && ['À faire', 'En cours', 'Terminé', 'Validé', 'Annulée'].includes(req.body.statut)
        ? req.body.statut
        : 'À faire',
      contrat,
      employee,
      entreprise: req.userId,
      entrepriseValidation: 'Pending', // Fixed to match schema enum
      adminValidation: 'Pending',
    });

    await mission.save();

    // Create notification
    let notification;
    try {
      notification = new Notification({
        type: 'NOUVELLE_MISSION',
        entreprise_id: req.userId,
        user_id: employee,
        data: {
          missionId: mission._id,
          titre: mission.titre,
          description: mission.description,
          message: `Nous vous informons qu'une nouvelle mission, "${mission.titre}", vous a été attribuée. Elle débutera le ${dateDebut.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}. Merci de consulter les détails dans votre espace personnel.`,
        },
        contrat,
        created_at: new Date(),
      });
      await notification.save();
    } catch (notificationError) {
      console.error(`[${new Date().toISOString()}] Erreur lors de la sauvegarde de la notification pour mission ${mission._id}:`, notificationError.message);
      await Mission.findByIdAndDelete(mission._id);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la notification, mission annulée',
        error: notificationError.message,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Mission créée avec succès et notification envoyée',
      data: { mission, notification },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la création de la mission:`, error.message);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: messages,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la mission',
      error: error.message,
    });
  }
});

// GET: List all missions
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { search, statut, dateDebut, dateFin, page = 1, limit = 10, sortBy } = req.query;

    const match = {
      entreprise: new mongoose.Types.ObjectId(req.userId), // Filtrer par entreprise connectée
    };
    if (search && typeof search === 'string') {
      match.titre = { $regex: search, $options: 'i' };
    }
    if (statut && typeof statut === 'string') {
      const statuts = statut.split(',').filter(s => ['À faire', 'En cours', 'Terminé', 'Validé', 'Annulée'].includes(s));
      if (statuts.length > 0) {
        match.statut = { $in: statuts };
      }
    }
    if (dateDebut && !isNaN(new Date(dateDebut).getTime())) {
      match.dateDebut = { $gte: new Date(dateDebut) };
    }
    if (dateFin && !isNaN(new Date(dateFin).getTime())) {
      match.dateFin = { $lte: new Date(dateFin) };
    }

    const sort = {};
    if (sortBy && typeof sortBy === 'string') {
      const [field, order] = sortBy.split(':');
      if (['titre', 'dateDebut', 'dateFin', 'statut'].includes(field) && ['asc', 'desc'].includes(order)) {
        sort[field] = order === 'desc' ? -1 : 1;
      }
    } else {
      sort.dateDebut = -1;
    }

    const pageNum = Math.max(1, parseInt(page)) || 1;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit))) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [missions, total] = await Promise.all([
      Mission.find(match)
        .sort(sort)
        .limit(limitNum)
        .skip(skip)
        .populate('employee', 'nom poste userId')
        .populate({
          path: 'contrat',
          select: 'titre intitulePoste entreprise',
          populate: { path: 'entreprise', select: '_id nom userId' },
        })
        .populate('entreprise', 'nom userId')
        .lean(),
      Mission.countDocuments(match),
    ]);

    const formattedMissions = missions.map(mission => ({
      ...mission,
      nom: mission.titre,
      employee: {
        userId: mission.employee?._id || mission.employee,
        nom: mission.employee?.nom || 'Inconnu',
        poste: mission.employee?.poste || 'Inconnu',
      },
      entreprise: {
        userId: mission.entreprise?.userId || mission.entreprise?._id || mission.entreprise,
        nom: mission.entreprise?.nom || 'Inconnu',
      },
      contrat: mission.contrat || null,
      poste: mission.contrat?.intitulePoste || 'Inconnu',
      compteRendu: mission.compteRendu || null,
    }));

    res.json({
      success: true,
      data: formattedMissions,
      pagination: {
        total,
        count: missions.length,
        limit: limitNum,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + missions.length < total,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la récupération des missions:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des missions',
      error: error.message,
    });
  }
});

router.get('/contrat', isAuthenticated, async (req, res) => {
  try {
    const { search, statut, dateDebut, dateFin, contrat, page = 1, limit = 10, sortBy } = req.query;

    if (contrat && !mongoose.Types.ObjectId.isValid(contrat)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de contrat invalide',
      });
    }

    // Fetch contract details early if contrat is provided
    let contractDetails = null;
    if (contrat) {
      contractDetails = await Contrat.findById(contrat)
        .select('titre intitulePoste entreprise')
        .populate('entreprise', '_id nom userId')
        .lean();
      if (!contractDetails) {
        return res.status(404).json({
          success: false,
          message: 'Contrat non trouvé',
        });
      }
    }

    const match = {};
    if (contrat) {
      match.contrat = new mongoose.Types.ObjectId(contrat);
    }
    if (search && typeof search === 'string') {
      match.titre = { $regex: search, $options: 'i' };
    }
    if (statut && typeof statut === 'string') {
      const statuts = statut.split(',').filter(s => ['À faire', 'En cours', 'Terminé', 'Validé', 'Annulée'].includes(s));
      if (statuts.length > 0) {
        match.statut = { $in: statuts };
      }
    }
    if (dateDebut && !isNaN(new Date(dateDebut).getTime())) {
      match.dateDebut = { $gte: new Date(dateDebut) };
    }
    if (dateFin && !isNaN(new Date(dateFin).getTime())) {
      match.dateFin = { $lte: new Date(dateFin) };
    }

    const sort = sortBy && typeof sortBy === 'string' ? { [sortBy.split(':')[0]]: sortBy.split(':')[1] === 'desc' ? -1 : 1 } : { dateDebut: -1 };

    const pageNum = Math.max(1, parseInt(page)) || 1;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit))) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [missions, total] = await Promise.all([
      Mission.find(match)
        .sort(sort)
        .limit(limitNum)
        .skip(skip)
        .populate({
          path: 'employee',
          select: 'nom poste userId',
        })
        .populate({
          path: 'contrat',
          select: 'titre intitulePoste entreprise',
          populate: { path: 'entreprise', select: '_id nom userId' },
        })
        .populate('entreprise', 'nom userId')
        .lean(),
      Mission.countDocuments(match),
    ]);

    const formattedMissions = missions.map(mission => ({
      ...mission,
      titre: mission.titre || 'Sans titre',
      employee: {
        userId: mission.employee?._id?.toString() || mission.employee || null,
        nom: mission.employee?.nom || 'Inconnu',
        poste: mission.employee?.poste || mission.contrat?.intitulePoste || 'Non spécifié',
      },
      entreprise: {
        userId: mission.entreprise?.userId?.toString() || mission.entreprise?._id?.toString() || mission.entreprise || null,
        nom: mission.entreprise?.nom || 'Inconnu',
      },
      contrat: mission.contrat ? {
        _id: mission.contrat._id,
        titre: mission.contrat.titre || 'Contrat sans titre',
        intitulePoste: mission.contrat.intitulePoste || 'Non spécifié',
        entreprise: mission.contrat.entreprise || null,
      } : null,
      compteRendu: mission.compteRendu || null,
    }));

    res.json({
      success: true,
      data: formattedMissions,
      contract: contractDetails ? {
        _id: contractDetails._id,
        titre: contractDetails.titre || 'Contrat sans titre',
        intitulePoste: contractDetails.intitulePoste || 'Non spécifié',
        entreprise: contractDetails.entreprise || null,
      } : null,
      pagination: {
        total,
        count: missions.length,
        limit: limitNum,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + missions.length < total,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la récupération des missions par contrat:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des missions',
      error: error.message,
    });
  }
});

// GET: Get mission by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de mission invalide',
      });
    }

    const mission = await Mission.findById(req.params.id)
      .populate('employee', 'nom poste userId')
      .populate({
        path: 'contrat',
        select: 'titre intitulePoste entreprise',
        populate: { path: 'entreprise', select: '_id nom userId' },
      })
      .populate('entreprise', 'nom userId');

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée',
      });
    }

    const formattedMission = {
      ...mission.toObject(),
      nom: mission.titre,
      employee: {
        userId: mission.employee?._id || mission.employee,
        nom: mission.employee?.nom || 'Inconnu',
        poste: mission.employee?.poste || 'Inconnu',
      },
      entreprise: {
        userId: mission.entreprise?.userId || mission.entreprise?._id || mission.entreprise,
        nom: mission.entreprise?.nom || 'Inconnu',
      },
      contrat: mission.contrat || null,
      poste: mission.contrat?.intitulePoste || '',
      compteRendu: mission.compteRendu || null,
    };

    res.json({
      success: true,
      data: formattedMission,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la récupération de la mission ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la mission',
      error: error.message,
    });
  }
});


router.get('/user/entreprise', isAuthenticated, async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.userId)
      .select('_id profils')
      .populate('profils', 'name');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    const hasEntrepriseProfile = user.profils.some(p => p.name === 'Entreprise');
    if (!hasEntrepriseProfile) {
      return res.status(403).json({
        success: false,
        message: 'L\'utilisateur n\'a pas de profil Entreprise',
      });
    }

    res.json({
      success: true,
      data: {
        userId: user._id.toString(),
        hasEntrepriseProfile: true,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la récupération de l'utilisateur ${req.userId}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des informations de l\'utilisateur',
      error: error.message,
    });
  }
});

// PATCH: Update mission details
router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de mission invalide',
      });
    }

    const mission = await Mission.findById(req.params.id)
      .populate({
        path: 'contrat',
        select: 'entreprise',
        populate: { path: 'entreprise', select: '_id nom userId' },
      })
      .populate('entreprise', 'nom userId');
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée',
      });
    }

    const user = await Utilisateur.findById(req.userId).populate('profils');
    if (!user || !user.profils.some((p) => p.name === 'Entreprise') || mission.entreprise.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'entreprise créatrice peut modifier une mission',
      });
    }

    const updates = req.body;

    if (updates.titre !== undefined) {
      if (typeof updates.titre !== 'string' || !updates.titre.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Le titre doit être une chaîne non vide',
        });
      }
      mission.titre = updates.titre.trim();
    }
    if (updates.description !== undefined) {
      if (typeof updates.description !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'La description doit être une chaîne',
        });
      }
      mission.description = updates.description.trim();
    }
    if (updates.statut && ['À faire', 'En cours', 'Terminé', 'Validé', 'Annulée'].includes(updates.statut)) {
      mission.statut = updates.statut;
    }

    if (updates.dateDebut !== undefined || updates.dateFin !== undefined) {
      const newDateDebut = updates.dateDebut ? new Date(updates.dateDebut) : mission.dateDebut;
      const newDateFin = updates.dateFin !== undefined ? new Date(updates.dateFin) || null : mission.dateFin;

      if (isNaN(newDateDebut.getTime()) || (newDateFin && isNaN(newDateFin.getTime()))) {
        return res.status(400).json({
          success: false,
          message: 'Date de début ou de fin invalide',
        });
      }
      if (newDateFin && newDateFin <= newDateDebut) {
        return res.status(400).json({
          success: false,
          message: 'La date de fin doit être postérieure à la date de début',
        });
      }

      mission.dateDebut = newDateDebut;
      mission.dateFin = newDateFin;
    }

    if (updates.tags !== undefined) {
      mission.tags = Array.isArray(updates.tags)
        ? updates.tags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim())
        : typeof updates.tags === 'string'
        ? updates.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];
    }

    if (updates.employee !== undefined && isValidObjectId(updates.employee)) {
      const employeeUser = await Utilisateur.findById(updates.employee);
      if (!employeeUser) {
        return res.status(400).json({
          success: false,
          message: 'Employé non trouvé',
        });
      }
      mission.employee = updates.employee;
    }

    if (updates.contrat !== undefined && isValidObjectId(updates.contrat)) {
      const contract = await Contrat.findOne({
        _id: updates.contrat,
        entreprise: req.userId,
        user: updates.employee || mission.employee,
        etat: 'signé',
      }).populate('entreprise', '_id nom userId');
      if (!contract) {
        return res.status(400).json({
          success: false,
          message: 'Contrat non trouvé ou non signé pour cet employé',
        });
      }
      mission.contrat = updates.contrat;
    }

    await mission.save();

    res.json({
      success: true,
      message: 'Mission mise à jour avec succès',
      data: mission,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la mise à jour de la mission ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la mission',
      error: error.message,
    });
  }
});


router.patch('/:id/statut', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    const userId = req.userId;

    // Validate mission ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de mission invalide',
      });
    }

    // Validate status
    if (!statut || !['À faire', 'En cours', 'Terminé', 'Validé', 'Annulée'].includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide. Valeurs possibles : À faire, En cours, Terminé, Validé, Annulée',
      });
    }

    // Fetch mission and populate relevant fields
    const mission = await Mission.findById(id)
      .populate('employee', 'nom _id')
      .populate('contrat', 'titre entreprise')
      .populate('entreprise', 'nom _id');

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée',
      });
    }

    // Log authenticated user and mission data for debugging
    console.log(`[${new Date().toISOString()}] Utilisateur connecté:`, { userId });
    console.log(`[${new Date().toISOString()}] Mission ${id} Data:`, {
      missionId: mission._id,
      statut: mission.statut,
      employee: mission.employee ? { _id: mission.employee._id, nom: mission.employee.nom } : null,
      contrat: mission.contrat ? { _id: mission.contrat._id, titre: mission.contrat.titre } : null,
      entreprise: mission.entreprise ? { _id: mission.entreprise._id, nom: mission.entreprise.nom } : null,
    });

    // Check if mission status can be modified
    if (mission.statut === 'Annulée' || mission.statut === 'Validé') {
      return res.status(400).json({
        success: false,
        message: `Impossible de modifier une mission ${mission.statut.toLowerCase()}`,
      });
    }

    // Validate user authentication and authorization
    if (!mission.employee?._id) {
      console.error(`Mission ${id} has no employee assigned`);
      return res.status(500).json({
        success: false,
        message: 'Erreur : Aucun employé assigné à cette mission',
      });
    }

    if (mission.employee._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'employé assigné peut modifier le statut',
      });
    }

    // Update status
    mission.statut = statut;
    await mission.save();

    // Respond with updated mission
    res.json({
      success: true,
      message: 'Statut de la mission mis à jour avec succès',
      data: mission,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la mise à jour du statut de la mission ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message,
    });
  }
});

// DELETE: Delete a mission
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de mission invalide',
      });
    }

    const mission = await Mission.findById(req.params.id).populate('entreprise', 'nom userId');
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée',
      });
    }

    const user = await Utilisateur.findById(req.userId).populate('profils');
    if (!user || !user.profils.some((p) => p.name === 'Entreprise') || mission.entreprise.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'entreprise créatrice peut supprimer une mission',
      });
    }

    await Mission.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Mission supprimée avec succès',
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la suppression de la mission ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la mission',
      error: error.message,
    });
  }
});

router.patch('/:id/validate', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    // Validate mission ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de mission invalide',
      });
    }

    // Validate action
    if (!action || !['validate', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action invalide. Valeurs possibles : validate, reject',
      });
    }

    // Fetch user
    const user = await Utilisateur.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Fetch mission
    const mission = await Mission.findById(id)
      .populate('contrat', 'entreprise')
      .populate('entreprise', '_id nom'); // Récupère _id et nom de l'entreprise

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée',
      });
    }

    // Validate entreprise data
    if (!mission.entreprise?._id) {
      console.error(`[${new Date().toISOString()}] Erreur: Aucune entreprise assignée à la mission ${id}`);
      return res.status(500).json({
        success: false,
        message: 'Aucune entreprise assignée à cette mission',
      });
    }
    console.log(`[${new Date().toISOString()}] Entreprise assignée: ${mission.entreprise._id}, Nom: ${mission.entreprise.nom || 'inconnu'}`);

    // Check if user is entreprise
    const isEntreprise = mission.entreprise._id.toString() === req.userId.toString();
    if (!isEntreprise) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seule l\'entreprise créatrice peut valider ou rejeter une mission',
      });
    }

    // Check mission status
    if (mission.statut === 'Annulée' || mission.statut === 'Validé') {
      return res.status(400).json({
        success: false,
        message: `Impossible de modifier une mission ${mission.statut.toLowerCase()}`,
      });
    }

    // Check if mission is terminated for validation
    if (action === 'validate' && mission.statut !== 'Terminé') {
      return res.status(400).json({
        success: false,
        message: 'La mission doit être terminée avant validation',
      });
    }

    // Update validation status
    mission.entrepriseValidation = action === 'validate' ? 'Validated' : 'Rejected';

    // Update mission status based on entreprise validation
    console.log(`[${new Date().toISOString()}] Avant mise à jour - entrepriseValidation: ${mission.entrepriseValidation}, statut: ${mission.statut}`);
    
    if (mission.entrepriseValidation === 'Validated') {
      mission.statut = 'Validé'; // Validation par l'entreprise => Validé
    } else if (mission.entrepriseValidation === 'Rejected') {
      mission.statut = 'En cours'; // Rejet par l'entreprise => En cours
    }

    console.log(`[${new Date().toISOString()}] Après mise à jour - statut: ${mission.statut}`);

    await mission.save();

    res.json({
      success: true,
      message: `Mission ${action === 'validate' ? 'validée' : 'rejetée'} avec succès par l'entreprise`,
      data: mission,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la validation/rejet de la mission ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation/rejet de la mission',
      error: error.message,
    });
  }
});

router.patch('/:id/validate', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    // Validate mission ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de mission invalide',
      });
    }

    // Validate action
    if (!action || !['validate', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action invalide. Valeurs possibles : validate, reject',
      });
    }

    // Fetch user
    const user = await Utilisateur.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Fetch mission
    const mission = await Mission.findById(id)
      .populate('contrat', 'entreprise')
      .populate('entreprise', '_id nom'); // Récupère _id et nom de l'entreprise

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée',
      });
    }

    // Validate entreprise data
    if (!mission.entreprise?._id) {
      console.error(`[${new Date().toISOString()}] Erreur: Aucune entreprise assignée à la mission ${id}`);
      return res.status(500).json({
        success: false,
        message: 'Aucune entreprise assignée à cette mission',
      });
    }
    console.log(`[${new Date().toISOString()}] Entreprise assignée: ${mission.entreprise._id}, Nom: ${mission.entreprise.nom || 'inconnu'}`);

    // Check if user is entreprise
    const isEntreprise = mission.entreprise._id.toString() === req.userId.toString();
    if (!isEntreprise) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seule l\'entreprise créatrice peut valider ou rejeter une mission',
      });
    }

    // Check mission status
    if (mission.statut === 'Annulée' || mission.statut === 'Validé') {
      return res.status(400).json({
        success: false,
        message: `Impossible de modifier une mission ${mission.statut.toLowerCase()}`,
      });
    }

    // Check if mission is terminated for validation
    if (action === 'validate' && mission.statut !== 'Terminé') {
      return res.status(400).json({
        success: false,
        message: 'La mission doit être terminée avant validation',
      });
    }

    // Update validation status
    mission.entrepriseValidation = action === 'validate' ? 'Validated' : 'Rejected';

    // Update mission status based on entreprise validation
    console.log(`[${new Date().toISOString()}] Avant mise à jour - entrepriseValidation: ${mission.entrepriseValidation}, statut: ${mission.statut}`);
    
    if (mission.entrepriseValidation === 'Validated') {
      mission.statut = 'Validé'; // Validation par l'entreprise => Validé
    } else if (mission.entrepriseValidation === 'Rejected') {
      mission.statut = 'En cours'; // Rejet par l'entreprise => En cours
    }

    console.log(`[${new Date().toISOString()}] Après mise à jour - statut: ${mission.statut}`);

    await mission.save();

    res.json({
      success: true,
      message: `Mission ${action === 'validate' ? 'validée' : 'rejetée'} avec succès par l'entreprise`,
      data: mission,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la validation/rejet de la mission ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation/rejet de la mission',
      error: error.message,
    });
  }
});

router.post('/:id/feedback', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const userId = req.userId;

    // Validate mission ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Identifiant de mission invalide' });
    }

    // Validate feedback
    if (!feedback || typeof feedback !== 'string' || feedback.trim() === '') {
      return res.status(400).json({ success: false, message: 'Le champ feedback est requis et doit être une chaîne non vide' });
    }

    // Fetch mission
    const mission = await Mission.findById(id)
      .populate('employee', 'nom _id')
      .populate('contrat', 'titre')
      .populate('entreprise', 'nomEntreprise _id'); // Récupère nomEntreprise et _id de l'entreprise

    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission non trouvée' });
    }

    // Validate compte rendu
    if (!mission.compteRendu) {
      return res.status(400).json({ success: false, message: 'Aucun compte rendu trouvé pour cette mission' });
    }

    // Validate employee
    if (!mission.employee?._id) {
      console.error(`[${new Date().toISOString()}] Erreur: Aucun employé assigné à la mission ${id}`);
      return res.status(500).json({ success: false, message: 'Aucun employé assigné à cette mission' });
    }
    console.log(`[${new Date().toISOString()}] Employé assigné: ${mission.employee._id}`);

    // Validate that the user is the entreprise
    if (req.userId.toString() !== mission.entreprise._id.toString()) {
      return res.status(403).json({ success: false, message: "Seule l'entreprise peut ajouter un feedback" });
    }

    // Log entreprise name
    console.log(`[${new Date().toISOString()}] Nom de l'entreprise: ${mission.entreprise?.nomEntreprise || 'inconnue'}`);

    // Add feedback to compte rendu
    mission.compteRendu.feedbacks = mission.compteRendu.feedbacks || [];
    mission.compteRendu.feedbacks.push({
      feedback,
      submittedBy: req.userId, // L'entreprise soumet le feedback
      feedbackDate: new Date(),
    });

    await mission.save();

    // Create notification
    const notification = new Notification({
      type: 'FEEDBACK_COMPTE_RENDU',
      user_id: mission.employee._id, // Destinataire : l'employé (par ex., 680959fc09b09445a85f0cdc)
      entreprise_id: mission.entreprise._id,
      contrat: mission.contrat._id,
      data: {
        missionId: mission._id,
        titre: mission.titre,
        message: `Un feedback a été ajouté à votre compte rendu pour la mission "${mission.titre}" par l'entreprise ${mission.entreprise.nomEntreprise || 'inconnue'}.`,
        feedback,
      },
      created_at: new Date(),
      read: false,
    });

    console.log(`[${new Date().toISOString()}] Création notification avec user_id: ${mission.employee._id}`);
    await notification.save();
    console.log(`[${new Date().toISOString()}] Notification FEEDBACK_COMPTE_RENDU créée pour feedback sur mission ${id}, user_id: ${mission.employee._id}`);

    res.json({ success: true, message: 'Feedback ajouté avec succès', data: mission });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de l'ajout du feedback:`, error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// POST: Submit compte rendu
router.post('/:id/compte-rendu', isAuthenticated, upload.single('compteRendu'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const userId = req.userId;

    // Validate mission ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de mission invalide',
      });
    }

    // Fetch mission and populate relevant fields
    const mission = await Mission.findById(id)
      .populate('employee', 'nom _id')
      .populate('contrat', 'titre entreprise')
      .populate('entreprise', 'nom _id');

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée',
      });
    }

    // Log authenticated user and mission data for debugging
    console.log(`[${new Date().toISOString()}] Utilisateur connecté:`, { userId });
    console.log(`[${new Date().toISOString()}] Mission ${id} Data:`, {
      missionId: mission._id,
      statut: mission.statut,
      employee: mission.employee ? { _id: mission.employee._id, nom: mission.employee.nom } : null,
      contrat: mission.contrat ? { _id: mission.contrat._id, titre: mission.contrat.titre } : null,
      entreprise: mission.entreprise ? { _id: mission.entreprise._id, nom: mission.entreprise.nom } : null,
      compteRendu: mission.compteRendu
        ? {
            fileId: mission.compteRendu.fileId,
            filename: mission.compteRendu.filename,
            dateSoumission: mission.compteRendu.dateSoumission,
          }
        : null,
    });

    // Validate user authentication and authorization
    if (!mission.employee?._id) {
      console.error(`Mission ${id} has no employee assigned`);
      return res.status(500).json({
        success: false,
        message: 'Erreur : Aucun employé assigné à cette mission',
      });
    }

    if (mission.employee._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez soumettre un compte rendu que pour vous-même',
      });
    }

    // Validate file
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier PDF fourni',
      });
    }

    // Validate mission status
    if (mission.statut !== 'Terminé') {
      return res.status(400).json({
        success: false,
        message: 'La mission doit être terminée pour soumettre un compte rendu',
      });
    }

    // Validate GridFS
    if (!gfsBucket) {
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur : GridFS non initialisé',
      });
    }

    // Delete existing compte rendu file if it exists
    if (mission.compteRendu?.fileId) {
      try {
        await gfsBucket.delete(new mongoose.Types.ObjectId(mission.compteRendu.fileId));
        console.log(`[${new Date().toISOString()}] Ancien compte rendu supprimé pour mission ${id}`);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] Erreur lors de la suppression de l'ancien fichier pour mission ${id}:`, error.message);
      }
    }

    // Upload new file
    const filename = `compte-rendu-${id}-${userId}-${Date.now()}.pdf`;
    const uploadStream = gfsBucket.openUploadStream(filename, {
      contentType: file.mimetype,
      metadata: { missionId: id, userId },
    });

    uploadStream.write(file.buffer);
    uploadStream.end();

    const fileId = await new Promise((resolve, reject) => {
      uploadStream.on('finish', () => resolve(uploadStream.id));
      uploadStream.on('error', (error) => reject(error));
    });

    // Update mission with new compte rendu
    mission.compteRendu = {
      fileId,
      filename,
      dateSoumission: new Date(),
      feedbacks: mission.compteRendu?.feedbacks || [],
    };

    await mission.save();

 

    // Respond with updated mission
    res.json({
      success: true,
      message: 'Compte rendu PDF soumis avec succès',
      data: mission,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la soumission du compte rendu pour mission ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la soumission du compte rendu',
      error: error.message,
    });
  }
});


// GET: Retrieve compte rendu
router.get('/:id/compte-rendu', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Validate mission ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de mission invalide',
      });
    }

    // Fetch mission and populate relevant fields
    const mission = await Mission.findById(id)
      .populate({
        path: 'contrat',
        select: 'titre entreprise',
        populate: { path: 'entreprise', select: '_id nom' },
      })
      .populate('entreprise', 'nom _id')
      .populate('employee', 'nom _id')
      .lean();

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée',
      });
    }

    // Log mission data for debugging
    console.log(`[${new Date().toISOString()}] Utilisateur connecté:`, { userId });
    console.log(`[${new Date().toISOString()}] Mission ${id} Data:`, {
      missionId: mission._id,
      statut: mission.statut,
      employee: mission.employee ? { _id: mission.employee._id, nom: mission.employee.nom } : null,
      contrat: mission.contrat ? { _id: mission.contrat._id, titre: mission.contrat.titre, entreprise: mission.contrat.entreprise?._id } : null,
      entreprise: mission.entreprise ? { _id: mission.entreprise._id, nom: mission.entreprise.nom } : null,
      compteRendu: mission.compteRendu
        ? { fileId: mission.compteRendu.fileId, filename: mission.compteRendu.filename }
        : null,
    });

    // Authorization checks
    const isEntrepriseContract = mission.contrat?.entreprise?._id?.toString() === userId;
    const isEntrepriseMission = mission.entreprise?._id?.toString() === userId;
    const isEmployee = mission.employee?._id?.toString() === userId;

    if (!isEntrepriseContract && !isEntrepriseMission && !isEmployee) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé pour accéder au compte rendu',
      });
    }

    // Validate compte rendu existence
    if (!mission.compteRendu?.fileId) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte rendu disponible',
      });
    }

    // Validate GridFS
    if (!gfsBucket) {
      return res.status(500).json({
        success: false,
        message: 'Erreur de configuration du serveur',
      });
    }

    // Set response headers
    const filename = mission.compteRendu.filename || `compte-rendu-${mission._id}-${mission.employee?._id || 'unknown'}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });

    // Stream the file
    const fileId = new mongoose.Types.ObjectId(mission.compteRendu.fileId);
    const downloadStream = gfsBucket.openDownloadStream(fileId);

    let errored = false;

    downloadStream.on('error', (err) => {
      if (errored) return;
      errored = true;
      console.error(`[${new Date().toISOString()}] Erreur de streaming pour mission ${id}:`, err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la transmission du fichier',
          error: err.message,
        });
      } else {
        res.end();
      }
    });

    downloadStream.on('end', () => {
      if (!errored) {
        console.log(`[${new Date().toISOString()}] PDF envoyé avec succès - Mission ID: ${id}`);
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la récupération du compte rendu pour mission ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du compte rendu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});



module.exports = router;