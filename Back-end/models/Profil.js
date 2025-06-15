const mongoose = require('mongoose');

const ProfilSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' }], // Relation N-N avec Utilisateur
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  menus: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }],
  photo: {
    data: Buffer,
    contentType: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Profil', ProfilSchema);