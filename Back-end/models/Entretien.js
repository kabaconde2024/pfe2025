const mongoose = require('mongoose');

const EntretienSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['CANDIDATURE', 'ANNONCE'],
        required: true
    },
    candidature_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidature',
        required: false
    },
    candidat_id: {  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true
    },
    annonce_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AnnonceCandidat',
        required: function() { return this.type === 'ANNONCE'; } // Requis si type est 'ANNONCE'
    },
    offre_id: {  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offre',
        required: false
    },
    date_entretien: {
        type: Date,
        required: true
    },
    meet_link: {
        type: String,
        required: true
    },
    statut: {
        type: String,
        enum: ['Planifié', 'Terminé', 'Annulé'],
        default: 'Planifié'
    },
    notes: {
        type: String,
        default: ''
    },
    resultat: {
        type: String,
        enum: ['Positif', 'Négatif', 'En attente'],
        default: 'En attente'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true
    },
    entreprise_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true
    }
});

EntretienSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('Entretien', EntretienSchema);