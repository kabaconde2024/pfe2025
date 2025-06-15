import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { motion } from "framer-motion";
import {
  Container,
  Button,
  Typography,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  Card,
  CardContent,
  CardActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  Fade,
  Grow,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  OutlinedInput
} from "@mui/material";
import {
  Delete,
  Edit,
  Save,
  ArrowBack,
  Person,
  Warning,
  AttachFile,
  CloudUpload,
  Work,
  Description,
  LocationOn,
  MonetizationOn,
  Build
} from "@mui/icons-material";
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout"; // Adjust path if needed
import DashboardNavbar from "examples/Navbars/DashboardNavbar"; // Adjust path if needed
import { indigo, teal, red, grey, blue } from '@mui/material/colors';
import { alpha } from '@mui/material/styles';

const CreateAnnonce = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [profilsCv, setProfilsCv] = useState([]);
  const [loadingProfils, setLoadingProfils] = useState(true);
  const [selectedProfil, setSelectedProfil] = useState(null);
  const [competences, setCompetences] = useState([]);
  const [inputCompetence, setInputCompetence] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    typeContrat: "CDI",
    localisation: "",
    salaireSouhaite: "",
    profilCv: "",
    metier: "",
    competencesRequises: []
  });

  // Fetch profils
  useEffect(() => {
    const fetchProfils = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/profilcv", {
          headers: { Authorization: `Bearer ${token}` },
        });

        let data = res.data;

        // Normalisation des données
        if (data && data.data) {
          data = data.data;
        }

        if (!Array.isArray(data)) {
          data = [];
        }

        // Transformation des données
        const normalizedProfils = data.map((profil) => ({
          ...profil,
          name: profil.name ? String(profil.name) : "Profil sans nom",
          competence: profil.competence ? String(profil.competence) : "",
          metier: profil.metier ? String(profil.metier) : "",
          _id: String(profil._id),
        }));

        setProfilsCv(normalizedProfils);
      } catch (err) {
        console.error(err);
        setErrorMessage("Erreur de chargement des profils");
        setOpenSnackbar(true);
      } finally {
        setLoadingProfils(false);
      }
    };

    fetchProfils();
  }, []);

  // Mettre à jour le métier quand un profil est sélectionné
  const handleProfilChange = (value) => {
    const profilSelectionne = profilsCv.find(profil => profil._id === value);
    setSelectedProfil(profilSelectionne);
    setFormData(prev => ({
      ...prev,
      profilCv: value,
      metier: profilSelectionne?.metier || ''
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCompetence = () => {
    const trimmed = inputCompetence.trim();
    if (!trimmed) {
      setErrorMessage("Veuillez saisir une compétence");
      setOpenSnackbar(true);
      return;
    }

    if (competences.includes(trimmed)) {
      setErrorMessage("Cette compétence a déjà été ajoutée");
      setOpenSnackbar(true);
      return;
    }

    const newCompetences = [...competences, trimmed];
    setCompetences(newCompetences);
    setInputCompetence("");
    setFormData(prev => ({
      ...prev,
      competencesRequises: newCompetences
    }));
    setSuccessMessage(`Compétence "${trimmed}" ajoutée`);
    setOpenSnackbar(true);
  };

  const handleRemoveCompetence = (competenceToRemove) => {
    const newCompetences = competences.filter(
      (comp) => comp !== competenceToRemove
    );
    setCompetences(newCompetences);
    setFormData(prev => ({
      ...prev,
      competencesRequises: newCompetences
    }));
    setSuccessMessage(`Compétence "${competenceToRemove}" supprimée`);
    setOpenSnackbar(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
  
      if (!token) {
        setErrorMessage("Session expirée, veuillez vous reconnecter");
        setOpenSnackbar(true);
        navigate("/login");
        return;
      }
  
      if (!formData.profilCv) {
        setErrorMessage("Veuillez sélectionner un profil CV");
        setOpenSnackbar(true);
        return;
      }
  
      if (competences.length === 0) {
        setErrorMessage("Veuillez ajouter au moins une compétence");
        setOpenSnackbar(true);
        return;
      }
  
      const annonceData = {
        titre: formData.titre,
        description: formData.description,
        typeContrat: formData.typeContrat,
        localisation: formData.localisation,
        competencesRequises: competences,
        salaireSouhaite: formData.salaireSouhaite,
        profilCv: formData.profilCv,
        metier: formData.metier
      };
  
      const response = await axios.post(
        "http://localhost:5000/api/annonces",
        annonceData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (response.status === 201) {
        setSuccessMessage("Votre annonce a été publiée avec succès !");
        setOpenSnackbar(true);
        setFormData({
          titre: "",
          description: "",
          typeContrat: "CDI",
          localisation: "",
          salaireSouhaite: "",
          profilCv: "",
          metier: "",
          competencesRequises: []
        });
        setCompetences([]);
        setSelectedProfil(null);
        navigate("/annonces");
      }
    } catch (error) {
      console.error("Erreur de publication:", error);
      const errorMessage = error.response?.data?.message || 
        "Erreur lors de la publication de l'annonce";
      setErrorMessage(errorMessage);
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  if (loadingProfils) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '300px',
            flexDirection: 'column',
            gap: 3
          }}>
            <CircularProgress size={60} thickness={4} sx={{ color: blue[600] }} />
            <Typography variant="h6" sx={{ color: grey[900], fontWeight: 500 }}>
              Chargement des profils CV...
            </Typography>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ py: 10 }}>
        <Fade in={true} timeout={500}>
          <Paper elevation={0} sx={{ 
            p: 5, 
            borderRadius: 12,
            background: grey[50],
            border: '1px solid',
            borderColor: alpha(blue[100], 0.5),
            boxShadow: '0 8px 32px rgba(0, 0, 255, 0.05)',
            '&:hover': {
              boxShadow: '0 12px 48px rgba(0, 0, 255, 0.1)'
            }
          }}>
            {/* Header Section */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 5,
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Box>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700,
                  color: grey[900],
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5
                }}>
                  <motion.div
                    animate={{ rotate: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Work fontSize="large" sx={{ color: blue[600] }} />
                  </motion.div>
                  Publier une annonce de recherche emploi
                </Typography>
                <Typography variant="body2" sx={{ 
                  mt: 0.5, 
                  ml: 1, 
                  color: grey[700],
                  fontWeight: 500
                }}>
                  Remplissez les détails de votre annonce
                </Typography>
              </Box>

              <motion.div whileHover={{ scale: 1.03 }}>
                <Button
                  variant="outlined"
                  sx={{
                    color: blue[600],
                    borderColor: blue[600],
                    borderRadius: 8,
                    px: 3,
                    py: 1,
                    borderWidth: 2,
                    fontWeight: 500,
                    '&:hover': { 
                      borderWidth: 2,
                      backgroundColor: alpha(blue[50], 0.3),
                      borderColor: blue[700],
                      color: blue[700]
                    }
                  }}
                  onClick={() => navigate('/MesAnnonces')}
                  startIcon={<ArrowBack />}
                >
                  Retour à la liste
                </Button>
              </motion.div>
            </Box>

            {profilsCv.length === 0 ? (
              <Alert
                severity="warning"
                sx={{ mb: 4, borderRadius: 8, backgroundColor: alpha(red[50], 0.5) }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate("/profil-cv")}
                    sx={{ fontWeight: 500 }}
                  >
                    Créer un profil CV
                  </Button>
                }
              >
                <Typography variant="body1" sx={{ fontWeight: 700, color: red[900] }}>
                  Vous n‘avez aucun profil CV
                </Typography>
                <Typography variant="body2" sx={{ color: grey[700], fontWeight: 500 }}>
                  Veuillez créer un profil CV avant de publier une annonce
                </Typography>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit}>
                <Stack spacing={5}>
                  {/* Basic Information Card */}
                  <Grow in={true} timeout={600}>
                    <Card elevation={0} sx={{ 
                      p: 4, 
                      borderRadius: 12,
                      background: grey[50],
                      boxShadow: '0 4px 20px rgba(0, 0, 255, 0.05)',
                      border: '1px solid',
                      borderColor: alpha(blue[100], 0.3),
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 24px rgba(0, 0, 255, 0.1)',
                        transform: 'scale(1.01)'
                      }
                    }}>
                      <Typography variant="subtitle1" sx={{ 
                        mb: 3, 
                        fontWeight: 700,
                        color: grey[900],
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 12H9V17H7V12ZM11 7H13V17H11V7ZM15 10H17V17H15V10Z" fill={blue[600]}/>
                        </svg>
                        Informations de base
                      </Typography>
                      
                      <Stack spacing={3}>
                        <TextField
                          fullWidth
                          label="Titre de l'annonce"
                          name="titre"
                          value={formData.titre}
                          onChange={handleInputChange}
                          required
                          variant="outlined"
                          InputProps={{
                            sx: {
                              borderRadius: 8,
                              '& fieldset': {
                                borderWidth: 2,
                                borderColor: alpha(blue[200], 0.5),
                              },
                              '&:hover fieldset': {
                                borderColor: blue[300],
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: blue[600],
                              },
                            }
                          }}
                          InputLabelProps={{
                            sx: { color: grey[700], fontWeight: 500 }
                          }}
                        />
                        
                        <TextField
                          fullWidth
                          label="Description"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          required
                          variant="outlined"
                          multiline
                          rows={4}
                          InputProps={{
                            sx: {
                              borderRadius: 8,
                              '& fieldset': {
                                borderWidth: 2,
                                borderColor: alpha(blue[200], 0.5),
                              },
                              '&:hover fieldset': {
                                borderColor: blue[300],
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: blue[600],
                              },
                            }
                          }}
                          InputLabelProps={{
                            sx: { color: grey[700], fontWeight: 500 }
                          }}
                        />
                      </Stack>
                    </Card>
                  </Grow>

                  {/* Profile and Job Details Card */}
                  <Grow in={true} timeout={800}>
                    <Card elevation={0} sx={{ 
                      p: 4, 
                      borderRadius: 12,
                      background: grey[50],
                      boxShadow: '0 4px 20px rgba(0, 0, 255, 0.05)',
                      border: '1px solid',
                      borderColor: alpha(blue[100], 0.3),
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 24px rgba(0, 0, 255, 0.1)',
                        transform: 'scale(1.01)'
                      }
                    }}>
                      <Typography variant="subtitle1" sx={{ 
                        mb: 3, 
                        fontWeight: 700,
                        color: grey[900],
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <Person fontSize="large" sx={{ color: blue[600] }} />
                        Détails du profil et du poste
                      </Typography>
                      
                      <Stack spacing={3}>
                        <FormControl fullWidth>
                          <InputLabel id="profil-cv-label" sx={{ color: grey[700], fontWeight: 500 }}>
                            Profil CV associé
                          </InputLabel>
                          <Select
                            labelId="profil-cv-label"
                            id="profilCv"
                            name="profilCv"
                            value={formData.profilCv}
                            onChange={(e) => handleProfilChange(e.target.value)}
                            required
                            input={<OutlinedInput label="Profil CV associé" />}
                            sx={{
                              borderRadius: 8,
                              '& fieldset': {
                                borderWidth: 2,
                                borderColor: alpha(blue[200], 0.5),
                              },
                              '&:hover fieldset': {
                                borderColor: blue[300],
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: blue[600],
                              },
                            }}
                          >
                            {profilsCv.map((profil) => (
                              <MenuItem key={profil._id} value={profil._id}>
                                {profil.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <TextField
                          fullWidth
                          label="Métier"
                          name="metier"
                          value={formData.metier}
                          onChange={handleInputChange}
                          required
                          variant="outlined"
                          InputProps={{
                            readOnly: true,
                            startAdornment: (
                              <Work sx={{ color: blue[600], mr: 1 }} />
                            ),
                            sx: {
                              borderRadius: 8,
                              '& fieldset': {
                                borderWidth: 2,
                                borderColor: alpha(blue[200], 0.5),
                              },
                              '&:hover fieldset': {
                                borderColor: blue[300],
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: blue[600],
                              },
                            }
                          }}
                          InputLabelProps={{
                            sx: { color: grey[700], fontWeight: 500 }
                          }}
                        />
                        
                        <FormControl fullWidth>
                          <InputLabel id="type-contrat-label" sx={{ color: grey[700], fontWeight: 500 }}>
                            Type de contrat recherché
                          </InputLabel>
                          <Select
                            labelId="type-contrat-label"
                            id="typeContrat"
                            name="typeContrat"
                            value={formData.typeContrat}
                            onChange={handleInputChange}
                            required
                            input={<OutlinedInput label="Type de contrat recherché" />}
                            sx={{
                              borderRadius: 8,
                              '& fieldset': {
                                borderWidth: 2,
                                borderColor: alpha(blue[200], 0.5),
                              },
                              '&:hover fieldset': {
                                borderColor: blue[300],
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: blue[600],
                              },
                            }}
                          >
                            <MenuItem value="CDI">CDI</MenuItem>
                            <MenuItem value="CDD">CDD</MenuItem>
                            <MenuItem value="Stage">Stage</MenuItem>
                            <MenuItem value="Freelance">Freelance</MenuItem>
                            <MenuItem value="Alternance">Alternance</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <TextField
                          fullWidth
                          label="Localisation"
                          name="localisation"
                          value={formData.localisation}
                          onChange={handleInputChange}
                          required
                          variant="outlined"
                          InputProps={{
                            startAdornment: (
                              <LocationOn sx={{ color: blue[600], mr: 1 }} />
                            ),
                            sx: {
                              borderRadius: 8,
                              '& fieldset': {
                                borderWidth: 2,
                                borderColor: alpha(blue[200], 0.5),
                              },
                              '&:hover fieldset': {
                                borderColor: blue[300],
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: blue[600],
                              },
                            }
                          }}
                          InputLabelProps={{
                            sx: { color: grey[700], fontWeight: 500 }
                          }}
                        />
                        
                        <TextField
                          fullWidth
                          label="Salaire souhaité (optionnel)"
                          name="salaireSouhaite"
                          value={formData.salaireSouhaite}
                          onChange={handleInputChange}
                          variant="outlined"
                          type="number"
                          InputProps={{
                            startAdornment: (
                              <MonetizationOn sx={{ color: blue[600], mr: 1 }} />
                            ),
                            sx: {
                              borderRadius: 8,
                              '& fieldset': {
                                borderWidth: 2,
                                borderColor: alpha(blue[200], 0.5),
                              },
                              '&:hover fieldset': {
                                borderColor: blue[300],
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: blue[600],
                              },
                            }
                          }}
                          InputLabelProps={{
                            sx: { color: grey[700], fontWeight: 500 }
                          }}
                        />
                      </Stack>
                    </Card>
                  </Grow>

                  {/* Skills Card */}
                  <Grow in={true} timeout={1000}>
                    <Card elevation={0} sx={{ 
                      p: 4, 
                      borderRadius: 12,
                      background: grey[50],
                      boxShadow: '0 4px 20px rgba(0, 0, 255, 0.05)',
                      border: '1px solid',
                      borderColor: alpha(blue[100], 0.3),
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 24px rgba(0, 0, 255, 0.1)',
                        transform: 'scale(1.01)'
                      }
                    }}>
                      <Typography variant="subtitle1" sx={{ 
                        mb: 3, 
                        fontWeight: 700,
                        color: grey[900],
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <Build fontSize="large" sx={{ color: blue[600] }} />
                        Compétences
                      </Typography>
                      
                      <Stack spacing={3}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField
                            fullWidth
                            value={inputCompetence}
                            onChange={(e) => setInputCompetence(e.target.value)}
                            placeholder="Ajouter une compétence (React, Node.js, etc.)"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCompetence()}
                            InputProps={{
                              sx: {
                                borderRadius: 8,
                                '& fieldset': {
                                  borderWidth: 2,
                                  borderColor: alpha(blue[200], 0.5),
                                },
                                '&:hover fieldset': {
                                  borderColor: blue[300],
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: blue[600],
                                },
                              }
                            }}
                            InputLabelProps={{
                              sx: { color: grey[700], fontWeight: 500 }
                            }}
                          />
                          <Button
                            variant="contained"
                            onClick={handleAddCompetence}
                            startIcon={<PlusOutlined />}
                            sx={{
                              borderRadius: 8,
                              px: 3,
                              py: 1,
                              background: `linear-gradient(45deg, ${blue[600]} 30%, ${teal[500]} 90%)`,
                              color: grey[50],
                              boxShadow: '0 4px 10px rgba(0, 0, 255, 0.3)',
                              fontWeight: 500,
                              '&:hover': {
                                boxShadow: '0 6px 14px rgba(0, 0, 255, 0.4)',
                                background: teal[500],
                                color: grey[50]
                              }
                            }}
                          >
                            Ajouter
                          </Button>
                        </Box>
                        
                        {competences.length === 0 ? (
                          <Typography variant="body2" sx={{ 
                            fontStyle: 'italic', 
                            color: grey[500],
                            fontWeight: 500
                          }}>
                            Aucune compétence ajoutée
                          </Typography>
                        ) : (
                          <Box sx={{ 
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1
                          }}>
                            {competences.map((competence, index) => (
                              <motion.div
                                key={index}
                                whileHover={{ scale: 1.05 }}
                              >
                                <Chip
                                  label={competence}
                                  onDelete={() => handleRemoveCompetence(competence)}
                                  sx={{
                                    borderRadius: 8,
                                    backgroundColor: blue[50],
                                    color: blue[800],
                                    fontWeight: 500,
                                    '& .MuiChip-deleteIcon': {
                                      color: blue[600],
                                      '&:hover': {
                                        color: blue[800]
                                      }
                                    }
                                  }}
                                />
                              </motion.div>
                            ))}
                          </Box>
                        )}
                      </Stack>
                    </Card>
                  </Grow>

                  {/* Preview Card */}
                  <Grow in={true} timeout={1200}>
                    <Card elevation={0} sx={{ 
                      p: 4, 
                      borderRadius: 12,
                      background: grey[50],
                      boxShadow: '0 4px 20px rgba(0, 0, 255, 0.05)',
                      border: '1px solid',
                      borderColor: alpha(blue[100], 0.3),
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 24px rgba(0, 0, 255, 0.1)',
                        transform: 'scale(1.01)'
                      }
                    }}>
                      <Typography variant="subtitle1" sx={{ 
                        mb: 3, 
                        fontWeight: 700,
                        color: grey[900],
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <Description fontSize="large" sx={{ color: blue[600] }} />
                        Aperçu de l‘annonce
                      </Typography>
                      
                      <Stack spacing={2.5} sx={{ pl: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ 
                            mb: 0.5,
                            color: grey[900],
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Work fontSize="small" sx={{ color: blue[600] }} />
                            Titre:
                          </Typography>
                          <Typography sx={{ 
                            pl: 3,
                            color: formData.titre ? grey[900] : grey[500],
                            fontStyle: formData.titre ? 'normal' : 'italic',
                            fontWeight: 500
                          }}>
                            {formData.titre || 'Non spécifié'}
                          </Typography>
                        </Box>
                        
                        <Divider sx={{ borderColor: alpha(blue[100], 0.5) }} />
                        
                        <Box>
                          <Typography variant="subtitle2" sx={{ 
                            mb: 0.5,
                            color: grey[900],
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Description fontSize="small" sx={{ color: blue[600] }} />
                            Description:
                          </Typography>
                          <Typography sx={{ 
                            pl: 3,
                            color: formData.description ? grey[900] : grey[500],
                            fontStyle: formData.description ? 'normal' : 'italic',
                            whiteSpace: 'pre-line',
                            fontWeight: 500
                          }}>
                            {formData.description || 'Non spécifié'}
                          </Typography>
                        </Box>
                        
                        <Divider sx={{ borderColor: alpha(blue[100], 0.5) }} />
                        
                        <Box>
                          <Typography variant="subtitle2" sx={{ 
                            mb: 0.5,
                            color: grey[900],
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Person fontSize="small" sx={{ color: blue[600] }} />
                            Profil CV associé:
                          </Typography>
                          <Typography sx={{ 
                            pl: 3,
                            color: formData.profilCv ? grey[900] : grey[500],
                            fontStyle: formData.profilCv ? 'normal' : 'italic',
                            fontWeight: 500
                          }}>
                            {formData.profilCv ? profilsCv.find(p => p._id === formData.profilCv)?.name : 'Non spécifié'}
                          </Typography>
                        </Box>
                        
                        <Divider sx={{ borderColor: alpha(blue[100], 0.5) }} />
                        
                        <Box>
                          <Typography variant="subtitle2" sx={{ 
                            mb: 0.5,
                            color: grey[900],
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Work fontSize="small" sx={{ color: blue[600] }} />
                            Métier:
                          </Typography>
                          <Typography sx={{ 
                            pl: 3,
                            color: formData.metier ? grey[900] : grey[500],
                            fontStyle: formData.metier ? 'normal' : 'italic',
                            fontWeight: 500
                          }}>
                            {formData.metier || 'Non spécifié'}
                          </Typography>
                        </Box>
                        
                        <Divider sx={{ borderColor: alpha(blue[100], 0.5) }} />
                        
                        <Box>
                          <Typography variant="subtitle2" sx={{ 
                            mb: 0.5,
                            color: grey[900],
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Description fontSize="small" sx={{ color: blue[600] }} />
                            Type de contrat:
                          </Typography>
                          <Typography sx={{ 
                            pl: 3,
                            color: formData.typeContrat ? grey[900] : grey[500],
                            fontStyle: formData.typeContrat ? 'normal' : 'italic',
                            fontWeight: 500
                          }}>
                            {formData.typeContrat || 'Non spécifié'}
                          </Typography>
                        </Box>
                        
                        <Divider sx={{ borderColor: alpha(blue[100], 0.5) }} />
                        
                        <Box>
                          <Typography variant="subtitle2" sx={{ 
                            mb: 0.5,
                            color: grey[900],
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <LocationOn fontSize="small" sx={{ color: blue[600] }} />
                            Localisation:
                          </Typography>
                          <Typography sx={{ 
                            pl: 3,
                            color: formData.localisation ? grey[900] : grey[500],
                            fontStyle: formData.localisation ? 'normal' : 'italic',
                            fontWeight: 500
                          }}>
                            {formData.localisation || 'Non spécifié'}
                          </Typography>
                        </Box>
                        
                        <Divider sx={{ borderColor: alpha(blue[100], 0.5) }} />
                        
                        <Box>
                          <Typography variant="subtitle2" sx={{ 
                            mb: 0.5,
                            color: grey[900],
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Build fontSize="small" sx={{ color: blue[600] }} />
                            Compétences :
                          </Typography>
                          {competences.length > 0 ? (
                            <Box sx={{ 
                              pl: 3,
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 1
                            }}>
                              {competences.map((competence, index) => (
                                <Chip
                                  key={index}
                                  label={competence}
                                  sx={{
                                    borderRadius: 8,
                                    backgroundColor: blue[50],
                                    color: blue[800],
                                    fontWeight: 500
                                  }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography sx={{ 
                              pl: 3,
                              color: grey[500],
                              fontStyle: 'italic',
                              fontWeight: 500
                            }}>
                              Aucune compétence ajoutée
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Card>
                  </Grow>

                  {/* Action Buttons */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    gap: 2,
                    pt: 3
                  }}>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                        disabled={saving || !formData.titre || !formData.description || !formData.profilCv || !formData.metier || !formData.typeContrat || !formData.localisation || competences.length === 0}
                        sx={{ 
                          borderRadius: 8, 
                          px: 4,
                          py: 1.5,
                          background: `linear-gradient(45deg, ${blue[600]} 30%, ${teal[500]} 90%)`,
                          color: grey[50],
                          boxShadow: '0 4px 10px rgba(0, 0, 255, 0.3)',
                          fontWeight: 500,
                          '&:hover': {
                            boxShadow: '0 6px 14px rgba(0, 0, 255, 0.4)',
                            background: teal[500],
                            color: grey[50]
                          },
                          '&:disabled': {
                            background: grey[300],
                            color: grey[50]
                          }
                        }}
                      >
                        {saving ? 'Publication en cours...' : 'Creer l\'annonce'}
                      </Button>
                    </motion.div>
                  </Box>
                </Stack>
              </form>
            )}
          </Paper>
        </Fade>

        {/* Snackbar for notifications */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          TransitionComponent={Grow}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={errorMessage ? "error" : "success"}
            sx={{ 
              width: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              alignItems: 'center',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: errorMessage ? red[900] : teal[800],
              backgroundColor: errorMessage ? alpha(red[50], 0.5) : alpha(teal[50], 0.5),
              borderRadius: 8
            }}
            variant="filled"
          >
            {errorMessage || successMessage}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

CreateAnnonce.propTypes = {
  // Add PropTypes if needed
};

export default CreateAnnonce;