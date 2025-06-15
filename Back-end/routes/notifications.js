const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const Contrat = require('../models/Contrat');
const Utilisateur = require('../models/Utilisateur');
const authenticateToken = require('../middlewares/auth');

// Middleware de validation
const validateNotification = (req, res, next) => {
    const { user_id, type, data, contrat, userId } = req.body;

    if (!type || !data) {
        return res.status(400).json({
            success: false,
            message: 'Type et données sont requis',
        });
    }

    if (user_id && !mongoose.Types.ObjectId.isValid(user_id)) {
        return res.status(400).json({
            success: false,
            message: 'ID utilisateur non valide',
        });
    }

    if (req.body.entreprise_id && !mongoose.Types.ObjectId.isValid(req.body.entreprise_id)) {
        return res.status(400).json({
            success: false,
            message: 'ID entreprise non valide',
        });
    }

    if (type !== 'NEW_USER' && (!contrat || !mongoose.Types.ObjectId.isValid(contrat))) {
        return res.status(400).json({
            success: false,
            message: 'ID contrat requis et doit être valide pour ce type de notification',
        });
    }

    if (type !== 'NEW_USER' && (!userId || !mongoose.Types.ObjectId.isValid(userId))) {
        return res.status(400).json({
            success: false,
            message: 'ID utilisateur destinataire requis et doit être valide pour ce type de notification',
        });
    }

    next();
};

// Créer une notification
router.post('/', validateNotification, async (req, res) => {
    try {
        const { user_id, entreprise_id, type, data, candidature_id, offre_id, contrat, userId } = req.body;

        if (user_id) {
            const userExists = await Utilisateur.exists({ _id: user_id });
            if (!userExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé',
                });
            }
        }

        if (entreprise_id) {
            const entrepriseExists = await Utilisateur.exists({ _id: entreprise_id, 'profils.name': 'Entreprise' });
            if (!entrepriseExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Entreprise non trouvée',
                });
            }
        }

        if (contrat) {
            const contratExists = await Contrat.exists({ _id: contrat });
            if (!contratExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Contrat non trouvé',
                });
            }
        }

        if (userId) {
            const recipientExists = await Utilisateur.exists({ _id: userId });
            if (!recipientExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur destinataire non trouvé',
                });
            }
        }

        const notification = await Notification.create({
            user_id: user_id ? new mongoose.Types.ObjectId(user_id) : null,
            entreprise_id: entreprise_id ? new mongoose.Types.ObjectId(entreprise_id) : null,
            type,
            data,
            candidature_id,
            offre_id,
            contrat: contrat ? new mongoose.Types.ObjectId(contrat) : null,
            userId: userId ? new mongoose.Types.ObjectId(userId) : null,
            read: false,
        });

        res.status(201).json({
            success: true,
            data: notification,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error creating notification:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la création',
            error: error.message,
        });
    }
});

// Récupérer les notifications de l'utilisateur connecté
router.get('/', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [
                { user_id: new mongoose.Types.ObjectId(req.userId) },
                { entreprise_id: new mongoose.Types.ObjectId(req.userId) },
                { userId: new mongoose.Types.ObjectId(req.userId) },
            ],
        })
            .populate('contrat', 'intitulePoste etat')
            .sort({ created_at: -1 })
            .lean();

        const formattedNotifications = notifications.map((notification) => ({
            ...notification,
            user_id: notification.user_id?.toString(),
            entreprise_id: notification.entreprise_id?.toString(),
            userId: notification.userId?.toString(),
            contrat: notification.contrat,
        }));

        return res.json({
            success: true,
            data: formattedNotifications,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching notifications:`, error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération',
            error: error.message,
        });
    }
});

// Récupérer les notifications non lues
router.get('/unread', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { type, entreprise_id } = req.query;

        const query = { read: false };
        if (type) {
            query.type = type;
        }
        if (entreprise_id) {
            if (!mongoose.Types.ObjectId.isValid(entreprise_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID entreprise non valide',
                });
            }
            query.entreprise_id = new mongoose.Types.ObjectId(entreprise_id);
        } else {
            query.$or = [
                { user_id: new mongoose.Types.ObjectId(userId) },
                { entreprise_id: new mongoose.Types.ObjectId(userId) },
                { userId: new mongoose.Types.ObjectId(userId) },
            ];
        }

        const notifications = await Notification.find(query)
            .populate('contrat', 'intitulePoste etat')
            .sort({ created_at: -1 })
            .lean();

        const formattedNotifications = notifications.map((notification) => ({
            ...notification,
            user_id: notification.user_id?.toString(),
            entreprise_id: notification.entreprise_id?.toString(),
            userId: notification.userId?.toString(),
            contrat: notification.contrat,
        }));

        return res.json({
            success: true,
            data: formattedNotifications || [],
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching unread notifications:`, error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des notifications',
            error: error.message,
        });
    }
});

