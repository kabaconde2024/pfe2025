const express = require("express");
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const authenticateToken = require('../middlewares/auth');
const Candidature = require("../models/candidature");
const Offre = require("../models/Offre");
const ProfilCv = require("../models/ProfilCv");
const router = express.Router();
const fs = require('fs');
const Notification = require('../models/Notification');

// Configuration de Multer pour le stockage en mémoire
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
        files: 3 // Maximum 3 fichiers (CV + vidéo + lettre)
    },
    fileFilter: (req, file, cb) => {
        const allowedTypesCv = [
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const allowedTypesVideo = [
            'video/mp4', 
            'video/x-msvideo', 
            'video/x-flv', 
            'video/x-matroska', 
            'video/webm'
        ];
        const allowedTypesLettre = ['application/pdf'];

        if (file.fieldname === 'cv') {
            if (allowedTypesCv.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Seuls les fichiers PDF, DOC et DOCX sont autorisés pour le CV'), false);
            }
        } else if (file.fieldname === 'videoMotivation') {
            if (allowedTypesVideo.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Seuls les formats MP4, AVI, FLV, MKV et WEBM sont autorisés pour la vidéo'), false);
            }
        } else if (file.fieldname === 'lettreMotivation') {
            if (allowedTypesLettre.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Seuls les fichiers PDF sont autorisés pour la lettre de motivation'), false);
            }
        } else {
            cb(new Error('Champ de fichier non reconnu'), false);
        }
    }
});

