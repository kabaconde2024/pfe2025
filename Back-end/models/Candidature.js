const mongoose = require('mongoose');

const candidatureSchema = new mongoose.Schema({
    offre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offre',
        required: true
    },
    candidat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true
    },
    profilCv: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProfilCv',
        required: true
    },
    statut: {
        type: String,
        enum: ['En attente', 'Acceptée', 'Refusée', 'En cours d\'évaluation'],
        default: 'En attente'
    },
    cv: {
        data: Buffer,
        contentType: String,
        originalName: String,
        size: Number
    },
    videoMotivation: {
        data: Buffer,
        contentType: String,
        originalName: String,
        size: Number,
        duration: Number // en secondes
    },
    lettreMotivation: {
        data: Buffer,
        contentType: String,
        originalName: String,
        size: Number
    },
    datePostulation: {
        type: Date,
        default: Date.now
    },
    dateEvaluation: {
        type: Date
    },
    commentaires: {
        type: String
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: false
    },
    entretien: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entretien',
        required: false
    }
}, {
    timestamps: true
});

// Vérifiez si le modèle existe déjà pour éviter OverwriteModelError
const Candidature = mongoose.models.Candidature || mongoose.model('Candidature', candidatureSchema);

// Création des index
candidatureSchema.index({ offre: 1, candidat: 1 }, { unique: true });
candidatureSchema.index({ statut: 1 });
candidatureSchema.index({ datePostulation: -1 });

module.exports = Candidature;