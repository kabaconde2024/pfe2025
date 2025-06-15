const mongoose = require("mongoose");

// Définition du schéma
const contratSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: [true, "Le titre du contrat est obligatoire"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: [true, "L'utilisateur est obligatoire"],
    },
    entreprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: [true, "L'entreprise est obligatoire"],
    },
    entretien: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entretien",
    },
    offre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offre",
    },
    articles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Article",
      },
    ],
    avenants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Avenant",
      },
    ],
    fichesDePaie: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FicheDePaie",
      },
    ],
    pointages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pointage",
      },
    ],
    missions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Mission",
      },
    ],
    typeContrat: {
      type: String,
      enum: ["CDI", "CDD", "FREELANCE", "STAGE", "ALTERNANCE", "TEMPS PARTIEL", "TEMPS PLEIN"],
      required: [true, "Le type de contrat est obligatoire"],
    },
    dateDebut: {
      type: Date,
      required: [true, "La date de début est obligatoire"],
    },
    dateFin: {
      type: Date,
    },
    intitulePoste: {
      type: String,
      required: [true, "L'intitulé du poste est obligatoire"],
    },
    tempsTravail: {
      type: String,
      required: [true, "Le temps de travail est obligatoire"],
    },
    salaire: {
      type: String,
      required: [true, "Le salaire est obligatoire"],
    },
    modalitesPaiement: {
      type: String,
      required: [true, "Les modalités de paiement sont obligatoires"],
    },
    signatureAdmin: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur" },
      date: { type: Date },
      signature: { type: String }, // URL ou base64
    },
    signatureEntreprise: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur" },
      date: { type: Date },
      signature: { type: String },
    },
    signatureCandidat: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur" },
      date: { type: Date },
      signature: { type: String },
    },
    approbationCandidat: {
      type: {
        approuve: { 
          type: Boolean, 
          default: null 
        },
        date: { 
          type: Date 
        },
        commentaire: { 
          type: String, 
          trim: true, 
          default: "" 
        },
      },
      validate: {
        validator: function (value) {
          // Si approuve est true ou false, date doit être définie
          if (value.approuve !== null && !value.date) {
            return false;
          }
          // Si approuve est null, date doit être null
          if (value.approuve === null && value.date) {
            return false;
          }
          return true;
        },
        message: "La date est requise pour une approbation ou un rejet, et doit être absente si non approuvé.",
      },
    },
    approbationEntreprise: {
      type: {
        approuve: { 
          type: Boolean, 
          default: null 
        },
        date: { 
          type: Date 
        },
        commentaire: { 
          type: String, 
          trim: true, 
          default: "" 
        },
      },
      validate: {
        validator: function (value) {
          if (value.approuve !== null && !value.date) {
            return false;
          }
          if (value.approuve === null && value.date) {
            return false;
          }
          return true;
        },
        message: "La date est requise pour une approbation ou un rejet, et doit être absente si non approuvé.",
      },
    },
    estComplete: { 
      type: Boolean, 
      default: false 
    },
    etat: {
      type: String,
      enum: [
        "en_attente_approbation",
        "approuve_partiellement",
        "approuve",
        "rejete",
        "non_signe",
        "signé",
        "resilie",
      ],
      default: "en_attente_approbation",
    },
    dateSignature: { 
      type: Date 
    },
    pdfPath: { 
      type: String, 
      default: null 
    },
    published: { 
      type: Boolean, 
      default: false 
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index pour recherche
contratSchema.index({ titre: "text", intitulePoste: "text" });

// Middleware pour le populate automatique
contratSchema.pre(/^find/, function (next) {
  this.populate("user", "nom prenom email")
    .populate("entreprise", "nomEntreprise adresseEntreprise")
    .populate("offre", "titre description");
  next();
});

// Export du modèle
module.exports = mongoose.model("Contrat", contratSchema);