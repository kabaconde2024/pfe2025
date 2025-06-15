import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Grid,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Collapse,
} from "@mui/material";
import {
  Business,
  LocationOn,
  Work,
  Favorite,
  Cancel,
  CloudUpload,
  VideoCameraBack,
  CheckCircle,
  Warning,
  AttachFile,
  Description,
  AttachMoney,
  Event,
  People,
  ExpandMore,
  ExpandLess,
  Add,
  Send,
  Search,
} from '@mui/icons-material';
import { useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Favoris = ({ isMobile, navigate }) => {
  const [offresFavorites, setOffresFavorites] = useState([]);
  const [postulations, setPostulations] = useState([]);
  const [postulationsError, setPostulationsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [selectedProfil, setSelectedProfil] = useState(null);
  const [formData, setFormData] = useState({ cv: null });
  const [videoFile, setVideoFile] = useState(null);
  const [lettreFile, setLettreFile] = useState(null);
  const [motivationType, setMotivationType] = useState({ video: false, pdf: false });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [profilsCv, setProfilsCv] = useState([]);
  const [isLoadingProfils, setIsLoadingProfils] = useState(true);
  const [expandedOffre, setExpandedOffre] = useState(null);
  const [removingFavorite, setRemovingFavorite] = useState(null);

  const navigateFn = navigate;

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchFavoris(),
        fetchProfilsCv(),
        fetchPostulations(),
      ]);
    };
    fetchData();
  }, []);

  const fetchFavoris = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        navigateFn('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/offres/utilisateur/mes-favoris', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigateFn('/login');
          return;
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error("Réponse inattendue du serveur (non JSON)");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur de récupération des favoris");
      }

      const data = await response.json();
      setOffresFavorites(Array.isArray(data.offres) ? data.offres : []);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des favoris:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchPostulations = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("Aucun token d'authentification trouvé pour les candidatures");
        setPostulations([]);
        setPostulationsError("Authentification requise");
        return;
      }

      const response = await fetch("http://localhost:5000/api/candidatures/utilisateur", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigateFn('/login');
          return;
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error("Réponse inattendue du serveur (non JSON)");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur de récupération des candidatures");
      }

      const data = await response.json();
      setPostulations(Array.isArray(data) ? data.map(p => p.offreId).filter(id => id) : []);
      setPostulationsError(null);
    } catch (error) {
      console.error("Erreur lors de la récupération des candidatures:", error);
      setPostulations([]);
      setPostulationsError(error.message);
    }
  };

  const removeFromFavorites = async (offreId) => {
    try {
      setRemovingFavorite(offreId);
      const token = localStorage.getItem("token");
      if (!token) {
        navigateFn('/login');
        return;
      }

      // Update optimistic
      const previousFavorites = [...offresFavorites];
      setOffresFavorites(offresFavorites.filter(offre => offre._id !== offreId));

      const response = await fetch(`http://localhost:5000/api/offres/${offreId}/favoris`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigateFn('/login');
          return;
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error("Réponse inattendue du serveur (non JSON)");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la suppression");
      }

      const data = await response.json();
      if (!data.message.includes("retirée")) {
        throw new Error("L'offre n'a pas été retirée des favoris");
      }

      Swal.fire({
        title: "Retiré des favoris",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Erreur lors de la suppression des favoris:", error);
      setOffresFavorites(previousFavorites); // rollback
      Swal.fire({
        title: "Erreur",
        text: error.message,
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
      await fetchFavoris(); // refresh
    } finally {
      setRemovingFavorite(null);
    }
  };

  const fetchProfilsCv = async () => {
    try {
      setIsLoadingProfils(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigateFn('/login');
        return;
      }

      const response = await fetch("http://localhost:5000/api/profilcv", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigateFn('/login');
          return;
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error("Réponse inattendue du serveur (non JSON)");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur de récupération des profils");
      }

      const data = await response.json();
      setProfilsCv(Array.isArray(data) ? data : data?.data || []);
      setIsLoadingProfils(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des profils:", error);
      setError(error.message);
      setIsLoadingProfils(false);
      Swal.fire({
        title: "Erreur",
        text: error.message,
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handleOpenDialog = (offre) => {
    setOpenDialog(true);
    setSelectedOffre(offre);
    setSelectedProfil(null);
    setFormData({ cv: null });
    setVideoFile(null);
    setLettreFile(null);
    setMotivationType({ video: false, pdf: false });
    setErrorMessage('');
    setUploadProgress(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ cv: null });
    setSelectedProfil(null);
    setVideoFile(null);
    setLettreFile(null);
    setMotivationType({ video: false, pdf: false });
    setErrorMessage('');
    setUploadProgress(0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setErrorMessage("Le fichier CV dépasse la taille maximale de 5MB");
      Swal.fire({
        title: "Erreur",
        text: "Le fichier CV dépasse la taille maximale de 5MB",
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }
    setFormData(prev => ({ ...prev, cv: file }));
    setErrorMessage('');
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 50 * 1024 * 1024) {
      setErrorMessage("La vidéo dépasse la taille maximale de 50MB");
      Swal.fire({
        title: "Erreur",
        text: "La vidéo dépasse la taille maximale de 50MB",
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }
    setVideoFile(file);
    setMotivationType(prev => ({ ...prev, video: true }));
    setErrorMessage('');
  };

  const handleLettreChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setErrorMessage("La lettre de motivation dépasse la taille maximale de 5MB");
      Swal.fire({
        title: "Erreur",
        text: "La lettre de motivation dépasse la taille maximale de 5MB",
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }
    setLettreFile(file);
    setMotivationType(prev => ({ ...prev, pdf: true }));
    setErrorMessage('');
  };

  const handleProfilSelect = (profilId) => {
    setSelectedProfil(profilId);
  };

  const handlePostuler = async () => {
    if (!selectedOffre || !selectedProfil) {
      setErrorMessage("Veuillez sélectionner un profil CV");
      Swal.fire({
        title: "Erreur",
        text: "Veuillez sélectionner un profil CV",
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    try {
      setUploadProgress(10);
      const token = localStorage.getItem("token");
      if (!token) {
        navigateFn('/login');
        return;
      }

      const formDataObj = new FormData();
      formDataObj.append("offre", selectedOffre._id);
      formDataObj.append("profilCv", selectedProfil);

      if (formData.cv) {
        formDataObj.append("cv", formData.cv);
      }

      if (videoFile) {
        formDataObj.append("videoMotivation", videoFile);
      }

      if (lettreFile) {
        formDataObj.append("lettreMotivation", lettreFile);
      }

      setUploadProgress(30);
      const response = await fetch("http://localhost:5000/api/candidatures", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataObj,
      });

      setUploadProgress(70);
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigateFn('/login');
          return;
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error("Réponse inattendue du serveur (non JSON)");
        }
        const errorResponse = await response.json();
        throw new Error(errorResponse.error || "Erreur serveur");
      }

      setPostulations(prev => [...prev, selectedOffre._id]);
      setUploadProgress(100);
      Swal.fire({
        title: "Candidature envoyée avec succès!",
        icon: "success",
        confirmButtonText: "OK",
      });
      handleCloseDialog();
    } catch (error) {
      console.error("Erreur lors de l'envoi de la candidature", error);
      setErrorMessage(error.message || "Erreur lors de l'envoi");
      setUploadProgress(0);
      Swal.fire({
        title: "Erreur",
        text: error.message || "Erreur lors de l'envoi",
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const toggleExpandOffre = (offreId) => {
    setExpandedOffre(prev => (prev === offreId ? null : offreId));
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontWeight: 600,
            color: "#000000",
            fontSize: isMobile ? "1.5rem" : "2rem",
            mb: 4,
            textAlign: "left",
          }}
        >
          Mes Offres Favorites
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: 'center', p: '32px' }}>
            <CircularProgress />
            <Typography variant="body1">Chargement des offres favorites...</Typography>
          </Box>
        ) : error ? (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid #e0e0e0',
              textAlign: 'center',
            }}
          >
            <Typography variant="body1" color="text.primary">{error}</Typography>
          </Box>
        ) : offresFavorites.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '50vh',
              p: 4,
            }}
          >
            <Card
              sx={{
                maxWidth: 600,
                width: '100%',
                p: 4,
                textAlign: 'center',
                boxShadow: 3,
                borderRadius: 3,
                bgcolor: 'background.paper',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <Favorite
                    sx={{
                      fontSize: isMobile ? 60 : 80,
                      color: 'text.secondary',
                      opacity: 0.7,
                    }}
                  />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    color: 'text.primary',
                  }}
                >
                  Aucune offre favorite
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    mb: 3,
                    color: 'text.secondary',
                    maxWidth: 400,
                    mx: 'auto',
                  }}
                >
                  Vous n'avez pas encore ajouté d'offres à vos favoris. Explorez les opportunités disponibles pour trouver des offres qui vous intéressent !
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Search />}
                  onClick={() => navigateFn('/offres')}
                  sx={{
                    textTransform: 'none',
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    px: 3,
                    py: 1,
                  }}
                >
                  Découvrir les offres
                </Button>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <List>
            {offresFavorites.map((offre) => (
              <Paper key={offre._id} elevation={3} sx={{ mb: 3 }}>
                <ListItem
                  secondaryAction={
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleOpenDialog(offre)}
                        sx={{ mr: 1 }}
                        disabled={postulations.includes(offre._id)}
                      >
                        Postuler
                      </Button>
                      <IconButton
                        onClick={() => removeFromFavorites(offre._id)}
                        disabled={removingFavorite === offre._id}
                        sx={{
                          color: 'red',
                          '&:hover': {
                            transform: 'scale(1.2)',
                          },
                        }}
                      >
                        {removingFavorite === offre._id ? <CircularProgress size={24} /> : <Favorite />}
                      </IconButton>
                      <IconButton onClick={() => toggleExpandOffre(offre._id)}>
                        {expandedOffre === offre._id ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </>
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={offre.entreprise?.logo} sx={{ bgcolor: "primary.main" }}>
                      {offre.entreprise?.nom?.charAt(0) || <Business />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="h6" fontWeight={600}>
                          {offre.titre}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2">
                          <Business fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                          {offre.entreprise?.nom || "Non spécifié"}
                        </Typography>
                        <Typography variant="body2">
                          <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                          {offre.adresse || "Non spécifié"}
                        </Typography>
                        <Typography variant="body2">
                          <Work fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                          {offre.typeEmploi}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Collapse in={expandedOffre === offre._id} timeout="auto" unmountOnExit>
                  <Box p={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <Description sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Description du poste
                        </Typography>
                        <Typography paragraph>{offre.description}</Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <Work sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Responsabilités
                        </Typography>
                        <Typography paragraph>{offre.responsabilite}</Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <People sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Profil recherché
                        </Typography>
                        <Typography paragraph>{offre.profilRecherche}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <AttachMoney sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Rémunération
                        </Typography>
                        <Typography>{offre.remuneration}</Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <Event sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Date limite
                        </Typography>
                        <Typography>
                          {new Date(offre.dateExpiration).toLocaleDateString()}
                        </Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <AttachFile sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Niveau d'étude requis
                        </Typography>
                        <Typography>{offre.niveauEtude}</Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <Work sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Expérience requise
                        </Typography>
                        <Typography>{offre.experienceRequise}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          Compétences requises
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {offre.competencesRequises?.map((comp, index) => (
                            <Chip key={index} label={comp} color="primary" />
                          ))}
                        </Box>
                      </Grid>
                    </Grid>
                    <Box display="flex" justifyContent="flex-end" mt={3}>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => handleOpenDialog(offre)}
                        sx={{ mr: 2 }}
                        disabled={postulations.includes(offre._id)}
                      >
                        Postuler maintenant
                      </Button>
                    </Box>
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </List>
        )}

        {/* Dialog pour postuler */}
        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
          <DialogTitle
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box display="flex" alignItems="center">
              <Work sx={{ mr: 1 }} />
              <Typography variant="h6">Postuler: {selectedOffre?.titre}</Typography>
            </Box>
            <IconButton onClick={handleCloseDialog} sx={{ color: 'white' }}>
              <Cancel />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ py: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Sélectionnez votre profil CV
            </Typography>

            {isLoadingProfils ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Grid container spacing={2}>
                  {profilsCv.length > 0 ? (
                    profilsCv.map((profil) => (
                      <Grid item xs={12} sm={6} key={profil._id}>
                        <Card
                          onClick={() => handleProfilSelect(profil._id)}
                          sx={{
                            cursor: 'pointer',
                            border: selectedProfil === profil._id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                            borderRadius: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: 3,
                              borderColor: '#1976d2',
                            },
                          }}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                {profil.name?.charAt(0) || 'P'}
                              </Avatar>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {profil.name || "Sans nom"}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Métier: {profil.metier || "Non spécifié"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Compétences: {profil.competences?.join(", ") || "Non spécifiées"}
                            </Typography>
                            {profil.cv ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                                <CheckCircle sx={{ mr: 1 }} />
                                <Typography variant="body2">{profil.cv.filename}</Typography>
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center', color: 'warning.main' }}>
                                <Warning sx={{ mr: 1 }} />
                                <Typography variant="body2">Aucun CV attaché</Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 4, border: '1px dashed #e0e0e0', borderRadius: 2, mt: 2, width: '100%' }}>
                      <Typography variant="body1" gutterBottom>
                        Vous n'avez aucun profil CV créé
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={() => {
                          handleCloseDialog();
                          navigateFn('/profils/creer');
                        }}
                        startIcon={<Add />}
                        sx={{ mt: 1 }}
                      >
                        Créer un nouveau profil
                      </Button>
                    </Box>
                  )}
                </Grid>

                {errorMessage && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', color: 'white', borderRadius: 2 }}>
                    <Typography variant="body2">{errorMessage}</Typography>
                  </Box>
                )}

                {selectedProfil && !profilsCv.find((profil) => profil._id === selectedProfil)?.cv && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: "600", mb: 2 }}>
                      <AttachFile />
                      Téléverser un CV
                    </Typography>
                    <Box
                      sx={{
                        border: '2px dashed #1976d2',
                        borderRadius: 2,
                        p: 2,
                        textAlign: 'center',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <input
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        id="cv-upload"
                        type="file"
                        onChange={handleFileChange}
                      />
                      <label htmlFor="cv-upload">
                        <Button
                          variant="contained"
                          component="span"
                          startIcon={<CloudUpload />}
                          sx={{ mb: 1 }}
                        >
                          Sélectionner un fichier
                        </Button>
                      </label>
                      {formData.cv ? (
                        <Box sx={{ mt: 2 }}>
                          <Chip
                            label={formData.cv.name}
                            onDelete={() => setFormData(prev => ({ ...prev, cv: null }))}
                            deleteIcon={<Cancel />}
                            sx={{ maxWidth: '100%' }}
                          />
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Taille: {(formData.cv.size / (1024 * 1024)).toFixed(2)} MB
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Formats acceptés: PDF, DOC, DOCX (max 5MB)
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </>
            )}

            {/* Lettre et vidéo de motivation */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                <AttachFile />
                Lettre et/ou vidéo de motivation (optionnelles)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Vous pouvez soumettre une lettre de motivation (PDF) et/ou une vidéo de motivation.
              </Typography>

              {/* Vidéo de motivation */}
              <Box
                sx={{
                  mt: motivationType.video ? 2 : 0,
                  border: '2px dashed #1976d2',
                  borderRadius: 2,
                  p: 2,
                  textAlign: 'center',
                  bgcolor: 'background.paper',
                }}
              >
                <input
                  accept="video/*"
                  style={{ display: 'none' }}
                  id="video-upload"
                  type="file"
                  onChange={handleVideoChange}
                />
                <label htmlFor="video-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<VideoCameraBack />}
                    sx={{ mb: 1 }}
                  >
                    {videoFile ? 'Changer la vidéo' : 'Ajouter une vidéo'}
                  </Button>
                </label>
                {videoFile && (
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={videoFile.name}
                      onDelete={() => {
                        setVideoFile(null);
                        setMotivationType(prev => ({ ...prev, video: false }));
                      }}
                      deleteIcon={<Cancel />}
                      sx={{ maxWidth: '100%' }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Taille: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </Typography>
                  </Box>
                )}
                {!videoFile && (
                  <Typography variant="body2" color="text.secondary">
                    Formats: MP4, MOV, max 50MB
                  </Typography>
                )}
              </Box>

              {/* Lettre de motivation */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  <AttachFile />
                  Téléverser une lettre de motivation (PDF)
                </Typography>
                <Box
                  sx={{
                    border: '2px dashed #1976d2',
                    borderRadius: 2,
                    p: 2,
                    textAlign: 'center',
                  }}
                >
                  <input
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    id="lettre-upload"
                    type="file"
                    onChange={handleLettreChange}
                  />
                  <label htmlFor="lettre-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUpload />}
                      sx={{ mb: 1 }}
                    >
                      {lettreFile ? 'Changer la lettre' : 'Ajouter une lettre'}
                    </Button>
                  </label>
                  {lettreFile && (
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        label={lettreFile.name}
                        onDelete={() => setLettreFile(null)}
                        deleteIcon={<Cancel />}
                        sx={{ maxWidth: '100%' }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Taille: {(lettreFile.size / (1024 * 1024)).toFixed(2)} MB
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Progression envoi */}
            {uploadProgress > 0 && (
              <Box sx={{ width: '100%', mt: 4 }}>
                <Typography variant="body2" gutterBottom>
                  Envoi en cours... {uploadProgress}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ padding: '16px', borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleCloseDialog} color="inherit" startIcon={<Cancel />}>
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={handlePostuler}
              disabled={
                !selectedProfil ||
                (uploadProgress > 0 && uploadProgress < 100) ||
                (selectedOffre && postulations.includes(selectedOffre._id))
              }
              startIcon={<Send />}
            >
              {uploadProgress > 0 ? "Envoi en cours..." : "Envoyer la candidature"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
};

Favoris.propTypes = {
  isMobile: PropTypes.bool.isRequired,
  navigate: PropTypes.func.isRequired,
};

const FavorisWrapper = () => {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  return <Favoris isMobile={isMobile} navigate={navigate} />;
};

export default FavorisWrapper;