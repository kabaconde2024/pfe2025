const express = require('express');
const mongoose = require('mongoose');
const Menu = require('../models/Menu'); // Mettez à jour le chemin de votre modèle Menu
const Profil = require('../models/Profil'); // Mettez à jour le chemin de votre modèle Profil

const router = express.Router();

router.post('/', async (req, res) => {
    const { nom, route, parent, menuType, iconUrl } = req.body;

    try {
        if (parent && !mongoose.isValidObjectId(parent)) {
            return res.status(400).json({ message: "ID de menu parent non valide." });
        }

        let savedMenu;

        if (menuType === "sous-menu" && parent) {
            const parentMenu = await Menu.findById(parent);
            if (!parentMenu) {
                return res.status(400).json({ message: "Menu parent non trouvé." });
            }

            const sousMenu = {
                nom,
                route,
                iconUrl: iconUrl || null
            };

            parentMenu.sousMenus.push(sousMenu);
            savedMenu = await parentMenu.save();
        } else {
            const menu = new Menu({
                nom,
                route,
                parent: null,
                sousMenus: [],
                iconUrl: iconUrl || null,
                menuType: "menu"
            });

            savedMenu = await menu.save();
        }

        return res.status(201).json({
            message: menuType === "sous-menu" ? "Sous-menu créé avec succès" : "Menu créé avec succès",
            menu: savedMenu
        });
    } catch (err) {
        console.error("Erreur lors de la création du menu :", err);
        res.status(500).json({ message: "Erreur serveur.", error: err.message });
    }
});


// Route pour récupérer tous les menus et sous-menus
router.get('/', async (req, res) => {
    try {
        const menus = await Menu.find().populate('sousMenus'); // Récupère les sous-menus
        return res.status(200).json({ menus });
    } catch (err) {
        console.error("Erreur lors de la récupération des menus :", err);
        res.status(500).json({ message: "Erreur serveur.", error: err.message });
    }
});

// Route pour récupérer un menu par ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    // Vérifiez que l'ID est un ObjectId valide
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "ID de menu non valide." });
    }

    try {
        // Rechercher le menu par son ID
        const menu = await Menu.findById(id).populate('sousMenus');
        if (!menu) {
            return res.status(404).json({ message: "Menu non trouvé." });
        }
        
        // Inclure les sous-menus directement dans la réponse
        res.status(200).json(menu);
    } catch (err) {
        console.error("Erreur lors de la récupération du menu :", err);
        res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
});

// Route pour supprimer un menu
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "ID de menu non valide." });
        }

        const deletedMenu = await Menu.findByIdAndDelete(id);
        if (!deletedMenu) {
            return res.status(404).json({ message: "Menu non trouvé." });
        }

        return res.status(200).json({ message: "Menu supprimé avec succès." });
    } catch (err) {
        console.error("Erreur lors de la suppression du menu :", err);
        res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
});

// Route pour supprimer un sous-menu
router.delete('/sousMenu/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "ID de sous-menu non valide." });
        }

        const menu = await Menu.findOne({ 'sousMenus._id': id });
        if (!menu) {
            return res.status(404).json({ message: "Sous-menu non trouvé." });
        }

        menu.sousMenus = menu.sousMenus.filter(sousMenu => sousMenu._id.toString() !== id);
        await menu.save();

        return res.status(200).json({ message: "Sous-menu supprimé avec succès." });
    } catch (err) {
        console.error("Erreur lors de la suppression du sous-menu :", err);
        res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
});

// Route pour mettre à jour un menu
router.put('/:id', async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "ID de menu non valide." });
    }

    try {
        const updatedMenu = await Menu.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedMenu) {
            return res.status(404).json({ message: "Menu non trouvé." });
        }
        res.status(200).json(updatedMenu);
    } catch (err) {
        console.error("Erreur lors de la mise à jour du menu :", err);
        res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
});

router.get('/sous-menu/:id', async (req, res) => {
    const { id } = req.params;

    // Vérifiez que l'ID est un ObjectId valide
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "ID de sous-menu non valide." });
    }

    try {
        // Rechercher tous les menus pour trouver le sous-menu
        const menu = await Menu.findOne({ 'sousMenus._id': id });

        if (!menu) {
            return res.status(404).json({ message: "Sous-menu non trouvé." });
        }

        // Trouver le sous-menu
        const sousMenu = menu.sousMenus.id(id);
        res.status(200).json(sousMenu);
    } catch (err) {
        console.error("Erreur lors de la récupération du sous-menu :", err);
        res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
});

// Route pour mettre à jour un sous-menu
router.put('/sous-menu/:id', async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "ID de sous-menu non valide." });
    }

    try {
        const menu = await Menu.findOne({ 'sousMenus._id': id });
        if (!menu) {
            return res.status(404).json({ message: "Sous-menu non trouvé." });
        }

        // Mettre à jour les données du sous-menu
        const sousMenu = menu.sousMenus.id(id);
        sousMenu.set(req.body); // Met à jour le sous-menu avec les données fournies dans le corps de la requête

        await menu.save();
        res.status(200).json(sousMenu);
    } catch (err) {
        console.error("Erreur lors de la mise à jour du sous-menu :", err);
        res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
});

router.post('/associer-menu-profil', async (req, res) => {
    const { menuId, id_profil } = req.body;

    try {
        if (!mongoose.isValidObjectId(menuId) || !Array.isArray(id_profil) || !id_profil.every(id => mongoose.isValidObjectId(id))) {
            return res.status(400).json({ message: "Un ou plusieurs ID de menu ou de profil non valides." });
        }

        const menu = await Menu.findById(menuId);
        if (!menu) {
            return res.status(404).json({ message: "Menu non trouvé." });
        }

        // Assurez-vous que le tableau 'profil' existe et ajoutez les ID
        if (!Array.isArray(menu.profil)) {
            menu.profil = [];
        }
        menu.profil.push(...id_profil);
        await menu.save();

        // Ajouter ce menu à chaque profil concerné
        for (const profilId of id_profil) {
            const profil = await Profil.findById(profilId);
            if (profil) {
                // Assurez-vous que le tableau 'menus' existe
                if (!Array.isArray(profil.menus)) {
                    profil.menus = [];
                }
                profil.menus.push(menu._id);
                await profil.save();
            }
        }

        return res.status(200).json({ message: "Menu associé aux profils avec succès.", menu });
    } catch (err) {
        console.error("Erreur lors de l'association du menu aux profils :", err);
        res.status(500).json({ message: "Erreur serveur.", error: err.message });
    }
});

router.post('/dissocier-menu-profil', async (req, res) => {
    const { profilId, menuId } = req.body;
    
    try {
        // Vérification des ObjectId
        if (!mongoose.isValidObjectId(profilId) || !mongoose.isValidObjectId(menuId)) {
            return res.status(400).json({ message: "ID de menu ou de profil non valide." });
        }

        // Trouver le menu et dissocier le profil
        const menu = await Menu.findById(menuId);
        if (!menu) {
            return res.status(404).json({ message: "Menu non trouvé." });
        }

        menu.profil.pull(profilId); // Retirer l'ID du profil
        await menu.save();

        // Retirer ce menu du profil concerné
        const profil = await Profil.findById(profilId);
        if (profil) {
            profil.menus.pull(menu._id); // Retirer l'ID du menu
            await profil.save();
        }

        return res.status(200).json({ message: "Profil dissocié du menu avec succès." });
    } catch (error) {
        console.error("Erreur lors de la dissociation :", error);
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
});




module.exports = router;