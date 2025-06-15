const mongoose = require('mongoose');

const PointageSchema = new mongoose.Schema({
    pointages: [{
        date: { 
            type: Date, 
            required: true 
        },
        heure_debut: { 
            type: String,
            required: true,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format de l\'heure_debut doit être HH:mm']
        },
        heure_fin: { 
            type: String,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format de l\'heure_fin doit être HH:mm']
        },
        pause: {
            type: Number,
            default: 1,
            min: [0, 'La pause ne peut pas être négative'],
            required: true
        },
        heures_supplementaires: { 
            type: Number, 
            default: 0,
            min: [0, 'Les heures supplémentaires ne peuvent pas être négatives']
        },
        commentaires: { 
            type: String 
        },
        statut: {
            type: String,
            enum: ['en attente', 'validé', 'rejeté'],
            default: 'en attente',
            required: true
        }
    }],
    absences: [{
        type: { 
            type: String, 
            enum: ['maladie', 'congé payé', 'congé sans solde', 'autre'],
            required: true 
        },
        date: { 
            type: Date, 
            required: true 
        },
        duree_jours: { 
            type: Number, 
            required: true,
            min: [1, 'La durée doit être d\'au moins 1 jour']
        },
        justificatif: { 
            type: String 
        },
        commentaires: { 
            type: String 
        },
        statut: {
            type: String,
            enum: ['en attente', 'validé', 'rejeté'],
            default: 'en attente',
            required: true
        }
    }],
    statut_global: {
        type: String,
        enum: ['en attente', 'validé', 'rejeté'],
        default: 'en attente',
        required: true
    },
    mois_valides: [{
        mois: {
            type: String,
            required: true,
            match: [/^\d{1,2}\/\d{4}$/, 'Le format du mois doit être MM/YYYY']
        },
        statut: {
            type: String,
            enum: ['en attente', 'validé', 'rejeté'],
            default: 'en attente',
            required: true
        },
        date_validation: {
            type: Date,
            default: null
        },
        valide_par: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Utilisateur'
        }
    }],
    utilisateur: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Utilisateur', 
        required: true 
    },
    contrat: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Contrat', 
        required: true 
    }
}, { 
    timestamps: true 
});

// Index pour optimiser les recherches
PointageSchema.index({ utilisateur: 1, contrat: 1 });
PointageSchema.index({ 'mois_valides.mois': 1 });

module.exports = mongoose.model('Pointage', PointageSchema);