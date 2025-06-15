import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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
} from "@mui/material";
import { People, Work, AssignmentTurnedIn, CheckCircle } from "@mui/icons-material";
import { motion } from "framer-motion";
import axios from "axios";

// Palette de couleurs cohérente
const themeColors = {
  primary: "#00D1FF",
  primaryHover: "#00B8E0",
  secondary: "#4CAF50",
  accent: "#FF9800",
  success: "#2196F3",
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

// Composant pour chaque carte de statistique
const StatCard = ({ stat }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.98 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: stat.index * 0.1 }}
  >
    <Card sx={cardStyles} aria-label={stat.title}>
      <CardContent sx={{ textAlign: "center", p: 3 }}>
        <Avatar
          sx={{
            bgcolor: stat.color,
            width: 64,
            height: 64,
            mb: 2,
            mx: "auto",
          }}
        >
          {stat.icon}
        </Avatar>
        <Typography variant="h5" component="div" sx={{ mb: 1, fontWeight: 600, color: themeColors.textPrimary }}>
          {stat.value}
        </Typography>
        <Typography variant="body2" color={themeColors.textSecondary}>
          {stat.title}
        </Typography>
      </CardContent>
    </Card>
  </motion.div>
);

// Validation des props pour StatCard
StatCard.propTypes = {
  stat: PropTypes.shape({
    index: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    icon: PropTypes.element.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }).isRequired,
};

// Composant principal
function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    activeOffers: 0,
    pendingApplications: 0,
    hiringRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Récupérer les statistiques depuis l'API
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // Récupérer le nombre d'utilisateurs
      const usersResponse = await axios.get("http://localhost:5000/api/users/count", config);

      // Récupérer le nombre d'offres actives
      const offersResponse = await axios.get("http://localhost:5000/api/offres/active/count", config);

      // Récupérer le nombre de candidatures en attente
      const applicationsResponse = await axios.get("http://localhost:5000/api/candidatures/pending/count", config);

      // Récupérer le taux d'embauche
      const hiringRateResponse = await axios.get("http://localhost:5000/api/hiring-rate", config);

      setStats({
        users: usersResponse.data.totalUsers,
        activeOffers: offersResponse.data.totalActiveOffers,
        pendingApplications: applicationsResponse.data.totalPendingApplications,
        hiringRate: `${hiringRateResponse.data.hiringRate}%`,
      });
      setLoading(false);
    } catch (err) {
      console.error("Erreur lors de la récupération des statistiques :", err);
      setError("Impossible de charger les statistiques.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statItems = [
    {
      icon: <People fontSize="large" />,
      title: "Utilisateurs inscrits",
      value: stats.users,
      color: themeColors.primary,
      index: 0,
    },
    {
      icon: <Work fontSize="large" />,
      title: "Offres actives",
      value: stats.activeOffers,
      color: themeColors.secondary,
      index: 1,
    },
    {
      icon: <AssignmentTurnedIn fontSize="large" />,
      title: "Candidatures en cours",
      value: stats.pendingApplications,
      color: themeColors.accent,
      index: 2,
    },
    {
      icon: <CheckCircle fontSize="large" />,
      title: "Taux d'embauche",
      value: stats.hiringRate,
      color: themeColors.success,
      index: 3,
    },
  ];

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
            textAlign: "center",
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 700, fontSize: { xs: "2rem", md: "3rem" } }}
          >
            Tableau de bord admin
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              color: themeColors.textSecondary,
              fontSize: { xs: "1rem", sm: "1.125rem", md: "1.25rem" },
              lineHeight: 1.5,
              wordBreak: "break-word",
              px: { xs: 2, sm: 0 },
              maxWidth: { xs: "100%", sm: "700px" },
              mx: "auto",
            }}
          >
            Consultez une vue d’ensemble des statistiques clés de la plateforme : utilisateurs, offres actives, candidatures en cours et taux d'embauche.
          </Typography>
        </Paper>

        {/* Stats Section */}
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 600,
            mb: 3,
            display: "flex",
            alignItems: "center",
            color: themeColors.textPrimary,
          }}
        >
          <People sx={{ mr: 2, color: themeColors.primary }} />
          Statistiques clés
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <CircularProgress size={60} />
            <Typography variant="body1" sx={{ ml: 2, color: themeColors.textPrimary }}>
              Chargement des statistiques...
            </Typography>
          </Box>
        ) : error ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mb: 6 }}>
            {statItems.map((stat) => (
              <Grid item xs={12} sm={6} md={3} key={stat.title}>
                <StatCard stat={stat} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
      <Footer />
    </DashboardLayout>
  );
}

export default AdminDashboard;