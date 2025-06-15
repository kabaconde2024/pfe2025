import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
  useTheme,
  Menu,
  Tooltip,
} from '@mui/material';
import {
  Visibility as EyeIcon,
  Refresh as RefreshIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  MoreVert as MoreVertIcon,
  VideoCameraBack as VideoIcon,
} from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ListCandidatures = () => {
  const theme = useTheme();
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [jobOfferFilter, setJobOfferFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState(null);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentCandidatureId, setCurrentCandidatureId] = useState(null);

  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
      flexWrap: 'wrap',
      gap: 2,
      background: theme.palette.background.paper,
      padding: 3,
      borderRadius: '16px',
      boxShadow: theme.shadows[2],
    },
    filterField: {
      minWidth: 150,
      background: theme.palette.background.default,
      borderRadius: '12px',
      '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
      },
    },
    tableContainer: {
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: theme.shadows[3],
      width: '100%',
      margin: '20px 0',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    tableHeader: {
      backgroundColor: '#32e1e9',
      color: theme.palette.primary.contrastText,
      fontWeight: 600,
    },
    tableHeaderCell: {
      padding: '16px',
      textAlign: 'left',
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    tableRow: {
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
    },
    tableCell: {
      padding: '16px',
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    actionButton: {
      borderRadius: '12px',
      textTransform: 'none',
      fontWeight: 600,
      paddingX: 3,
      paddingY: 1,
    },
    chip: {
      borderRadius: '8px',
      fontWeight: 600,
      paddingX: 1,
      paddingY: 0.5,
    },
    dialog: {
      borderRadius: '20px',
      padding: 3,
      background: theme.palette.background.paper,
      boxShadow: theme.shadows[8],
    },
    menuIcon: {
      color: theme.palette.text.secondary,
      '&:hover': {
        color: theme.palette.primary.main,
      },
    },
  };

  const gradientButtonStyle = {
    background: '#32e1e9',
    color: 'white',
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: 1,
    padding: '8px 16px',
    '&:hover': {
      background: '#28c9d1',
      boxShadow: theme.shadows[4],
    },
  };

  const countMatchingSkills = (requiredSkills, candidateSkills) => {
    if (!requiredSkills || !candidateSkills) return 0;
    const req = Array.isArray(requiredSkills) ? requiredSkills : [requiredSkills];
    const cand = Array.isArray(candidateSkills) ? candidateSkills : [candidateSkills];
    const normCand = cand.map((s) => String(s).toLowerCase().trim());
    const setCand = new Set(normCand);
    return req.reduce((count, s) => {
      const norm = String(s).toLowerCase().trim();
      return setCand.has(norm) ? count + 1 : count;
    }, 0);
  };

  useEffect(() => {
    fetchCandidatures();
  }, [statusFilter, dateFilter, jobOfferFilter]);

  const fetchCandidatures = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Non authentifié');

      const response = await axios.get(`${API_URL}/api/candidatures/public-all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          status: statusFilter,
          date: dateFilter,
          offre: jobOfferFilter,
        },
      });
      setCandidatures(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Erreur lors du chargement des candidatures.');
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (candidatureId, newStatus) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/api/candidatures/${candidatureId}/statut`,
        { statut: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('Statut mis à jour avec succès !');
      setOpenSnackbar(true);
      await fetchCandidatures();
      setOpenStatusDialog(false);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || 'Erreur lors de la mise à jour du statut.'
      );
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, candidature) => {
    setAnchorEl(event.currentTarget);
    setCurrentCandidatureId(candidature._id);
    setSelectedCandidature(candidature);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentCandidatureId(null);
  };

  const handleOpenStatusDialog = () => {
    if (!selectedCandidature || !selectedCandidature._id) {
      setErrorMessage('Candidature invalide.');
      setOpenSnackbar(true);
      return;
    }

    let warnings = [];
    let skillsMatchPercentage = 0;

    if (newStatus === 'Acceptée') {
      const requiredSkills = selectedCandidature.offre?.competencesRequises || [];
      const candidateSkills = selectedCandidature.profilCv?.competences || [];
      const matchCount = countMatchingSkills(requiredSkills, candidateSkills);
      if (requiredSkills.length > 0) {
        skillsMatchPercentage = Math.round((matchCount / requiredSkills.length) * 100);
      }
      if (matchCount < 2) {
        warnings.push('Le candidat possède moins de 2 compétences requises.');
      }
      if (!selectedCandidature.cv) {
        warnings.push('Le CV du candidat est manquant.');
      }
      if (
        !selectedCandidature.videoMotivation?.url &&
        !selectedCandidature.lettreMotivation?.url
      ) {
        warnings.push('Le document de motivation (vidéo ou lettre) du candidat est manquant.');
      }
    }

    setSelectedCandidature({ ...selectedCandidature, warnings, skillsMatchPercentage });
    setOpenStatusDialog(true);
    setNewStatus(selectedCandidature.statut);
    handleMenuClose();
  };

  const handleOpenDetailsDialog = () => {
    setOpenDetailsDialog(true);
    handleMenuClose();
  };

  const handleCloseStatusDialog = () => {
    setOpenStatusDialog(false);
    setSelectedCandidature(null);
    setNewStatus('');
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedCandidature(null);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Acceptée':
        return 'success';
      case 'Refusée':
        return 'error';
      case 'En attente':
      case "En cours d'évaluation":
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleFileOpen = async (url, fileType) => {
    try {
      await axios.head(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setErrorMessage(`Erreur lors de l'ouverture du ${fileType}.`);
      setOpenSnackbar(true);
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4, mt: 10 }}>
        {/* En-tête et filtres */}
        <Box sx={styles.header}>
          <Box>
            <Typography variant="h3" fontWeight={700} color="primary">
              Gestion des Candidatures
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consultez et gérez toutes les candidatures du système
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={toggleFilters}
            startIcon={<WorkIcon />}
            sx={gradientButtonStyle}
          >
            {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          </Button>
        </Box>

        {/* Snackbar notifications */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Chip
            label={errorMessage || successMessage}
            color={errorMessage ? 'error' : 'success'}
            onDelete={handleCloseSnackbar}
            sx={styles.chip}
          />
        </Snackbar>

        {/* Filtres */}
        {showFilters && (
          <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  displayEmpty
                  fullWidth
                  sx={styles.filterField}
                >
                  <MenuItem value="">
                    <em>Tous les statuts</em>
                  </MenuItem>
                  <MenuItem value="En attente">En attente</MenuItem>
                  <MenuItem value="Acceptée">Acceptée</MenuItem>
                  <MenuItem value="Refusée">Refusée</MenuItem>
                  <MenuItem value="En cours d'évaluation">En cours d'évaluation</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  displayEmpty
                  fullWidth
                  sx={styles.filterField}
                >
                  <MenuItem value="">
                    <em>Toutes les dates</em>
                  </MenuItem>
                  <MenuItem value="lastWeek">Dernière semaine</MenuItem>
                  <MenuItem value="lastMonth">Dernier mois</MenuItem>
                  <MenuItem value="lastYear">Dernière année</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  value={jobOfferFilter}
                  onChange={(e) => setJobOfferFilter(e.target.value)}
                  placeholder="Filtrer par offre"
                  fullWidth
                  sx={styles.filterField}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Loader */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : candidatures.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <WorkIcon sx={{ fontSize: 60, color: theme.palette.text.disabled, mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Aucune candidature disponible
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Il n'y a actuellement aucune candidature dans le système.
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchCandidatures}
              sx={gradientButtonStyle}
            >
              Rafraîchir
            </Button>
          </Paper>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}></th>
                  <th style={styles.tableHeaderCell}>Candidat</th>
                  <th style={styles.tableHeaderCell}>Offre</th>
                  <th style={styles.tableHeaderCell}>Date de candidature</th>
                  <th style={styles.tableHeaderCell}>Statut</th>
                  <th style={styles.tableHeaderCell}>Documents</th>
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidatures.map((candidature) => (
                  <React.Fragment key={candidature._id}>
                    <tr
                      style={{
                        ...styles.tableRow,
                        backgroundColor:
                          candidature._id === selectedCandidature?._id
                            ? theme.palette.action.selected
                            : 'inherit',
                      }}
                    >
                      <td style={styles.tableCell}>
                        <IconButton
                          onClick={(e) => {
                            if (candidature._id === selectedCandidature?._id) {
                              setSelectedCandidature(null);
                            } else {
                              setSelectedCandidature(candidature);
                            }
                          }}
                          size="small"
                          sx={{ marginRight: 1 }}
                        >
                          {selectedCandidature?._id === candidature._id ? '−' : '+'}
                        </IconButton>
                      </td>
                      <td style={styles.tableCell}>
                        {candidature.candidat?.nom || 'Inconnu'}
                      </td>
                      <td style={styles.tableCell}>{candidature.offre?.titre || 'Non spécifié'}</td>
                      <td style={styles.tableCell}>
                        {moment(candidature.datePostulation).format('DD/MM/YYYY HH:mm')}
                      </td>
                      <td style={styles.tableCell}>
                        <Chip
                          label={candidature.statut}
                          color={getStatusColor(candidature.statut)}
                          size="small"
                          sx={styles.chip}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        {candidature.cv ? (
                          <Tooltip title="Voir le CV">
                            <IconButton
                              onClick={() => handleFileOpen(candidature.cv.url, 'CV')}
                              color="primary"
                            >
                              <EyeIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          'Aucun CV'
                        )}
                        {candidature.videoMotivation ? (
                          <Tooltip title="Voir la vidéo de motivation">
                            <IconButton
                              onClick={() =>
                                handleFileOpen(candidature.videoMotivation.url, 'vidéo de motivation')
                              }
                              color="primary"
                            >
                              <VideoIcon />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </td>
                      <td style={styles.tableCell}>
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, candidature)}
                          sx={styles.menuIcon}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Menu pour actions */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleOpenDetailsDialog}>Voir les détails</MenuItem>
          <MenuItem onClick={handleOpenStatusDialog}>Modifier le statut</MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedCandidature?.cv) {
                handleFileOpen(selectedCandidature.cv.url, 'CV');
              }
            }}
          >
            Télécharger le CV
          </MenuItem>
        </Menu>

        {/* Dialog pour changer le statut */}
        <Dialog
          open={openStatusDialog}
          onClose={handleCloseStatusDialog}
          PaperProps={{ sx: styles.dialog }}
        >
          <DialogTitle>Modifier le statut de la candidature</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Sélectionnez le nouveau statut pour la candidature de{' '}
              <strong>{selectedCandidature?.candidat?.nom || 'Inconnu'}</strong> pour l'offre{' '}
              <strong>{selectedCandidature?.offre?.titre || 'Non spécifié'}</strong>.
            </DialogContentText>
            {newStatus === 'Acceptée' && selectedCandidature?.skillsMatchPercentage !== undefined && (
              <Typography variant="body1" sx={{ mt: 2, fontWeight: 600, color: '#0288d1' }}>
                Correspondance des compétences : {selectedCandidature.skillsMatchPercentage}%
              </Typography>
            )}
            {newStatus === 'Acceptée' && selectedCandidature?.warnings?.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3e0', borderRadius: '8px' }}>
                <Typography variant="subtitle2" color="warning.main" fontWeight={600}>
                  Avertissements :
                </Typography>
                {selectedCandidature.warnings.map((warning, index) => (
                  <Typography key={index} variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    - {warning}
                  </Typography>
                ))}
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Vous pouvez tout de même accepter cette candidature si vous le souhaitez.
                </Typography>
              </Box>
            )}
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
            >
              <MenuItem value="En attente">En attente</MenuItem>
              <MenuItem value="Acceptée">Acceptée</MenuItem>
              <MenuItem value="Refusée">Refusée</MenuItem>
              <MenuItem value="En cours d'évaluation">En cours d'évaluation</MenuItem>
            </Select>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCloseStatusDialog}
              variant="outlined"
              sx={styles.actionButton}
            >
              Annuler
            </Button>
            <Button
              onClick={() => handleStatusChange(selectedCandidature._id, newStatus)}
              variant="contained"
              sx={gradientButtonStyle}
              disabled={loading}
            >
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog détails */}
        <Dialog
          open={openDetailsDialog}
          onClose={handleCloseDetailsDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Détails de la candidature</DialogTitle>
          <DialogContent>
            {selectedCandidature && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Candidat
                    </Typography>
                    <Typography variant="body2">
                      Nom: {selectedCandidature.candidat?.nom || 'Inconnu'}
                    </Typography>
                    <Typography variant="body2">
                      Email: {selectedCandidature.candidat?.email || 'Non spécifié'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Offre
                    </Typography>
                    <Typography variant="body2">
                      Titre: {selectedCandidature.offre?.titre || 'Non spécifié'}
                    </Typography>
                    <Typography variant="body2">
                      Entreprise: {selectedCandidature.offre?.entreprise?.nomEntreprise || 'Non spécifié'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Statut
                    </Typography>
                    <Chip
                      label={selectedCandidature.statut}
                      color={getStatusColor(selectedCandidature.statut)}
                      size="small"
                      sx={styles.chip}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Dates
                    </Typography>
                    <Typography variant="body2">
                      Date de postulation:{' '}
                      {moment(selectedCandidature.datePostulation).format('DD/MM/YYYY HH:mm')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Documents
                    </Typography>
                    {selectedCandidature.cv ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">CV:</Typography>
                        <Tooltip title="Voir le CV">
                          <IconButton
                            onClick={() => handleFileOpen(selectedCandidature.cv.url, 'CV')}
                            color="primary"
                          >
                            <EyeIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography variant="body2">Aucun CV</Typography>
                    )}
                    {selectedCandidature.videoMotivation ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">Vidéo de motivation:</Typography>
                        <Tooltip title="Voir la vidéo de motivation">
                          <IconButton
                            onClick={() =>
                              handleFileOpen(selectedCandidature.videoMotivation.url, 'vidéo de motivation')
                            }
                            color="primary"
                          >
                            <VideoIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      'Aucune vidéo de motivation'
                    )}
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCloseDetailsDialog}
              variant="contained"
              sx={gradientButtonStyle}
            >
              Fermer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default ListCandidatures;