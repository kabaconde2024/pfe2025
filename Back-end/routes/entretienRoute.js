const express = require('express');
const router = express.Router();
const Entretien = require('../models/Entretien');
const Notification = require('../models/Notification');
const Utilisateur = require('../models/Utilisateur');
const Candidature = require("../models/candidature");
const Profil = require("../models/Profil");
const Offre = require('../models/Offre');
const AnnonceCandidat =require('../models/AnnonceCandidat');
const isAuthenticated = require('../middlewares/auth');
const mongoose = require('mongoose');
const multer = require('multer');

router.use(express.json({ limit: '100mb' }));

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', isAuthenticated, async (req, res) => {
    const { candidature_id, candidat_id, offre_id, date_entretien, meet_link } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(candidat_id)) {
            return res.status(400).json({ success: false, message: "ID candidat non valide" });
        }

        const [offre, utilisateur, candidature] = await Promise.all([
            Offre.findById(offre_id),
            Utilisateur.findById(candidat_id),
            Candidature.findById(candidature_id)
        ]);

        if (!offre) return res.status(404).json({ success: false, message: "Offre non trouvée" });
        if (!utilisateur) return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        if (!candidature) return res.status(404).json({ success: false, message: "Candidature non trouvée" });

        const entretien = new Entretien({
            type: 'CANDIDATURE',
            candidature_id,
            candidat_id,
            offre_id,
            date_entretien,
            meet_link,
            notes: '',
            resultat: 'En attente',
            statut: 'Planifié',
            createdBy: req.userId,
            entreprise_id: req.userId
        });

        await entretien.save();

        // Mettre à jour la candidature avec l'ID de l'entretien
        candidature.entretien = entretien._id;
        if (candidature.statut !== 'Acceptée') {
            candidature.statut = 'Acceptée';
        }
        candidature.updatedBy = req.userId;
        await candidature.save();

        const notification = new Notification({
            user_id: candidat_id,
            entreprise_id: req.userId,
            type: 'ENTRETIEN_PLANIFIE',
            data: {
                entretien_id: entretien._id,
                date_entretien,
                meet_link,
                offre_id,
                offre_titre: offre.titre,
                entreprise_id: req.userId,
                message: `Bonjour ${utilisateur.nom}, un entretien a été planifié pour le ${new Date(date_entretien).toLocaleDateString('fr-FR')} concernant l'offre "${offre.titre}". Lien de la réunion : ${meet_link}`
            },
            candidature_id,
            read: false,
            createdBy: req.userId
        });

        await notification.save();

        res.status(201).json({
            success: true,
            message: "Entretien planifié avec succès",
            data: {
                entretien,
                notification,
                candidature_updated: candidature.statut === 'Acceptée'
            }
        });

    } catch (error) {
        console.error("Erreur création entretien:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
});

