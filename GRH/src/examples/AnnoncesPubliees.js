import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Box,
  Avatar,
  Typography,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  alpha,
  Skeleton,
  Stack,
  Paper,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
  Button,
  TextField
} from '@mui/material';
import {
  Visibility,
  Schedule,
  LocationOn,
  Work,
  AttachMoney,
  Favorite,
  Share,
  Description,
  Business,
  Event,
  Code,
  People,
  Publish,
  Refresh,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

dayjs.extend(relativeTime);

const user = { role: 'admin', id: 'your_user_id' }; // Replace with actual user context

const AnnonceCard = ({ annonce, onView }) => {
  const theme = useTheme();
  const [elevation, setElevation] = useState(2);
  const [liked, setLiked] = useState(false);

  const contractColors = useMemo(() => ({
    CDI: 'success',
    CDD: 'warning',
    Stage: 'info',
    Freelance: 'secondary',
    Alternance: 'primary',
    'Temps partiel': 'default',
    Autre: 'default'
  }), []);

  const statusColors = useMemo(() => ({
    publié: 'success',
    rejeté: 'error',
    expiré: 'default',
    brouillon: 'warning',
    archivé: 'default'
  }), []);

  const formatSalaire = (salaire) => {
    if (!salaire && salaire !== 0) return 'Non spécifié';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(salaire);
  };

  return (
    <Paper
      elevation={elevation}
      onMouseEnter={() => setElevation(6)}
      onMouseLeave={() => setElevation(2)}
      sx={{
        mb: 3,
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        '&:hover': {
          transform: 'translateY(-2px)'
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={10}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  width: 60,
                  height: 60,
                  mt: 1
                }}
              >
                <Work fontSize="medium" />
              </Avatar>
              
              <Box>
                <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                  {annonce.titre || 'Sans titre'}
                </Typography>
                
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
                  <Chip
                    icon={<LocationOn />}
                    label={annonce.localisation || 'Non spécifié'}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 1 }}
                  />
                  <Chip
                    label={annonce.typeContrat || 'Non spécifié'}
                    color={contractColors[annonce.typeContrat] || 'default'}
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                  {annonce.salaireSouhaite && (
                    <Chip
                      icon={<AttachMoney />}
                      label={formatSalaire(annonce.salaireSouhaite)}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.dark,
                        borderRadius: 1
                      }}
                    />
                  )}
                  <Chip
                    label={annonce.status.charAt(0).toUpperCase() + annonce.status.slice(1)}
                    color={statusColors[annonce.status] || 'default'}
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                  <Chip
                    label={annonce.estValide ? 'Validée' : 'Non validée'}
                    color={annonce.estValide ? 'primary' : 'warning'}
                    size="small"
                    sx={{ borderRadius: 1 }}
                  />
                </Stack>

                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.6
                  }}
                >
                  {annonce.description || 'Aucune description'}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {(annonce.competencesRequises || []).length > 0 ? (
                    annonce.competencesRequises.map((skill, i) => (
                      <Chip
                        key={i}
                        label={skill}
                        size="small"
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          color: theme.palette.primary.main,
                          borderRadius: 1
                        }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Aucune compétence spécifiée
                    </Typography>
                  )}
                </Box>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} sm={2}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between',
              alignItems: 'flex-end'
            }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  size="small"
                  color={liked ? 'error' : 'default'}
                  onClick={() => setLiked(!liked)}
                >
                  <Favorite fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <Share fontSize="small" />
                </IconButton>
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Schedule fontSize="small" sx={{ mr: 0.5 }} />
                {dayjs(annonce.createdAt).fromNow()}
              </Typography>

              <Stack direction="column" spacing={1}>
                <Tooltip title="Voir les détails">
                  <IconButton
                    color="primary"
                    onClick={() => onView(annonce)}
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2)
                      }
                    }}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

