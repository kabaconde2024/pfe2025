/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Paper,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Icon,
} from "@mui/material";
import { LocationOn, Event, Business, Group, Work, CheckCircle } from "@mui/icons-material";
import { motion } from "framer-motion";
import axios from "axios";

// Palette de couleurs cohérente
const themeColors = {
  primary: "#00D1FF",
  primaryHover: "#00B8E0",
  secondary: "#4CAF50",
  accent: "#FF9800",
  textPrimary: "#1A202C",
  textSecondary: "#4A5568",
};

// Styles réutilisables
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

// Composant pour chaque carte d'action
const ActionCard = ({ action }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.98 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: action.index * 0.1 }}
  >
    <Card component={Link} to={action.link} sx={cardStyles} aria-label={action.title}>
      <CardContent sx={{ textAlign: "center", p: 3 }}>
        <Avatar sx={{ bgcolor: action.color, width: 64, height: 64, mb: 2, mx: "auto" }}>{action.icon}</Avatar>
        <Typography variant="h6" component="div" sx={{ mb: 1, fontWeight: 600, color: themeColors.textPrimary }}>
          {action.title}
        </Typography>
        <Typography variant="body2" color={themeColors.textSecondary}>
          {action.description}
        </Typography>
      </CardContent>
    </Card>
  </motion.div>
);

