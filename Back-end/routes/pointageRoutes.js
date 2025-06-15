const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Pointage = require('../models/Pointage');
const isAuthenticated = require('../middlewares/auth');
const Contrat = require('../models/Contrat');
const FicheDePaie = require('../models/FicheDePaie');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Configuration des jours fériés (pour 2025)
const JOURS_FERIES = ['2025-05-01']; // 1er mai

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../Uploads/justificatifs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Seuls PDF, JPEG et PNG sont acceptés.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Normalize time format to HH:mm
function normalizeTime(time) {
  if (!time || typeof time !== 'string') return time;
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const hours = parseInt(parts[0].trim());
  const minutes = parseInt(parts[1].trim());
  if (isNaN(hours) || isNaN(minutes)) return time;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Extract salaire brut robustly
function extractSalaireBrut(salaire) {
  if (!salaire) return 0;
  if (typeof salaire === 'number') return salaire;
  if (typeof salaire !== 'string') return 0;
  const cleaned = salaire.replace(/[^0-9,.]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Créer un pointage
router.post('/', isAuthenticated, upload.single('justificatifFile'), async (req, res) => {
  try {
    const { pointages, utilisateur, contrat, type, date, duree_jours, commentaires, justificatifText, statut } = req.body;
    let justificatif = justificatifText || '';

    if (req.file) {
      justificatif = `/Uploads/justificatifs/${req.file.filename}`;
    }

    let parsedPointages = [];
    if (pointages) {
      parsedPointages = typeof pointages === 'string' ? JSON.parse(pointages) : pointages;
      if (!Array.isArray(parsedPointages)) {
        return res.status(400).json({ code: 'INVALID_POINTAGES', message: 'Les pointages doivent être un tableau.' });
      }
      for (const p of parsedPointages) {
        p.heure_debut = normalizeTime(p.heure_debut);
        p.heure_fin = normalizeTime(p.heure_fin);
        if (!p.date || !p.heure_debut || !p.heure_fin) {
          return res.status(400).json({ code: 'MISSING_FIELDS', message: 'Date, heure_debut, et heure_fin sont requis pour chaque pointage.' });
        }
        const pointageDate = new Date(p.date);
        if (isNaN(pointageDate.getTime())) {
          return res.status(400).json({ code: 'INVALID_DATE', message: 'Date de pointage invalide.' });
        }
        if (pointageDate > new Date()) {
          return res.status(400).json({ code: 'FUTURE_DATE', message: 'La date du pointage ne peut pas être dans le futur.' });
        }
        const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(p.heure_debut) || !timeRegex.test(p.heure_fin)) {
          return res.status(400).json({ 
            code: 'INVALID_TIME_FORMAT', 
            message: 'Format d\'heure invalide (doit être HH:mm).', 
            input: { heure_debut: p.heure_debut, heure_fin: p.heure_fin } 
          });
        }
        if (new Date(`${pointageDate.toISOString().split('T')[0]}T${p.heure_debut}`) >= new Date(`${pointageDate.toISOString().split('T')[0]}T${p.heure_fin}`)) {
          return res.status(400).json({ code: 'INVALID_TIME', message: 'L\'heure de début doit être antérieure à l\'heure de fin.' });
        }
        if (p.pause !== undefined && (typeof p.pause !== 'number' || p.pause < 0)) {
          return res.status(400).json({ code: 'INVALID_PAUSE', message: 'La pause doit être un nombre positif ou zéro.' });
        }
        if (p.pause) {
          const heuresTravaillees = calculerHeuresTravaillees({ ...p, pause: 0 });
          console.log(`Validation pointage: date=${p.date}, debut=${p.heure_debut}, fin=${p.heure_fin}, pause=${p.pause}, heuresTravaillees=${heuresTravaillees}`);
          if (p.pause > heuresTravaillees) {
            return res.status(400).json({ 
              code: 'INVALID_PAUSE', 
              message: `La pause (${p.pause}h) ne peut pas dépasser la durée travaillée (${heuresTravaillees}h).`
            });
          }
        }
        const contratDoc = await Contrat.findById(contrat);
        if (!contratDoc) {
          return res.status(404).json({ code: 'CONTRACT_NOT_FOUND', message: 'Contrat non trouvé.' });
        }
        if (pointageDate < new Date(contratDoc.dateDebut)) {
          return res.status(400).json({ code: 'DATE_BEFORE_CONTRACT', message: 'La date du pointage est antérieure au début du contrat.' });
        }
      }
    }

    let absences = [];
    if (type && date && duree_jours) {
      const absenceDate = new Date(date);
      if (isNaN(absenceDate.getTime())) {
        return res.status(400).json({ code: 'INVALID_ABSENCE_DATE', message: 'Date d\'absence invalide.' });
      }
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 3);
      if (absenceDate > maxFutureDate) {
        return res.status(400).json({ code: 'FUTURE_ABSENCE', message: 'La date d\'absence ne peut pas être plus de 3 mois dans le futur.' });
      }
      const contratDoc = await Contrat.findById(contrat);
      if (!contratDoc) {
        return res.status(404).json({ code: 'CONTRACT_NOT_FOUND', message: 'Contrat non trouvé.' });
      }
      if (absenceDate < new Date(contratDoc.dateDebut)) {
        return res.status(400).json({ code: 'DATE_BEFORE_CONTRACT', message: 'La date d\'absence est antérieure au début du contrat.' });
      }
      absences.push({
        type,
        date,
        duree_jours: parseInt(duree_jours),
        commentaires: commentaires || '',
        justificatif: justificatif || undefined,
        statut: statut || 'en attente',
      });
    }

    if (!isValidObjectId(utilisateur) || !isValidObjectId(contrat)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant utilisateur ou contrat invalide.' });
    }

    const nouveauPointage = new Pointage({
      pointages: parsedPointages || [],
      absences,
      utilisateur,
      contrat,
    });

    await nouveauPointage.save();
    console.log(`Pointage créé: ${nouveauPointage._id}, Date: ${parsedPointages[0]?.date || 'N/A'}`);
    res.status(201).json(nouveauPointage);
  } catch (error) {
    console.error('Erreur création pointage:', error);
    res.status(400).json({ code: 'BAD_REQUEST', message: error.message });
  }
});

// Mettre à jour un pointage ou ajouter une absence
router.put('/:id', isAuthenticated, upload.single('justificatifFile'), async (req, res) => {
  try {
    const { pointages, type, date, duree_jours, commentaires, justificatifText, statut } = req.body;
    let justificatif = justificatifText || '';

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant pointage invalide.' });
    }

    if (req.file) {
      justificatif = `/Uploads/justificatifs/${req.file.filename}`;
    }

    const pointageDoc = await Pointage.findById(req.params.id);
    if (!pointageDoc) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Document pointage non trouvé.' });
    }

    if (pointages) {
      const parsedPointages = typeof pointages === 'string' ? JSON.parse(pointages) : pointages;
      if (!Array.isArray(parsedPointages)) {
        return res.status(400).json({ code: 'INVALID_POINTAGES', message: 'Les pointages doivent être un tableau.' });
      }
      for (const p of parsedPointages) {
        p.heure_debut = normalizeTime(p.heure_debut);
        p.heure_fin = normalizeTime(p.heure_fin);
        if (!p.date || !p.heure_debut || !p.heure_fin) {
          return res.status(400).json({ code: 'MISSING_FIELDS', message: 'Date, heure_debut, et heure_fin sont requis pour chaque pointage.' });
        }
        const pointageDate = new Date(p.date);
        if (isNaN(pointageDate.getTime())) {
          return res.status(400).json({ code: 'INVALID_DATE', message: 'Date de pointage invalide.' });
        }
        if (pointageDate > new Date()) {
          return res.status(400).json({ code: 'FUTURE_DATE', message: 'La date du pointage ne peut pas être dans le futur.' });
        }
        const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(p.heure_debut) || !timeRegex.test(p.heure_fin)) {
          return res.status(400).json({ 
            code: 'INVALID_TIME_FORMAT', 
            message: 'Format d\'heure invalide (doit être HH:mm).', 
            input: { heure_debut: p.heure_debut, heure_fin: p.heure_fin } 
          });
        }
        if (new Date(`${pointageDate.toISOString().split('T')[0]}T${p.heure_debut}`) >= new Date(`${pointageDate.toISOString().split('T')[0]}T${p.heure_fin}`)) {
          return res.status(400).json({ code: 'INVALID_TIME', message: 'L\'heure de début doit être antérieure à l\'heure de fin.' });
        }
        if (p.pause !== undefined && (typeof p.pause !== 'number' || p.pause < 0)) {
          return res.status(400).json({ code: 'INVALID_PAUSE', message: 'La pause doit être un nombre positif ou zéro.' });
        }
        if (p.pause) {
          const heuresTravaillees = calculerHeuresTravaillees({ ...p, pause: 0 });
          console.log(`Validation pointage: date=${p.date}, debut=${p.heure_debut}, fin=${p.heure_fin}, pause=${p.pause}, heuresTravaillees=${heuresTravaillees}`);
          if (p.pause > heuresTravaillees) {
            return res.status(400).json({ 
              code: 'INVALID_PAUSE', 
              message: `La pause (${p.pause}h) ne peut pas dépasser la durée travaillée (${heuresTravaillees}h).`
            });
          }
        }
        const contratDoc = await Contrat.findById(pointageDoc.contrat);
        if (pointageDate < new Date(contratDoc.dateDebut)) {
          return res.status(400).json({ code: 'DATE_BEFORE_CONTRACT', message: 'La date du pointage est antérieure au début du contrat.' });
        }
      }
      if (!parsedPointages[0]?._id || parsedPointages[0]._id === null) {
        pointageDoc.pointages.push(parsedPointages[0]);
      } else {
        const index = pointageDoc.pointages.findIndex(p => p._id.toString() === parsedPointages[0]._id);
        if (index !== -1) {
          pointageDoc.pointages[index] = parsedPointages[0];
        } else {
          pointageDoc.pointages.push(parsedPointages[0]);
        }
      }
    }

    if (type && date && duree_jours) {
      const absenceDate = new Date(date);
      if (isNaN(absenceDate.getTime())) {
        return res.status(400).json({ code: 'INVALID_ABSENCE_DATE', message: 'Date d\'absence invalide.' });
      }
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 3);
      if (absenceDate > maxFutureDate) {
        return res.status(400).json({ code: 'FUTURE_ABSENCE', message: 'La date d\'absence ne peut pas être plus de 3 mois dans le futur.' });
      }
      const contratDoc = await Contrat.findById(pointageDoc.contrat);
      if (absenceDate < new Date(contratDoc.dateDebut)) {
        return res.status(400).json({ code: 'DATE_BEFORE_CONTRACT', message: 'La date d\'absence est antérieure au début du contrat.' });
      }
      pointageDoc.absences.push({
        type,
        date,
        duree_jours: parseInt(duree_jours),
        commentaires: commentaires || '',
        justificatif: justificatif || undefined,
        statut: statut || 'en attente',
      });
    }

    await pointageDoc.save();
    console.log(`Pointage mis à jour: ${pointageDoc._id}, Date: ${parsedPointages[0]?.date || 'N/A'}`);
    res.status(200).json(pointageDoc);
  } catch (error) {
    console.error('Erreur mise à jour pointage:', error);
    res.status(400).json({ code: 'BAD_REQUEST', message: error.message });
  }
});