// Postuler à une offre
router.post('/', 
    authenticateToken, 
    upload.fields([
        { name: 'cv', maxCount: 1 },
        { name: 'videoMotivation', maxCount: 1 },
        { name: 'lettreMotivation', maxCount: 1 }
    ]), 
    async (req, res) => {
        try {
            const { offre, profilCv } = req.body;
            const userId = req.userId;

            // Validation des données
            if (!mongoose.Types.ObjectId.isValid(offre)) {
                return res.status(400).json({ error: "ID d'offre invalide" });
            }

            if (!mongoose.Types.ObjectId.isValid(profilCv)) {
                return res.status(400).json({ error: "ID de profil CV invalide" });
            }

            // Vérification de l'existence des entités
            const [offreExistante, profilExistante] = await Promise.all([
                Offre.findById(offre),
                ProfilCv.findOne({ _id: profilCv, user: userId })
            ]);

            if (!offreExistante) {
                return res.status(404).json({ error: "Offre non trouvée" });
            }

            if (!profilExistante) {
                return res.status(404).json({ error: "Profil CV non trouvé ou non autorisé" });
            }

            // Vérifier si l'utilisateur a déjà postulé à cette offre
            const candidatureExistante = await Candidature.findOne({ 
                offre: offre, 
                candidat: userId 
            });

            if (candidatureExistante) {
                return res.status(409).json({ error: "Vous avez déjà postulé à cette offre" });
            }

            // Préparation des données de la candidature
            const candidatureData = {
                offre,
                candidat: userId,
                profilCv
            };

            // Gestion du CV
            if (req.files['cv']) {
                const cvFile = req.files['cv'][0];
                candidatureData.cv = {
                    data: cvFile.buffer,
                    contentType: cvFile.mimetype,
                    originalName: cvFile.originalname,
                    size: cvFile.size
                };
            } else if (!profilExistante.cv) {
                return res.status(400).json({ error: "Un CV est requis pour postuler" });
            } else {
                candidatureData.cv = {
                    data: profilExistante.cv.data,
                    contentType: profilExistante.cv.contentType,
                    originalName: profilExistante.cv.originalName,
                    size: profilExistante.cv.size
                };
            }

            // Gestion de la vidéo de motivation (optionnelle)
            if (req.files['videoMotivation']) {
                const videoFile = req.files['videoMotivation'][0];
                candidatureData.videoMotivation = {
                    data: videoFile.buffer,
                    contentType: videoFile.mimetype,
                    originalName: videoFile.originalname,
                    size: videoFile.size
                };
            }

            // Gestion de la lettre de motivation (optionnelle)
            if (req.files['lettreMotivation']) {
                const lettreFile = req.files['lettreMotivation'][0];
                candidatureData.lettreMotivation = {
                    data: lettreFile.buffer,
                    contentType: lettreFile.mimetype,
                    originalName: lettreFile.originalname,
                    size: lettreFile.size
                };
            }

            // Création de la candidature
            const candidature = new Candidature(candidatureData);
            await candidature.save();

            // Mise à jour de l'offre avec la nouvelle candidature
            offreExistante.candidatures.push(candidature._id);
            await offreExistante.save();

            res.status(201).json({ 
                message: "Candidature envoyée avec succès",
                candidatureId: candidature._id 
            });

        } catch (error) {
            console.error("Erreur lors de la candidature:", error);
            
            if (error instanceof multer.MulterError) {
                if (error.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ error: "Fichier trop volumineux (max 50MB)" });
                }
                return res.status(400).json({ error: error.message });
            }
            
            res.status(500).json({ 
                error: "Erreur lors de la candidature",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Récupérer les candidatures de l'utilisateur connecté
router.get('/mes-candidatures', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(400).json({ message: "ID utilisateur manquant." });
        }

        const candidatures = await Candidature.find({ candidat: userId })
            .populate({
                path: 'offre',
                populate: { path: 'entreprise', select: 'nomEntreprise logo' }
            })
            .populate('candidat', 'nom email')
            .populate('profilCv', 'cv')
            .populate('entretien', 'statut date_entretien meet_link resultat')
            .select('offre candidat profilCv statut datePostulation cv videoMotivation lettreMotivation entretien');

        if (!candidatures.length) {
            return res.status(404).json({ message: "Aucune candidature trouvée pour cet utilisateur." });
        }

        const result = candidatures.map(candidature => {
            const obj = candidature.toObject();

            if (obj.cv) {
                obj.cv.url = `${req.protocol}://${req.get('host')}/api/candidatures/${obj._id}/cv`;
                delete obj.cv.data;
            } else if (obj.profilCv?.cv) {
                obj.cv = {
                    url: `${req.protocol}://${req.get('host')}${obj.profilCv.cv.url}`,
                    originalName: obj.profilCv.cv.filename,
                    contentType: obj.profilCv.cv.mimetype,
                    size: obj.profilCv.cv.size
                };
            }

            if (obj.videoMotivation) {
                obj.videoMotivation.url = `${req.protocol}://${req.get('host')}/api/candidatures/${obj._id}/video`;
                delete obj.videoMotivation.data;
            }

            if (obj.lettreMotivation) {
                obj.lettreMotivation.url = `${req.protocol}://${req.get('host')}/api/candidatures/${obj._id}/lettre`;
                delete obj.lettreMotivation.data;
            }

            if (obj.entretien) {
                obj.entretien = {
                    statut: obj.entretien.statut,
                    date_entretien: obj.entretien.date_entretien,
                    meet_link: obj.entretien.meet_link,
                    resultat: obj.entretien.resultat
                };
            }

            return obj;
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Erreur lors de la récupération des candidatures:", error);
        res.status(500).json({ message: error.message });
    }
});

// Récupérer les candidatures pour les offres de l'entreprise connectée
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;

        const offres = await Offre.find({ entreprise: userId }).select('_id');
        if (!offres.length) {
            return res.status(404).json({ message: "Aucune offre trouvée pour cette entreprise." });
        }

        const candidatures = await Candidature.find({ offre: { $in: offres.map(offre => offre._id) } })
            .populate("candidat")
            .populate("profilCv")
            .populate("offre")
            .sort({ createdAt: -1 });

        const result = candidatures.map(candidature => {
            const candidatureObj = candidature.toObject();

            if (candidatureObj.cv) {
                candidatureObj.cv = {
                    contentType: candidatureObj.cv.contentType,
                    originalName: candidatureObj.cv.originalName,
                    size: candidatureObj.cv.size,
                    url: `/api/candidatures/${candidature._id}/cv`
                };
            } else if (candidatureObj.profilCv?.cv) {
                candidatureObj.cv = {
                    contentType: candidatureObj.profilCv.cv.mimetype,
                    originalName: candidatureObj.profilCv.cv.filename,
                    size: candidatureObj.profilCv.cv.size,
                    url: `/api/candidatures/${candidature._id}/cv`
                };
            }

            if (candidatureObj.videoMotivation) {
                candidatureObj.videoMotivation = {
                    contentType: candidatureObj.videoMotivation.contentType,
                    originalName: candidatureObj.videoMotivation.originalName,
                    size: candidatureObj.videoMotivation.size,
                    url: `/api/candidatures/${candidature._id}/video`
                };
            }

            if (candidatureObj.lettreMotivation) {
                candidatureObj.lettreMotivation = {
                    contentType: candidatureObj.lettreMotivation.contentType,
                    originalName: candidatureObj.lettreMotivation.originalName,
                    size: candidatureObj.lettreMotivation.size,
                    url: `/api/candidatures/${candidature._id}/lettre`
                };
            }

            return candidatureObj;
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Erreur lors de la récupération des candidatures:", error);
        res.status(500).json({ error: error.message });
    }
});

// Récupérer toutes les candidatures avec filtres (public-all)
router.get('/public-all', authenticateToken, async (req, res) => {
    try {
        const { status, date, offre } = req.query;

        let query = {};
        if (status) {
            query.statut = status;
        }
        if (date) {
            const now = new Date();
            let startDate;
            switch (date) {
                case 'lastWeek':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'lastMonth':
                    startDate = new Date(now.setDate(now.getDate() - 30));
                    break;
                case 'lastYear':
                    startDate = new Date(now.setDate(now.getDate() - 365));
                    break;
                default:
                    return res.status(400).json({ error: 'Filtre de date invalide' });
            }
            query.datePostulation = { $gte: startDate };
        }
        if (offre) {
            const matchingOffres = await Offre.find({
                titre: { $regex: offre, $options: 'i' }
            }).select('_id');
            query.offre = { $in: matchingOffres.map(o => o._id) };
        }

        const candidatures = await Candidature.find(query)
            .populate('candidat', 'nom email')
            .populate('profilCv', 'cv competences metier')
            .populate({
                path: 'offre',
                populate: { path: 'entreprise', select: 'nomEntreprise logo' }
            })
            .sort({ createdAt: -1 });

        const result = candidatures.map(candidature => {
            const candidatureObj = candidature.toObject();

            if (candidatureObj.cv) {
                candidatureObj.cv = {
                    contentType: candidatureObj.cv.contentType,
                    originalName: candidatureObj.cv.originalName,
                    size: candidatureObj.cv.size,
                    url: `${req.protocol}://${req.get('host')}/api/candidatures/${candidature._id}/cv`
                };
            } else if (candidatureObj.profilCv?.cv) {
                candidatureObj.cv = {
                    contentType: candidatureObj.profilCv.cv.mimetype,
                    originalName: candidatureObj.profilCv.cv.filename,
                    size: candidatureObj.profilCv.cv.size,
                    url: `${req.protocol}://${req.get('host')}/api/candidatures/${candidature._id}/cv`
                };
            }

            if (candidatureObj.videoMotivation) {
                candidatureObj.videoMotivation = {
                    contentType: candidatureObj.videoMotivation.contentType,
                    originalName: candidatureObj.videoMotivation.originalName,
                    size: candidatureObj.videoMotivation.size,
                    url: `${req.protocol}://${req.get('host')}/api/candidatures/${candidature._id}/video`
                };
            }

            if (candidatureObj.lettreMotivation) {
                candidatureObj.lettreMotivation = {
                    contentType: candidatureObj.lettreMotivation.contentType,
                    originalName: candidatureObj.lettreMotivation.originalName,
                    size: candidatureObj.lettreMotivation.size,
                    url: `${req.protocol}://${req.get('host')}/api/candidatures/${candidature._id}/lettre`
                };
            }

            return candidatureObj;
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Erreur lors de la récupération de toutes les candidatures:', error);
        res.status(500).json({ error: error.message });
    }
});

// Nombre total de candidatures en attente
router.get('/pending/count', authenticateToken, async (req, res) => {
    try {
        const totalPendingApplications = await Candidature.countDocuments({
            statut: 'En attente',
        });
        res.status(200).json({ totalPendingApplications });
    } catch (error) {
        console.error("Erreur lors de la récupération du nombre de candidatures en attente :", error);
        res.status(500).json({ 
            message: "Erreur serveur, veuillez réessayer.",
            error: error.message 
        });
    }
});

// Statistiques des candidatures
router.get("/statistiques", authenticateToken, async (req, res) => {
    try {
        const { range } = req.query;
        const userId = req.userId;

        const validRanges = ["7days", "30days", "90days", "all"];
        if (!validRanges.includes(range)) {
            return res.status(400).json({
                message: "Période invalide. Utilisez 7days, 30days, 90days ou all.",
                code: "INVALID_RANGE",
            });
        }

        let dateFilter = {};
        if (range !== "all") {
            const now = new Date();
            const days = {
                "7days": 7,
                "30days": 30,
                "90days": 90,
            }[range];
            dateFilter = { $gte: new Date(now.setDate(now.getDate() - days)) };
        }

        const offresEntreprise = await Offre.find({ entreprise: userId }).select("_id");
        const offreIds = offresEntreprise.map((offre) => offre._id);

        if (offreIds.length === 0) {
            return res.status(404).json({
                message: "Aucune offre trouvée pour cette entreprise.",
                code: "NO_OFFERS_FOUND",
            });
        }

        const matchQuery = {
            offre: { $in: offreIds },
            ...(Object.keys(dateFilter).length > 0 && { datePostulation: dateFilter }),
        };

        const totalCandidatures = await Candidature.countDocuments(matchQuery);

        const candidaturesParStatut = await Candidature.aggregate([
            { $match: matchQuery },
            { $group: { _id: "$statut", count: { $sum: 1 } } },
            { $project: { statut: "$_id", count: 1, _id: 0 } },
            { $sort: { count: -1 } },
        ]);

        let groupFormat = "%Y-%m-%d";
        if (range === "90days" || range === "all") {
            groupFormat = "%Y-%U";
        }

        const evolutionCandidatures = await Candidature.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: {
                        $dateToString: { format: groupFormat, date: "$datePostulation" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    periode: {
                        $cond: {
                            if: { $eq: [groupFormat, "%Y-%U"] },
                            then: {
                                $concat: [
                                    { $substr: ["$_id", 0, 4] },
                                    "-",
                                    { $cond: [
                                        { $lt: [{ $substr: ["$_id", 5, -1] }, "10"] },
                                        { $concat: ["0", { $substr: ["$_id", 5, -1] }] },
                                        { $substr: ["$_id", 5, -1] }
                                    ]}
                                ],
                            },
                            else: "$_id",
                        },
                    },
                    candidatures: "$count",
                    _id: 0,
                },
            },
        ]);

        const repartitionParType = await Candidature.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "offres",
                    localField: "offre",
                    foreignField: "_id",
                    as: "offreDetails",
                },
            },
            { $unwind: { path: "$offreDetails", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ["$offreDetails.typeEmploi", "Non spécifié"] },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    type: "$_id",
                    candidatures: "$count",
                    _id: 0,
                },
            },
            { $sort: { candidatures: -1 } },
        ]);

        if (
            totalCandidatures === 0 &&
            candidaturesParStatut.length === 0 &&
            evolutionCandidatures.length === 0 &&
            repartitionParType.length === 0
        ) {
            return res.status(404).json({
                message: `Aucune candidature trouvée pour la période ${range}.`,
                code: "NO_CANDIDATURES_FOUND",
            });
        }

        res.status(200).json({
            totalCandidatures,
            candidaturesParStatut,
            evolutionCandidatures,
            repartitionParType,
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
        res.status(500).json({
            message: "Erreur serveur lors de la récupération des statistiques.",
            code: "SERVER_ERROR",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});

// Récupérer une candidature par ID
router.get("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const candidature = await Candidature.findById(id)
            .populate("offre")
            .populate("candidat")
            .populate("profilCv");

        if (!candidature) {
            return res.status(404).json({ error: "Candidature non trouvée" });
        }

        if (req.userId !== candidature.candidat._id.toString()) {
            return res.status(403).json({ error: "Non autorisé" });
        }

        const result = candidature.toObject();
        
        if (result.cv) {
            result.cv.url = `/api/candidatures/${result._id}/cv`;
            delete result.cv.data;
        } else if (result.profilCv?.cv) {
            result.cv = {
                url: `/api/candidatures/${result._id}/cv`,
                originalName: result.profilCv.cv.filename,
                contentType: result.profilCv.cv.mimetype,
                size: result.profilCv.cv.size
            };
        }

        if (result.videoMotivation) {
            result.videoMotivation.url = `/api/candidatures/${result._id}/video`;
            delete result.videoMotivation.data;
        }

        if (result.lettreMotivation) {
            result.lettreMotivation.url = `/api/candidatures/${result._id}/lettre`;
            delete result.lettreMotivation.data;
        }

        res.status(200).json(result);
    } catch (error) {
        console.error("Erreur lors de la récupération de la candidature:", error);
        res.status(500).json({ error: "Erreur serveur : " + error.message });
    }
});

