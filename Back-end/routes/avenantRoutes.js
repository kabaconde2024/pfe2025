const express = require("express");
const router = express.Router();
const Avenant = require("../models/Avenant");
const Contrat = require("../models/Contrat");

// Créer un avenant
router.post("/avenants", async (req, res) => {
    try {
        const avenant = new Avenant(req.body);
        await avenant.save();

        // Ajouter l'avenant dans le contrat
        await Contrat.findByIdAndUpdate(
            avenant.contrat,
            { $push: { avenants: avenant._id } }
        );

        res.status(201).json(avenant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Récupérer tous les avenants d'un contrat
router.get("/contrats/:contratId/avenants", async (req, res) => {
    try {
        const avenants = await Avenant.find({ contrat: req.params.contratId });
        res.status(200).json(avenants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Récupérer un avenant par son ID
router.get("/avenants/:id", async (req, res) => {
    try {
        const avenant = await Avenant.findById(req.params.id);
        if (!avenant) {
            return res.status(404).json({ message: "Avenant non trouvé" });
        }
        res.status(200).json(avenant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour un avenant
router.put("/avenants/:id", async (req, res) => {
    try {
        const avenant = await Avenant.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!avenant) {
            return res.status(404).json({ message: "Avenant non trouvé" });
        }
        res.status(200).json(avenant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Supprimer un avenant
router.delete("/avenants/:id", async (req, res) => {
    try {
        const avenant = await Avenant.findByIdAndDelete(req.params.id);
        if (!avenant) {
            return res.status(404).json({ message: "Avenant non trouvé" });
        }
        res.status(200).json({ message: "Avenant supprimé avec succès" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;