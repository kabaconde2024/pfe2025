const express = require('express');
const router = express.Router();
const FicheDePaie = require('../models/FicheDePaie'); // Assurez-vous que le chemin est correct
const isAuthenticated = require('../middlewares/auth');

// Récupérer les fiches de paie avec filtre optionnel par contrat
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { contrat } = req.query;
    const query = {};
    
    if (contrat) {
      if (!/^[0-9a-fA-F]{24}$/.test(contrat)) {
        console.error("Invalid contrat ID:", contrat);
        return res.status(400).json({ success: false, message: "ID de contrat invalide" });
      }
      query.contrat = contrat;
    }

    // Ajouter une vérification pour l'utilisateur connecté
    query.employe = req.userId; // Assumes authMiddleware sets req.userId

    console.log("Fetching fiches de paie with query:", query);
    const fiches = await FicheDePaie.find(query)
      .populate('employe', 'nom prenom')
      .populate('contrat', 'intitulePoste');
    
    console.log("Fiches de paie found:", fiches.length);
    res.status(200).json({ success: true, data: fiches });
  } catch (error) {
    console.error("Erreur lors de la récupération des fiches de paie:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de la récupération des fiches de paie",
      error: error.message 
    });
  }
});

// Récupérer une fiche de paie par ID
router.get('/:id', async (req, res) => {
    try {
        const fiche = await FicheDePaie.findById(req.params.id).populate('employe', 'nom prenom');
        if (!fiche) {
            return res.status(404).json({ message: 'Fiche de paie non trouvée' });
        }
        res.json(fiche);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de la fiche de paie', error });
    }
});

// Créer une nouvelle fiche de paie
router.post('/', async (req, res) => {
    const { salaireBrut, salaireNet, totalHeures, annee, employe } = req.body;

    try {
        const nouvelleFiche = new FicheDePaie({
            salaireBrut,
            salaireNet,
            totalHeures,
            annee,
            employe,
        });

        const ficheSauvegardee = await nouvelleFiche.save();
        res.status(201).json(ficheSauvegardee);
    } catch (error) {
        res.status(400).json({ message: 'Erreur lors de la création de la fiche de paie', error });
    }
});

// Mettre à jour une fiche de paie par ID
router.patch('/:id', async (req, res) => {
    try {
        const fiche = await FicheDePaie.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!fiche) {
            return res.status(404).json({ message: 'Fiche de paie non trouvée' });
        }
        res.json(fiche);
    } catch (error) {
        res.status(400).json({ message: 'Erreur lors de la mise à jour de la fiche de paie', error });
    }
});

// Supprimer une fiche de paie par ID
router.delete('/:id', async (req, res) => {
    try {
        const fiche = await FicheDePaie.findByIdAndDelete(req.params.id);
        if (!fiche) {
            return res.status(404).json({ message: 'Fiche de paie non trouvée' });
        }
        res.json({ message: 'Fiche de paie supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression de la fiche de paie', error });
    }
});

module.exports = router;