// Télécharger ou visualiser le CV
router.get("/:id/cv", async (req, res) => {
    try {
        const candidature = await Candidature.findById(req.params.id).populate('profilCv');

        if (!candidature) {
            return res.status(404).json({ error: "Candidature non trouvée" });
        }

        const isView = req.query.view === 'true';
        const disposition = isView ? 'inline' : 'attachment';

        if (candidature.cv && candidature.cv.data) {
            res.set('Content-Type', candidature.cv.contentType);
            res.set('Content-Disposition', `${disposition}; filename="${candidature.cv.originalName}"`);
            res.send(candidature.cv.data);
        } else if (candidature.profilCv?.cv?.path) {
            const filePath = path.resolve(candidature.profilCv.cv.path);
            if (fs.existsSync(filePath)) {
                res.set('Content-Type', candidature.profilCv.cv.mimetype || 'application/pdf');
                res.set('Content-Disposition', `${disposition}; filename="${candidature.profilCv.cv.filename}"`);
                fs.createReadStream(filePath).pipe(res);
            } else {
                return res.status(404).json({ error: "Fichier CV non trouvé sur le serveur" });
            }
        } else {
            return res.status(404).json({ error: "CV non trouvé" });
        }
    } catch (error) {
        console.error(`Erreur lors de la récupération du CV pour candidature ${req.params.id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Télécharger la vidéo de motivation
router.get("/:id/video", async (req, res) => {
    try {
        const candidature = await Candidature.findById(req.params.id);
        
        if (!candidature || !candidature.videoMotivation || !candidature.videoMotivation.data) {
            return res.status(404).json({ error: "Vidéo non trouvée" });
        }

        res.set('Content-Type', candidature.videoMotivation.contentType);
        res.set('Content-Disposition', `inline; filename="${candidature.videoMotivation.originalName}"`);
        res.send(candidature.videoMotivation.data);
    } catch (error) {
        console.error("Erreur lors de la récupération de la vidéo:", error);
        res.status(500).json({ error: error.message });
    }
});

// Télécharger la lettre de motivation
router.get("/:id/lettre", async (req, res) => {
    try {
        const candidature = await Candidature.findById(req.params.id);
        
        if (!candidature || !candidature.lettreMotivation || !candidature.lettreMotivation.data) {
            return res.status(404).json({ error: "Lettre de motivation non trouvée" });
        }

        const isView = req.query.view === 'true';
        const disposition = isView ? 'inline' : 'attachment';

        res.set('Content-Type', candidature.lettreMotivation.contentType);
        res.set('Content-Disposition', `${disposition}; filename="${candidature.lettreMotivation.originalName}"`);
        res.send(candidature.lettreMotivation.data);
    } catch (error) {
        console.error("Erreur lors de la récupération de la lettre:", error);
        res.status(500).json({ error: error.message });
    }
});
router.patch("/:id/statut", authenticateToken, async (req, res) => {
    try {
        const { statut } = req.body;

        const validStatuts = [
            'En attente',
            'Acceptée',
            'Refusée',
            'En cours d\'évaluation'
        ];
        if (!validStatuts.includes(statut)) {
            return res.status(400).json({ error: "Statut invalide" });
        }

        const candidature = await Candidature.findById(req.params.id)
            .populate('candidat')
            .populate('offre')
            .populate('updatedBy', 'nom');

        if (!candidature) {
            return res.status(404).json({ error: "Candidature non trouvée" });
        }

        if (!candidature.candidat?._id) {
            return res.status(400).json({ error: "ID du candidat manquant" });
        }

        candidature.statut = statut;
        candidature.dateEvaluation = new Date();
        candidature.updatedBy = req.userId;
        await candidature.save();

        let notificationType, notificationMessage;

        if (statut === 'Acceptée') {
            notificationType = 'CANDIDATURE_ACCEPTEE';
            notificationMessage = {
                title: 'Candidature acceptée',
                body: `Votre candidature pour l'offre "${candidature.offre.titre}" a été acceptée. Vous serez contacté prochainement pour la suite du processus.`,
                offre_id: candidature.offre._id,
                entreprise: req.userId
            };
        } else if (statut === 'Refusée') {
            notificationType = 'CANDIDATURE_REFUSEE';
            notificationMessage = {
                title: 'Candidature refusée',
                body: `Votre candidature pour l'offre "${candidature.offre.titre}" n'a pas été retenue.`,
                offre_id: candidature.offre._id,
                entreprise: req.userId
            };
        }

        if (notificationType) {
            const notification = new Notification({
                user_id: candidature.candidat._id, // Fixed: Changed userId to user_id to match schema
                entreprise_id: req.userId,
                type: notificationType,
                data: notificationMessage,
                candidature_id: candidature._id,
                offre_id: candidature.offre._id,
                contrat: null // Valid due to schema update
            });

            await notification.save();
        }

        res.status(200).json({
            message: "Statut mis à jour avec succès",
            candidature: {
                _id: candidature._id,
                statut: candidature.statut,
                dateEvaluation: candidature.dateEvaluation,
                updatedBy: {
                    _id: req.userId,
                    nom: candidature.updatedBy?.nom || "Inconnu"
                },
                notification: notificationType ? "Envoyée" : "Non requise"
            }
        });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du statut:", error.message, error.stack);
        res.status(500).json({
            error: error.message,
            details: "Échec de la mise à jour du statut"
        });
    }
});

