const mongoose = require("mongoose");

const annonceCandidatSchema = new mongoose.Schema({
  titre: { 
    type: String, 
    required: [true, "Le titre de l'annonce est obligatoire"],
    trim: true,
    maxlength: [100, "Le titre ne peut pas dépasser 100 caractères"]
  },
  metier: {
    type: String,
    required: [true, "Le métier est obligatoire"],
    trim: true,
    maxlength: [50, "Le métier ne peut pas dépasser 50 caractères"]
  },
  description: { 
    type: String, 
    required: [true, "La description est obligatoire"],
    minlength: [50, "La description doit contenir au moins 50 caractères"]
  },
  typeContrat: { 
    type: String, 
    enum: {
      values: ["CDI", "CDD", "Stage", "Freelance", "Alternance"],
      message: "Type de contrat non valide"
    },
    required: [true, "Le type de contrat est obligatoire"],
    default: "CDI"
  },
  localisation: { 
    type: String, 
    required: [true, "La localisation est obligatoire"],
    trim: true,
  },
  competencesRequises: [{ 
    type: String,
    required: [true, "Au moins une compétence est requise"],
    trim: true
  }],
  salaireSouhaite: { 
    type: Number,
    min: [0, "Le salaire ne peut pas être négatif"],
    max: [1000000, "Le salaire ne peut pas dépasser 1 000 000"]
  },
  status: {
    type: String,
    enum: {
      values: ["en attente", "publié", "expiré", "archivé", "rejeté"],
      message: "Statut non valide"
    },
    default: "en attente"
  },
  estValide: { 
    type: Boolean, 
    default: false
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, "La raison du rejet ne peut pas dépasser 500 caractères"]
  },
  dateExpiration: {
    type: Date,
    default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) // 30 jours
  },
  candidat: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Utilisateur", 
    required: [true, "L'identifiant du candidat est obligatoire"]
  },
  profilCv: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProfilCv",
    required: [true, "Le profil CV est obligatoire"]
  },
  profilLie: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ProfilUser",
  },
  sauvegardesPar: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur",
    default: []
  }],
  nombreSauvegardes: {
    type: Number,
    default: 0
  },
  entretien: { // New field to store interview ID
    type: mongoose.Schema.Types.ObjectId,
    ref: "Entretien",
    required: false
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
annonceCandidatSchema.index({ titre: "text", description: "text" });
annonceCandidatSchema.index({ metier: 1 });
annonceCandidatSchema.index({ typeContrat: 1 });
annonceCandidatSchema.index({ localisation: 1 });
annonceCandidatSchema.index({ competencesRequises: 1 });
annonceCandidatSchema.index({ sauvegardesPar: 1 });
annonceCandidatSchema.index({ status: 1 });
annonceCandidatSchema.index({ candidat: 1, createdAt: -1 });

// Middleware pour maintenir le compteur et gérer l'expiration
annonceCandidatSchema.pre("save", function(next) {
  this.nombreSauvegardes = this.sauvegardesPar.length;

  // Gérer l'expiration
  if (this.dateExpiration < new Date() && this.status !== "expiré") {
    this.status = "expiré";
  } else if (this.status === "rejeté") {
    this.estValide = false;
  }

  // Empêcher la publication sans profilCv
  if (this.status === "publié" && !this.profilCv) {
    const error = new Error("Un profil CV est requis pour publier une annonce");
    return next(error);
  }

  next();
});

// Méthode pour vérifier si l'annonce est expirée
annonceCandidatSchema.methods.estExpiree = function() {
  return this.dateExpiration < new Date();
};

// Méthode pour publier l'annonce
annonceCandidatSchema.methods.publier = async function() {
  if (this.estExpiree()) {
    throw new Error("Impossible de publier une annonce expirée");
  }
  if (!this.profilCv) {
    throw new Error("Un profil CV est requis pour publier");
  }
  this.status = "publié";
  this.dateExpiration = new Date(+new Date() + 30 * 24 * 60 * 60 * 1000); // Reset expiration
  await this.save();
};

// Méthode pour dépublier l'annonce
annonceCandidatSchema.methods.depublier = async function() {
  this.status = "en attente";
  await this.save();
};

// Méthode pour rejeter l'annonce
annonceCandidatSchema.methods.rejeter = async function(reason) {
  this.status = "rejeté";
  this.estValide = false;
  this.rejectionReason = reason || "";
  await this.save();
};

module.exports = mongoose.model("AnnonceCandidat", annonceCandidatSchema);