// Lire tous les pointages
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { utilisateur, contrat } = req.query;
    const query = {};

    // Filtrer par utilisateur (par défaut, utiliser l'utilisateur connecté)
    if (utilisateur && isValidObjectId(utilisateur)) {
      query.utilisateur = utilisateur;
    } else {
      query.utilisateur = req.userId;
    }

    // Filtrer par contrat si fourni
    if (contrat && isValidObjectId(contrat)) {
      query.contrat = contrat;
    }

    const pointages = await Pointage.find(query)
      .select('pointages absences contrat utilisateur mois_valides')
      .populate('utilisateur', 'nom prenom email')
      .populate('contrat', 'typeContrat intitulePoste')
      .lean();

    res.status(200).json(pointages);
  } catch (error) {
    console.error('Erreur lecture pointages:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la récupération des pointages.' });
  }
});

// Lire le contrat de l'utilisateur connecté
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const contrat = await Contrat.findOne({
      user: new mongoose.Types.ObjectId(req.userId),
      etat: 'signé',
    })
      .select('typeContrat intitulePoste _id')
      .populate('user', 'nom prenom email')
      .populate('entreprise', 'nomEntreprise')
      .lean();

    if (!contrat) {
      return res.status(404).json({ code: 'CONTRACT_NOT_FOUND', message: 'Aucun contrat actif trouvé pour cet utilisateur.' });
    }

    const responseData = {
      id: contrat._id,
      typeContrat: contrat.typeContrat,
      intitulePoste: contrat.intitulePoste,
      user: {
        nom: contrat.user.nom,
        prenom: contrat.user.prenom || '',
        email: contrat.user.email,
      },
      entreprise: {
        nomEntreprise: contrat.entreprise.nomEntreprise,
      },
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Erreur récupération contrat:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la récupération du contrat.' });
  }
});

