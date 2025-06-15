import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Menu,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  DateRange as DateRangeIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  CheckCircle as ValidateIcon,
  Cancel as CancelIcon,
  MoreVert as MoreVertIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import DashboardLayout from '../examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from '../examples/Navbars/DashboardNavbar';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const ListMissions = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    missionId: null,
    missionTitre: '',
  });
  const [validationDialog, setValidationDialog] = useState({
    open: false,
    missionId: null,
    missionTitre: '',
    action: null,
  });
  const [selectedMission, setSelectedMission] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuMissionId, setMenuMissionId] = useState(null);
  const [feedbackData, setFeedbackData] = useState('');
  const [contractTitle, setContractTitle] = useState(null);
  const [viewingCompteRendu, setViewingCompteRendu] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [userId, setUserId] = useState(localStorage.getItem('userId'));

  const queryParams = new URLSearchParams(location.search);
  const contractId = queryParams.get('contrat');

  const logTimestamp = () => '[2025-06-08 04:58:00 CET]';

  const fetchEntrepriseUserId = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await axios.get('http://localhost:5000/api/utilisateur/entreprise', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.id) {
        localStorage.setItem('userId', response.data.id);
        setUserId(response.data.id);
      } else {
        throw new Error('ID utilisateur non retourné');
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Erreur lors de la récupération de l\'identifiant de l\'entreprise';
      console.error(`${logTimestamp()} Erreur fetchEntrepriseUserId:`, err);
      setError(errorMessage);
    }
  };

  useEffect(() => {
    if (!userId) {
      fetchEntrepriseUserId();
    }
  }, []);

  const loadMissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentification requise');

      const params = {
        page,
        limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.statut && { statut: filters.statut }),
        ...(filters.dateDebut && { dateDebut: filters.dateDebut }),
        ...(filters.dateFin && { dateFin: filters.dateFin }),
      };

      let response;
      if (contractId) {
        params.contrat = contractId;
        response = await axios.get('http://localhost:5000/api/missions/contrat', {
          params,
          headers: { Authorization: `Bearer ${token}` },
        });

        const firstMissionWithContract = response.data?.data?.find(m => m.contrat);
        if (firstMissionWithContract?.contrat?.titre) {
          setContractTitle(firstMissionWithContract.contrat.titre);
        } else {
          const contractResponse = await axios.get(`http://localhost:5000/api/contrats/${contractId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setContractTitle(contractResponse.data?.titre || 'Contrat sans titre');
        }
      } else {
        response = await axios.get('http://localhost:5000/api/missions', {
          params,
          headers: { Authorization: `Bearer ${token}` },
        });
        setContractTitle(null);
      }

      const missionData = Array.isArray(response.data?.data)
        ? response.data.data.map((mission) => ({
            ...mission,
            titre: mission.titre || mission.nom || 'Sans titre',
            employee: mission.employee || { userId: null, nom: 'Inconnu', poste: 'Non spécifié' },
            compteRendu: mission.compteRendu || null,
            contrat: mission.contrat || null,
            compteRendu: mission.compteRendu
              ? {
                  ...mission.compteRendu,
                  feedbacks: mission.compteRendu.feedbacks || (mission.compteRendu.feedback ? [{ feedback: mission.compteRendu.feedback, feedbackDate: mission.compteRendu.feedbackDate || new Date() }] : []),
                }
              : null,
        }))
        : [];
      setMissions(missionData);
      setTotal(response.data?.pagination?.total || 0);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des missions';
      console.error(`${logTimestamp()} Erreur loadMissions:`, err);
      setError(errorMessage);
      setMissions([]);
      setTotal(0);
      setContractTitle(contractId ? 'Contrat sans titre' : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadMissions();
    }
  }, [page, limit, filters, contractId, userId]);

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/missions/${deleteDialog.missionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteDialog({ open: false, missionId: null, missionTitre: '' });
      loadMissions();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la suppression';
      console.error(`${logTimestamp()} Erreur suppression:`, err);
      setError(errorMessage);
    }
  };

  const handleValidateMission = async (missionId, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/api/missions/${missionId}/validate`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.success) {
        loadMissions();
        setValidationDialog({ open: false, missionId: null, missionTitre: '', action: null });
      } else {
        const errorMessage = response.data?.message || `Erreur lors de ${action === 'validate' ? 'validation' : 'rejet'}`;
        console.error(`${logTimestamp()} Erreur validation:`, errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Erreur lors de ${action === 'validate' ? 'validation' : 'rejet'}`;
      console.error(`${logTimestamp()} Erreur validation:`, err);
      setError(errorMessage);
    }
  };

  const handleFeedbackSubmit = async (missionId) => {
    setSubmittingFeedback(true);
    try {
      if (!feedbackData?.trim()) {
        setError('Le feedback est requis');
        return;
      }
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/missions/${missionId}/feedback`,
        { feedback: feedbackData.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.success) {
        setFeedbackData('');
        await loadMissions();
        setError(null);
        handleCloseDialog();
      } else {
        const errorMessage = response.data?.message || "Erreur lors de l'envoi du feedback";
        console.error(`${logTimestamp()} Erreur envoi feedback:`, errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Erreur lors de l'envoi du feedback";
      console.error(`${logTimestamp()} Erreur feedback:`, err);
      setError(errorMessage);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return format(date, 'dd MMM yyyy HH:mm', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const offset = date.getTime() - (date.getTimezoneOffset() * 60000);
      const adjustedDate = new Date(offset);
      return adjustedDate.toISOString().slice(0, 16);
    } catch {
      return '';
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
    return <Chip label={status.label} color={status.color} size="small" variant="outlined" sx={{ fontSize: '0.8125rem', height: 24 }} />;
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleViewDetails = (mission) => {
    setSelectedMission(mission);
    setViewMode(true);
    setEditMode(false);
    setFeedbackData('');
  };

  const handleEditMission = (mission) => {
    setSelectedMission({ ...mission });
    setEditMode(true);
    setViewMode(false);
  };

  const handleCloseDialog = () => {
    setSelectedMission(null);
    setEditMode(false);
    setViewMode(false);
    setError(null);
    setValidationDialog({ open: false, missionId: null, missionTitre: '', action: null });
    setFeedbackData('');
  };

  const handleSaveMission = async () => {
    try {
      if (!selectedMission?.titre?.trim()) {
        setError('Le titre est requis');
        return;
      }
      const dateDebut = selectedMission.dateDebut ? new Date(selectedMission.dateDebut) : null;
      const dateFin = selectedMission.dateFin ? new Date(selectedMission.dateFin) : null;
      if (dateDebut && dateFin && dateFin <= dateDebut) {
        setError('La date de fin doit être postérieure à la date de début');
        return;
      }
      const missionData = {
        titre: selectedMission.titre.trim(),
        description: selectedMission.description?.trim() || '',
        dateDebut: dateDebut ? dateDebut.toISOString() : null,
        dateFin: dateFin ? dateFin.toISOString() : null,
        statut: selectedMission.statut || 'À faire',
        tags: Array.isArray(selectedMission.tags) ? selectedMission.tags : [],
      };
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/api/missions/${selectedMission._id}`,
        missionData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.success) {
        loadMissions();
        handleCloseDialog();
      } else {
        const errorMessage = response.data?.message || 'Erreur lors de la mise à jour';
        console.error(`${logTimestamp()} Erreur mise à jour mission:`, errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la mise à jour de la mission';
      console.error(`${logTimestamp()} Erreur mise à jour mission:`, err);
      setError(errorMessage);
    }
  };

  const handleViewCompteRendu = async (missionId) => {
    setViewingCompteRendu(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/missions/${missionId}/compte-rendu`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
        responseType: 'blob',
      });

      if (response.status === 200 && response.headers['content-type'] === 'application/pdf') {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      } else {
        throw new Error('Réponse inattendue du serveur');
      }
    } catch (err) {
      let errorMessage = "Impossible d'afficher le compte rendu";
      if (err.response) {
        try {
          const text = await err.response?.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch {
          errorMessage = err.response.data?.message || errorMessage;
        }
      }
      console.error(`${logTimestamp()} Erreur viewCompteRendu:`, err);
      setError(errorMessage);
    } finally {
      setViewingCompteRendu(false);
    }
  };

  const handleCompteRenduUpload = async (missionId, file) => {
    try {
      if (!file) {
        setError('Aucun fichier sélectionné');
        return;
      }
      const formData = new FormData();
      formData.append('compteRendu', file);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/missions/${missionId}/compte-rendu`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      if (response.data?.success) {
        loadMissions();
        handleCloseDialog();
      } else {
        const errorMessage = response.data?.message || "Erreur lors de l'upload du compte rendu";
        console.error(`${logTimestamp()} Erreur upload compte rendu:`, errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Erreur lors de l'upload du compte rendu";
      console.error(`${logTimestamp()} Erreur upload compte rendu:`, err);
      setError(errorMessage);
    }
  };

  const handleMenuOpen = (event, missionId) => {
    setAnchorEl(event.currentTarget);
    setMenuMissionId(missionId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuMissionId(null);
  };

  const isEntrepriseUser = (mission) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return false;
    const entrepriseId = mission?.contrat?.entreprise?._id?.toString() || mission?.contrat?.entreprise?.userId?.toString() || mission?.contrat?.entreprise?.toString();
    return entrepriseId === userId;
  };

  const canProvideFeedback = (mission) => {
    const hasCompteRendu = !!mission?.compteRendu?.fileId;
    const isEntreprise = isEntrepriseUser(mission);
    const isTermine = mission?.statut === 'Terminé';
    return hasCompteRendu && isEntreprise && isTermine;
  };

  const tableHeaderStyle = {
    padding: '14px 16px',
    fontWeight: 600,
    fontSize: '0.875rem',
    textAlign: 'left',
    backgroundColor: '#00B7CF',
    color: '#ffffff',
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
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: 'transparent' }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={4}
              sx={{ backgroundColor: 'white', p: 3, borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  Liste des missions
                </Typography>
                {contractTitle && (
                  <Typography variant="subtitle1" color="text.secondary">
                    Contrat: {contractTitle}
                  </Typography>
                )}
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(`/CreateMission${contractId ? `?contrat=${contractId}` : ''}`)}
                sx={{
                  background: 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
                  '&:hover': { background: 'linear-gradient(45deg, #3a9bec 0%, #00d9e6 100%)' },
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
                          <CircularProgress size={40} />
                          <Typography variant="body2" sx={{ mt: 2 }}>
                            Chargement des missions...
                          </Typography>
                        </td>
                      </tr>
                    ) : missions.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ ...tableCellStyle, textAlign: 'center' }}>
                          <Typography variant="body2">
                            Aucune mission trouvée pour ce contrat ({contractTitle || 'ID: ' + contractId}).
                          </Typography>
                        </td>
                      </tr>
                    ) : (
                      missions.map((mission) => (
                        <tr key={mission._id}>
                          <td style={tableCellStyle}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ bgcolor: '#4e73df', width: 36, height: 36 }}>
                                <AssignmentIcon fontSize="small" />
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>
                                {mission.titre}
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
                            <IconButton size="small" onClick={(event) => handleMenuOpen(event, mission._id)}>
                              <MoreVertIcon />
                            </IconButton>
                            <Menu
                              anchorEl={anchorEl}
                              open={Boolean(anchorEl) && menuMissionId === mission._id}
                              onClose={handleMenuClose}
                              PaperProps={{ sx: { mt: 1, borderRadius: 2 } }}
                            >
                              <MenuItem onClick={() => { handleViewDetails(mission); handleMenuClose(); }}>
                                <VisibilityIcon fontSize="small" sx={{ mr: 1, color: '#00B7CF' }} />
                                Voir détails
                              </MenuItem>
                              <MenuItem onClick={() => { handleEditMission(mission); handleMenuClose(); }}>
                                <EditIcon fontSize="small" sx={{ mr: 1, color: '#666' }} />
                                Modifier
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  setValidationDialog({
                                    open: true,
                                    missionId: mission._id,
                                    missionTitre: mission.titre,
                                    action: 'validate',
                                  });
                                  handleMenuClose();
                                }}
                                disabled={mission.statut === 'Validé' || mission.statut === 'Annulée'}
                              >
                                <ValidateIcon fontSize="small" sx={{ mr: 1, color: '#28a745' }} />
                                Valider
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  setValidationDialog({
                                    open: true,
                                    missionId: mission._id,
                                    missionTitre: mission.titre,
                                    action: 'reject',
                                  });
                                  handleMenuClose();
                                }}
                                disabled={mission.statut === 'Validé' || mission.statut === 'Annulée'}
                              >
                                <CancelIcon fontSize="small" sx={{ mr: 1, color: '#dc3545' }} />
                                Rejeter
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  setDeleteDialog({
                                    open: true,
                                    missionId: mission._id,
                                    missionTitre: mission.titre,
                                  });
                                  handleMenuClose();
                                }}
                              >
                                <DeleteIcon fontSize="small" sx={{ mr: 1, color: '#dc3545' }} />
                                Supprimer
                              </MenuItem>
                            </Menu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Box>
            </Paper>

            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 80 }}>
                <InputLabel>Lignes</InputLabel>
                <Select
                  value={limit}
                  label="Lignes"
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
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
                  '&:hover': { backgroundColor: '#0095B6' },
                }}
                disabled={loading}
              >
                Actualiser
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>

      <Dialog open={viewMode} onClose={handleCloseDialog} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
          Détails de la mission
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {selectedMission ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ color: '#00B7CF' }}>
                  {selectedMission.titre}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Statut:</Typography>
                {getStatusChip(selectedMission.statut)}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Date de début:</Typography>
                <Typography variant="body2">{formatDate(selectedMission.dateDebut)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Date de fin:</Typography>
                <Typography variant="body2">{formatDate(selectedMission.dateFin)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Description:</Typography>
                <Typography variant="body2">{selectedMission.description || 'Aucune description'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Employé:</Typography>
                {selectedMission?.employee?.nom ? (
                  <Chip
                    avatar={<Avatar>{selectedMission.employee.nom[0]}</Avatar>}
                    label={`${selectedMission.employee.nom} (${selectedMission.employee.poste || 'Non spécifié'})`}
                    variant="outlined"
                    sx={{ m: 0.5 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Aucun employé assigné
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Compte rendu:</Typography>
                {selectedMission?.compteRendu?.fileId ? (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body2">
                        Soumis le: {formatDate(selectedMission.compteRendu.dateSoumission)}
                      </Typography>
                      <Tooltip title="Visualiser le compte rendu">
                        <span>
                          <IconButton
                            color="primary"
                            onClick={() => handleViewCompteRendu(selectedMission._id)}
                            disabled={viewingCompteRendu}
                          >
                            {viewingCompteRendu ? <CircularProgress size={24} /> : <VisibilityIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>Feedbacks:</Typography>
                    {selectedMission?.compteRendu?.feedbacks?.length > 0 ? (
                      <Box sx={{ mb: 2, maxHeight: 200, overflowY: 'auto', border: '1px solid #e0e0e0', p: 2 }}>
                        {selectedMission.compteRendu.feedbacks.map((fb, index) => (
                          <Box
                            key={index}
                            sx={{
                              mb: 1,
                              pb: index < selectedMission.compteRendu.feedbacks.length - 1 ? 1 : 0,
                              borderBottom:
                                index < selectedMission.compteRendu.feedbacks.length - 1 ? '1px solid #e0e0e0' : 'none',
                            }}
                          >
                            <Typography variant="body2">{fb.feedback}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Ajouté le: {formatDate(fb.feedbackDate)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Aucun feedback pour le moment
                      </Typography>
                    )}
                    {canProvideFeedback(selectedMission) ? (
                      <Box sx={{ mt: 2 }}>
                        <TextField
                          fullWidth
                          label="Ajouter un feedback"
                          multiline
                          rows={3}
                          value={feedbackData}
                          onChange={(e) => setFeedbackData(e.target.value)}
                          sx={{ mb: 1 }}
                          disabled={submittingFeedback}
                        />
                        <Button
                          variant="contained"
                          startIcon={submittingFeedback ? <CircularProgress size={16} color="inherit" /> : <FeedbackIcon />}
                          onClick={() => handleFeedbackSubmit(selectedMission._id)}
                          disabled={!feedbackData?.trim() || submittingFeedback}
                          sx={{ backgroundColor: '#00B7CF', '&:hover': { backgroundColor: '#0095B6' } }}
                        >
                          Ajouter Feedback
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Feedback non disponible :{' '}
                        {selectedMission?.statut !== 'Terminé'
                          ? 'La mission doit être terminée.'
                          : !selectedMission?.compteRendu?.fileId
                          ? 'Aucun compte rendu soumis.'
                          : !isEntrepriseUser(selectedMission)
                          ? 'Vous n\'êtes pas autorisé à ajouter un feedback.'
                          : 'Raison inconnue.'}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Aucun compte rendu soumis
                  </Typography>
                )}
              </Grid>
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune mission sélectionnée
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>Fermer</Button>
          {selectedMission && ['Terminé', 'En cours'].includes(selectedMission.statut) && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<ValidateIcon />}
                onClick={() =>
                  setValidationDialog({
                    open: true,
                    missionId: selectedMission._id,
                    missionTitre: selectedMission.titre,
                    action: 'validate',
                  })
                }
                disabled={!selectedMission}
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
                    missionTitre: selectedMission.titre,
                    action: 'reject',
                  })
                }
                disabled={!selectedMission}
              >
                Rejeter
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={editMode} onClose={handleCloseDialog} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
          Modifier la mission
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {selectedMission ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Titre de la mission"
                  value={selectedMission?.titre || ''}
                  onChange={(e) => setSelectedMission({ ...selectedMission, titre: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={selectedMission?.statut || ''}
                    onChange={(e) => setSelectedMission({ ...selectedMission, statut: e.target.value })}
                    label="Statut"
                  >
                    <MenuItem value="À faire">Planifiée</MenuItem>
                    <MenuItem value="En cours">En cours</MenuItem>
                    <MenuItem value="Terminé">Terminé</MenuItem>
                    <MenuItem value="Annulée">Annulée</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date de début"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={formatDateForInput(selectedMission.dateDebut)}
                  onChange={(e) => setSelectedMission({ ...selectedMission, dateDebut: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date de fin"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={formatDateForInput(selectedMission.dateFin)}
                  onChange={(e) => setSelectedMission({ ...selectedMission, dateFin: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Employé:
                </Typography>
                {selectedMission?.employee?.nom ? (
                  <Chip
                    avatar={<Avatar>{selectedMission.employee.nom[0]}</Avatar>}
                    label={`${selectedMission.employee.nom} (${selectedMission.employee.poste || 'Non spécifié'})`}
                    variant="outlined"
                    sx={{ m: 0.5 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Aucun employé assigné
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Compte rendu:
                </Typography>
                {selectedMission?.employee?.userId === localStorage.getItem('userId') && (
                  <Box sx={{ mb: 2 }}>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleCompteRenduUpload(selectedMission._id, e.target.files[0])}
                      disabled={selectedMission?.statut !== 'Terminé'}
                    />
                    {selectedMission?.compteRendu?.filename && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Compte rendu actuel: {selectedMission.compteRendu.filename}
                      </Typography>
                    )}
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={4}
                  value={selectedMission?.description || ''}
                  onChange={(e) => setSelectedMission({ ...selectedMission, description: e.target.value })}
                />
              </Grid>
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucune mission sélectionnée
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button
            onClick={handleSaveMission}
            variant="contained"
            sx={{ backgroundColor: '#00B7CF', '&:hover': { backgroundColor: '#0095B6' } }}
            disabled={!selectedMission}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, missionId: null, missionTitre: '' })}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir supprimer la mission "{deleteDialog.missionTitre}" ?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, missionId: null, missionTitre: '' })}>
            Annuler
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={validationDialog.open}
        onClose={() => setValidationDialog({ open: false, missionId: null, missionTitre: '', action: null })}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
          Confirmer {validationDialog.action === 'validate' ? 'la validation' : 'le rejet'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography>
            Êtes-vous sûr de vouloir {validationDialog.action === 'validate' ? 'valider' : 'rejeter'} la mission "
            {validationDialog.missionTitre}" ?
          </Typography>
          {validationDialog.action === 'validate' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              L'employé doit avoir terminé la mission.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setValidationDialog({ open: false, missionId: null, missionTitre: '', action: null })}>
            Annuler
          </Button>
          <Button
            onClick={() => handleValidateMission(validationDialog.missionId, validationDialog.action)}
            variant="contained"
            color={validationDialog.action === 'validate' ? 'success' : 'error'}
          >
            {validationDialog.action === 'validate' ? 'Valider' : 'Rejeter'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default ListMissions;