import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useLocation, Navigate } from "react-router-dom";

const ProtectedRoute = ({ element, allowedRoles = [], isPublic = false }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userProfile");

  // Nettoyage côté client pour éviter les incohérences
  useEffect(() => {
    if (!token && !isPublic && !location.pathname.includes("/authentification")) {
      localStorage.removeItem("token");
      localStorage.removeItem("userProfile");
    }
  }, [token, isPublic, location.pathname]);

  // Si la route est publique, autoriser l'accès
  if (isPublic) {
    return element;
  }

  // Si pas de token, rediriger vers la page de connexion
  if (!token) {
    return <Navigate to="/authentification/sign-in" replace />;
  }

  // Normalisation des rôles
  const normalizedUserRole = userRole?.toLowerCase()?.trim();
  const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase().trim());

  // Vérification des rôles
  const hasAccess = 
    allowedRoles.length === 0 || 
    normalizedAllowedRoles.includes(normalizedUserRole);

  // Si l'accès est refusé, redirigez vers le tableau de bord approprié
  if (!hasAccess) {
    switch (normalizedUserRole) {
      case 'candidat':
        return <Navigate to="/candidats-dashboard" replace />;
      case 'entreprise':
        return <Navigate to="/entreprise-dashboard" replace />;
      case 'coach':
        return <Navigate to="/coach-dashboard" replace />;
      case 'admin':
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // Si l'accès est accordé, afficher l'élément
  return element;
};

ProtectedRoute.propTypes = {
  element: PropTypes.element.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  isPublic: PropTypes.bool,
};

ProtectedRoute.defaultProps = {
  allowedRoles: [],
  isPublic: false,
};

export default ProtectedRoute;