// Lire les données des employés pour une entreprise
router.get('/entreprise', isAuthenticated, async (req, res) => {
  try {
    // Fetch all signed contracts for the enterprise
    const contratsSignes = await Contrat.find({ 
      etat: 'signé',
      entreprise: req.userId
    })
      .select('user intitulePoste _id dateDebut dateFin')
      .populate('user', 'nom email')
      .lean();

    if (contratsSignes.length === 0) {
      return res.status(200).json([]);
    }

    // Normalize dates to remove time component (convert to YYYY-MM-DD)
    contratsSignes.forEach(contrat => {
      if (contrat.dateDebut) {
        contrat.dateDebut = new Date(contrat.dateDebut).toISOString().split('T')[0];
      }
      if (contrat.dateFin) {
        contrat.dateFin = new Date(contrat.dateFin).toISOString().split('T')[0];
      }
    });

    // Group contracts by user
    const employesMap = new Map();
    contratsSignes.forEach(contrat => {
      if (contrat.user?._id) {
        const userId = contrat.user._id.toString();
        if (!employesMap.has(userId)) {
          employesMap.set(userId, {
            _id: contrat.user._id,
            nom: contrat.user.nom,
            email: contrat.user.email,
            contrats: []
          });
        }
        employesMap.get(userId).contrats.push({
          contratId: contrat._id,
          intitulePoste: contrat.intitulePoste,
          dateDebut: contrat.dateDebut,
          dateFin: contrat.dateFin,
          pointages: [],
          absences: [],
          mois_valides: [],
          fichesDePaie: []
        });
      }
    });

    // Fetch pointages and absences
    const pointages = await Pointage.find({
      utilisateur: { $in: Array.from(employesMap.keys()).map(id => new mongoose.Types.ObjectId(id)) }
    })
      .select('pointages absences mois_valides utilisateur contrat')
      .lean();

    // Distribute pointages, absences, and mois_valides to the correct contract
    pointages.forEach(pointage => {
      const userId = pointage.utilisateur?.toString();
      const contratId = pointage.contrat?.toString();
      if (employesMap.has(userId)) {
        const employee = employesMap.get(userId);
        const contrat = employee.contrats.find(c => c.contratId.toString() === contratId);
        if (contrat) {
          contrat.pointages.push(...(pointage.pointages || []));
          contrat.absences.push(...(pointage.absences || []));
          contrat.mois_valides.push(...(pointage.mois_valides || []));
        }
      }
    });

    // Fetch payslips and associate them with contracts
    for (const [userId, employee] of employesMap) {
      for (const contrat of employee.contrats) {
        const fiches = await FicheDePaie.find({ employe: userId, contrat: contrat.contratId })
          .select('salaireBrut salaireNet mois annee')
          .lean();
        contrat.fichesDePaie = fiches;
      }
    }

    const employes = Array.from(employesMap.values());
    res.status(200).json(employes);
  } catch (error) {
    console.error('Erreur récupération données employés:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la récupération des données des employés.' });
  }
});

