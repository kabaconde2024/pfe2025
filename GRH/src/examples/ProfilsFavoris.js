import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Container,
  Grid,
  Box,
  IconButton,
  Button,
  Chip,
  Avatar,
  Skeleton,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Stack,
  Fade,
} from '@mui/material';
import {
  Search,
  Star,
  StarBorder,
  LocationOn,
  AttachMoney,
  WorkOutline,
  Code,
  Brush,
  Public,
  People,
  VideoCall,
  Close,
  Info,
  Description,
  Download,
  Schedule,
} from '@mui/icons-material';
import axios from 'axios';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';

// Custom Styles
const JobCard = styled(Card)(({ theme }) => ({
  borderRadius: '12px',
  boxShadow: theme.shadows[3],
  background: '#ffffff',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
  position: 'relative',
  marginBottom: theme.spacing(3),
}));

const ContractBadge = styled(Box)(({ theme, contracttype }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  padding: theme.spacing(0.75, 2),
  backgroundColor: '#32e1e9',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.85rem',
  borderRadius: '0 12px 12px 0',
  zIndex: 1,
  transform: 'translateX(-10%)',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-10px',
    width: '10px',
    height: '100%',
    background: 'inherit',
    clipPath: 'polygon(100% 0, 0 50%, 100% 100%)',
  },
}));

const FilterContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  background: '#ffffff',
  boxShadow: theme.shadows[2],
  marginBottom: theme.spacing(4),
  transition: 'box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
  overflowX: 'auto',
}));

const MetierIcon = ({ metier = '' }) => {
  const color = '#32e1e9';
  switch (metier) {
    case 'Développeur': return <Code fontSize="small" sx={{ color }} />;
    case 'Designer': return <Brush fontSize="small" sx={{ color }} />;
    case 'Marketing': return <Public fontSize="small" sx={{ color }} />;
    case 'Commercial': return <People fontSize="small" sx={{ color }} />;
    case 'RH': return <WorkOutline fontSize="small" sx={{ color }} />;
    default: return <WorkOutline fontSize="small" sx={{ color }} />;
  }
};

MetierIcon.propTypes = {
  metier: PropTypes.string,
};

