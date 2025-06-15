import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Container,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  IconButton,
  Fade,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { Close, Work, LocationOn, Schedule, Visibility, CheckCircle } from "@mui/icons-material";
import { motion } from "framer-motion";
import { styled } from "@mui/material/styles";
import axios from "axios";

// Palette de couleurs cohérente (same as OffresValidees and ProfilsList)
const themeColors = {
  primary: "#00D1FF",
  primaryHover: "#00B8E0",
  secondary: "#4CAF50",
  accent: "#FF9800",
  textPrimary: "#1A202C",
  textSecondary: "#4A5568",
};

// Styles réutilisables (same as OffresValidees)
const cardStyles = {
  height: "100%",
  textDecoration: "none",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
  },
};

const buttonStyles = {
  px: 4,
  py: 1.5,
  fontWeight: 600,
  fontSize: "1.1rem",
  backgroundColor: themeColors.primary,
  "&:hover": {
    backgroundColor: themeColors.primaryHover,
  },
};

// Styled ActionButton (same as OffresValidees)
const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: "10px",
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.9rem",
  fontFamily: '"Inter", sans-serif',
  padding: theme.spacing(1, 2.5),
  transition: "all 0.2s ease",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: theme.shadows[5],
  },
}));

// Composant pour chaque carte d'offre
const OfferCard = ({ offre, onViewDetails, onValidate, onReject, isAdmin }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.98 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card sx={{ ...cardStyles, borderRadius: "12px" }} aria-label={offre.titre || "Offre sans titre"}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: themeColors.textPrimary,
              fontFamily: '"Inter", sans-serif',
            }}
          >
            {offre.titre || "Titre indisponible"}
          </Typography>
          <IconButton
            onClick={() => onViewDetails(offre)}
            sx={{ color: themeColors.primary }}
            aria-label={`Voir les détails de ${offre.titre || "l'offre"}`}
          >
            <Visibility />
          </IconButton>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Work sx={{ color: themeColors.textSecondary, mr: 1, fontSize: 18 }} />
          <Typography variant="body2" color={themeColors.textSecondary}>
            {offre.metier || "Métier non spécifié"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <LocationOn sx={{ color: themeColors.textSecondary, mr: 1, fontSize: 18 }} />
          <Typography variant="body2" color={themeColors.textSecondary}>
            {offre.ville || "Ville non spécifiée"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Schedule sx={{ color: themeColors.textSecondary, mr: 1, fontSize: 18 }} />
          <Typography variant="body2" color={themeColors.textSecondary}>
            Expire le: {offre.dateExpiration ? new Date(offre.dateExpiration).toLocaleDateString() : "Non spécifiée"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Chip
            label={offre.status || "En attente"}
            size="small"
            sx={{
              fontWeight: 500,
              bgcolor: themeColors.primary,
              color: "#ffffff",
              fontFamily: '"Inter", sans-serif',
            }}
          />
        </Box>
        {isAdmin && (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <ActionButton
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={() => onValidate(offre)}
              sx={{
                bgcolor: themeColors.secondary,
                color: "#ffffff",
                "&:hover": { bgcolor: "#388e3c" },
                fontFamily: '"Inter", sans-serif',
              }}
              aria-label={`Valider l'offre ${offre.titre || ""}`}
            >
              Valider
            </ActionButton>
            <ActionButton
              variant="contained"
              startIcon={<Close />}
              onClick={() => onReject(offre)}
              sx={{
                bgcolor: "#d32f2f",
                color: "#ffffff",
                "&:hover": { bgcolor: "#b71c1c" },
                fontFamily: '"Inter", sans-serif',
              }}
              aria-label={`Rejeter l'offre ${offre.titre || ""}`}
            >
              Rejeter
            </ActionButton>
          </Box>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

// Validation des props pour OfferCard
OfferCard.propTypes = {
  offre: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    titre: PropTypes.string,
    metier: PropTypes.string,
    ville: PropTypes.string,
    dateExpiration: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool.isRequired,
};

// Composant principal
const OffresValidation = () => {
  const navigate = useNavigate();
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openValidationDialog, setOpenValidationDialog] = useState(false);
  const [openRejectionDialog, setOpenRejectionDialog] = useState(false);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [offreToValidate, setOffreToValidate] = useState(null);
  const [offreToReject, setOffreToReject] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const checkAuthToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      clearAuthAndRedirect();
      return false;
    }
    return true;
  };

  const clearAuthAndRedirect = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userProfile");
    navigate("/authentification/sign-in");
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      if (!checkAuthToken()) return;
      const response = await axios.get("http://localhost:5000/api/utilisateur/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      const user = response.data;
      const isAdminUser = user.profils && Array.isArray(user.profils) && user.profils.some(profil => profil.name === 'Admin');
      setIsAdmin(isAdminUser);
    } catch (error) {
      console.error("Erreur lors de la récupération du profil:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Impossible de charger le profil utilisateur",
        severity: "error",
      });
    }
  }, []);

  const fetchPublishedOffres = useCallback(async () => {
    try {
      setLoading(true);
      if (!checkAuthToken()) return;

      const response = await axios.get("http://localhost:5000/api/offres/published", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      setOffres(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur lors de la récupération des offres:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Impossible de charger les offres publiées",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const validateOffre = async () => {
    try {
      if (!checkAuthToken()) return;
      if (!offreToValidate?._id) throw new Error("Aucune offre sélectionnée pour la validation");

      const response = await axios.put(`http://localhost:5000/api/offres/${offreToValidate._id}/validate`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      setSnackbar({
        open: true,
        message: response.data.message || "Offre validée avec succès !",
        severity: "success",
      });
      handleCloseValidationDialog();
      fetchPublishedOffres();
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Impossible de valider l'offre",
        severity: "error",
      });
    }
  };

  const rejectOffre = async () => {
    try {
      if (!checkAuthToken()) return;
      if (!offreToReject?._id) throw new Error("Aucune offre sélectionnée pour le rejet");

      const response = await axios.put(`http://localhost:5000/api/offres/${offreToReject._id}/reject`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      setSnackbar({
        open: true,
        message: response.data.message || "Offre rejetée avec succès !",
        severity: "success",
      });
      handleCloseRejectionDialog();
      fetchPublishedOffres();
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Impossible de rejeter l'offre",
        severity: "error",
      });
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchPublishedOffres();
  }, [fetchUserProfile, fetchPublishedOffres]);

  const handleOpenDetailsDialog = (offre) => {
    setSelectedOffre(offre);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedOffre(null);
  };

  const handleOpenValidationDialog = (offre) => {
    setOffreToValidate(offre);
    setOpenValidationDialog(true);
  };

  const handleCloseValidationDialog = () => {
    setOpenValidationDialog(false);
    setOffreToValidate(null);
  };

  const handleOpenRejectionDialog = (offre) => {
    setOffreToReject(offre);
    setOpenRejectionDialog(true);
  };

  const handleCloseRejectionDialog = () => {
    setOpenRejectionDialog(false);
    setOffreToReject(null);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container
        maxWidth="lg"
        sx={{
          py: 10,
          mt: 13,
          bgcolor: "background.paper",
          borderRadius: "16px",
          boxShadow: 3,
        }}
      >
        {/* Offres Section */}
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 600,
            mb: 3,
            display: "flex",
            alignItems: "center",
            color: themeColors.textPrimary,
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <Work sx={{ mr: 2, color: themeColors.primary }} />
          Offres Publiées Non Validées ({offres.length})
        </Typography>
        {loading ? (
          <Grid container spacing={3}>
            {[...Array(3)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ ...cardStyles, borderRadius: "12px" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="body2" color={themeColors.textSecondary}>
                      Chargement...
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : offres.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography
              variant="h6"
              sx={{
                color: themeColors.textSecondary,
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Aucune offre publiée non validée n'est disponible.
            </Typography>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/admin/offres"
              sx={buttonStyles}
              aria-label="Voir toutes les offres"
            >
              Voir toutes les offres
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {offres.map((offre) => (
              <Grid item xs={12} sm={6} md={4} key={offre._id}>
                <OfferCard
                  offre={offre}
                  onViewDetails={handleOpenDetailsDialog}
                  onValidate={handleOpenValidationDialog}
                  onReject={handleOpenRejectionDialog}
                  isAdmin={isAdmin}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Validation Dialog */}
        <Dialog
          open={openValidationDialog}
          onClose={handleCloseValidationDialog}
          sx={{
            "& .MuiDialog-paper": {
              borderRadius: "16px",
              boxShadow: 10,
              bgcolor: "background.paper",
              maxWidth: "500px",
              width: "100%",
            },
          }}
          TransitionComponent={Fade}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: themeColors.primary,
              color: "#ffffff",
              borderRadius: "16px 16px 0 0",
              py: 3,
              px: 4,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Valider l'Offre
            </Typography>
            <IconButton onClick={handleCloseValidationDialog} sx={{ color: "#ffffff" }} aria-label="Fermer">
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ py: 4, px: 4, bgcolor: "background.paper" }}>
            <Typography
              variant="body1"
              sx={{
                color: themeColors.textPrimary,
                fontFamily: '"Inter", sans-serif',
                fontSize: "1rem",
              }}
            >
              Confirmez-vous la validation de l'offre "{offreToValidate?.titre || "Offre"}" ?
            </Typography>
          </DialogContent>
          <DialogActions
            sx={{
              borderTop: `1px solid ${themeColors.textSecondary}33`,
              p: 3,
              bgcolor: "background.paper",
            }}
          >
            <ActionButton
              onClick={handleCloseValidationDialog}
              variant="outlined"
              sx={{
                borderColor: themeColors.textSecondary,
                color: themeColors.textSecondary,
                "&:hover": { borderColor: themeColors.primary, color: themeColors.primary },
                fontFamily: '"Inter", sans-serif',
              }}
              aria-label="Annuler"
            >
              Annuler
            </ActionButton>
            <ActionButton
              onClick={validateOffre}
              variant="contained"
              sx={{
                bgcolor: themeColors.secondary,
                color: "#ffffff",
                "&:hover": { bgcolor: "#388e3c" },
                fontFamily: '"Inter", sans-serif',
              }}
              aria-label="Valider l'offre"
            >
              Valider
            </ActionButton>
          </DialogActions>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog
          open={openRejectionDialog}
          onClose={handleCloseRejectionDialog}
          sx={{
            "& .MuiDialog-paper": {
              borderRadius: "16px",
              boxShadow: 10,
              bgcolor: "background.paper",
              maxWidth: "500px",
              width: "100%",
            },
          }}
          TransitionComponent={Fade}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: themeColors.primary,
              color: "#ffffff",
              borderRadius: "16px 16px 0 0",
              py: 3,
              px: 4,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Rejeter l'Offre
            </Typography>
            <IconButton onClick={handleCloseRejectionDialog} sx={{ color: "#ffffff" }} aria-label="Fermer">
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ py: 4, px: 4, bgcolor: "background.paper" }}>
            <Typography
              variant="body1"
              sx={{
                color: themeColors.textPrimary,
                fontFamily: '"Inter", sans-serif',
                fontSize: "1rem",
              }}
            >
              Confirmez-vous le rejet de l'offre "{offreToReject?.titre || "Offre"}" ?
            </Typography>
          </DialogContent>
          <DialogActions
            sx={{
              borderTop: `1px solid ${themeColors.textSecondary}33`,
              p: 3,
              bgcolor: "background.paper",
            }}
          >
            <ActionButton
              onClick={handleCloseRejectionDialog}
              variant="outlined"
              sx={{
                borderColor: themeColors.textSecondary,
                color: themeColors.textSecondary,
                "&:hover": { borderColor: themeColors.primary, color: themeColors.primary },
                fontFamily: '"Inter", sans-serif',
              }}
              aria-label="Annuler"
            >
              Annuler
            </ActionButton>
            <ActionButton
              onClick={rejectOffre}
              variant="contained"
              sx={{
                bgcolor: "#d32f2f",
                color: "#ffffff",
                "&:hover": { bgcolor: "#b71c1c" },
                fontFamily: '"Inter", sans-serif',
              }}
              aria-label="Rejeter l'offre"
            >
              Rejeter
            </ActionButton>
          </DialogActions>
        </Dialog>

        {/* Details Dialog */}
        <Dialog
          open={openDetailsDialog}
          onClose={handleCloseDetailsDialog}
          sx={{
            "& .MuiDialog-paper": {
              borderRadius: "16px",
              boxShadow: 10,
              bgcolor: "background.paper",
              maxWidth: "600px",
              width: "100%",
            },
          }}
          TransitionComponent={Fade}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: themeColors.primary,
              color: "#ffffff",
              borderRadius: "16px 16px 0 0",
              py: 3,
              px: 4,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Détails de l'Offre
            </Typography>
            <IconButton onClick={handleCloseDetailsDialog} sx={{ color: "#ffffff" }} aria-label="Fermer">
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ py: 4, px: 4, bgcolor: "background.paper" }}>
            {selectedOffre && (
              <List dense>
                {[
                  { label: "Titre", value: selectedOffre.titre || "Non spécifié" },
                  { label: "Métier", value: selectedOffre.metier || "Non spécifié" },
                  { label: "Nombre de postes", value: selectedOffre.nombrePostes || "Non spécifié" },
                  { label: "Type d'emploi", value: selectedOffre.typeEmploi || "Non spécifié" },
                  { label: "Adresse", value: selectedOffre.adresse || "Non spécifiée" },
                  { label: "Ville", value: selectedOffre.ville || "Non spécifiée" },
                  { label: "Code postal", value: selectedOffre.codePostal || "Non spécifié" },
                  { label: "Responsabilité", value: selectedOffre.responsabilite || "Non spécifiée" },
                  {
                    label: "Compétences requises",
                    value:
                      selectedOffre.competencesRequises && selectedOffre.competencesRequises.length > 0
                        ? selectedOffre.competencesRequises.join(", ")
                        : "Non spécifiées",
                  },
                  { label: "Rémunération", value: selectedOffre.remuneration || "Non spécifiée" },
                  { label: "Description", value: selectedOffre.description || "Non spécifiée" },
                  { label: "Comment postuler", value: selectedOffre.commentPostuler || "Non spécifié" },
                  {
                    label: "Date d'expiration",
                    value: selectedOffre.dateExpiration
                      ? new Date(selectedOffre.dateExpiration).toLocaleDateString()
                      : "Non spécifiée",
                  },
                ].map((item, index) => (
                  <ListItem key={index} sx={{ py: 1 }}>
                    <ListItemText
                      primary={item.label}
                      secondary={item.value}
                      primaryTypographyProps={{
                        fontWeight: 600,
                        color: themeColors.textPrimary,
                        fontFamily: '"Inter", sans-serif',
                      }}
                      secondaryTypographyProps={{
                        color: themeColors.textSecondary,
                        fontFamily: '"Inter", sans-serif',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              borderTop: `1px solid ${themeColors.textSecondary}33`,
              p: 3,
              bgcolor: "background.paper",
            }}
          >
            <ActionButton
              onClick={handleCloseDetailsDialog}
              variant="outlined"
              sx={{
                borderColor: themeColors.textSecondary,
                color: themeColors.textSecondary,
                "&:hover": { borderColor: themeColors.primary, color: themeColors.primary },
                fontFamily: '"Inter", sans-serif',
              }}
              aria-label="Fermer"
            >
              Fermer
            </ActionButton>
          </DialogActions>
        </Dialog>

        {/* Snackbar for Notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{
              width: "100%",
              borderRadius: "10px",
              boxShadow: 5,
              fontFamily: '"Inter", sans-serif',
              bgcolor: snackbar.severity === "success" ? themeColors.secondary : "#fee2e2",
              color: themeColors.textPrimary,
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

export default OffresValidation;