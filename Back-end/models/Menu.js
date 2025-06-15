const mongoose = require('mongoose');

const sousMenuSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  route: { type: String, required: true },
  iconUrl: { type: String, required: false }
});

const menuSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  route: { type: String, required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', default: null },
  profil: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profil'
  }],
  sousMenus: [sousMenuSchema],
  iconUrl: { type: String, required: false },
  menuType: { type: String, enum: ['menu', 'sous-menu'], default: 'menu' }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Menu', menuSchema);