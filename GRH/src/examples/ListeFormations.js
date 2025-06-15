import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import {
  Grid,
  Paper,
  Button,
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
  MenuItem,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Container,
  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Add as AddIcon,
} from '@mui/icons-material';

import DashboardLayout from "../examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "../examples/Navbars/DashboardNavbar";
import { useNavigate } from 'react-router-dom';

// Validation schema
const validationSchema = Yup.object({
  titre: Yup.string()
    .max(100, 'Le titre ne doit pas dépasser 100 caractères')
    .required('Le titre est obligatoire'),
  description: Yup.string()
    .max(500, 'La description ne doit pas dépasser 500 caractères')
    .required('La description est obligatoire'),
  modalite: Yup.string()
    .oneOf(['presentiel', 'virtuel', 'hybride', 'contenu'], 'Modalité invalide')
    .required('La modalité est obligatoire'),
  statut: Yup.string()
    .oneOf(['brouillon', 'planifie', 'en-cours', 'termine', 'annule'], 'Statut invalide')
    .required('Le statut est obligatoire'),
  horaire: Yup.object().shape({
    date: Yup.date()
      .nullable()
      .when('modalite', {
        is: (modalite) => ['virtuel', 'hybride'].includes(modalite),
        then: (schema) =>
          schema
            .min(new Date(), 'La date ne peut pas être dans le passé')
            .required('La date est obligatoire pour les formations virtuelles ou hybrides'),
        otherwise: (schema) => schema.nullable(),
      }),
    debut: Yup.date()
      .nullable()
      .when('modalite', {
        is: 'presentiel',
        then: (schema) =>
          schema
            .min(new Date(), 'La date de début ne peut pas être dans le passé')
            .required('La date de début est obligatoire pour les formations en présentiel'),
        otherwise: (schema) => schema.nullable(),
      }),
    fin: Yup.date()
      .nullable()
      .when('modalite', {
        is: 'presentiel',
        then: (schema) =>
          schema
            .min(Yup.ref('debut'), 'La date de fin doit être postérieure à la date de début')
            .required('La date de fin est obligatoire pour les formations en présentiel'),
        otherwise: (schema) => schema.nullable(),
      }),
  }),
  lieu: Yup.string()
    .nullable()
    .when('modalite', {
      is: (modalite) => ['presentiel', 'hybride'].includes(modalite),
      then: (schema) =>
        schema.required('Le lieu est obligatoire pour les formations en présentiel ou hybrides'),
      otherwise: (schema) => schema.nullable(),
    }),
  meetLink: Yup.string()
    .nullable()
    .when('modalite', {
      is: (modalite) => ['virtuel', 'hybride'].includes(modalite),
      then: (schema) =>
        schema
          .matches(/^https:\/\/meet\.google\.com\/[a-z0-9-]+$/, 'Lien Google Meet invalide')
          .required('Le lien Meet est obligatoire pour les formations virtuelles ou hybrides'),
      otherwise: (schema) => schema.nullable(),
    }),
  mission: Yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de mission invalide')
    .required('La mission est obligatoire'),
  formateur: Yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de formateur invalide')
    .required('Le formateur est obligatoire'),
  typeFormation: Yup.string()
    .oneOf(['langue', 'habilitation', 'autre'], 'Type de formation invalide')
    .required('Le type de formation est obligatoire'),
  contenus: Yup.array()
    .of(
      Yup.object({
        typeContenu: Yup.string()
          .oneOf(['video', 'document', 'quiz', 'autre'], 'Type de contenu invalide')
          .required('Le type de contenu est obligatoire'),
        url: Yup.string()
          .url('URL invalide')
          .required("L'URL est obligatoire"),
      })
    )
    .when('modalite', {
      is: 'contenu',
      then: (schema) =>
        schema.min(1, 'Au moins un contenu est requis pour les formations de type contenu'),
      otherwise: (schema) => schema.min(0),
    }),
});

