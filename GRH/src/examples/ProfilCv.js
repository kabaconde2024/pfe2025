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
  Paper,
  Stack,
  Avatar,
  IconButton,
  Chip,
  Fade,
  Grow,
  Card
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { Delete, Save, ArrowBack, Person, Warning, AttachFile, CloudUpload } from "@mui/icons-material";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { grey, blue, teal } from '@mui/material/colors';
import { alpha } from '@mui/material/styles';

const ProfilCv = ({ editMode = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [profileCount, setProfileCount] = useState(0);
  const [profileLimitReached, setProfileLimitReached] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    competences: [],
    competence: "",
    metier: "",
    cv: null
  });

  useEffect(() => {
    const fetchProfileCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/profilcv/count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setProfileCount(response.data.count);
        setProfileLimitReached(response.data.count >= 5);
        
        if (response.data.count > 0) {
          setSuccessMessage(`Vous avez ${response.data.count} profil(s) sur 5 maximum.`);
          setOpenSnackbar(true);
        }
      } catch (error) {
        console.error("Error fetching profile count:", error);
      }
    };

    if (!editMode) {
      fetchProfileCount();
    }

    if (editMode && id) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`http://localhost:5000/api/profilcv/${id}`);
          setFormData({
            name: response.data.name,
            competences: response.data.competences || [],
            competence: "",
            metier: response.data.metier,
            cv: response.data.cv ? {
              name: response.data.cv.filename,
              url: response.data.cv.url
            } : null
          });
        } catch (error) {
          console.error("Error fetching profile:", error);
          setErrorMessage("Erreur lors du chargement du profil");
          setOpenSnackbar(true);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [editMode, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCvFile(file);
      setFormData(prev => ({
        ...prev,
        cv: { name: file.name, file: file }
      }));
    }
  };

  const addCompetence = () => {
    if (formData.competence && !formData.competences.includes(formData.competence)) {
      setFormData(prev => ({
        ...prev,
        competences: [...prev.competences, prev.competence],
        competence: ""
      }));
    }
  };

  const removeCompetence = (competence) => {
    setFormData(prev => ({
      ...prev,
      competences: prev.competences.filter(item => item !== competence)
    }));
  };

   const handleSubmit = async (e) => {
    e.preventDefault();

    if (profileLimitReached && !editMode) {
      setErrorMessage("Vous avez atteint la limite maximale de 5 profils CV");
      setOpenSnackbar(true);
      return;
    }

    setSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('competences', JSON.stringify(formData.competences));
      formDataToSend.append('metier', formData.metier);
      if (cvFile) {
        formDataToSend.append('cv', cvFile);
      }

      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      };

      const url = editMode
        ? `http://localhost:5000/api/profilcv/${id}`
        : "http://localhost:5000/api/profilcv/creer";

      const method = editMode ? 'put' : 'post';

      const response = await axios[method](url, formDataToSend, config);

      if (response.data.success) {
        setSuccessMessage(editMode ? "Profil mis à jour avec succès !" : "Profil créé avec succès ! Vous pouvez maintenant le voir dans votre liste de profils.");
        setOpenSnackbar(true);
        setProfileCount(prev => prev + (editMode ? 0 : 1));
        setProfileLimitReached(response.data.count >= 5);
        // Redirection immédiate vers la liste
        navigate("/ProfilsList");
      } else {
        throw new Error(response.data.message || "Erreur inconnue");
      }
    } catch (error) {
      console.error("Erreur:", error);
      setErrorMessage(error.response?.data?.message || error.message || "Erreur lors de la création du profil");
      setOpenSnackbar(true);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      const response = await axios.delete(`http://localhost:5000/api/profilcv/${id}`);
      setSuccessMessage(response.data.message);
      setOpenSnackbar(true);
      setProfileCount(prev => prev - 1);
      setProfileLimitReached(false);
      navigate("/profils");
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Erreur lors de la suppression");
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    navigate("/profils");
  };

  if (loading) {
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
            <CircularProgress size={60} thickness={4} sx={{ color: blue[800] }} />
            <Typography variant="h6" color={grey[900]}>
              Chargement du profil...
            </Typography>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  if (!editMode && profileLimitReached) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Fade in={true} timeout={500}>
            <Paper elevation={0} sx={{ 
              p: 4, 
              borderRadius: 12,
              background: '#FFFFFF',
              border: `1px solid ${alpha('#EF5350', 0.3)}`,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <Box sx={{ mb: 4 }}>
                <Warning fontSize="large" sx={{ fontSize: 60, color: '#D32F2F', mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: grey[900], mb: 2 }}>
                  Limite de profils atteinte
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, color: grey[700] }}>
                  Vous avez atteint la limite maximale de 5 profils CV.
                </Typography>
                <Typography variant="body2" color={grey[700]}>
                  Pour créer un nouveau profil, veuillez supprimer un profil existant.
                </Typography>
              </Box>
              <motion.div whileHover={{ scale: 1.03 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/ProfilsList')}
                  startIcon={<ArrowBack />}
                  sx={{
                    borderRadius: 10,
                    px: 3,
                    py: 1,
                    borderWidth: 1.5,
                    color: teal[600],
                    borderColor: teal[600],
                    '&:hover': { 
                      borderWidth: 1.5,
                      backgroundColor: alpha(teal[100], 0.2),
                      borderColor: teal[800]
                    }
                  }}
                >
                  Retour à la liste des profils
                </Button>
              </motion.div>
            </Paper>
          </Fade>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Fade in={true} timeout={500}>
          <Paper elevation={0} sx={{ 
            p: { xs: 3, md: 5 }, 
            borderRadius: 12,
            background: '#FFFFFF',
            border: `1px solid ${alpha(grey[200], 0.5)}`,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 4,
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Box>
                <Typography variant="h4" sx={{ 
                  fontWeight: 700,
                  color: grey[900],
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5
                }}>
                  <motion.div
                    animate={{ rotate: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Person fontSize="large" sx={{ color: blue[800] }} />
                  </motion.div>
                  {editMode ? 'Modifier le Profil CV' : 'Créer un Profil CV'}
                </Typography>
                <Typography variant="body2" color={grey[700]} sx={{ mt: 0.5, ml: 1 }}>
                  {editMode ? 'Mettez à jour les informations du profil' : `Profils créés : ${profileCount}/5`}
                </Typography>
              </Box>
              <motion.div whileHover={{ scale: 1.03 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/ProfilsList')}
                  startIcon={<ArrowBack />}
                  sx={{
                    borderRadius: 10,
                    px: 3,
                    py: 1,
                    borderWidth: 1.5,
                    color: teal[600],
                    borderColor: teal[600],
                    '&:hover': { 
                      borderWidth: 1.5,
                      backgroundColor: alpha(teal[100], 0.2),
                      borderColor: teal[800]
                    }
                  }}
                >
                  Retour à la liste
                </Button>
              </motion.div>
            </Box>

            {profileLimitReached && !editMode ? (
              <Alert severity="warning" sx={{ 
                mb: 3, 
                borderRadius: 10,
                backgroundColor: alpha('#EF5350', 0.1),
                border: `1px solid ${'#EF5350'}`,
                color: grey[900]
              }}>
                <Typography variant="body1" fontWeight="bold">
                  Vous avez atteint la limite maximale de 5 profils CV
                </Typography>
                <Typography variant="body2">
                  Veuillez supprimer un profil existant avant d'en créer un nouveau.
                </Typography>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit}>
                <Stack spacing={4}>
                  <Grow in={true} timeout={600}>
                    <Card elevation={0} sx={{ 
                      p: 3, 
                      borderRadius: 12,
                      background: '#FFFFFF',
                      border: `1px solid ${alpha(grey[200], 0.5)}`,
                    }}>
                      <Typography variant="h6" sx={{ 
                        mb: 3, 
                        fontWeight: 600,
                        color: grey[900],
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <Person fontSize="large" sx={{ color: blue[800] }} />
                        Informations de base
                      </Typography>
                      <Stack spacing={3}>
                        <Box>
                          <label 
                            htmlFor="name-input" 
                            style={{ 
                              display: 'block', 
                              marginBottom: '8px', 
                              color: grey[700], 
                              fontWeight: 500, 
                              fontSize: '1rem' 
                            }}
                          >
                            Nom du profil
                          </label>
                          <input
                            id="name-input"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            placeholder="Entrez le nom du profil"
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: '10px',
                              border: `1.5px solid ${grey[300]}`,
                              backgroundColor: '#FFFFFF',
                              color: grey[900],
                              fontSize: '1rem',
                              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                              outline: 'none'
                            }}
                            onMouseOver={(e) => e.target.style.borderColor = blue[600]}
                            onMouseOut={(e) => e.target.style.borderColor = grey[300]}
                            onFocus={(e) => {
                              e.target.style.borderColor = blue[800];
                              e.target.style.boxShadow = `0 0 0 3px ${alpha(blue[200], 0.3)}`;
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = grey[300];
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <label 
                              htmlFor="competence-input" 
                              style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                color: grey[700], 
                                fontWeight: 500, 
                                fontSize: '1rem' 
                              }}
                            >
                              Compétence
                            </label>
                            <input
                              id="competence-input"
                              type="text"
                              name="competence"
                              value={formData.competence}
                              onChange={handleInputChange}
                              placeholder="Entrez une compétence"
                              style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: `1.5px solid ${grey[300]}`,
                                backgroundColor: '#FFFFFF',
                                color: grey[900],
                                fontSize: '1rem',
                                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                outline: 'none'
                              }}
                              onMouseOver={(e) => e.target.style.borderColor = blue[600]}
                              onMouseOut={(e) => e.target.style.borderColor = grey[300]}
                              onFocus={(e) => {
                                e.target.style.borderColor = blue[800];
                                e.target.style.boxShadow = `0 0 0 3px ${alpha(blue[200], 0.3)}`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = grey[300];
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </Box>
                          <Button 
                            variant="contained" 
                            onClick={addCompetence}
                            sx={{
                              borderRadius: 10,
                              px: 3,
                              py: 1,
                              color: '#FFFFFF',
                              '&:hover': { 
                                backgroundColor: blue[900],
                                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
                              }
                            }}
                          >
                            Ajouter
                          </Button>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {formData.competences.map((competence, index) => (
                            <Chip
                              key={index}
                              label={competence}
                              onDelete={() => removeCompetence(competence)}
                              sx={{ 
                                borderRadius: 8,
                                background: teal[100],
                                color: grey[900],
                                fontWeight: 500,
                                '& .MuiChip-deleteIcon': { color: '#D32F2F' }
                              }}
                            />
                          ))}
                        </Box>
                        <Box>
                          <label 
                            htmlFor="metier-input" 
                            style={{ 
                              display: 'block', 
                              marginBottom: '8px', 
                              color: grey[700], 
                              fontWeight: 500, 
                              fontSize: '1rem' 
                            }}
                          >
                            Métier
                          </label>
                          <input
                            id="metier-input"
                            type="text"
                            name="metier"
                            value={formData.metier}
                            onChange={handleInputChange}
                            required
                            placeholder="Entrez le métier"
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: '10px',
                              border: `1.5px solid ${grey[300]}`,
                              backgroundColor: '#FFFFFF',
                              color: grey[900],
                              fontSize: '1rem',
                              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                              outline: 'none'
                            }}
                            onMouseOver={(e) => e.target.style.borderColor = blue[600]}
                            onMouseOut={(e) => e.target.style.borderColor = grey[300]}
                            onFocus={(e) => {
                              e.target.style.borderColor = blue[800];
                              e.target.style.boxShadow = `0 0 0 3px ${alpha(blue[200], 0.3)}`;
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = grey[300];
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </Box>
                      </Stack>
                    </Card>
                  </Grow>
                  <Grow in={true} timeout={800}>
                    <Card elevation={0} sx={{ 
                      p: 3, 
                      borderRadius: 12,
                      background: '#FFFFFF',
                      border: `1px solid ${alpha(grey[200], 0.5)}`,
                    }}>
                      <Typography variant="h6" sx={{ 
                        mb: 3, 
                        fontWeight: 600,
                        color: grey[900],
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <CloudUpload fontSize="large" sx={{ color: blue[800] }} />
                        Document CV
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 2
                      }}>
                        <motion.div whileHover={{ scale: 1.02 }}>
                          <Button
                            variant="outlined"
                            component="label"
                            startIcon={<CloudUpload />}
                            sx={{
                              borderRadius: 10,
                              px: 4,
                              py: 1.5,
                              borderWidth: 1.5,
                              borderColor: blue[800],
                              color: blue[800],
                              '&:hover': {
                                borderWidth: 1.5,
                                backgroundColor: alpha(blue[100], 0.2),
                                borderColor: blue[900]
                              }
                            }}
                          >
                            Sélectionner un fichier
                            <input
                              type="file"
                              hidden
                              onChange={handleFileChange}
                              accept=".pdf,.doc,.docx"
                            />
                          </Button>
                        </motion.div>
                        {formData.cv && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Paper elevation={0} sx={{
                              p: 2,
                              borderRadius: 10,
                              backgroundColor: alpha(blue[100], 0.1),
                              border: `1px dashed ${blue[800]}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              width: '100%'
                            }}>
                              <Avatar sx={{ 
                                bgcolor: blue[100], 
                                color: blue[900],
                                width: 40,
                                height: 40
                              }}>
                                <AttachFile />
                              </Avatar>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: grey[900] }}>
                                  {formData.cv.name}
                                </Typography>
                                <Typography variant="caption" color={grey[700]}>
                                  {formData.cv.url ? "Fichier existant" : "Nouveau fichier"}
                                </Typography>
                              </Box>
                              <IconButton
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, cv: null }));
                                  setCvFile(null);
                                }}
                                sx={{ color: '#D32F2F' }}
                              >
                                <Delete />
                              </IconButton>
                            </Paper>
                          </motion.div>
                        )}
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: grey[700] }}>
                          Formats acceptés : PDF, DOC, DOCX (Taille max : 5MB)
                        </Typography>
                      </Box>
                    </Card>
                  </Grow>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 3 }}>
                    {editMode && (
                      <motion.div whileHover={{ scale: 1.05 }}>
                        <Button
                          variant="outlined"
                          startIcon={<Delete />}
                          onClick={() => setOpenDeleteDialog(true)}
                          sx={{ 
                            borderRadius: 10, 
                            px: 3,
                            py: 1,
                            borderWidth: 1.5,
                            color: '#D32F2F',
                            borderColor: '#D32F2F',
                            '&:hover': {
                              borderWidth: 1.5,
                              backgroundColor: alpha('#EF5350', 0.2),
                              borderColor: '#D32F2F'
                            }
                          }}
                        >
                          Supprimer
                        </Button>
                      </motion.div>
                    )}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                        disabled={saving || !formData.name || formData.competences.length === 0 || !formData.metier || !formData.cv}
                        sx={{ 
                          borderRadius: 10, 
                          px: 4,
                          py: 1.5,
                          background: blue[800],
                          color: '#FFFFFF',
                          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                          '&:hover': {
                            background: blue[900],
                            boxShadow: '0 6px 14px rgba(0, 0, 0, 0.2)'
                          },
                          '&:disabled': {
                            background: grey[300],
                            color: grey[600]
                          }
                        }}
                      >
                        {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
                      </Button>
                    </motion.div>
                  </Box>
                </Stack>
              </form>
            )}
          </Paper>
        </Fade>
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
              borderRadius: 10,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: errorMessage ? '#D32F2F' : teal[600],
              color: '#FFFFFF'
            }}
            variant="filled"
          >
            {errorMessage || successMessage}
          </Alert>
        </Snackbar>
        <Dialog 
          open={openDeleteDialog} 
          onClose={() => setOpenDeleteDialog(false)}
          PaperProps={{ sx: { borderRadius: 12, width: '100%', maxWidth: '500px', overflow: 'hidden' } }}
        >
          <DialogTitle sx={{ backgroundColor: '#D32F2F', color: '#FFFFFF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Warning fontSize="large" />
            Confirmer la suppression
          </DialogTitle>
          <DialogContent sx={{ py: 3, px: 3 }}>
            <DialogContentText sx={{ color: grey[900] }}>
              Êtes-vous sûr de vouloir supprimer définitivement ce profil CV ? Cette action est irréversible et toutes les données associées seront perdues.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ py: 2, px: 3, borderTop: `1px solid ${grey[200]}` }}>
            <motion.div whileHover={{ scale: 1.03 }}>
              <Button 
                onClick={() => setOpenDeleteDialog(false)} 
                variant="outlined"
                sx={{ 
                  borderRadius: 10, 
                  px: 3,
                  py: 1,
                  borderWidth: 1.5,
                  color: grey[700],
                  borderColor: grey[400],
                  '&:hover': { borderWidth: 1.5, backgroundColor: alpha(grey[100], 0.5) }
                }}
              >
                Annuler
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button 
                onClick={handleDelete} 
                variant="contained"
                startIcon={<Delete />}
                sx={{ 
                  borderRadius: 10, 
                  px: 3,
                  py: 1,
                  background: '#D32F2F',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  '&:hover': { background: '#B71C1C', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }
                }}
              >
                Confirmer la suppression
              </Button>
            </motion.div>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
};

ProfilCv.propTypes = {
  editMode: PropTypes.bool
};

ProfilCv.defaultProps = {
  editMode: false
};

export default ProfilCv;