// Lire les données des entreprises (admin) - Modified to only return contracts associated with the authenticated user
router.get('/admin/entreprises', isAuthenticated, async (req, res) => {
  try {
    const userId = req.userId; // Get the authenticated user's ID

    // Fetch all signed contracts where entreprise = userId
    const contratsSignes = await Contrat.find({ 
      etat: 'signé',
      entreprise: userId // Only contracts where entreprise matches the authenticated user
    })
      .select('user intitulePoste _id dateDebut dateFin entreprise')
      .populate('user', 'nom email')
      .populate('entreprise', 'nomEntreprise')
      .lean();

    if (contratsSignes.length === 0) {
      return res.status(200).json([]);
    }

    // Normalize dates to YYYY-MM-DD
    contratsSignes.forEach(contrat => {
      if (contrat.dateDebut) {
        contrat.dateDebut = new Date(contrat.dateDebut).toISOString().split('T')[0];
      }
      if (contrat.dateFin) {
        contrat.dateFin = new Date(contrat.dateFin).toISOString().split('T')[0];
      }
    });

    // Group by enterprise (though now there should only be one enterprise - the user's)
    const entreprisesMap = new Map();
    contratsSignes.forEach(contrat => {
      const entrepriseId = contrat.entreprise?._id?.toString();
      if (!entrepriseId) return;

      if (!entreprisesMap.has(entrepriseId)) {
        entreprisesMap.set(entrepriseId, {
          _id: contrat.entreprise._id,
          nomEntreprise: contrat.entreprise.nomEntreprise,
          employes: new Map()
        });
      }

      const userId = contrat.user?._id?.toString();
      if (userId) {
        const entreprise = entreprisesMap.get(entrepriseId);
        if (!entreprise.employes.has(userId)) {
          entreprise.employes.set(userId, {
            _id: contrat.user._id,
            nom: contrat.user.nom,
            email: contrat.user.email,
            contrats: []
          });
        }
        entreprise.employes.get(userId).contrats.push({
          contratId: contrat._id,
          intitulePoste: contrat.intitulePoste,
          dateDebut: contrat.dateDebut,
          dateFin: contrat.dateFin,
          pointages: [],
          absences: [],
          mois_valides: [],
          fichesDePaie: []
        });
      }
    });

    // Fetch pointages and absences for all users
    const userIds = Array.from(new Set(
      Array.from(entreprisesMap.values())
        .flatMap(entreprise => Array.from(entreprise.employes.keys()))
    )).map(id => new mongoose.Types.ObjectId(id));

    const pointages = await Pointage.find({ utilisateur: { $in: userIds } })
      .select('pointages absences mois_valides utilisateur contrat')
      .lean();

    // Distribute pointages, absences, and mois_valides
    pointages.forEach(pointage => {
      const userId = pointage.utilisateur?.toString();
      const contratId = pointage.contrat?.toString();
      entreprisesMap.forEach(entreprise => {
        if (entreprise.employes.has(userId)) {
          const employee = entreprise.employes.get(userId);
          const contrat = employee.contrats.find(c => c.contratId.toString() === contratId);
          if (contrat) {
            contrat.pointages.push(...(pointage.pointages || []));
            contrat.absences.push(...(pointage.absences || []));
            contrat.mois_valides.push(...(pointage.mois_valides || []));
          }
        }
      });
    });

    // Fetch payslips
    for (const entreprise of entreprisesMap.values()) {
      for (const employee of entreprise.employes.values()) {
        for (const contrat of employee.contrats) {
          const fiches = await FicheDePaie.find({ 
            employe: employee._id, 
            contrat: contrat.contratId 
          })
            .select('salaireBrut salaireNet mois annee')
            .lean();
          contrat.fichesDePaie = fiches;
        }
      }
    }

    // Convert Map to array
    const entreprises = Array.from(entreprisesMap.values()).map(entreprise => ({
      ...entreprise,
      employes: Array.from(entreprise.employes.values())
    }));

    res.status(200).json(entreprises);
  } catch (error) {
    console.error('Erreur récupération données entreprises:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la récupération des données.' });
  }
});


// Get contract by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant contrat invalide.' });
    }

    const contract = await Contrat.findById(id)
      .populate('user', 'nom prenom email')
      .populate('entreprise', 'nomEntreprise adresseEntreprise')
      .populate('offre', 'titre description')
      .lean();

    if (!contract) {
      return res.status(404).json({ code: 'CONTRACT_NOT_FOUND', message: 'Contrat non trouvé.' });
    }

    // Optional: Restrict access to authorized users (e.g., contract owner, enterprise, or admin)
    if (contract.user._id.toString() !== req.userId && contract.entreprise._id.toString() !== req.userId) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Accès non autorisé à ce contrat.' });
    }

    res.status(200).json(contract);
  } catch (error) {
    console.error('Erreur récupération contrat:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la récupération du contrat.' });
  }
});

// Supprimer un pointage
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant pointage invalide.' });
    }
    const pointage = await Pointage.findByIdAndDelete(req.params.id);
    if (!pointage) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Pointage non trouvé.' });
    }
    res.status(200).json({ message: 'Pointage supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur suppression pointage:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la suppression du pointage.' });
  }
});

// Valider un pointage
router.patch('/validate/:id', isAuthenticated, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant pointage invalide.' });
    }
    const pointage = await Pointage.findOne({ 'pointages._id': req.params.id });
    if (!pointage) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Aucun pointage trouvé avec cet identifiant.' });
    }
    const targetPointage = pointage.pointages.id(req.params.id);
    if (!targetPointage) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Pointage non trouvé dans le document.' });
    }
    if (targetPointage.statut !== 'en attente') {
      return res.status(400).json({ code: 'ALREADY_PROCESSED', message: 'Ce pointage a déjà été traité.' });
    }
    if (new Date(targetPointage.date) > new Date()) {
      return res.status(400).json({ code: 'FUTURE_DATE', message: 'La date du pointage ne peut pas être dans le futur.' });
    }

    targetPointage.heure_debut = normalizeTime(targetPointage.heure_debut);
    targetPointage.heure_fin = normalizeTime(targetPointage.heure_fin);

    console.log(`Validation pointage: id=${req.params.id}, date=${targetPointage.date}, debut=${targetPointage.heure_debut}, fin=${targetPointage.heure_fin}, pause=${targetPointage.pause}`);

    const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(targetPointage.heure_debut) || !timeRegex.test(targetPointage.heure_fin)) {
      return res.status(400).json({ 
        code: 'INVALID_TIME_FORMAT', 
        message: 'Format d\'heure invalide (doit être HH:mm).', 
        input: { heure_debut: targetPointage.heure_debut, heure_fin: targetPointage.heure_fin } 
      });
    }

    if (targetPointage.heure_fin && new Date(`${targetPointage.date.toISOString().split('T')[0]}T${targetPointage.heure_debut}`) >= new Date(`${targetPointage.date.toISOString().split('T')[0]}T${targetPointage.heure_fin}`)) {
      return res.status(400).json({ code: 'INVALID_TIME', message: 'L\'heure de début doit être antérieure à l\'heure de fin.' });
    }

    const contratDoc = await Contrat.findById(pointage.contrat);
    if (new Date(targetPointage.date) < new Date(contratDoc.dateDebut)) {
      return res.status(400).json({ code: 'DATE_BEFORE_CONTRACT', message: 'La date du pointage est antérieure au début du contrat.' });
    }

    targetPointage.statut = 'validé';
    await pointage.save();
    console.log(`Pointage validé: ${targetPointage._id}, Date: ${targetPointage.date}`);
    res.status(200).json(pointage);
  } catch (error) {
    console.error('Erreur validation pointage:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la validation du pointage.' });
  }
});

