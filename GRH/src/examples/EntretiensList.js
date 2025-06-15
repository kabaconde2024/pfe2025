import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Grid,
} from '@mui/material';
import {
  HourglassEmpty,
  CheckCircle,
  Cancel,
  Assessment,
  ThumbUp,
  ThumbDown,
  Schedule,
  Save,
  FilterList,
  Videocam,
} from '@mui/icons-material';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const StatusBadge = ({ status }) => {
  const theme = useTheme();
  const config = {
    'Planifié': { icon: <HourglassEmpty fontSize="medium" />, color: theme.palette.info.dark, label: 'Planifié' },
    'Terminé': { icon: <CheckCircle fontSize="medium" />, color: theme.palette.success.dark, label: 'Terminé' },
    'Annulé': { icon: <Cancel fontSize="medium" />, color: theme.palette.error.dark, label: 'Annulé' },
  };
  const { icon, label, color } = config[status] || {};
  return (
    <Chip
      icon={icon}
      label={label}
      sx={{
        backgroundColor: `${color}15`,
        color: color,
        fontWeight: 700,
        fontSize: 13,
        borderRadius: '8px',
        px: 1.5,
        py: 0.5,
        border: `1px solid ${color}40`,
      }}
      size="small"
      aria-label={`Statut: ${label}`}
    />
  );
};
StatusBadge.propTypes = {
  status: PropTypes.oneOf(['Planifié', 'Terminé', 'Annulé']).isRequired,
};

const ResultBadge = ({ result }) => {
  const theme = useTheme();
  const config = {
    'Positif': { icon: <ThumbUp fontSize="medium" />, color: theme.palette.success.dark, label: 'Positif' },
    'Négatif': { icon: <ThumbDown fontSize="medium" />, color: theme.palette.error.dark, label: 'Négatif' },
    'En attente': { icon: <Schedule fontSize="medium" />, color: theme.palette.warning.dark, label: 'En attente' },
  };
  const { icon, label, color } = config[result] || {};
  if (!result) return null;
  return (
    <Chip
      icon={icon}
      label={label}
      sx={{
        backgroundColor: `${color}15`,
        color: color,
        fontWeight: 700,
        fontSize: 13,
        borderRadius: '8px',
        px: 1.5,
        py: 0.5,
        border: `1px solid ${color}40`,
      }}
      size="small"
      aria-label={`Résultat: ${label}`}
    />
  );
};
ResultBadge.propTypes = {
  result: PropTypes.oneOf(['Positif', 'Négatif', 'En attente']),
};

