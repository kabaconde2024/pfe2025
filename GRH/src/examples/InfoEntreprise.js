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
  Chip,
  Avatar,
  Paper,
  useTheme,
} from "@mui/material";
import { 
  Business, 
  Phone, 
  Email, 
  ContactMail,
  HomeWork,
  Category,
  Edit
} from "@mui/icons-material";

const InfoEntreprise = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [entrepriseInfo, setEntrepriseInfo] = useState({
    nom: '',
    email: '',
    nomEntreprise: '',
    adresseEntreprise: '',
    telephoneEntreprise: '',
    paysEntreprise: '',
    codePostalEntreprise: '',
    secteurActivite: '',
    photoProfil: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEntrepriseInfo = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token d'authentification manquant");

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

        // Vérifier si l'utilisateur a le profil Entreprise
        const isEntreprise = data.profils.some(profil => profil.name === 'Entreprise');
        if (!isEntreprise) {
          throw new Error("Accès réservé aux entreprises.");
        }

        setEntrepriseInfo({
          nom: data.nom || 'Non spécifié',
          email: data.email || 'Non spécifié',
          nomEntreprise: data.nomEntreprise || 'Non spécifié',
          adresseEntreprise: data.adresseEntreprise || 'Non spécifié',
          telephoneEntreprise: data.telephoneEntreprise || 'Non spécifié',
          paysEntreprise: data.paysEntreprise || 'Non spécifié',
          codePostalEntreprise: data.codePostalEntreprise || 'Non spécifié',
          secteurActivite: data.secteurActivite || 'Non spécifié',
          photoProfil: data.photoProfil || ''
        });
      } catch (error) {
        console.error("Erreur de récupération:", error);
        setError(error.message || "Erreur de connexion");
        if (error instanceof SyntaxError) {
          setError("Le serveur a renvoyé une réponse invalide. Vérifiez l'API.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEntrepriseInfo();
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
              Chargement des informations de l'entreprise...
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
            Info de l'Entreprise
          </Typography>
          <Button variant="contained" startIcon={<Edit />} onClick={handleEditClick} sx={{ textTransform: 'none', px: 3, py: 1, borderRadius: 1 }}>
            Modifier les informations
          </Button>
        </Box>

        {/* Card principal */}
        <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          {/* En-tête avec logo et nom */}
          <Box sx={{ backgroundColor: theme.palette.background.paper, p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box display="flex" alignItems="center">
              <Avatar
                src={entrepriseInfo.photoProfil}
                sx={{ bgcolor: theme.palette.primary.light, color: theme.palette.primary.contrastText, width: 56, height: 56, mr: 3 }}
              >
                {!entrepriseInfo.photoProfil && <Business fontSize="large" />}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold" color="text.primary">
                  {entrepriseInfo.nomEntreprise}
                </Typography>
                <Chip label={entrepriseInfo.secteurActivite} size="small" sx={{ mt: 1, backgroundColor: theme.palette.grey[200], color: theme.palette.text.secondary, fontWeight: 'medium' }} />
              </Box>
            </Box>
          </Box>
          
          {/* Détails */}
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={4}>
              {/* Informations générales */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.primary' }}>
                  <HomeWork sx={{ mr: 1 }} /> Informations Générales
                </Typography>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary">Adresse</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ ml: 1, mt: 1, mb: 2 }}>
                    {entrepriseInfo.adresseEntreprise} <br />
                    {entrepriseInfo.codePostalEntreprise} {entrepriseInfo.paysEntreprise}
                  </Typography>
                </Box>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary">Secteur d'activité</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ ml: 1, mt: 1 }}>
                    {entrepriseInfo.secteurActivite}
                  </Typography>
                </Box>
              </Grid>
              {/* Contact */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.primary' }}>
                  <ContactMail sx={{ mr: 1 }} /> Contact
                </Typography>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary">Responsable</Typography>
                  <Typography variant="body1" sx={{ ml: 1, mt: 1 }}>
                    {entrepriseInfo.nom}
                  </Typography>
                </Box>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary">Coordonnées</Typography>
                  <Typography variant="body1" sx={{ ml: 1, mt: 1, mb: 1 }}>
                    <Phone sx={{ verticalAlign: 'middle', mr: 1 }} /> {entrepriseInfo.telephoneEntreprise}
                  </Typography>
                  <Typography variant="body1" sx={{ ml: 1, mt: 1 }}>
                    <Email sx={{ verticalAlign: 'middle', mr: 1 }} /> {entrepriseInfo.email}
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

export default InfoEntreprise;