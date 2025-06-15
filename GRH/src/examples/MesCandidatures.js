import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box, Typography, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Paper,
  useTheme, Select, MenuItem, TextField, IconButton, Tabs, Tab, Alert, Grid,
  FormControl, InputLabel, Avatar, Pagination, Menu, useMediaQuery
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, Work as WorkIcon, Add, Visibility as EyeIcon,
  Delete as DeleteIcon, CalendarToday as CalendarIcon, PictureAsPdf as PdfIcon,
  Videocam as VideoIcon, MoreVert as MoreVertIcon, ArrowUpward, ArrowDownward, Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/fr';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';
import { useNavigate } from 'react-router-dom';

moment.locale('fr');

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
          <Paper elevation={0} sx={{ p: 4, border: `1px dashed ${this.props.theme.palette.divider}`, borderRadius: 3 }}>
            <Typography variant="h6" color="error" gutterBottom>
              Une erreur est survenue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {this.state.error?.message || 'Veuillez réessayer plus tard.'}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{ borderRadius: 2, mt: 2 }}
              aria-label="Recharger la page"
            >
              Réessayer
            </Button>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}
ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  theme: PropTypes.object.isRequired
};

const EnhancedTableHead = ({ order, orderBy, onRequestSort, theme }) => {
  const headCells = [
    { id: 'offre.titre', label: 'Offre' },
    { id: 'offre.metier', label: 'Poste' },
    { id: 'offre.entreprise.nomEntreprise', label: 'Entreprise' },
    { id: 'datePostulation', label: 'Date' },
    { id: 'statut', label: 'Statut' },
    { id: 'actions', label: 'Actions', disableSorting: true }
  ];

  const tableHeaderStyle = {
    padding: '14px 16px',
    fontWeight: 600,
    fontSize: '0.875rem',
    textAlign: 'left',
    backgroundColor: '#00B7CF',
    color: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    cursor: 'pointer',
    '&:hover': { backgroundColor: '#0095B6' }
  };

  return (
    <thead>
      <tr>
        {headCells.map((headCell) => (
          <th
            key={headCell.id}
            style={{
              ...tableHeaderStyle,
              textAlign: headCell.id === 'actions' ? 'right' : 'left'
            }}
            onClick={() => !headCell.disableSorting && onRequestSort(headCell.id)}
          >
            <Box display="flex" alignItems="center" justifyContent={headCell.id === 'actions' ? 'flex-end' : 'flex-start'}>
              {headCell.label}
              {!headCell.disableSorting && (
                orderBy === headCell.id ? (
                  order === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                ) : null
              )}
            </Box>
          </th>
        ))}
      </tr>
    </thead>
  );
};

EnhancedTableHead.propTypes = {
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
  theme: PropTypes.object.isRequired
};

