const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Import the crypto module
const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');
const Notification = require('../models/Notification');
const Candidature = require("../models/Candidature");

const isAuthenticated = require('../middlewares/auth');
require('dotenv').config();
const Profil = require('../models/Profil');
const Contrat = require('../models/Contrat');
const Message = require('../models/Message');
const nodemailer = require('nodemailer');
const router = express.Router();

// Use environment variable for JWT secret
const SECRET_KEY = process.env.JWT_SECRET || 'votre_secret_jwt';


router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email input
    if (!email) {
      return res.status(400).json({ message: 'L’adresse email est requise.' });
    }

    const utilisateur = await Utilisateur.findOne({ email });
    if (!utilisateur) {
      return res.status(404).json({ message: 'Aucun utilisateur trouvé avec cet email.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiration on user
    utilisateur.resetPasswordToken = resetTokenHash;
    utilisateur.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await utilisateur.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetUrl = `http://localhost:3000/authentification/reset-password/${resetToken}`;
    const mailOptions = {
      from: `"Équipe d’Administration" <${process.env.EMAIL_USER}>`,
      to: utilisateur.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4a6baf; text-align: center;">Réinitialisation de mot de passe</h2>
          <p>Bonjour ${utilisateur.nom || 'Utilisateur'},</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous pour procéder :</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background-color: #4a6baf; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Réinitialiser le mot de passe
            </a>
          </p>
          <p>Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
          <p>Pour des raisons de sécurité, ne partagez ce lien avec personne.</p>
          <p>Cordialement,</p>
          <p><strong>L’équipe d’administration</strong></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur : <br><a href="${resetUrl}">${resetUrl}</a></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Un email de réinitialisation a été envoyé à votre adresse.' });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer plus tard.' });
  }
});

// Reset Password - Update Password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Hash the token to match stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const utilisateur = await Utilisateur.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!utilisateur) {
      return res.status(400).json({ message: 'Lien de réinitialisation invalide ou expiré.' });
    }

    // Hash new password
    const sel = await bcrypt.genSalt(10);
    utilisateur.motDePasse = await bcrypt.hash(newPassword, sel);
    utilisateur.resetPasswordToken = undefined;
    utilisateur.resetPasswordExpires = undefined;
    await utilisateur.save();

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { nom, email, motDePasse, profils, profilUser } = req.body;

    const utilisateurExiste = await Utilisateur.findOne({ email });
    if (utilisateurExiste) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    const sel = await bcrypt.genSalt(10);
    const motDePasseHash = await bcrypt.hash(motDePasse, sel);

    const nouvelUtilisateur = new Utilisateur({
      nom,
      email,
      motDePasse: motDePasseHash,
      profils,
      profilUser,
      estValide: false,
    });

    await nouvelUtilisateur.save();

    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      console.warn('Profil administrateur non trouvé. Aucune notification créée.');
    } else {
      const admins = await Utilisateur.find({ profils: adminProfil._id }).select('_id');
      if (admins.length === 0) {
        console.warn('Aucun administrateur trouvé. Aucune notification créée.');
      } else {
        for (const admin of admins) {
          const notification = new Notification({
            type: 'NEW_USER',
            adminId: admin._id, // Use adminId instead of user_id
            data: { userId: nouvelUtilisateur._id, userName: nouvelUtilisateur.nom },
            recipients: [{ userId: admin._id }], // Optional: keep recipients if used elsewhere
            read: false,
          });

          try {
            await notification.save();
            console.log(`Notification NEW_USER créée pour l'admin ${admin._id}:`, notification);
          } catch (notificationError) {
            console.error('Erreur lors de la création de la notification:', notificationError.message, notificationError.stack);
          }
        }
      }
    }

    res.status(201).json({
      message: 'Votre inscription a été enregistrée. Un administrateur va vérifier votre compte avant que vous puissiez vous connecter.',
    });
  } catch (error) {
    console.error('Erreur lors de la création de l’utilisateur:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/notifications/admin/unread-count', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }

    const unreadCount = await Notification.countDocuments({
      'recipients.userId': req.userId,
      read: false,
    });

    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error('Erreur lors du comptage des notifications non lues:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Endpoint to count unread notifications for admins
router.get('/notifications/admin/unread-count', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }

    const unreadCount = await Notification.countDocuments({
      'recipients.userId': req.userId,
      read: false,
    });

    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error('Erreur lors du comptage des notifications non lues:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Endpoint to fetch unread notifications for admins
router.get('/notifications/admin/unread', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }

    const notifications = await Notification.find({
      'recipients.userId': req.userId,
      read: false,
    }).populate('user_id', 'nom');

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications non lues:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Endpoint to mark notifications as read for admins
router.put('/notifications/admin/mark-as-read', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }

    await Notification.updateMany(
      { 'recipients.userId': req.userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ success: true, message: 'Notifications marquées comme lues.' });
  } catch (error) {
    console.error('Erreur lors du marquage des notifications comme lues:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    if (!Utilisateur || typeof Utilisateur.findOne !== 'function') {
      throw new Error('Le modèle Utilisateur n’est pas correctement initialisé');
    }

    const utilisateur = await Utilisateur.findOne({ email }).populate('profils');
    if (!utilisateur) {
      return res.status(400).json({ message: 'L’email ou le mot de passe est incorrect.' });
    }

    const isAdmin = utilisateur.profils.some((profil) => profil.name === 'Admin');
    if (!isAdmin && !utilisateur.estValide) {
      return res.status(403).json({
        message: 'Votre compte n’a pas encore été validé par l’administrateur. Veuillez patienter.',
      });
    }

    if (!isAdmin && !utilisateur.estActif) {
      return res.status(403).json({
        message: 'Votre compte est désactivé. Veuillez contacter l’administrateur.',
      });
    }

    const match = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!match) {
      return res.status(400).json({ message: 'L’email ou le mot de passe est incorrect.' });
    }

    const profil = utilisateur.profils[0];
    if (!profil) {
      return res.status(400).json({ message: 'Aucun profil associé à cet utilisateur.' });
    }

    const token = jwt.sign(
      {
        id: utilisateur._id,
        profil: profil.name,
        nom: utilisateur.nom,
        email: utilisateur.email,
        isAdmin,
      },
      SECRET_KEY,
      { expiresIn: '3h' }
    );

    res.status(200).json({
      token,
      message: 'Connexion réussie !',
      isAdmin,
      userId: utilisateur._id,
      userName: utilisateur.nom,
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error.message, error.stack);
    res.status(500).json({ message: error.message || 'Erreur serveur, veuillez réessayer.' });
  }
});

