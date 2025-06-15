import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Container,
  Box,
  Button,
  IconButton,
  Collapse,
  Paper,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Card,
  CircularProgress,
  LinearProgress,
  InputAdornment,
  CardContent,
} from "@mui/material";
import {
  Business,
  LocationOn,
  Work,
  Favorite,
  FavoriteBorder,
  ExpandMore,
  ExpandLess,
  Description,
  AttachMoney,
  Event,
  People,
  AttachFile,
  VideoCameraBack,
  CheckCircle,
  Warning,
  Cancel,
  CloudUpload,
  FilterAlt,
  Search,
  Clear,
  RestartAlt,
  WorkOutline,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { Add, Send } from "@mui/icons-material";
import { useMediaQuery } from "@mui/material";

const ListesOffresPubliées = () => {
  const [offres, setOffres] = useState([]);
  const [filteredOffres, setFilteredOffres] = useState([]);
  const [favoris, setFavoris] = useState([]);
  const [expandedOffre, setExpandedOffre] = useState(null);
  const [chargement, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [profilsCv, setProfilsCv] = useState([]);
  const [selectedProfil, setSelectedProfil] = useState(null);
  const [motivationType, setMotivationType] = useState({ video: false, pdf: false });
  const [videoFile, setVideoFile] = useState(null);
  const [lettreFile, setLettreFile] = useState(null);
  const [formData, setFormData] = useState({ cv: null });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clickedFavorite, setClickedFavorite] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [profilFilter, setProfilFilter] = useState("");
  const [postulations, setPostulations] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:600px)");

  // Fonction pour vérifier si une offre est expirée
  const isOffreExpired = (dateExpiration) => {
    const today = new Date();
    const expirationDate = new Date(dateExpiration);
    return today > expirationDate;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Token non trouvé, veuillez vous reconnecter");
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [offresRes, profilsRes] = await Promise.all([
          fetch("http://localhost:5000/api/offres/listes-publiees", { headers }),
          fetch("http://localhost:5000/api/profilcv", { headers }),
        ]);

        if (!offresRes.ok) throw new Error("Erreur lors de la récupération des offres");
        if (!profilsRes.ok) throw new Error("Erreur lors de la récupération des profils");

        const [offresData, profilsData] = await Promise.all([offresRes.json(), profilsRes.json()]);

        setOffres(Array.isArray(offresData) ? offresData : []);
        setFilteredOffres(Array.isArray(offresData) ? offresData : []);
        setProfilsCv(Array.isArray(profilsData) ? profilsData : profilsData?.data || []);

        const favorisRes = await fetch("http://localhost:5000/api/offres/utilisateur/mes-favoris", {
          headers,
        });
        if (favorisRes.ok) {
          const favorisData = await favorisRes.json();
          setFavoris(Array.isArray(favorisData.offres) ? favorisData.offres.map((fav) => fav._id) : []);
        }

        const postulationsRes = await fetch("http://localhost:5000/api/candidatures/utilisateur", {
          headers,
        });
        if (postulationsRes.ok) {
          const postulationsData = await postulationsRes.json();
          setPostulations(
            Array.isArray(postulationsData) ? postulationsData.map((p) => p.offreId) : []
          );
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        Swal.fire({
          title: "Erreur",
          text: "Une erreur s'est produite lors du chargement des données.",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const filterOffres = () => {
      let result = [...offres];

      if (profilFilter) {
        const selectedProfilData = profilsCv.find((p) => p._id === profilFilter);
        if (selectedProfilData && selectedProfilData.competences) {
          const profilCompetences = selectedProfilData.competences.map((c) => c.toLowerCase());

          result = result.filter((offre) => {
            const offreCompetences = Array.isArray(offre.competencesRequises)
              ? offre.competencesRequises.map((c) => c.toLowerCase())
              : (offre.competencesRequises || "").split(",").map((c) => c.trim().toLowerCase());

            return profilCompetences.some((pc) => offreCompetences.some((oc) => oc.includes(pc)));
          });
        }
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(
          (offre) =>
            (offre.titre || "").toLowerCase().includes(term) ||
            (offre.description || "").toLowerCase().includes(term) ||
            (Array.isArray(offre.competencesRequises)
              ? offre.competencesRequises.some((c) => c.toLowerCase().includes(term))
              : (offre.competencesRequises || "").toLowerCase().includes(term))
        );
      }

      if (locationFilter) {
        const location = locationFilter.toLowerCase();
        result = result.filter((offre) =>
          (offre.adresse || "").toLowerCase().includes(location)
        );
      }

      if (domainFilter) {
        result = result.filter((offre) =>
          (offre.typeEmploi || "").toLowerCase() === domainFilter.toLowerCase()
        );
      }

      setFilteredOffres(result);
    };

    filterOffres();
  }, [offres, searchTerm, locationFilter, domainFilter, profilFilter]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setLocationFilter("");
    setDomainFilter("");
    setProfilFilter("");
  };

  const handleToggleFavori = async (offreId) => {
    setClickedFavorite(offreId);
    const wasFavorite = favoris.includes(offreId);

    setFavoris((prev) => (wasFavorite ? prev.filter((id) => id !== offreId) : [...prev, offreId]));

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentification requise");

      const response = await fetch(`http://localhost:5000/api/offres/${offreId}/favoris`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        console.error("Erreur de l'API:", errorResponse);
        throw new Error("Erreur lors de la mise à jour des favoris");
      }

      Swal.fire({
        title: wasFavorite ? "Retiré des favoris" : "Ajouté aux favoris",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      setFavoris((prev) =>
        wasFavorite ? [...prev, offreId] : prev.filter((id) => id !== offreId)
      );
      Swal.fire(
        "Erreur",
        error.message || "Une erreur est survenue lors de la mise à jour des favoris.",
        "error"
      );
    } finally {
      setTimeout(() => setClickedFavorite(null), 500);
    }
  };

  const handleOpenDialog = (offre) => {
    if (isOffreExpired(offre.dateExpiration)) {
      Swal.fire({
        title: "Offre expirée",
        text: "Vous ne pouvez pas postuler à cette offre car elle est expirée.",
        icon: "warning",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }
    setSelectedOffre(offre);
    setOpenDialog(true);
  };

  const memorizeConsultation = async (offreId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentification requise");

      const response = await fetch(`http://localhost:5000/api/offres/${offreId}/consultations`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        console.error("Erreur de l'API:", errorResponse);
        throw new Error("Erreur lors de la mise à jour des consultations");
      }

      const data = await response.json();
      console.log("Nombre de consultations:", data.nbConsultations);
    } catch (error) {
      console.error("Erreur lors de la mémorisation de la consultation:", error);
    }
  };

  const handleToggleExpand = async (offreId) => {
    if (expandedOffre !== offreId) {
      await memorizeConsultation(offreId);
    }
    setExpandedOffre(expandedOffre === offreId ? null : offreId);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProfil(null);
    setMotivationType({ video: false, pdf: false });
    setVideoFile(null);
    setLettreFile(null);
    setFormData({ cv: null });
    setUploadProgress(0);
    setErrorMessage("");
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
    setFormData({ ...formData, cv: file });
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
    setMotivationType((prev) => ({ ...prev, video: true }));
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
    setMotivationType((prev) => ({ ...prev, pdf: true }));
  };

  const handlePostuler = async () => {
    try {
      setLoading(true);
      setUploadProgress(10);
      setErrorMessage("");

      if (!selectedOffre || !selectedProfil) {
        throw new Error("Veuillez sélectionner un profil CV");
      }

      if (isOffreExpired(selectedOffre.dateExpiration)) {
        throw new Error("Cette offre est expirée");
      }

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentification requise");

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
        const errorResponse = await response.json();
        throw new Error(errorResponse.error || "Erreur serveur");
      }

      setUploadProgress(100);
      setPostulations((prev) => [...prev, selectedOffre._id]);
      Swal.fire({
        title: "Candidature envoyée!",
        text: "Votre candidature a été soumise avec succès",
        icon: "success",
        confirmButtonText: "OK",
      });
      handleCloseDialog();
    } catch (error) {
      setErrorMessage(error.message || "Erreur lors de l'envoi de la candidature");
      Swal.fire({
        title: "Erreur",
        text: error.message || "Erreur lors de l'envoi",
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (chargement && !filteredOffres.length) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Box textAlign="center" p={4}>
          <CircularProgress />
          <Typography>Chargement des offres...</Typography>
        </Box>
      </DashboardLayout>
    );
  }

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
          Offres d'emplois
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            onClick={() => setFiltersVisible((prev) => !prev)}
            startIcon={<FilterAlt />}
          >
            {filtersVisible ? "Masquer les filtres" : "Afficher les filtres"}
          </Button>
        </Box>

        {filtersVisible && (
          <Paper
            sx={{
              mb: 4,
              p: 3,
              backgroundColor: "background.paper",
              borderRadius: 3,
              boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 3,
                display: "flex",
                alignItems: "center",
                color: "primary.main",
              }}
            >
              <FilterAlt sx={{ mr: 1.5, fontSize: "1.5rem" }} />
              Filtrer par profil
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Filtrer par profil"
                  variant="outlined"
                  value={profilFilter}
                  onChange={(e) => setProfilFilter(e.target.value)}
                  InputProps={{
                    sx: {
                      backgroundColor: "background.default",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "divider",
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Tous les profils</em>
                  </MenuItem>
                  {profilsCv.map((profil) => (
                    <MenuItem key={profil._id} value={profil._id}>
                      {profil.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Mots-clés"
                  placeholder="Titre, compétences..."
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <IconButton
                        onClick={() => setSearchTerm("")}
                        size="small"
                        sx={{ color: "text.secondary" }}
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    ),
                    sx: {
                      backgroundColor: "background.default",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "divider",
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Localisation"
                  placeholder="Ville, adresse..."
                  variant="outlined"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: locationFilter && (
                      <IconButton
                        onClick={() => setLocationFilter("")}
                        size="small"
                        sx={{ color: "text.secondary" }}
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    ),
                    sx: {
                      backgroundColor: "background.default",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "divider",
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="Type de contrat"
                  variant="outlined"
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WorkOutline color="action" />
                      </InputAdornment>
                    ),
                    sx: {
                      backgroundColor: "background.default",
                      borderRadius: 2,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "divider",
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Tous types</em>
                  </MenuItem>
                  {["CDD", "CDI", "Interim", "Temps plein", "Temps partiel", "Freelance", "Stage"].map(
                    (type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    )
                  )}
                </TextField>
              </Grid>
            </Grid>

            {(searchTerm || locationFilter || domainFilter || profilFilter) && (
              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="text"
                  onClick={handleResetFilters}
                  startIcon={<RestartAlt />}
                  sx={{ color: "text.secondary" }}
                >
                  Réinitialiser
                </Button>
              </Box>
            )}
          </Paper>
        )}

        {filteredOffres.length > 0 ? (
          <List>
            {filteredOffres.map((offre) => (
              <Paper key={offre._id} elevation={3} sx={{ mb: 3 }}>
                <ListItem>
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
                        {offre.nouveau && (
                          <Chip label="NOUVEAU" color="error" size="small" sx={{ ml: 2 }} />
                        )}
                        {isOffreExpired(offre.dateExpiration) && (
                          <Chip label="EXPIRÉ" color="warning" size="small" sx={{ ml: 2 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2">
                          <Business fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
                          {offre.entreprise?.nomEntreprise || "Non spécifié"}
                        </Typography>
                        <Typography variant="body2">
                          <LocationOn fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
                          {offre.adresse || "Non spécifié"}
                        </Typography>
                        <Typography variant="body2">
                          <Work fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
                          {offre.typeEmploi}
                        </Typography>
                        <Typography variant="body2">
                          <Event fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
                          Date limite: {new Date(offre.dateExpiration).toLocaleDateString()}
                        </Typography>
                      </>
                    }
                  />
                  <Box>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleOpenDialog(offre)}
                      sx={{ mr: 1 }}
                      disabled={postulations.includes(offre._id) || isOffreExpired(offre.dateExpiration)}
                    >
                      {isOffreExpired(offre.dateExpiration) ? "Expiré" : "Postuler"}
                    </Button>
                    <IconButton
                      onClick={() => handleToggleFavori(offre._id)}
                      sx={{
                        color: favoris.includes(offre._id) ? "red" : "action.active",
                        transform: clickedFavorite === offre._id ? "scale(1.3)" : "scale(1)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          color: "red",
                          transform: "scale(1.2)",
                        },
                      }}
                    >
                      {favoris.includes(offre._id) ? <Favorite /> : <FavoriteBorder />}
                    </IconButton>
                    <IconButton onClick={() => handleToggleExpand(offre._id)}>
                      {expandedOffre === offre._id ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                </ListItem>
                <Collapse in={expandedOffre === offre._id}>
                  <Box p={3}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <Description sx={{ verticalAlign: "middle", mr: 1 }} />
                          Description du poste
                        </Typography>
                        <Typography paragraph>{offre.description}</Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <Work sx={{ verticalAlign: "middle", mr: 1 }} />
                          Responsabilités
                        </Typography>
                        <Typography paragraph>{offre.responsabilite}</Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <People sx={{ verticalAlign: "middle", mr: 1 }} />
                          Compétences requises
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {Array.isArray(offre.competencesRequises) &&
                          offre.competencesRequises.length > 0 ? (
                            offre.competencesRequises.map((competence, index) => (
                              <Chip
                                key={index}
                                label={competence}
                                variant="outlined"
                                sx={{ bgcolor: "primary.light", color: "primary.contrastText" }}
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Aucune compétence spécifiée
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <AttachMoney sx={{ verticalAlign: "middle", mr: 1 }} />
                          Rémunération
                        </Typography>
                        <Typography>{offre.remuneration}</Typography>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          <Event sx={{ verticalAlign: "middle", mr: 1 }} />
                          Date limite
                        </Typography>
                        <Typography>{new Date(offre.dateExpiration).toLocaleDateString()}</Typography>
                      </Grid>
                    </Grid>
                    <Box display="flex" justifyContent="flex-end" mt={3}>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => handleOpenDialog(offre)}
                        disabled={postulations.includes(offre._id) || isOffreExpired(offre.dateExpiration)}
                      >
                        {isOffreExpired(offre.dateExpiration) ? "Expiré" : "Postuler maintenant"}
                      </Button>
                    </Box>
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </List>
        ) : (
          <Typography textAlign="center">Aucune offre trouvée.</Typography>
        )}
      </Container>

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "white",
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center">
            <Work sx={{ mr: 1 }} />
            <Typography variant="h6">Postuler: {selectedOffre?.titre}</Typography>
          </Box>
          <IconButton onClick={handleCloseDialog} sx={{ color: "white" }}>
            <Cancel />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Sélectionnez votre profil CV
          </Typography>

          <Grid container spacing={2}>
            {profilsCv.length > 0 ? (
              profilsCv.map((profil) => (
                <Grid item xs={12} sm={6} key={profil._id}>
                  <Card
                    onClick={() => setSelectedProfil(profil._id)}
                    sx={{
                      cursor: "pointer",
                      border: selectedProfil === profil._id ? "2px solid #1976d2" : "1px solid #e0e0e0",
                      borderRadius: 2,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        boxShadow: 3,
                        borderColor: "#1976d2",
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                          {profil.name?.charAt(0) || "P"}
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
                        <Box sx={{ display: "flex", alignItems: "center", color: "success.main" }}>
                          <CheckCircle sx={{ mr: 1 }} />
                          <Typography variant="body2">{profil.cv.filename}</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", alignItems: "center", color: "warning.main" }}>
                          <Warning sx={{ mr: 1 }} />
                          <Typography variant="body2">Aucun CV attaché</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Box
                sx={{
                  textAlign: "center",
                  p: 4,
                  border: "1px dashed #e0e0e0",
                  borderRadius: 2,
                  mt: 2,
                  width: "100%",
                }}
              >
                <Typography variant="body1" gutterBottom>
                  Vous n'avez aucun profil CV créé
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    handleCloseDialog();
                    navigate("/profils/creer");
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
            <Box
              sx={{ mt: 2, p: 2, backgroundColor: "error.light", color: "white", borderRadius: 2 }}
            >
              <Typography variant="body2">{errorMessage}</Typography>
            </Box>
          )}

          {selectedProfil && !profilsCv.find((profil) => profil._id === selectedProfil)?.cv && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                <AttachFile sx={{ verticalAlign: "middle", mr: 1 }} />
                Téléverser un CV
              </Typography>
              <Box
                sx={{
                  border: "2px dashed #1976d2",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  bgcolor: "action.hover",
                }}
              >
                <input
                  accept=".pdf,.doc,.docx"
                  style={{ display: "none" }}
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
                      onDelete={() => setFormData({ ...formData, cv: null })}
                      deleteIcon={<Cancel />}
                      sx={{ maxWidth: "100%" }}
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

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              <AttachFile sx={{ verticalAlign: "middle", mr: 1 }} />
              Lettre et/ou vidéo de motivation (optionnelles)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Vous pouvez soumettre une lettre de motivation (PDF) et/ou une vidéo de motivation.
            </Typography>

            <Box
              sx={{
                border: "2px dashed #1976d2",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                bgcolor: "action.hover",
                mb: motivationType.pdf ? 2 : 0,
              }}
            >
              <input
                accept="video/*"
                style={{ display: "none" }}
                id="video-upload"
                type="file"
                onChange={handleVideoChange}
              />
              <label htmlFor="video-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<VideoCameraBack />}
                  sx={{ mb: 1 }}
                >

                {videoFile ? "Changer la vidéo" : "Ajouter une vidéo"}
                </Button>
              </label>
              {videoFile ? (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={videoFile.name}
                    onDelete={() => {
                      setVideoFile(null);
                      setMotivationType((prev) => ({ ...prev, video: false }));
                    }}
                    deleteIcon={<Cancel />}
                    sx={{ maxWidth: "100%" }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Taille: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Formats: MP4, MOV (max 50MB, 2 min max)
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                border: "2px dashed #1976d2",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                bgcolor: "action.hover",
              }}
            >
              <input
                accept="application/pdf"
                style={{ display: "none" }}
                id="lettre-upload"
                type="file"
                onChange={handleLettreChange}
              />
              <label htmlFor="lettre-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<CloudUpload />}
                  sx={{ mb: 1 }}
                >
                  {lettreFile ? "Changer la lettre" : "Ajouter une lettre"}
                </Button>
              </label>
              {lettreFile ? (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={lettreFile.name}
                    onDelete={() => {
                      setLettreFile(null);
                      setMotivationType((prev) => ({ ...prev, pdf: false }));
                    }}
                    deleteIcon={<Cancel />}
                    sx={{ maxWidth: "100%" }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Taille: {(lettreFile.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Format: PDF (max 5MB)
                </Typography>
              )}
            </Box>
          </Box>

          {uploadProgress > 0 && (
            <Box sx={{ width: "100%", mt: 3 }}>
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

        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={handleCloseDialog} color="inherit" startIcon={<Cancel />}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handlePostuler}
            disabled={
              !selectedProfil ||
              (uploadProgress > 0 && uploadProgress < 100) ||
              (selectedOffre && isOffreExpired(selectedOffre.dateExpiration)) ||
              postulations.includes(selectedOffre?._id)
            }
            startIcon={<Send />}
            sx={{ ml: 2 }}
          >
            {selectedOffre && isOffreExpired(selectedOffre.dateExpiration)
              ? "Expiré"
              : "Envoyer la candidature"}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default ListesOffresPubliées;