// Rejeter un pointage
router.patch('/reject/:id', isAuthenticated, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant pointage invalide.' });
    }
    const pointage = await Pointage.findOne({ 'pointages._id': req.params.id });
    if (!pointage) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Aucun pointage trouvé avec cet identifiant.' });
    }
    const targetPointage = pointage.pointages.id(req.params.id);
    if (!targetPointage) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Pointage non trouvé dans le document.' });
    }
    if (targetPointage.statut !== 'en attente') {
      return res.status(400).json({ code: 'ALREADY_PROCESSED', message: 'Ce pointage a déjà été traité.' });
    }
    targetPointage.statut = 'rejeté';
    await pointage.save();
    console.log(`Pointage rejeté: ${targetPointage._id}, Date: ${targetPointage.date}`);
    res.status(200).json(pointage);
  } catch (error) {
    console.error('Erreur rejet pointage:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors du rejet du pointage.' });
  }
});

// Valider une absence
router.patch('/absences/validate/:id', isAuthenticated, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant absence invalide.' });
    }
    const pointage = await Pointage.findOne({ 'absences._id': req.params.id });
    if (!pointage) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Aucune absence trouvée avec cet identifiant.' });
    }
    const targetAbsence = pointage.absences.id(req.params.id);
    if (!targetAbsence) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Absence non trouvée dans le document.' });
    }
    if (targetAbsence.statut !== 'en attente') {
      return res.status(400).json({ code: 'ALREADY_PROCESSED', message: 'Cette absence a déjà été traitée.' });
    }
    const contratDoc = await Contrat.findById(pointage.contrat);
    if (new Date(targetAbsence.date) < new Date(contratDoc.dateDebut)) {
      return res.status(400).json({ code: 'DATE_BEFORE_CONTRACT', message: 'La date d\'absence est antérieure au début du contrat.' });
    }
    targetAbsence.statut = 'validé';
    await pointage.save();
    console.log(`Absence validée: ${targetAbsence._id}, Date: ${targetAbsence.date}`);
    res.status(200).json(pointage);
  } catch (error) {
    console.error('Erreur validation absence:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la validation de l\'absence.' });
  }
});

// Rejeter une absence
router.patch('/absences/reject/:id', isAuthenticated, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant absence invalide.' });
    }
    const pointage = await Pointage.findOne({ 'absences._id': req.params.id });
    if (!pointage) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Aucune absence trouvée avec cet identifiant.' });
    }
    const targetAbsence = pointage.absences.id(req.params.id);
    if (!targetAbsence) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Absence non trouvée dans le document.' });
    }
    if (targetAbsence.statut !== 'en attente') {
      return res.status(400).json({ code: 'ALREADY_PROCESSED', message: 'Cette absence a déjà été traitée.' });
    }
    targetAbsence.statut = 'rejeté';
    await pointage.save();
    console.log(`Absence rejetée: ${targetAbsence._id}, Date: ${targetAbsence.date}`);
    res.status(200).json(pointage);
  } catch (error) {
    console.error('Erreur rejet absence:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors du rejet de l\'absence.' });
  }
});

// Récupérer les fiches de paie pour un employé et un contrat
router.get('/fiche-de-paie/employee/:userId/:contratId', isAuthenticated, async (req, res) => {
  try {
    const { userId, contratId } = req.params;
    if (!isValidObjectId(userId) || !isValidObjectId(contratId)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiants invalides.' });
    }

    const fiches = await FicheDePaie.find({ employe: userId, contrat: contratId })
      .select('salaireBrut salaireNet mois annee deductions details')
      .populate('employe', 'nom prenom')
      .populate('contrat', 'intitulePoste')
      .lean();
    res.status(200).json(fiches);
  } catch (error) {
    console.error('Erreur récupération fiches:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la récupération des fiches de paie.' });
  }
});

