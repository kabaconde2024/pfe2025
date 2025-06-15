import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  Grid,
  Fade,
  Zoom,
  Slide,
  Divider,
  useMediaQuery,
  useTheme,
  Skeleton,
  InputAdornment,
} from "@mui/material";
import {
  Edit,
  Delete,
  Add,
  AttachFile,
  Work,
  Code,
  Person,
  Visibility,
  CloudUpload,
} from "@mui/icons-material";
import axios from "axios";
import { motion } from "framer-motion";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const ProfilsList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const [profils, setProfils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProfilId, setSelectedProfilId] = useState(null);
  const [currentProfil, setCurrentProfil] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    competences: "",
    metier: "",
    cv: null,
  });
  const [cvFile, setCvFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [dragActive, setDragActive] = useState(false);

  // Fetch profils
  useEffect(() => {
    const fetchProfils = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/profilcv", {
          headers: { Authorization: `Bearer ${token}` },
        });

        let data = Array.isArray(res.data) ? res.data : res.data?.data || [];

        if (!Array.isArray(data)) {
          throw new Error("Format inattendu de la réponse API");
        }

        // Normalisation des données
        const normalizedProfils = data.map((profil) => ({
          ...profil,
          name: profil.name ? String(profil.name) : "",
          competences: profil.competences || [],
          metier: profil.metier ? String(profil.metier) : "",
          cv: profil.cv
            ? typeof profil.cv === "object"
              ? profil.cv.path || profil.cv.url
              : String(profil.cv)
            : null,
          _id: String(profil._id),
        }));

        setProfils(normalizedProfils);
      } catch (err) {
        console.error(err);
        showSnackbar("Erreur de chargement des profils", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchProfils();
  }, []);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Le nom est requis";
    if (!formData.metier.trim()) errors.metier = "Le métier est requis";
    if (!formData.competences.trim()) errors.competences = "Au moins une compétence est requise";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/profilcv/${selectedProfilId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfils((prev) => prev.filter((p) => p._id !== selectedProfilId));
      showSnackbar("Profil supprimé avec succès", "success");
    } catch (err) {
      showSnackbar("Erreur de suppression", "error");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleEditClick = (profil) => {
    setCurrentProfil(profil);
    setFormData({
      name: profil.name || "",
      competences: profil.competences.join(", ") || "",
      metier: profil.metier || "",
      cv: profil.cv || null,
    });
    setCvFile(null);
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      showSnackbar("Le fichier CV dépasse la taille maximale de 5MB", "error");
      return;
    }
    setCvFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      showSnackbar("Le fichier CV dépasse la taille maximale de 5MB", "error");
      return;
    }
    setCvFile(file);
  };

  const handleEditSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const data = new FormData();
      data.append("name", formData.name);
      data.append("competences", JSON.stringify(formData.competences.split(",").map(skill => skill.trim())));
      data.append("metier", formData.metier);
      if (cvFile) {
        data.append("cv", cvFile);
      }

      const response = await axios.put(
        `http://localhost:5000/api/profilcv/${currentProfil._id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const updatedProfil = {
        ...response.data.data,
        name: String(response.data.data.name),
        competences: response.data.data.competences || [],
        metier: String(response.data.data.metier),
        cv: response.data.data.cv
          ? typeof response.data.data.cv === "object"
            ? response.data.data.cv.path || response.data.data.cv.url
            : String(response.data.data.cv)
          : null,
      };

      setProfils((prev) =>
        prev.map((p) => (p._id === currentProfil._id ? updatedProfil : p))
      );
      showSnackbar("Profil mis à jour avec succès", "success");
      setEditDialogOpen(false);
    } catch (err) {
      console.error(err);
      showSnackbar("Erreur lors de la mise à jour", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="xl" sx={{ py: 12 }}>
          <Grid container spacing={3}>
            {[...Array(4)].map((_, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 3 }} />
                <Skeleton variant="text" width="60%" sx={{ mt: 2 }} />
                <Skeleton variant="text" width="40%" />
              </Grid>
            ))}
          </Grid>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ py: 8, bgcolor: theme.palette.background.default }}>
        {/* Header Section */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 6,
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 3 : 0,
          }}
        >
          <Fade in timeout={800}>
            <Box>
              <Typography
                variant={isMobile ? "h5" : "h4"}
                component="h3"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  mb: 1,
                }}
              >
                Vos Profils CV
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 400,
                }}
              >
                Gérez et personnalisez vos profils pour optimiser vos candidatures
              </Typography>
            </Box>
          </Fade>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              component={Link}
              to="/ProfilCv"
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: isMobile ? "0.9rem" : "1rem",
                background: `linear-gradient(135deg, #4fc3f7 0%, rgb(25, 193, 244) 100%)`,
                boxShadow: theme.shadows[3],
                color: 'white',
                textTransform: 'none',
                '&:hover': {
                  background: `linear-gradient(135deg, #29b6f6 0%, rgb(24, 206, 252) 100%)`,
                  boxShadow: theme.shadows[6],
                },
              }}
              aria-label="Ajouter un nouveau profil"
            >
              Ajouter un Profil
            </Button>
          </motion.div>
        </Box>

        {/* Profils Grid */}
        {profils.length > 0 ? (
          <Grid container spacing={3}>
            {profils.map((profil, index) => (
              <Grid item xs={12} md={6} key={profil._id}>
                <Fade in timeout={(index + 1) * 200}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                      borderRadius: 3,
                      overflow: "hidden",
                      bgcolor: theme.palette.background.paper,
                      boxShadow: theme.shadows[3],
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: theme.shadows[8],
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.secondary.main,
                            width: 60,
                            height: 60,
                            mr: 2,
                            fontSize: '1.5rem',
                            fontWeight: 600,
                          }}
                        >
                          {profil.name ? profil.name.charAt(0).toUpperCase() : <Person />}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="h6"
                            component="div"
                            sx={{ fontWeight: 600, color: theme.palette.text.primary }}
                          >
                            {profil.name}
                          </Typography>
                          <Chip
                            icon={<Work fontSize="small" />}
                            label={profil.metier || "Non spécifié"}
                            size="small"
                            sx={{
                              mt: 0.5,
                              bgcolor: theme.palette.success.light,
                              color: theme.palette.success.contrastText,
                              fontWeight: 500,
                            }}
                          />
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2, borderColor: theme.palette.divider }} />

                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 1.5,
                            fontWeight: 500,
                            color: theme.palette.text.secondary,
                          }}
                        >
                          <Code fontSize="small" sx={{ mr: 1 }} />
                          Compétences
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {profil.competences.length > 0 ? (
                            profil.competences.map((skill, i) => (
                              <Chip
                                key={i}
                                label={skill}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderColor: theme.palette.info.main,
                                  color: theme.palette.info.main,
                                  bgcolor: theme.palette.info.light + "22",
                                  fontWeight: 400,
                                }}
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Aucune compétence spécifiée
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {profil.cv && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            p: 1.5,
                            bgcolor: theme.palette.grey[100],
                            borderRadius: 2,
                            transition: 'background-color 0.3s',
                            '&:hover': {
                              bgcolor: theme.palette.grey[200],
                            },
                          }}
                        >
                          <AttachFile fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography
                            variant="body2"
                            component="a"
                            href={profil.cv}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              textDecoration: "none",
                              color: theme.palette.primary.main,
                              fontWeight: 500,
                              display: "flex",
                              alignItems: "center",
                              '&:hover': {
                                textDecoration: "underline",
                              },
                            }}
                            aria-label={`Consulter le CV de ${profil.name}`}
                          >
                            <Visibility fontSize="small" sx={{ mr: 0.5 }} />
                            Consulter le CV
                          </Typography>
                        </Box>
                      )}
                    </CardContent>

                    <CardActions
                      sx={{
                        justifyContent: "flex-end",
                        p: 2,
                        bgcolor: theme.palette.grey[50],
                        borderTop: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Tooltip title="Modifier le profil" arrow>
                        <IconButton
                          onClick={() => handleEditClick(profil)}
                          sx={{
                            color: theme.palette.primary.main,
                            '&:hover': {
                              bgcolor: theme.palette.primary.light + "33",
                            },
                          }}
                          aria-label={`Modifier le profil ${profil.name}`}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer le profil" arrow>
                        <IconButton
                          onClick={() => {
                            setSelectedProfilId(profil._id);
                            setDeleteDialogOpen(true);
                          }}
                          sx={{
                            color: theme.palette.error.main,
                            '&:hover': {
                              bgcolor: theme.palette.error.light + "33",
                            },
                          }}
                          aria-label={`Supprimer le profil ${profil.name}`}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "50vh",
              textAlign: "center",
              bgcolor: theme.palette.grey[50],
              borderRadius: 3,
              p: 4,
            }}
          >
            <Zoom in timeout={600}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: theme.palette.info.light,
                  color: theme.palette.info.main,
                  borderRadius: "50%",
                  mb: 3,
                }}
              >
                <Person fontSize="large" />
              </Box>
            </Zoom>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              color="text.primary"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Aucun profil disponible
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 400 }}
            >
              Créez votre premier profil pour commencer à postuler à des offres d'emploi.
            </Typography>
           
          </Box>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          fullWidth
          maxWidth="sm"
          TransitionComponent={Zoom}
          aria-labelledby="edit-profile-dialog-title"
        >
          <DialogTitle
            id="edit-profile-dialog-title"
            sx={{
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Modifier le Profil
            </Typography>
            <IconButton
              onClick={() => setEditDialogOpen(false)}
              sx={{ color: theme.palette.primary.contrastText }}
              aria-label="Fermer le dialogue de modification"
            >
              <Delete fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ py: 4 }}>
            <TextField
              label="Nom complet"
              name="name"
              fullWidth
              margin="normal"
              value={formData.name}
              onChange={handleInputChange}
              error={!!formErrors.name}
              helperText={formErrors.name}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: theme.palette.grey[500] }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
              aria-describedby="name-error-text"
            />
            <TextField
              label="Métier"
              name="metier"
              fullWidth
              margin="normal"
              value={formData.metier}
              onChange={handleInputChange}
              error={!!formErrors.metier}
              helperText={formErrors.metier}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Work sx={{ color: theme.palette.grey[500] }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
              aria-describedby="metier-error-text"
            />
            <TextField
              label="Compétences (séparées par des virgules)"
              name="competences"
              fullWidth
              margin="normal"
              value={formData.competences}
              onChange={handleInputChange}
              error={!!formErrors.competences}
              helperText={formErrors.competences}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Code sx={{ color: theme.palette.grey[500] }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
              aria-describedby="competences-error-text"
            />
            <Box
              sx={{
                border: `2px dashed ${dragActive ? theme.palette.primary.main : theme.palette.divider}`,
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                bgcolor: dragActive ? theme.palette.primary.light + "11" : theme.palette.background.paper,
                transition: 'all 0.3s ease',
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
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
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  sx={{
                    mb: 1,
                    color: theme.palette.primary.main,
                    borderColor: theme.palette.primary.main,
                    '&:hover': {
                      borderColor: theme.palette.primary.dark,
                      bgcolor: theme.palette.primary.light + "11",
                    },
                  }}
                  aria-label="Téléverser un nouveau CV"
                >
                  {cvFile ? "Changer le CV" : "Téléverser un CV"}
                </Button>
              </label>
              <Typography variant="caption" display="block" color="text.secondary">
                Formats acceptés: PDF, DOC, DOCX (max 5MB)
              </Typography>
              {(cvFile || formData.cv) && (
                <Box mt={2}>
                  <Chip
                    label={cvFile ? cvFile.name : formData.cv.split("/").pop()}
                    onDelete={() => {
                      setCvFile(null);
                      setFormData((prev) => ({ ...prev, cv: null }));
                    }}
                    deleteIcon={<Delete fontSize="small" />}
                    sx={{
                      maxWidth: '100%',
                      bgcolor: theme.palette.success.light,
                      color: theme.palette.success.contrastText,
                    }}
                  />
                  {cvFile && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Taille: {(cvFile.size / (1024 * 1024)).toFixed(2)} MB
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button
              onClick={() => setEditDialogOpen(false)}
              sx={{
                color: theme.palette.text.secondary,
                textTransform: 'none',
                fontWeight: 500,
              }}
              aria-label="Annuler la modification"
            >
              Annuler
            </Button>
            <Button
              onClick={handleEditSubmit}
              variant="contained"
              disabled={isSubmitting}
              sx={{
                px: 4,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                },
              }}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
              aria-label="Enregistrer les modifications"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="xs"
          fullWidth
          TransitionComponent={Zoom}
          aria-labelledby="delete-profile-dialog-title"
        >
          <DialogTitle
            id="delete-profile-dialog-title"
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              py: 2,
              fontWeight: 600,
            }}
          >
            Confirmer la suppression
          </DialogTitle>
          <DialogContent sx={{ py: 4, textAlign: 'center' }}>
            <Box
              sx={{
                display: "inline-flex",
                p: 2.5,
                bgcolor: theme.palette.error.light + "33",
                color: theme.palette.error.main,
                borderRadius: "50%",
                mb: 3,
              }}
            >
              <Delete fontSize="large" />
            </Box>
            <DialogContentText sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
              Voulez-vous vraiment supprimer ce profil ?
            </DialogContentText>
            <DialogContentText
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5 }}
            >
              Cette action est irréversible et supprimera toutes les données associées.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant="outlined"
              sx={{
                color: theme.palette.text.primary,
                borderColor: theme.palette.divider,
                textTransform: 'none',
                fontWeight: 500,
                px: 3,
                '&:hover': {
                  borderColor: theme.palette.grey[400],
                  bgcolor: theme.palette.grey[100],
                },
              }}
              aria-label="Annuler la suppression"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              variant="contained"
              color="error"
              sx={{
                px: 4,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: theme.palette.error.dark,
                },
              }}
              aria-label="Confirmer la suppression"
            >
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          TransitionComponent={Slide}
        >
          <Alert
            severity={snackbar.severity}
            sx={{
              width: "100%",
              boxShadow: theme.shadows[6],
              borderRadius: 2,
              fontWeight: 500,
            }}
            variant="filled"
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

export default ProfilsList;