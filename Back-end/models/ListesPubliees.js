const express = require("express");
const router = express.Router();
const Offre = require("./Offre");

// Route pour récupérer les offres publiées
router.get('/ListesPubliees', async (req, res) => {
    try {
        // Récupérer uniquement les offres avec le statut "publié"
        const offres = await Offre.find({ status: "publié" }).populate('entreprise', 'nom email');
        res.status(200).json(offres);
    } catch (error) {
        console.error("Erreur lors de la récupération des offres publiées:", error);
        res.status(500).json({ message: "Erreur serveur, veuillez réessayer." });
    }
});

module.exports = router;