router.post('/send-message', isAuthenticated, async (req, res) => {
  try {
    let { destinataireId, sujet, contenu } = req.body;
    const expediteur = await Utilisateur.findById(req.userId).populate('profils');
    if (!expediteur) {
      return res.status(404).json({ message: 'Expéditeur non trouvé.' });
    }

    const isCandidat = expediteur.profils.some((profil) => profil.name === 'Candidat');
    const isEntreprise = expediteur.profils.some((profil) => profil.name === 'Entreprise');
    const isAdmin = expediteur.profils.some((profil) => profil.name === 'Admin');

    if (isCandidat && !destinataireId) {
      const adminProfil = await Profil.findOne({ name: 'Admin' });
      if (!adminProfil) {
        return res.status(404).json({ message: 'Profil administrateur non trouvé.' });
      }
      const admin = await Utilisateur.findOne({ profils: adminProfil._id }).select('_id');
      if (!admin) {
        return res.status(404).json({ message: 'Aucun administrateur trouvé.' });
      }
      destinataireId = admin._id;
    }

    const destinataire = await Utilisateur.findById(destinataireId).populate('profils');
    if (!destinataire) {
      return res.status(404).json({ message: 'Destinataire non trouvé.' });
    }

    const isDestinataireCandidat = destinataire.profils.some((profil) => profil.name === 'Candidat');
    const isDestinataireEntreprise = destinataire.profils.some((profil) => profil.name === 'Entreprise');
    const isDestinataireAdmin = destinataire.profils.some((profil) => profil.name === 'Admin');

    if (isAdmin && !isDestinataireCandidat && !isDestinataireEntreprise) {
      return res.status(400).json({
        message: 'Les administrateurs ne peuvent envoyer des messages qu’aux candidats ou aux entreprises.',
      });
    }

    if (isEntreprise && !isDestinataireAdmin) {
      return res.status(403).json({
        message: 'Les entreprises ne peuvent envoyer des messages qu’aux administrateurs.',
      });
    }

    if (isCandidat && !isDestinataireAdmin && !isDestinataireEntreprise) {
      return res.status(403).json({
        message: 'Les candidats ne peuvent envoyer des messages qu’aux administrateurs ou aux entreprises.',
      });
    }

    const nouveauMessage = new Message({
      expediteur: req.userId,
      destinataire: destinataireId,
      sujet: sujet || 'Message',
      contenu,
    });

    await nouveauMessage.save();
    res.status(200).json({
      message: 'Message envoyé avec succès !',
      messageId: nouveauMessage._id,
      destinataireId,
    });
  } catch (error) {
    console.error('Erreur lors de l’envoi du message:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/admins', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    const isEntreprise = utilisateur.profils.some((profil) => profil.name === 'Entreprise');
    const isCandidat = utilisateur.profils.some((profil) => profil.name === 'Candidat');

    if (!isEntreprise && !isCandidat) {
      return res.status(403).json({
        message: 'Accès refusé. Seules les entreprises ou les candidats peuvent voir la liste des administrateurs.',
      });
    }

    const admins = await Utilisateur.find({ profils: await Profil.findOne({ name: 'Admin' }).select('_id') })
      .select('nom email _id')
      .populate('profils', 'name');
    res.status(200).json(admins);
  } catch (error) {
    console.error('Erreur lors de la récupération des administrateurs:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/utilisateur/entreprise', isAuthenticated, async (req, res) => {
  try {
    // Récupérer l'utilisateur connecté avec ses profils
    const utilisateur = await Utilisateur.findById(req.userId)
      .select('-motDePasse')
      .populate('profils');
    
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Vérifier si l'utilisateur a le profil Entreprise
    const isEntreprise = utilisateur.profils.some(profil => profil.name === 'Entreprise');
    if (!isEntreprise) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les utilisateurs avec le profil Entreprise peuvent accéder à cette ressource.' 
      });
    }

    // Retourner les informations de l'utilisateur Entreprise
    const responseData = {
      id: utilisateur._id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      profils: utilisateur.profils,
      telephone: utilisateur.telephone,
      pays: utilisateur.pays,
      codePostal: utilisateur.codePostal,
      ville: utilisateur.ville,
      adresse: utilisateur.adresse,
      nomEntreprise: utilisateur.nomEntreprise,
      adresseEntreprise: utilisateur.adresseEntreprise,
      telephoneEntreprise: utilisateur.telephoneEntreprise,
      paysEntreprise: utilisateur.paysEntreprise,
      codePostalEntreprise: utilisateur.codePostalEntreprise,
      secteurActivite: utilisateur.secteurActivite,
      photoProfil: utilisateur.photoProfil,
      estValide: utilisateur.estValide,
      estActif: utilisateur.estActif
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur Entreprise:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des informations de l\'entreprise.' });
  }
});

