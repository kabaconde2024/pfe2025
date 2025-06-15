import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider,
  CircularProgress,
} from "@mui/material";
import { Close, Work, LocationOn, Schedule, Visibility, Event, Cancel, TimerOff } from "@mui/icons-material";
import { motion } from "framer-motion";
import { styled } from "@mui/material/styles";
import axios from "axios";

// Palette de couleurs cohérente (same as OffresValidees, OffresValidation, and ProfilsList)
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
const OfferCard = ({ offre, onViewDetails }) => (
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
            {offre.metier?.titre || "Métier non spécifié"}
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
            {offre.dateExpiration ? new Date(offre.dateExpiration).toLocaleDateString() : "Non spécifiée"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            label={offre.status === "rejeté" ? "Rejeté" : "Expiré"}
            color={offre.status === "rejeté" ? "error" : "default"}
            size="small"
            sx={{
              fontWeight: 600,
              fontFamily: '"Inter", sans-serif',
            }}
          />
        </Box>
      </CardContent>
    </Card>
  </motion.div>
);

// Validation des props pour OfferCard
OfferCard.propTypes = {
  offre: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    titre: PropTypes.string,
    metier: PropTypes.shape({
      titre: PropTypes.string,
    }),
    ville: PropTypes.string,
    dateExpiration: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

// Composant principal
const OffresClotureesStats = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOffres: 0,
    offres: [],
    repartitionRaison: [],
    evolutionParMois: [],
    repartitionTypeEmploi: [],
    moyenneCandidatures: 0,
  });
  const [loading, setLoading] = useState(true);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedOffre, setSelectedOffre] = useState(null);

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

  const fetchClosedStats = useCallback(async () => {
    try {
      setLoading(true);
      if (!checkAuthToken()) return;

      const response = await axios.get("http://localhost:5000/api/offres/closed/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      setStats({
        totalOffres: response.data.totalOffres || 0,
        offres: Array.isArray(response.data.offres) ? response.data.offres : [],
        repartitionRaison: Array.isArray(response.data.repartitionRaison) ? response.data.repartitionRaison : [],
        evolutionParMois: Array.isArray(response.data.evolutionParMois) ? response.data.evolutionParMois : [],
        repartitionTypeEmploi: Array.isArray(response.data.repartitionTypeEmploi) ? response.data.repartitionTypeEmploi : [],
        moyenneCandidatures: response.data.moyenneCandidatures || 0,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenDetailsDialog = (offre) => {
    setSelectedOffre(offre);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedOffre(null);
  };

  useEffect(() => {
    fetchClosedStats();
  }, [fetchClosedStats]);

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
        {/* Métriques clés */}
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
          <TimerOff sx={{ mr: 2, color: themeColors.primary }} />
          Statistiques des Offres Clôturées
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card sx={{ ...cardStyles, borderRadius: "12px", bgcolor: "background.paper" }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 500, color: themeColors.textSecondary, fontFamily: '"Inter", sans-serif' }}
                  >
                    Total Offres Clôturées
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: themeColors.textPrimary, mt: 1, fontFamily: '"Inter", sans-serif' }}
                  >
                    {stats.totalOffres}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card sx={{ ...cardStyles, borderRadius: "12px", bgcolor: "background.paper" }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 500, color: themeColors.textSecondary, fontFamily: '"Inter", sans-serif' }}
                  >
                    Moyenne Candidatures par Offre
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: themeColors.textPrimary, mt: 1, fontFamily: '"Inter", sans-serif' }}
                  >
                    {stats.moyenneCandidatures.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Statistiques détaillées */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Répartition par raison */}
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card sx={{ ...cardStyles, borderRadius: "12px", bgcolor: "background.paper" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Cancel sx={{ color: themeColors.accent, mr: 1, fontSize: 24 }} />
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: themeColors.textPrimary, fontFamily: '"Inter", sans-serif' }}
                    >
                      Répartition par Raison
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2, borderColor: `${themeColors.textSecondary}33` }} />
                  {stats.repartitionRaison.length > 0 ? (
                    stats.repartitionRaison.map((item) => (
                      <Box key={item.raison} sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: themeColors.textPrimary, fontFamily: '"Inter", sans-serif' }}
                        >
                          {item.raison.charAt(0).toUpperCase() + item.raison.slice(1)}
                        </Typography>
                        <Chip
                          label={item.count}
                          size="small"
                          sx={{
                            bgcolor: item.raison === "rejeté" ? "#fee2e2" : themeColors.primary,
                            color: item.raison === "rejeté" ? "#b91c1c" : "#ffffff",
                            fontWeight: 600,
                            fontFamily: '"Inter", sans-serif',
                          }}
                        />
                      </Box>
                    ))
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: themeColors.textSecondary, fontFamily: '"Inter", sans-serif' }}
                    >
                      Aucune donnée disponible
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          {/* Évolution par mois */}
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card sx={{ ...cardStyles, borderRadius: "12px", bgcolor: "background.paper" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Event sx={{ color: themeColors.primary, mr: 1, fontSize: 24 }} />
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: themeColors.textPrimary, fontFamily: '"Inter", sans-serif' }}
                    >
                      Évolution par Mois
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2, borderColor: `${themeColors.textSecondary}33` }} />
                  {stats.evolutionParMois.length > 0 ? (
                    stats.evolutionParMois.map((item) => (
                      <Box key={item.mois} sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: themeColors.textPrimary, fontFamily: '"Inter", sans-serif' }}
                        >
                          {item.mois}
                        </Typography>
                        <Chip
                          label={item.count}
                          size="small"
                          sx={{
                            bgcolor: themeColors.primary,
                            color: "#ffffff",
                            fontWeight: 600,
                            fontFamily: '"Inter", sans-serif',
                          }}
                        />
                      </Box>
                    ))
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: themeColors.textSecondary, fontFamily: '"Inter", sans-serif' }}
                    >
                      Aucune donnée disponible
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          {/* Répartition par type d'emploi */}
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card sx={{ ...cardStyles, borderRadius: "12px", bgcolor: "background.paper" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Work sx={{ color: themeColors.secondary, mr: 1, fontSize: 24 }} />
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: themeColors.textPrimary, fontFamily: '"Inter", sans-serif' }}
                    >
                      Répartition par Type d'Emploi
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2, borderColor: `${themeColors.textSecondary}33` }} />
                  {stats.repartitionTypeEmploi.length > 0 ? (
                    stats.repartitionTypeEmploi.map((item) => (
                      <Box key={item.type} sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: themeColors.textPrimary, fontFamily: '"Inter", sans-serif' }}
                        >
                          {item.type}
                        </Typography>
                        <Chip
                          label={item.count}
                          size="small"
                          sx={{
                            bgcolor: themeColors.secondary,
                            color: "#ffffff",
                            fontWeight: 600,
                            fontFamily: '"Inter", sans-serif',
                          }}
                        />
                      </Box>
                    ))
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: themeColors.textSecondary, fontFamily: '"Inter", sans-serif' }}
                    >
                      Aucune donnée disponible
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Historique des offres clôturées */}
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
          Historique des Offres Clôturées ({stats.offres.length})
        </Typography>
        {loading ? (
          <Grid container spacing={3}>
            {[...Array(3)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ ...cardStyles, borderRadius: "12px" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, fontFamily: '"Inter", sans-serif' }}>
                      Chargement...
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : stats.offres.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography
              variant="h6"
              sx={{
                color: themeColors.textSecondary,
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Aucune offre clôturée n'est disponible.
            </Typography>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/OffresValidees"
              sx={buttonStyles}
              aria-label="Voir toutes les offres"
            >
              Voir toutes les offres
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {stats.offres.map((offre) => (
              <Grid item xs={12} sm={6} md={4} key={offre._id}>
                <OfferCard offre={offre} onViewDetails={handleOpenDetailsDialog} />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Dialogue des détails */}
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
                  { label: "Métier", value: selectedOffre.metier?.titre || "Non spécifié" },
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
                  { label: "Nombre de consultations", value: selectedOffre.nbConsultations || 0 },
                  { label: "Statut", value: selectedOffre.status || "Inconnu" },
                  { label: "Raison de clôture", value: selectedOffre.status === "rejeté" ? "Rejeté" : "Expiré" },
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

        {/* Loading Indicator */}
        {loading && (
          <Box sx={{ position: "fixed", top: 20, right: 20 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default OffresClotureesStats;