// Enregistrer une visite de candidature
router.post('/record-visit', authenticateToken, async (req, res) => {
    try {
        const { candidatureId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(candidatureId)) {
            return res.status(400).json({ error: "ID de candidature invalide" });
        }

        const candidature = await Candidature.findById(candidatureId)
            .populate('candidat', 'nom email telephone')
            .populate('offre', 'titre dateExpiration competencesRequises')
            .populate('profilCv', 'competences metier');

        if (!candidature) {
            return res.status(404).json({ error: "Candidature non trouvée" });
        }

        const visitDetails = {
            candidatureId: candidatureId,
            userId: req.userId,
            visitedAt: new Date(),
            candidatureDetails: {
                candidat: {
                    nom: candidature.candidat.nom,
                    email: candidature.candidat.email,
                    telephone: candidature.candidat.telephone,
                },
                offre: {
                    _id: candidature.offre._id,
                    titre: candidature.offre.titre,
                    dateExpiration: candidature.offre.dateExpiration,
                    competencesRequises: candidature.offre.competencesRequises,
                },
                profilCv: {
                    competences: candidature.profilCv ? candidature.profilCv.competences : [],
                    metier: candidature.profilCv ? candidature.profilCv.metier : '',
                },
                statut: candidature.statut,
                datePostulation: candidature.datePostulation,
            },
        };

        res.status(200).json({ message: "Visite enregistrée avec succès", visitDetails });
    } catch (error) {
        console.error("Erreur lors de l'enregistrement de la visite:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;