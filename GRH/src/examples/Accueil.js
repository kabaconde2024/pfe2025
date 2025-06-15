import React, { useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
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
} from "@mui/material";
import { Person, Work, Favorite, PostAdd, LibraryBooks, Update, Notifications, AssignmentInd } from "@mui/icons-material";
import { motion } from "framer-motion";

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
    <Card
      component={Link}
      to={action.link}
      sx={cardStyles}
      aria-label={action.title}
    >
      <CardContent sx={{ textAlign: "center", p: 3 }}>
        <Avatar
          sx={{
            bgcolor: action.color,
            width: 64,
            height: 64,
            mb: 2,
            mx: "auto",
          }}
        >
          {action.icon}
        </Avatar>
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

// Validation des props pour ActionCard
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

// Composant principal
const ProfilsList = () => {
  const [stats] = useState({
    offresConsultees: 12,
    candidaturesEnvoyees: 5,
    favoris: 3,
    messages: 2,
  });

  const actions = [
    {
      icon: <Person fontSize="large" />,
      title: "Mes Profils",
      description: "Ajoutez vos compétences, expériences et formations",
      link: "/ProfilsList",
      color: themeColors.secondary,
      index: 0,
    },
    {
      icon: <Work fontSize="large" />,
      title: "Parcourir les offres",
      description: "Découvrez les opportunités correspondant à votre profil",
      link: "/OffresPublier",
      color: themeColors.primary,
      index: 1,
    },
    {
      icon: <Favorite fontSize="large" />,
      title: "Mes offres Favoris",
      description: "Consultez vos offres mises en Favoris",
      link: "/Favoris",
      color: themeColors.accent,
      index: 2,
    },
    {
      icon: <PostAdd fontSize="large" />,
      title: "Publier une Demande d'emploi",
      description: "Faites-vous remarquer par les recruteurs",
      link: "/CreateAnnonce",
      color: "#9C27B0",
      index: 3,
    },
    {
      icon: <AssignmentInd fontSize="large" />,
      title: "Suivi de candidature",
      description: "Suivez l'état de vos candidatures",
      link: "/SuiviCandidature",
      color: "#2196F3",
      index: 4,
    },
    {
      icon: <Person fontSize="large" />,
      title: "Informations personnelles",
      description: "Mettez à jour vos informations personnelles",
      link: "/InfoCandidat",
      color: "#FF5722",
      index: 5,
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
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 700, fontSize: { xs: "2rem", md: "3rem" } }}
          >
            Bienvenue dans votre espace candidat
          </Typography>
          <Typography
            variant="h6"
            sx={{ mb: 3, color: themeColors.textSecondary, fontSize: { xs: "1rem", md: "1.25rem" } }}
          >
            Gérez votre parcours professionnel et trouvez l'opportunité qui propulsera votre carrière.
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/ProfilsList"
            sx={buttonStyles}
            aria-label="Commencer maintenant"
          >
            Commencer maintenant
          </Button>
        </Paper>

        {/* Main Actions */}
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
          <LibraryBooks sx={{ mr: 2, color: themeColors.primary }} />
          Que souhaitez-vous faire ?
        </Typography>

        <Grid container spacing={3} sx={{ mb: 6 }}>
          {actions.map((action) => (
            <Grid item xs={12} sm={6} md={4} key={action.title}>
              <ActionCard action={action} />
            </Grid>
          ))}
        </Grid>
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
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{ fontWeight: 700, color: themeColors.textPrimary }}
          >
            Prêt à trouver votre prochain emploi ?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, color: themeColors.textSecondary }}>
            Des centaines d'entreprises recherchent des profils comme le vôtre.
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/OffresPublier"
            sx={buttonStyles}
            aria-label="Explorer les offres"
          >
            Explorer les offres
          </Button>
        </Box>
      </Container>
    </DashboardLayout>
  );
};

export default ProfilsList;