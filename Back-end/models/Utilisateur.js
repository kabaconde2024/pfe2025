const mongoose = require('mongoose');

const utilisateurSchema = new mongoose.Schema({
  // Champs obligatoires
  nom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  motDePasse: { type: String, required: true },
  
  // Statut de validation
  estValide: { 
    type: Boolean, 
    default: false 
  },
  dateValidation: { 
    type: Date 
  },
  validePar: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur' 
  },
  
  // Champs optionnels pour le profil utilisateur standard
  profils: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Profil' }],
  profilUser: { type: mongoose.Schema.Types.ObjectId, ref: "ProfilUser" },
  annonces: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AnnonceCandidat' 
  }],
  
  // Champs optionnels pour les informations d'entreprise
  nomEntreprise: { type: String },
  adresseEntreprise: { type: String },
  telephoneEntreprise: { type: String },
  paysEntreprise: { type: String },
  codePostalEntreprise: { type: String },
  secteurActivite: { 
    type: String,
    enum: ['Technologie', 'Sante', 'Finance', 'Education', 'Commerce', 'Industrie', 'Autre'],
    default: 'Autre'
  },
  
  // Champs optionnels pour les informations personnelles des candidats
  telephone: { type: String },
  pays: { type: String },
  codePostal: { type: String },
  ville: { type: String },
  adresse: { type: String },
  dateNaissance: { type: Date },
  photoProfil: { type: String },
  
  // Champs pour la réinitialisation du mot de passe
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  
  // Nouveau champ pour l'état actif/inactif
  estActif: { 
    type: Boolean, 
    default: true 
  },
  
  // Nouveau champ pour le rôle (Coach ou Formateur)
  role: {
    type: String,
    enum: ['Coach', 'Formateur'],
  }
}, {
  timestamps: true,
});

// Vérifie si le modèle existe déjà avant de le créer
const Utilisateur = mongoose.models.Utilisateur || mongoose.model('Utilisateur', utilisateurSchema);

module.exports = Utilisateur;