// Générer et télécharger une fiche de paie en PDF
router.get('/fiche-de-paie/:id/pdf', isAuthenticated, async (req, res) => {
  try {
    const ficheId = req.params.id;
    if (!isValidObjectId(ficheId)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant fiche de paie invalide.' });
    }

    const fiche = await FicheDePaie.findById(ficheId)
      .populate('employe', 'nom prenom email')
      .populate('contrat', 'intitulePoste salaire')
      .lean();

    if (!fiche) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Fiche de paie non trouvée.' });
    }

    const doc = new PDFDocument({ margin: 50 });
    const pdfPath = path.join(__dirname, '../Uploads/fiches', `${ficheId}.pdf`);
    const pdfDir = path.dirname(pdfPath);

    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(pdfPath));

    doc.fontSize(20).text('Fiche de Paie', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Période: ${fiche.mois}/${fiche.annee}`, { align: 'left' });
    doc.text(`Employé: ${fiche.employe.nom} ${fiche.employe.prenom || ''}`, { align: 'left' });
    doc.text(`Poste: ${fiche.contrat.intitulePoste}`, { align: 'left' });
    doc.moveDown();

    doc.fontSize(14).text('Détails du salaire', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Salaire brut: ${fiche.salaireBrut.toFixed(2)} €`);
    doc.text(`Salaire net: ${fiche.salaireNet.toFixed(2)} €`);
    doc.text(`Heures normales: ${parseFloat(fiche.details.heuresNormales || 0).toFixed(3)} h`);
    doc.text(`Heures supplémentaires: ${parseFloat(fiche.details.heuresSupplementaires || 0).toFixed(3)} h`);
    doc.text(`Taux horaire: ${fiche.details.tauxHoraire.toFixed(2)} €/h`);
    doc.moveDown();

    doc.fontSize(14).text('Déductions', { underline: true });
    doc.moveDown(0.5);
    fiche.deductions.forEach((deduction) => {
      doc.fontSize(12).text(`${deduction.libelle}: ${deduction.montant.toFixed(2)} €`);
    });
    doc.moveDown();

    if (fiche.details.absences.length > 0 || fiche.details.congesPayes > 0) {
      doc.fontSize(14).text('Absences', { underline: true });
      doc.moveDown(0.5);
      if (fiche.details.congesPayes > 0) {
        doc.fontSize(12).text(`congé payé: ${fiche.details.congesPayes} jour(s)`);
      }
      fiche.details.absences.forEach((absence, index) => {
        if (absence && typeof absence === 'object' && absence.type && absence.jours !== undefined) {
          doc.fontSize(12).text(`${absence.type}: ${absence.jours} jour(s)`);
        } else {
          console.warn(`Données d'absence invalides à l'index ${index}:`, absence);
          doc.fontSize(12).text('Absence invalide');
        }
      });
    }

    doc.end();

    const ficheDoc = await FicheDePaie.findById(ficheId);
    ficheDoc.pdfPath = `/Uploads/fiches/${ficheId}.pdf`;
    await ficheDoc.save();

    res.download(pdfPath, `fiche_de_paie_${fiche.mois}_${fiche.annee}.pdf`, (err) => {
      if (err) {
        console.error('Erreur envoi PDF:', err);
        res.status(500).json({ code: 'PDF_ERROR', message: 'Erreur lors de l\'envoi du PDF.' });
      }
    });
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    res.status(500).json({ code: 'SERVER_ERROR', message: 'Erreur serveur lors de la génération du PDF.' });
  }
});

// Calculer les heures travaillées
function calculerHeuresTravaillees(pointage) {
  if (!pointage.heure_debut || !pointage.heure_fin) {
    console.warn(`Pointage incomplet: manque heure_debut ou heure_fin pour ${pointage.date}`);
    return 0;
  }

  const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(pointage.heure_debut) || !timeRegex.test(pointage.heure_fin)) {
    console.warn(`Format d'heure invalide: ${pointage.heure_debut} ou ${pointage.heure_fin}`);
    return 0;
  }

  const dateStr = new Date(pointage.date).toISOString().split('T')[0];
  const debut = new Date(`${dateStr}T${pointage.heure_debut}:00`);
  let fin = new Date(`${dateStr}T${pointage.heure_fin}:00`);

  if (fin <= debut) {
    fin.setDate(fin.getDate() + 1);
  }

  if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
    console.warn(`Heures invalides: ${pointage.heure_debut} -> ${pointage.heure_fin}`);
    return 0;
  }

  let totalMinutes = (fin - debut) / (1000 * 60);
  let pauseMinutes = 0;
  if (pointage.pause) {
    const heuresTravaillees = totalMinutes / 60;
    if (pointage.pause > heuresTravaillees) {
      console.warn(`Pause incohérente: ${pointage.pause} h > durée travaillée (${heuresTravaillees} h)`);
    } else {
      pauseMinutes = pointage.pause * 60;
    }
  }

  totalMinutes -= pauseMinutes;
  const heures = Math.max(totalMinutes / 60, 0);
  console.log(`Heures calculées pour ${pointage.date}: ${heures.toFixed(3)} h (début: ${pointage.heure_debut}, fin: ${pointage.heure_fin}, pause: ${pointage.pause || 0}h)`);
  return heures;
}

