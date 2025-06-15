import { useState, useEffect } from "react";
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
  IconButton,
  Tooltip,
  TextField,
  Chip,
  Grid,
  Avatar
} from "@mui/material";
import { useNavigate } from "react-router-dom"; 
import { Delete, Edit, Add, Check, Warning, Search } from "@mui/icons-material";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Configuration de l'intercepteur Axios pour gérer les erreurs 401
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.warn('Erreur 401: Session expirée ou token invalide');
      return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter.'));
    }
    return Promise.reject(error);
  }
);

const ProfileList = () => {
  const navigate = useNavigate();
  const [profils, setProfils] = useState([]);
  const [filteredProfils, setFilteredProfils] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [profileToEdit, setProfileToEdit] = useState({ name: "" });
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setErrorMessage('Veuillez vous connecter.');
          navigate('/login');
          return;
        }
        console.log('Fetching profils with token:', token.substring(0, 20) + '...');
        const response = await axios.get("http://localhost:5000/api/profils", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Réponse API profils:', response.data);
        setProfils(Array.isArray(response.data) ? response.data : []);
        setFilteredProfils(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Erreur de chargement:", error);
        setErrorMessage(error.message || "Échec du chargement des profils");
        setOpenSnackbar(true);
        if (error.message === 'Session expirée. Veuillez vous reconnecter.') {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = profils.filter(profil =>
      profil.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProfils(filtered);
  }, [searchTerm, profils]);

  const handleOpenDeleteDialog = (profileId) => {
    if (!profileId) {
      setErrorMessage("ID de profil invalide");
      setOpenSnackbar(true);
      return;
    }
    setSelectedProfileId(profileId);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedProfileId(null);
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('Veuillez vous connecter.');
        navigate('/login');
        return;
      }
      console.log('Suppression du profil:', selectedProfileId);
      await axios.delete(`http://localhost:5000/api/profils/${selectedProfileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMessage("Profil supprimé avec succès");
      setOpenSnackbar(true);
      setProfils(prev => prev.filter(profil => profil._id !== selectedProfileId));
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Erreur suppression:', error);
      const message = error.response?.data?.message || "Échec de la suppression";
      setErrorMessage(message);
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const getDisplayDate = (profil) => {
    const createdAtValid = profil.createdAt && !isNaN(new Date(profil.createdAt).getTime());
    const updatedAtValid = profil.updatedAt && !isNaN(new Date(profil.updatedAt).getTime());
    if (createdAtValid) {
      return new Date(profil.createdAt).toLocaleDateString();
    } else if (updatedAtValid) {
      return new Date(profil.updatedAt).toLocaleDateString();
    } else {
      return 'Date inconnue';
    }
  };

  const handleOpenEdit = (profil) => {
    setProfileToEdit({ name: profil.name });
    setSelectedProfileId(profil._id);
    setOpenEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('Veuillez vous connecter.');
        navigate('/login');
        return;
      }
      await axios.put(`http://localhost:5000/api/profils/${selectedProfileId}`, profileToEdit, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMessage("Profil modifié avec succès");
      setOpenSnackbar(true);
      setProfils(prev => prev.map(p => p._id === selectedProfileId ? { ...p, ...profileToEdit } : p));
      setOpenEditDialog(false);
    } catch (error) {
      console.error('Erreur modification:', error);
      const message = error.response?.data?.message || "Échec de la modification";
      setErrorMessage(message);
      setOpenSnackbar(true);
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ py: 4, mt:10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Gestion des profils
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Liste complète des profils utilisateurs
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/create-profil')}
            sx={{ textTransform: 'none', borderRadius: '8px', px: 3, py: 1 }}
          >
            Nouveau profil
          </Button>
        </Box>
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Rechercher un profil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: { md: 'right' } }}>
              <Chip label={`${filteredProfils.length} profil(s) trouvé(s)`} color="info" variant="outlined" />
            </Grid>
          </Grid>
        </Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={60} />
          </Box>
        ) : filteredProfils.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              {searchTerm ? "Aucun résultat trouvé" : "Aucun profil disponible"}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {searchTerm ? "Essayez avec d'autres termes de recherche" : "Commencez par créer un nouveau profil"}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => navigate('/create-profil')}
              sx={{ mt: 1 }}
            >
              Créer un profil
            </Button>
          </Paper>
        ) : (
          <Paper sx={{ overflowX: "auto", borderRadius: 2 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: 'background.default' }}>
                  <th style={{ fontWeight: 'bold', padding: '8px', textAlign: 'left' }}>Avatar</th>
                  <th style={{ fontWeight: 'bold', padding: '8px', textAlign: 'left' }}>Nom</th>
                  <th style={{ fontWeight: 'bold', padding: '8px', textAlign: 'left' }}>Statut</th>
                  <th style={{ fontWeight: 'bold', padding: '8px', textAlign: 'left' }}>Date de création</th>
                  <th style={{ fontWeight: 'bold', padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfils.map((profil) => (
                  <tr key={profil._id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ verticalAlign: 'bottom', padding: '8px' }}>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
                        {profil.name?.charAt(0).toUpperCase()}
                      </Avatar>
                    </td>
                    <td style={{ verticalAlign: 'bottom', padding: '8px' }}>
                      <Typography fontWeight="medium">{profil.name}</Typography>
                    </td>
                    <td style={{ verticalAlign: 'bottom', padding: '8px' }}>
                      <Chip
                        label="Actif"
                        size="small"
                        color="success"
                        variant="outlined"
                        icon={<Check fontSize="small" />}
                      />
                    </td>
                    <td style={{ verticalAlign: 'bottom', padding: '8px' }}>
                      {getDisplayDate(profil)}
                    </td>
                    <td style={{ verticalAlign: 'bottom', padding: '8px', textAlign: 'right' }}>
                      <Tooltip title="Modifier">
                        <IconButton
                          onClick={() => handleOpenEdit(profil)}
                          sx={{
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                              color: 'primary.dark'
                            }
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton
                          onClick={() => handleOpenDeleteDialog(profil._id)}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              backgroundColor: 'error.light',
                              color: 'error.dark'
                            }
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        )}

        <Dialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Edit color="primary" />
            Modifier le profil
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom"
              fullWidth
              value={profileToEdit.name}
              onChange={(e) => setProfileToEdit({ ...profileToEdit, name: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)} variant="outlined">
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} variant="contained" color="primary">
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openDeleteDialog}
          onClose={handleCloseDeleteDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Warning color="error" />
            Confirmer la suppression
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Êtes-vous sûr de vouloir supprimer ce profil ? Cette action est irréversible.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog} variant="outlined">
              Annuler
            </Button>
            <Button onClick={handleDelete} variant="contained" color="error">
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={errorMessage ? "error" : "success"}
            sx={{ width: '100%' }}
          >
            {errorMessage || successMessage}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

export default ProfileList;