import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Box,
  Snackbar,
  Alert,
  Avatar,
  CardHeader,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import DashboardLayout from "../examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "../examples/Navbars/DashboardNavbar";

const CreateMission = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentMission, setCurrentMission] = useState({
    nom: '',
    description: '',
    dateDebut: null,
    dateFin: null,
    statut: 'À faire',
    employee: null,
    contrat: '',
  });
  const [contract, setContract] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [fetchingContract, setFetchingContract] = useState(true);

  // Extract contract ID from URL
  const queryParams = new URLSearchParams(location.search);
  const contractId = queryParams.get('contrat');

  useEffect(() => {
    if (contractId) {
      setCurrentMission(prev => ({ ...prev, contrat: contractId }));
      fetchContract();
    } else {
      setSnackbar({ open: true, message: 'Aucun contrat spécifié', severity: 'error' });
      setFetchingContract(false);
    }
  }, [contractId]);

  const fetchContract = async () => {
    try {
      setFetchingContract(true);
      const response = await fetch(`http://localhost:5000/api/contrats/${contractId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Erreur lors de la récupération du contrat');
      const data = await response.json();
      if (!data.success || !data.data) {
        throw new Error('Contrat non trouvé');
      }
      setContract(data.data);
      setCurrentMission(prev => ({
        ...prev,
        employee: data.data.user._id || data.data.user,
      }));
    } catch (error) {
      console.error('Erreur:', error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setFetchingContract(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentMission(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name, date) => {
    setCurrentMission(prev => ({ ...prev, [name]: date }));
  };

  const validateMission = () => {
    if (!currentMission.nom.trim()) {
      setSnackbar({ open: true, message: 'Le nom de la mission est obligatoire', severity: 'error' });
      return false;
    }
    if (!currentMission.dateDebut || !currentMission.dateFin) {
      setSnackbar({ open: true, message: 'Les dates sont obligatoires', severity: 'error' });
      return false;
    }
    if (new Date(currentMission.dateFin) < new Date(currentMission.dateDebut)) {
      setSnackbar({ open: true, message: 'La date de fin doit être après la date de début', severity: 'error' });
      return false;
    }
    if (!currentMission.employee) {
      setSnackbar({ open: true, message: 'Employé non défini pour le contrat', severity: 'error' });
      return false;
    }
    if (!currentMission.contrat) {
      setSnackbar({ open: true, message: 'Un contrat est requis', severity: 'error' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateMission()) return;

    setLoading(true);
    try {
      console.log('Payload sent to backend:', JSON.stringify({
        nom: currentMission.nom,
        description: currentMission.description,
        dateDebut: currentMission.dateDebut,
        dateFin: currentMission.dateFin,
        statut: currentMission.statut,
        contrat: currentMission.contrat,
        employee: currentMission.employee,
      }, null, 2));

      const response = await fetch('http://localhost:5000/api/missions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          nom: currentMission.nom,
          description: currentMission.description,
          dateDebut: currentMission.dateDebut ? new Date(currentMission.dateDebut).toISOString() : null,
          dateFin: currentMission.dateFin ? new Date(currentMission.dateFin).toISOString() : null,
          statut: currentMission.statut,
          contrat: currentMission.contrat,
          employee: currentMission.employee,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Erreur lors de la création');

      if (data.success) {
        setSnackbar({ open: true, message: 'Mission créée avec succès', severity: 'success' });
        setTimeout(() => navigate(`/ListMissions${contractId ? `?contrat=${contractId}` : ''}`), 1500);
      } else {
        throw new Error(data.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 15 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/ListMissions${contractId ? `?contrat=${contractId}` : ''}`)}
            variant="contained"
            sx={{
              mr: 2,
              backgroundColor: '#00B7CF',
              '&:hover': { backgroundColor: '#0095B6' },
            }}
          >
            Retour à la liste
          </Button>
        </Box>

        <Typography variant="h3" gutterBottom sx={{ mb: 2 }}>
          Création d'une nouvelle mission
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          Remplissez ce formulaire pour créer une nouvelle mission pour le contrat {contract?.titre || 'en cours de chargement'}.
          Les champs marqués d'un astérisque (*) sont obligatoires.
          Une fois créée, la mission sera visible dans la liste des missions.
        </Typography>

        {fetchingContract ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Chargement du contrat...
            </Typography>
          </Box>
        ) : contract ? (
          <Card>
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* Section Informations de base */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid', borderColor: '#4e73df' }}>
                    <CardHeader
                      avatar={<Avatar sx={{ bgcolor: '#4e73df' }}><InfoIcon /></Avatar>}
                      title="Informations de base"
                    />
                    <CardContent>
                      <TextField
                        fullWidth
                        label="Titre *"
                        name="nom"
                        value={currentMission.nom}
                        onChange={handleChange}
                        margin="normal"
                        required
                        error={!currentMission.nom.trim()}
                        helperText={!currentMission.nom.trim() ? 'Ce champ est obligatoire' : ''}
                      />
                      <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={currentMission.description}
                        onChange={handleChange}
                        margin="normal"
                        multiline
                        rows={4}
                      />
                      <FormControl fullWidth margin="normal" required>
                        <InputLabel>Statut *</InputLabel>
                        <Select
                          name="statut"
                          value={currentMission.statut}
                          onChange={handleChange}
                          label="Statut"
                        >
                          <MenuItem value="À faire">À faire</MenuItem>
                          <MenuItem value="En cours">En cours</MenuItem>
                          <MenuItem value="Terminée">Terminée</MenuItem>
                          <MenuItem value="Annulée">Annulée</MenuItem>
                        </Select>
                      </FormControl>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Section Dates */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid', borderColor: '#1cc88a' }}>
                    <CardHeader
                      avatar={<Avatar sx={{ bgcolor: '#1cc88a' }}><ScheduleIcon /></Avatar>}
                      title="Dates"
                    />
                    <CardContent>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          label="Date de début *"
                          value={currentMission.dateDebut}
                          onChange={(date) => handleDateChange('dateDebut', date)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              margin="normal"
                              required
                              error={!currentMission.dateDebut}
                              helperText={!currentMission.dateDebut ? 'Ce champ est obligatoire' : ''}
                            />
                          )}
                        />
                      </LocalizationProvider>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          label="Date de fin *"
                          value={currentMission.dateFin}
                          onChange={(date) => handleDateChange('dateFin', date)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              margin="normal"
                              required
                              error={!currentMission.dateFin || new Date(currentMission.dateFin) < new Date(currentMission.dateDebut)}
                              helperText={
                                !currentMission.dateFin ? 'Ce champ est obligatoire' :
                                new Date(currentMission.dateFin) < new Date(currentMission.dateDebut) ? 'La date de fin doit être après la date de début' : ''
                              }
                            />
                          )}
                          minDate={currentMission.dateDebut}
                        />
                      </LocalizationProvider>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button
                  onClick={handleSubmit}
                  startIcon={<CheckCircleIcon />}
                  variant="contained"
                  disabled={loading || fetchingContract}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    backgroundColor: '#00B7CF',
                    '&:hover': { backgroundColor: '#0095B6' },
                  }}
                >
                  {loading ? 'Création en cours...' : 'Créer la mission'}
                </Button>
              </Box>
            </Box>
          </Card>
        ) : (
          <Typography variant="h6" color="error" align="center">
            Impossible de charger le contrat. Veuillez vérifier l'identifiant du contrat.
          </Typography>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
            elevation={6}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
};

export default CreateMission;