// Calculer les éléments de paie
async function calculerElementsPaie(pointages, absences, contrat, primes = []) {
  try {
    const salaireBase = extractSalaireBrut(contrat.salaire);
    if (salaireBase <= 0) {
      throw new Error('Salaire de base invalide ou manquant dans le contrat.');
    }

    const contratStart = new Date(contrat.dateDebut);
    const contratEnd = contrat.dateFin ? new Date(contrat.dateFin) : new Date(8640000000000000);

    for (const p of pointages) {
      if (p.date && new Date(p.date) < contratStart) {
        throw new Error(`Pointage du ${p.date} antérieur au début du contrat (${contrat.dateDebut}).`);
      }
      if (p.date && new Date(p.date) > contratEnd) {
        throw new Error(`Pointage du ${p.date} postérieur à la fin du contrat (${contrat.dateFin}).`);
      }
    }
    for (const a of absences) {
      if (a.date && new Date(a.date) < contratStart) {
        throw new Error(`Absence du ${a.date} antérieure au début du contrat (${contrat.dateDebut}).`);
      }
      if (a.date && new Date(a.date) > contratEnd) {
        throw new Error(`Absence du ${a.date} postérieure à la fin du contrat (${contrat.dateFin}).`);
      }
    }

    const JOURS_TRAVAILLES_MOIS = 22;
    const HEURES_MENSUELLES = 151.67;
    const TAUX_HORAIRE = salaireBase / HEURES_MENSUELLES;

    let heuresNormales = 0;
    let heuresSupplementaires = 0;
    let congesPayes = 0;
    let deductionsAbsences = 0;
    let deductionsPenalites = 0;
    const absencesCalcul = [];
    let joursNonJustifies = 0;
    const joursTravailles = new Set();
    const joursAbsences = new Set();

    // Aggregate hours per day
    const heuresParJour = {};
    pointages.filter(p => p.statut === 'validé').forEach(p => {
      const heuresTravaillees = calculerHeuresTravaillees(p);
      const dateKey = new Date(p.date).toISOString().split('T')[0];
      heuresParJour[dateKey] = (heuresParJour[dateKey] || 0) + heuresTravaillees;
      joursTravailles.add(dateKey);
    });

    // Process hours and calculate penalties
    Object.entries(heuresParJour).forEach(([date, heures]) => {
      heuresNormales += parseFloat(Math.min(heures, 8).toFixed(6));
      heuresSupplementaires += parseFloat(Math.max(heures - 8, 0).toFixed(6));
      if (heures < 7) {
        const heuresManquantes = 7 - heures;
        deductionsPenalites += parseFloat((heuresManquantes * TAUX_HORAIRE).toFixed(2));
        console.log(`Pénalité pour ${date}: ${heuresManquantes}h manquantes, montant: ${(heuresManquantes * TAUX_HORAIRE).toFixed(2)}€`);
      }
    });

    // Process validated absences
    absences.filter(a => a.statut === 'validé').forEach(a => {
      const joursAbsence = parseFloat(a.duree_jours);
      const dateAbs = new Date(a.date);

      if (a.type === 'congé payé') {
        congesPayes += joursAbsence;
        absencesCalcul.push({ 
          type: a.type, 
          jours: joursAbsence,
          justificatif: a.justificatif || null
        });
      } else if (a.type && !isNaN(joursAbsence)) {
        absencesCalcul.push({ 
          type: a.type, 
          jours: joursAbsence,
          justificatif: a.justificatif || null
        });
        deductionsAbsences += parseFloat((joursAbsence * (salaireBase / JOURS_TRAVAILLES_MOIS)).toFixed(2));
      }

      for (let i = 0; i < joursAbsence; i++) {
        const dateKey = new Date(dateAbs);
        dateKey.setDate(dateAbs.getDate() + i);
        joursAbsences.add(dateKey.toISOString().split('T')[0]);
      }
    });

    // Calculate unjustified absences
    const currentDate = pointages[0]?.date ? new Date(pointages[0].date) : new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];

      if (JOURS_FERIES.includes(dateKey) || date.getDay() === 0 || date.getDay() === 6 || date < contratStart) {
        console.log(`Jour exclu: ${dateKey} (férié: ${JOURS_FERIES.includes(dateKey)}, week-end: ${date.getDay() === 0 || date.getDay() === 6}, avant contrat: ${date < contratStart})`);
        continue;
      }

      workingDays++;
      if (!joursTravailles.has(dateKey) && !joursAbsences.has(dateKey)) {
        joursNonJustifies++;
        deductionsAbsences += parseFloat((salaireBase / JOURS_TRAVAILLES_MOIS).toFixed(2));
        console.log(`Jour non justifié détecté: ${dateKey}, déduction: ${(salaireBase / JOURS_TRAVAILLES_MOIS).toFixed(2)}€`);
      }
    }

    console.log(`Total jours ouvrables: ${workingDays}, jours non justifiés: ${joursNonJustifies}`);

    const montantHeuresSupp = parseFloat((heuresSupplementaires * (TAUX_HORAIRE * 1.25)).toFixed(2));
    const totalPrimes = primes.reduce((sum, prime) => sum + (prime.montant || 0), 0);
    const salaireHeures = parseFloat((heuresNormales * TAUX_HORAIRE).toFixed(2));
    
    const totalBrut = Math.max(salaireHeures + montantHeuresSupp + totalPrimes - deductionsAbsences - deductionsPenalites, 0);
    const cotisations = parseFloat((totalBrut * 0.23).toFixed(2));
    const netAPayer = parseFloat((totalBrut - cotisations).toFixed(2));

    const deductions = [
      { libelle: 'Absences non justifiées', montant: parseFloat((joursNonJustifies * (salaireBase / JOURS_TRAVAILLES_MOIS)).toFixed(2)) },
      ...absencesCalcul.filter(a => a.type !== 'congé payé').map(absence => ({
        libelle: `Absence ${absence.type}`,
        montant: parseFloat((absence.jours * (salaireBase / JOURS_TRAVAILLES_MOIS)).toFixed(2))
      })),
      ...(deductionsPenalites > 0 ? [{ libelle: 'Pénalité heures manquantes', montant: parseFloat(deductionsPenalites.toFixed(2)) }] : []),
      { libelle: 'Cotisations sociales', montant: cotisations }
    ].filter(d => d.montant > 0);

    console.log(`Calcul paie: heures normales=${heuresNormales.toFixed(3)}h, heures supp=${heuresSupplementaires.toFixed(3)}h, brut=${totalBrut.toFixed(2)}€, net=${netAPayer.toFixed(2)}€`);

    return {
      heuresNormales: parseFloat(heuresNormales.toFixed(3)),
      heuresSupplementaires: parseFloat(heuresSupplementaires.toFixed(3)),
      congesPayes,
      absences: absencesCalcul,
      joursNonJustifies,
      deductions,
      totalBrut,
      netAPayer,
      tauxHoraire: parseFloat(TAUX_HORAIRE.toFixed(2)),
      primes,
      salaireBase
    };
  } catch (error) {
    console.error('Erreur calcul paie:', error);
    throw error;
  }
}