AnnonceCard.propTypes = {
  annonce: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    titre: PropTypes.string.isRequired,
    metier: PropTypes.string,
    localisation: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    competencesRequises: PropTypes.arrayOf(PropTypes.string),
    typeContrat: PropTypes.string,
    salaireSouhaite: PropTypes.number,
    createdAt: PropTypes.string.isRequired,
    vues: PropTypes.number,
    contacts: PropTypes.number,
    estActif: PropTypes.bool.isRequired,
    estValide: PropTypes.bool.isRequired,
    status: PropTypes.string.isRequired
  }).isRequired,
  onView: PropTypes.func.isRequired
};

AnnonceCard.defaultProps = {
  annonce: {
    competencesRequises: [],
    metier: '',
    typeContrat: '',
    salaireSouhaite: null,
    vues: 0,
    contacts: 0,
    estActif: true,
    estValide: false,
    status: 'brouillon'
  }
};

const DetailsModal = ({ open, onClose, annonce, onValidate, onReject }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatDate = (dateString) => {
    return dayjs(dateString).format('DD/MM/YYYY à HH:mm');
  };

  const formatSalaire = (salaire) => {
    if (!salaire && salaire !== 0) return 'Non spécifié';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(salaire);
  };

  const handleRejectClick = () => {
    setOpenRejectDialog(true);
  };

  const handleRejectConfirm = () => {
    if (rejectionReason.trim()) {
      onReject(annonce._id, rejectionReason);
      setOpenRejectDialog(false);
      setRejectionReason('');
    }
  };

  if (!annonce) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        aria-labelledby="details-dialog-title"
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 4,
            p: 3
          }
        }}
      >
        <DialogTitle id="details-dialog-title" sx={{ fontWeight: 700, p: 0, mb: 3 }}>
          <Typography variant="h5" component="div">
            {annonce.titre || 'Sans titre'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {annonce.metier || 'Non spécifié'}
          </Typography>
        </DialogTitle>

        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Détails" icon={<Description />} iconPosition="start" />
          <Tab label="Compétences" icon={<Code />} iconPosition="start" />
          <Tab label="Informations" icon={<Business />} iconPosition="start" />
        </Tabs>

        <DialogContent sx={{ p: 0 }}>
          {activeTab === 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" paragraph>
                {annonce.description || 'Aucune description'}
              </Typography>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ mb: 4 }}>
              {(annonce.competencesRequises || []).length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {annonce.competencesRequises.map((skill, i) => (
                    <Chip
                      key={i}
                      label={skill}
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune compétence spécifiée
                </Typography>
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.primary.light, 0.05) }}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Business color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Type de contrat"
                        secondary={annonce.typeContrat || 'Non spécifié'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Business color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Métier"
                        secondary={annonce.metier || 'Non spécifié'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <LocationOn color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Localisation"
                        secondary={annonce.localisation || 'Non spécifié'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <AttachMoney color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Salaire souhaité"
                        secondary={formatSalaire(annonce.salaireSouhaite)}
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.secondary.light, 0.05) }}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Event color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Publiée le"
                        secondary={formatDate(annonce.createdAt)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <People color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Vues"
                        secondary={annonce.vues || 0}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Publish color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Statut"
                        secondary={annonce.status.charAt(0).toUpperCase() + annonce.status.slice(1)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Validation"
                        secondary={annonce.estValide ? 'Validée' : 'Non validée'}
                      />
                    </ListItem>
                    {annonce.status === "rejeté" && annonce.rejectionReason && (
                      <ListItem>
                        <ListItemIcon>
                          <Cancel color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Raison du rejet"
                          secondary={annonce.rejectionReason}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 0, pt: 3 }}>
          {user.role === 'admin' && !annonce.estValide && annonce.status !== "rejeté" && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => onValidate(annonce._id)}
                sx={{ borderRadius: 2, mr: 1 }}
              >
                Valider
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Cancel />}
                onClick={handleRejectClick}
                sx={{ borderRadius: 2, mr: 1 }}
              >
                Rejeter
              </Button>
            </>
          )}
          <Button
            onClick={onClose}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openRejectDialog}
        onClose={() => setOpenRejectDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmer le rejet</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Veuillez indiquer la raison du rejet de l'annonce "{annonce.titre || 'Sans titre'}".
          </Typography>
          <TextField
            label="Raison du rejet"
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            fullWidth
            required
            error={!rejectionReason.trim()}
            helperText={!rejectionReason.trim() ? "La raison est requise" : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenRejectDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleRejectConfirm}
            variant="contained"
            color="error"
            disabled={!rejectionReason.trim()}
            sx={{ borderRadius: 2 }}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

DetailsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  annonce: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    titre: PropTypes.string.isRequired,
    metier: PropTypes.string,
    localisation: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    competencesRequises: PropTypes.arrayOf(PropTypes.string),
    typeContrat: PropTypes.string,
    salaireSouhaite: PropTypes.number,
    createdAt: PropTypes.string.isRequired,
    vues: PropTypes.number,
    contacts: PropTypes.number,
    estActif: PropTypes.bool.isRequired,
    estValide: PropTypes.bool.isRequired,
    status: PropTypes.string.isRequired,
    rejectionReason: PropTypes.string
  }).isRequired,
  onValidate: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired
};

