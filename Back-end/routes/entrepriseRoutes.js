const express = require("express");
const router = express.Router();
const Entreprise = require('../models/Entreprise'); // Importation correcte
const Offre = require('../models/Offre'); // Importer le modèle Offre
const isAuthenticated = require('../middlewares/auth'); // Importez le middleware d'authentification
 // Chemin correct vers votre middleware

 router.post("/", async (req, res) => {
    const { nom, adresse, email, telephone, pays, codePostal, offres, utilisateurId } = req.body;

    // Vérifiez si les champs requis sont présents
    if (!nom || !email || !pays || !utilisateurId) {
        return res.status(400).json({ message: "Nom, email, pays et utilisateur sont requis." });
    }

    try {
        const entreprise = new Entreprise({
            nom,
            adresse,
            email,
            telephone,
            pays, 
            codePostal,
            offres,
            Responsable: utilisateurId // Utilisation de l'utilisateur passé dans la requête
        });

        await entreprise.save();
        res.status(201).json(entreprise);
    } catch (error) {
        console.error("Erreur lors de la création de l'entreprise:", error);
        res.status(400).json({ message: "Erreur lors de la création de l'entreprise.", error: error.message });
    }
});

// Route pour récupérer toutes les entreprises
router.get("/", async (req, res) => {
    try {
        const entreprises = await Entreprise.find().populate("offres");
        res.status(200).json(entreprises);
    } catch (error) {
        console.error("Erreur lors de la récupération des entreprises:", error);
        res.status(500).json({ message: "Erreur lors de la récupération des entreprises." });
    }
});

// Route pour récupérer une entreprise par ID
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const entreprise = await Entreprise.findById(id).populate("offres");
        if (!entreprise) {
            return res.status(404).json({ message: "Entreprise non trouvée." });
        }
        res.status(200).json(entreprise);
    } catch (error) {
        console.error("Erreur lors de la récupération de l'entreprise:", error);
        res.status(500).json({ message: "Erreur lors de la récupération de l'entreprise." });
    }
});

// Route pour mettre à jour une entreprise par ID
router.put("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const entreprise = await Entreprise.findByIdAndUpdate(id, req.body, { new: true });
        if (!entreprise) {
            return res.status(404).json({ message: "Entreprise non trouvée." });
        }
        res.status(200).json(entreprise);
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'entreprise:", error);
        res.status(400).json({ message: "Erreur lors de la mise à jour de l'entreprise." });
    }
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const entreprise = await Entreprise.findByIdAndDelete(id); // Modification ICI
        if (!entreprise) {
            return res.status(404).json({ message: "Entreprise non trouvée." });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        console.error("Erreur lors de la suppression de l'entreprise:", error);
        res.status(500).json({ message: "Erreur lors de la suppression de l'entreprise." });
    }
});

module.exports = router;