// Récupérer les notifications non lues pour un admin
router.get('/admin/unread', authenticateToken, async (req, res) => {
    try {
        const adminId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            console.log(`[${new Date().toISOString()}] ERROR: Invalid adminId: ${adminId}`);
            return res.status(400).json({
                success: false,
                message: 'ID admin non valide',
            });
        }

        const query = {
            $or: [
                {
                    type: 'PREPARER_CONTRAT',
                    user_id: new mongoose.Types.ObjectId(adminId),
                    read: false,
                },
                {
                    type: { $in: ['CONTRAT_REJETE_CANDIDAT', 'CONTRAT_REJETE_ENTREPRISE'] },
                    adminId: new mongoose.Types.ObjectId(adminId),
                    read: false,
                },
                {
                    type: 'CONTRAT_PUBLIE',
                    'data.admin_id': adminId.toString(),
                    read: false,
                },
                {
                    type: 'NEW_USER',
                    adminId: new mongoose.Types.ObjectId(adminId),
                    read: false,
                }, // Added NEW_USER condition
                {
                    $or: [
                        {
                            type: 'CONTRAT_PUBLIE',
                            'data.admin_id': adminId.toString(),
                            replies: {
                                $elemMatch: {
                                    read: false,
                                    sender_id: { $ne: new mongoose.Types.ObjectId(adminId) },
                                },
                            },
                        },
                        {
                            type: 'PREPARER_CONTRAT',
                            user_id: new mongoose.Types.ObjectId(adminId),
                            replies: {
                                $elemMatch: {
                                    read: false,
                                    sender_id: { $ne: new mongoose.Types.ObjectId(adminId) },
                                },
                            },
                        },
                        {
                            type: { $in: ['CONTRAT_REJETE_CANDIDAT', 'CONTRAT_REJETE_ENTREPRISE'] },
                            adminId: new mongoose.Types.ObjectId(adminId),
                            replies: {
                                $elemMatch: {
                                    read: false,
                                    sender_id: { $ne: new mongoose.Types.ObjectId(adminId) },
                                },
                            },
                        },
                        {
                            type: 'NEW_USER',
                            adminId: new mongoose.Types.ObjectId(adminId),
                            replies: {
                                $elemMatch: {
                                    read: false,
                                    sender_id: { $ne: new mongoose.Types.ObjectId(adminId) },
                                },
                            },
                        }, // Added NEW_USER condition for replies
                    ],
                },
            ],
        };

        const notifications = await Notification.find(query)
            .populate('replies.sender_id', 'nom prenom photoProfil')
            .populate('contrat', 'intitulePoste etat')
            .sort({ created_at: -1 })
            .lean();

        const formattedNotifications = notifications.map((notification) => ({
            ...notification,
            user_id: notification.user_id?.toString(),
            entreprise_id: notification.entreprise_id?.toString(),
            adminId: notification.adminId?.toString(),
            contrat: notification.contrat,
            replies: notification.replies?.map((reply) => ({
                ...reply,
                sender_id: reply.sender_id?.toString(),
                sender_info: reply.sender_id,
            })) || [],
        }));

        console.log(`[${new Date().toISOString()}] Fetched unread notifications for admin ${adminId}:`, formattedNotifications);

        return res.json({
            success: true,
            data: formattedNotifications,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching admin unread notifications:`, error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des notifications non lues',
            error: error.message,
        });
    }
});

router.post('/:id/reply', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, read = false } = req.body;
        const userId = req.userId;

        // Validate notification ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[${new Date().toISOString()}] Invalid notification ID: ${id}`);
            return res.status(400).json({
                success: false,
                message: 'ID de notification invalide',
            });
        }

        // Validate content
        if (typeof content !== 'string' || !content.trim()) {
            console.error(`[${new Date().toISOString()}] Invalid or missing content: ${content}`);
            return res.status(400).json({
                success: false,
                message: 'Le contenu de la réponse est requis et doit être une chaîne non vide',
            });
        }

        // Fetch the original notification
        const originalNotification = await Notification.findById(id);
        if (!originalNotification) {
            console.error(`[${new Date().toISOString()}] Notification not found: ${id}`);
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
            });
        }

        // Log notification details for debugging
        console.log(`[${new Date().toISOString()}] Notification data:`, {
            type: originalNotification.type,
            userId: originalNotification.userId,
            user_id: originalNotification.user_id,
            entreprise_id: originalNotification.entreprise_id,
            adminId: originalNotification.adminId,
            data_admin_id: originalNotification.data?.admin_id,
            data: originalNotification.data,
            contrat: originalNotification.contrat,
            senderId: userId,
        });

        // Define allowed notification types
        const allowedNotificationTypes = [
            'NOUVELLE_MISSION',
            'FEEDBACK_COMPTE_RENDU',
            'CANDIDATURE_ACCEPTEE',
            'ENTRETIEN_PLANIFIE',
            'COMPTE_RENDU_SUBMITTED',
            'ENTRETIEN_EVALUE',
            'CANDIDATURE_REFUSEE',
            'CONTRAT_REJETE_CANDIDAT',
            'CONTRAT_REJETE_ENTREPRISE',
            'CONTRAT_PUBLIE',
            'PREPARER_CONTRAT',
            'NEW_FORMATION',
            'NEW_FORMATION_ASSIGNMENT',
        ];

        // Check if user is associated with the contract (enterprise or candidate)
        let isEnterpriseForContract = false;
        let isCandidateForContract = false;
        let contract = null;
        if (originalNotification.contrat) {
            try {
                contract = await Contrat.findById(originalNotification.contrat);
                if (!contract) {
                    console.error(`[${new Date().toISOString()}] Contract not found: ${originalNotification.contrat}`);
                    console.warn(`[${new Date().toISOString()}] Proceeding with entreprise_id or admin_id check due to missing contract`);
                } else {
                    isEnterpriseForContract = contract.entreprise_id?.toString() === userId;
                    const candidature = await Candidature.findOne({
                        contrat_id: originalNotification.contrat,
                        user_id: userId,
                        status: { $in: ['ACCEPTEE', 'EN_COURS'] },
                    });
                    isCandidateForContract = !!candidature;
                    console.log(`[${new Date().toISOString()}] Contract authorization check:`, {
                        contractId: originalNotification.contrat,
                        entreprise_id: contract?.entreprise_id,
                        admin_id: contract?.admin_id,
                        created_by: contract?.created_by,
                        userId,
                        isEnterpriseForContract,
                        isCandidateForContract,
                    });
                }
            } catch (contractError) {
                console.error(`[${new Date().toISOString()}] Error fetching contract or candidature:`, contractError.message);
                console.warn(`[${new Date().toISOString()}] Proceeding with entreprise_id or admin_id check due to contract fetch error`);
            }
        }

        // Authorize user to reply
        const isRecipient =
            allowedNotificationTypes.includes(originalNotification.type) &&
            (
                originalNotification.userId?.toString() === userId ||
                originalNotification.user_id?.toString() === userId ||
                originalNotification.entreprise_id?.toString() === userId ||
                originalNotification.adminId?.toString() === userId ||
                (originalNotification.type === 'CONTRAT_PUBLIE' &&
                    (isEnterpriseForContract || 
                     isCandidateForContract || 
                     originalNotification.entreprise_id?.toString() === userId ||
                     originalNotification.data?.admin_id?.toString() === userId)) ||
                (['CONTRAT_REJETE_CANDIDAT', 'CONTRAT_REJETE_ENTREPRISE'].includes(originalNotification.type) &&
                    (originalNotification.user_id?.toString() === userId || originalNotification.adminId?.toString() === userId)) ||
                (originalNotification.type === 'PREPARER_CONTRAT' &&
                    (originalNotification.user_id?.toString() === userId || originalNotification.entreprise_id?.toString() === userId)) ||
                (['NEW_FORMATION', 'NEW_FORMATION_ASSIGNMENT'].includes(originalNotification.type) &&
                    (originalNotification.user_id?.toString() === userId || originalNotification.adminId?.toString() === userId))
            );

        if (originalNotification.type === 'CONTRAT_PUBLIE') {
            console.log(`[${new Date().toISOString()}] CONTRAT_PUBLIE authorization check:`, {
                userId,
                isEnterpriseForContract,
                isCandidateForContract,
                entreprise_id: originalNotification.entreprise_id,
                admin_id: originalNotification.data?.admin_id,
                isAuthorized: isRecipient,
            });
        }

        if (!isRecipient) {
            console.error(`[${new Date().toISOString()}] Unauthorized reply attempt by user: ${userId}`);
            return res.status(403).json({
                success: false,
                message: 'Non autorisé à répondre à cette notification',
            });
        }

        // Determine read status
        const isCandidate = originalNotification.userId?.toString() === userId || isCandidateForContract;
        const finalReadStatus = isCandidate ? false : read;

        // Add reply to original notification
        try {
            await originalNotification.addReply(userId, content.trim(), finalReadStatus);
        } catch (replyError) {
            console.error(`[${new Date().toISOString()}] Error adding reply:`, replyError.message);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de l’ajout de la réponse',
                error: replyError.message,
            });
        }

        // Log reply processing
        console.log(`[${new Date().toISOString()}] Reply processed:`, {
            notificationId: id,
            userId,
            notificationType: originalNotification.type,
            isEnterpriseForContract,
            isCandidateForContract,
        });

        return res.status(201).json({
            success: true,
            message: 'Réponse envoyée avec succès',
            notification: originalNotification,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error adding reply:`, error.message, error.stack);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message,
        });
    }
});

router.get('/:id/replies', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[${new Date().toISOString()}] ID de notification invalide: ${id}`);
            return res.status(400).json({
                success: false,
                message: 'ID de notification invalide',
            });
        }

        const notificationExists = await Notification.findById(id);
        if (!notificationExists) {
            console.error(`[${new Date().toISOString()}] Notification non trouvée pour ID: ${id}`);
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
            });
        }

        const notification = await Notification.findOne({
            _id: id,
            $or: [
                { user_id: new mongoose.Types.ObjectId(userId) },
                { entreprise_id: new mongoose.Types.ObjectId(userId) },
                { 'data.admin_id': userId },
                { userId: new mongoose.Types.ObjectId(userId) },
                { adminId: new mongoose.Types.ObjectId(userId) },
            ],
        })
            .populate({
                path: 'replies.sender_id',
                select: 'nom prenom email nomEntreprise profils',
                populate: {
                    path: 'profils',
                    select: 'name',
                },
            })
            .populate('contrat', 'intitulePoste etat')
            .select('replies type data user_id entreprise_id userId adminId contrat created_at')
            .lean();

        if (!notification) {
            console.error(`[${new Date().toISOString()}] Accès non autorisé à la notification ${id} pour userId ${userId}. Champs vérifiés:`, {
                user_id: notificationExists.user_id?.toString(),
                entreprise_id: notificationExists.entreprise_id?.toString(),
                data_admin_id: notificationExists.data?.admin_id,
                userId: notificationExists.userId?.toString(),
                adminId: notificationExists.adminId?.toString(),
            });
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à cette notification',
            });
        }

        // Formater les réponses pour inclure le nom affiché
        const formattedReplies = notification.replies.map((reply) => {
            const sender = reply.sender_id;
            let displayName = 'Utilisateur inconnu';

            if (sender) {
                if (sender.nomEntreprise && sender.profils.some((profil) => profil.name === 'Entreprise')) {
                    displayName = sender.nomEntreprise;
                } else {
                    displayName = `${sender.prenom || ''} ${sender.nom || ''}`.trim() || sender.email;
                }
            }

            return {
                ...reply,
                sender_id: sender?._id.toString(),
                displayName,
            };
        });

        console.log(`[${new Date().toISOString()}] Préparation de la réponse pour notification ${id}:`, {
            type: notification.type,
            commentaire: notification.data?.commentaire || 'Aucun commentaire trouvé',
            adminId: notification.adminId?.toString(),
            userId,
            data: notification.data,
        });

        return res.json({
            success: true,
            type: notification.type,
            commentaire: notification.data?.commentaire || '',
            data: notification.data,
            replies: formattedReplies,
            sender: notification.user_id || notification.entreprise_id,
            userId: notification.userId,
            adminId: notification.adminId,
            contrat: notification.contrat,
            created_at: notification.created_at,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erreur lors de la récupération des réponses pour notification ${id}:`, {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message,
        });
    }
});

// Récupérer les notifications envoyées par une entreprise
router.get('/sent-by-entreprise', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({
            entreprise_id: new mongoose.Types.ObjectId(req.userId),
            $or: [
                { type: { $ne: 'REPONSE_NOTIFICATION' } },
                { 'replies.sender_id': new mongoose.Types.ObjectId(req.userId) },
            ],
        })
            .populate('user_id', 'nom prenom photoProfil')
            .populate('replies.sender_id', 'nom prenom')
            .populate('contrat', 'intitulePoste etat')
            .sort({ created_at: 1 })
            .lean();

        const formattedNotifications = notifications.map((notif) => ({
            ...notif,
            user_id: notif.user_id?.toString(),
            entreprise_id: notif.entreprise_id?.toString(),
            userId: notif.userId?.toString(),
            contrat: notif.contrat,
            replies: notif.replies?.map((reply) => ({
                ...reply,
                sender_id: reply.sender_id?.toString(),
            })) || [],
        }));

        res.status(200).json({
            success: true,
            entreprise_id: req.userId,
            notifications: formattedNotifications,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching entreprise notifications:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message,
        });
    }
});

// Récupérer les notifications CONTRAT_PUBLIE pour une entreprise
router.get('/contrat-publie', authenticateToken, async (req, res) => {
    try {
        const entrepriseId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(entrepriseId)) {
            return res.status(400).json({
                success: false,
                message: 'ID entreprise non valide',
            });
        }

        const notifications = await Notification.find({
            entreprise_id: new mongoose.Types.ObjectId(entrepriseId),
            type: 'CONTRAT_PUBLIE',
            'data.admin_id': { $exists: true },
        })
            .populate('contrat', 'intitulePoste etat')
            .sort({ created_at: -1 })
            .lean();

        const formattedNotifications = notifications.map((notification) => ({
            ...notification,
            user_id: notification.user_id?.toString(),
            entreprise_id: notification.entreprise_id?.toString(),
            userId: notification.userId?.toString(),
            contrat: notification.contrat,
        }));

        return res.json({
            success: true,
            data: formattedNotifications,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching contrat-publie notifications:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message,
        });
    }
});



// Compter les notifications CONTRAT_PUBLIE non lues
router.get('/contrat-publie/unread-count', authenticateToken, async (req, res) => {
    try {
        const entrepriseId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(entrepriseId)) {
            return res.status(400).json({
                success: false,
                message: 'ID entreprise non valide',
            });
        }

        const count = await Notification.countDocuments({
            entreprise_id: new mongoose.Types.ObjectId(entrepriseId),
            type: 'CONTRAT_PUBLIE',
            read: false,
        });

        res.json({ success: true, unreadCount: count });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error counting contrat-publie unread:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message,
        });
    }
});

// Compter les notifications FEEDBACK_COMPTE_RENDU non lues
router.get('/feedback-compte-rendu/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID utilisateur non valide',
            });
        }

        const count = await Notification.countDocuments({
            type: 'FEEDBACK_COMPTE_RENDU',
            userId: new mongoose.Types.ObjectId(userId),
            read: false,
        });

        res.json({ success: true, unreadCount: count });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error counting feedback-compte-rendu unread:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message,
        });
    }
});

// Supprimer plusieurs notifications
router.delete('/', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        const userId = req.userId;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Liste d'IDs invalide",
            });
        }

        const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucun ID valide fourni',
            });
        }

        const notifications = await Notification.find({
            _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
            $or: [
                { user_id: new mongoose.Types.ObjectId(userId) },
                { entreprise_id: new mongoose.Types.ObjectId(userId) },
                { userId: new mongoose.Types.ObjectId(userId) },
            ],
        });

        if (notifications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aucune notification trouvée à supprimer',
            });
        }

        const result = await Notification.deleteMany({
            _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
            $or: [
                { user_id: new mongoose.Types.ObjectId(userId) },
                { entreprise_id: new mongoose.Types.ObjectId(userId) },
                { userId: new mongoose.Types.ObjectId(userId) },
            ],
        });

        res.json({
            success: true,
            message: `${result.deletedCount} notification(s) supprimée(s)`,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error deleting notifications:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la suppression',
            error: error.message,
        });
    }
});

// Récupérer les notifications pour une candidature spécifique
router.get('/candidatures/:candidature_id', authenticateToken, async (req, res) => {
    try {
        const { candidature_id } = req.params;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(candidature_id)) {
            return res.status(400).json({
                success: false,
                message: 'ID candidature non valide',
            });
        }

        const notifications = await Notification.find({
            candidature_id: new mongoose.Types.ObjectId(candidature_id),
            $or: [
                { user_id: new mongoose.Types.ObjectId(userId) },
                { entreprise_id: new mongoose.Types.ObjectId(userId) },
                { userId: new mongoose.Types.ObjectId(userId) },
            ],
        })
            .populate('contrat', 'intitulePoste etat')
            .sort({ created_at: -1 })
            .lean();

        const formattedNotifications = notifications.map((notification) => ({
            ...notification,
            user_id: notification.user_id?.toString(),
            entreprise_id: notification.entreprise_id?.toString(),
            userId: notification.userId?.toString(),
            contrat: notification.contrat,
        }));

        return res.json({
            success: true,
            data: formattedNotifications,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching candidature notifications:`, error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des notifications',
            error: error.message,
        });
    }
});

