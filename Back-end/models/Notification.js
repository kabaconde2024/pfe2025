const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: false,
  },
  entreprise_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: [
      function () {
        return this.type === 'NOUVELLE_MISSION';
      },
      "L'ID de l'entreprise est requis pour les notifications de type NOUVELLE_MISSION",
    ],
  },
  type: {
    type: String,
    required: [true, 'Le type de notification est requis'],
    enum: {
      values: [
        'ENTRETIEN_PLANIFIE',
        'ENTRETIEN_ANNULE',
        'NOUVELLE_OFFRE',
        'CANDIDATURE_ACCEPTEE',
        'CANDIDATURE_REFUSEE',
        'ENTRETIEN_EVALUE',
        'REPONSE_NOTIFICATION',
        'CONTRAT_PUBLIE',
        'PREPARER_CONTRAT',
        'offre_rejetée',
        'NOUVELLE_MISSION',
        'NEW_USER',
        'FEEDBACK_COMPTE_RENDU',
        'CONTRAT_REJETE_ENTREPRISE',
        'CONTRAT_REJETE_CANDIDAT',
        'NEW_FORMATION', // Added NEW_FORMATION type
        'NEW_FORMATION_ASSIGNMENT'
      ],
      message: 'Type de notification non valide',
    },
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Les données sont requises'],
  },
  contrat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contrat',
    required: false,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: false,
  },
  candidature_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidature',
    required: false,
  },
  offre_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offre',
    required: false,
  },
  formation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Formation',
    required: [
      function () {
        return this.type === 'NEW_FORMATION';
      },
      "L'ID de la formation est requis pour les notifications de type NEW_FORMATION",
    ],
  },
  read: {
    type: Boolean,
    default: false,
  },
  original_notification: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: false,
  },
  replies: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
      },
      sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
      },
      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },
      read: {
        type: Boolean,
        default: false,
      },
      created_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Index pour optimiser les requêtes
NotificationSchema.index({ user_id: 1, read: 1 });
NotificationSchema.index({ entreprise_id: 1, read: 1 });
NotificationSchema.index({ original_notification: 1 });
NotificationSchema.index({ 'replies.sender_id': 1 });
NotificationSchema.index({ adminId: 1, contrat: 1 });
NotificationSchema.index({ formation_id: 1 }); // Index for formation_id

// Méthode pour ajouter une réponse
NotificationSchema.methods.addReply = async function (senderId, content, read = false) {
  this.replies.push({
    sender_id: senderId,
    content: content,
    read: read,
  });
  return this.save();
};

module.exports = mongoose.model('Notification', NotificationSchema);