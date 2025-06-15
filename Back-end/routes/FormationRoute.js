const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Formation = require('../models/Formation');
const Utilisateur = require('../models/Utilisateur');
const Notification = require('../models/Notification');
const Progression = require('../models/Progression');
const isAuthenticated = require('../middlewares/auth');

// Route to fetch planning for a specific formation
router.get('/:id/planning', isAuthenticated, async (req, res) => {
  try {
    const formationId = req.params.id;
    if (!mongoose.isValidObjectId(formationId)) {
      return res.status(400).json({ success: false, message: 'ID de formation invalide' });
    }

    const formation = await Formation.findById(formationId)
      .populate('formateur', 'nom prenom competences')
      .lean();

    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation non trouvée' });
    }

    // Restrict access to entreprise, employee, or formateur
    const authorizedUsers = [
      formation.entreprise.toString(),
      formation.employee.toString(),
      formation.formateur._id.toString()
    ];

    if (!authorizedUsers.includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit : vous n\'êtes pas autorisé à consulter ce calendrier'
      });
    }

    // Format formateur and formation data for calendar
    const formateurs = [{
      id: formation.formateur._id.toString(),
      nom: formation.formateur.nom,
      prenom: formation.formateur.prenom,
      competences: formation.formateur.competences || [],
      formations: [{
        id: formation._id.toString(),
        titre: formation.titre,
        debut: formation.horaire?.debut || formation.horaire?.date,
        fin: formation.horaire?.fin || formation.horaire?.date
      }]
    }];

    res.status(200).json({ success: true, formateurs });
  } catch (error) {
    console.error('Erreur lors de la récupération du planning:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Existing routes (unchanged except for minor authorization enhancements)
router.get('/coachs-formateurs', isAuthenticated, async (req, res) => {
  try {
    const coachsFormateurs = await Utilisateur.find({
      role: { $in: ['Coach', 'Formateur'] },
      estActif: true
    }).select('nom email role');
    res.status(200).json({ success: true, data: coachsFormateurs });
  } catch (error) {
    console.error('Erreur lors de la récupération des coachs/formateurs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Authenticated user ID:', req.userId);

    const requiredFields = ['titre', 'description', 'modalite', 'mission', 'typeFormation', 'formateur'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        console.log(`Champ manquant: ${field}`);
        return res.status(400).json({ success: false, message: `Le champ ${field} est obligatoire` });
      }
    }

    if (['presentiel', 'hybride'].includes(req.body.modalite) && (!req.body.lieu || req.body.lieu.trim() === '')) {
      console.log('Lieu invalide pour modalite:', req.body.modalite);
      return res.status(400).json({ success: false, message: 'Le lieu est requis et ne peut pas être vide pour les formations en présentiel ou hybrides' });
    }
    if (['virtuel', 'hybride'].includes(req.body.modalite) && !req.body.meetLink) {
      console.log('MeetLink manquant pour modalite:', req.body.modalite);
      return res.status(400).json({ success: false, message: 'Le lien Meet est requis pour les formations virtuelles ou hybrides' });
    }
    if (req.body.meetLink && !/^https:\/\/meet\.google\.com\/[a-z0-9-]+$/.test(req.body.meetLink)) {
      console.log('MeetLink invalide:', req.body.meetLink);
      return res.status(400).json({ success: false, message: 'Lien Google Meet invalide' });
    }
    if (['presentiel', 'virtuel', 'hybride'].includes(req.body.modalite)) {
      if (req.body.modalite === 'presentiel') {
        if (!req.body.horaire?.debut || !req.body.horaire?.fin) {
          console.log('Horaire incomplet pour présentiel:', req.body.horaire);
          return res.status(400).json({ success: false, message: 'Les dates de début et de fin sont requises pour les formations en présentiel' });
        }
        const now = new Date();
        const debut = new Date(req.body.horaire.debut);
        const fin = new Date(req.body.horaire.fin);
        if (debut < now) {
          console.log('Date de début dans le passé:', debut);
          return res.status(400).json({ success: false, message: 'La date de début ne peut pas être dans le passé' });
        }
        if (fin <= debut) {
          console.log('Date de fin invalide:', fin, 'par rapport à', debut);
          return res.status(400).json({ success: false, message: 'La date de fin doit être postérieure à la date de début' });
        }
      } else if (['virtuel', 'hybride'].includes(req.body.modalite)) {
        if (!req.body.horaire?.date) {
          console.log('Horaire incomplet pour virtuel/hybride:', req.body.horaire);
          return res.status(400).json({ success: false, message: 'La date et l\'heure sont requises pour les formations virtuelles ou hybrides' });
        }
        const now = new Date();
        const date = new Date(req.body.horaire.date);
        if (date < now) {
          console.log('Date dans le passé:', date);
          return res.status(400).json({ success: false, message: 'La date ne peut pas être dans le passé' });
        }
      }
    }
    if (req.body.modalite === 'contenu' && (!req.body.contenus || req.body.contenus.length === 0)) {
      console.log('Contenus vides pour modalite contenu');
      return res.status(400).json({ success: false, message: 'Au moins un contenu est requis pour les formations de type contenu' });
    }

    if (!mongoose.isValidObjectId(req.body.mission)) {
      console.log('Mission ID invalide:', req.body.mission);
      return res.status(400).json({ success: false, message: 'ID de mission invalide' });
    }

    const missionExists = await mongoose.model('Mission')
      .findById(req.body.mission)
      .select('employee entreprise titre')
      .populate('employee', '_id')
      .populate('entreprise', '_id');
    if (!missionExists) {
      console.log('Mission non trouvée:', req.body.mission);
      return res.status(400).json({ success: false, message: 'La mission spécifiée n\'existe pas' });
    }
    if (!missionExists.employee || !missionExists.entreprise) {
      console.log('Mission sans employé ou entreprise:', missionExists);
      return res.status(400).json({ success: false, message: 'La mission doit avoir un employé et une entreprise associés' });
    }

    const formateurExists = await mongoose.model('Utilisateur').findById(req.body.formateur);
    if (!formateurExists || !['Coach', 'Formateur'].includes(formateurExists.role)) {
      console.log('Formateur invalide:', req.body.formateur);
      return res.status(400).json({ success: false, message: 'Le formateur spécifié n\'est pas valide' });
    }

    if (req.body.contenus) {
      for (const contenu of req.body.contenus) {
        if (!contenu.typeContenu || !contenu.url) {
          console.log('Contenu invalide:', contenu);
          return res.status(400).json({ success: false, message: 'Champs typeContenu et url obligatoires pour contenus' });
        }
      }
    }

    if (missionExists.entreprise._id.toString() !== req.userId) {
      console.log('Utilisateur non autorisé:', req.userId, 'n\'est pas', missionExists.entreprise._id);
      return res.status(403).json({ success: false, message: 'Seule l\'entreprise associée à la mission peut créer une formation' });
    }

    const formationData = {
      titre: req.body.titre,
      description: req.body.description,
      creePar: req.userId,
      horaire: req.body.horaire || undefined,
      modalite: req.body.modalite,
      lieu: req.body.lieu || undefined,
      meetLink: req.body.meetLink || undefined,
      mission: req.body.mission,
      entreprise: missionExists.entreprise._id,
      employee: missionExists.employee._id,
      formateur: req.body.formateur,
      statut: req.body.statut || 'brouillon',
      typeFormation: req.body.typeFormation,
      contenus: req.body.contenus || []
    };

    const nouvelleFormation = new mongoose.model('Formation')(formationData);
    await nouvelleFormation.save();

    // Notification pour l'employé
    if (missionExists.employee && mongoose.isValidObjectId(missionExists.employee._id)) {
      try {
        const employeeExists = await mongoose.model('Utilisateur').findById(missionExists.employee._id);
        if (employeeExists) {
          const notificationMessage = `Une nouvelle formation "${req.body.titre}" a été créée pour votre mission "${missionExists.titre}".` +
            (req.body.modalite === 'virtuel' || req.body.modalite === 'hybride' ? ` Lien Meet: ${req.body.meetLink || 'Non fourni'}` : '') +
            (req.body.modalite === 'presentiel' || req.body.modalite === 'hybride' ? ` Lieu: ${req.body.lieu || 'Non fourni'}` : '') +
            (req.body.modalite === 'contenu' ? ` Contenus disponibles pour consultation.` : '');
          
          const employeeNotification = new mongoose.model('Notification')({
            user_id: missionExists.employee._id,
            entreprise_id: missionExists.entreprise._id,
            type: 'NEW_FORMATION',
            data: { message: notificationMessage },
            formation_id: nouvelleFormation._id,
            read: false,
            created_at: new Date(),
          });
          await employeeNotification.save();
        }
      } catch (notificationError) {
        console.error('Erreur lors de la création de la notification pour l\'employé:', notificationError);
      }
    }

    // Notification pour le coach (formateur)
    if (formateurExists && mongoose.isValidObjectId(req.body.formateur)) {
      try {
        const coachNotificationMessage = `Vous avez été assigné en tant que coach pour la nouvelle formation "${req.body.titre}" pour la mission "${missionExists.titre}".` +
          (req.body.modalite === 'virtuel' || req.body.modalite === 'hybride' ? ` Lien Meet: ${req.body.meetLink || 'Non fourni'}` : '') +
          (req.body.modalite === 'presentiel' || req.body.modalite === 'hybride' ? ` Lieu: ${req.body.lieu || 'Non fourni'}` : '') +
          (req.body.modalite === 'contenu' ? ` Contenus à superviser.` : '');
        
        const coachNotification = new mongoose.model('Notification')({
          user_id: req.body.formateur,
          entreprise_id: missionExists.entreprise._id,
          type: 'NEW_FORMATION_ASSIGNMENT',
          data: { message: coachNotificationMessage },
          formation_id: nouvelleFormation._id,
          read: false,
          created_at: new Date(),
        });
        await coachNotification.save();
      } catch (notificationError) {
        console.error('Erreur lors de la création de la notification pour le coach:', notificationError);
      }
    }

    const populatedFormation = await mongoose.model('Formation').findById(nouvelleFormation._id)
      .populate('formateur', 'nom email role')
      .populate('mission', 'titre')
      .populate('entreprise', 'nom userId')
      .populate('employee', 'nom userId');

    res.status(201).json({
      success: true,
      message: 'Formation créée avec succès',
      data: populatedFormation
    });
  } catch (error) {
    console.error('Erreur lors de la création de la formation:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: 'Erreur de validation', errors: messages });
    }
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation non trouvée' });
    }

    // Restrict updates to entreprise only
    if (formation.entreprise.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Seule l\'entreprise associée peut modifier cette formation'
      });
    }

    const updates = req.body;
    if (updates.horaire) {
      formation.horaire = { ...formation.horaire, ...updates.horaire };
    }
    if (updates.horaire?.debut && updates.horaire?.fin) {
      if (new Date(updates.horaire.fin) <= new Date(updates.horaire.debut)) {
        return res.status(400).json({
          success: false,
          message: 'La date de fin doit être postérieure à la date de début'
        });
      }
    }
    if (updates.mission) {
      if (!mongoose.isValidObjectId(updates.mission)) {
        return res.status(400).json({ success: false, message: 'ID de mission invalide' });
      }
      const missionExists = await mongoose.model('Mission').findById(updates.mission);
      if (!missionExists) {
        return res.status(400).json({ success: false, message: 'La mission spécifiée n\'existe pas' });
      }
      formation.mission = updates.mission;
    }
    if (updates.formateur) {
      if (!mongoose.isValidObjectId(updates.formateur)) {
        return res.status(400).json({ success: false, message: 'ID de formateur invalide' });
      }
      const formateurExists = await Utilisateur.findById(updates.formateur);
      if (!formateurExists || !['Coach', 'Formateur'].includes(formateurExists.role)) {
        return res.status(400).json({ success: false, message: 'Le formateur spécifié n\'est pas valide' });
      }
      formation.formateur = updates.formateur;
    }
    if (updates.contenus) {
      for (const contenu of updates.contenus) {
        if (!contenu.typeContenu || !contenu.url) {
          return res.status(400).json({ success: false, message: 'Champs typeContenu et url obligatoires pour contenus' });
        }
      }
      formation.contenus = updates.contenus;
    }
    if (updates.modalite) {
      formation.modalite = updates.modalite;
      if (['presentiel', 'hybride'].includes(updates.modalite) && (!updates.lieu || updates.lieu.trim() === '')) {
        return res.status(400).json({ success: false, message: 'Le lieu est requis et ne peut pas être vide pour les formations en présentiel ou hybrides' });
      }
      if (['virtuel', 'hybride'].includes(updates.modalite) && !updates.meetLink) {
        return res.status(400).json({ success: false, message: 'Le lien Meet est requis pour les formations virtuelles ou hybrides' });
      }
      if (updates.modalite === 'contenu' && (!updates.contenus || updates.contenus.length === 0)) {
        return res.status(400).json({ success: false, message: 'Au moins un contenu est requis pour les formations de type contenu' });
      }
      if (updates.meetLink && !/^https:\/\/meet\.google\.com\/[a-z0-9-]+$/.test(updates.meetLink)) {
        return res.status(400).json({ success: false, message: 'Lien Google Meet invalide' });
      }
      formation.lieu = updates.lieu || undefined;
      formation.meetLink = updates.meetLink || undefined;
    }

    if (updates.titre) formation.titre = updates.titre;
    if (updates.description) formation.description = updates.description;
    if (updates.statut) formation.statut = updates.statut;
    if (updates.typeFormation) formation.typeFormation = updates.typeFormation;

    await formation.save();
    const updatedFormation = await Formation.findById(formation._id)
      .populate('creePar', 'nom prenom email')
      .populate('mission', 'titre')
      .populate('formateur', 'nom email role');

    res.json({ success: true, data: updatedFormation });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: 'Erreur de validation', errors: messages });
    }
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/seances', isAuthenticated, async (req, res) => {
  try {
    const seances = await Formation.find({
      'horaire.debut': { $exists: true },
      statut: { $in: ['planifie', 'en-cours'] },
      $or: [
        { entreprise: req.userId },
        { employee: req.userId },
        { formateur: req.userId }
      ]
    })
      .select('titre horaire modalite typeFormation formateur')
      .populate('formateur', 'nom email role')
      .sort({ 'horaire.debut': 1 });

    res.status(200).json({ success: true, data: seances });
  } catch (error) {
    console.error('Erreur lors de la récupération des séances:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { 
      statut, modalite, typeFormation, apres, avant, sortBy, search,
      limit = 10, skip = 0, createdBy, mission, formateur
    } = req.query;

    const match = {
      $or: [
        { entreprise: new mongoose.Types.ObjectId(req.userId) },
        { employee: new mongoose.Types.ObjectId(req.userId) },
        { formateur: new mongoose.Types.ObjectId(req.userId) }
      ]
    };
    if (statut) match.statut = { $in: statut.split(',') };
    if (modalite) match.modalite = { $in: modalite.split(',') };
    if (typeFormation) match.typeFormation = { $in: typeFormation.split(',') };
    if (apres) match['horaire.debut'] = { $gte: new Date(apres) };
    if (avant) match['horaire.fin'] = { $lte: new Date(avant) };
    if (search) {
      match.$or = [
        { titre: { $regex: search, $options: 'i' },
        description: { $regex: search, $options: 'i' } },
        { $or: match.$or }
      ];
    }
    if (createdBy && mongoose.isValidObjectId(createdBy)) match.creePar = new mongoose.Types.ObjectId(createdBy);
    if (mission && mongoose.isValidObjectId(mission)) match.mission = new mongoose.Types.ObjectId(mission);
    if (formateur && mongoose.isValidObjectId(formateur)) match.formateur = new mongoose.Types.ObjectId(formateur);

    const sort = sortBy ? { [sortBy.split(':')[0]]: sortBy.split(':')[1] === 'desc' ? -1 : 1 } : { 'horaire.debut': -1 };

    const [formations, total] = await Promise.all([
      Formation.find(match)
        .sort(sort)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate('creePar', 'nom prenom email')
        .populate('mission', 'titre')
        .populate('formateur', 'nom email role')
        .populate('entreprise', 'nom userId')
        .populate('employee', 'nom userId')
        .lean(),
      Formation.countDocuments(match)
    ]);

    const results = formations.map(formation => {
      if (formation.horaire?.debut && formation.horaire?.fin) {
        formation.dureeHeures = Math.round(
          (new Date(formation.horaire.fin) - new Date(formation.horaire.debut)) / (1000 * 60 * 60)
        );
      }
      return formation;
    });

    res.json({
      success: true,
      data: results,
      pagination: {
        total,
        count: results.length,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des formations:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation non trouvée' });
    }

    if (formation.entreprise.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Seule l\'entreprise associée peut supprimer cette formation'
      });
    }

    await Formation.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: formation });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.post('/:id/contenus', isAuthenticated, async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation non trouvée' });
    }

    if (formation.entreprise.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Seule l\'entreprise associée peut ajouter du contenu'
      });
    }

    const { typeContenu, url, titre, description } = req.body;
    if (!typeContenu || !url || !titre) {
      return res.status(400).json({ success: false, message: 'Type, URL et titre sont obligatoires' });
    }

    const contenu = { typeContenu, url, titre, description, dateAjout: new Date() };
    formation.contenus.push(contenu);
    await formation.save();

    res.status(201).json({ success: true, message: 'Contenu ajouté avec succès', data: contenu });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du contenu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.get('/:id/contenus', isAuthenticated, async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation non trouvée' });
    }

    if (![formation.entreprise.toString(), formation.employee.toString(), formation.formateur.toString()].includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit : vous n\'êtes pas autorisé à consulter ces contenus'
      });
    }

    res.json({ success: true, data: formation.contenus });
  } catch (error) {
    console.error('Erreur lors de la récupération des contenus:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.get('/mes-formations', isAuthenticated, async (req, res) => {
  try {
    const missions = await mongoose.model('Mission').find({
      employee: req.userId,
    }).select('_id');

    if (missions.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Aucune mission trouvée pour cet employé.',
      });
    }

    const formations = await Formation.find({
      mission: { $in: missions.map(m => m._id) },
      employee: req.userId
    })
      .populate('formateur', 'nom email role')
      .populate('mission', 'titre')
      .lean();

    const results = formations.map(formation => {
      if (formation.horaire?.debut && formation.horaire?.fin) {
        formation.dureeHeures = Math.round(
          (new Date(formation.horaire.fin) - new Date(formation.horaire.debut)) / (1000 * 60 * 60)
        );
      }
      return formation;
    });

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des formations de l\'employé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
});

