const jwt = require('jsonwebtoken');

const isAuthenticated = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Non autorisé, token manquant" });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.id; // Vérifiez que le payload contient bien 'id'
        next();
    } catch (error) {
        console.error("Erreur de vérification du token:", error);
        return res.status(403).json({ message: "Token invalide" });
    }
};

module.exports = isAuthenticated;