const CandidatureRow = ({ candidature, onView, onDelete, theme, isMobile, handleMenuOpen, menuAnnonceId, handleMenuClose, anchorEl }) => {
  const getStatusColor = (status) => {
    const map = {
      Acceptée: { label: 'Acceptée', color: 'success' },
      Refusée: { label: 'Refusée', color: 'error' },
      'En cours d\'évaluation': { label: 'En cours', color: 'info' },
      'En attente': { label: 'En attente', color: 'warning' }
    };
    const s = map[status] || { label: status || 'Inconnu', color: 'default' };
    return (
      <Chip
        label={s.label}
        color={s.color}
        size="small"
        variant="outlined"
        sx={{ fontSize: '0.8125rem', height: 24, '& .MuiChip-label': { px: 1.2 } }}
      />
    );
  };

  return (
    <tr style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: '#4e73df', width: 36, height: 36 }}>
            <WorkIcon fontSize="small" />
          </Avatar>
          <Typography variant="body2" fontWeight={500}>
            {candidature.offre?.titre || 'Non spécifié'}
          </Typography>
        </Box>
      </td>
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <Chip label={candidature.offre?.metier || 'Non spécifié'} size="small" variant="outlined" />
      </td>
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <Typography variant="body2">
          {candidature.offre?.entreprise?.nomEntreprise || 'Non spécifiée'}
        </Typography>
      </td>
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <Typography variant="body2">
          {candidature.datePostulation && moment(candidature.datePostulation).isValid()
            ? moment(candidature.datePostulation).format('DD MMM YYYY')
            : 'Non spécifiée'}
        </Typography>
      </td>
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        {getStatusColor(candidature.statut)}
      </td>
      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
        <IconButton
          size="small"
          onClick={(event) => handleMenuOpen(event, candidature._id)}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl) && menuAnnonceId === candidature._id}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 1,
            sx: { mt: 1, borderRadius: 2 }
          }}
        >
          <MenuItem onClick={() => { onView(candidature); handleMenuClose(); }}>
            <EyeIcon fontSize="small" sx={{ mr: 1, color: '#00B7CF' }} />
            Voir détails
          </MenuItem>
          <MenuItem onClick={() => { onDelete(candidature._id); handleMenuClose(); }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1, color: '#dc3545' }} />
            Supprimer
          </MenuItem>
          {candidature.entretien?.meet_link && candidature.entretien.statut === 'Planifié' && (
            <MenuItem onClick={() => { window.open(candidature.entretien.meet_link, '_blank'); handleMenuClose(); }}>
              <VideoIcon fontSize="small" sx={{ mr: 1, color: '#00B7CF' }} />
              Rejoindre l'entretien
            </MenuItem>
          )}
        </Menu>
      </td>
    </tr>
  );
};

CandidatureRow.propTypes = {
  candidature: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    offre: PropTypes.shape({
      titre: PropTypes.string,
      metier: PropTypes.string,
      entreprise: PropTypes.shape({
        nomEntreprise: PropTypes.string
      })
    }),
    datePostulation: PropTypes.string,
    statut: PropTypes.string.isRequired,
    entretien: PropTypes.shape({
      meet_link: PropTypes.string,
      statut: PropTypes.string
    })
  }).isRequired,
  onView: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
  isMobile: PropTypes.bool.isRequired,
  handleMenuOpen: PropTypes.func.isRequired,
  menuAnnonceId: PropTypes.string,
  handleMenuClose: PropTypes.func.isRequired,
  anchorEl: PropTypes.object
};

