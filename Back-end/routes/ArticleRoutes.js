const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const Contrat = require('../models/Contrat');
const authenticateToken = require('../middlewares/auth');

// Route pour ajouter un article
router.post('/articles', authenticateToken, async (req, res) => {
    const { contrat, titreArticle, description } = req.body;

    try {
        // Vérifier que le contrat existe
        const contratExists = await Contrat.findById(contrat);
        if (!contratExists) {
            return res.status(404).json({ success: false, message: "Contrat non trouvé" });
        }

        // Créer un nouvel article
        const newArticle = new Article({
            contrat,
            titreArticle,
            description
        });

        // Sauvegarder le nouvel article
        const savedArticle = await newArticle.save();

        // Mettre à jour le contrat pour ajouter l'ID de l'article
        const updatedContrat = await Contrat.findByIdAndUpdate(
            contrat,
            { $push: { articles: savedArticle._id } },
            { new: true }
        ).populate('articles');

        res.status(201).json({
            success: true,
            message: "Article ajouté avec succès",
            data: {
                article: savedArticle,
                contrat: updatedContrat
            }
        });
    } catch (error) {
        console.error("Erreur lors de l'ajout de l'article:", error);
        res.status(500).json({ success: false, message: "Erreur lors de l'ajout de l'article" });
    }
});

// Route pour obtenir tous les articles
router.get('/articles', authenticateToken, async (req, res) => {
    try {
        const articles = await Article.find().populate('contrat');
        res.status(200).json({ success: true, data: articles });
    } catch (error) {
        console.error("Erreur lors de la récupération des articles:", error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération des articles" });
    }
});

// Route pour obtenir un article par ID
router.get('/articles/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const article = await Article.findById(id).populate('contrat');
        if (!article) {
            return res.status(404).json({ success: false, message: "Article non trouvé" });
        }
        res.status(200).json({ success: true, data: article });
    } catch (error) {
        console.error("Erreur lors de la récupération de l'article:", error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération de l'article" });
    }
});

// Route pour mettre à jour un article par ID
router.put("/articles/:id", authenticateToken, async (req, res) => {
    try {
        const articleId = req.params.id;
        const updates = req.body;

        const updatedArticle = await Article.findByIdAndUpdate(articleId, updates, { new: true });
        if (!updatedArticle) {
            return res.status(404).json({ success: false, message: "Article non trouvé" });
        }

        // Récupérer le contrat mis à jour
        const contrat = await Contrat.findById(updatedArticle.contrat).populate('articles');

        res.status(200).json({
            success: true,
            message: "Article mis à jour avec succès",
            data: {
                article: updatedArticle,
                contrat
            }
        });
    } catch (error) {
        console.error("Erreur lors de la modification de l'article:", error);
        res.status(400).json({ success: false, message: "Données invalides", error: error.message });
    }
});

// Route pour supprimer un article par ID
router.delete("/articles/:id", authenticateToken, async (req, res) => {
    try {
        const articleId = req.params.id;

        // Trouver l'article
        const article = await Article.findById(articleId);
        if (!article) {
            return res.status(404).json({ success: false, message: "Article non trouvé" });
        }

        const contratId = article.contrat;

        // Supprimer l'article
        await Article.findByIdAndDelete(articleId);

        // Retirer l'article du contrat
        const updatedContrat = await Contrat.findByIdAndUpdate(
            contratId,
            { $pull: { articles: articleId } },
            { new: true }
        ).populate('articles');

        res.status(200).json({
            success: true,
            message: "Article supprimé avec succès",
            data: {
                contrat: updatedContrat
            }
        });
    } catch (error) {
        console.error("Erreur lors de la suppression de l'article:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression de l'article" });
    }
});

module.exports = router;