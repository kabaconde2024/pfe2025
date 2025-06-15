import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  Paper,
  Typography,
  useTheme,
  Menu,
  MenuItem,
  Collapse,
  TextField,
  FormControl,
  InputLabel,
  Select,
  ListItemIcon,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Visibility as EyeIcon,
  Refresh as RefreshIcon,
  Work as WorkIcon,
  MoreVert as MoreVertIcon,
  VideoCameraBack as VideoIcon,
  Description as PdfIcon,
  CheckCircle,
  Cancel,
  Schedule,
  Download,
  PlayCircle,
  FilterAlt,
  Clear,
  History as HistoryIcon,
  Info as InfoIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/fr';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';

moment.locale('fr');

const API_BASE_URL = 'http://localhost:5000';

const SuiviBoostageCandidatures = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [candidatures, setCandidatures] = useState([]);
  const [filteredCandidatures, setFilteredCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreOffre, setFiltreOffre] = useState('');
  const [statusFilter, setStatusFilter] = useState('Boostage proposé'); // Filtre par défaut sur boostage
  const [datePostulationFilter, setDatePostulationFilter] = useState('');
  const [expirationDateFilter, setExpirationDateFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [boostageDialogOpen, setBoostageDialogOpen] = useState(false);
  const [selectedCandidatureId, setSelectedCandidatureId] = useState(null);
  const [currentCandidature, setCurrentCandidature] = useState(null);
  const [statusAction, setStatusAction] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [snackbarTimeout, setSnackbarTimeout] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [boostageReasons, setBoostageReasons] = useState([]);
  const [newReason, setNewReason] = useState('');

  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 4,
      flexWrap: 'wrap',
      gap: 2,
      background: theme.palette.background.paper,
      p: 3,
      borderRadius: '16px',
      boxShadow: theme.shadows[2],
    },
    filterField: {
      minWidth: 150,
      background: theme.palette.background.default,
      borderRadius: '12px',
      '& .MuiOutlinedInput-root': {
        '&:hover fieldset': { borderColor: theme.palette.divider },
        '&.Mui-focused fieldset': { borderColor: '#0288d1' },
      },
    },
    actionButton: {
      borderRadius: '12px',
      textTransform: 'none',
      fontWeight: 600,
      px: 3,
      py: 1,
      color: '#616161',
      borderColor: '#616161',
      '&:hover': { bgcolor: '#f5f5f5' },
    },
    chip: {
      borderRadius: '8px',
      fontWeight: 600,
      px: 1,
      py: 0.5,
    },
    dialog: {
      borderRadius: '20px',
      p: 3,
      background: theme.palette.background.paper,
      boxShadow: theme.shadows[8],
    },
    menuIcon: {
      color: theme.palette.text.secondary,
      '&:hover': { color: '#0288d1' },
    },
    boostageReasonInput: {
      mb: 2,
      background: theme.palette.background.default,
      borderRadius: '12px',
      '& .MuiOutlinedInput-root': {
        '&:hover fieldset': { borderColor: theme.palette.divider },
        '&.Mui-focused fieldset': { borderColor: '#0288d1' },
      },
    },
  };

  const primaryButtonStyle = {
    bgcolor: '#0288d1',
    color: '#ffffff',
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    '&:hover': { bgcolor: '#01579b' },
  };

  const showSnackbar = useCallback((message, severity) => {
    if (snackbarTimeout) clearTimeout(snackbarTimeout);
    setSnackbar({ open: true, message, severity });
    const timeout = setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, open: false }));
    }, 8000);
    setSnackbarTimeout(timeout);
  }, [snackbarTimeout]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Aucun token trouvé');
      const response = await axios.get(`${API_BASE_URL}/api/utilisateur/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || 'Erreur lors de la récupération de l\'utilisateur',
        'error'
      );
      return null;
    }
  }, [showSnackbar]);

  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  const cleanVisitedCandidatures = useCallback(() => {
    try {
      const visitedCandidatures = JSON.parse(localStorage.getItem('visitedCandidatures') || '[]');
      const validVisits = visitedCandidatures.filter(
        (c) =>
          c &&
          c._id &&
          c.candidat_id &&
          isValidObjectId(c.candidat_id) &&
          c.offre?._id
      );
      localStorage.setItem('visitedCandidatures', JSON.stringify(validVisits));
      return validVisits;
    } catch (error) {
      showSnackbar('Erreur lors du nettoyage des candidatures visitées', 'error');
      return [];
    }
  }, [showSnackbar]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'Boostage accepté':
        return 'success';
      case 'Boostage refusé':
        return 'error';
      case 'Boostage proposé':
      case 'Boostage terminé':
        return 'info';
      default:
        return 'default';
    }
  }, []);

  const checkInterviewScheduled = useCallback(async (candidatureId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');
      const response = await axios.get(`${API_BASE_URL}/api/entretiens/check/${candidatureId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return {
        planned: response.data.planned,
        meet_link: response.data.meet_link || null,
        entretien_id: response.data.entretien_id || null,
        date_entretien: response.data.date_entretien || null,
      };
    } catch (error) {
      showSnackbar("Erreur lors de la vérification de l'entretien", "error");
      return { planned: false, meet_link: null, entretien_id: null, date_entretien: null };
    }
  }, [showSnackbar]);

  const applyFilters = useCallback(() => {
    const filtered = candidatures.filter((candidature) => {
      const matchesOffre =
        !filtreOffre ||
        (candidature.offre?.titre &&
          candidature.offre.titre.toLowerCase().includes(filtreOffre.toLowerCase()));
      const matchesStatus = !statusFilter || candidature.statut === statusFilter;
      const matchesDatePostulation =
        !datePostulationFilter ||
        (candidature.datePostulation &&
          moment(candidature.datePostulation).isSame(moment(datePostulationFilter), 'day'));
      const matchesExpirationDate =
        !expirationDateFilter ||
        (candidature.offre?.dateExpiration &&
          moment(candidature.offre.dateExpiration).isSame(moment(expirationDateFilter), 'day'));
      return matchesOffre && matchesStatus && matchesDatePostulation && matchesExpirationDate;
    }).filter((c) => c.statut && c.statut.startsWith('Boostage')); // Filtrer uniquement les candidatures en boostage
    setFilteredCandidatures(filtered);
    setCurrentPage(1);
  }, [candidatures, filtreOffre, statusFilter, datePostulationFilter, expirationDateFilter]);

  const handleDownloadFile = useCallback(
    async (candidatureId, filename, endpoint) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Token manquant');
        const response = await axios.get(`${API_BASE_URL}/api/candidatures/${candidatureId}/${endpoint}`, {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` },
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showSnackbar(`Téléchargement du ${endpoint === 'cv' ? 'CV' : endpoint === 'video' ? 'vidéo' : 'lettre'} réussi`, 'success');
      } catch (error) {
        const message =
          error.response?.status === 404
            ? `Le ${endpoint === 'cv' ? 'CV' : endpoint === 'video' ? 'vidéo' : 'lettre'} n'est pas disponible`
            : error.message === 'Token manquant'
            ? 'Accès non autorisé. Veuillez vous reconnecter'
            : `Échec du téléchargement du ${endpoint === 'cv' ? 'CV' : endpoint === 'video' ? 'vidéo' : 'lettre'}`;
        showSnackbar(message, 'error');
      }
    },
    [showSnackbar]
  );

  const handleFileOpen = useCallback(
    async (url, fileType) => {
      if (!url) {
        showSnackbar(`Aucun ${fileType} disponible`, 'error');
        return;
      }
      if (fileType === 'vidéo de motivation' || fileType === 'lien de réunion') {
        try {
          const isValidUrl = /^https?:\/\//.test(url);
          if (!isValidUrl) throw new Error('URL invalide');
          window.open(url, '_blank');
          showSnackbar(`${fileType} ouvert dans un nouvel onglet`, 'success');
        } catch (error) {
          try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Token manquant');
            const response = await axios.get(url, {
              responseType: 'blob',
              headers: { Authorization: `Bearer ${token}` },
            });
            const contentType = response.headers['content-type'];
            if (fileType === 'vidéo de motivation' && !contentType.includes('video')) {
              throw new Error('Le fichier reçu n\'est pas une vidéo');
            }
            const blob = new Blob([response.data], { type: contentType });
            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            window.URL.revokeObjectURL(blobUrl);
            showSnackbar(`${fileType} ouvert dans un nouvel onglet`, 'success');
          } catch (blobError) {
            let message = `Erreur lors de l'ouverture de ${fileType}`;
            if (blobError.response?.status === 404) {
              message = `Le ${fileType} n'est pas disponible`;
            } else if (blobError.response?.status === 401 || blobError.message === 'Token manquant') {
              message = 'Accès non autorisé. Veuillez vous reconnecter';
            } else if (blobError.message.includes('pas une vidéo')) {
              message = 'Le fichier reçu n\'est pas une vidéo valide';
            } else if (blobError.message.includes('Network Error')) {
              message = 'Erreur réseau. Vérifiez votre connexion ou le serveur';
            }
            showSnackbar(message, 'error');
          }
        }
      } else {
        try {
          const token = localStorage.getItem('token');
          if (!token) throw new Error('Token manquant');
          const response = await axios.get(`${url}?view=true`, {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${token}` },
          });
          const blob = new Blob([response.data], { type: response.headers['content-type'] });
          const blobUrl = window.URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          window.URL.revokeObjectURL(blobUrl);
          showSnackbar(`${fileType} ouvert dans un nouvel onglet`, 'success');
        } catch (error) {
          let message = `Erreur lors de l'ouverture du ${fileType}`;
          if (error.response?.status === 404) {
            message = `Le ${fileType} n'est pas disponible`;
          } else if (error.response?.status === 401 || error.message === 'Token manquant') {
            message = 'Accès non autorisé. Veuillez vous reconnecter';
          } else if (error.message.includes('Network Error')) {
            message = 'Erreur réseau. Vérifiez votre connexion ou le serveur';
          }
          showSnackbar(message, 'error');
        }
      }
    },
    [showSnackbar]
  );

  const recordVisit = useCallback(
    async (candidature) => {
      try {
        if (
          !candidature ||
          !candidature._id ||
          !candidature.candidat?._id ||
          !isValidObjectId(candidature.candidat._id)
        ) {
          showSnackbar('Erreur : Candidature ou ID du candidat invalide', 'error');
          return;
        }
        if (candidature.interviewScheduled) {
          showSnackbar('Visite non enregistrée : un entretien est déjà planifié', 'info');
          return;
        }
        if (!currentUser || !currentUser.id) {
          showSnackbar('Erreur : Utilisateur connecté non disponible', 'error');
          return;
        }
        const visitedCandidatures = cleanVisitedCandidatures();
        if (
          !visitedCandidatures.some(
            (c) => c._id === candidature._id && c.candidat_id === candidature.candidat._id
          )
        ) {
          const visitRecord = {
            _id: candidature._id,
            candidat_id: candidature.candidat._id,
            userId: currentUser.id,
            candidat: {
              _id: candidature.candidat._id,
              nom: candidature.candidat.nom || 'Inconnu',
              email: candidature.candidat.email || '',
              telephone: candidature.candidat.telephone || '',
            },
            offre: candidature.offre
              ? {
                  _id: candidature.offre._id,
                  titre: candidature.offre.titre || 'Non spécifié',
                  dateExpiration: candidature.offre.dateExpiration || null,
                  competencesRequises: candidature.offre.competencesRequises || [],
                }
              : null,
            profilCv: {
              competences: candidature.profilCv?.competences || [],
              metier: candidature.profilCv?.metier || '',
            },
            statut: candidature.statut || 'En attente',
            datePostulation: candidature.datePostulation || new Date().toISOString(),
            visitedAt: new Date().toISOString(),
            cv: candidature.cv || null,
            videoMotivation: candidature.videoMotivation || null,
            lettreMotivation: candidature.lettreMotivation || null,
          };
          const updatedVisits = [visitRecord, ...visitedCandidatures].slice(0, 10);
          localStorage.setItem('visitedCandidatures', JSON.stringify(updatedVisits));
          const storageEvent = new CustomEvent('localStorageUpdated', {
            detail: { key: 'visitedCandidatures', newValue: JSON.stringify(updatedVisits) },
          });
          window.dispatchEvent(storageEvent);
        }
      } catch (error) {
        showSnackbar('Erreur lors de l\'enregistrement de la visite', 'error');
      }
    },
    [currentUser, cleanVisitedCandidatures, showSnackbar]
  );

  const fetchCandidatures = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');
      const response = await axios.get(`${API_BASE_URL}/api/candidatures`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const candidaturesWithCvAndSkills = await Promise.all(
        response.data.map(async (candidature) => {
          if (!candidature._id) return null;
          const interviewData = await checkInterviewScheduled(candidature._id);
          const requiredSkills = candidature.offre?.competencesRequises || [];
          let cvData = null;
          if (candidature.cv) {
            cvData = {
              url: `${API_BASE_URL}/api/candidatures/${candidature._id}/cv`,
              originalName:
                candidature.cv.originalName ||
                `CV_${(candidature.candidat?.nom || 'Candidat').replace(/\s+/g, '_')}.pdf`,
              contentType: candidature.cv.contentType || 'application/pdf',
              size: candidature.cv.size || 0,
            };
          } else if (candidature.profilCv?.cv) {
            cvData = {
              url: `${API_BASE_URL}/api/candidatures/${candidature._id}/cv`,
              originalName:
                candidature.profilCv.cv.filename ||
                `CV_${(candidature.candidat?.nom || 'Candidat').replace(/\s+/g, '_')}.pdf`,
              contentType: candidature.profilCv.cv.mimetype || 'application/pdf',
              size: candidature.profilCv.cv.size || 0,
            };
          }
          return {
            ...candidature,
            cv: cvData,
            videoMotivation: candidature.videoMotivation
              ? {
                  url: `${API_BASE_URL}/api/candidatures/${candidature._id}/video`,
                  originalName: candidature.videoMotivation.originalName || 'video_motivation.mp4',
                  contentType: candidature.videoMotivation.contentType || 'video/mp4',
                  size: candidature.videoMotivation.size || 0,
                }
              : null,
            lettreMotivation: candidature.lettreMotivation
              ? {
                  url: `${API_BASE_URL}/api/candidatures/${candidature._id}/lettre`,
                  originalName: candidature.lettreMotivation.originalName || 'lettre_motivation.pdf',
                  contentType: candidature.lettreMotivation.contentType || 'application/pdf',
                  size: candidature.lettreMotivation.size || 0,
                }
              : null,
            interviewScheduled: interviewData.planned,
            meet_link: interviewData.meet_link,
            entretien_id: interviewData.entretien_id,
            date_entretien: interviewData.date_entretien,
            requiredSkills,
          };
        })
      );
      const validCandidatures = candidaturesWithCvAndSkills.filter((c) => c !== null);
      setCandidatures(validCandidatures);
      // Filtrer initialement pour les candidatures en boostage
      const boostageCandidatures = validCandidatures.filter((c) => c.statut && c.statut.startsWith('Boostage'));
      setFilteredCandidatures(boostageCandidatures);
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || 'Erreur lors du chargement des candidatures',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [checkInterviewScheduled, showSnackbar]);

  const countMatchingSkills = useCallback((requiredSkills, candidateSkills) => {
    if (!requiredSkills || !candidateSkills) return 0;
    const requiredSkillsArray = Array.isArray(requiredSkills) ? requiredSkills : [requiredSkills];
    const candidateSkillsArray = Array.isArray(candidateSkills) ? candidateSkills : [candidateSkills];
    const normalizedCandidateSkills = candidateSkillsArray.map((skill) =>
      String(skill).toLowerCase().trim()
    );
    const candidateSkillSet = new Set(normalizedCandidateSkills);
    return requiredSkillsArray.reduce((count, skill) => {
      const normalizedSkill = String(skill).toLowerCase().trim();
      return candidateSkillSet.has(normalizedSkill) ? count + 1 : count;
    }, 0);
  }, []);

  const handleOpenConfirmationDialog = useCallback((id, action) => {
    const candidatureToConfirm = candidatures.find((c) => c._id === id);
    if (candidatureToConfirm) {
      setSelectedCandidatureId(id);
      setStatusAction(action);
      setCurrentCandidature(candidatureToConfirm);
      setConfirmationDialogOpen(true);
    } else {
      showSnackbar('Candidature sélectionnée non valide', 'error');
    }
  }, [candidatures, showSnackbar]);

  const handleOpenBoostageDialog = useCallback((candidature) => {
    setCurrentCandidature(candidature);
    setBoostageReasons(candidature.boostage?.raisons || []);
    setNewReason('');
    setBoostageDialogOpen(true);
    recordVisit(candidature);
  }, [recordVisit]);

  const handleCloseBoostageDialog = useCallback(() => {
    setBoostageDialogOpen(false);
    setNewReason('');
    setBoostageReasons([]);
    if (
      !confirmationDialogOpen &&
      !detailsDialogOpen &&
      !interviewDialogOpen
    ) {
      setCurrentCandidature(null);
    }
  }, [confirmationDialogOpen, detailsDialogOpen, interviewDialogOpen]);

  const handleAddReason = useCallback(() => {
    if (newReason.trim()) {
      setBoostageReasons((prev) => [...prev, newReason.trim()]);
      setNewReason('');
    }
  }, [newReason]);

  const handleProposeBoostage = useCallback(async () => {
    if (!currentCandidature || !currentCandidature._id) {
      showSnackbar('Aucune candidature sélectionnée', 'error');
      return;
    }
    if (boostageReasons.length === 0) {
      showSnackbar('Veuillez fournir au moins une raison pour le boostage', 'warning');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');
      await axios.post(
        `${API_BASE_URL}/api/candidatures/${currentCandidature._id}/boostage`,
        { raisons: boostageReasons },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidatures((prev) =>
        prev.map((c) =>
          c._id === currentCandidature._id
            ? { ...c, statut: 'Boostage proposé', boostage: { statut: 'Proposé', raisons: boostageReasons } }
            : c
        )
      );
      setFilteredCandidatures((prev) =>
        prev.map((c) =>
          c._id === currentCandidature._id
            ? { ...c, statut: 'Boostage proposé', boostage: { statut: 'Proposé', raisons: boostageReasons } }
            : c
        )
      );
      showSnackbar('Parcours de boostage proposé avec succès', 'success');
      handleCloseBoostageDialog();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || 'Erreur lors de la proposition de boostage',
        'error'
      );
    }
  }, [currentCandidature, boostageReasons, showSnackbar, handleCloseBoostageDialog]);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/authentication/sign-in');
      return;
    }
    const loadCurrentUser = async () => {
      const user = await fetchCurrentUser();
      if (isMounted && user) setCurrentUser(user);
    };
    loadCurrentUser();
    fetchCandidatures();
    return () => {
      isMounted = false;
      if (snackbarTimeout) clearTimeout(snackbarTimeout);
    };
  }, [navigate, fetchCurrentUser, fetchCandidatures, snackbarTimeout]);

  const handleMenuOpen = useCallback((event, candidature) => {
    setAnchorEl(event.currentTarget);
    setCurrentCandidature(candidature);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleOpenDetailsDialog = useCallback((candidature) => {
    setCurrentCandidature(candidature);
    setDetailsDialogOpen(true);
    recordVisit(candidature);
  }, [recordVisit]);

  const handleCloseDetailsDialog = useCallback(() => {
    setDetailsDialogOpen(false);
    if (
      !interviewDialogOpen &&
      !confirmationDialogOpen &&
      !boostageDialogOpen
    )
      setCurrentCandidature(null);
  }, [interviewDialogOpen, confirmationDialogOpen, boostageDialogOpen]);

  const handleCloseConfirmationDialog = useCallback(() => {
    setConfirmationDialogOpen(false);
    setSelectedCandidatureId(null);
    setStatusAction('');
    if (
      !interviewDialogOpen &&
      !detailsDialogOpen &&
      !boostageDialogOpen
    )
      setCurrentCandidature(null);
  }, [interviewDialogOpen, detailsDialogOpen, boostageDialogOpen]);

  const handleOpenInterviewDialog = useCallback(
    async (candidature, reschedule = false) => {
      if (!candidature || !candidature._id) {
        showSnackbar('Erreur : Candidature invalide', 'error');
        return;
      }
      setCurrentCandidature(candidature);
      if (reschedule) {
        try {
          const interviewData = await checkInterviewScheduled(candidature._id);
          if (
            !interviewData.planned ||
            !interviewData.entretien_id ||
            !interviewData.date_entretien
          ) {
            showSnackbar('Aucun entretien existant à replanifier', 'error');
            return;
          }
          setIsRescheduling(true);
          setInterviewDate(
            new Date(interviewData.date_entretien).toISOString().slice(0, 16)
          );
          setMeetLink(interviewData.meet_link || '');
        } catch (error) {
          showSnackbar("Erreur lors de la vérification de l'entretien", "error");
          return;
        }
      } else {
        setIsRescheduling(false);
        setInterviewDate('');
        setMeetLink('');
      }
      setInterviewDialogOpen(true);
    },
    [checkInterviewScheduled, showSnackbar]
  );

  const handleCloseInterviewDialog = useCallback(() => {
    setInterviewDialogOpen(false);
    setIsRescheduling(false);
    setInterviewDate('');
    setMeetLink('');
    if (
      !confirmationDialogOpen &&
      !detailsDialogOpen &&
      !boostageDialogOpen
    )
      setCurrentCandidature(null);
  }, [confirmationDialogOpen, detailsDialogOpen, boostageDialogOpen]);

  const handleScheduleInterview = useCallback(async () => {
    if (!currentCandidature || !currentCandidature._id) {
      showSnackbar('Aucune candidature sélectionnée', 'error');
      return;
    }
    if (!interviewDate || !meetLink || !/^https?:\/\//.test(meetLink)) {
      showSnackbar('Date ou lien de réunion invalide', 'warning');
      return;
    }
    if (!currentUser || !currentUser.id) {
      showSnackbar('Utilisateur connecté non disponible', 'error');
      return;
    }
    if (!moment(interviewDate).isValid()) {
      showSnackbar('Date d\'entretien invalide', 'warning');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');
      const response = await axios.post(
        `${API_BASE_URL}/api/entretiens`,
        {
          candidature_id: currentCandidature._id,
          candidat_id: currentCandidature.candidat?._id || '',
          offre_id: currentCandidature.offre?._id || '',
          date_entretien: new Date(interviewDate).toISOString(),
          meet_link: meetLink,
          createdBy: currentUser.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidatures((prev) =>
        prev.map((c) =>
          c._id === currentCandidature._id
            ? {
                ...c,
                interviewScheduled: true,
                meet_link: meetLink,
                entretien_id: response.data.entretien_id,
                date_entretien: new Date(interviewDate).toISOString(),
              }
            : c
        )
      );
      setFilteredCandidatures((prev) =>
        prev.map((c) =>
          c._id === currentCandidature._id
            ? {
                ...c,
                interviewScheduled: true,
                meet_link: meetLink,
                entretien_id: response.data.entretien_id,
                date_entretien: new Date(interviewDate).toISOString(),
              }
            : c
        )
      );
      showSnackbar('Entretien planifié avec succès', 'success');
      handleCloseInterviewDialog();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || 'Erreur lors de la planification de l\'entretien',
        'error'
      );
    }
  }, [currentCandidature, interviewDate, meetLink, currentUser, showSnackbar, handleCloseInterviewDialog]);

  const handleRescheduleInterview = useCallback(async () => {
    if (
      !currentCandidature ||
      !currentCandidature._id ||
      !currentCandidature.entretien_id
    ) {
      showSnackbar('Aucun entretien à replanifier', 'error');
      return;
    }
    if (!interviewDate || !meetLink || !/^https?:\/\//.test(meetLink)) {
      showSnackbar('Date ou lien de réunion invalide', 'warning');
      return;
    }
    if (!moment(interviewDate).isValid()) {
      showSnackbar('Date d\'entretien invalide', 'warning');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');
      await axios.put(
        `${API_BASE_URL}/api/entretiens/reschedule/${currentCandidature.entretien_id}`,
        {
          date_entretien: new Date(interviewDate).toISOString(),
          meet_link: meetLink,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidatures((prev) =>
        prev.map((c) =>
          c._id === currentCandidature._id
            ? {
                ...c,
                meet_link: meetLink,
                date_entretien: new Date(interviewDate).toISOString(),
              }
            : c
        )
      );
      setFilteredCandidatures((prev) =>
        prev.map((c) =>
          c._id === currentCandidature._id
            ? {
                ...c,
                meet_link: meetLink,
                date_entretien: new Date(interviewDate).toISOString(),
              }
            : c
        )
      );
      showSnackbar('Entretien replanifié avec succès', 'success');
      handleCloseInterviewDialog();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || 'Erreur lors de la replanification de l\'entretien',
        'error'
      );
    }
  }, [currentCandidature, interviewDate, meetLink, showSnackbar, handleCloseInterviewDialog]);

  const handleUpdateStatut = useCallback(async () => {
    if (!selectedCandidatureId) {
      showSnackbar('Aucune candidature sélectionnée', 'error');
      return;
    }
    const currentSelectedCandidature = candidatures.find((c) => c._id === selectedCandidatureId);
    if (!currentSelectedCandidature) {
      showSnackbar('Candidature non trouvée', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');
      await axios.patch(
        `${API_BASE_URL}/api/candidatures/${selectedCandidatureId}/statut`,
        { statut: statusAction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidatures((prev) =>
        prev.map((c) =>
          c._id === selectedCandidatureId
            ? { ...c, statut: statusAction }
            : c
        )
      );
      setFilteredCandidatures((prev) =>
        prev.map((c) =>
          c._id === selectedCandidatureId ? { ...c, statut: statusAction } : c
        )
      );
      const visitedCandidatures = JSON.parse(localStorage.getItem('visitedCandidatures') || '[]');
      const updatedVisits = visitedCandidatures.map((visit) =>
        visit._id === selectedCandidatureId ? { ...visit, statut: statusAction } : visit
      );
      localStorage.setItem('visitedCandidatures', JSON.stringify(updatedVisits));
      const storageEvent = new CustomEvent('localStorageUpdated', {
        detail: { key: 'visitedCandidatures', newValue: JSON.stringify(updatedVisits) },
      });
      window.dispatchEvent(storageEvent);
      const message = statusAction === 'Boostage terminé' ? 'Boostage terminé' : 'Statut mis à jour';
      showSnackbar(message, 'success');
      handleCloseConfirmationDialog();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || 'Erreur lors de la mise à jour du statut',
        'error'
      );
    }
  }, [
    selectedCandidatureId,
    candidatures,
    statusAction,
    showSnackbar,
    handleCloseConfirmationDialog,
  ]);

  const resetFilters = useCallback(() => {
    setFiltreOffre('');
    setDatePostulationFilter('');
    setExpirationDateFilter('');
    setStatusFilter('Boostage proposé');
    setFilteredCandidatures(candidatures.filter((c) => c.statut && c.statut.startsWith('Boostage')));
    setCurrentPage(1);
  }, [candidatures]);

  const paginate = useCallback((items, pageNumber, pageSize) => {
    const startIndex = (pageNumber - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4, mt: 10 }}>
        {/* Header */}
        <Box sx={styles.header}>
          <Box>
            <Typography
              variant="h3"
              fontWeight={700}
              sx={{
                color: theme.palette.text.primary,
                position: 'relative',
                '&:after': {
                  content: '""',
                  position: 'absolute',
                  bottom: -8,
                  left: 0,
                  width: 80,
                  height: 3,
                  background: `linear-gradient(90deg, #0288d1, #4fc3f7)`,
                  borderRadius: 2,
                },
              }}
            >
              Suivi des Candidatures en Boostage
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
              Consultez et suivez les candidatures en parcours de boostage
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              component={Link}
              to="/recent-visits"
              startIcon={<HistoryIcon />}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                color: '#0288d1',
                '&:hover': { color: '#01579b' },
              }}
              variant="text"
            >
              Historique
            </Button>
            <Button
              variant="contained"
              startIcon={<FilterAlt />}
              onClick={() => setFiltersOpen(!filtersOpen)}
              sx={primaryButtonStyle}
            >
              {filtersOpen ? 'Masquer les filtres' : 'Afficher les filtres'}
            </Button>
          </Box>
        </Box>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={8000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Filtres */}
        <Collapse in={filtersOpen}>
          <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 2, mb: 3 }}>
            <Grid container spacing={2} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Filtre offre */}
              <Grid item xs={12} sm={2.5}>
                <TextField
                  id="filtre-offre"
                  label="Filtrer par offre"
                  type="text"
                  value={filtreOffre}
                  onChange={(e) => setFiltreOffre(e.target.value)}
                  placeholder="Rechercher une offre..."
                  fullWidth
                  size="small"
                  sx={styles.filterField}
                />
              </Grid>
              {/* Date postulation */}
              <Grid item xs={12} sm={2.5}>
                <TextField
                  id="date-postulation"
                  label="Date de postulation"
                  type="date"
                  value={datePostulationFilter}
                  onChange={(e) => setDatePostulationFilter(e.target.value)}
                  fullWidth
                  size="small"
                  sx={styles.filterField}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              {/* Date expiration */}
              <Grid item xs={12} sm={2.5}>
                <TextField
                  id="date-expiration"
                  label="Date d'expiration"
                  type="date"
                  value={expirationDateFilter}
                  onChange={(e) => setExpirationDateFilter(e.target.value)}
                  fullWidth
                  size="small"
                  sx={styles.filterField}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              {/* Statut */}
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small" sx={styles.filterField}>
                  <InputLabel id="status-filter-label">Statut</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    id="status-filter"
                    value={statusFilter}
                    label="Statut"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="Boostage proposé">Boostage proposé</MenuItem>
                    <MenuItem value="Boostage accepté">Boostage accepté</MenuItem>
                    <MenuItem value="Boostage refusé">Boostage refusé</MenuItem>
                    <MenuItem value="Boostage terminé">Boostage terminé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {/* Boutons appliquer / réinitialiser */}
              <Grid item xs={12} sm={2}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      applyFilters();
                      setCurrentPage(1);
                    }}
                    sx={primaryButtonStyle}
                    size="small"
                  >
                    Appliquer
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={resetFilters}
                    startIcon={<Clear />}
                    sx={styles.actionButton}
                    size="small"
                  >
                    Réinitialiser
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Collapse>

        {/* Résultats */}
        {filteredCandidatures.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <WorkIcon sx={{ fontSize: 60, color: theme.palette.text.disabled, mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Aucune candidature en boostage disponible
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Essayez de modifier vos critères de recherche
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchCandidatures}
              sx={primaryButtonStyle}
            >
              Rafraîchir
            </Button>
          </Paper>
        ) : (
          <Box
            sx={{
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: theme.shadows[3],
              width: '100%',
              my: 3,
            }}
          >
            {/* Tableau des candidatures */}
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 600,
                }}
              >
                {/* En-tête */}
                <Box
                  component="thead"
                  sx={{
                    backgroundColor: theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                    fontWeight: 600,
                  }}
                >
                  <tr>
                    <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Candidat</Box>
                    <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Offre</Box>
                    <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Statut Boostage</Box>
                    <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Raisons</Box>
                    <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Actions</Box>
                  </tr>
                </Box>
                {/* Corps */}
                <Box component="tbody">
                  {paginate(filteredCandidatures, currentPage, itemsPerPage).map((candidature) => (
                    <Box
                      key={candidature._id}
                      component="tr"
                      sx={{
                        '&:hover': { backgroundColor: theme.palette.action.hover },
                      }}
                    >
                      <Box component="td" sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        {candidature.candidat?.nom || 'Inconnu'}
                      </Box>
                      <Box component="td" sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        {candidature.offre?.titre || 'Non spécifié'}
                      </Box>
                      <Box component="td" sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <Chip
                          label={candidature.statut}
                          color={getStatusColor(candidature.statut)}
                          size="small"
                          sx={styles.chip}
                        />
                      </Box>
                      <Box component="td" sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        {candidature.boostage?.raisons?.join(', ') || 'Aucune raison'}
                      </Box>
                      <Box component="td" sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, candidature)}
                          sx={styles.menuIcon}
                          aria-label="Plus d'actions"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Pagination */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
              {/* Nombre par page */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">Résultats par page :</Typography>
                <Select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  size="small"
                  sx={{ py: 0.5 }}
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                </Select>
              </Box>
              {/* Navigation */}
              <Box>
                <Button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  sx={styles.actionButton}
                >
                  Précédent
                </Button>
                <Button
                  disabled={currentPage >= Math.ceil(filteredCandidatures.length / itemsPerPage)}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  sx={styles.actionButton}
                >
                  Suivant
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Menu actions */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
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
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          {currentCandidature && (
            <>
              <MenuItem
                onClick={() => {
                  handleOpenDetailsDialog(currentCandidature);
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <InfoIcon color="info" />
                </ListItemIcon>
                Détails
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleOpenConfirmationDialog(currentCandidature._id, 'Boostage terminé');
                  handleMenuClose();
                }}
                disabled={currentCandidature.statut === 'Boostage terminé'}
              >
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                Marquer comme terminé
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleOpenConfirmationDialog(currentCandidature._id, 'Boostage refusé');
                  handleMenuClose();
                }}
                disabled={currentCandidature.statut.includes('Refusée') || currentCandidature.statut === 'Boostage terminé'}
              >
                <ListItemIcon>
                  <Cancel color="error" />
                </ListItemIcon>
                Refuser le boostage
              </MenuItem>
              {!currentCandidature.interviewScheduled && (
                <MenuItem
                  onClick={() => {
                    handleOpenInterviewDialog(currentCandidature, false);
                    handleMenuClose();
                  }}
                  disabled={currentCandidature.statut === 'Boostage terminé'}
                >
                  <ListItemIcon>
                    <Schedule color="primary" />
                  </ListItemIcon>
                  Planifier l'entretien
                </MenuItem>
              )}
              {currentCandidature.interviewScheduled && (
                <MenuItem
                  onClick={() => {
                    handleOpenInterviewDialog(currentCandidature, true);
                    handleMenuClose();
                  }}
                  disabled={currentCandidature.statut === 'Boostage terminé'}
                >
                  <ListItemIcon>
                    <Schedule color="primary" />
                  </ListItemIcon>
                  Replanifier l'entretien
                </MenuItem>
              )}
              {currentCandidature.cv && (
                <MenuItem
                  onClick={() => {
                    handleDownloadFile(
                      currentCandidature._id,
                      currentCandidature.cv.originalName,
                      'cv'
                    );
                    handleMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <Download color="primary" />
                  </ListItemIcon>
                  Télécharger le CV
                </MenuItem>
              )}
              {currentCandidature.videoMotivation?.url && (
                <>
                  <MenuItem
                    onClick={() => {
                      handleFileOpen(
                        currentCandidature.videoMotivation.url,
                        'vidéo de motivation'
                      );
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <PlayCircle />
                    </ListItemIcon>
                    Voir la vidéo
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleDownloadFile(
                        currentCandidature._id,
                        currentCandidature.videoMotivation.originalName,
                        'video'
                      );
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <Download />
                    </ListItemIcon>
                    Télécharger la vidéo
                  </MenuItem>
                </>
              )}
              {currentCandidature.lettreMotivation?.url && (
                <>
                  <MenuItem
                    onClick={() => {
                      handleFileOpen(
                        currentCandidature.lettreMotivation.url,
                        'lettre de motivation'
                      );
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <PdfIcon />
                    </ListItemIcon>
                    Voir la lettre
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleDownloadFile(
                        currentCandidature._id,
                        currentCandidature.lettreMotivation.originalName,
                        'lettre'
                      );
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <Download />
                    </ListItemIcon>
                    Télécharger la lettre
                  </MenuItem>
                </>
              )}
            </>
          )}
        </Menu>

        {/* Dialoge Confirmation statut */}
        <Dialog
          open={confirmationDialogOpen}
          onClose={handleCloseConfirmationDialog}
          PaperProps={{ sx: styles.dialog }}
        >
          <DialogTitle>Confirmer le changement de statut</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Êtes-vous sûr de vouloir marquer cette candidature comme <strong>{statusAction}</strong> ?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCloseConfirmationDialog}
              variant="outlined"
              sx={styles.actionButton}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdateStatut}
              variant="contained"
              sx={primaryButtonStyle}
            >
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialoge Détails */}
        <Dialog
          open={detailsDialogOpen}
          onClose={handleCloseDetailsDialog}
          PaperProps={{ sx: styles.dialog }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Détails de la candidature</DialogTitle>
          <DialogContent>
            {currentCandidature && (
              <Box>
                <Grid container spacing={2}>
                  {/* Candidat */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>Candidat</Typography>
                    <Typography variant="body2">Nom: {currentCandidature.candidat?.nom || 'Inconnu'}</Typography>
                    <Typography variant="body2">Email: {currentCandidature.candidat?.email || 'Non spécifié'}</Typography>
                    {currentCandidature.candidat?.telephone && (
                      <Typography variant="body2">Téléphone: {currentCandidature.candidat.telephone}</Typography>
                    )}
                  </Grid>
                  {/* Offre */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>Offre</Typography>
                    <Typography variant="body2">Titre: {currentCandidature.offre?.titre || 'Non spécifié'}</Typography>
                    {currentCandidature.offre?.dateExpiration && (
                      <Typography variant="body2">
                        Date d'expiration: {moment(currentCandidature.offre.dateExpiration).format('DD/MM/YYYY')}
                      </Typography>
                    )}
                  </Grid>
                  {/* Statut */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>Statut</Typography>
                    <Chip
                      label={currentCandidature.statut}
                      color={getStatusColor(currentCandidature.statut)}
                      size="small"
                      sx={styles.chip}
                    />
                  </Grid>
                  {/* Dates */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>Dates</Typography>
                    <Typography variant="body2">
                      Date de postulation: {moment(currentCandidature.datePostulation).format('DD/MM/YYYY HH:mm')}
                    </Typography>
                    {currentCandidature.date_entretien && (
                      <Typography variant="body2">
                        Date d'entretien: {moment(currentCandidature.date_entretien).format('DD/MM/YYYY HH:mm')}
                      </Typography>
                    )}
                  </Grid>
                  {/* Documents */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600}>Documents</Typography>
                    {/* CV */}
                    {currentCandidature.cv ? (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="body2">CV ({currentCandidature.cv.originalName})</Typography>
                        <Tooltip title="Voir le CV">
                          <IconButton
                            onClick={() => handleFileOpen(currentCandidature.cv.url, 'CV')}
                            color="primary"
                            aria-label="Voir le CV"
                          >
                            <EyeIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger le CV">
                          <IconButton
                            onClick={() =>
                              handleDownloadFile(
                                currentCandidature._id,
                                currentCandidature.cv.originalName,
                                'cv'
                              )
                            }
                            color="primary"
                            aria-label="Télécharger le CV"
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ mb: 1 }}>Aucun CV</Typography>
                    )}
                    {/* Vidéo de motivation */}
                    {currentCandidature.videoMotivation?.url && (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          Vidéo de motivation ({currentCandidature.videoMotivation.originalName})
                        </Typography>
                        <Tooltip title="Voir la vidéo de motivation">
                          <IconButton
                            onClick={() => handleFileOpen(currentCandidature.videoMotivation.url, 'vidéo de motivation')}
                            color="primary"
                            aria-label="Voir la vidéo de motivation"
                          >
                            <VideoIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger la vidéo de motivation">
                          <IconButton
                            onClick={() => handleDownloadFile(currentCandidature._id, currentCandidature.videoMotivation.originalName, 'video')}
                            color="primary"
                            aria-label="Télécharger la vidéo de motivation"
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {/* Lettre de motivation */}
                    {currentCandidature.lettreMotivation?.url && (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          Lettre de motivation ({currentCandidature.lettreMotivation.originalName})
                        </Typography>
                        <Tooltip title="Voir la lettre de motivation">
                          <IconButton
                            onClick={() => handleFileOpen(currentCandidature.lettreMotivation.url, 'lettre de motivation')}
                            color="primary"
                            aria-label="Voir la lettre de motivation"
                          >
                            <PdfIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger la lettre de motivation">
                          <IconButton
                            onClick={() => handleDownloadFile(currentCandidature._id, currentCandidature.lettreMotivation.originalName, 'lettre')}
                            color="primary"
                            aria-label="Télécharger la lettre de motivation"
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {/* Aucun document de motivation */}
                    {!currentCandidature.videoMotivation?.url &&
                      !currentCandidature.lettreMotivation?.url && (
                        <Typography variant="body2" sx={{ mb: 1 }}>Aucun document de motivation</Typography>
                      )}
                    {/* Entretien */}
                    {currentCandidature.interviewScheduled && currentCandidature.meet_link ? (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
                        <Typography variant="body2">Entretien</Typography>
                        <Tooltip title="Rejoindre l'entretien">
                          <IconButton
                            onClick={() => handleFileOpen(currentCandidature.meet_link, 'lien de réunion')}
                            color="primary"
                            aria-label="Rejoindre l'entretien"
                          >
                            <VideoIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ mt: 1 }}>Aucun entretien planifié</Typography>
                    )}
                    {/* Boostage info */}
                    {currentCandidature.boostage && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>Détails du Boostage</Typography>
                        <Typography variant="body2">
                          Statut: {currentCandidature.boostage.statut || 'Non spécifié'}
                        </Typography>
                        {currentCandidature.boostage.raisons?.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight={600}>Raisons du boostage:</Typography>
                            <List dense>
                              {currentCandidature.boostage.raisons.map((reason, index) => (
                                <ListItem key={index}>
                                  <ListItemText primary={reason} />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                        {currentCandidature.boostage.plan && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight={600}>Plan de boostage:</Typography>
                            {currentCandidature.boostage.plan.objectifs?.length > 0 && (
                              <Box>
                                <Typography variant="body2">Objectifs:</Typography>
                                <List dense>
                                  {currentCandidature.boostage.plan.objectifs.map((obj, index) => (
                                    <ListItem key={index}>
                                      <ListItemText primary={obj} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                            {currentCandidature.boostage.plan.formation?.length > 0 && (
                              <Box>
                                <Typography variant="body2">Formations:</Typography>
                                <List dense>
                                  {currentCandidature.boostage.plan.formation.map((form, index) => (
                                    <ListItem key={index}>
                                      <ListItemText primary={form} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                            {currentCandidature.boostage.plan.softSkills?.length > 0 && (
                              <Box>
                                <Typography variant="body2">Soft Skills:</Typography>
                                <List dense>
                                  {currentCandidature.boostage.plan.softSkills.map((skill, index) => (
                                    <ListItem key={index}>
                                      <ListItemText primary={skill} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                            {currentCandidature.boostage.plan.suivi?.length > 0 && (
                              <Box>
                                <Typography variant="body2">Suivi:</Typography>
                                <List dense>
                                  {currentCandidature.boostage.plan.suivi.map((follow, index) => (
                                    <ListItem key={index}>
                                      <ListItemText primary={follow} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                            {currentCandidature.boostage.plan.attestation && (
                              <Box>
                                <Typography variant="body2">Attestation:</Typography>
                                <Typography variant="body2">
                                  {JSON.stringify(currentCandidature.boostage.plan.attestation)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetailsDialog} variant="contained" sx={primaryButtonStyle}>
              Fermer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialoge planification entretien */}
        <Dialog
          open={interviewDialogOpen}
          onClose={handleCloseInterviewDialog}
          PaperProps={{ sx: styles.dialog }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {isRescheduling ? 'Replanifier un Entretien' : 'Planifier un Entretien'}
          </DialogTitle>
          <DialogContent>
            <TextField
              label="Date et heure de l'entretien"
              type="datetime-local"
              fullWidth
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
              inputProps={{ min: new Date().toISOString().slice(0, 16) }}
            />
            <TextField
              label="Lien de la réunion"
              type="url"
              fullWidth
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseInterviewDialog} variant="outlined" sx={styles.actionButton}>
              Annuler
            </Button>
            <Button
              onClick={isRescheduling ? handleRescheduleInterview : handleScheduleInterview}
              variant="contained"
              sx={primaryButtonStyle}
            >
              {isRescheduling ? 'Replanifier' : 'Planifier'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialoge boostage */}
        <Dialog
          open={boostageDialogOpen}
          onClose={handleCloseBoostageDialog}
          PaperProps={{ sx: styles.dialog }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Modifier le parcours de boostage</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Modifiez les raisons pour lesquelles un parcours de boostage est recommandé pour ce candidat.
            </Typography>
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Raison du boostage"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                fullWidth
                size="small"
                sx={styles.boostageReasonInput}
              />
              <Button
                variant="contained"
                onClick={handleAddReason}
                sx={{ ...primaryButtonStyle, mt: 1 }}
                disabled={!newReason.trim()}
              >
                Ajouter
              </Button>
            </Box>
            {boostageReasons.length > 0 ? (
              <List>
                {boostageReasons.map((reason, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={reason} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucune raison ajoutée pour le moment.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseBoostageDialog} variant="outlined" sx={styles.actionButton}>
              Annuler
            </Button>
            <Button
              onClick={handleProposeBoostage}
              variant="contained"
              sx={primaryButtonStyle}
              disabled={boostageReasons.length === 0}
            >
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default SuiviBoostageCandidatures;