const ListeFormations = () => {
  const [formations, setFormations] = useState([]);
  const [filteredFormations, setFilteredFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ modalite: '', statut: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [missions, setMissions] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [coachsFormateurs, setCoachsFormateurs] = useState([]);
  const [loadingCoachsFormateurs, setLoadingCoachsFormateurs] = useState(true);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // Fetch missions
  const fetchMissions = async () => {
    try {
      setLoadingMissions(true);
      const response = await axios.get('http://localhost:5000/api/missions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMissions(response.data?.data || response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des missions');
    } finally {
      setLoadingMissions(false);
    }
  };

  // Fetch coachs et formateurs
  const fetchCoachsFormateurs = async () => {
    try {
      setLoadingCoachsFormateurs(true);
      const response = await axios.get('http://localhost:5000/api/formation/coachs-formateurs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCoachsFormateurs(response.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des coachs/formateurs');
    } finally {
      setLoadingCoachsFormateurs(false);
    }
  };

  useEffect(() => {
    fetchFormations();
    fetchMissions();
    fetchCoachsFormateurs();
  }, []);

  const fetchFormations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/formation', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = response.data?.data || [];
      setFormations(data);
      setFilteredFormations(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des formations');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let result = [...formations];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((formation) =>
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

  const handleOpenDetails = (formation) => {
    setSelectedFormation(formation);
    setOpenDialog(true);
    setEditMode(false);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFormation(null);
    setEditMode(false);
    setError(null);
  };

  const handleEdit = () => setEditMode(true);

  const handleUpdate = async (values, { setSubmitting }) => {
    try {
      const formattedValues = {
        titre: values.titre,
        description: values.description,
        modalite: values.modalite,
        statut: values.statut,
        mission: values.mission,
        formateur: values.formateur,
        typeFormation: values.typeFormation,
      };

      if (['presentiel', 'virtuel', 'hybride'].includes(values.modalite)) {
        formattedValues.horaire = {
          date: values.horaire.date ? new Date(values.horaire.date).toISOString() : null,
          debut: values.horaire.debut ? new Date(values.horaire.debut).toISOString() : null,
          fin: values.horaire.fin ? new Date(values.horaire.fin).toISOString() : null,
        };
        formattedValues.lieu = values.lieu || null;
        formattedValues.meetLink = values.meetLink || null;
      }

      if (values.modalite === 'contenu') {
        formattedValues.contenus = values.contenus;
      }

      await axios.patch(`http://localhost:5000/api/formation/${selectedFormation._id}`, formattedValues, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchFormations();
      setEditMode(false);
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (formation) => {
    setSelectedFormation(formation);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedFormation(null);
  };

  const handleDelete = async () => {
    if (!selectedFormation?._id || !/^[0-9a-fA-F]{24}$/.test(selectedFormation._id)) {
      setError('ID de formation invalide');
      setOpenDeleteDialog(false);
      return;
    }

    try {
      setDeleting(true);
      const response = await axios.delete(`http://localhost:5000/api/formation/${selectedFormation._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      console.log('Delete response:', response.data);
      await fetchFormations();
      setOpenDeleteDialog(false);
      handleCloseDialog();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la suppression';
      setError(errorMessage);
      setOpenDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFormation = () => navigate('/CreateFormation');

  const renderStatutChip = useCallback(
    (statut) => {
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
    },
    []
  );

  const renderModaliteChip = useCallback(
    (modalite) => (
      <Chip
        label={modalite}
        variant="outlined"
        size="small"
        sx={{ textTransform: 'capitalize' }}
      />
    ),
    []
  );

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
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'black', mb: 1 }}>
                Sessions de Coaching
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Gérer et organiser vos formations
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateFormation}
              sx={{
                height: 48,
                px: 4,
                borderRadius: 2,
                background: 'linear-gradient(45deg, rgb(1, 217, 250) 0%, rgb(5, 204, 249))',
                boxShadow: '0 3px 5px 2px rgba(26, 193, 235, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, rgb(77, 231, 243) 0%, rgb(54, 193, 231))',
                },
              }}
            >
              Nouvelle formation
            </Button>
          </Box>
        </Box>

        {/* Filtres */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
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
                endAdornment: (
                  searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearchTerm('')} size="small">
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                whiteSpace: 'nowrap',
                background: 'linear-gradient(45deg, rgb(1, 217, 250) 0%, rgb(5, 204, 249))',
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
            <Box mt={2} display="flex" gap={2}>
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

        {/* Résultat */}
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {filteredFormations.length} formation(s) trouvée(s)
        </Typography>

        {/* Liste */}
        <Grid container spacing={3}>
          {filteredFormations.map((formation) => (
            <Grid item xs={12} sm={6} md={4} key={formation._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s',
                  boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                    {formation.titre}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {formation.description
                      ? formation.description.substring(0, 100) +
                        (formation.description.length > 100 ? '...' : '')
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
                    {['presentiel'].includes(formation.modalite) && (
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
                </CardContent>
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
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
                  <Box>
                    <IconButton
                      color="primary"
                      onClick={() => {
                        handleOpenDetails(formation);
                        handleEdit();
                      }}
                      sx={{ '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' } }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleOpenDeleteDialog(formation)}
                      sx={{ '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.08)' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Si aucune formation */}
        {filteredFormations.length === 0 && (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgb(168, 229, 231) 0%, rgb(153, 208, 219))',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Aucune formation ne correspond aux critères
            </Typography>
          </Paper>
        )}

        {/* Détails / Modifier */}
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
                {editMode ? 'Modifier la formation' : 'Détails de la session'}
              </Typography>
              <IconButton onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
                <CloseIcon />
              </IconButton>
            </Box>
            {selectedFormation && !editMode && (
              <Typography variant="subtitle1" sx={{ mt: 1 }}>
                {selectedFormation.titre}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent dividers sx={{ background: '#f9fafc' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {editMode ? (
              loadingMissions || loadingCoachsFormateurs ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Formik
                  initialValues={{
                    titre: selectedFormation?.titre || '',
                    description: selectedFormation?.description || '',
                    modalite: selectedFormation?.modalite || 'presentiel',
                    statut: selectedFormation?.statut || 'brouillon',
                    horaire: {
                      date:
                        selectedFormation?.horaire?.date
                          ? new Date(selectedFormation.horaire.date).toISOString().slice(0, 16)
                          : '',
                      debut:
                        selectedFormation?.horaire?.debut
                          ? new Date(selectedFormation.horaire.debut).toISOString().slice(0, 16)
                          : '',
                      fin:
                        selectedFormation?.horaire?.fin
                          ? new Date(selectedFormation.horaire.fin).toISOString().slice(0, 16)
                          : '',
                    },
                    lieu: selectedFormation?.lieu || '',
                    meetLink: selectedFormation?.meetLink || '',
                    mission: selectedFormation?.mission?._id || '',
                    formateur: selectedFormation?.formateur?._id || '',
                    typeFormation: selectedFormation?.typeFormation || 'langue',
                    contenus:
                      selectedFormation?.contenus?.map(({ typeContenu, url }) => ({
                        typeContenu,
                        url,
                      })) || [],
                  }}
                  validationSchema={validationSchema}
                  onSubmit={handleUpdate}
                  enableReinitialize
                >
                  {({ values, errors, touched, isSubmitting, setFieldValue }) => (
                    <Form>
                      <Grid container spacing={3} sx={{ pt: 2 }}>
                        {/* Titre */}
                        <Grid item xs={12}>
                          <Field
                            as={TextField}
                            fullWidth
                            label="Titre *"
                            name="titre"
                            variant="outlined"
                            error={touched.titre && !!errors.titre}
                            helperText={touched.titre && errors.titre}
                            sx={{ background: 'white' }}
                          />
                        </Grid>
                        {/* Description */}
                        <Grid item xs={12}>
                          <Field
                            as={TextField}
                            fullWidth
                            multiline
                            rows={4}
                            label="Description *"
                            name="description"
                            variant="outlined"
                            error={touched.description && !!errors.description}
                            helperText={touched.description && errors.description}
                            sx={{ background: 'white' }}
                          />
                        </Grid>
                        {/* Modalité et Statut */}
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth variant="outlined" sx={{ background: 'white' }}>
                            <InputLabel>Modalité *</InputLabel>
                            <Field
                              as={Select}
                              label="Modalité *"
                              name="modalite"
                              onChange={(e) => {
                                setFieldValue('modalite', e.target.value);
                                setFieldValue('lieu', '');
                                setFieldValue('meetLink', '');
                                setFieldValue('horaire.date', '');
                                setFieldValue('horaire.debut', '');
                                setFieldValue('horaire.fin', '');
                                if (e.target.value !== 'contenu') {
                                  setFieldValue('contenus', []);
                                }
                              }}
                              error={touched.modalite && !!errors.modalite}
                            >
                              <MenuItem value="presentiel">Présentiel</MenuItem>
                              <MenuItem value="virtuel">Virtuel</MenuItem>
                              <MenuItem value="hybride">Hybride</MenuItem>
                              <MenuItem value="contenu">Contenu (PDF/Vidéo)</MenuItem>
                            </Field>
                            {touched.modalite && errors.modalite && (
                              <Typography color="error" variant="caption">
                                {errors.modalite}
                              </Typography>
                            )}
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth variant="outlined" sx={{ background: 'white' }}>
                            <InputLabel>Statut *</InputLabel>
                            <Field
                              as={Select}
                              label="Statut *"
                              name="statut"
                              error={touched.statut && !!errors.statut}
                            >
                              <MenuItem value="brouillon">Brouillon</MenuItem>
                              <MenuItem value="planifie">Planifié</MenuItem>
                              <MenuItem value="en-cours">En cours</MenuItem>
                              <MenuItem value="termine">Terminé</MenuItem>
                              <MenuItem value="annule">Annulé</MenuItem>
                            </Field>
                            {touched.statut && errors.statut && (
                              <Typography color="error" variant="caption">
                                {errors.statut}
                              </Typography>
                            )}
                          </FormControl>
                        </Grid>
                        {/* Dates */}
                        {values.modalite === 'presentiel' && (
                          <>
                            <Grid item xs={12} sm={6}>
                              <Field
                                as={TextField}
                                fullWidth
                                label="Date de début *"
                                type="datetime-local"
                                name="horaire.debut"
                                InputLabelProps={{ shrink: true }}
                                variant="outlined"
                                error={touched.horaire?.debut && !!errors.horaire?.debut}
                                helperText={touched.horaire?.debut && errors.horaire?.debut}
                                sx={{ background: 'white' }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Field
                                as={TextField}
                                fullWidth
                                label="Date de fin *"
                                type="datetime-local"
                                name="horaire.fin"
                                InputLabelProps={{ shrink: true }}
                                variant="outlined"
                                error={touched.horaire?.fin && !!errors.horaire?.fin}
                                helperText={touched.horaire?.fin && errors.horaire?.fin}
                                sx={{ background: 'white' }}
                              />
                            </Grid>
                          </>
                        )}
                        {['virtuel', 'hybride'].includes(values.modalite) && (
                          <Grid item xs={12} sm={6}>
                            <Field
                              as={TextField}
                              fullWidth
                              label="Date et heure *"
                              type="datetime-local"
                              name="horaire.date"
                              InputLabelProps={{ shrink: true }}
                              variant="outlined"
                              error={touched.horaire?.date && !!errors.horaire?.date}
                              helperText={touched.horaire?.date && errors.horaire?.date}
                              sx={{ background: 'white' }}
                            />
                          </Grid>
                        )}
                        {/* Lieu */}
                        {['presentiel', 'hybride'].includes(values.modalite) && (
                          <Grid item xs={12} sm={6}>
                            <Field
                              as={TextField}
                              fullWidth
                              label="Lieu *"
                              name="lieu"
                              variant="outlined"
                              error={touched.lieu && !!errors.lieu}
                              helperText={touched.lieu && errors.lieu}
                              sx={{ background: 'white' }}
                            />
                          </Grid>
                        )}
                        {/* Lien Meet */}
                        {['virtuel', 'hybride'].includes(values.modalite) && (
                          <Grid item xs={12} sm={6}>
                            <Field
                              as={TextField}
                              fullWidth
                              label="Lien Google Meet *"
                              name="meetLink"
                              variant="outlined"
                              error={touched.meetLink && !!errors.meetLink}
                              helperText={touched.meetLink && errors.meetLink}
                              placeholder="https://meet.google.com/abc-defg-hij"
                              sx={{ background: 'white' }}
                            />
                          </Grid>
                        )}
                        {/* Mission */}
                        <Grid item xs={12}>
                          <FormControl fullWidth variant="outlined" sx={{ background: 'white' }}>
                            <InputLabel>Mission *</InputLabel>
                            <Field
                              as={Select}
                              label="Mission *"
                              name="mission"
                              error={touched.mission && !!errors.mission}
                            >
                              <MenuItem value="">Sélectionner une mission</MenuItem>
                              {missions.map((mission) => (
                                <MenuItem key={mission._id} value={mission._id}>
                                  {mission.titre}
                                </MenuItem>
                              ))}
                            </Field>
                            {touched.mission && errors.mission && (
                              <Typography color="error" variant="caption">
                                {errors.mission}
                              </Typography>
                            )}
                          </FormControl>
                        </Grid>
                        {/* Formateur */}
                        <Grid item xs={12}>
                          <FormControl fullWidth variant="outlined" sx={{ background: 'white' }}>
                            <InputLabel>Formateur *</InputLabel>
                            <Field
                              as={Select}
                              label="Formateur *"
                              name="formateur"
                              error={touched.formateur && !!errors.formateur}
                            >
                              <MenuItem value="">Sélectionner un formateur</MenuItem>
                              {coachsFormateurs.map((formateur) => (
                                <MenuItem key={formateur._id} value={formateur._id}>
                                  {formateur.nom} ({formateur.email})
                                </MenuItem>
                              ))}
                            </Field>
                            {touched.formateur && errors.formateur && (
                              <Typography color="error" variant="caption">
                                {errors.formateur}
                              </Typography>
                            )}
                          </FormControl>
                        </Grid>
                        {/* Type de formation */}
                        <Grid item xs={12}>
                          <FormControl fullWidth variant="outlined" sx={{ background: 'white' }}>
                            <InputLabel>Type de formation *</InputLabel>
                            <Field
                              as={Select}
                              label="Type de formation *"
                              name="typeFormation"
                              error={touched.typeFormation && !!errors.typeFormation}
                            >
                              <MenuItem value="langue">Langue</MenuItem>
                              <MenuItem value="habilitation">Habilitation</MenuItem>
                              <MenuItem value="autre">Autre</MenuItem>
                            </Field>
                            {touched.typeFormation && errors.typeFormation && (
                              <Typography color="error" variant="caption">
                                {errors.typeFormation}
                              </Typography>
                            )}
                          </FormControl>
                        </Grid>
                        {/* Contenus si modalité contenu */}
                        {values.modalite === 'contenu' && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                              Contenus pédagogiques *
                            </Typography>
                            <FieldArray name="contenus">
                              {({ push, remove }) => (
                                <>
                                  {values.contenus.map((_, index) => (
                                    <Box
                                      key={index}
                                      sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}
                                    >
                                      <Grid container spacing={2}>
                                        {/* Type de contenu */}
                                        <Grid item xs={12} sm={6}>
                                          <FormControl fullWidth variant="outlined">
                                            <InputLabel>Type de contenu *</InputLabel>
                                            <Field
                                              as={Select}
                                              label="Type de contenu *"
                                              name={`contenus[${index}].typeContenu`}
                                            >
                                              <MenuItem value="video">Vidéo</MenuItem>
                                              <MenuItem value="document">Document</MenuItem>
                                              <MenuItem value="quiz">Quiz</MenuItem>
                                              <MenuItem value="autre">Autre</MenuItem>
                                            </Field>
                                            {touched.contenus?.[index]?.typeContenu &&
                                              errors.contenus?.[index]?.typeContenu && (
                                                <Typography color="error" variant="caption">
                                                  {errors.contenus[index].typeContenu}
                                                </Typography>
                                              )}
                                          </FormControl>
                                        </Grid>
                                        {/* URL */}
                                        <Grid item xs={12} sm={6}>
                                          <Field
                                            as={TextField}
                                            fullWidth
                                            label="URL *"
                                            name={`contenus[${index}].url`}
                                            variant="outlined"
                                            error={
                                              touched.contenus?.[index]?.url &&
                                              !!errors.contenus?.[index]?.url
                                            }
                                            helperText={
                                              touched.contenus?.[index]?.url &&
                                              errors.contenus?.[index]?.url
                                            }
                                          />
                                        </Grid>
                                        {/* Supprimer */}
                                        <Grid item xs={12}>
                                          <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => remove(index)}
                                            sx={{ mt: 1 }}
                                          >
                                            Supprimer ce contenu
                                          </Button>
                                        </Grid>
                                      </Grid>
                                    </Box>
                                  ))}
                                  <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => push({ typeContenu: '', url: '' })}
                                    sx={{ mb: 2 }}
                                  >
                                    Ajouter un contenu
                                  </Button>
                                  {/* Erreur globale */}
                                  {touched.contenus && errors.contenus && typeof errors.contenus === 'string' && (
                                    <Typography color="error" variant="caption">
                                      {errors.contenus}
                                    </Typography>
                                  )}
                                </>
                              )}
                            </FieldArray>
                          </Grid>
                        )}
                      </Grid>
                      {/* Actions */}
                      <DialogActions sx={{ mt: 3, px: 0, justifyContent: 'space-between' }}>
                        <Button
                          onClick={() => {
                            setEditMode(false);
                            handleCloseDialog();
                          }}
                          variant="contained"
                          sx={{
                            borderRadius: 2,
                            background: 'linear-gradient(45deg, rgb(1, 217, 250) 0%, rgb(5, 204, 249))',
                            '&:hover': {
                              background: 'linear-gradient(45deg, rgb(0, 172, 193) 0%, rgb(6, 222, 246))',
                            },
                          }}
                        >
                          Retour
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          startIcon={<SaveIcon />}
                          disabled={isSubmitting}
                          sx={{
                            borderRadius: 2,
                            background: 'linear-gradient(45deg, rgb(1, 217, 250) 0%, rgb(5, 204, 249))',
                            boxShadow: '0 3px 5px rgba(33, 150, 243, 0.3)',
                          }}
                        >
                          {isSubmitting ? <CircularProgress size={24} /> : 'Enregistrer'}
                        </Button>
                      </DialogActions>
                    </Form>
                  )}
                </Formik>
              )
            ) : (
              selectedFormation && (
                <Box>
                  {/* Détails */}
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {selectedFormation.titre}
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {selectedFormation.description}
                      </Typography>
                      {/* Infos */}
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2">Modalité</Typography>
                          {renderModaliteChip(selectedFormation.modalite)}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2">Statut</Typography>
                          {renderStatutChip(selectedFormation.statut)}
                        </Grid>
                        {['presentiel'].includes(selectedFormation.modalite) && (
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
                          <Grid item xs={12}>
                            <Typography variant="subtitle2">Lieu</Typography>
                            <Typography variant="body2">{selectedFormation.lieu || '-'}</Typography>
                          </Grid>
                        )}
                        {['virtuel', 'hybride'].includes(selectedFormation.modalite) && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2">Lien Google Meet</Typography>
                            <Typography variant="body2">
                              {selectedFormation.meetLink ? (
                                <a
                                  href={selectedFormation.meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {selectedFormation.meetLink}
                                </a>
                              ) : (
                                '-'
                              )}
                            </Typography>
                          </Grid>
                        )}
                        {/* Infos complémentaires */}
                        <Grid item xs={12}>
                          <Typography variant="subtitle2">Mission</Typography>
                          <Typography variant="body2">
                            {selectedFormation?.mission?.titre || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2">Formateur</Typography>
                          <Typography variant="body2">
                            {selectedFormation?.formateur?.nom || '-'} (
                            {selectedFormation?.formateur?.email || '-'}
                            )
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2">Type de formation</Typography>
                          <Typography variant="body2">{selectedFormation.typeFormation}</Typography>
                        </Grid>
                        {/* Contenus pédagogiques */}
                        {selectedFormation.contenus?.length > 0 && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 2 }}>
                              Contenus pédagogiques
                            </Typography>
                            <Box sx={{ overflowX: 'auto' }}>
                              <table
                                style={{
                                  width: '100%',
                                  borderCollapse: 'collapse',
                                  fontSize: '0.875rem',
                                  backgroundColor: '#fff',
                                  border: '1px solid #e0e0e0',
                                }}
                              >
                                <thead>
                                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                                    <th
                                      style={{
                                        padding: '8px',
                                        textAlign: 'left',
                                        borderBottom: '1px solid #e0e0e0',
                                        fontWeight: 600,
                                      }}
                                    >
                                      Type
                                    </th>
                                    <th
                                      style={{
                                        padding: '8px',
                                        textAlign: 'left',
                                        borderBottom: '1px solid #e0e0e0',
                                        fontWeight: 600,
                                      }}
                                    >
                                      URL
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedFormation.contenus.map((contenu, i) => (
                                    <tr key={i}>
                                      <td
                                        style={{
                                          padding: '8px',
                                          borderBottom: '1px solid #e0e0e0',
                                        }}
                                      >
                                        {contenu.typeContenu}
                                      </td>
                                      <td
                                        style={{
                                          padding: '8px',
                                          borderBottom: '1px solid #e0e0e0',
                                        }}
                                      >
                                        <a
                                          href={contenu.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            color: '#1976d2',
                                            textDecoration: 'none',
                                          }}
                                        >
                                          {contenu.url}
                                        </a>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                  {/* Actions */}
                  <DialogActions sx={{ mt: 3, px: 0, justifyContent: 'space-between' }}>
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
                    <Box>
                      <Button
                        onClick={handleEdit}
                        variant="outlined"
                        startIcon={<EditIcon />}
                        sx={{ borderRadius: 2, mr: 1 }}
                      >
                        Modifier
                      </Button>
                      <Button
                        onClick={() => handleOpenDeleteDialog(selectedFormation)}
                        color="error"
                        variant="contained"
                        startIcon={<DeleteIcon />}
                        sx={{
                          borderRadius: 2,
                          background: 'linear-gradient(45deg, rgb(244, 67, 54) 0%, rgb(229, 115, 115))',
                          boxShadow: '0 3px 5px rgba(244, 67, 54, 0.3)',
                        }}
                      >
                        Supprimer
                      </Button>
                    </Box>
                  </DialogActions>
                </Box>
              )
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation suppression */}
        <Dialog
          open={openDeleteDialog}
          onClose={handleCloseDeleteDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogContent>
            <Typography>
              Êtes-vous sûr de vouloir supprimer la formation "{selectedFormation?.titre}" ? Cette action est irréversible.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCloseDeleteDialog}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
              disabled={deleting}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(45deg, rgb(244, 67, 54) 0%, rgb(229, 115, 115))',
              }}
            >
              {deleting ? <CircularProgress size={24} /> : 'Supprimer'}
            </Button>
          </DialogActions>
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

export default ListeFormations;