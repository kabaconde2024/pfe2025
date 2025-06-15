const mongoose = require('mongoose');

const cvSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  path: String,
  mimetype: String,
  size: Number,
  url: String
}, { _id: false });

const profilCvSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  competences: {  // Changé de 'competence' à 'competences' (tableau)
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.length > 0; // Au moins une compétence
      },
      message: "Au moins une compétence est requise"
    }
  },
  metier: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },
  cv: cvSchema
}, {
  timestamps: true
});

module.exports = mongoose.model('ProfilCv', profilCvSchema);