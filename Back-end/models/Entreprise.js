const mongoose = require("mongoose");

const entrepriseSchema = new mongoose.Schema({
    nom: { type: String, required: true }, // Nom de l'entreprise
    adresse: { type: String }, // Adresse de l'entreprise
    email: { type: String, unique: true, required: true }, // Email unique de l'entreprise
    telephone: { type: String }, // Numéro de téléphone de l'entreprise
    pays: { type: String, required: true }, // Pays où l'entreprise est située
    codePostal: { type: String }, // Code postal de l'entreprise
    offres: [{ type: mongoose.Schema.Types.ObjectId, ref: "Offre" }], // Liste des offres publiées
    Responsable: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true } // Référence à l'utilisateur
}, { timestamps: true });

module.exports = mongoose.model("Entreprise", entrepriseSchema);