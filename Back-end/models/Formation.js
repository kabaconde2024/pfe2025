const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const formationSchema = new Schema({
  titre: { type: String, required: [true, 'Le titre est obligatoire'], trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  creePar: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  horaire: {
    date: { type: Date }, // Pour virtuel et hybride
    debut: { type: Date }, // Pour présentiel
    fin: { type: Date }, // Pour présentiel
  },
  modalite: { type: String, enum: ['presentiel', 'virtuel', 'hybride', 'contenu'], required: true },
  lieu: { 
    type: String, 
    trim: true,
    maxlength: 200,
    required: [
      function() { return ['presentiel', 'hybride'].includes(this.modalite); },
      'Le lieu est requis pour les formations en présentiel ou hybrides'
    ],
    validate: {
      validator: function(v) { 
        return !['presentiel', 'hybride'].includes(this.modalite) || (v && v.trim().length > 0); 
      },
      message: 'Le lieu ne peut pas être une chaîne vide pour les formations en présentiel ou hybrides'
    }
  },
  meetLink: { 
    type: String, 
    required: [
      function() { return ['virtuel', 'hybride'].includes(this.modalite); },
      'Le lien Meet est requis pour les formations virtuelles ou hybrides'
    ],
    trim: true,
    match: [/^https:\/\/meet\.google\.com\/[a-z0-9-]+$/, 'Lien Google Meet invalide']
  },
  mission: { type: Schema.Types.ObjectId, ref: 'Mission', required: true },
  entreprise: { 
    type: Schema.Types.ObjectId, 
    ref: 'Utilisateur', 
    required: [true, 'L\'entreprise est obligatoire'] 
  },
  employee: { 
    type: Schema.Types.ObjectId, 
    ref: 'Utilisateur', 
    required: [true, 'L\'employé est obligatoire'] 
  },
  formateur: { 
    type: Schema.Types.ObjectId, 
    ref: 'Utilisateur',
    required: [true, 'Un formateur est obligatoire'],
    validate: {
      validator: async function(value) {
        const user = await mongoose.model('Utilisateur').findById(value);
        return user && ['Coach', 'Formateur'].includes(user.role);
      },
      message: 'L\'utilisateur spécifié n\'est pas un Coach ou Formateur'
    }
  },
  statut: { type: String, enum: ['brouillon', 'planifie', 'en-cours', 'termine', 'annule'], default: 'brouillon' },
  typeFormation: {
    type: String,
    enum: ['langue', 'habilitation', 'autre'],
    required: true
  },
  contenus: [{
    typeContenu: { type: String, enum: ['video', 'document', 'quiz', 'autre'], required: true },
    url: { type: String, required: true },
    dateAjout: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

formationSchema.pre('save', function(next) {
  if (this.modalite === 'contenu' && (!this.contenus || this.contenus.length === 0)) {
    return next(new Error('Au moins un contenu est requis pour les formations de type contenu'));
  }
  if (['presentiel', 'virtuel', 'hybride'].includes(this.modalite)) {
    if (this.modalite === 'presentiel') {
      if (!this.horaire?.debut || !this.horaire?.fin) {
        return next(new Error('Les dates de début et de fin sont requises pour les formations en présentiel'));
      }
      if (this.horaire.debut >= this.horaire.fin) {
        return next(new Error('La date de fin doit être postérieure à la date de début'));
      }
      const now = new Date();
      if (this.horaire.debut < now) {
        return next(new Error('La date de début ne peut pas être dans le passé'));
      }
    } else if (['virtuel', 'hybride'].includes(this.modalite)) {
      if (!this.horaire?.date) {
        return next(new Error('La date et l\'heure sont requises pour les formations virtuelles ou hybrides'));
      }
      const now = new Date();
      if (this.horaire.date < now) {
        return next(new Error('La date ne peut pas être dans le passé'));
      }
    }
  }
  next();
});

module.exports = mongoose.model('Formation', formationSchema);