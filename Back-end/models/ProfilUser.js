const mongoose = require("mongoose");

const profilSchema = new mongoose.Schema({
    metier: { 
        type: String, 
        required: [true, 'Le métier est obligatoire'],
        trim: true,
        minlength: [2, 'Le métier doit contenir au moins 2 caractères'],
        maxlength: [100, 'Le métier ne doit pas dépasser 100 caractères'] 
    },
    competences: [{ 
        type: String, 
        required: [true, 'Au moins une compétence est requise'],
        trim: true,
        maxlength: [50, 'Une compétence ne doit pas dépasser 50 caractères'] 
    }],
    cv: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "CV" 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Utilisateur", 
        required: [true, 'L\'utilisateur est obligatoire']
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model("ProfilUser", profilSchema);