ActionCard.propTypes = {
  action: PropTypes.shape({
    index: PropTypes.number.isRequired,
    link: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    icon: PropTypes.element.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
};

function EntrepriseDashboard() {
  const navigate = useNavigate();
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statsOffres, setStatsOffres] = useState({
    actives: 0,
    expirees: 0,
    totalCandidatures: 0,
    nouvellesCandidatures: 0,
  });
  const [userInfo, setUserInfo] = useState({
    nomEntreprise: "Chargement...",
    secteurActivite: "Chargement...",
    photoProfil: null,
    avantages: [],
  });
  const [openDialog, setOpenDialog] = useState(false);
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

  const fetchUserInfo = useCallback(async () => {
    if (!checkAuthToken()) return;
    setUserLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/utilisateur/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.data) {
        throw new Error("Erreur lors de la récupération des informations utilisateur");
      }
      setUserInfo(response.data);
    } catch (err) {
      console.error("Erreur fetchUserInfo:", err);
      setError(err.message);
    } finally {
      setUserLoading(false);
    }
  }, []);

  const fetchOffres = useCallback(async () => {
    if (!checkAuthToken()) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/offres/utilisateur/mes-offres", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.data) {
        throw new Error("Erreur lors de la récupération des offres");
      }
      const data = response.data;
      setOffres(data);
      const now = new Date();
      const offresActives = data.filter((offre) => new Date(offre.dateExpiration) > now);
      const offresExpireesCount = data.length - offresActives.length;
      const totalCandidatures = data.reduce((sum, offre) => sum + (offre.candidatures?.length || 0), 0);
      const nouvellesCandidatures = data.reduce((sum, offre) => sum + (offre.nouvellesCandidatures || 0), 0);
      setStatsOffres({
        actives: offresActives.length,
        expirees: offresExpireesCount,
        totalCandidatures,
        nouvellesCandidatures,
      });
    } catch (err) {
      console.error("Erreur fetchOffres:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserInfo();
    fetchOffres();
  }, [fetchUserInfo, fetchOffres]);

  const handleOpenDialog = (offre) => {
    setSelectedOffre(offre);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedOffre(null);
  };

  const offresActives = offres.filter(
    (offre) => new Date(offre.dateExpiration) > new Date()
  );

  const actions = [
    {
      icon: <Work fontSize="large" />,
      title: "Créer une offre",
      description: "Publiez une nouvelle offre d'emploi",
      link: "/creer-offre",
      color: themeColors.primary,
      index: 0,
    },
    {
      icon: <Event fontSize="large" />,
      title: "Voir archives",
      description: "Consultez vos offres archivées",
      link: "/archives-offres",
      color: themeColors.secondary,
      index: 1,
    },
    {
      icon: <Group fontSize="large" />,
      title: "Toutes candidatures",
      description: "Gérez toutes les candidatures reçues",
      link: "/ListeCandidature",
      color: themeColors.accent,
      index: 2,
    },
    {
      icon: <Business fontSize="large" />,
      title: "Paramètres",
      description: "Configurez les informations de votre entreprise",
      link: "/InfoEntreprise",
      color: "#607D8B",
      index: 3,
    },
  ];

  if (error) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container
          maxWidth="lg"
          sx={{
            py: 10,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "300px",
          }}
        >
          <Typography color="error">{error}</Typography>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 10 }}>
        {/* Hero Section */}
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, md: 4 },
            mb: 4,
            borderRadius: 3,
            background: "linear-gradient(135deg, #F0F6F7 0%, #EFF2F7 100%)",
            color: themeColors.textPrimary,
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                sx={{ fontWeight: 700, fontSize: { xs: "2rem", md: "3rem" } }}
              >
                Bienvenue chez {userInfo.nomEntreprise}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  color: themeColors.textSecondary,
                  fontSize: { xs: "1rem", md: "1.25rem" },
                }}
              >
                Secteur d'activité : {userInfo.secteurActivite}
              </Typography>
              {(!userInfo.nomEntreprise || userInfo.nomEntreprise === "Chargement..." || userInfo.nomEntreprise.trim() === "") && (
                <Button
                  variant="contained"
                  size="large"
                  component={Link}
                  to="/InfoEntreprise"
                  sx={buttonStyles}
                  aria-label="Compléter le profil"
                >
                  Compléter le profil
                </Button>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" justifyContent="center">
                <Avatar
                  src={userInfo.photoProfil}
                  alt={`Logo ${userInfo.nomEntreprise}`}
                  aria-label="Logo de l'entreprise ou icône par défaut"
                  sx={{ width: 150, height: 150, boxShadow: 3, border: "3px solid white" }}
                  onError={(e) => {
                    e.target.onerror = null;
                    setUserInfo((prev) => ({ ...prev, photoProfil: null }));
                  }}
                >
                  {!userInfo.photoProfil && <Icon>business</Icon>}
                </Avatar>
              </Box>
            </Grid>
          </Grid>
          <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
            {(userInfo.avantages || []).map((avantage, index) => (
              <Chip
                key={index}
                icon={<CheckCircle fontSize="small" />}
                label={avantage}
                size="small"
                sx={{
                  backgroundColor: "rgba(0, 200, 83, 0.1)",
                  color: themeColors.textPrimary,
                  borderRadius: 1,
                }}
              />
            ))}
          </Box>
        </Paper>

        {/* Stats Section */}
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: 600, mb: 3, display: "flex", alignItems: "center", color: themeColors.textPrimary }}
        >
          <Work sx={{ mr: 2, color: themeColors.primary }} />
          Vos statistiques
        </Typography>
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card sx={{ ...cardStyles, bgcolor: themeColors.primary }}>
                <CardContent>
                  <Typography variant="h3" fontWeight="bold" color="white">
                    {statsOffres.actives}
                  </Typography>
                  <Typography variant="body2" color="white">
                    Offres actives
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card sx={{ ...cardStyles, bgcolor: themeColors.secondary }}>
                <CardContent>
                  <Typography variant="h3" fontWeight="bold" color="white">
                    {statsOffres.expirees}
                  </Typography>
                  <Typography variant="body2" color="white">
                    Offres expirées
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
              <Card sx={{ ...cardStyles, bgcolor: themeColors.accent }}>
                <CardContent>
                  <Typography variant="h3" fontWeight="bold" color="white">
                    {statsOffres.totalCandidatures}
                  </Typography>
                  <Typography variant="body2" color="white">
                    Candidatures totales
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Actions Section */}
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: 600, mb: 3, display: "flex", alignItems: "center", color: themeColors.textPrimary }}
        >
          <Business sx={{ mr: 2, color: themeColors.primary }} />
          Actions rapides
        </Typography>
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {actions.map((action) => (
            <Grid item xs={12} sm={6} md={3} key={action.title}>
              <ActionCard action={action} />
            </Grid>
          ))}
        </Grid>

        {/* Offres Section */}
        <Paper elevation={2} sx={{ p: { xs: 3, md: 4 }, mb: 4, borderRadius: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: themeColors.textPrimary }}>
              Vos offres d'emploi
            </Typography>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/creer-offre"
              sx={buttonStyles}
              aria-label="Nouvelle offre"
            >
              Nouvelle offre
            </Button>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress size={60} />
            </Box>
          ) : offresActives.length > 0 ? (
            <Grid container spacing={3}>
              {offresActives.map((offre) => (
                <Grid item xs={12} sm={6} md={4} key={offre._id}>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <Card sx={cardStyles}>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, color: themeColors.textPrimary }}>
                          {offre.titre || "Titre inconnu"}
                        </Typography>
                        <Box mb={1}>
                          <Box display="flex" alignItems="center" mb={0.5}>
                            <LocationOn fontSize="small" sx={{ mr: 1, color: themeColors.primary }} />
                            <Typography variant="caption" color={themeColors.textSecondary}>
                              {offre.ville || "Ville inconnue"} • {offre.typeEmploi || "CDI"}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" mb={0.5}>
                            <Event fontSize="small" sx={{ mr: 1, color: themeColors.primary }} />
                            <Typography variant="caption" color={themeColors.textSecondary}>
                              {offre.dateExpiration
                                ? `Expire le: ${new Date(offre.dateExpiration).toLocaleDateString()}`
                                : "Date inconnue"}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center">
                            <Group fontSize="small" sx={{ mr: 1, color: themeColors.primary }} />
                            <Typography variant="caption" fontWeight="medium" color={themeColors.textSecondary}>
                              {offre.candidatures?.length || 0} candidature(s)
                            </Typography>
                          </Box>
                        </Box>
                        <Box display="flex" gap={1}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleOpenDialog(offre)}
                            sx={{
                              textTransform: "none",
                              backgroundColor: themeColors.primary,
                              "&:hover": { backgroundColor: themeColors.primaryHover },
                            }}
                          >
                            Voir détails
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color={themeColors.textSecondary} mb={2}>
                Vous n'avez aucune offre active pour le moment
              </Typography>
              <Button
                variant="contained"
                size="large"
                component={Link}
                to="/creer-offre"
                sx={buttonStyles}
                aria-label="Créer votre première offre"
              >
                Créer votre première offre
              </Button>
            </Box>
          )}
        </Paper>

        {/* Dialogue pour détails de l'offre */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
            {selectedOffre?.titre || "Détails de l'offre"}
          </DialogTitle>
          <DialogContent>
            {selectedOffre && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: themeColors.textPrimary }}>
                  Métier: {selectedOffre.metier || "Non spécifié"}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Nombre de postes:</strong> {selectedOffre.nombrePostes || 1}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Type d'emploi:</strong> {selectedOffre.typeEmploi || "Non spécifié"}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Adresse:</strong> {selectedOffre.adresse}, {selectedOffre.ville}, {selectedOffre.codePostal}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Responsabilités:</strong> {selectedOffre.responsabilite || "Non spécifié"}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Compétences requises:</strong>
                </Typography>
                <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {(selectedOffre.competencesRequises || []).map((competence, index) => (
                    <Chip
                      key={index}
                      label={competence}
                      size="small"
                      sx={{ backgroundColor: themeColors.primary, color: "white", "&:hover": { backgroundColor: themeColors.primaryHover } }}
                    />
                  ))}
                </Box>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Rémunération:</strong> {selectedOffre.remuneration || "Non spécifié"}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Description:</strong> {selectedOffre.description || "Non spécifié"}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Comment postuler:</strong> {selectedOffre.commentPostuler || "Non spécifié"}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Date d'expiration:</strong>{" "}
                  {selectedOffre.dateExpiration
                    ? new Date(selectedOffre.dateExpiration).toLocaleDateString()
                    : "Non spécifié"}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Statut:</strong> {selectedOffre.status || "Non spécifié"}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, color: themeColors.textSecondary }}>
                  <strong>Nombre de consultations:</strong> {selectedOffre.nbConsultations || 0}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} sx={{ color: themeColors.textSecondary }}>
              Fermer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Call to Action */}
        <Box
          sx={{
            textAlign: "center",
            p: 6,
            backgroundColor: "background.paper",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
            Prêt à recruter les meilleurs talents ?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, color: themeColors.textSecondary }}>
            Publiez vos offres et attirez les candidats qui feront la différence.
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/creer-offre"
            sx={buttonStyles}
            aria-label="Créer une offre"
          >
            Créer une offre
          </Button>
        </Box>
      </Container>
      <Footer />
    </DashboardLayout>
  );
}

export default EntrepriseDashboard;