const AnnoncesPubliees = () => {
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('error');
  const [selectedAnnonce, setSelectedAnnonce] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchAnnonces = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:5000/api/annonces/publiees');
      
      if (!response.data || !Array.isArray(response.data.annonces)) {
        throw new Error('Réponse invalide du serveur');
      }
      
      setAnnonces(response.data.annonces);
    } catch (error) {
      console.error('Erreur lors de la récupération des annonces:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error.response?.data?.message || 'Impossible de charger les annonces publiées. Veuillez vérifier votre connexion ou réessayer plus tard.';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (annonceId) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/annonces/${annonceId}/valider`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSnackbarMessage(response.data.message);
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      await fetchAnnonces();
    } catch (error) {
      console.error('Erreur lors de la validation:', {
        message: error.message,
        response: error.response?.data
      });
      const errorMessage = error.response?.data?.message || 'Erreur lors de la validation de l\'annonce';
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleReject = async (annonceId, rejectionReason) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/annonces/${annonceId}/rejeter`, {
        rejectionReason
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSnackbarMessage(response.data.message);
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      await fetchAnnonces();
      setOpenDetailsDialog(false);
    } catch (error) {
      console.error('Erreur lors du rejet:', {
        message: error.message,
        response: error.response?.data
      });
      const errorMessage = error.response?.data?.message || 'Erreur lors du rejet de l\'annonce';
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  useEffect(() => {
    fetchAnnonces();
  }, []);

  const handleViewDetails = (annonce) => {
    setSelectedAnnonce(annonce);
    setOpenDetailsDialog(true);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleRetry = () => {
    fetchAnnonces();
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      
      <Container maxWidth="lg" sx={{ py: 6, mt: 10 }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 6,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 3, sm: 0 }
        }}>
          <Typography
            variant="h6"
            component="h3"
            sx={{
              fontWeight: 600,
              color: "#000000",
              fontSize: isMobile ? "1.5rem" : "2rem",
              mb: isMobile ? 2 : 4
            }}
          >
            Annonces Publiées
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'grid', gap: 3 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={200}
                sx={{
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.primary.main, 0.1)
                }}
              />
            ))}
          </Box>
        ) : error ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              my: 4,
              border: `1px dashed ${theme.palette.divider}`,
              borderRadius: 4
            }}
          >
            <Typography variant="h6" color="error" gutterBottom>
              {error}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRetry}
              sx={{ borderRadius: 2, mt: 2 }}
            >
              Réessayer
            </Button>
          </Paper>
        ) : annonces.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              my: 4,
              border: `1px dashed ${theme.palette.divider}`,
              borderRadius: 4
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Aucune annonce publiée pour le moment.
            </Typography>
          </Paper>
        ) : (
          <Box>
            {annonces.map(annonce => (
              <AnnonceCard
                key={annonce._id}
                annonce={annonce}
                onView={handleViewDetails}
              />
            ))}
          </Box>
        )}
      </Container>

      <DetailsModal
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        annonce={selectedAnnonce}
        onValidate={handleValidate}
        onReject={handleReject}
      />

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: '100%',
            borderRadius: 2,
            boxShadow: theme.shadows[6]
          }}
          elevation={6}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default AnnoncesPubliees;