// Marquer une notification comme lue ou non lue
router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { read } = req.body;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID notification non valide',
            });
        }

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
            });
        }

        const isRecipient =
            notification.user_id?.toString() === userId ||
            notification.entreprise_id?.toString() === userId ||
            notification.userId?.toString() === userId ||
            (notification.type === 'CONTRAT_PUBLIE' && notification.data?.admin_id === userId);

        if (!isRecipient) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé',
            });
        }

        notification.read = read !== undefined ? read : true;
        await notification.save();

        res.json({
            success: true,
            data: {
                _id: notification._id,
                read: notification.read,
            },
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error marking notification read:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message,
        });
    }
});

// Marquer une réponse comme lue
router.patch('/:id/replies/:replyId/mark-as-read', authenticateToken, async (req, res) => {
    try {
        const { id, replyId } = req.params;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(replyId)) {
            return res.status(400).json({
                success: false,
                message: 'ID de notification ou de réponse invalide',
            });
        }

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
            });
        }

        const isRecipient =
            notification.user_id?.toString() === userId ||
            notification.entreprise_id?.toString() === userId ||
            notification.userId?.toString() === userId ||
            (notification.type === 'CONTRAT_PUBLIE' && notification.data?.admin_id === userId);

        if (!isRecipient) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé',
            });
        }

        const reply = notification.replies.id(replyId);
        if (!reply) {
            return res.status(404).json({
                success: false,
                message: 'Réponse non trouvée',
            });
        }

        if (reply.sender_id.toString() === userId) {
            return res.status(400).json({
                success: false,
                message: "Les réponses de l'utilisateur actuel ne peuvent pas être marquées comme lues",
            });
        }

        reply.read = true;
        notification.markModified('replies');
        await notification.save();

        return res.json({
            success: true,
            message: 'Réponse marquée comme lue',
            data: {
                notificationId: id,
                replyId: replyId,
                read: reply.read,
            },
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error marking reply read:`, error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message,
        });
    }
});

// Marquer toutes les notifications comme lues
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;

        const result = await Notification.updateMany(
            {
                $or: [
                    { user_id: new mongoose.Types.ObjectId(userId) },
                    { entreprise_id: new mongoose.Types.ObjectId(userId) },
                    { userId: new mongoose.Types.ObjectId(userId) },
                    { type: 'CONTRAT_PUBLIE', 'data.admin_id': userId },
                ],
                read: false,
            },
            {
                $set: {
                    read: true,
                    'replies.$[elem].read': true,
                },
            },
            {
                arrayFilters: [
                    {
                        'elem.read': false,
                        'elem.sender_id': { $ne: new mongoose.Types.ObjectId(userId) },
                    },
                ],
            }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} notification(s) marquée(s) comme lue(s)`,
            data: {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
            },
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error marking all notifications read:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du marquage des notifications comme lues',
            error: error.message,
        });
    }
});

