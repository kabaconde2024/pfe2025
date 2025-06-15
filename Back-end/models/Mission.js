const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const missionSchema = new Schema({
  titre: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  dateDebut: {
    type: Date,
    required: true,
  },
  dateFin: {
    type: Date,
  },
  statut: {
    type: String,
    enum: ['À faire', 'En cours', 'Terminé', 'Validé', 'Annulée'],
    default: 'À faire',
  },
  contrat: {
    type: Schema.Types.ObjectId,
    ref: 'Contrat',
    required: true,
  },
  employee: {
    type: Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  entreprise: {
    type: Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  compteRendu: {
    fileId: {
      type: Schema.Types.ObjectId,
      ref: 'fs.files',
    },
    filename: {
      type: String,
    },
    dateSoumission: {
      type: Date,
    },
    feedbacks: [{
      feedback: {
        type: String,
        required: true,
      },
      feedbackDate: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  entrepriseValidation: {
    type: String,
    enum: ['Pending', 'Validated', 'Rejected'],
    default: 'Pending',
  },
  adminValidation: {
    type: String,
    enum: ['Pending', 'Validated', 'Rejected'],
    default: 'Pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Mission', missionSchema);