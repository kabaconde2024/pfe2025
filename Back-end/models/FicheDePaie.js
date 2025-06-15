const mongoose = require('mongoose');

const FicheDePaieSchema = new mongoose.Schema({
  salaireBrut: {
    type: Number,
    required: true,
  },
  salaireNet: {
    type: Number,
    required: true,
  },
  totalHeures: {
    type: Number,
    required: true,
  },
  heuresSupplementaires: {
    type: Number,
    default: 0,
  },
  deductions: [{
    libelle: String,
    montant: Number,
  }],
  annee: {
    type: Number,
    required: true,
  },
  mois: {
    type: Number,
    required: true,
  },
  employe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  contrat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contrat',
    required: true,
  },
  pdfPath: {
    type: String,
  },
  details: {
    heuresNormales: {
      type: Number,
      default: 0,
      // CHANGEMENT: Ajout d'une validation pour garantir des valeurs positives ou nulles
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: 'Les heures normales doivent être positives ou nulles.'
      },
      // CHANGEMENT: Commentaire pour clarifier l'usage
      // Note: Ce champ stocke les heures normales avec précision décimale (ex. 0.033 pour 2 minutes)
    },
    heuresSupplementaires: {
      type: Number,
      default: 0,
      // CHANGEMENT: Validation similaire pour les heures supplémentaires
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: 'Les heures supplémentaires doivent être positives ou nulles.'
      },
    },
    congesPayes: {
      type: Number,
      default: 0,
    },
    absences: [{
      type: {
        type: String,
        required: true,
      },
      jours: {
        type: Number,
        required: true,
      },
    }],
    joursNonJustifies: {
      type: Number,
      default: 0,
    },
    tauxHoraire: {
      type: Number,
      default: 0,
    },
    primes: [{
      libelle: String,
      montant: Number,
    }],
  },
}, { timestamps: true });

module.exports = mongoose.model('FicheDePaie', FicheDePaieSchema);