// Marquer toutes les notifications d'une candidature comme lues
router.patch('/candidatures/mark-as-read', authenticateToken, async (req, res) => {
    try {
        const { candidature_id } = req.body;
        const userId = req.userId;

        if (!candidature_id || !mongoose.Types.ObjectId.isValid(candidature_id)) {
            return res.status(400).json({
                success: false,
                message: 'ID candidature non valide',
            });
        }

        const result = await Notification.updateMany(
            {
                candidature_id: new mongoose.Types.ObjectId(candidature_id),
                $or: [
                    { user_id: new mongoose.Types.ObjectId(userId) },
                    { entreprise_id: new mongoose.Types.ObjectId(userId) },
                    { userId: new mongoose.Types.ObjectId(userId) },
                ],
                read: false,
            },
            {
                $set: {
                    read: true,
                    'replies.$[elem].read': true,
                },
            },
            {
                arrayFilters: [
                    {
                        'elem.read': false,
                        'elem.sender_id': { $ne: new mongoose.Types.ObjectId(userId) },
                    },
                ],
            }
        );

        res.json({
            success: true,
            data: {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
            },
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error marking candidature notifications read:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du marquage des notifications de candidature comme lues',
            error: error.message,
        });
    }
});

router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const entrepriseId = req.query.entreprise_id || userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'ID utilisateur invalide' });
    }

    // Types à exclure pour les notifications (côté utilisateur)
    const excludedNotificationTypes = [
      'CONTRAT_REJETE_CANDIDAT',
      'CONTRAT_REJETE_ENTREPRISE',
      'ENTRETIEN_PLANIFIE',
      'PREPARER_CONTRAT',
      'ENTRETIEN_EVALUE',
    ];

    // Types à exclure spécifiques à l'entreprise
    const excludedEntrepriseTypes = [
      'CANDIDATURE_ACCEPTEE',
      'CANDIDATURE_REJETEE',
      'CONTRAT_REJETE_ENTREPRISE',
      'ENTRETIEN_PLANIFIE',
      'PREPARER_CONTRAT',
      'ENTRETIEN_EVALUE',
      'NOUVELLE_MISSION',
      'FEEDBACK_COMPTE_RENDU',
      'NEW_FORMATION', // Réintroduit pour exclure les notifications
      'NEW_FORMATION_ASSIGNMENT', // Réintroduit pour exclure les notifications
    ];

    // Conditions de base pour les notifications
    const notificationConditions = {
      $or: [
        {
          $or: [
            { user_id: new mongoose.Types.ObjectId(userId) },
            { userId: new mongoose.Types.ObjectId(userId) },
          ],
          type: { $nin: excludedNotificationTypes },
        },
        {
          entreprise_id: new mongoose.Types.ObjectId(entrepriseId),
          type: { $nin: excludedEntrepriseTypes },
        },
      ],
      read: false,
    };

    // Compter les notifications non lues
    const notificationCount = await Notification.countDocuments(notificationConditions);
    console.log(`[${new Date().toISOString()}] Notification count for user ${userId}/entreprise ${entrepriseId}: ${notificationCount}`);

    // Conditions pour les réponses
    const replyConditions = {
      $or: [
        {
          $or: [
            { user_id: new mongoose.Types.ObjectId(userId) },
            { userId: new mongoose.Types.ObjectId(userId) },
          ],
          type: { $nin: excludedNotificationTypes },
        },
        {
          entreprise_id: new mongoose.Types.ObjectId(entrepriseId),
          // Ne pas appliquer excludedEntrepriseTypes ici pour inclure NEW_FORMATION et NEW_FORMATION_ASSIGNMENT
        },
      ],
      replies: { $exists: true, $ne: [] },
    };

    // Compter les réponses non lues (seulement celles des non-entreprises)
    const replyCount = await Notification.aggregate([
      { $match: replyConditions },
      { $unwind: '$replies' },
      {
        $match: {
          'replies.read': false,
          'replies.sender_id': { $ne: new mongoose.Types.ObjectId(userId) },
          // Exclure les réponses envoyées par l'entreprise
          $or: [
            { 'replies.sender_entreprise_id': { $exists: false } },
            { 'replies.sender_entreprise_id': { $ne: new mongoose.Types.ObjectId(entrepriseId) } },
          ],
        },
      },
      { $count: 'count' },
    ]);

    const totalReplyCount = replyCount[0]?.count || 0;
    console.log(`[${new Date().toISOString()}] Reply count for user ${userId}/entreprise ${entrepriseId}: ${totalReplyCount}`);

    const totalCount = notificationCount + totalReplyCount;

    res.json({ success: true, unreadCount: totalCount });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur dans /unread-count:`, error.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Marquer une notification comme lue (compatibilité)
router.patch('/:id/mark-as-read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID notification non valide',
            });
        }

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
            });
        }

        const isRecipient =
            notification.user_id?.toString() === userId ||
            notification.entreprise_id?.toString() === userId ||
            notification.userId?.toString() === userId ||
            (notification.type === 'CONTRAT_PUBLIE' && notification.data?.admin_id === userId);

        if (!isRecipient) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé',
            });
        }

        notification.read = true;
        await notification.save();

        res.json({
            success: true,
            data: {
                _id: notification._id,
                read: notification.read,
            },
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error marking notification read:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du marquage de la notification comme lue',
            error: error.message,
        });
    }
});

router.put('/:notificationId/replies/mark-as-read', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({
                success: false,
                message: 'ID notification non valide',
            });
        }

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
            });
        }

        const isRecipient =
            notification.user_id?.toString() === userId ||
            notification.entreprise_id?.toString() === userId ||
            notification.userId?.toString() === userId ||
            (notification.type === 'CONTRAT_PUBLIE' && notification.data?.admin_id === userId);

        if (!isRecipient) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé',
            });
        }

        let modifiedCount = 0;
        notification.replies = notification.replies.map((reply) => {
            if (reply.sender_id && reply.sender_id.toString() !== userId && !reply.read) {
                reply.read = true;
                modifiedCount++;
            }
            return reply;
        });

        if (modifiedCount > 0) {
            notification.markModified('replies');
            await notification.save();
        }

        // Mark associated REPONSE_NOTIFICATION as read
        await Notification.updateMany(
            {
                original_notification: new mongoose.Types.ObjectId(notificationId),
                type: 'REPONSE_NOTIFICATION',
                read: false,
                $or: [
                    { user_id: new mongoose.Types.ObjectId(userId) },
                    { entreprise_id: new mongoose.Types.ObjectId(userId) },
                    { userId: new mongoose.Types.ObjectId(userId) },
                ],
            },
            { $set: { read: true } }
        );

        return res.json({
            success: true,
            message: `${modifiedCount} réponse(s) marquée(s) comme lue(s)`,
            data: { modifiedCount },
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error marking replies read:`, error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message,
        });
    }
});

