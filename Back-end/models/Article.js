const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
    contrat: { type: mongoose.Schema.Types.ObjectId, ref: "Contrat", required: true },
    titreArticle: { type: String, required: true },     // Titre de l'article
    description: { type: String, required: true }       // Description de l'article
}, { timestamps: true });

module.exports = mongoose.model("Article", articleSchema);