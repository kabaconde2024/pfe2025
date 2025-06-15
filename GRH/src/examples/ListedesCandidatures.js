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
  FilterAlt,
  Clear,
  History as HistoryIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/fr';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';

moment.locale('fr');

const API_BASE_URL = 'http://localhost:5000';

const CandidaturesOffre = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [candidatures, setCandidatures] = useState([]);
  const [filteredCandidatures, setFilteredCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreOffre, setFiltreOffre] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [datePostulationFilter, setDatePostulationFilter] = useState('');
  const [expirationDateFilter, setExpirationDateFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [selectedCandidatureId, setSelectedCandidatureId] = useState(null);
  const [currentCandidature, setCurrentCandidature] = useState(null);
  const [statusAction, setStatusAction] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [anchorEl, setAnchorEl] = useState(null);

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

  const filterButtonStyle = {
    bgcolor: '#32e1e9',
    color: '#ffffff',
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    '&:hover': { bgcolor: '#2bc8d0' },
  };

  const showSnackbar = useCallback((message, severity) => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, open: false }));
    }, 8000);
  }, []);

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
        (c) => c && c._id && c.candidat_id && isValidObjectId(c.candidat_id) && c.offre?._id
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
      case 'Acceptée':
        return 'success';
      case 'Refusée':
        return 'error';
      case 'En attente':
        return 'warning';
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
      showSnackbar("Erreur lors de la vérification de l'entretien", 'error');
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
    });
    setFilteredCandidatures(filtered);
    setCurrentPage(1);
  }, [candidatures, filtreOffre, statusFilter, datePostulationFilter, expirationDateFilter]);

  const handleDownloadFile = useCallback(
    async (candidatureId, filename, endpoint) => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
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
      setLoading(true);
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
      setLoading(false);
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
      setFilteredCandidatures(validCandidatures);
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
      let warnings = [];
      let skillsMatchPercentage = 0;
      if (action === 'Acceptée') {
        const requiredSkills = candidatureToConfirm.offre?.competencesRequises || [];
        const candidateSkills = candidatureToConfirm.profilCv?.competences || [];
        const matchCount = countMatchingSkills(requiredSkills, candidateSkills);
        if (requiredSkills.length > 0) {
          skillsMatchPercentage = Math.round((matchCount / requiredSkills.length) * 100);
        }
        if (matchCount < 2) {
          warnings.push('Le candidat possède moins de 2 compétences requises.');
        }
        if (!candidatureToConfirm.cv) {
          warnings.push('Le CV du candidat est manquant.');
        }
        if (
          !candidatureToConfirm.videoMotivation?.url &&
          !candidatureToConfirm.lettreMotivation?.url
        ) {
          warnings.push('Le document de motivation (vidéo ou lettre) du candidat est manquant.');
        }
      }
      setCurrentCandidature({ ...candidatureToConfirm, warnings, skillsMatchPercentage });
      setConfirmationDialogOpen(true);
    } else {
      showSnackbar('Candidature sélectionnée non valide', 'error');
    }
  }, [candidatures, showSnackbar, countMatchingSkills]);

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
    if (!interviewDialogOpen && !confirmationDialogOpen) {
      setCurrentCandidature(null);
    }
  }, [interviewDialogOpen, confirmationDialogOpen]);

  const handleCloseConfirmationDialog = useCallback(() => {
    setConfirmationDialogOpen(false);
    setSelectedCandidatureId(null);
    setStatusAction('');
    if (!interviewDialogOpen && !detailsDialogOpen) {
      setCurrentCandidature(null);
    }
  }, [interviewDialogOpen, detailsDialogOpen]);

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
          showSnackbar("Erreur lors de la vérification de l'entretien", 'error');
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
    if (!confirmationDialogOpen && !detailsDialogOpen) {
      setCurrentCandidature(null);
    }
  }, [confirmationDialogOpen, detailsDialogOpen]);

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
      setLoading(true);
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
    } finally {
      setLoading(false);
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
      setLoading(true);
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
    } finally {
      setLoading(false);
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
      setLoading(true);
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
      const message = statusAction === 'Acceptée' ? 'Candidature acceptée' : 'Candidature refusée';
      showSnackbar(message, 'success');
      handleCloseConfirmationDialog();
    } catch (error) {
      showSnackbar(
        error.response?.data?.message || 'Erreur lors de la mise à jour du statut',
        'error'
      );
    } finally {
      setLoading(false);
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
    setStatusFilter('');
    setFilteredCandidatures(candidatures);
    setCurrentPage(1);
  }, [candidatures]);

  const paginate = useCallback((items, pageNumber, pageSize) => {
    const startIndex = (pageNumber - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, []);

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
    };
  }, [navigate, fetchCurrentUser, fetchCandidatures]);

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
              Gestion des Candidatures
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
              Consultez et gérez toutes les candidatures du système
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
              sx={filterButtonStyle}
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
                    <MenuItem value="">Tous les statuts</MenuItem>
                    <MenuItem value="En attente">En attente</MenuItem>
                    <MenuItem value="Acceptée">Acceptée</MenuItem>
                    <MenuItem value="Refusée">Refusée</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
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
        <Box
          sx={{
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: theme.shadows[3],
            width: '100%',
            my: 3,
          }}
        >
          {filteredCandidatures.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <WorkIcon sx={{ fontSize: 60, color: theme.palette.text.disabled, mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Aucune candidature disponible
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Essayez de modifier vos critères de recherche ou rafraîchissez la liste.
              </Typography>
            </Paper>
          ) : (
            <>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    minWidth: 600,
                  }}
                >
                  <Box
                    component="thead"
                    sx={{
                      backgroundColor: '#32e1e9',
                      color: theme.palette.primary.contrastText,
                      fontWeight: 600,
                    }}
                  >
                    <tr>
                      <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Candidat</Box>
                      <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Offre</Box>
                      <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Statut</Box>
                      <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Documents</Box>
                      <Box component="th" sx={{ p: 2, textAlign: 'left', borderBottom: `1px solid ${theme.palette.divider}` }}>Actions</Box>
                    </tr>
                  </Box>
                  <Box component="tbody">
                    {paginate(filteredCandidatures, currentPage, itemsPerPage).length === 0 ? (
                      <Box
                        component="tr"
                        sx={{
                          '&:hover': { backgroundColor: theme.palette.action.hover },
                        }}
                      >
                        <Box component="td" colSpan={5} sx={{ p: 2, textAlign: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
                          Aucune candidature à afficher pour cette page
                        </Box>
                      </Box>
                    ) : (
                      paginate(filteredCandidatures, currentPage, itemsPerPage).map((candidature) => (
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
                          <Box
                            component="td"
                            sx={{
                              p: 2,
                              borderBottom: `1px solid ${theme.palette.divider}`,
                              display: 'flex',
                              gap: 1,
                            }}
                          >
                            {candidature.cv ? (
                              <Tooltip title="Voir le CV">
                                <IconButton
                                  onClick={() => handleFileOpen(candidature.cv.url, 'CV')}
                                  color="primary"
                                  aria-label="Voir le CV"
                                >
                                  <EyeIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              'Aucun CV'
                            )}
                            {candidature.videoMotivation?.url && (
                              <Tooltip title="Voir la vidéo de motivation">
                                <IconButton
                                  onClick={() => handleFileOpen(candidature.videoMotivation.url, 'vidéo de motivation')}
                                  color="primary"
                                  aria-label="Voir la vidéo de motivation"
                                >
                                  <VideoIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {candidature.lettreMotivation?.url && (
                              <Tooltip title="Voir la lettre de motivation">
                                <IconButton
                                  onClick={() => handleFileOpen(candidature.lettreMotivation.url, 'lettre de motivation')}
                                  color="primary"
                                  aria-label="Voir la lettre de motivation"
                                >
                                  <PdfIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {!candidature.videoMotivation?.url &&
                              !candidature.lettreMotivation?.url &&
                              !candidature.cv && 'Aucun document'}
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
                      ))
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
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
            </>
          )}
        </Box>

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
                  handleOpenConfirmationDialog(currentCandidature._id, 'Acceptée');
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                Accepter
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleOpenConfirmationDialog(currentCandidature._id, 'Refusée');
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <Cancel color="error" />
                </ListItemIcon>
                Refuser
              </MenuItem>
              {!currentCandidature.interviewScheduled && (
                <MenuItem
                  onClick={() => {
                    handleOpenInterviewDialog(currentCandidature, false);
                    handleMenuClose();
                  }}
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
                >
                  <ListItemIcon>
                    <Schedule color="primary" />
                  </ListItemIcon>
                  Replanifier l'entretien
                </MenuItem>
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
            {statusAction === 'Acceptée' && currentCandidature?.skillsMatchPercentage !== undefined && (
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#0288d1' }}>
                Correspondance des compétences : {currentCandidature.skillsMatchPercentage}%
              </Typography>
            )}
            {currentCandidature?.warnings?.length > 0 && (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#fff3e0', borderRadius: '8px' }}>
                <Typography variant="subtitle2" color="warning.main" fontWeight={600}>
                  Avertissements :
                </Typography>
                {currentCandidature.warnings.map((warning, index) => (
                  <Typography key={index} variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    - {warning}
                  </Typography>
                ))}
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Vous pouvez tout de même accepter cette candidature si vous le souhaitez.
                </Typography>
              </Box>
            )}
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
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>Candidat</Typography>
                    <Typography variant="body2">Nom: {currentCandidature.candidat?.nom || 'Inconnu'}</Typography>
                    <Typography variant="body2">Email: {currentCandidature.candidat?.email || 'Non spécifié'}</Typography>
                    {currentCandidature.candidat?.telephone && (
                      <Typography variant="body2">Téléphone: {currentCandidature.candidat.telephone}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>Offre</Typography>
                    <Typography variant="body2">Titre: {currentCandidature.offre?.titre || 'Non spécifié'}</Typography>
                    {currentCandidature.offre?.dateExpiration && (
                      <Typography variant="body2">
                        Date d'expiration: {moment(currentCandidature.offre.dateExpiration).format('DD/MM/YYYY')}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>Statut</Typography>
                    <Chip
                      label={currentCandidature.statut}
                      color={getStatusColor(currentCandidature.statut)}
                      size="small"
                      sx={styles.chip}
                    />
                  </Grid>
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
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600}>Documents</Typography>
                    {currentCandidature.cv ? (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="body2">CV</Typography>
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
                    {currentCandidature.videoMotivation?.url && (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="body2">Vidéo de motivation</Typography>
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
                            onClick={() =>
                              handleDownloadFile(
                                currentCandidature._id,
                                currentCandidature.videoMotivation.originalName,
                                'video'
                              )
                            }
                            color="primary"
                            aria-label="Télécharger la vidéo de motivation"
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {currentCandidature.lettreMotivation?.url && (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="body2">Lettre de motivation</Typography>
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
                            onClick={() =>
                              handleDownloadFile(
                                currentCandidature._id,
                                currentCandidature.lettreMotivation.originalName,
                                'lettre'
                              )
                            }
                            color="primary"
                            aria-label="Télécharger la lettre de motivation"
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {!currentCandidature.videoMotivation?.url &&
                      !currentCandidature.lettreMotivation?.url && (
                        <Typography variant="body2" sx={{ mb: 1 }}>Aucun document de motivation</Typography>
                      )}
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
      </Box>
    </DashboardLayout>
  );
};

export default CandidaturesOffre;