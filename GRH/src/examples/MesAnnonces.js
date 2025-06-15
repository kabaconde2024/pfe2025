import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Box, Avatar, Typography, Button, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, IconButton, Paper, TextField, FormControl, InputLabel, Select, MenuItem, Pagination, Menu,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, Work, Add, Visibility, Edit, Delete, Publish,
  VisibilityOff, VideoCall, MoreVert as MoreVertIcon, ArrowUpward, ArrowDownward
} from '@mui/icons-material';
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

dayjs.extend(relativeTime);

const MesAnnonces = () => {
  const navigate = useNavigate();
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    metier: ''
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, annonceId: null, annonceTitre: '' });
  const [publishDialog, setPublishDialog] = useState({ open: false, annonceId: null, annonceTitre: '', action: null });
  const [selectedAnnonce, setSelectedAnnonce] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editData, setEditData] = useState({
    titre: '',
    description: '',
    typeContrat: '',
    localisation: '',
    competencesRequises: [],
    salaireSouhaite: '',
    metier: '',
    status: 'en attente',
    competenceInput: ''
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuAnnonceId, setMenuAnnonceId] = useState(null);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('titre');

  const loadAnnonces = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: filters.search,
        statut: filters.statut,
        metier: filters.metier,
        sort: orderBy,
        order
      };
      const response = await axios.get('http://localhost:5000/api/annonces/mes-annonces', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAnnonces(response.data.annonces || []);
      setTotal(response.data.pagination?.total || response.data.annonces?.length || 0);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des annonces';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnonces();
  }, [page, limit, filters, order, orderBy]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/annonces/${deleteDialog.annonceId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDeleteDialog({ open: false, annonceId: null, annonceTitre: '' });
      loadAnnonces();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleTogglePublish = async (annonceId, action) => {
    try {
      await axios.put(
        `http://localhost:5000/api/annonces/${annonceId}/toggle-publish`,
        { status: action === 'publish' ? 'publié' : 'en attente' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      loadAnnonces();
      setPublishDialog({ open: false, annonceId: null, annonceTitre: '', action: null });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la modification du statut');
    }
  };

  const handleEditAnnonce = (annonce) => {
    setSelectedAnnonce(JSON.parse(JSON.stringify(annonce)));
    setEditData({
      titre: annonce.titre,
      description: annonce.description,
      typeContrat: annonce.typeContrat || '',
      localisation: annonce.localisation,
      competencesRequises: [...(annonce.competencesRequises || [])],
      salaireSouhaite: annonce.salaireSouhaite || '',
      metier: annonce.metier || '',
      status: annonce.status,
      competenceInput: ''
    });
    setEditMode(true);
    setViewMode(false);
  };

  const handleSaveAnnonce = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/annonces/${selectedAnnonce._id}`,
        {
          ...editData,
          competenceInput: undefined
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      loadAnnonces();
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleViewDetails = (annonce) => {
    setSelectedAnnonce(annonce);
    setViewMode(true);
    setEditMode(false);
  };

  const handleCloseDialog = () => {
    setSelectedAnnonce(null);
    setEditMode(false);
    setViewMode(false);
    setError(null);
    setEditData(prev => ({ ...prev, competenceInput: '' }));
  };

  const handleMenuOpen = (event, annonceId) => {
    setAnchorEl(event.currentTarget);
    setMenuAnnonceId(annonceId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuAnnonceId(null);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const formatSalaire = (salaire) => {
    return salaire ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(salaire) : 'Non spécifié';
  };

  const formatDate = (dateString) => {
    return dateString ? dayjs(dateString).format('DD MMM YYYY HH:mm') : 'Non définie';
  };

  const getStatusChip = (status) => {
    const statusMap = {
      'publié': { label: 'Publié', color: 'success' },
      'en attente': { label: 'En attente', color: 'warning' },
      'expiré': { label: 'Expiré', color: 'error' },
      'archivé': { label: 'Archivé', color: 'default' },
      'rejeté': { label: 'Rejeté', color: 'error' }
    };
    const s = statusMap[status] || { label: status || 'Inconnu', color: 'default' };
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

  const tableCellStyle = {
    padding: '14px 16px',
    borderBottom: '1px solid #e0e0e0',
    verticalAlign: 'middle'
  };

  const headCells = [
    { id: 'titre', label: 'Titre' },
    { id: 'metier', label: 'Métier' },
    { id: 'localisation', label: 'Localisation' },
    { id: 'salaireSouhaite', label: 'Salaire' },
    { id: 'status', label: 'Statut' },
    { id: 'actions', label: 'Actions', disableSort: true }
  ];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box py={11} sx={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <Box px={3} maxWidth={1200} mx="auto">
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: 'transparent', boxShadow: 'none' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}
              sx={{ backgroundColor: 'white', p: 3, borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>Mes Annonces</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/CreateAnnonce')}
                sx={{
                  background: 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  '&:hover': { background: 'linear-gradient(45deg, #3a9bec 0%, #00d9e6 100%)' }
                }}
              >
                Nouvelle annonce
              </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>{error}</Alert>}

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
                      <MenuItem value="publié">Publié</MenuItem>
                      <MenuItem value="en attente">En attente</MenuItem>
                      <MenuItem value="expiré">Expiré</MenuItem>
                      <MenuItem value="archivé">Archivé</MenuItem>
                      <MenuItem value="rejeté">Rejeté</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Métier</InputLabel>
                    <Select
                      value={filters.metier}
                      onChange={(e) => handleFilterChange('metier', e.target.value)}
                      label="Métier"
                    >
                      <MenuItem value="">Tous</MenuItem>
                      {['Développeur', 'Designer', 'Marketing', 'Commercial', 'RH'].map(m => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {headCells.map((headCell) => (
                        <th
                          key={headCell.id}
                          style={{
                            ...tableHeaderStyle,
                            textAlign: headCell.id === 'actions' ? 'right' : 'left'
                          }}
                          onClick={() => !headCell.disableSort && handleRequestSort(headCell.id)}
                        >
                          <Box display="flex" alignItems="center" justifyContent={headCell.id === 'actions' ? 'flex-end' : 'flex-start'}>
                            {headCell.label}
                            {!headCell.disableSort && (
                              orderBy === headCell.id ? (
                                order === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                              ) : null
                            )}
                          </Box>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center' }}>
                          <Typography variant="body2">Chargement en cours...</Typography>
                        </td>
                      </tr>
                    ) : annonces.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center' }}>
                          <Typography variant="body2">Aucune annonce disponible</Typography>
                        </td>
                      </tr>
                    ) : (
                      annonces.map((annonce) => (
                        <tr key={annonce._id}>
                          <td style={tableCellStyle}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ bgcolor: '#4e73df', width: 36, height: 36 }}>
                                <Work fontSize="small" />
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>{annonce.titre}</Typography>
                            </Box>
                          </td>
                          <td style={tableCellStyle}>
                            <Chip label={annonce.metier || 'Non spécifié'} size="small" variant="outlined" />
                          </td>
                          <td style={tableCellStyle}>{annonce.localisation}</td>
                          <td style={tableCellStyle}>{formatSalaire(annonce.salaireSouhaite)}</td>
                          <td style={tableCellStyle}>{getStatusChip(annonce.status)}</td>
                          <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                            <IconButton
                              size="small"
                              onClick={(event) => handleMenuOpen(event, annonce._id)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                            <Menu
                              anchorEl={anchorEl}
                              open={Boolean(anchorEl) && menuAnnonceId === annonce._id}
                              onClose={handleMenuClose}
                              PaperProps={{
                                elevation: 1,
                                sx: { mt: 1, borderRadius: 2 }
                              }}
                            >
                              <MenuItem onClick={() => { handleViewDetails(annonce); handleMenuClose(); }}>
                                <Visibility fontSize="small" sx={{ mr: 1, color: '#00B7CF' }} />
                                Voir détails
                              </MenuItem>
                              <MenuItem onClick={() => { handleEditAnnonce(annonce); handleMenuClose(); }}>
                                <Edit fontSize="small" sx={{ mr: 1, color: '#666' }} />
                                Modifier
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  setPublishDialog({
                                    open: true,
                                    annonceId: annonce._id,
                                    annonceTitre: annonce.titre,
                                    action: annonce.status === 'publié' ? 'unpublish' : 'publish'
                                  });
                                  handleMenuClose();
                                }}
                              >
                                {annonce.status === 'publié' ? (
                                  <VisibilityOff fontSize="small" sx={{ mr: 1, color: '#dc3545' }} />
                                ) : (
                                  <Publish fontSize="small" sx={{ mr: 1, color: '#28a745' }} />
                                )}
                                {annonce.status === 'publié' ? 'Dépublier' : 'Publier'}
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  setDeleteDialog({ open: true, annonceId: annonce._id, annonceTitre: annonce.titre });
                                  handleMenuClose();
                                }}
                              >
                                <Delete fontSize="small" sx={{ mr: 1, color: '#dc3545' }} />
                                Supprimer
                              </MenuItem>
                              {annonce.entretien?.meet_link && annonce.entretien.statut === 'Planifié' && (
                                <MenuItem onClick={() => { window.open(annonce.entretien.meet_link, '_blank'); handleMenuClose(); }}>
                                  <VideoCall fontSize="small" sx={{ mr: 1, color: '#00B7CF' }} />
                                  Rejoindre l'entretien
                                </MenuItem>
                              )}
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
                onClick={loadAnnonces}
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
      </Box>

      <Dialog
        open={viewMode}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
          Détails de l'annonce
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {selectedAnnonce && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ color: '#00B7CF' }}>
                  {selectedAnnonce.titre}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Statut:</Typography>
                {getStatusChip(selectedAnnonce.status)}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Métier:</Typography>
                <Typography variant="body1">{selectedAnnonce.metier || 'Non spécifié'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Type de contrat:</Typography>
                <Typography variant="body1">{selectedAnnonce.typeContrat || 'Non spécifié'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Localisation:</Typography>
                <Typography variant="body1">{selectedAnnonce.localisation}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Salaire souhaité:</Typography>
                <Typography variant="body1">{formatSalaire(selectedAnnonce.salaireSouhaite)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Publiée le:</Typography>
                <Typography variant="body1">{formatDate(selectedAnnonce.createdAt)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Description:</Typography>
                <Typography variant="body1" paragraph>
                  {selectedAnnonce.description || 'Aucune description disponible'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Compétences requises:</Typography>
                {selectedAnnonce.competencesRequises?.length > 0 ? (
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {selectedAnnonce.competencesRequises.map((skill, index) => (
                      <Chip key={index} label={skill} variant="outlined" sx={{ m: 0.5 }} />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    Aucune compétence spécifiée
                  </Typography>
                )}
              </Grid>
              {selectedAnnonce.entretien && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Entretien:</Typography>
                  <Box>
                    <Typography variant="body1">Date: {formatDate(selectedAnnonce.entretien.date_entretien)}</Typography>
                    <Typography variant="body1">
                      Lien Google Meet: <Button variant="text" onClick={() => window.open(selectedAnnonce.entretien.meet_link, '_blank')}>
                        {selectedAnnonce.entretien.meet_link}
                      </Button>
                    </Typography>
                    <Typography variant="body1">Statut: {selectedAnnonce.entretien.statut}</Typography>
                    <Typography variant="body1">Résultat: {selectedAnnonce.entretien.resultat || 'Non défini'}</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editMode}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
          Modifier l'annonce
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {selectedAnnonce && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Titre de l'annonce"
                  value={editData.titre}
                  onChange={(e) => setEditData({ ...editData, titre: e.target.value })}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    label="Statut"
                  >
                    <MenuItem value="en attente">En attente</MenuItem>
                    <MenuItem value="publié">Publié</MenuItem>
                    <MenuItem value="expiré">Expiré</MenuItem>
                    <MenuItem value="archivé">Archivé</MenuItem>
                    <MenuItem value="rejeté">Rejeté</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Métier</InputLabel>
                  <Select
                    value={editData.metier}
                    onChange={(e) => setEditData({ ...editData, metier: e.target.value })}
                    label="Métier"
                  >
                    {['Développeur', 'Designer', 'Marketing', 'Commercial', 'RH'].map(m => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Type de contrat</InputLabel>
                  <Select
                    value={editData.typeContrat}
                    onChange={(e) => setEditData({ ...editData, typeContrat: e.target.value })}
                    label="Type de contrat"
                  >
                    {['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'].map(t => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Localisation"
                  value={editData.localisation}
                  onChange={(e) => setEditData({ ...editData, localisation: e.target.value })}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Salaire souhaité"
                  type="number"
                  value={editData.salaireSouhaite}
                  onChange={(e) => setEditData({ ...editData, salaireSouhaite: e.target.value })}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Compétences requises:</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Ajouter une compétence"
                    value={editData.competenceInput}
                    onChange={(e) => setEditData({ ...editData, competenceInput: e.target.value })}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => {
                      if (editData.competenceInput && !editData.competencesRequises.includes(editData.competenceInput)) {
                        setEditData({
                          ...editData,
                          competencesRequises: [...editData.competencesRequises, editData.competenceInput],
                          competenceInput: ''
                        });
                      }
                    }}
                    disabled={!editData.competenceInput}
                  >
                    Ajouter
                  </Button>
                </Box>
                <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                  {editData.competencesRequises.map((competence, index) => (
                    <Chip
                      key={index}
                      label={competence}
                      onDelete={() => setEditData({
                        ...editData,
                        competencesRequises: editData.competencesRequises.filter(c => c !== competence)
                      })}
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={4}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button
            onClick={handleSaveAnnonce}
            variant="contained"
            sx={{ borderRadius: 2, backgroundColor: '#00B7CF', '&:hover': { backgroundColor: '#0095B6' } }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, annonceId: null, annonceTitre: '' })}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir supprimer l'annonce "{deleteDialog.annonceTitre}" ?</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Cette action est irréversible et supprimera toutes les données associées.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, annonceId: null, annonceTitre: '' })} sx={{ borderRadius: 2 }}>
            Annuler
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" sx={{ borderRadius: 2 }}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={publishDialog.open}
        onClose={() => setPublishDialog({ open: false, annonceId: null, annonceTitre: '', action: null })}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
          Confirmer {publishDialog.action === 'publish' ? 'la publication' : 'la dépublication'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography>
            Êtes-vous sûr de vouloir {publishDialog.action === 'publish' ? 'publier' : 'dépublier'} l'annonce "{publishDialog.annonceTitre}" ?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setPublishDialog({ open: false, annonceId: null, annonceTitre: '', action: null })}
            sx={{ borderRadius: 2 }}
          >
            Annuler
          </Button>
          <Button
            onClick={() => handleTogglePublish(publishDialog.annonceId, publishDialog.action)}
            variant="contained"
            color={publishDialog.action === 'publish' ? 'success' : 'warning'}
            sx={{ borderRadius: 2 }}
          >
            {publishDialog.action === 'publish' ? 'Publier' : 'Dépublier'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default MesAnnonces;