// Valider le mois
router.patch('/validate-month/:userId/:contratId', isAuthenticated, async (req, res) => {
  try {
    const { userId, contratId } = req.params;
    const { monthYear } = req.body;

    if (!isValidObjectId(userId) || !isValidObjectId(contratId)) {
      return res.status(400).json({ code: 'INVALID_ID', message: 'Identifiant utilisateur ou contrat invalide.' });
    }

    if (!monthYear || !monthYear.match(/^\d{1,2}\/\d{4}$/)) {
      return res.status(400).json({ code: 'INVALID_FORMAT', message: 'Format de mois invalide. Utilisez MM/YYYY.' });
    }

    const [month, year] = monthYear.split('/').map(Number);
    if (month < 1 || month > 12) {
      return res.status(400).json({ code: 'INVALID_MONTH', message: 'Mois invalide (doit être entre 1 et 12).' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59); // dernier jour du mois

    const pointageDocs = await Pointage.find({
      utilisateur: userId,
      contrat: contratId,
    })
      .select('pointages absences mois_valides contrat')
      .populate('contrat', 'salaire dateDebut dateFin fichesDePaie');

    if (!pointageDocs.length) {
      return res.status(404).json({ code: 'TIMESHEET_NOT_FOUND', message: 'Aucun pointage trouvé pour cet utilisateur et contrat.' });
    }

    const contrat = await Contrat.findById(contratId)
      .select('salaire dateDebut dateFin fichesDePaie entreprise user')
      .populate('entreprise', 'nomEntreprise')
      .populate('user', 'nom prenom');

    if (!contrat) {
      return res.status(404).json({ code: 'CONTRACT_NOT_FOUND', message: 'Contrat non trouvé.' });
    }

    if (extractSalaireBrut(contrat.salaire) <= 0) {
      return res.status(400).json({ code: 'INVALID_SALARY', message: 'Le salaire du contrat est invalide ou manquant.' });
    }

    // Vérification si la fin du mois saisi est antérieure au début du contrat
    if (endOfMonth < new Date(contrat.dateDebut)) {
      return res.status(400).json({ code: 'INVALID_MONTH', message: 'Le mois est antérieur au début du contrat.' });
    }

    const isMonthValidated = pointageDocs.some(doc => 
      doc.mois_valides.some(m => m.mois === monthYear && m.statut === 'validé')
    );
    if (isMonthValidated) {
      return res.status(400).json({ code: 'MONTH_ALREADY_VALIDATED', message: `Le mois ${monthYear} est déjà validé.` });
    }

    const allPointages = pointageDocs.flatMap(doc => doc.pointages);
    const allAbsences = pointageDocs.flatMap(doc => doc.absences);

    const filterByMonth = (items) => items.filter(item => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      if (isNaN(itemDate.getTime())) return false;
      return itemDate >= startDate && itemDate <= endOfMonth && item.statut === 'validé';
    });

    const monthPointages = filterByMonth(allPointages);
    const monthAbsences = filterByMonth(allAbsences).filter(a => a !== null);

    const pendingItems = [...allPointages, ...allAbsences].filter(
      item => item.date >= startDate && item.date <= endOfMonth && item.statut === 'en attente'
    );

    if (pendingItems.length > 0) {
      return res.status(400).json({
        code: 'PENDING_ITEMS',
        message: 'Impossible de valider le mois - éléments en attente.',
        details: { count: pendingItems.length }
      });
    }

    const calculs = await calculerElementsPaie(monthPointages, monthAbsences, contrat);

    const ficheDePaie = new FicheDePaie({
      salaireBrut: calculs.totalBrut,
      salaireNet: calculs.netAPayer,
      totalHeures: calculs.heuresNormales + calculs.heuresSupplementaires,
      heuresSupplementaires: calculs.heuresSupplementaires,
      deductions: calculs.deductions,
      annee: year,
      mois: month,
      employe: userId,
      contrat: contratId,
      details: {
        heuresNormales: parseFloat(calculs.heuresNormales.toFixed(3)),
        heuresSupplementaires: parseFloat(calculs.heuresSupplementaires.toFixed(3)),
        congesPayes: calculs.congesPayes,
        absences: calculs.absences,
        joursNonJustifies: calculs.joursNonJustifies,
        tauxHoraire: calculs.tauxHoraire,
        primes: calculs.primes,
        salaireBase: calculs.salaireBase
      }
    });

    await ficheDePaie.save();

    const pointageDoc = pointageDocs[0] || new Pointage({ utilisateur: userId, contrat: contratId, mois_valides: [] });
    const existingMonthIndex = pointageDoc.mois_valides.findIndex(m => m.mois === monthYear);

    if (existingMonthIndex >= 0) {
      pointageDoc.mois_valides[existingMonthIndex] = {
        ...pointageDoc.mois_valides[existingMonthIndex].toObject(),
        statut: 'validé',
        date_validation: new Date(),
        pointages: monthPointages.length,
        absences: monthAbsences.length
      };
    } else {
      pointageDoc.mois_valides.push({
        mois: monthYear,
        statut: 'validé',
        date_validation: new Date(),
        pointages: monthPointages.length,
        absences: monthAbsences.length
      });
    }

    contrat.fichesDePaie.push(ficheDePaie._id);

    await Promise.all([pointageDoc.save(), contrat.save()]);

    console.log(`Mois ${monthYear} validé pour utilisateur ${userId}, contrat ${contratId}. Fiche de paie: ${ficheDePaie._id}`);

    res.json({
      success: true,
      message: `Mois ${monthYear} validé avec succès.`,
      validation: {
        mois: monthYear,
        date: new Date(),
        pointages: monthPointages.length,
        absences: monthAbsences.length
      },
      paie: {
        brut: calculs.totalBrut,
        net: calculs.netAPayer,
        heuresNormales: calculs.heuresNormales,
        heuresSupp: calculs.heuresSupplementaires,
        joursNonJustifies: calculs.joursNonJustifies
      },
      ficheId: ficheDePaie._id
    });
  } catch (error) {
    console.error('Erreur validation mois:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la validation du mois.',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

module.exports = router;