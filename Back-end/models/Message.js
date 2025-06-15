const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  expediteur: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur', 
    required: true 
  },
  destinataire: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur', 
    required: true 
  },
  sujet: { 
    type: String, 
    required: true 
  },
  contenu: { 
    type: String, 
    required: true 
  },
  lu: { 
    type: Boolean, 
    default: false 
  },
  dateEnvoi: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);