import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  DateRange as DateRangeIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  CheckCircle as ValidateIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import DashboardLayout from '../examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from '../examples/Navbars/DashboardNavbar';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminMissionValidation = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    dateDebut: '',
    dateFin: '',
  });
  const [validationDialog, setValidationDialog] = useState({
    open: false,
    missionId: null,
    missionNom: '',
    action: null, // 'validate' ou 'reject'
    participantsCount: 0, // Add to store the number of participants
  });
  const [selectedMission, setSelectedMission] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const loadMissions = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: filters.search,
        statut: filters.statut,
        dateDebut: filters.dateDebut,
        dateFin: filters.dateFin,
      };

      console.log('Fetching missions with params:', params);

      const response = await axios.get('http://localhost:5000/api/missions', {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      console.log('Response data:', response.data);

      setMissions(response.data.data || []);
      setTotal(response.data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des missions';
      console.error('Error fetching missions:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
  }, [page, limit, filters]);

  const handleValidateMission = async (missionId, action) => {
    try {
      const response = await axios.patch(
        `http://localhost:5000/api/missions/${missionId}/validate`,
        { action },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        loadMissions();
        setValidationDialog({ open: false, missionId: null, missionNom: '', action: null, participantsCount: 0 });
      } else {
        setError(response.data.message || `Erreur lors de la mise à jour du statut à ${action === 'validate' ? 'Validé' : 'En cours'}`);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || `Erreur lors de la mise à jour du statut à ${action === 'validate' ? 'Validé' : 'En cours'}`;
      setError(errorMessage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    try {
      return format(parseISO(dateString), 'dd MMM yyyy HH:mm', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const getStatusChip = (statut) => {
    const statusMap = {
      'À faire': { label: 'Planifiée', color: 'primary' },
      'En cours': { label: 'En cours', color: 'warning' },
      'Terminé': { label: 'Terminé', color: 'success' },
      'Validé': { label: 'Validé', color: 'info' },
      'Annulée': { label: 'Annulée', color: 'error' },
    };

    const status = statusMap[statut] || { label: statut || 'Inconnu', color: 'default' };
    return (
      <Chip
        label={status.label}
        color={status.color}
        size="small"
        variant="outlined"
        sx={{
          fontSize: '0.8125rem',
          height: 24,
          '& .MuiChip-label': { px: 1.2 },
        }}
      />
    );
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleViewDetails = (mission) => {
    setSelectedMission(mission);
    setViewMode(true);
  };

  const handleCloseDialog = () => {
    setSelectedMission(null);
    setViewMode(false);
    setError(null);
    setValidationDialog({ open: false, missionId: null, missionNom: '', action: null, participantsCount: 0 });
  };

  const tableHeaderStyle = {
    padding: '14px 16px',
    fontWeight: 600,
    fontSize: '0.875rem',
    textAlign: 'left',
    backgroundColor: '#00B7CF',
    color: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
  };

  const tableCellStyle = {
    padding: '14px 16px',
    borderBottom: '1px solid #e0e0e0',
    verticalAlign: 'middle',
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box py={11} sx={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <Box px={3} maxWidth={1200} mx="auto">
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: 'transparent', boxShadow: 'none' }}>
            {/* En-tête */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={4}
              sx={{ backgroundColor: 'white', p: 3, borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}
            >
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                Gestion des Missions
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/CreateMission')}
                sx={{
                  background: 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  '&:hover': { background: 'linear-gradient(45deg, #3a9bec 0%, #00d9e6 100%)' },
                  borderRadius: 2,
                }}
              >
                Nouvelle mission
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Filtres */}
            <Paper sx={{ mb: 3, p: 2, borderRadius: 3 }}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <DateRangeIcon color="action" />
                <Typography variant="h6">Filtres</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Rechercher"
                    variant="outlined"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={filters.statut}
                      onChange={(e) => handleFilterChange('statut', e.target.value)}
                      label="Statut"
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="À faire">Planifiée</MenuItem>
                      <MenuItem value="En cours">En cours</MenuItem>
                      <MenuItem value="Terminé">Terminé</MenuItem>
                      <MenuItem value="Validé">Validé</MenuItem>
                      <MenuItem value="Annulée">Annulée</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Date de début après"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateDebut}
                    onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Date de fin avant"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateFin}
                    onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Tableau */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Titre</th>
                      <th style={tableHeaderStyle}>Statut</th>
                      <th style={tableHeaderStyle}>Période</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} style={{ ...tableCellStyle, textAlign: 'center' }}>
                          <Typography variant="body2">Chargement en cours...</Typography>
                        </td>
                      </tr>
                    ) : missions.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ ...tableCellStyle, textAlign: 'center' }}>
                          <Typography variant="body2">Aucune mission disponible</Typography>
                        </td>
                      </tr>
                    ) : (
                      missions.map((mission) => (
                        <tr key={mission._id} style={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}>
                          <td style={tableCellStyle}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ bgcolor: '#4e73df', width: 36, height: 36 }}>
                                <AssignmentIcon fontSize="small" />
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>
                                {mission.nom}
                              </Typography>
                            </Box>
                          </td>
                          <td style={tableCellStyle}>{getStatusChip(mission.statut)}</td>
                          <td style={tableCellStyle}>
                            <Box display="flex" flexDirection="column">
                              <Typography variant="body2">{formatDate(mission.dateDebut)}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(mission.dateFin)}
                              </Typography>
                            </Box>
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Voir détails">
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: '#00B7CF',
                                    '&:hover': { backgroundColor: 'rgba(0, 183, 207, 0.08)' },
                                  }}
                                  onClick={() => handleViewDetails(mission)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Valider">
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: '#28a745',
                                    '&:hover': { backgroundColor: 'rgba(40,167,69,0.1)' },
                                  }}
                                  onClick={() =>
                                    setValidationDialog({
                                      open: true,
                                      missionId: mission._id,
                                      missionNom: mission.nom,
                                      action: 'validate',
                                      participantsCount: mission.participants?.length || 0,
                                    })
                                  }
                                  disabled={mission.statut === 'Validé' || mission.statut === 'Annulée'}
                                >
                                  <ValidateIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Rejeter">
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: '#dc3545',
                                    '&:hover': { backgroundColor: 'rgba(220,53,69,0.1)' },
                                  }}
                                  onClick={() =>
                                    setValidationDialog({
                                      open: true,
                                      missionId: mission._id,
                                      missionNom: mission.nom,
                                      action: 'reject',
                                      participantsCount: mission.participants?.length || 0,
                                    })
                                  }
                                  disabled={mission.statut === 'Validé' || mission.statut === 'Annulée'}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Box>
            </Paper>

            {/* Pagination */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 80 }}>
                <InputLabel>Lignes</InputLabel>
                <Select
                  value={limit}
                  onChange={(e) => {
                    setLimit(e.target.value);
                    setPage(1);
                  }}
                  label="Lignes"
                >
                  {[5, 10, 25, 50].map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Pagination
                count={Math.ceil(total / limit)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
              />

              <Button
                startIcon={<RefreshIcon />}
                onClick={loadMissions}
                variant="contained"
                sx={{
                  backgroundColor: '#00B7CF',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#0095B6',
                    boxShadow: '0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)',
                  },
                  borderRadius: 2,
                }}
              >
                Actualiser
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Dialogue de visualisation */}
      <Dialog open={viewMode} onClose={handleCloseDialog} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
          Détails de la mission
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {selectedMission && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ color: '#00B7CF' }}>
                  {selectedMission.nom}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Statut:
                </Typography>
                <Typography variant="body1">{getStatusChip(selectedMission.statut)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Date de début:
                </Typography>
                <Typography variant="body1">{formatDate(selectedMission.dateDebut)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Date de fin:
                </Typography>
                <Typography variant="body1">{formatDate(selectedMission.dateFin)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Description:
                </Typography>
                <Typography variant="body1" paragraph>
                  {selectedMission.description || 'Aucune description disponible'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Participants:
                </Typography>
                {selectedMission?.participants?.length > 0 ? (
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {selectedMission.participants.map((participant, index) => (
                      <Chip
                        key={index}
                        avatar={<Avatar>{participant.nom ? participant.nom[0] : '?'}</Avatar>}
                        label={`${participant.nom || 'Inconnu'} (${participant.poste || 'Non défini'}) - Statut: ${participant.statut || 'À faire'}`}
                        variant="outlined"
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    Aucun participant assigné
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }}>
            Fermer
          </Button>
          {selectedMission && (selectedMission.statut === 'Terminé' || selectedMission.statut === 'En cours') && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<ValidateIcon />}
                onClick={() =>
                  setValidationDialog({
                    open: true,
                    missionId: selectedMission._id,
                    missionNom: selectedMission.nom,
                    action: 'validate',
                    participantsCount: selectedMission.participants?.length || 0,
                  })
                }
                sx={{ mr: 1, borderRadius: 2 }}
              >
                Valider
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() =>
                  setValidationDialog({
                    open: true,
                    missionId: selectedMission._id,
                    missionNom: selectedMission.nom,
                    action: 'reject',
                    participantsCount: selectedMission.participants?.length || 0,
                  })
                }
                sx={{ borderRadius: 2 }}
              >
                Rejeter
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialogue de validation/rejet */}
      <Dialog
        open={validationDialog.open}
        onClose={() => setValidationDialog({ open: false, missionId: null, missionNom: '', action: null, participantsCount: 0 })}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
          Confirmer {validationDialog.action === 'validate' ? 'la validation' : 'le rejet'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography>
            Êtes-vous sûr de vouloir {validationDialog.action === 'validate' ? 'valider' : 'rejeter'} la mission "
            {validationDialog.missionNom}" ?
          </Typography>
          {validationDialog.action === 'validate' && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              {validationDialog.participantsCount === 1
                ? 'Le participant doit avoir terminé la mission pour la valider.'
                : 'Tous les participants doivent avoir terminé la mission pour la valider.'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setValidationDialog({ open: false, missionId: null, missionNom: '', action: null, participantsCount: 0 })}
            sx={{ borderRadius: 2 }}
          >
            Annuler
          </Button>
          <Button
            onClick={() => handleValidateMission(validationDialog.missionId, validationDialog.action)}
            variant="contained"
            color={validationDialog.action === 'validate' ? 'success' : 'error'}
            sx={{ borderRadius: 2 }}
          >
            {validationDialog.action === 'validate' ? 'Valider' : 'Rejeter'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminMissionValidation;