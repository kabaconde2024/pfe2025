const mongoose = require("mongoose");

const offreSchema = new mongoose.Schema({
    titre: {
        type: String,
        required: true,
        trim: true
    },
    metier: {
        type: String,
        required: true,
        trim: true
    },
    nombrePostes: {
        type: Number,
        required: true,
        min: 1
    },
    typeEmploi: {
        type: String,
        enum: ["CDD", "CDI", "Interim", "Temps plein", "Temps partiel", "Freelance", "Stage"],
        required: true
    },
    adresse: {
        type: String,
        required: true
    },
    ville: {
        type: String,
        required: true
    },
    codePostal: {
        type: String,
        required: true
    },
    responsabilite: {
        type: String,
        required: true
    },
    competencesRequises: {
        type: [String],
        required: true,
        validate: {
            validator: function(v) {
                return v.length > 0;
            },
            message: "Au moins une compétence est requise"
        }
    },
    remuneration: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    commentPostuler: {
        type: String,
        default: "Postulez directement via la plateforme en cliquant sur le bouton 'Postuler'"
    },
    dateExpiration: {
        type: Date,
        required: true
    },
    entreprise: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Utilisateur",
        required: true
    },
    candidatures: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidature"
    }],
    nbConsultations: {
        type: Number,
        default: 0
    },
    status: { 
        type: String, 
        enum: ["brouillon", "publié","rejeté"], 
        default: "brouillon" 
    },
     estValidé: {
        type: Boolean,
        default: false
    },
    favoris: { 
        type: Boolean, 
        default: false 
    },
    utilisateursFavoris: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Utilisateur",
        default: []
    }]
}, { 
    timestamps: true 
});

// Index pour les recherches
offreSchema.index({
    titre: "text",
    typeEmploi: "text", 
    adresse: "text",
    ville: "text",
    codePostal: "text",
    responsabilite: "text",
    competencesRequises: "text",
    remuneration: "text",
    description: "text"
}, {
    name: "offre_search_index",
    weights: {
        titre: 10,
        typeEmploi: 5,
        competencesRequises: 5,
        description: 3
    }
});

offreSchema.index({ metier: 1, competencesRequises: 1 });

module.exports = mongoose.model("Offre", offreSchema);