const ProfilsFavoris = () => {
  const navigate = useNavigate();
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedAnnonces, setSavedAnnonces] = useState([]);
  const [entretienStatus, setEntretienStatus] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 8,
    total: 0,
  });
  const [filters, setFilters] = useState({
    searchText: '',
    metier: '',
    localisation: '',
    typeContrat: '',
  });
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [selectedAnnonce, setSelectedAnnonce] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAnnonceDetails, setSelectedAnnonceDetails] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const validContractTypes = ['CDI', 'CDD', 'Stage', 'Alternance'];

  const isNewAnnonce = (createdAt) => {
    const now = new Date();
    const diffInDays = (now - new Date(createdAt)) / (1000 * 60 * 60 * 24);
    return diffInDays <= 3;
  };

  const fetchSavedAnnonces = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const searchTextLower = filters.searchText.toLowerCase().trim();
      const typeContrat = validContractTypes.includes(filters.typeContrat)
        ? filters.typeContrat
        : undefined;

      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchTextLower || undefined,
        metier: filters.metier || undefined,
        localisation: filters.localisation || undefined,
        typeContrat: typeContrat,
      };

      const response = await axios.get('http://localhost:5000/api/annonces/saved', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      let fetchedAnnonces = response.data.annonces || response.data;

      if (typeContrat) {
        const originalLength = fetchedAnnonces.length;
        fetchedAnnonces = fetchedAnnonces.filter(
          (annonce) =>
            annonce.typeContrat &&
            annonce.typeContrat.trim().toLowerCase() === typeContrat.toLowerCase()
        );
        if (fetchedAnnonces.length === 0 && originalLength > 0) {
          setSnackbar({
            open: true,
            message: `Aucune annonce valide trouvée pour le type de contrat "${typeContrat}".`,
            severity: 'info',
          });
        }
      }

      setAnnonces(fetchedAnnonces);
      setSavedAnnonces(fetchedAnnonces.map((annonce) => annonce._id));
      setPagination({
        ...pagination,
        total: response.data.total || fetchedAnnonces.length,
      });

      const entretienPromises = fetchedAnnonces.map(async (annonce) => {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/entretiens/check/annonce/${annonce._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          return { id: annonce._id, ...response.data };
        } catch (error) {
          console.error(`Erreur vérification entretien pour annonce ${annonce._id}:`, error);
          return { id: annonce._id, planned: false };
        }
      });

      const entretienResults = await Promise.all(entretienPromises);
      const newEntretienStatus = entretienResults.reduce((acc, result) => ({
        ...acc,
        [result.id]: {
          planned: result.planned,
          meet_link: result.meet_link,
          date_entretien: result.date_entretien,
        },
      }), {});
      setEntretienStatus(newEntretienStatus);

      if (fetchedAnnonces.length === 0) {
        setSnackbar({
          open: true,
          message: `Aucune annonce trouvée pour les critères sélectionnés.`,
          severity: 'info',
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des favoris.',
        severity: 'error',
      });
      setAnnonces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedAnnonces();
  }, [pagination.current, filters]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, current: 1 });
  };

  const resetFilters = () => {
    setFilters({
      searchText: '',
      metier: '',
      localisation: '',
      typeContrat: '',
    });
    setPagination({ ...pagination, current: 1 });
    fetchSavedAnnonces();
  };

  const removeFromFavorites = async (annonceId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/annonces/${annonceId}/toggle-save`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSavedAnnonces(savedAnnonces.filter((id) => id !== annonceId));
      setAnnonces(annonces.filter((annonce) => annonce._id !== annonceId));
      setSnackbar({
        open: true,
        message: 'Annonce retirée des favoris.',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors de la suppression.',
        severity: 'error',
      });
    }
  };

  const handleOpenInterviewDialog = (annonce) => {
    setSelectedAnnonce(annonce);
    setInterviewDialogOpen(true);
    setInterviewDate('');
    setMeetLink('');
  };

  const handleCloseInterviewDialog = () => {
    setInterviewDialogOpen(false);
    setSelectedAnnonce(null);
  };

  const handleOpenDetailsModal = (annonce) => {
    setSelectedAnnonceDetails(annonce);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedAnnonceDetails(null);
  };

  const scheduleInterview = async () => {
    if (!selectedAnnonce || !interviewDate || !meetLink) {
      setSnackbar({
        open: true,
        message: 'Informations incomplètes. Veuillez vérifier les détails.',
        severity: 'warning',
      });
      return;
    }

    const candidatId = selectedAnnonce.candidat?._id;
    const annonceId = selectedAnnonce._id;

    if (!candidatId || candidatId === 'inconnu' || candidatId.length !== 24) {
      setSnackbar({
        open: true,
        message: 'ID candidat invalide ou inconnu.',
        severity: 'error',
      });
      return;
    }

    if (!annonceId || !/^[0-9a-fA-F]{24}$/.test(annonceId)) {
      setSnackbar({
        open: true,
        message: 'ID annonce invalide.',
        severity: 'error',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/entretiens/from-annonce',
        {
          candidat_id: candidatId,
          annonce_id: annonceId,
          date_entretien: new Date(interviewDate).toISOString(),
          meet_link: meetLink,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Entretien créé avec succès.',
          severity: 'success',
        });
        handleCloseInterviewDialog();
        setEntretienStatus({
          ...entretienStatus,
          [selectedAnnonce._id]: {
            planned: true,
            meet_link: meetLink,
            date_entretien: new Date(interviewDate).toISOString(),
          },
        });
      } else {
        throw new Error(response.data.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur création entretien:', error.response?.data || error);
      setSnackbar({
        open: true,
        message: error.response?.data.message || 'Erreur lors de la création de l\'entretien.',
        severity: 'error',
      });
    }
  };

  const joinInterview = (meetLink) => {
    if (meetLink) {
      window.open(meetLink, '_blank', 'noopener,noreferrer');
    } else {
      setSnackbar({
        open: true,
        message: 'Lien de réunion non disponible.',
        severity: 'error',
      });
    }
  };

  const handleOpenCv = async (annonceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/annonces/${annonceId}/cv`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);

      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        setSnackbar({
          open: true,
          message: 'Veuillez autoriser les popups pour visualiser le CV. Le téléchargement va commencer.',
          severity: 'warning',
        });

        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', 'CV.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Erreur d\'ouverture du CV:', error);
      let message = 'Échec de l\'ouverture du CV.';
      if (error.response) {
        if (error.response.status === 404) {
          message = error.response.data.message || 'CV non trouvé pour cette annonce.';
        } else if (error.response.status === 400) {
          message = error.response.data.message || 'Requête invalide.';
        } else {
          message = error.response.data.message || 'Erreur serveur lors de l\'ouverture du CV.';
        }
      }
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    }
  };

  const handleDownloadCv = async (annonceId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/annonces/${annonceId}/cv`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'CV.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnackbar({
        open: true,
        message: 'Téléchargement du CV réussi.',
        severity: 'success',
      });
    } catch (error) {
      console.error('Erreur de téléchargement du CV:', error);
      let message = 'Échec du téléchargement du CV.';
      if (error.response) {
        if (error.response.status === 404) {
          message = error.response.data.message || 'CV non trouvé pour cette annonce.';
        } else if (error.response.status === 400) {
          message = error.response.data.message || 'Requête invalide.';
        } else {
          message = error.response.data.message || 'Erreur serveur lors du téléchargement du CV.';
        }
      }
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 6, mt: 6, bgcolor: '#ffffff' }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 700,
            color: '#1a202c',
            mb: 4,
            fontFamily: '"Inter", sans-serif',
          }}
        >
          Mes Profils Favoris
        </Typography>

        <FilterContainer>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <Search sx={{ color: '#718096', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Rechercher dans les favoris"
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange('searchText', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 10px 10px 40px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <select
                value={filters.metier}
                onChange={(e) => handleFilterChange('metier', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <option value="">Tous les métiers</option>
                <option value="Développeur">Développeur</option>
                <option value="Designer">Designer</option>
                <option value="Marketing">Marketing</option>
                <option value="Commercial">Commercial</option>
                <option value="RH">RH</option>
              </select>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <input
                type="text"
                placeholder="Localisation"
                value={filters.localisation}
                onChange={(e) => handleFilterChange('localisation', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <select
                value={filters.typeContrat}
                onChange={(e) => handleFilterChange('typeContrat', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <option value="">Tous les contrats</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Stage">Stage</option>
                <option value="Alternance">Alternance</option>
              </select>
            </Grid>
            <Grid item xs={12} sm={12} md={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="contained"
                  onClick={fetchSavedAnnonces}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    bgcolor: '#32e1e9',
                    '&:hover': { bgcolor: '#2bc8d0' },
                    px: 3,
                  }}
                >
                  Rechercher
                </Button>
                <Button
                  variant="outlined"
                  onClick={resetFilters}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    borderColor: '#32e1e9',
                    color: '#32e1e9',
                    '&:hover': { borderColor: '#2bc8d0', color: '#2bc8d0' },
                    px: 3,
                  }}
                >
                  Réinitialiser
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </FilterContainer>

        {loading ? (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Skeleton
                  variant="rectangular"
                  height={300}
                  sx={{ borderRadius: '12px', bgcolor: '#e2e8f0' }}
                />
              </Grid>
            ))}
          </Grid>
        ) : annonces.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#ffffff', borderRadius: '12px', boxShadow: 2 }}>
            <Typography variant="h5" sx={{ mb: 2, color: '#1a202c' }}>
              {filters.searchText || filters.metier || filters.localisation || filters.typeContrat
                ? 'Aucune annonce ne correspond à vos critères'
                : 'Vous n\'avez aucune annonce sauvegardée'}
            </Typography>
            <Typography variant="body1" sx={{ color: '#718096' }}>
              Essayez d'autres filtres ou réinitialisez pour voir toutes les annonces.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {annonces.map((annonce) => (
              <Grid item xs={12} sm={6} md={4} key={annonce._id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <JobCard>
                    <ContractBadge contracttype={annonce.typeContrat}>
                      {annonce.typeContrat}
                    </ContractBadge>
                    <CardContent sx={{ pt: 4, pb: 2 }}>
                      {isNewAnnonce(annonce.createdAt) && (
                        <Chip
                          label="Nouveau"
                          size="small"
                          sx={{
                            mb: 2,
                            bgcolor: '#fb8c00',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '6px',
                          }}
                        />
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={annonce.candidat?.photoProfil}
                          sx={{
                            width: 40,
                            height: 40,
                            mr: 2,
                            border: '2px solid #e2e8f0',
                          }}
                        />
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: '#1a202c',
                              fontFamily: '"Inter", sans-serif',
                            }}
                          >
                            {annonce.titre}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            {annonce.metier && (
                              <Chip
                                label={annonce.metier}
                                size="small"
                                icon={<MetierIcon metier={annonce.metier} />}
                                sx={{
                                  bgcolor: '#e3f2fd',
                                  color: '#32e1e9',
                                  borderRadius: '6px',
                                }}
                              />
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocationOn sx={{ color: '#718096', fontSize: 18, mr: 0.5 }} />
                              <Typography variant="body2" sx={{ color: '#718096' }}>
                                {annonce.localisation}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#4a5568',
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {annonce.description}
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#1a202c' }}>
                          Compétences :
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {annonce.competencesRequises?.slice(0, 3).map((comp) => (
                            <Chip
                              key={comp}
                              label={comp}
                              size="small"
                              sx={{
                                bgcolor: '#edf2f7',
                                color: '#4a5568',
                                borderRadius: '6px',
                              }}
                            />
                          ))}
                          {annonce.competencesRequises?.length > 3 && (
                            <Chip
                              label={`+${annonce.competencesRequises.length - 3}`}
                              size="small"
                              sx={{
                                bgcolor: '#edf2f7',
                                color: '#4a5568',
                                borderRadius: '6px',
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Schedule sx={{ color: '#718096', fontSize: 18, mr: 0.5 }} />
                        <Typography variant="caption" sx={{ color: '#718096' }}>
                          {new Date(annonce.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      {annonce.salaireSouhaite && (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a202c' }}>
                          {annonce.salaireSouhaite}
                        </Typography>
                      )}
                    </Box>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, bgcolor: '#fafafa' }}>
                      <Button
                        startIcon={<VideoCall />}
                        onClick={() =>
                          entretienStatus[annonce._id]?.planned
                            ? joinInterview(entretienStatus[annonce._id].meet_link)
                            : handleOpenInterviewDialog(annonce)
                        }
                        variant="contained"
                        size="small"
                        sx={{
                          borderRadius: '8px',
                          textTransform: 'none',
                          bgcolor: '#32e1e9',
                          '&:hover': { bgcolor: '#2bc8d0' },
                        }}
                      >
                        {entretienStatus[annonce._id]?.planned ? 'Joindre' : 'Contacter'}
                      </Button>
                      <IconButton onClick={() => handleOpenDetailsModal(annonce)}>
                        <Info sx={{ color: '#718096' }} />
                      </IconButton>
                      <IconButton onClick={() => removeFromFavorites(annonce._id)}>
                        {savedAnnonces.includes(annonce._id) ? (
                          <Star sx={{ color: '#fb8c00' }} />
                        ) : (
                          <StarBorder sx={{ color: '#718096' }} />
                        )}
                      </IconButton>
                    </CardActions>
                  </JobCard>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}

        {annonces.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <Pagination
              count={Math.ceil(pagination.total / pagination.pageSize)}
              page={pagination.current}
              onChange={(_, page) => setPagination({ ...pagination, current: page })}
              color="primary"
              showFirstButton
              showLastButton
              sx={{
                bgcolor: '#ffffff',
                p: 1,
                borderRadius: '8px',
                boxShadow: 2,
                '& .MuiPaginationItem-root': {
                  borderRadius: '8px',
                },
              }}
            />
          </Box>
        )}
      </Container>

      <Dialog
        open={interviewDialogOpen}
        onClose={handleCloseInterviewDialog}
        maxWidth="sm"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: '12px', boxShadow: 8 } }}
        TransitionComponent={Fade}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: '#fafafa',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c' }}>
            Planifier un entretien
          </Typography>
          <IconButton onClick={handleCloseInterviewDialog}>
            <Close sx={{ color: '#718096' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 3, bgcolor: '#ffffff' }}>
          {selectedAnnonce && (
            <Typography variant="subtitle1" sx={{ color: '#1a202c', mb: 2 }}>
              Avec {selectedAnnonce.candidat?.nom || 'Candidat inconnu'}
            </Typography>
          )}
          <input
            type="datetime-local"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '1rem',
              backgroundColor: '#ffffff',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '16px',
            }}
          />
          <input
            type="url"
            placeholder="https://meet.google.com/xxx-yyyy-zzz"
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '1rem',
              backgroundColor: '#ffffff',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', p: 2, bgcolor: '#fafafa' }}>
          <Button
            onClick={handleCloseInterviewDialog}
            variant="outlined"
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: '#718096',
              color: '#718096',
              '&:hover': { borderColor: '#32e1e9', color: '#32e1e9' },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={scheduleInterview}
            variant="contained"
            startIcon={<VideoCall />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              bgcolor: '#32e1e9',
              '&:hover': { bgcolor: '#2bc8d0' },
            }}
          >
            Planifier
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: '12px', boxShadow: 8 } }}
        TransitionComponent={Fade}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: '#fafafa',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a202c' }}>
            Détails de l'annonce
          </Typography>
          <IconButton onClick={handleCloseDetailsModal}>
            <Close sx={{ color: '#718096' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 4, bgcolor: '#ffffff' }}>
          {selectedAnnonceDetails && (
            <Box>
              <Box sx={{ mb: 3, p: 3, bgcolor: '#fafafa', borderRadius: '8px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    src={selectedAnnonceDetails.candidat?.photoProfil}
                    sx={{
                      width: 56,
                      height: 56,
                      mr: 2,
                      border: '2px solid #e2e8f0',
                    }}
                  />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c' }}>
                      {selectedAnnonceDetails.titre}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Chip
                        label={selectedAnnonceDetails.metier}
                        icon={<MetierIcon metier={selectedAnnonceDetails.metier} />}
                        sx={{
                          bgcolor: '#e3f2fd',
                          color: '#32e1e9',
                          borderRadius: '6px',
                        }}
                      />
                      <Chip
                        label={selectedAnnonceDetails.typeContrat}
                        sx={{
                          bgcolor: '#edf2f7',
                          color: '#4a5568',
                          borderRadius: '6px',
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOn sx={{ color: '#718096', fontSize: 18, mr: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#718096' }}>
                          {selectedAnnonceDetails.localisation}
                        </Typography>
                      </Box>
                    </Box>
                    {selectedAnnonceDetails.salaireSouhaite && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <AttachMoney sx={{ color: '#718096', fontSize: 18, mr: 0.5 }} />
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a202c' }}>
                          {selectedAnnonceDetails.salaireSouhaite.toLocaleString()} €
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mb: 3, p: 3, bgcolor: '#fafafa', borderRadius: '8px' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c', mb: 2 }}>
                  Description
                </Typography>
                <Typography sx={{ color: '#4a5568' }}>
                  {selectedAnnonceDetails.description}
                </Typography>
              </Box>
              <Box sx={{ mb: 3, p: 3, bgcolor: '#fafafa', borderRadius: '8px' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c', mb: 2 }}>
                  Compétences requises
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedAnnonceDetails.competencesRequises?.map((comp) => (
                    <Chip
                      key={comp}
                      label={comp}
                      sx={{
                        bgcolor: '#edf2f7',
                        color: '#4a5568',
                        borderRadius: '6px',
                      }}
                    />
                  ))}
                </Box>
              </Box>
              <Box sx={{ mb: 3, p: 3, bgcolor: '#fafafa', borderRadius: '8px' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c', mb: 2 }}>
                  CV du candidat
                </Typography>
                {selectedAnnonceDetails.profilCv?.cv ? (
                  <Box>
                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<Description />}
                        onClick={() => handleOpenCv(selectedAnnonceDetails._id)}
                        sx={{
                          borderRadius: '8px',
                          textTransform: 'none',
                          bgcolor: '#32e1e9',
                          '&:hover': { bgcolor: '#2bc8d0' },
                          flex: 1,
                        }}
                      >
                        Visualiser
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={() =>
                          handleDownloadCv(
                            selectedAnnonceDetails._id,
                            selectedAnnonceDetails.profilCv.cv.originalname || 'CV.pdf'
                          )
                        }
                        sx={{
                          borderRadius: '8px',
                          textTransform: 'none',
                          borderColor: '#32e1e9',
                          color: '#32e1e9',
                          '&:hover': { borderColor: '#2bc8d0', color: '#2bc8d0' },
                          flex: 1,
                        }}
                      >
                        Télécharger
                      </Button>
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#4a5568' }}>
                      Nom du fichier: {selectedAnnonceDetails.profilCv.cv.originalname || 'CV.pdf'}
                      <br />
                      Format: {selectedAnnonceDetails.profilCv.cv.mimetype || 'application/pdf'}
                      <br />
                      Taille: {(selectedAnnonceDetails.profilCv.cv.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#4a5568' }}>
                    Aucun CV disponible pour ce candidat.
                  </Typography>
                )}
              </Box>
              <Box sx={{ p: 3, bgcolor: '#fafafa', borderRadius: '8px' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c', mb: 2 }}>
                  Informations
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Schedule sx={{ color: '#718096', fontSize: 18, mr: 0.5 }} />
                  <Typography variant="body2" sx={{ color: '#4a5568' }}>
                    Publié le {new Date(selectedAnnonceDetails.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', p: 2, bgcolor: '#fafafa' }}>
          <Button
            onClick={handleCloseDetailsModal}
            variant="outlined"
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: '#718096',
              color: '#718096',
              '&:hover': { borderColor: '#32e1e9', color: '#32e1e9' },
            }}
          >
            Fermer
          </Button>
          <Button
            onClick={() => {
              handleCloseDetailsModal();
              if (selectedAnnonceDetails) {
                entretienStatus[selectedAnnonceDetails._id]?.planned
                  ? joinInterview(entretienStatus[selectedAnnonceDetails._id].meet_link)
                  : handleOpenInterviewDialog(selectedAnnonceDetails);
              }
            }}
            variant="contained"
            startIcon={<VideoCall />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              bgcolor: '#32e1e9',
              '&:hover': { bgcolor: '#2bc8d0' },
            }}
          >
            {entretienStatus[selectedAnnonceDetails?._id]?.planned ? 'Joindre' : 'Contacter le candidat'}
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
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: '100%',
            borderRadius: '8px',
            boxShadow: 4,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default ProfilsFavoris;