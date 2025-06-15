const mongoose = require("mongoose");

const AvenantSchema = new mongoose.Schema({
    titre: {
        type: String,
        required: true, // Le titre est obligatoire
        trim: true, // Supprime les espaces inutiles
    },
    dateEffet: {
        type: Date,
        required: true, // La date d'effet est obligatoire
    },
    description: {
        type: String,
        required: true, // La description est obligatoire
        trim: true,
    },
    contrat: {
        type: mongoose.Schema.Types.ObjectId, // Référence au contrat associé
        ref: "Contrat", // Référence au modèle Contrat
        required: true, // L'ID du contrat est obligatoire
    },
    createdAt: {
        type: Date,
        default: Date.now, // Date de création automatique
    },
    updatedAt: {
        type: Date,
        default: Date.now, // Date de mise à jour automatique
    },
});

// Middleware pour mettre à jour la date de modification avant chaque sauvegarde
AvenantSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("Avenant", AvenantSchema);