router.get('/mes-formations-coach', isAuthenticated, async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.userId).select('role');
    if (!user || !['Coach', 'Formateur'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit : seul un utilisateur avec le rôle Coach ou Formateur peut accéder à cette ressource',
      });
    }

    const formations = await Formation.find({
      formateur: req.userId,
    })
      .populate('formateur', 'nom email role')
      .populate('mission', 'titre')
      .populate('entreprise', 'nom userId')
      .populate('employee', 'nom userId')
      .lean();

    const results = formations.map(formation => {
      if (formation.horaire?.debut && formation.horaire?.fin) {
        formation.dureeHeures = Math.round(
          (new Date(formation.horaire.fin) - new Date(formation.horaire.debut)) / (1000 * 60 * 60)
        );
      }
      return formation;
    });

    res.status(200).json({
      success: true,
      data: results,
      message: formations.length === 0 ? 'Aucune formation assignée à ce coach.' : undefined,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des formations du coach:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
});

router.post('/:id/progression', isAuthenticated, async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation non trouvée' });
    }

    if (formation.employee.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'employé associé peut enregistrer la progression'
      });
    }

    const { contenuId, completed } = req.body;
    if (!formation.contenus.find(c => c._id.toString() === contenuId)) {
      return res.status(400).json({ success: false, message: 'Contenu non trouvé dans la formation' });
    }
    let progression = await Progression.findOne({
      formation: req.params.id,
      employee: formation.employee,
      contenu: contenuId,
    });
    if (!progression) {
      progression = new Progression({
        formation: req.params.id,
        employee: formation.employee,
        contenu: contenuId,
        completed,
        completedAt: completed ? new Date() : null,
      });
    } else {
      progression.completed = completed;
      progression.completedAt = completed ? new Date() : null;
    }
    await progression.save();
    res.status(200).json({ success: true, message: 'Progression mise à jour', data: progression });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

router.get('/:id/progression', isAuthenticated, async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Formation non trouvée' });
    }

    if (![formation.entreprise.toString(), formation.employee.toString(), formation.formateur.toString()].includes(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit : vous n\'êtes pas autorisé à consulter la progression'
      });
    }

    const progressions = await Progression.find({
      formation: req.params.id,
      employee: formation.employee,
    }).lean();
    const progressionMap = progressions.reduce((acc, p) => {
      acc[p.contenu.toString()] = p;
      return acc;
    }, {});
    const contenusProgress = formation.contenus.map(contenu => ({
      ...contenu._doc,
      completed: progressionMap[contenu._id.toString()]?.completed || false,
      completedAt: progressionMap[contenu._id.toString()]?.completedAt || null,
    }));
    res.status(200).json({ success: true, data: contenusProgress });
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;