// Récupérer les notifications pour un admin
// Récupérer les notifications pour un admin
router.get('/admin', authenticateToken, async (req, res) => {
    try {
        const adminId = req.userId;

        console.log(`[${new Date().toISOString()}] Fetching notifications for adminId: ${adminId}`);

        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            console.error(`[${new Date().toISOString()}] Invalid adminId: ${adminId}`);
            return res.status(400).json({
                success: false,
                message: 'ID admin non valide',
            });
        }

        const notifications = await Notification.find({
            $or: [
                { type: 'CONTRAT_PUBLIE', 'data.admin_id': adminId.toString() },
                { type: 'PREPARER_CONTRAT', user_id: new mongoose.Types.ObjectId(adminId) },
                { type: 'CONTRAT_REJETE_CANDIDAT', adminId: new mongoose.Types.ObjectId(adminId) },
                { type: 'CONTRAT_REJETE_ENTREPRISE', adminId: new mongoose.Types.ObjectId(adminId) },
            ],
        })
            .populate('replies.sender_id', 'nom prenom photoProfil')
            .populate('contrat', 'intitulePoste etat')
            .sort({ created_at: -1 })
            .lean();

        console.log(`[${new Date().toISOString()}] Found ${notifications.length} notifications for adminId: ${adminId}`);

        const formattedNotifications = notifications.map((notification) => ({
            ...notification,
            user_id: notification.user_id?.toString(),
            entreprise_id: notification.entreprise_id?.toString(),
            adminId: notification.adminId?.toString(),
            contrat: notification.contrat,
            replies: notification.replies?.map((reply) => ({
                ...reply,
                sender_id: reply.sender_id?.toString(),
                sender_info: reply.sender_id,
            })) || [],
        }));

        return res.json({
            success: true,
            data: formattedNotifications,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching admin notifications:`, error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des notifications admin',
            error: error.message,
        });
    }
});

// Compter les notifications non lues pour un admin
router.get('/admin/unread-count', authenticateToken, async (req, res) => {
    try {
        const adminId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return res.status(400).json({
                success: false,
                message: 'ID admin non valide',
            });
        }

        // Compter les notifications non lues (incluant NEW_USER)
        const unreadNotifications = await Notification.countDocuments({
            $or: [
                {
                    type: 'PREPARER_CONTRAT',
                    user_id: new mongoose.Types.ObjectId(adminId),
                    read: false,
                },
                {
                    type: { $in: ['CONTRAT_REJETE_CANDIDAT', 'CONTRAT_REJETE_ENTREPRISE'] },
                    adminId: new mongoose.Types.ObjectId(adminId),
                    read: false,
                },
                {
                    type: 'NEW_USER',
                    adminId: new mongoose.Types.ObjectId(adminId), // Add adminId filter
                    read: false,
                },
            ],
        });

        // Compter les réponses non lues pour toutes les notifications (incluant NEW_USER)
        const unreadRepliesResult = await Notification.aggregate([
            {
                $match: {
                    $or: [
                        { 
                            type: 'CONTRAT_PUBLIE', 
                            'data.admin_id': adminId.toString() 
                        },
                        { 
                            type: 'PREPARER_CONTRAT', 
                            user_id: new mongoose.Types.ObjectId(adminId) 
                        },
                        { 
                            type: 'CONTRAT_REJETE_CANDIDAT', 
                            adminId: new mongoose.Types.ObjectId(adminId) 
                        },
                        { 
                            type: 'CONTRAT_REJETE_ENTREPRISE', 
                            adminId: new mongoose.Types.ObjectId(adminId) 
                        },
                        {
                            type: 'NEW_USER',
                            adminId: new mongoose.Types.ObjectId(adminId), // Add adminId filter
                        },
                    ],
                    replies: { $exists: true, $not: { $size: 0 } },
                },
            },
            { $unwind: '$replies' },
            {
                $match: {
                    'replies.read': false,
                    'replies.sender_id': { $ne: new mongoose.Types.ObjectId(adminId) },
                },
            },
            { $count: 'count' },
        ]);

        const unreadReplies = unreadRepliesResult[0]?.count || 0;
        const unreadCount = unreadNotifications + unreadReplies;

        res.json({
            success: true,
            unreadCount,
            breakdown: {
                notifications: unreadNotifications,
                replies: unreadReplies,
            },
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error counting admin unread notifications:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du comptage des notifications admin non lues',
            error: error.message,
        });
    }
});

// Marquer une notification admin comme lue
router.patch('/admin/mark-as-read/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID notification non valide',
            });
        }

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
            });
        }

        notification.read = true;

        if (notification.replies?.length > 0) {
            notification.replies.forEach((reply) => {
                reply.read = true;
            });
            notification.markModified('replies');
        }

        await notification.save();

        return res.json({
            success: true,
            message: 'Notification marquée comme lue',
            data: {
                notificationId: id,
                read: notification.read,
            },
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error marking admin notification read:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du marquage de la notification admin comme lue',
            error: error.message,
        });
    }
});

module.exports = router;