router.get('/messages/admin', isAuthenticated, async (req, res) => {
  try {
    console.log('Fetching messages for user, userId:', req.userId);
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur) {
      console.error('User not found:', req.userId);
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const isEntreprise = utilisateur.profils.some((profil) => profil.name === 'Entreprise');
    const isCandidat = utilisateur.profils.some((profil) => profil.name === 'Candidat');
    if (!isEntreprise && !isCandidat) {
      console.error('User is neither enterprise nor candidate:', req.userId);
      return res.status(403).json({
        message: 'Accès refusé. Seules les entreprises ou les candidats peuvent voir leurs messages.',
      });
    }

    const { adminId, since } = req.query;
    if (!adminId) {
      console.error('No adminId provided');
      return res.status(400).json({ message: 'ID de l’administrateur requis.' });
    }

    const admin = await Utilisateur.findById(adminId).populate('profils');
    if (!admin || !admin.profils.some((profil) => profil.name === 'Admin')) {
      console.error('Admin not found or not an admin:', adminId);
      return res.status(404).json({ message: 'Administrateur non trouvé.' });
    }

    const query = {
      $or: [
        { expediteur: req.userId, destinataire: adminId },
        { expediteur: adminId, destinataire: req.userId },
      ],
    };

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query.dateEnvoi = { $gt: sinceDate };
      } else {
        console.error('Invalid since date:', since);
        return res.status(400).json({ message: 'Format de date invalide pour le paramètre since.' });
      }
    }

    const messages = await Message.find(query)
      .populate({
        path: 'expediteur',
        select: 'nom nomEntreprise email',
        populate: { path: 'profils', select: 'name' },
      })
      .populate({
        path: 'destinataire',
        select: 'nom nomEntreprise email',
        populate: { path: 'profils', select: 'name' },
      })
      .sort({ dateEnvoi: 1 });

    console.log('Found messages:', messages.length);
    res.status(200).json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/messages/candidat', isAuthenticated, async (req, res) => {
  try {
    console.log('Fetching messages for candidate, userId:', req.userId);
    const { since } = req.query;

    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur) {
      console.error('User not found:', req.userId);
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const isCandidat = utilisateur.profils.some((profil) => profil.name === 'Candidat');
    if (!isCandidat) {
      console.error('User is not a candidate:', req.userId);
      return res.status(403).json({
        message: 'Accès refusé. Seuls les candidats peuvent accéder à cette conversation.',
      });
    }

    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      console.error('Admin profile not found');
      return res.status(404).json({ message: 'Profil administrateur non trouvé.' });
    }

    const admin = await Utilisateur.findOne({ profils: adminProfil._id }).select('_id nom');
    if (!admin) {
      console.error('No admin found');
      return res.status(404).json({ message: 'Aucun administrateur trouvé.' });
    }

    const query = {
      $or: [
        { expediteur: req.userId, destinataire: admin._id },
        { expediteur: admin._id, destinataire: req.userId },
      ],
    };

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query.dateEnvoi = { $gt: sinceDate };
      } else {
        console.error('Invalid date format for since:', since);
        return res.status(400).json({ message: 'Format de date invalide pour le paramètre since.' });
      }
    }

    const messages = await Message.find(query)
      .populate({
        path: 'expediteur',
        select: 'nom email',
        populate: { path: 'profils', select: 'name' },
      })
      .populate({
        path: 'destinataire',
        select: 'nom email',
        populate: { path: 'profils', select: 'name' },
      })
      .sort({ dateEnvoi: 1 });

    console.log('Found messages:', messages.length);
    res.status(200).json({
      messages,
      adminId: admin._id,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.post('/messages/mark-read/candidat', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Candidat')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux candidats.' });
    }

    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      return res.status(404).json({ message: 'Profil administrateur non trouvé.' });
    }

    const adminIds = await Utilisateur.find({ profils: adminProfil._id }).distinct('_id');
    await Message.updateMany(
      {
        expediteur: { $in: adminIds },
        destinataire: req.userId,
        lu: false,
      },
      { $set: { lu: true } }
    );

    res.status(200).json({ success: true, message: 'Messages marqués comme lus.' });
  } catch (error) {
    console.error('Erreur lors du marquage des messages comme lus:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/messages/mark-read/entreprise', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Entreprise')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux entreprises.' });
    }

    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      return res.status(404).json({ message: 'Profil administrateur non trouvé.' });
    }

    const adminIds = await Utilisateur.find({ profils: adminProfil._id }).distinct('_id');
    await Message.updateMany(
      {
        expediteur: { $in: adminIds },
        destinataire: req.userId,
        lu: false,
      },
      { $set: { lu: true } }
    );

    res.status(200).json({ success: true, message: 'Messages marqués comme lus.' });
  } catch (error) {
    console.error('Erreur lors du marquage des messages comme lus:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/messages/:destinataireId', isAuthenticated, async (req, res) => {
  try {
    const { destinataireId } = req.params;
    const expediteur = await Utilisateur.findById(req.userId).populate('profils');
    if (!expediteur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const isAdmin = expediteur.profils.some((profil) => profil.name === 'Admin');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Accès refusé. Seuls les administrateurs peuvent voir les conversations.' });
    }

    const messages = await Message.find({
      $or: [
        { expediteur: req.userId, destinataire: destinataireId },
        { expediteur: destinataireId, destinataire: req.userId },
      ],
    })
      .populate({
        path: 'expediteur',
        select: 'nom nomEntreprise',
        populate: { path: 'profils', select: 'name' },
      })
      .populate({
        path: 'destinataire',
        select: 'nom nomEntreprise email',
        populate: { path: 'profils', select: 'name' },
      })
      .sort({ dateEnvoi: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/messages/candidat-admin', isAuthenticated, async (req, res) => {
  try {
    console.log('Fetching candidate-admin messages, userId:', req.userId);
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const isCandidat = utilisateur.profils.some((profil) => profil.name === 'Candidat');
    if (!isCandidat) {
      return res.status(403).json({
        message: 'Accès refusé. Seuls les candidats peuvent voir leurs messages avec un administrateur.',
      });
    }

    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      return res.status(404).json({ message: 'Profil administrateur non trouvé.' });
    }

    const adminIds = await Utilisateur.find({ profils: adminProfil._id }).distinct('_id');
    const messages = await Message.find({
      $or: [
        { expediteur: req.userId, destinataire: { $in: adminIds } },
        { expediteur: { $in: adminIds }, destinataire: req.userId },
      ],
    })
      .populate({
        path: 'expediteur',
        select: 'nom email',
        populate: { path: 'profils', select: 'name' },
      })
      .populate({
        path: 'destinataire',
        select: 'nom email',
        populate: { path: 'profils', select: 'name' },
      })
      .sort({ dateEnvoi: 1 });

    let adminDetails = null;
    if (messages.length > 0) {
      const adminMessage = messages.find(
        (msg) =>
          msg.expediteur.profils.some((profil) => profil.name === 'Admin') ||
          msg.destinataire.profils.some((profil) => profil.name === 'Admin')
      );
      if (adminMessage) {
        const admin = adminMessage.expediteur.profils.some((profil) => profil.name === 'Admin')
          ? adminMessage.expediteur
          : adminMessage.destinataire;
        adminDetails = {
          _id: admin._id,
          nom: admin.nom || 'Administrateur',
          email: admin.email || 'N/A',
        };
      }
    }

    res.status(200).json({ messages, adminDetails });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages candidat-admin:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.', error: error.message });
  }
});

router.get('/users/count', isAuthenticated, async (req, res) => {
  try {
    const adminUser = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = adminUser.profils.some((profil) => profil.name === 'Admin');

    if (!isAdmin) {
      return res.status(403).json({
        message: 'Accès refusé. Seuls les administrateurs peuvent accéder à cette statistique.',
      });
    }

    const totalUsers = await Utilisateur.countDocuments();
    res.status(200).json({ totalUsers });
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d’utilisateurs:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/users/pending', isAuthenticated, async (req, res) => {
  try {
    const adminUser = await Utilisateur.findById(req.userId).populate('profils');
    if (!adminUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const isAdmin = adminUser.profils.some((profil) => profil.name === 'Admin');
    if (!isAdmin) {
      return res.status(403).json({
        message: 'Accès refusé. Seuls les administrateurs peuvent accéder à cette fonctionnalité.',
      });
    }

    const utilisateursNonValides = await Utilisateur.find({ estValide: false })
      .populate('profils')
      .populate('profilUser');

    res.status(200).json(utilisateursNonValides);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs non validés:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

// routes/router.js
router.put('/users/validate/:id', isAuthenticated, async (req, res) => {
  try {
    const adminUser = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = adminUser.profils.some((profil) => profil.name === 'Admin');

    if (!isAdmin) {
      return res.status(403).json({ message: 'Accès refusé. Seuls les administrateurs peuvent valider des comptes.' });
    }

    const utilisateur = await Utilisateur.findByIdAndUpdate(
      req.params.id,
      {
        estValide: true,
        estActif: true, // Activer le compte lors de la validation
        dateValidation: new Date(),
        validePar: req.userId,
      },
      { new: true }
    );

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: utilisateur.email,
      subject: 'Votre compte a été activé',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6baf;">Activation de votre compte</h2>
          <p>Bonjour ${utilisateur.nom},</p>
          <p>Votre compte a été validé et activé avec succès par notre équipe d’administration.</p>
          <p>Vous pouvez maintenant vous connecter à votre compte en utilisant le lien suivant :</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/authentification/sign-in" 
               style="background-color: #4a6baf; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Se connecter
            </a>
          </p>
          <p>Si vous rencontrez des problèmes, n’hésitez pas à nous contacter.</p>
          <p>Cordialement,</p>
          <p><strong>L’équipe d’administration</strong></p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Erreur lors de l’envoi de l’email:', error.message, error.stack);
      } else {
        console.log('Email envoyé:', info.response);
      }
    });

    res.status(200).json({
      message: 'Utilisateur validé et activé avec succès ! Un email de confirmation a été envoyé.',
      utilisateur,
    });
  } catch (error) {
    console.error('Erreur lors de la validation de l’utilisateur:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});



// routes/router.js
router.put('/users/toggle-active/:id', isAuthenticated, async (req, res) => {
  try {
    const adminUser = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = adminUser.profils.some((profil) => profil.name === 'Admin');

    if (!isAdmin) {
      return res.status(403).json({ message: 'Accès refusé. Seuls les administrateurs peuvent modifier l’état actif des comptes.' });
    }

    const utilisateur = await Utilisateur.findById(req.params.id);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Bascule l'état actif/inactif
    utilisateur.estActif = !utilisateur.estActif;
    await utilisateur.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: utilisateur.email,
      subject: utilisateur.estActif ? 'Votre compte a été réactivé' : 'Votre compte a été désactivé',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6baf;">${utilisateur.estActif ? 'Réactivation' : 'Désactivation'} de votre compte</h2>
          <p>Bonjour ${utilisateur.nom},</p>
          <p>Votre compte a été ${utilisateur.estActif ? 'réactivé' : 'désactivé'} par notre équipe d’administration.</p>
          ${utilisateur.estActif ? `
          <p>Vous pouvez maintenant vous connecter à votre compte en utilisant le lien suivant :</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/authentification/sign-in" 
               style="background-color: #4a6baf; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Se connecter
            </a>
          </p>` : `
          <p>Vous ne pouvez plus accéder à votre compte jusqu’à ce qu’il soit réactivé. Pour plus d’informations, veuillez contacter notre équipe.</p>`}
          <p>Cordialement,</p>
          <p><strong>L’équipe d’administration</strong></p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Erreur lors de l’envoi de l’email:', error.message, error.stack);
      } else {
        console.log('Email envoyé:', info.response);
      }
    });

    res.status(200).json({
      message: `Utilisateur ${utilisateur.estActif ? 'activé' : 'désactivé'} avec succès !`,
      utilisateur,
    });
  } catch (error) {
    console.error('Erreur lors de la modification de l’état actif:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.post('/logout', isAuthenticated, async (req, res) => {
  try {
    console.log(`Utilisateur avec ID ${req.userId} déconnecté.`);
    res.status(200).json({ message: 'Déconnexion réussie !' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/users', isAuthenticated, async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.find().populate('profils').populate('profilUser');
    res.status(200).json(utilisateurs);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/user', async (req, res) => {
  try {
    const utilisateursCandidats = await Utilisateur.aggregate([
      {
        $lookup: {
          from: 'profils',
          localField: 'profils',
          foreignField: '_id',
          as: 'profils',
        },
      },
      {
        $unwind: '$profils',
      },
      {
        $match: {
          'profils.name': 'Candidat',
        },
      },
      {
        $lookup: {
          from: 'profilusers',
          localField: 'profilUser',
          foreignField: 'user',
          as: 'profilUser',
        },
      },
      {
        $unwind: {
          path: '$profilUser',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const utilisateursTransformés = utilisateursCandidats.map((utilisateur) => ({
      _id: utilisateur._id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      metier: utilisateur.profilUser ? utilisateur.profilUser.metier : undefined,
      competences: utilisateur.profilUser ? utilisateur.profilUser.competences : [],
      profils: utilisateur.profils,
    }));

    if (utilisateursTransformés.length === 0) {
      return res.status(404).json({ message: 'Aucun utilisateur trouvé avec le profil Candidat.' });
    }

    res.status(200).json(utilisateursTransformés);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
  }
});

router.get('/utilisateurs-entreprise', async (req, res) => {
  try {
    const { search, secteur, pays, page = 1, limit = 10 } = req.query;
    const filter = {};

    const profilEntreprise = await Profil.findOne({ name: 'Entreprise' });
    if (!profilEntreprise) {
      return res.status(404).json({ message: 'Le profil Entreprise n’existe pas.' });
    }
    filter.profils = profilEntreprise._id;

    if (search) {
      filter.$or = [
        { nomEntreprise: { $regex: search, $options: 'i' } },
        { descriptionEntreprise: { $regex: search, $options: 'i' } },
      ];
    }

    if (secteur) {
      filter.secteurActivite = secteur;
    }

    if (pays) {
      filter.paysEntreprise = pays;
    }

    const skip = (page - 1) * limit;
    const utilisateursEntreprise = await Utilisateur.find(filter)
      .skip(skip)
      .limit(limit)
      .populate('profils', { name: 'Entreprise' })
      .select('-motDePasse -annonces -profilUser')
      .sort({ nomEntreprise: 1 });

    const total = await Utilisateur.countDocuments(filter);

    if (utilisateursEntreprise.length === 0) {
      return res.status(404).json({ message: 'Aucune entreprise trouvée avec ces critères.' });
    }

    res.status(200).json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: utilisateursEntreprise,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des entreprises:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

router.delete('/utilisateurs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const utilisateur = await Utilisateur.findByIdAndDelete(id);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/users/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const utilisateur = await Utilisateur.findByIdAndDelete(id);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(200).json({ message: 'Utilisateur supprimé avec succès !' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l’utilisateur:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/users/:id', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.params.id);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(200).json(utilisateur);
  } catch (error) {
    console.error('Erreur lors de la récupération de l’utilisateur:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/employes', isAuthenticated, async (req, res) => {
  try {
    const contratsSignes = await Contrat.find({
      etat: 'signé',
      entreprise: req.userId,
    })
      .populate('user', 'nom email')
      .select('user intitulePoste');

    if (contratsSignes.length === 0) {
      return res.status(404).json({
        message: 'Aucun employé avec un contrat signé n’a été trouvé pour votre entreprise.',
      });
    }

    const employes = contratsSignes.map((contrat) => ({
      _id: contrat.user._id,
      nom: contrat.user.nom,
      email: contrat.user.email,
      poste: contrat.intitulePoste,
    }));

    res.status(200).json(employes);
  } catch (error) {
    console.error('Erreur lors de la récupération des employés:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.put('/users/:id', isAuthenticated, async (req, res) => {
  try {
    const { nom, email, motDePasse } = req.body;
    const utilisateur = await Utilisateur.findById(req.params.id);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    if (motDePasse) {
      const sel = await bcrypt.genSalt(10);
      utilisateur.motDePasse = await bcrypt.hash(motDePasse, sel);
    }
    utilisateur.nom = nom;
    utilisateur.email = email;

    await utilisateur.save();
    res.status(200).json({ message: 'Utilisateur mis à jour avec succès !' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l’utilisateur:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.post('/associate-profiles', async (req, res) => {
  try {
    const { userId, profileIds } = req.body;
    const user = await Utilisateur.findById(userId).populate('profils');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const existingProfileIds = user.profils.map((profile) => profile._id.toString());
    const alreadyAssociated = profileIds.filter((profileId) => existingProfileIds.includes(profileId));
    if (alreadyAssociated.length > 0) {
      return res.status(400).json({ message: 'Un ou plusieurs profils sont déjà associés à cet utilisateur.' });
    }

    user.profils.push(...profileIds);
    await user.save();
    res.status(200).json({ message: 'Profils associés avec succès !' });
  } catch (error) {
    console.error('Erreur lors de l’association des profils:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur lors de l’association des profils.' });
  }
});

router.put('/dissociate-profile', async (req, res) => {
  try {
    const { userId, profileId } = req.body;
    const user = await Utilisateur.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    user.profils = user.profils.filter((profile) => profile._id.toString() !== profileId.toString());
    await user.save();
    res.status(200).json({ message: 'Profil dissocié avec succès !' });
  } catch (error) {
    console.error('Erreur lors de la dissociation du profil:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur lors de la dissociation du profil.' });
  }
});

router.get('/utilisateur/me', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId)
      .select('-motDePasse')
      .populate('profils');
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const responseData = {
      id: utilisateur._id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      profils: utilisateur.profils,
      telephone: utilisateur.telephone,
      pays: utilisateur.pays,
      codePostal: utilisateur.codePostal,
      ville: utilisateur.ville,
      adresse: utilisateur.adresse,
      dateNaissance: utilisateur.dateNaissance,
      nomEntreprise: utilisateur.nomEntreprise,
      adresseEntreprise: utilisateur.adresseEntreprise,
      telephoneEntreprise: utilisateur.telephoneEntreprise,
      paysEntreprise: utilisateur.paysEntreprise,
      codePostalEntreprise: utilisateur.codePostalEntreprise,
      secteurActivite: utilisateur.secteurActivite,
      photoProfil: utilisateur.photoProfil
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Erreur:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/admin-id', isAuthenticated, async (req, res) => {
  try {
    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      return res.status(404).json({ message: 'Profil administrateur non trouvé.' });
    }

    const admin = await Utilisateur.findOne({ profils: adminProfil._id }).select('_id');
    if (!admin) {
      return res.status(404).json({ message: 'Aucun administrateur trouvé.' });
    }

    res.status(200).json({ adminId: admin._id.toString() });
  } catch (error) {
    console.error('Erreur lors de la récupération de l’ID administrateur:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.get('/utilisateurs/coaches', isAuthenticated, async (req, res) => {
  try {
    const coachProfil = await Profil.findOne({ name: 'Coach' });
    if (!coachProfil) {
      return res.status(404).json({ message: 'Profil Coach non trouvé.' });
    }

    const coaches = await Utilisateur.find({ profils: coachProfil._id })
      .select('nom prenom email _id')
      .populate('profils', 'name');

    res.status(200).json({
      success: true,
      data: coaches,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des coaches:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

router.put('/utilisateur/update/entreprise', isAuthenticated, async (req, res) => {
  try {
    // Vérifier si l'utilisateur a le profil Entreprise
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Entreprise')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux entreprises.' });
    }

    // Définir les champs autorisés pour la mise à jour
    const updates = {
      nom: req.body.nom,
      email: req.body.email,
      nomEntreprise: req.body.nomEntreprise,
      adresseEntreprise: req.body.adresseEntreprise,
      telephoneEntreprise: req.body.telephoneEntreprise,
      paysEntreprise: req.body.paysEntreprise,
      codePostalEntreprise: req.body.codePostalEntreprise,
      secteurActivite: req.body.secteurActivite,
      photoProfil: req.body.photoProfil
    };

    // Valider photoProfil (si fourni)
    if (updates.photoProfil) {
      const base64Regex = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/;
      if (!base64Regex.test(updates.photoProfil)) {
        return res.status(400).json({ message: 'Format d’image invalide. Utilisez JPEG ou PNG en base64.' });
      }
      // Vérifier la taille (limite à ~1MB)
      const base64Data = updates.photoProfil.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 1 * 1024 * 1024) {
        return res.status(400).json({ message: 'L’image est trop volumineuse (limite: 1MB).' });
      }
    }

    // Supprimer les champs undefined pour éviter de les enregistrer comme null
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    // Vérifier si au moins un champ est fourni pour la mise à jour
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Aucun champ valide fourni pour la mise à jour.' });
    }

    // Mettre à jour l'utilisateur
    const utilisateurMisAJour = await Utilisateur.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-motDePasse');

    if (!utilisateurMisAJour) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.status(200).json({
      message: 'Informations mises à jour avec succès',
      utilisateur: utilisateurMisAJour
    });
  } catch (error) {
    console.error('Erreur:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

router.put('/utilisateur/update/candidat', isAuthenticated, async (req, res) => {
  try {
    // Vérifier si l'utilisateur a le profil Candidat
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Candidat')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux candidats.' });
    }

    // Définir les champs autorisés pour la mise à jour des candidats
    const updates = {
      nom: req.body.nom,
      telephone: req.body.telephone,
      pays: req.body.pays,
      codePostal: req.body.codePostal,
      ville: req.body.ville,
      adresse: req.body.adresse,
      dateNaissance: req.body.dateNaissance,
      photoProfil: req.body.photoProfil
    };

    // Valider le champ nom (requis)
    if (!updates.nom || typeof updates.nom !== 'string' || updates.nom.trim() === '') {
      return res.status(400).json({ message: 'Le nom est obligatoire.' });
    }

    // Valider photoProfil (si fourni)
    if (updates.photoProfil) {
      const base64Regex = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/;
      if (!base64Regex.test(updates.photoProfil)) {
        return res.status(400).json({ message: 'Format d’image invalide. Utilisez JPEG ou PNG en base64.' });
      }
      // Vérifier la taille (limite à ~1MB)
      const base64Data = updates.photoProfil.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 1 * 1024 * 1024) {
        return res.status(400).json({ message: 'L’image est trop volumineuse (limite: 1MB).' });
      }
    }

    // Supprimer les champs undefined pour éviter de les enregistrer comme null
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    // Vérifier si au moins un champ est fourni pour la mise à jour
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Aucun champ valide fourni pour la mise à jour.' });
    }

    // Mettre à jour l'utilisateur
    const utilisateurMisAJour = await Utilisateur.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-motDePasse');

    if (!utilisateurMisAJour) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.status(200).json({
      message: 'Informations du candidat mises à jour avec succès',
      utilisateur: utilisateurMisAJour,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du candidat:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

router.get('/messages/unread-count/admin', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }

    const profilEntreprise = await Profil.findOne({ name: 'Entreprise' });
    const profilCandidat = await Profil.findOne({ name: 'Candidat' });
    if (!profilEntreprise || !profilCandidat) {
      return res.status(404).json({ message: 'Profil Entreprise ou Candidat non trouvé.' });
    }

    const entreprises = await Utilisateur.find({ profils: profilEntreprise._id }).distinct('_id');
    const candidats = await Utilisateur.find({ profils: profilCandidat._id }).distinct('_id');

    const unreadEnterpriseCount = await Message.countDocuments({
      expediteur: { $in: entreprises },
      destinataire: req.userId,
      lu: false,
    });

    const unreadCandidateCount = await Message.countDocuments({
      expediteur: { $in: candidats },
      destinataire: req.userId,
      lu: false,
    });

    const unreadCount = unreadEnterpriseCount + unreadCandidateCount;

    res.status(200).json({ 
      success: true, 
      unreadCount,
      details: {
        enterprise: unreadEnterpriseCount,
        candidate: unreadCandidateCount,
      }
    });
  } catch (error) {
    console.error('Erreur lors du comptage des messages non lus:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/messages/unread-count/candidat', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Candidat')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux candidats.' });
    }

    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      return res.status(404).json({ message: 'Profil administrateur non trouvé.' });
    }

    const adminIds = await Utilisateur.find({ profils: adminProfil._id }).distinct('_id');
    const unreadCount = await Message.countDocuments({
      expediteur: { $in: adminIds },
      destinataire: req.userId,
      lu: false,
    });

    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error('Erreur lors du comptage des messages non lus:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/messages/unread-count/entreprise', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Entreprise')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux entreprises.' });
    }

    const adminProfil = await Profil.findOne({ name: 'Admin' });
    if (!adminProfil) {
      return res.status(404).json({ message: 'Profil administrateur non trouvé.' });
    }

    const adminIds = await Utilisateur.find({ profils: adminProfil._id }).distinct('_id');
    const unreadCount = await Message.countDocuments({
      expediteur: { $in: adminIds },
      destinataire: req.userId,
      lu: false,
    });

    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error('Erreur lors du comptage des messages non lus:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/messages/unread-count/:entrepriseId', isAuthenticated, async (req, res) => {
  try {
    const { entrepriseId } = req.params;
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }

    const entreprise = await Utilisateur.findById(entrepriseId).populate('profils');
    if (!entreprise || !entreprise.profils.some(profil => profil.name === 'Entreprise')) {
      return res.status(404).json({ message: 'Entreprise non trouvée.' });
    }

    const unreadCount = await Message.countDocuments({
      expediteur: entrepriseId,
      destinataire: req.userId,
      lu: false,
    });

    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error('Erreur lors du comptage des messages non lus:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/messages/mark-read/:entrepriseId', isAuthenticated, async (req, res) => {
  try {
    const { entrepriseId } = req.params;
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }

    const entreprise = await Utilisateur.findById(entrepriseId).populate('profils');
    if (!entreprise || !entreprise.profils.some(profil => profil.name === 'Entreprise')) {
      return res.status(404).json({ message: 'Entreprise non trouvée.' });
    }

    await Message.updateMany(
      { expediteur: entrepriseId, destinataire: req.userId, lu: false },
      { $set: { lu: true } }
    );

    res.status(200).json({ success: true, message: 'Messages marqués comme lus.' });
  } catch (error) {
    console.error('Erreur lors du marquage des messages comme lus:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/messages/unread-count/candidat/:candidatId', isAuthenticated, async (req, res) => {
  try {
    const { candidatId } = req.params;
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }

    const candidat = await Utilisateur.findById(candidatId).populate('profils');
    if (!candidat || !candidat.profils.some(profil => profil.name === 'Candidat')) {
      return res.status(404).json({ message: 'Candidat non trouvé.' });
    }

    const unreadCount = await Message.countDocuments({
      expediteur: candidatId,
      destinataire: req.userId,
      lu: false,
    });

    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error('Erreur lors du comptage des messages non lus:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/messages/mark-read/candidat/:candidatId', isAuthenticated, async (req, res) => {
  try {
    const { candidatId } = req.params;
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }

    const candidat = await Utilisateur.findById(candidatId).populate('profils');
    if (!candidat || !candidat.profils.some(profil => profil.name === 'Candidat')) {
      return res.status(404).json({ message: 'Candidat non trouvé.' });
    }

    await Message.updateMany(
      { expediteur: candidatId, destinataire: req.userId, lu: false },
      { $set: { lu: true } }
    );

    res.status(200).json({ success: true, message: 'Messages marqués comme lus.' });
  } catch (error) {
    console.error('Erreur lors du marquage des messages comme lus:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});


// Endpoint to calculate hiring rate
router.get('/hiring-rate', isAuthenticated, async (req, res) => {
  try {
    const adminUser = await Utilisateur.findById(req.userId).populate('profils');
    const isAdmin = adminUser.profils.some((profil) => profil.name === 'Admin');

    if (!isAdmin) {
      return res.status(403).json({
        message: 'Accès refusé. Seuls les administrateurs peuvent accéder à cette statistique.',
      });
    }

    // Count total applications
    const totalApplications = await Candidature.countDocuments();

    // Count signed contracts
    const totalSignedContracts = await Contrat.countDocuments({ etat: 'signé' });

    // Calculate hiring rate
    const hiringRate = totalApplications > 0
      ? ((totalSignedContracts / totalApplications) * 100).toFixed(2)
      : 0;

    res.status(200).json({ hiringRate: parseFloat(hiringRate) });
  } catch (error) {
    console.error('Erreur lors du calcul du taux d\'embauche:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});


// Assign Role to Employee
router.put('/employes/:id/role', isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.userId).populate('profils');
    if (!utilisateur || !utilisateur.profils.some(profil => profil.name === 'Admin' || profil.name === 'Entreprise')) {
      return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs ou entreprises.' });
    }

    const { role } = req.body;
    if (!['Coach', 'Formateur'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide. Les valeurs possibles sont : Coach, Formateur.' });
    }

    const employe = await Utilisateur.findById(req.params.id);
    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé.' });
    }

    employe.role = role;
    await employe.save();

    res.status(200).json({ message: 'Rôle assigné avec succès.', employe });
  } catch (error) {
    console.error('Erreur lors de l\'assignation du rôle:', error.message, error.stack);
    res.status(500).json({ message: 'Erreur serveur, veuillez réessayer.' });
  }
});

module.exports = router;