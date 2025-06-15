import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  InputAdornment,
  Button,
  LinearProgress,
  Checkbox,
  TableContainer
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

import DashboardLayout from '../examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from '../examples/Navbars/DashboardNavbar';

const MesFormations = () => {
  const [formations, setFormations] = useState([]);
  const [filteredFormations, setFilteredFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ modalite: '', statut: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [progressions, setProgressions] = useState({}); // Stocke les progressions par formation

  // Fetch formations for the authenticated employee
  const fetchFormations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/formation/mes-formations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = response.data?.data || [];
      setFormations(data);
      setFilteredFormations(data);

      // Récupérer les progressions pour chaque formation de type contenu
      const progressPromises = data
        .filter((formation) => formation.modalite === 'contenu')
        .map((formation) =>
          axios.get(`http://localhost:5000/api/formation/${formation._id}/progression`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          })
        );
      const progressResponses = await Promise.all(progressPromises);
      const progressData = progressResponses.reduce((acc, response, index) => {
        const formationId = data.filter((f) => f.modalite === 'contenu')[index]?._id;
        if (formationId) acc[formationId] = response.data.data || [];
        return acc;
      }, {});
      setProgressions(progressData);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des formations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormations();
  }, []);

  // Appliquer les filtres et la recherche
  const applyFilters = useCallback(() => {
    let result = [...formations];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (formation) =>
          formation.titre?.toLowerCase().includes(term) ||
          formation.description?.toLowerCase().includes(term)
      );
    }
    if (filters.modalite) result = result.filter((formation) => formation.modalite === filters.modalite);
    if (filters.statut) result = result.filter((formation) => formation.statut === filters.statut);
    setFilteredFormations(result);
  }, [formations, searchTerm, filters]);

  useEffect(() => {
    applyFilters();
  }, [formations, searchTerm, filters, applyFilters]);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ modalite: '', statut: '' });
  };

  const handleOpenDetails = async (formation) => {
    setSelectedFormation(formation);
    setOpenDialog(true);
    setError(null);

    // Récupérer la progression si non chargée pour cette formation
    if (formation.modalite === 'contenu' && !progressions[formation._id]) {
      try {
        const response = await axios.get(`http://localhost:5000/api/formation/${formation._id}/progression`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setProgressions((prev) => ({
          ...prev,
          [formation._id]: response.data.data || [],
        }));
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur lors du chargement de la progression');
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFormation(null);
    setError(null);
  };

  const handleProgressChange = async (formationId, contenuId, completed) => {
    try {
      const response = await axios.post(
        `http://localhost:5000/api/formation/${formationId}/progression`,
        { contenuId, completed },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      // Mettre à jour la progression localement
      setProgressions((prev) => {
        const updatedProgress = prev[formationId].map((contenu) =>
          contenu._id === contenuId ? { ...contenu, completed, completedAt: completed ? new Date() : null } : contenu
        );
        return { ...prev, [formationId]: updatedProgress };
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour de la progression');
    }
  };

  const renderProgressBar = (formation) => {
    if (formation.modalite !== 'contenu' || !progressions[formation._id]) return null;
    const contenusProgress = progressions[formation._id];
    const total = contenusProgress.length;
    const completed = contenusProgress.filter((c) => c.completed).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption">Progression</Typography>
        <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
        <Typography variant="caption">{`${completed}/${total} contenus complétés (${Math.round(progress)}%)`}</Typography>
      </Box>
    );
  };

  const renderStatutChip = useCallback((statut) => {
    const colorMap = {
      brouillon: 'default',
      planifie: 'primary',
      'en-cours': 'warning',
      termine: 'success',
      annule: 'error',
    };
    return (
      <Chip
        label={statut}
        color={colorMap[statut] || 'default'}
        size="small"
        sx={{ textTransform: 'capitalize' }}
      />
    );
  }, []);

  const renderModaliteChip = useCallback((modalite) => (
    <Chip
      label={modalite}
      variant="outlined"
      size="small"
      sx={{ textTransform: 'capitalize' }}
    />
  ), []);

  const renderContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      );
    }

    return (
      <>
        {/* En-tête */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, rgb(174, 202, 206) 0%, rgb(160, 166, 166))',
            p: 4,
            borderRadius: 3,
            mb: 4,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, color: 'black', mb: 1 }}>
            Mes Formations
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Consultez les formations qui vous sont assignées
          </Typography>
        </Box>

        {/* Barre de recherche et filtres */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Rechercher par titre ou description..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setSearchTerm('')} size="small">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                whiteSpace: 'nowrap',
                background: showFilters
                  ? 'linear-gradient(45deg, rgb(0, 172, 193) 0%, rgb(6, 222, 246))'
                  : 'linear-gradient(45deg, rgb(1, 217, 250) 0%, rgb(5, 204, 249))',
                '&:hover': {
                  background: 'linear-gradient(45deg, rgb(0, 172, 193) 0%, rgb(6, 222, 246))',
                },
              }}
            >
              Filtres
            </Button>
            {(searchTerm || filters.modalite || filters.statut) && (
              <Button
                variant="text"
                startIcon={<ClearIcon />}
                onClick={resetFilters}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Réinitialiser
              </Button>
            )}
          </Box>

          {showFilters && (
            <Box mt={2} display="flex" gap={2} flexWrap="wrap">
              <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                <InputLabel>Modalité</InputLabel>
                <Select
                  value={filters.modalite}
                  onChange={(e) => handleFilterChange('modalite', e.target.value)}
                  label="Modalité"
                >
                  <MenuItem value="">Toutes</MenuItem>
                  <MenuItem value="presentiel">Présentiel</MenuItem>
                  <MenuItem value="virtuel">Virtuel</MenuItem>
                  <MenuItem value="hybride">Hybride</MenuItem>
                  <MenuItem value="contenu">Contenu</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.statut}
                  onChange={(e) => handleFilterChange('statut', e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="brouillon">Brouillon</MenuItem>
                  <MenuItem value="planifie">Planifié</MenuItem>
                  <MenuItem value="en-cours">En cours</MenuItem>
                  <MenuItem value="termine">Terminé</MenuItem>
                  <MenuItem value="annule">Annulé</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </Paper>

        {/* Nombre de formations trouvées */}
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {filteredFormations.length} formation(s) trouvée(s)
        </Typography>

        {/* Liste des formations */}
        <Grid container spacing={3}>
          {filteredFormations.map((formation) => (
            <Grid item xs={12} sm={6} md={4} key={formation._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="p" sx={{ fontWeight: 600 }}>
                    {formation.titre}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {formation.description
                      ? formation.description.substring(0, 100) + (formation.description.length > 100 ? '...' : '')
                      : 'Aucune description'}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Modalité
                      </Typography>
                      {renderModaliteChip(formation.modalite)}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Statut
                      </Typography>
                      {renderStatutChip(formation.statut)}
                    </Grid>
                    {formation.modalite === 'presentiel' && (
                      <>
                        <Grid item xs={6}>
                          <Typography variant="caption" display="block" color="text.secondary">
                            Début
                          </Typography>
                          <Typography variant="body2">
                            {formation.horaire?.debut
                              ? new Date(formation.horaire.debut).toLocaleDateString('fr-FR')
                              : '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" display="block" color="text.secondary">
                            Fin
                          </Typography>
                          <Typography variant="body2">
                            {formation.horaire?.fin
                              ? new Date(formation.horaire.fin).toLocaleDateString('fr-FR')
                              : '-'}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    {['virtuel', 'hybride'].includes(formation.modalite) && (
                      <Grid item xs={12}>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Date
                        </Typography>
                        <Typography variant="body2">
                          {formation.horaire?.date
                            ? new Date(formation.horaire.date).toLocaleString('fr-FR')
                            : '-'}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                  {renderProgressBar(formation)}
                </CardContent>
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    background: 'rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleOpenDetails(formation)}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 1,
                      background: 'linear-gradient(45deg, rgb(1, 217, 250) 0%, rgb(5, 204, 249))',
                      '&:hover': {
                        background: 'linear-gradient(45deg, rgb(0, 172, 193) 0%, rgb(12, 224, 247))',
                      },
                    }}
                  >
                    Voir détails
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredFormations.length === 0 && (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgb(168, 229, 231) 0%, rgb(153, 208, 219))',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Aucune formation assignée
            </Typography>
          </Paper>
        )}

        {/* Détails de la formation */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          scroll="paper"
          PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
        >
          <DialogTitle
            sx={{
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)',
              py: 3,
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Détails de la formation
              </Typography>
              <IconButton onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
                <CloseIcon />
              </IconButton>
            </Box>
            {selectedFormation && (
              <Typography variant="subtitle1" sx={{ mt: 1 }}>
                {selectedFormation.titre}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent dividers sx={{ background: '#f9fafc', p: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {selectedFormation && (
              <Box>
                {/* Détails principaux */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      {selectedFormation.titre}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedFormation.description || 'Aucune description'}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Modalité</Typography>
                        {renderModaliteChip(selectedFormation.modalite)}
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Statut</Typography>
                        {renderStatutChip(selectedFormation.statut)}
                      </Grid>
                      {selectedFormation.modalite === 'presentiel' && (
                        <>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2">Début</Typography>
                            <Typography variant="body2">
                              {selectedFormation?.horaire?.debut
                                ? new Date(selectedFormation.horaire.debut).toLocaleString('fr-FR')
                                : '-'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2">Fin</Typography>
                            <Typography variant="body2">
                              {selectedFormation?.horaire?.fin
                                ? new Date(selectedFormation.horaire.fin).toLocaleString('fr-FR')
                                : '-'}
                            </Typography>
                          </Grid>
                        </>
                      )}
                      {['virtuel', 'hybride'].includes(selectedFormation.modalite) && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2">Date</Typography>
                          <Typography variant="body2">
                            {selectedFormation?.horaire?.date
                              ? new Date(selectedFormation.horaire.date).toLocaleString('fr-FR')
                              : '-'}
                          </Typography>
                        </Grid>
                      )}
                      {['presentiel', 'hybride'].includes(selectedFormation.modalite) && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2">Lieu</Typography>
                          <Typography variant="body2">
                            {selectedFormation.lieu || '-'}
                          </Typography>
                        </Grid>
                      )}
                      {['virtuel', 'hybride'].includes(selectedFormation.modalite) && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2">Lien Google Meet</Typography>
                          <Typography variant="body2">
                            {selectedFormation.meetLink ? (
                              <a
                                href={selectedFormation.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1976d2', textDecoration: 'none' }}
                              >
                                {selectedFormation.meetLink}
                              </a>
                            ) : (
                              '-'
                            )}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Mission</Typography>
                        <Typography variant="body2">
                          {selectedFormation?.mission?.titre || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Formateur</Typography>
                        <Typography variant="body2">
                          {selectedFormation?.formateur?.nom || '-'} (
                          {selectedFormation?.formateur?.email || '-'}
                          )
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Type de formation</Typography>
                        <Typography variant="body2">
                          {selectedFormation.typeFormation
                            ? selectedFormation.typeFormation.charAt(0).toUpperCase() +
                              selectedFormation.typeFormation.slice(1)
                            : '-'}
                        </Typography>
                      </Grid>
                      {(selectedFormation.modalite === 'contenu' || (selectedFormation.contenus && selectedFormation.contenus.length > 0)) && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            Contenus pédagogiques
                          </Typography>
                          {selectedFormation.modalite === 'contenu' && renderProgressBar(selectedFormation)}
                          <TableContainer sx={{ maxHeight: 300, overflow: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={{ fontWeight: 600, backgroundColor: '#f5f5f5', padding: '8px', borderBottom: '1px solid #ddd' }}>Complété</th>
                                  <th style={{ fontWeight: 600, backgroundColor: '#f5f5f5', padding: '8px', borderBottom: '1px solid #ddd' }}>Type</th>
                                  <th style={{ fontWeight: 600, backgroundColor: '#f5f5f5', padding: '8px', borderBottom: '1px solid #ddd' }}>URL</th>
                                  <th style={{ fontWeight: 600, backgroundColor: '#f5f5f5', padding: '8px', borderBottom: '1px solid #ddd' }}>Date de complétion</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(progressions[selectedFormation._id] || selectedFormation.contenus || []).map((contenu, index) => (
                                  <tr key={contenu._id || index} style={{ borderBottom: '1px solid #ddd' }}>
                                    <td style={{ padding: '8px' }}>
                                      {selectedFormation.modalite === 'contenu' && (
                                        <Checkbox
                                          checked={contenu.completed || false}
                                          onChange={(e) =>
                                            handleProgressChange(selectedFormation._id, contenu._id, e.target.checked)
                                          }
                                          disabled={selectedFormation.statut === 'termine' || selectedFormation.statut === 'annule'}
                                        />
                                      )}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      {contenu.typeContenu
                                        ? contenu.typeContenu.charAt(0).toUpperCase() + contenu.typeContenu.slice(1)
                                        : '-'}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      <a
                                        href={contenu.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: '#1976d2',
                                          textDecoration: 'none',
                                          display: 'inline-block',
                                          maxWidth: 200,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                        title={contenu.url}
                                      >
                                        {contenu.url}
                                      </a>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      {contenu.completedAt
                                        ? new Date(contenu.completedAt).toLocaleString('fr-FR')
                                        : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </TableContainer>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
                <DialogActions sx={{ mt: 3, px: 0, justifyContent: 'flex-end' }}>
                  <Button
                    onClick={handleCloseDialog}
                    variant="contained"
                    sx={{
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, rgb(1, 217, 250) 0%, rgb(5, 204, 249))',
                      '&:hover': {
                        background: 'linear-gradient(45deg, rgb(0, 172, 193) 0%, rgb(6, 222, 246))',
                      },
                    }}
                  >
                    Fermer
                  </Button>
                </DialogActions>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ py: 8, mt: 5 }}>
        {renderContent()}
      </Container>
    </DashboardLayout>
  );
};

export default MesFormations;