router.post('/from-annonce', isAuthenticated, async (req, res) => {
    const { candidat_id, annonce_id, date_entretien, meet_link } = req.body;

    try {
        console.log("Données reçues:", {
            candidat_id,
            annonce_id,
            date_entretien,
            meet_link
        });

        if (!mongoose.Types.ObjectId.isValid(candidat_id)) {
            console.error("ID candidat non valide:", candidat_id);
            return res.status(400).json({ success: false, message: "ID candidat non valide" });
        }

        if (!mongoose.Types.ObjectId.isValid(annonce_id)) {
            console.error("ID annonce non valide:", annonce_id);
            return res.status(400).json({ success: false, message: "ID annonce non valide" });
        }

        if (!date_entretien || isNaN(new Date(date_entretien).getTime())) {
            console.error("Date d'entretien invalide:", date_entretien);
            return res.status(400).json({ success: false, message: "Date d'entretien invalide" });
        }

        if (!meet_link || !meet_link.match(/^https?:\/\/.+/)) {
            console.error("Lien de réunion invalide:", meet_link);
            return res.status(400).json({ success: false, message: "Lien de réunion invalide" });
        }

        const [candidat, annonce] = await Promise.all([
            Utilisateur.findById(candidat_id),
            AnnonceCandidat.findById(annonce_id)
        ]);

        if (!candidat) {
            console.error("Candidat non trouvé pour l'ID:", candidat_id);
            return res.status(404).json({ success: false, message: "Candidat non trouvé" });
        }

        if (!annonce) {
            console.error("Annonce non trouvée pour l'ID:", annonce_id);
            return res.status(404).json({ success: false, message: "Annonce non trouvée" });
        }

        const entretien = await Entretien.create({
            type: 'ANNONCE',
            candidat_id,
            annonce_id,
            date_entretien,
            meet_link,
            statut: 'Planifié',
            notes: '',
            resultat: 'En attente',
            createdBy: req.userId,
            entreprise_id: req.userId
        });

        // Mettre à jour l'annonce avec l'ID de l'entretien
        annonce.entretien = entretien._id;
        await annonce.save();

        const notification = await Notification.create({
            user_id: candidat_id,
            entreprise_id: req.userId,
            type: 'ENTRETIEN_PLANIFIE',
            data: {
                entretien_id: entretien._id,
                annonce_id,
                date: date_entretien,
                meet_link,
                message: `Bonjour ${candidat.nom || 'Candidat'}, après avoir consulté votre annonce, nous sommes impressionnés par votre profil et souhaitons vous rencontrer. Un entretien est programmé le ${new Date(date_entretien).toLocaleDateString('fr-FR')} à ${new Date(date_entretien).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Lien de la réunion : ${meet_link}`
            },
            read: false,
            createdBy: req.userId
        });

        res.status(201).json({
            success: true,
            message: "Entretien créé avec succès",
            data: { entretien, notification, annonce_updated: !!annonce.entretien }
        });

    } catch (error) {
        console.error('Erreur création entretien:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
});


router.get('/check/:candidature_id', async (req, res) => {
  try {
    const { candidature_id } = req.params;
    const entretien = await Entretien.findOne({ candidature_id: candidature_id });

    if (entretien) {
      return res.status(200).json({
        planned: true,
        meet_link: entretien.meet_link,
        entretien_id: entretien._id,
        date_entretien: entretien.date_entretien // Add this field
      });
    } else {
      return res.status(200).json({ planned: false });
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de l'entretien:", error);
    res.status(500).json({ message: "Erreur lors de la vérification de l'entretien" });
  }
});

// Vérifier un entretien par annonce_id
router.get('/check/annonce/:annonce_id', async (req, res) => {
    try {
        const { annonce_id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(annonce_id)) {
            console.error("ID annonce non valide:", annonce_id);
            return res.status(400).json({ message: "ID annonce non valide" });
        }

        const entretien = await Entretien.findOne({
            annonce_id: annonce_id,
            statut: 'Planifié'
        });

        if (entretien) {
            return res.status(200).json({
                planned: true,
                meet_link: entretien.meet_link,
                date_entretien: entretien.date_entretien
            });
        } else {
            return res.status(200).json({ planned: false });
        }
    } catch (error) {
        console.error("Erreur lors de la vérification de l'entretien pour l'annonce:", error);
        res.status(500).json({ message: "Erreur lors de la vérification de l'entretien pour l'annonce" });
    }
});

// Obtenir tous les entretiens avec un résultat positif
router.get('/', async (req, res) => {
    try {
        const entretiens = await Entretien.find({ resultat: 'Positif' })
            .populate({ path: 'candidature_id', populate: { path: 'candidat', model: 'Utilisateur' } });

        res.status(200).send(entretiens);
    } catch (error) {
        console.error("Erreur lors de la récupération des entretiens:", error);
        res.status(500).send({ message: 'Erreur lors de la récupération des entretiens' });
    }
});

router.get("/positifs-annonce", isAuthenticated, async (req, res) => {
  try {
    // Log pour débogage
    console.log("Récupération des entretiens positifs de type ANNONCE pour utilisateur:", req.userId);

    const entretiens = await Entretien.find({
      type: "ANNONCE",
      resultat: "Positif",
    })
      .populate({
        path: "candidat_id",
        select: "nom prenom email",
      })
      .populate({
        path: "entreprise_id",
        select: "nomEntreprise adresseEntreprise",
      })
      .populate({
        path: "annonce_id",
        select: "titre metier typeContrat",
        options: {
          transform: (doc) => ({
            ...doc,
            typeEmploi: doc.typeContrat,
          }),
        },
      })
      .select("type date_entretien resultat candidat_id entreprise_id annonce_id");

    // Log des entretiens trouvés
    console.log("Entretiens trouvés:", JSON.stringify(entretiens, null, 2));

    // Filtrer les enregistrements incomplets
    const validEntretiens = entretiens.filter(
      (entretien) =>
        entretien.candidat_id && entretien.entreprise_id && entretien.annonce_id
    );

    if (validEntretiens.length < entretiens.length) {
      console.warn(
        `Filtré ${entretiens.length - validEntretiens.length} entretiens incomplets`
      );
    }

    res.status(200).json({
      success: true,
      count: validEntretiens.length,
      data: validEntretiens,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des entretiens:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
});

router.get("/entreprise", isAuthenticated, async (req, res) => {
    try {
        const entrepriseId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(entrepriseId)) {
            return res.status(400).json({
                success: false,
                message: "ID entreprise non valide",
            });
        }

        // Fetch company offers
        const offres = await Offre.find({ entreprise: entrepriseId }).select('_id').lean();
        const offreIds = offres.map(offre => offre._id);

        // Fetch interviews for both CANDIDATURE and ANNONCE types
        const entretiens = await Entretien.find({
            $or: [
                { offre_id: { $in: offreIds } }, // CANDIDATURE interviews
                { entreprise_id: entrepriseId, type: 'ANNONCE' } // ANNONCE interviews
            ]
        })
            .populate({
                path: 'candidat_id',
                select: 'nom prenom email',
                model: 'Utilisateur'
            })
            .populate({
                path: 'offre_id',
                select: 'titre localisation',
                model: 'Offre'
            })
            .populate({
                path: 'candidature_id',
                select: 'statut',
                model: 'Candidature'
            })
            .populate({
                path: 'annonce_id',
                select: 'titre',
                model: 'AnnonceCandidat' // Ensure model name matches registration
            })
            .sort({ date_entretien: 1 })
            .lean();

        const result = entretiens.map(entretien => {
            try {
                return {
                    ...entretien,
                    candidat_nom: entretien.candidat_id?.nom || 'Candidat inconnu',
                    candidat_prenom: entretien.candidat_id?.prenom || '',
                    offre_titre: entretien.type === 'CANDIDATURE'
                        ? (entretien.offre_id?.titre || 'Offre inconnue')
                        : (entretien.annonce_id?.titre || 'Annonce inconnue'),
                    statut_candidature: entretien.candidature_id?.statut || 'N/A'
                };
            } catch (mapError) {
                console.error(`Erreur lors du mappage de l'entretien ${entretien._id}:`, mapError);
                return null;
            }
        }).filter(entretien => entretien !== null);

        res.status(200).json({
            success: true,
            count: result.length,
            data: result
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des entretiens:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
});

// Obtenir tous les entretiens avec les données liées peuplées
router.get('/all', async (req, res) => {
    try {
        const entretiens = await Entretien.find()
            .populate({ path: 'candidat_id', model: 'Utilisateur', select: 'nom prenom email' })
            .populate({ path: 'offre_id', model: 'Offre', select: 'titre entreprise localisation' })
            .populate({ path: 'candidature_id', model: 'Candidature', select: 'cv lettre_motivation' })
            .sort({ date_entretien: 1 });

        res.status(200).json({ success: true, count: entretiens.length, data: entretiens });
    } catch (error) {
        console.error("Erreur lors de la récupération des entretiens:", error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des entretiens', error: error.message });
    }
});

router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const { notes, resultat } = req.body;

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'ID d\'entretien invalide' });
        }

        if (!['Positif', 'Négatif', 'En attente'].includes(resultat)) {
            return res.status(400).json({ success: false, message: 'Résultat invalide' });
        }

        const entretien = await Entretien.findByIdAndUpdate(
            req.params.id,
            { notes: notes?.substring(0, 1000), resultat, statut: 'Terminé', updated_at: Date.now() },
            { new: true, runValidators: true }
        )
            .populate('candidat_id', 'nom prenom email')
            .populate('offre_id', 'titre entreprise localisation')
            .populate('annonce_id', 'titre')
            .populate('entreprise_id', 'nomEntreprise');

        if (!entretien) {
            return res.status(404).json({ success: false, message: 'Entretien non trouvé' });
        }

        if (!entretien.candidat_id) {
            console.error(`Candidat non trouvé pour l'entretien ${entretien._id}`);
            return res.status(400).json({ success: false, message: 'Candidat non trouvé' });
        }

        if (entretien.type === 'ANNONCE' && !entretien.annonce_id) {
            console.error(`Annonce non trouvée pour l'entretien ${entretien._id}`);
            return res.status(400).json({ success: false, message: 'Annonce non trouvée' });
        }

        // Determine title based on interview type
        const title = entretien.type === 'CANDIDATURE'
            ? (entretien.offre_id?.titre || 'Offre inconnue')
            : (entretien.annonce_id?.titre || 'Annonce inconnue');

        // Create notification message
        let message;
        if (resultat === 'Positif') {
            message = `Bonjour ${entretien.candidat_id?.nom || 'Candidat'},\n\n` +
                `Nous avons le plaisir de vous informer que vous avez réussi votre entretien pour ${title}.\n` +
                `Félicitations ! Nous vous informerons bientôt des prochaines étapes du processus de recrutement.\n\n` +
                `Remarque : ${notes || 'Aucun commentaire'}\n\n` +
                `Merci pour votre participation et votre intérêt !`;
        } else {
            message = `Bonjour ${entretien.candidat_id?.nom || 'Candidat'},\n\n` +
                `Nous regrettons de vous informer que votre entretien pour ${title} n'a pas été concluant.\n` +
                `Nous vous remercions d'avoir pris le temps de participer et vous encourageons à postuler à d'autres opportunités à l'avenir.\n\n` +
                `Commentaires : ${notes || 'Aucun commentaire'}\n\n`;
        }

        // Create candidate notification
        const candidateNotification = new Notification({
            user_id: entretien.candidat_id._id,
            entreprise_id: req.userId,
            type: 'ENTRETIEN_EVALUE',
            data: { entretien_id: entretien._id, message },
            candidature_id: entretien.type === 'CANDIDATURE' ? entretien.candidature_id : null,
            offre_id: entretien.type === 'CANDIDATURE' ? entretien.offre_id : null,
            annonce_id: entretien.type === 'ANNONCE' ? entretien.annonce_id : null,
            createdBy: req.userId
        });

        await candidateNotification.save();
        console.log('Notification ENTRETIEN_EVALUE enregistrée pour le candidat:', entretien.candidat_id._id);

        // Handle positive result for contract preparation
        if (resultat === 'Positif') {
            console.log('Résultat positif détecté, tentative d\'envoi de PREPARER_CONTRAT');
            const adminProfil = await Profil.findOne({ name: 'Admin' });
            console.log('Profil Admin trouvé:', adminProfil ? adminProfil : 'Aucun profil Admin');

            if (!adminProfil) {
                console.warn('Profil "Admin" non trouvé');
            } else {
                const adminsViaProfils = await Utilisateur.find({ profils: adminProfil._id });
                const adminsViaUsers = await Utilisateur.find({ _id: { $in: adminProfil.users || [] } });

                const admins = [...new Set([
                    ...adminsViaProfils.map(admin => admin._id.toString()),
                    ...adminsViaUsers.map(admin => admin._id.toString())
                ])].map(id => new mongoose.Types.ObjectId(id));

                console.log('Admins trouvés via profils:', adminsViaProfils.length, adminsViaProfils.map(admin => admin._id));
                console.log('Admins trouvés via users:', adminsViaUsers.length, adminsViaUsers.map(admin => admin._id));
                console.log('Admins combinés:', admins.length, admins);

                if (admins.length === 0) {
                    console.warn('Aucun utilisateur administrateur trouvé pour le profil "Admin".');
                } else {
                    const adminUsers = await Utilisateur.find({ _id: { $in: admins } });
                    const adminNotifications = adminUsers.map(admin => {
                        const notification = new Notification({
                            user_id: admin._id,
                            entreprise_id: req.userId,
                            type: 'PREPARER_CONTRAT',
                            data: {
                                title: 'PREPARER_CONTRAT',
                                body: `L'entretien pour le candidat ${entretien.candidat_id?.nom || 'Inconnu'} pour ${title} chez ${entretien.entreprise_id?.nomEntreprise || 'Entreprise inconnue'} a un résultat positif. Veuillez préparer le contrat.`,                                offre_id: entretien.type === 'CANDIDATURE' ? entretien.offre_id : null,
                                candidature_id: entretien.type === 'CANDIDATURE' ? entretien.candidature_id : null,
                                annonce_id: entretien.type === 'ANNONCE' ? entretien.annonce_id : null,
                                entretien_id: entretien._id,
                                candidat_id: entretien.candidat_id._id,
                            },
                            candidature_id: entretien.type === 'CANDIDATURE' ? entretien.candidature_id : null,
                            offre_id: entretien.type === 'CANDIDATURE' ? entretien.offre_id : null,
                            annonce_id: entretien.type === 'ANNONCE' ? entretien.annonce_id : null,
                            createdBy: req.userId
                        });
                        console.log('Création notification PREPARER_CONTRAT pour admin:', admin._id);
                        return notification.save();
                    });

                    await Promise.all(adminNotifications);
                    console.log(`Notifications PREPARER_CONTRAT envoyées à ${adminUsers.length} administrateurs pour l'entretien ${entretien._id}`);
                }
            }
        }

        res.status(200).json({ success: true, data: entretien });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de l'entretien ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de l\'entretien', error: error.message });
    }
});

// Route pour replanifier un entretien
router.put('/reschedule/:id', isAuthenticated, async (req, res) => {
    const { date_entretien, meet_link } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "ID d'entretien invalide" });
        }

        if (!date_entretien || isNaN(new Date(date_entretien).getTime())) {
            return res.status(400).json({ success: false, message: "Date d'entretien invalide" });
        }
        if (!meet_link || !meet_link.match(/^https?:\/\/.+/)) {
            return res.status(400).json({ success: false, message: "Lien de réunion invalide" });
        }

        const entretien = await Entretien.findById(req.params.id)
            .populate('candidat_id', 'nom prenom email')
            .populate('offre_id', 'titre')
            .populate('candidature_id');

        if (!entretien) {
            return res.status(404).json({ success: false, message: "Entretien non trouvé" });
        }

        if (entretien.entreprise_id.toString() !== req.userId) {
            return res.status(403).json({ success: false, message: "Non autorisé à modifier cet entretien" });
        }

        entretien.date_entretien = date_entretien;
        entretien.meet_link = meet_link;
        entretien.updated_at = Date.now();
        entretien.updatedBy = req.userId;

        await entretien.save();

        const notification = new Notification({
            user_id: entretien.candidat_id._id,
            entreprise_id: req.userId,
            type: 'ENTRETIEN_PLANIFIE',
            data: {
                entretien_id: entretien._id,
                date_entretien,
                meet_link,
                offre_id: entretien.offre_id?._id,
                offre_titre: entretien.offre_id?.titre,
                message: `Bonjour ${entretien.candidat_id.nom}, votre entretien pour l'offre "${entretien.offre_id?.titre}" a été replanifié pour le ${new Date(date_entretien).toLocaleDateString('fr-FR')} à ${new Date(date_entretien).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Lien de la réunion : ${meet_link}`
            },
            candidature_id: entretien.candidature_id?._id,
            read: false,
            createdBy: req.userId
        });

        await notification.save();

        res.status(200).json({
            success: true,
            message: "Entretien replanifié avec succès",
            data: { entretien, notification }
        });

    } catch (error) {
        console.error("Erreur lors de la replanification de l'entretien:", error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
});

// Obtenir un entretien par ID
router.get('/:id', async (req, res) => {
    try {
        const entretien = await Entretien.findById(req.params.id);
        if (!entretien) {
            return res.status(404).send();
        }
        res.status(200).send(entretien);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Patch un entretien par ID
router.patch('/:id', async (req, res) => {
    try {
        const entretien = await Entretien.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!entretien) {
            return res.status(404).send();
        }
        res.status(200).send(entretien);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Supprimer un entretien par ID
router.delete('/:id', async (req, res) => {
    try {
        const entretien = await Entretien.findByIdAndDelete(req.params.id);
        if (!entretien) {
            return res.status(404).send();
        }
        res.status(200).send(entretien);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;