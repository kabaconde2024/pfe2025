import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "../examples/Navbars/DashboardNavbar";
import { 
  Card, 
  CardContent, 
  Typography, 
  Container, 
  Grid,
  CircularProgress, 
  Box, 
  Button,
  Alert,
  Paper,
  useTheme,
  Avatar
} from "@mui/material";
import { 
  Person,
  Phone, 
  Email, 
  ContactMail,
  EditOutlined,
  CalendarToday
} from "@mui/icons-material";
import moment from 'moment';

const InfoCandidat = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [candidatInfo, setCandidatInfo] = useState({
    name: '',
    email: '',
    telephone: '',
    pays: '',
    codePostal: '',
    ville: '',
    adresse: '',
    dateNaissance: '',
    photoProfil: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCandidatInfo = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token d’authentification requis");

        const response = await fetch("http://localhost:5000/api/utilisateur/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          throw new Error(`Réponse inattendue du serveur: ${text.substring(0, 100)}...`);
        }

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            localStorage.removeItem("token");
            navigate("/authentification/sign-in");
            return;
          }
          throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Vérifier si l'utilisateur a le profil Candidat
        const isCandidat = data.profils.some(profil => profil.name === 'Candidat');
        if (!isCandidat) {
          throw new Error("Accès réservé aux candidats.");
        }

        setCandidatInfo({
          name: data.nom || 'Non spécifié',
          email: data.email || 'Non spécifié',
          telephone: data.telephone || 'Non spécifié',
          pays: data.pays || 'Non spécifié',
          codePostal: data.codePostal || 'Non spécifié',
          ville: data.ville || 'Non spécifié',
          adresse: data.adresse || 'Non spécifié',
          dateNaissance: data.dateNaissance ? moment(data.dateNaissance).format('DD/MM/YYYY') : 'Non spécifié',
          photoProfil: data.photoProfil || ''
        });
      } catch (error) {
        console.error("Erreur de récupération:", error);
        setError(error.message || "Erreur lors de la récupération des informations");
        if (error instanceof SyntaxError) {
          setError("Réponse du serveur invalide. Vérifiez l’API.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCandidatInfo();
  }, [navigate]);

  const handleEditClick = () => navigate("/modifier-info");

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 2 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column">
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
              Chargement des informations du candidat...
            </Typography>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pt: 2 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Alert severity="error" sx={{ mb: 2 }} action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            }>
              <Typography variant="body1" fontWeight="medium">{error}</Typography>
            </Alert>
          </Paper>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ mt: 15, mb: 4, pt: 2 }}>
        {/* Titre et bouton */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Informations du Candidat
          </Typography>
          <Button variant="contained" startIcon={<EditOutlined />} onClick={handleEditClick} sx={{ textTransform: 'none', px: 3, py: 1, borderRadius: 1 }}>
            Modifier les informations
          </Button>
        </Box>

        {/* Card principal */}
        <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          {/* En-tête avec avatar et nom */}
          <Box sx={{ backgroundColor: theme.palette.background.paper, p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box display="flex" alignItems="center">
              <Avatar
                src={candidatInfo.photoProfil}
                sx={{ bgcolor: theme.palette.primary.light, color: theme.palette.primary.contrastText, width: 56, height: 56, mr: 3 }}
              >
                {!candidatInfo.photoProfil && <Person fontSize="large" />}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                  {candidatInfo.name}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          {/* Détails */}
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={4}>
              {/* Informations personnelles */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.primary' }}>
                  <Person sx={{ mr: 1 }} /> Informations Personnelles
                </Typography>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary">Adresse</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ ml: 1, mt: 1, mb: 2 }}>
                    {candidatInfo.adresse} <br />
                    {candidatInfo.codePostal} {candidatInfo.ville} <br />
                    {candidatInfo.pays}
                  </Typography>
                </Box>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary">Date de naissance</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ ml: 1, mt: 1 }}>
                    {candidatInfo.dateNaissance}
                  </Typography>
                </Box>
              </Grid>
              {/* Contact */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.primary' }}>
                  <ContactMail sx={{ mr: 1 }} /> Contact
                </Typography>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary">Coordonnées</Typography>
                  <Typography variant="body1" sx={{ ml: 1, mt: 1, mb: 1 }}>
                    <Phone sx={{ verticalAlign: 'middle', mr: 1 }} /> {candidatInfo.telephone}
                  </Typography>
                  <Typography variant="body1" sx={{ ml: 1, mt: 1 }}>
                    <Email sx={{ verticalAlign: 'middle', mr: 1 }} /> {candidatInfo.email}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </DashboardLayout>
  );
};

export default InfoCandidat;