const MesCandidatures = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    date: ''
  });
  const [selectedCandidature, setSelectedCandidature] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, candidatureId: null, candidatureTitre: '' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuAnnonceId, setMenuAnnonceId] = useState(null);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('datePostulation');

  const tableCellStyle = {
    padding: '14px 16px',
    borderBottom: '1px solid #e0e0e0',
    verticalAlign: 'middle'
  };

  const fetchCandidatures = useCallback(async () => {
    setLoading(true);
    setError(''); // Reset error state before new request
    console.log('Fetching candidatures with params:', { page, limit, ...filters });

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage');
      setError('Aucun token d\'authentification trouvé. Veuillez vous reconnecter.');
      setLoading(false);
      return;
    }

    try {
      const params = {
        page,
        limit,
        search: filters.search || undefined,
        statut: filters.statut || undefined,
        date: filters.date || undefined
      };
      console.log('Request URL:', 'http://localhost:5000/api/candidatures/mes-candidatures');
      console.log('Request headers:', { Authorization: `Bearer ${token}` });
      console.log('Request params:', params);

      const response = await axios.get('http://localhost:5000/api/candidatures/mes-candidatures', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('API response:', response.data);

      if (!response.data) {
        throw new Error('Réponse vide du serveur');
      }

      const candidaturesData = Array.isArray(response.data.candidatures)
        ? response.data.candidatures
        : Array.isArray(response.data)
          ? response.data
          : [];
      
      setCandidatures(candidaturesData);
      setTotal(response.data.pagination?.total || candidaturesData.length || 0);
      console.log('Candidatures set:', candidaturesData);
      console.log('Total set:', response.data.pagination?.total || candidaturesData.length);
      
      if (candidaturesData.length === 0) {
        console.warn('No candidatures returned from API');
      }
    } catch (err) {
      console.error('Error fetching candidatures:', err);
      const status = err.response?.status;
      
      if (status === 404) {
        // Handle 404 by setting empty candidatures instead of an error
        setCandidatures([]);
        setTotal(0);
        console.log('No candidatures found (404), showing empty table');
      } else {
        let errorMessage = 'Erreur lors du chargement des candidatures.';
        
        if (status === 401) {
          errorMessage = 'Session expirée. Veuillez-vous reconnecter.';
          localStorage.removeItem('token'); // Clear invalid token
          navigate('/authentication/sign-in');
        } else if (status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else if (err.code === 'ERR_NETWORK') {
          errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion ou l\'état du serveur.';
        } else {
          errorMessage = err.response?.data?.message || err.message || errorMessage;
        }
        
        setError(errorMessage);
        setCandidatures([]);
      }
    } finally {
      setLoading(false);
      console.log('Fetch complete. Loading:', false);
    }
  }, [page, limit, filters, navigate]);

  useEffect(() => {
    console.log('useEffect triggered for fetchCandidatures');
    fetchCandidatures();
  }, [fetchCandidatures]);

  const handleFilterChange = (name, value) => {
    console.log(`Filter changed: ${name} = ${value}`);
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleFilterReset = () => {
    console.log('Resetting filters');
    setFilters({ search: '', statut: '', date: '' });
    setPage(1);
  };

  const handleDelete = async () => {
    console.log('Deleting candidature:', deleteDialog.candidatureId);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Aucun token d\'authentification trouvé. Veuillez vous reconnecter.');
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/candidatures/${deleteDialog.candidatureId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Candidature deleted successfully');
      setDeleteDialog({ open: false, candidatureId: null, candidatureTitre: '' });
      fetchCandidatures();
    } catch (err) {
      console.error('Error deleting candidature:', err);
      const errorMessage = err.response?.status === 401
        ? 'Session expirée. Veuillez-vous reconnecter.'
        : err.response?.data?.message || 'Erreur lors de la suppression de la candidature.';
      setError(errorMessage);
    }
  };

  const handleRequestSort = (property) => {
    console.log(`Sorting by ${property}`);
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const openDetails = (candidature) => {
    console.log('Opening details for candidature:', candidature._id);
    setSelectedCandidature(candidature);
    setOpenDialog(true);
    setTabValue(0);
  };

  const closeDetails = () => {
    console.log('Closing details dialog');
    setOpenDialog(false);
    setSelectedCandidature(null);
  };

  const handleTabChange = (e, newVal) => {
    console.log('Tab changed to:', newVal);
    setTabValue(newVal);
  };

  const handleMenuOpen = (event, candidatureId) => {
    console.log('Menu opened for candidature:', candidatureId);
    setAnchorEl(event.currentTarget);
    setMenuAnnonceId(candidatureId);
  };

  const handleMenuClose = () => {
    console.log('Menu closed');
    setAnchorEl(null);
    setMenuAnnonceId(null);
  };

  function descendingComparator(a, b, orderBy) {
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((current, key) => current && current[key], obj) || '';
    };
    const aValue = getNestedValue(a, orderBy);
    const bValue = getNestedValue(b, orderBy);
    if (bValue < aValue) return -1;
    if (bValue > aValue) return 1;
    return 0;
  }

  function getComparator(order, orderBy) {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }

  function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  }

  const renderFilters = () => (
    <Paper sx={{ mb: 3, p: 2, borderRadius: 3 }}>
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
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Statut</InputLabel>
            <Select
              value={filters.statut}
              onChange={(e) => handleFilterChange('statut', e.target.value)}
              label="Statut"
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="Acceptée">Acceptée</MenuItem>
              <MenuItem value="Refusée">Refusée</MenuItem>
              <MenuItem value="En attente">En attente</MenuItem>
              <MenuItem value="En cours d'évaluation">En cours</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Date</InputLabel>
            <Select
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              label="Date"
            >
              <MenuItem value="">Toutes</MenuItem>
              <MenuItem value="lastWeek">Dernière semaine</MenuItem>
              <MenuItem value="lastMonth">Dernier mois</MenuItem>
              <MenuItem value="lastYear">Dernière année</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            variant="outlined"
            onClick={handleFilterReset}
            startIcon={<CloseIcon />}
            sx={{ height: 56, borderRadius: 2 }}
          >
            Réinitialiser
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderDialogContent = () => {
    if (!selectedCandidature) return null;
    const c = selectedCandidature;
    return (
      <Box sx={{ p: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Offre" sx={{ textTransform: 'none', fontWeight: 500 }} />
          <Tab label="Suivi" sx={{ textTransform: 'none', fontWeight: 500 }} />
          <Tab label="Documents" sx={{ textTransform: 'none', fontWeight: 500 }} />
        </Tabs>
        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: '#00B7CF' }}>
                {c.offre?.titre || 'Non spécifié'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Entreprise:</Typography>
              <Typography variant="body1">{c.offre?.entreprise?.nomEntreprise || 'Non spécifiée'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Domaine:</Typography>
              <Typography variant="body1">{c.offre?.metier || 'Non spécifié'}</Typography>
            </Grid>
          </Grid>
        )}
        {tabValue === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: '#00B7CF' }}>
                Suivi de la candidature
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Date de dépôt:</Typography>
              <Typography variant="body1">
                {c.datePostulation && moment(c.datePostulation).isValid()
                  ? moment(c.datePostulation).format('DD MMM YYYY')
                  : 'Non spécifiée'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>État:</Typography>
              <Chip
                label={c.statut}
                color={['Acceptée', 'Refusée', 'En cours d\'évaluation', 'En attente'].includes(c.statut)
                  ? { Acceptée: 'success', Refusée: 'error', 'En cours d\'évaluation': 'info', 'En attente': 'warning' }[c.statut]
                  : 'default'}
                size="small"
                variant="outlined"
              />
            </Grid>
            {c.entretien && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Entretien:</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Statut:</Typography>
                  <Typography variant="body1">{['Planifié', 'Terminé', 'Annulé'].includes(c.entretien.statut) ? c.entretien.statut : 'Inconnu'}</Typography>
                </Grid>
                {c.entretien.resultat && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Résultat:</Typography>
                    <Typography variant="body1">{['Positif', 'Négatif', 'En attente'].includes(c.entretien.resultat) ? c.entretien.resultat : 'Inconnu'}</Typography>
                  </Grid>
                )}
                {c.entretien.date_entretien && moment(c.entretien.date_entretien).isValid() && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Date:</Typography>
                    <Typography variant="body1">{moment(c.entretien.date_entretien).format('DD MMM YYYY HH:mm')}</Typography>
                  </Grid>
                )}
                {c.entretien.meet_link && (
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<VideoIcon />}
                      href={c.entretien.meet_link}
                      target="_blank"
                      sx={{ borderRadius: 2, backgroundColor: '#00B7CF', '&:hover': { backgroundColor: '#0095B6' } }}
                      disabled={['Annulé', 'Terminé'].includes(c.entretien.statut)}
                    >
                      Rejoindre l'entretien
                    </Button>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        )}
        {tabValue === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: '#00B7CF' }}>
                Documents joints
              </Typography>
            </Grid>
            <Grid item xs={12}>
              {c.cv?.url ? (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<EyeIcon />}
                    onClick={() => window.open(`${c.cv.url}?view=true`, '_blank')}
                    sx={{ borderRadius: 2, backgroundColor: '#00B7CF', '&:hover': { backgroundColor: '#0095B6' } }}
                  >
                    Visualiser CV
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PdfIcon />}
                    href={c.cv.url}
                    download
                    sx={{ borderRadius: 2, backgroundColor: '#00B7CF', '&:hover': { backgroundColor: '#0095B6' } }}
                  >
                    Télécharger CV
                  </Button>
                </Box>
              ) : (
                <Typography variant="body1" color="text.secondary">Aucun CV disponible</Typography>
              )}
            </Grid>
            {c.videoMotivation?.url && (
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<VideoIcon />}
                  href={c.videoMotivation.url}
                  target="_blank"
                  sx={{ borderRadius: 2, backgroundColor: '#00B7CF', '&:hover': { backgroundColor: '#0095B6' } }}
                >
                  Vidéo de motivation
                </Button>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    );
  };

  return (
    <ErrorBoundary theme={theme}>
      <DashboardLayout>
        <DashboardNavbar />
        <Box py={11} sx={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
          <Box px={3} maxWidth={1200} mx="auto">
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: 'transparent', boxShadow: 'none' }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={4}
                sx={{ backgroundColor: 'white', p: 3, borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}
              >
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>Mes Candidatures</Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {renderFilters()}

              <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <EnhancedTableHead
                      order={order}
                      orderBy={orderBy}
                      onRequestSort={handleRequestSort}
                      theme={theme}
                    />
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center' }}>
                            <Typography variant="body2">Chargement en cours...</Typography>
                          </td>
                        </tr>
                      ) : candidatures.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center' }}>
                            <Typography variant="body2">Aucune candidature disponible</Typography>
                          </td>
                        </tr>
                      ) : (
                        stableSort(candidatures, getComparator(order, orderBy)).map((candidature) => (
                          <CandidatureRow
                            key={candidature._id}
                            candidature={candidature}
                            onView={openDetails}
                            onDelete={() => setDeleteDialog({ open: true, candidatureId: candidature._id, candidatureTitre: candidature.offre?.titre })}
                            theme={theme}
                            isMobile={isMobile}
                            handleMenuOpen={handleMenuOpen}
                            menuAnnonceId={menuAnnonceId}
                            handleMenuClose={handleMenuClose}
                            anchorEl={anchorEl}
                          />
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
                    onChange={(e) => { setLimit(e.target.value); setPage(1); }}
                    label="Lignes"
                  >
                    {[5, 10, 25, 50].map(opt => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
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
                  onClick={fetchCandidatures}
                  variant="contained"
                  sx={{
                    backgroundColor: '#00B7CF',
                    color: 'white',
                    '&:hover': { backgroundColor: '#0095B6' }
                  }}
                >
                  Actualiser
                </Button>
              </Box>
            </Paper>
          </Box>

          <Dialog
            open={openDialog}
            onClose={closeDetails}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
              Détails de la candidature
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>{renderDialogContent()}</DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={closeDetails} sx={{ borderRadius: 2 }}>Fermer</Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={deleteDialog.open}
            onClose={() => setDeleteDialog({ open: false, candidatureId: null, candidatureTitre: '' })}
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle sx={{ fontWeight: 600 }}>Confirmer la suppression</DialogTitle>
            <DialogContent>
              <Typography>Êtes-vous sûr de vouloir supprimer la candidature pour "{deleteDialog.candidatureTitre}" ?</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Cette action est irréversible et supprimera toutes les données associées.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setDeleteDialog({ open: false, candidatureId: null, candidatureTitre: '' })}
                sx={{ borderRadius: 2 }}
              >
                Annuler
              </Button>
              <Button onClick={handleDelete} color="error" variant="contained" sx={{ borderRadius: 2 }}>
                Supprimer
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 1 }}>
      {icon}
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  </Box>
);
DetailItem.propTypes = {
  icon: PropTypes.element,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired
};

export default MesCandidatures;