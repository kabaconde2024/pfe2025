import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, FieldArray } from 'formik';
import axios from 'axios';
import {
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Typography,
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  IconButton,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  School as SchoolIcon,
  ListAlt as ListAltIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import DashboardLayout from '../examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from '../examples/Navbars/DashboardNavbar';

const CreateFormation = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [missions, setMissions] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [coachsFormateurs, setCoachsFormateurs] = useState([]);
  const [loadingCoachsFormateurs, setLoadingCoachsFormateurs] = useState(false);

  const initialValues = {
    titre: '',
    description: '',
    horaire: {
      date: '',
      debut: '',
      fin: '',
    },
    modalite: 'presentiel',
    lieu: '',
    meetLink: '',
    mission: null,
    formateur: null,
    statut: 'brouillon',
    typeFormation: 'langue',
    contenus: [],
  };

  useEffect(() => {
    loadMissions();
    loadCoachsFormateurs();
  }, []);

  const loadMissions = async (searchTerm = '') => {
    setLoadingMissions(true);
    try {
      const response = await axios.get('http://localhost:5000/api/missions', {
        params: { search: searchTerm },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setMissions(response.data?.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des missions:', err);
      setError('Erreur lors du chargement des missions');
    } finally {
      setLoadingMissions(false);
    }
  };

  const loadCoachsFormateurs = async () => {
    setLoadingCoachsFormateurs(true);
    try {
      const response = await axios.get('http://localhost:5000/api/formation/coachs-formateurs', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setCoachsFormateurs(response.data?.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des coachs/formateurs:', err);
      setError('Erreur lors du chargement des coachs/formateurs');
    } finally {
      setLoadingCoachsFormateurs(false);
    }
  };

  const validateForm = (values) => {
    const errors = {};

    if (!values.titre) errors.titre = 'Titre requis';
    if (values.titre?.length > 100) errors.titre = 'Le titre ne peut pas dépasser 100 caractères';
    if (!values.description) errors.description = 'Description requise';
    if (values.description?.length > 500) errors.description = 'La description ne peut pas dépasser 500 caractères';

    if (['presentiel', 'virtuel', 'hybride'].includes(values.modalite)) {
      if (values.modalite === 'presentiel') {
        if (!values.horaire?.debut) {
          errors.horaire = { ...errors.horaire, debut: 'Date de début requise' };
        } else {
          const now = new Date();
          const debut = new Date(values.horaire.debut);
          if (debut < now) {
            errors.horaire = { ...errors.horaire, debut: 'La date de début ne peut pas être dans le passé' };
          }
        }
        if (!values.horaire?.fin) {
          errors.horaire = { ...errors.horaire, fin: 'Date de fin requise' };
        } else if (values.horaire?.debut && values.horaire?.fin) {
          const debut = new Date(values.horaire.debut);
          const fin = new Date(values.horaire.fin);
          if (fin <= debut) {
            errors.horaire = { ...errors.horaire, fin: 'La date de fin doit être postérieure à la date de début' };
          }
        }
      } else if (['virtuel', 'hybride'].includes(values.modalite)) {
        if (!values.horaire?.date) {
          errors.horaire = { ...errors.horaire, date: 'Date et heure requises' };
        } else {
          const now = new Date();
          const date = new Date(values.horaire.date);
          if (date < now) {
            errors.horaire = { ...errors.horaire, date: 'La date ne peut pas être dans le passé' };
          }
        }
      }
    }

    if (['presentiel', 'hybride'].includes(values.modalite) && (!values.lieu || values.lieu.trim() === '')) {
      errors.lieu = 'Lieu requis et ne peut pas être vide pour les formations en présentiel ou hybrides';
    }
    if (['virtuel', 'hybride'].includes(values.modalite) && !values.meetLink) {
      errors.meetLink = 'Lien Google Meet requis pour les formations virtuelles ou hybrides';
    }
    if (values.meetLink && !/^https:\/\/meet\.google\.com\/[a-z0-9-]+$/.test(values.meetLink)) {
      errors.meetLink = 'Lien Google Meet invalide';
    }
    if (values.modalite === 'contenu' && (!values.contenus || values.contenus.length === 0)) {
      errors.contenus = 'Au moins un contenu est requis pour les formations de type contenu';
    }
    if (!values.mission) errors.mission = 'Mission requise';
    if (!values.formateur) errors.formateur = 'Formateur requis';
    if (!values.typeFormation) errors.typeFormation = 'Type de formation requis';

    values.contenus?.forEach((contenu, index) => {
      if (!contenu.typeContenu) errors[`contenus[${index}].typeContenu`] = 'Type de contenu requis';
      if (!contenu.url) errors[`contenus[${index}].url`] = 'URL requise';
    });

    return errors;
  };

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      const formationData = {
        titre: values.titre,
        description: values.description,
        modalite: values.modalite,
        mission: values.mission,
        formateur: values.formateur,
        statut: values.statut || 'brouillon',
        typeFormation: values.typeFormation,
      };

      if (['presentiel', 'virtuel', 'hybride'].includes(values.modalite)) {
        formationData.horaire = values.modalite === 'presentiel'
          ? { debut: values.horaire.debut, fin: values.horaire.fin }
          : { date: values.horaire.date };
        formationData.lieu = values.lieu || undefined;
        formationData.meetLink = values.meetLink || undefined;
      }
      if (values.modalite === 'contenu') {
        formationData.contenus = values.contenus;
      }
      const response = await axios.post('http://localhost:5000/api/formation', formationData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data?.success && response.data?.data?._id) {
        setSuccess(true);
        setTimeout(() => navigate('/ListeFormations'), 1000);
      } else {
        throw new Error('Réponse inattendue du serveur');
      }
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la création';
      const errorDetails = err.response?.data?.errors?.join(', ') || errorMessage;
      setError(errorDetails);
      setErrors(err.response?.data?.errors?.reduce((acc, msg, idx) => ({ ...acc, [`error_${idx}`]: msg }), {}) || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box py={11} sx={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <Box px={3} maxWidth={1200} mx="auto">
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: 'transparent', boxShadow: 'none' }}>
            <Box
              textAlign="center"
              mb={6}
              sx={{ backgroundColor: 'white', p: 4, borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', position: 'relative' }}
            >
              <Button
                variant="contained"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/ListeFormations')}
                sx={{
                  position: 'absolute',
                  left: 24,
                  top: 24,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #3a9bec 0%, #00d9e6 100%)',
                    boxShadow: '0 3px 5px 2px rgba(0, 242, 254, 0.3)',
                  },
                }}
              >
                Retour à la liste
              </Button>
              <Typography variant="h3" gutterBottom sx={{ mb: 2, fontWeight: 'bold', color: 'black' }}>
                Création d'une session de Coaching
              </Typography>
              <Typography variant="body1" sx={{ color: 'black', maxWidth: 800, mx: 'auto' }}>
                Remplissez ce formulaire pour créer une nouvelle formation. Les champs marqués d'un astérisque (*) sont obligatoires.
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                Formation créée avec succès ! Redirection en cours...
              </Alert>
            )}

            <Formik initialValues={initialValues} validate={validateForm} onSubmit={handleSubmit}>
              {({ values, isSubmitting, setFieldValue, touched, errors, setFieldTouched }) => (
                <Form>
                  <Paper elevation={0} sx={{ p: 4, mb: 3, borderRadius: 3, backgroundColor: 'white', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
                    <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid', borderColor: '#4e73df' }}>
                      <CardHeader
                        avatar={<Avatar sx={{ bgcolor: '#4e73df' }}><SchoolIcon /></Avatar>}
                        title="Informations de base"
                        subheader="Renseignez les informations générales de la formation"
                        sx={{ backgroundColor: '#f8f9fc', borderBottom: '1px solid #e3e6f0' }}
                      />
                      <CardContent>
                        <Grid container spacing={3}>
                          <Grid item xs={12}>
                            <Field name="titre">
                              {({ field, meta }) => (
                                <TextField
                                  {...field}
                                  label="Titre *"
                                  fullWidth
                                  error={meta.touched && !!meta.error}
                                  helperText={meta.touched && meta.error}
                                />
                              )}
                            </Field>
                          </Grid>
                          <Grid item xs={12}>
                            <Field name="description">
                              {({ field, meta }) => (
                                <TextField
                                  {...field}
                                  label="Description *"
                                  multiline
                                  rows={5}
                                  fullWidth
                                  error={meta.touched && !!meta.error}
                                  helperText={meta.touched && meta.error}
                                />
                              )}
                            </Field>
                          </Grid>
                          <Grid item xs={12}>
                            <Autocomplete
                              options={missions}
                              getOptionLabel={(option) => option.titre || ''}
                              loading={loadingMissions}
                              onOpen={() => loadMissions()}
                              onInputChange={(event, newInputValue) => loadMissions(newInputValue)}
                              onChange={(event, newValue) => setFieldValue('mission', newValue?._id || null)}
                              value={missions.find((m) => m._id === values.mission) || null}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Mission associée *"
                                  error={touched.mission && !!errors.mission}
                                  helperText={touched.mission && errors.mission}
                                  InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                      <>
                                        {loadingMissions && <CircularProgress color="inherit" size={20} />}
                                        {params.InputProps.endAdornment}
                                      </>
                                    ),
                                  }}
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Autocomplete
                              options={coachsFormateurs}
                              getOptionLabel={(option) => `${option.nom} (${option.role})` || ''}
                              loading={loadingCoachsFormateurs}
                              onOpen={() => loadCoachsFormateurs()}
                              onChange={(event, newValue) => setFieldValue('formateur', newValue?._id || null)}
                              value={coachsFormateurs.find((cf) => cf._id === values.formateur) || null}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Formateur *"
                                  error={touched.formateur && !!errors.formateur}
                                  helperText={touched.formateur && errors.formateur}
                                  InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                      <>
                                        {loadingCoachsFormateurs && <CircularProgress color="inherit" size={20} />}
                                        {params.InputProps.endAdornment}
                                      </>
                                    ),
                                  }}
                                />
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>Statut *</InputLabel>
                              <Field name="statut">
                                {({ field, meta }) => (
                                  <>
                                    <Select
                                      {...field}
                                      label="Statut *"
                                      error={meta.touched && !!meta.error}
                                    >
                                      {['brouillon', 'planifie', 'en-cours', 'termine', 'annule'].map((statut) => (
                                        <MenuItem key={statut} value={statut}>
                                          {statut.charAt(0).toUpperCase() + statut.slice(1)}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                    {meta.touched && meta.error && (
                                      <Typography color="error" variant="caption">
                                        {meta.error}
                                      </Typography>
                                    )}
                                  </>
                                )}
                              </Field>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>Type de formation *</InputLabel>
                              <Field name="typeFormation">
                                {({ field, meta }) => (
                                  <>
                                    <Select
                                      {...field}
                                      label="Type de formation *"
                                      error={meta.touched && !!meta.error}
                                    >
                                      {['langue', 'habilitation', 'autre'].map((type) => (
                                        <MenuItem key={type} value={type}>
                                          {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                    {meta.touched && meta.error && (
                                      <Typography color="error" variant="caption">
                                        {meta.error}
                                      </Typography>
                                    )}
                                  </>
                                )}
                              </Field>
                            </FormControl>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>

                    <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid', borderColor: '#1cc88a' }}>
                      <CardHeader
                        avatar={<Avatar sx={{ bgcolor: '#1cc88a' }}><SchoolIcon /></Avatar>}
                        title="Organisation"
                        subheader="Définissez les détails de la formation selon la modalité"
                        sx={{ backgroundColor: '#f8f9fc', borderBottom: '1px solid #e3e6f0' }}
                      />
                      <CardContent>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>Modalité *</InputLabel>
                              <Field name="modalite">
                                {({ field, meta }) => (
                                  <>
                                    <Select
                                      {...field}
                                      label="Modalité *"
                                      error={meta.touched && !!meta.error}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        setFieldValue('lieu', '');
                                        setFieldValue('meetLink', '');
                                        setFieldValue('horaire.date', '');
                                        setFieldValue('horaire.debut', '');
                                        setFieldValue('horaire.fin', '');
                                        setFieldValue('contenus', []);
                                        setFieldTouched('lieu', false);
                                        setFieldTouched('meetLink', false);
                                        setFieldTouched('horaire.date', false);
                                        setFieldTouched('horaire.debut', false);
                                        setFieldTouched('horaire.fin', false);
                                        setFieldTouched('contenus', false);
                                      }}
                                    >
                                      {[
                                        { value: 'presentiel', label: 'Présentiel' },
                                        { value: 'virtuel', label: 'Virtuel' },
                                        { value: 'hybride', label: 'Hybride' },
                                        { value: 'contenu', label: 'Contenu (PDF/Vidéo)' },
                                      ].map((mod) => (
                                        <MenuItem key={mod.value} value={mod.value}>
                                          {mod.label}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                    {meta.touched && meta.error && (
                                      <Typography color="error" variant="caption">
                                        {meta.error}
                                      </Typography>
                                    )}
                                  </>
                                )}
                              </Field>
                            </FormControl>
                          </Grid>
                          {values.modalite === 'presentiel' && (
                            <>
                              <Grid item xs={12} sm={6}>
                                <Field name="horaire.debut">
                                  {({ field, meta }) => (
                                    <TextField
                                      {...field}
                                      label="Date et heure de début *"
                                      type="datetime-local"
                                      fullWidth
                                      InputLabelProps={{ shrink: true }}
                                      error={meta.touched && !!meta.error}
                                      helperText={meta.touched && meta.error}
                                    />
                                  )}
                                </Field>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Field name="horaire.fin">
                                  {({ field, meta }) => (
                                    <TextField
                                      {...field}
                                      label="Date et heure de fin *"
                                      type="datetime-local"
                                      fullWidth
                                      InputLabelProps={{ shrink: true }}
                                      error={meta.touched && !!meta.error}
                                      helperText={meta.touched && meta.error}
                                    />
                                  )}
                                </Field>
                              </Grid>
                            </>
                          )}
                          {['virtuel', 'hybride'].includes(values.modalite) && (
                            <Grid item xs={12} sm={6}>
                              <Field name="horaire.date">
                                {({ field, meta }) => (
                                  <TextField
                                    {...field}
                                    label="Date et heure *"
                                    type="datetime-local"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    error={meta.touched && !!meta.error}
                                    helperText={meta.touched && meta.error}
                                  />
                                )}
                              </Field>
                            </Grid>
                          )}
                          {['presentiel', 'hybride'].includes(values.modalite) && (
                            <Grid item xs={12} sm={6}>
                              <Field name="lieu">
                                {({ field, meta }) => (
                                  <TextField
                                    {...field}
                                    label="Lieu *"
                                    fullWidth
                                    error={meta.touched && !!meta.error}
                                    helperText={meta.touched && meta.error ? meta.error : 'Ex: Salle de formation A, Paris'}
                                  />
                                )}
                              </Field>
                            </Grid>
                          )}
                          {['virtuel', 'hybride'].includes(values.modalite) && (
                            <Grid item xs={12} sm={6}>
                              <Field name="meetLink">
                                {({ field, meta }) => (
                                  <TextField
                                    {...field}
                                    label="Lien Google Meet *"
                                    fullWidth
                                    error={meta.touched && !!meta.error}
                                    helperText={meta.touched && meta.error ? meta.error : 'Ex: https://meet.google.com/abc-defg-hij'}
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                  />
                                )}
                              </Field>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>

                    {values.modalite === 'contenu' && (
                      <Card variant="outlined" sx={{ mb: 3, borderLeft: '4px solid', borderColor: '#f6c23e' }}>
                        <CardHeader
                          avatar={<Avatar sx={{ bgcolor: '#f6c23e' }}><ListAltIcon /></Avatar>}
                          title="Contenus Pédagogiques"
                          subheader="Ajoutez au moins un contenu (PDF, vidéo, etc.)"
                          sx={{ backgroundColor: '#f8f9fc', borderBottom: '1px solid #e3e6f0' }}
                        />
                        <CardContent>
                          <FieldArray name="contenus">
                            {({ push, remove }) => (
                              <Box>
                                {values.contenus.map((contenu, index) => (
                                  <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                                    <Grid container spacing={2}>
                                      <Grid item xs={12} sm={5}>
                                        <FormControl fullWidth>
                                          <InputLabel>Type de contenu *</InputLabel>
                                          <Field name={`contenus[${index}].typeContenu`}>
                                            {({ field, meta }) => (
                                              <>
                                                <Select
                                                  {...field}
                                                  label="Type de contenu *"
                                                  error={meta.touched && !!meta.error}
                                                >
                                                  {['video', 'document', 'autre'].map((type) => (
                                                    <MenuItem key={type} value={type}>
                                                      {type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </MenuItem>
                                                  ))}
                                                </Select>
                                                {meta.touched && meta.error && (
                                                  <Typography color="error" variant="caption">
                                                    {meta.error}
                                                  </Typography>
                                                )}
                                              </>
                                            )}
                                          </Field>
                                        </FormControl>
                                      </Grid>
                                      <Grid item xs={12} sm={6}>
                                        <Field name={`contenus[${index}].url`}>
                                          {({ field, meta }) => (
                                            <TextField
                                              {...field}
                                              label="URL *"
                                              fullWidth
                                              error={meta.touched && !!meta.error}
                                              helperText={meta.touched && meta.error}
                                            />
                                          )}
                                        </Field>
                                      </Grid>
                                      <Grid item xs={12} sm={1} display="flex" alignItems="center">
                                        <IconButton onClick={() => remove(index)} color="error">
                                          <RemoveIcon />
                                        </IconButton>
                                      </Grid>
                                    </Grid>
                                  </Card>
                                ))}
                                <Button
                                  variant="outlined"
                                  startIcon={<AddIcon />}
                                  onClick={() =>
                                    push({
                                      typeContenu: '',
                                      url: '',
                                      dateAjout: new Date().toISOString(),
                                    })
                                  }
                                  sx={{ mt: 1 }}
                                >
                                  Ajouter un contenu
                                </Button>
                              </Box>
                            )}
                          </FieldArray>
                          {touched.contenus && errors.contenus && typeof errors.contenus === 'string' && (
                            <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                              {errors.contenus}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <Box mt={5} display="flex" justifyContent="space-between">
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        startIcon={<CheckCircleIcon />}
                        sx={{ width: 200, borderRadius: 2 }}
                      >
                        {isSubmitting ? 'En cours...' : 'Créer la formation'}
                      </Button>
                    </Box>
                  </Paper>
                </Form>
              )}
            </Formik>
          </Paper>
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default CreateFormation;