const EntretiensList = () => {
  const theme = useTheme();
  const [entretiens, setEntretiens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [offreFilter, setOffreFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentEntretien, setCurrentEntretien] = useState(null);
  const [notes, setNotes] = useState('');
  const [resultat, setResultat] = useState('En attente');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${theme.palette.divider}`,
    fontSize: '16px',
    backgroundColor: '#fff',
    transition: 'all 0.2s ease',
    '&:hover': { borderColor: '#32e1e9', boxShadow: '0 0 0 4px rgba(50, 225, 233, 0.1)' },
    '&:focus': { outline: '2px solid #32e1e9', borderColor: '#32e1e9', boxShadow: '0 0 0 4px rgba(50, 225, 233, 0.1)' },
  };

  const textareaStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${theme.palette.divider}`,
    fontSize: '16px',
    backgroundColor: '#fff',
    minHeight: '100px',
    resize: 'vertical',
    transition: 'all 0.2s ease',
    '&:hover': { borderColor: '#32e1e9', boxShadow: '0 0 0 4px rgba(50, 225, 233, 0.1)' },
    '&:focus': { outline: '2px solid #32e1e9', borderColor: '#32e1e9', boxShadow: '0 0 0 4px rgba(50, 225, 233, 0.1)' },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/entretiens/entreprise', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sorted = res.data?.data?.sort((a, b) => new Date(a.date_entretien) - new Date(b.date_entretien));
        setEntretiens(sorted || []);
        setFiltered(sorted || []);
      } catch (err) {
        setError('Impossible de charger les entretiens');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const filteredData = entretiens.filter((e) => {
      const matchStatus = !showFilters || !statusFilter || e.statut === statusFilter;
      const matchOffre = !showFilters || !offreFilter || 
        (e.offre_id?.titre?.toLowerCase().includes(offreFilter.toLowerCase()) ||
         e.annonce_id?.titre?.toLowerCase().includes(offreFilter.toLowerCase()));
      const matchDate = !showFilters || !dateFilter || dayjs(e.date_entretien).isSame(dayjs(dateFilter), 'day');
      return matchStatus && matchOffre && matchDate;
    });
    setFiltered(filteredData);
  }, [entretiens, statusFilter, offreFilter, dateFilter, showFilters]);

  const handleUpdate = (updated) => {
    setEntretiens((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
    setFiltered((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
  };

  const handleOpenDialog = (entretien) => {
    setCurrentEntretien(entretien);
    setNotes(entretien.notes || '');
    setResultat(entretien.resultat || 'En attente');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentEntretien(null);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const updated = {
        ...currentEntretien,
        notes: notes.substring(0, 1000),
        resultat,
        statut: 'Terminé',
      };
      await axios.put(`http://localhost:5000/api/entretiens/${currentEntretien._id}`, updated, {
        headers: { Authorization: `Bearer ${token}` },
      });
      handleUpdate(updated);
      setSnackbar({ open: true, message: 'Évaluation sauvegardée', severity: 'success' });
      handleCloseDialog();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erreur lors de la sauvegarde', severity: 'error' });
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ py: 6, mt: 10 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            mb: 5,
            fontWeight: 700,
            color: theme.palette.text.primary,
            position: 'relative',
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -12,
              left: 0,
              width: 100,
              height: 4,
              background: `linear-gradient(90deg, #32e1e9, #4fc3f7)`,
              borderRadius: 2,
            },
          }}
        >
          Gestion des Entretiens
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Button
            variant="contained"
            startIcon={<FilterList />}
            onClick={() => setShowFilters((prev) => !prev)}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#32e1e9',
              color: '#ffffff',
              '&:hover': { bgcolor: '#2bc8d0' },
            }}
            aria-label={showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          >
            {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          </Button>
        </Box>

        <Collapse in={showFilters} timeout={300}>
          <Paper
            sx={{
              p: 3,
              mb: 5,
              borderRadius: '12px',
              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <label htmlFor="status-filter" className="sr-only">
                  Statut
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={inputStyle}
                  aria-label="Filtrer par statut"
                >
                  <option value="">Tous</option>
                  <option value="Planifié">Planifié</option>
                  <option value="Terminé">Terminé</option>
                  <option value="Annulé">Annulé</option>
                </select>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <label htmlFor="offre-filter" className="sr-only">
                  Offre ou Annonce
                </label>
                <input
                  id="offre-filter"
                  type="text"
                  placeholder="Rechercher par offre ou annonce"
                  value={offreFilter}
                  onChange={(e) => setOffreFilter(e.target.value)}
                  style={inputStyle}
                  aria-label="Filtrer par offre ou annonce"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <label htmlFor="date-filter" className="sr-only">
                  Date
                </label>
                <input
                  id="date-filter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={inputStyle}
                  aria-label="Filtrer par date"
                />
              </Grid>
            </Grid>
            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button
                variant="text"
                onClick={() => {
                  setStatusFilter('');
                  setOffreFilter('');
                  setDateFilter('');
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#32e1e9',
                  '&:hover': { color: '#2bc8d0' },
                }}
                aria-label="Réinitialiser les filtres"
              >
                Réinitialiser
              </Button>
            </Box>
          </Paper>
        </Collapse>

        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={10}
            sx={{ bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '12px' }}
          >
            <CircularProgress size={80} thickness={4} />
          </Box>
        ) : error ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              mt: 4,
              borderRadius: '12px',
              background: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <Typography color="error" variant="h6" gutterBottom>
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#32e1e9',
                color: '#ffffff',
                '&:hover': { bgcolor: '#2bc8d0' },
                mt: 2,
              }}
              aria-label="Réessayer"
            >
              Réessayer
            </Button>
          </Paper>
        ) : filtered.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              mt: 4,
              borderRadius: '12px',
              background: '#f8fafc',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              Aucun entretien programmé
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Essayez de modifier vos filtres ou planifiez un nouvel entretien.
            </Typography>
          </Paper>
        ) : (
          <Paper
            sx={{
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ overflowX: 'auto' }}>
              <style>
                {`
                  table { width: 100%; min-width: 800px; border-collapse: collapse; }
                  th, td { padding: 8px 16px; text-align: left; border-bottom: 1px solid ${theme.palette.divider}; }
                  thead tr { background: linear-gradient(180deg, ${theme.palette.grey[100]} 0%, ${theme.palette.grey[200]} 100%); }
                  th { font-weight: 700; font-size: 14px; }
                  tbody tr:nth-child(even) { background-color: #ffffff; }
                  tbody tr:nth-child(odd) { background-color: #f9f9f9; }
                  tbody tr:hover { background-color: ${theme.palette.grey[50]}; transition: background-color 0.2s ease; }
                `}
              </style>
              <table>
                <thead>
                  <tr>
                    <th scope="col" aria-label="Candidat" style={{ fontWeight: 700 }}>Candidat</th>
                    <th scope="col" aria-label="Poste" style={{ fontWeight: 700 }}>Poste</th>
                    <th scope="col" aria-label="Date et Heure" style={{ fontWeight: 700 }}>Date & Heure</th>
                    <th scope="col" aria-label="Statut" style={{ fontWeight: 700 }}>Statut</th>
                    <th scope="col" aria-label="Résultat" style={{ fontWeight: 700 }}>Résultat</th>
                    <th scope="col" aria-label="Action" style={{ fontWeight: 700 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entretien) => {
                    const isEvaluated = entretien.statut === 'Terminé' && entretien.resultat !== 'En attente';
                    return (
                      <tr key={entretien._id}>
                        <td style={{ padding: '8px 16px' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {entretien.candidat_id?.nom || ''}
                          </Typography>
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <Typography variant="body2">
                            {entretien.type === 'CANDIDATURE' 
                              ? (entretien.offre_id?.titre || 'Non spécifié')
                              : (entretien.annonce_id?.titre || 'Non spécifié')}
                          </Typography>
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <Typography variant="body2">
                            {dayjs(entretien.date_entretien).format('DD MMM YYYY, HH:mm')}
                          </Typography>
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          <StatusBadge status={entretien.statut} />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                          {entretien.resultat ? <ResultBadge result={entretien.resultat} /> : '-'}
                        </td>
                        <td style={{ padding: '8px 16px', display: 'flex', gap: '8px' }}>
                          {isEvaluated ? (
                            <Button
                              variant="outlined"
                              disabled
                              size="small"
                              sx={{
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 600,
                                color: '#616161',
                                borderColor: '#616161',
                                '&:hover': { bgcolor: '#f5f5f5' },
                              }}
                              aria-label="Évaluation terminée"
                            >
                              Terminée
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="contained"
                                startIcon={<Assessment />}
                                onClick={() => handleOpenDialog(entretien)}
                                size="small"
                                sx={{
                                  borderRadius: '8px',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  bgcolor: '#32e1e9',
                                  color: '#ffffff',
                                  '&:hover': { bgcolor: '#2bc8d0' },
                                }}
                                aria-label={`Compléter l'évaluation pour ${entretien.candidat_id?.prenom || 'Inconnu'} ${entretien.candidat_id?.nom || ''}`}
                              >
                                Évaluer
                              </Button>
                              {entretien.meet_link && (
                                <Button
                                  variant="contained"
                                  startIcon={<Videocam />}
                                  href={entretien.meet_link}
                                  target="_blank"
                                  size="small"
                                  sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    bgcolor: '#32e1e9',
                                    color: '#ffffff',
                                    '&:hover': { bgcolor: '#2bc8d0' },
                                  }}
                                  aria-label={`Joindre le meeting pour ${entretien.candidat_id?.prenom || 'Inconnu'} ${entretien.candidat_id?.nom || ''}`}
                                >
                                  Joindre
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </Paper>
        )}

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: 'linear-gradient(45deg, #32e1e9 30%, #4fc3f7 90%)',
              color: '#ffffff',
              p: 3,
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              Évaluation de l'entretien
            </Typography>
            <Typography variant="body2" fontSize={14} opacity={0.9} mt={0.5}>
              {currentEntretien?.candidat_id?.prenom || 'Inconnu'} {currentEntretien?.candidat_id?.nom || ''} -{' '}
              {currentEntretien?.type === 'CANDIDATURE' 
                ? (currentEntretien?.offre_id?.titre || 'Non spécifié')
                : (currentEntretien?.annonce_id?.titre || 'Non spécifié')}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <Box sx={{ mb: 3 }}>
              <label htmlFor="notes" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                Remarques (max 1000 caractères)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={textareaStyle}
                maxLength={1000}
                aria-label="Notes de l'évaluation"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {notes.length}/1000 caractères
              </Typography>
            </Box>
            <Box>
              <label htmlFor="resultat" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                Conclusion
              </label>
              <select
                id="resultat"
                value={resultat}
                onChange={(e) => setResultat(e.target.value)}
                style={inputStyle}
                aria-label="Conclusion de l'évaluation"
              >
                <option value="Positif">Candidat retenu</option>
                <option value="Négatif">Candidat non retenu</option>
                <option value="En attente">En attente</option>
              </select>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 4, py: 3 }}>
            <Button
              onClick={handleCloseDialog}
              variant="outlined"
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                color: '#616161',
                borderColor: '#616161',
                '&:hover': { bgcolor: '#f5f5f5' },
              }}
              aria-label="Annuler l'évaluation"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              startIcon={<Save />}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#32e1e9',
                color: '#ffffff',
                '&:hover': { bgcolor: '#2bc8d0' },
                px: 3,
              }}
              aria-label="Sauvegarder l'évaluation"
            >
              Sauvegarder
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

export default EntretiensList;