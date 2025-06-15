import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  useTheme,
  Menu,
  MenuItem,
  Collapse,
  ListItemIcon,
  TextField,
} from "@mui/material";
import {
  Visibility as EyeIcon,
  Clear,
  MoreVert as MoreVertIcon,
  VideoCameraBack as VideoIcon,
  Description as PdfIcon,
  CheckCircle,
  Cancel,
  Schedule,
  Download,
  PlayCircle,
  FilterAlt,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import axios from "axios";
import moment from "moment";
import "moment/locale/fr";

moment.locale("fr");

const API_BASE_URL = "http://localhost:5000";

const RecentVisits = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [visitedCandidatures, setVisitedCandidatures] = useState([]);
  const [filteredCandidatures, setFilteredCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentCandidature, setCurrentCandidature] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [statusAction, setStatusAction] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [selectedCandidatureId, setSelectedCandidatureId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [candidatNameFilter, setCandidatNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offreFilter, setOffreFilter] = useState("");
  const [datePostulationFilter, setDatePostulationFilter] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const styles = {
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      mb: 4,
      flexWrap: "wrap",
      gap: 2,
      background: theme.palette.background.paper,
      p: 3,
      borderRadius: "16px",
      boxShadow: theme.shadows[2],
    },
    filterField: {
      minWidth: 150,
      background: theme.palette.background.default,
      borderRadius: "12px",
      padding: "8px 12px",
      border: `1px solid ${theme.palette.divider}`,
      fontSize: "16px",
      "&:focus": {
        outline: `2px solid #32e1e9`,
        borderColor: "#32e1e9",
      },
      width: "100%",
    },
    tableContainer: {
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: theme.shadows[3],
      width: "100%",
      margin: "20px 0",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    tableHeader: {
      backgroundColor: "#32e1e9",
      color: theme.palette.primary.contrastText,
      fontWeight: 600,
    },
    tableHeaderCell: {
      padding: "16px",
      textAlign: "left",
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    tableRow: {
      "&:hover": {
        backgroundColor: theme.palette.action.hover,
      },
    },
    tableCell: {
      padding: "16px",
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    actionButton: {
      borderRadius: "12px",
      textTransform: "none",
      fontWeight: 600,
      px: 3,
      py: 1,
    },
    chip: {
      borderRadius: "8px",
      fontWeight: 600,
      px: 1,
      py: 0.5,
    },
    dialog: {
      borderRadius: "20px",
      background: theme.palette.background.paper,
      boxShadow: theme.shadows[8],
      minHeight: "300px",
      display: "flex",
      flexDirection: "column",
    },
    menuIcon: {
      color: theme.palette.text.secondary,
      "&:hover": {
        color: theme.palette.primary.main,
      },
    },
    emptyState: {
      p: 4,
      textAlign: "center",
      borderRadius: "16px",
      boxShadow: theme.shadows[3],
      background: theme.palette.background.paper,
    },
  };

  const gradientButtonStyle = {
    background: "linear-gradient(45deg, #00CED1 0%, #87CEEB 100%)",
    color: "white",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: 1,
    padding: "8px 16px",
    "&:hover": {
      background: "linear-gradient(45deg, #00BFFF 0%, #1E90FF 100%)",
      boxShadow: theme.shadows[4],
    },
  };

  const filterButtonStyle = {
    bgcolor: "#32e1e9",
    color: "#ffffff",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    "&:hover": { bgcolor: "#2bc8d0" },
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Aucun token trouvé");
      const response = await axios.get(`${API_BASE_URL}/api/utilisateur/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erreur lors de la récupération de l'utilisateur",
        severity: "error",
      });
      navigate("/authentication/sign-in");
      return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Acceptée":
        return "success";
      case "Refusée":
        return "error";
      case "En attente":
        return "warning";
      default:
        return "info";
    }
  };

  const cleanVisitedCandidatures = () => {
    const stored = localStorage.getItem("visitedCandidatures");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const cleaned = parsed.filter(
        (c) => c?._id && c.offre?._id && c.candidat?.nom && c.userId
      );
      localStorage.setItem("visitedCandidatures", JSON.stringify(cleaned));
    } catch (err) {
      localStorage.removeItem("visitedCandidatures");
    }
  };

  const checkInterviewScheduled = async (candidatureId) => {
    try {
      const token = localStorage.getItem("token");
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
      setSnackbar({
        open: true,
        message: "Erreur lors de la vérification de l'entretien",
        severity: "error",
      });
      return { planned: false, meet_link: null, entretien_id: null, date_entretien: null };
    }
  };

  const applyFilters = () => {
    const filtered = visitedCandidatures.filter((c) => {
      const matchesCandidatName =
        !candidatNameFilter || c.candidat?.nom?.toLowerCase().includes(candidatNameFilter.toLowerCase());
      const matchesStatus = !statusFilter || c.statut === statusFilter;
      const matchesOffre = !offreFilter || c.offre?.titre?.toLowerCase().includes(offreFilter.toLowerCase());
      const matchesDatePostulation =
        !datePostulationFilter ||
        moment(c.datePostulation).isSame(moment(datePostulationFilter), "day");
      return matchesCandidatName && matchesStatus && matchesOffre && matchesDatePostulation;
    });
    setFilteredCandidatures(filtered);
    setCurrentPage(1);
  };

  const loadVisitedCandidatures = async () => {
    setLoading(true);
    try {
      const user = await fetchCurrentUser();
      if (!user || !user.id) {
        setSnackbar({ open: true, message: "Utilisateur non trouvé", severity: "error" });
        setVisitedCandidatures([]);
        setFilteredCandidatures([]);
        return;
      }
      setCurrentUser(user);

      const token = localStorage.getItem("token");
      const offresRes = await axios.get(`${API_BASE_URL}/api/offres`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userOffreIds = offresRes.data.map((o) => o._id);

      const stored = localStorage.getItem("visitedCandidatures");
      let candidatures = [];

      if (!stored || stored === "[]") {
        try {
          const recentCandidaturesRes = await axios.get(`${API_BASE_URL}/api/candidatures/recent`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          candidatures = recentCandidaturesRes.data.filter(
            (c) =>
              c?._id &&
              c.offre?._id &&
              userOffreIds.includes(c.offre._id) &&
              c.candidat?.nom &&
              c.userId === user.id
          );
          localStorage.setItem("visitedCandidatures", JSON.stringify(candidatures));
        } catch (error) {
          setSnackbar({
            open: true,
            message: "Aucune candidature récente trouvée",
            severity: "info",
          });
          setVisitedCandidatures([]);
          setFilteredCandidatures([]);
          return;
        }
      } else {
        try {
          candidatures = JSON.parse(stored);
        } catch (err) {
          setSnackbar({
            open: true,
            message: "Erreur de format dans le stockage local",
            severity: "error",
          });
          localStorage.removeItem("visitedCandidatures");
          setVisitedCandidatures([]);
          setFilteredCandidatures([]);
          return;
        }
      }

      const validCandidatures = candidatures.filter(
        (c) =>
          c?._id &&
          c.offre?._id &&
          userOffreIds.includes(c.offre._id) &&
          c.candidat?.nom &&
          c.userId === user.id
      );

      const candidaturesWithEntretien = await Promise.all(
        validCandidatures.map(async (c) => {
          const interviewData = await checkInterviewScheduled(c._id);
          return {
            ...c,
            interviewScheduled: interviewData.planned,
            meet_link: interviewData.meet_link,
            entretien_id: interviewData.entretien_id,
            date_entretien: interviewData.date_entretien,
            cv: c.cv
              ? {
                  url: `${API_BASE_URL}/api/candidatures/${c._id}/cv`,
                  originalName: c.cv.originalName || `CV_${(c.candidat?.nom || 'Candidat').replace(/\s+/g, '_')}.pdf`,
                  contentType: c.cv.contentType || 'application/pdf',
                  size: c.cv.size || 0,
                }
              : null,
            videoMotivation: c.videoMotivation
              ? {
                  url: `${API_BASE_URL}/api/candidatures/${c._id}/video`,
                  originalName: c.videoMotivation.originalName || 'video_motivation.mp4',
                  contentType: c.videoMotivation.contentType || 'video/mp4',
                  size: c.videoMotivation.size || 0,
                }
              : null,
            lettreMotivation: c.lettreMotivation
              ? {
                  url: `${API_BASE_URL}/api/candidatures/${c._id}/lettre`,
                  originalName: c.lettreMotivation.originalName || 'lettre_motivation.pdf',
                  contentType: c.lettreMotivation.contentType || 'application/pdf',
                  size: c.lettreMotivation.size || 0,
                }
              : null,
          };
        })
      );

      setVisitedCandidatures(candidaturesWithEntretien);
      setFilteredCandidatures(candidaturesWithEntretien);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erreur lors du chargement des candidatures",
        severity: "error",
      });
      setVisitedCandidatures([]);
      setFilteredCandidatures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/authentication/sign-in");
      return;
    }
    cleanVisitedCandidatures();
    loadVisitedCandidatures();
  }, [navigate]);

  useEffect(() => {
    setFilteredCandidatures(visitedCandidatures);
  }, [visitedCandidatures]);

  const handleMenuOpen = (event, candidature) => {
    if (!candidature || !candidature._id) {
      setSnackbar({ open: true, message: "Candidature invalide dans le menu", severity: "error" });
      return;
    }
    setCurrentCandidature(candidature);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getCandidatureById = (id) => {
    return filteredCandidatures.find((c) => c._id === id) || null;
  };

  const handleOpenDetailsDialog = (candidature) => {
    if (!candidature || !candidature._id) {
      setSnackbar({ open: true, message: "Candidature invalide", severity: "error" });
      return;
    }
    setCurrentCandidature(candidature);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    if (!interviewDialogOpen && !confirmationDialogOpen) {
      setCurrentCandidature(null);
    }
  };

  const countMatchingSkills = (requiredSkills, candidateSkills) => {
    if (!requiredSkills || !candidateSkills) return 0;
    const req = Array.isArray(requiredSkills) ? requiredSkills : [requiredSkills];
    const cand = Array.isArray(candidateSkills) ? candidateSkills : [candidateSkills];
    const normCand = cand.map((s) => String(s).toLowerCase().trim());
    const setCand = new Set(normCand);
    return req.reduce((count, s) => {
      const norm = String(s).toLowerCase().trim();
      return setCand.has(norm) ? count + 1 : count;
    }, 0);
  };

  const handleOpenConfirmationDialog = (action, candidature) => {
    if (!candidature || !candidature._id) {
      setSnackbar({ open: true, message: "Candidature invalide", severity: "error" });
      return;
    }
    let warnings = [];
    let skillsMatchPercentage = 0;
    if (action === "Acceptée") {
      const requiredSkills = candidature.offre?.competencesRequises || [];
      const candidateSkills = candidature.profilCv?.competences || [];
      const matchCount = countMatchingSkills(requiredSkills, candidateSkills);
      if (requiredSkills.length > 0) {
        skillsMatchPercentage = Math.round((matchCount / requiredSkills.length) * 100);
      }
      if (matchCount < 2) {
        warnings.push("Le candidat possède moins de 2 compétences requises.");
      }
      if (!candidature.cv) {
        warnings.push("Le CV du candidat est manquant.");
      }
      if (!candidature.videoMotivation?.url && !candidature.lettreMotivation?.url) {
        warnings.push("Le document de motivation (vidéo ou lettre) du candidat est manquant.");
      }
    }
    setStatusAction(action);
    setSelectedCandidatureId(candidature._id);
    setCurrentCandidature({ ...candidature, warnings, skillsMatchPercentage });
    setConfirmationDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseConfirmationDialog = () => {
    setConfirmationDialogOpen(false);
    setStatusAction("");
    setSelectedCandidatureId(null);
    if (!interviewDialogOpen && !detailsDialogOpen) {
      setCurrentCandidature(null);
    }
  };

  const handleUpdateStatut = async () => {
    if (!selectedCandidatureId || !statusAction) {
      setSnackbar({ open: true, message: "Aucune candidature sélectionnée", severity: "error" });
      return;
    }
    const currentSelectedCandidature = visitedCandidatures.find((candidature) => candidature._id === selectedCandidatureId);
    if (!currentSelectedCandidature) {
      setSnackbar({ open: true, message: "Candidature non trouvée", severity: "error" });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      await axios.patch(
        `${API_BASE_URL}/api/candidatures/${selectedCandidatureId}/statut`,
        { statut: statusAction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = visitedCandidatures.map((candidature) =>
        candidature._id === selectedCandidatureId ? { ...candidature, statut: statusAction } : candidature
      );
      setVisitedCandidatures(updated);
      setFilteredCandidatures(updated);
      localStorage.setItem("visitedCandidatures", JSON.stringify(updated));
      setSnackbar({
        open: true,
        message: statusAction === "Acceptée" ? "Candidature acceptée avec succès" : "Candidature refusée avec succès",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erreur lors de la mise à jour du statut",
        severity: "error",
      });
    } finally {
      handleCloseConfirmationDialog();
    }
  };

  const handleOpenInterviewDialog = async (candidature, reschedule = false) => {
    if (!candidature || !candidature._id) {
      setSnackbar({ open: true, message: "Candidature invalide", severity: "error" });
      return;
    }
    setCurrentCandidature(candidature);
    if (reschedule) {
      try {
        const interviewData = await checkInterviewScheduled(candidature._id);
        if (!interviewData.planned || !interviewData.entretien_id || !interviewData.date_entretien) {
          setSnackbar({
            open: true,
            message: "Aucun entretien existant à replanifier",
            severity: "error",
          });
          return;
        }
        setIsRescheduling(true);
        setInterviewDialogOpen(true);
        setInterviewDate(moment(interviewData.date_entretien).format("YYYY-MM-DDTHH:mm"));
        setMeetLink(interviewData.meet_link || "");
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Erreur lors de la vérification de l'entretien",
          severity: "error",
        });
      }
    } else {
      setIsRescheduling(false);
      setInterviewDialogOpen(true);
      setInterviewDate("");
      setMeetLink("");
    }
  };

  const handleScheduleInterview = async () => {
    if (!currentCandidature || !currentCandidature._id) {
      setSnackbar({ open: true, message: "Candidature invalide", severity: "error" });
      return;
    }
    if (!interviewDate || !meetLink || !/^https?:\/\//.test(meetLink)) {
      setSnackbar({
        open: true,
        message: "Lien ou date invalides",
        severity: "warning",
      });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/entretiens`,
        {
          candidature_id: currentCandidature._id,
          candidat_id: currentCandidature.candidat?._id || "",
          offre_id: currentCandidature.offre?._id || null,
          date_entretien: new Date(interviewDate).toISOString(),
          meet_link: meetLink,
          createdBy: currentUser?.id || "unknown",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = visitedCandidatures.map((candidature) =>
        candidature._id === currentCandidature._id
          ? {
              ...candidature,
              interviewScheduled: true,
              meet_link: meetLink,
              date_entretien: new Date(interviewDate).toISOString(),
              entretien_id: response.data.entretien_id,
            }
          : candidature
      );
      setVisitedCandidatures(updated);
      setFilteredCandidatures(updated);
      localStorage.setItem("visitedCandidatures", JSON.stringify(updated));
      setSnackbar({
        open: true,
        message: "Entretien planifié avec succès",
        severity: "success",
      });
      handleCloseInterviewDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erreur lors de la planification de l'entretien",
        severity: "error",
      });
    }
  };

  const handleRescheduleInterview = async () => {
    if (!currentCandidature || !currentCandidature._id || !currentCandidature.entretien_id) {
      setSnackbar({
        open: true,
        message: "Aucun entretien à replanifier",
        severity: "error",
      });
      return;
    }
    if (!interviewDate || !meetLink || !/^https?:\/\//.test(meetLink)) {
      setSnackbar({
        open: true,
        message: "Lien ou date invalides",
        severity: "warning",
      });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/entretiens/${currentCandidature.entretien_id}`,
        {
          date_entretien: new Date(interviewDate).toISOString(),
          meet_link: meetLink,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = visitedCandidatures.map((candidature) =>
        candidature._id === currentCandidature._id
          ? {
              ...candidature,
              meet_link: meetLink,
              date_entretien: new Date(interviewDate).toISOString(),
            }
          : candidature
      );
      setVisitedCandidatures(updated);
      setFilteredCandidatures(updated);
      localStorage.setItem("visitedCandidatures", JSON.stringify(updated));
      setSnackbar({
        open: true,
        message: "Entretien replanifié avec succès",
        severity: "success",
      });
      handleCloseInterviewDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erreur lors de la replanification de l'entretien",
        severity: "error",
      });
    }
  };

  const handleDownloadFile = async (candidatureId, filename, endpoint) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      const response = await axios.get(`${API_BASE_URL}/api/candidatures/${candidatureId}/${endpoint}`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSnackbar({
        open: true,
        message: `Téléchargement du ${endpoint === 'cv' ? 'CV' : endpoint === 'video' ? 'vidéo' : 'lettre'} réussi`,
        severity: "success",
      });
    } catch (error) {
      const message =
        error.response?.status === 404
          ? `Le ${endpoint === 'cv' ? 'CV' : endpoint === 'video' ? 'vidéo' : 'lettre'} n'est pas disponible`
          : error.message === 'Token manquant'
          ? 'Accès non autorisé. Veuillez vous reconnecter'
          : `Échec du téléchargement du ${endpoint === 'cv' ? 'CV' : endpoint === 'video' ? 'vidéo' : 'lettre'}`;
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    }
  };

  const handleOpenFile = async (url, fileType) => {
    if (!url) {
      setSnackbar({ open: true, message: `Aucun ${fileType} disponible`, severity: "error" });
      return;
    }
    if (fileType === 'vidéo de motivation' || fileType === 'lien de réunion') {
      try {
        const isValidUrl = /^https?:\/\//.test(url);
        if (!isValidUrl) throw new Error('URL invalide');
        window.open(url, '_blank');
        setSnackbar({
          open: true,
          message: `${fileType} ouvert dans un nouvel onglet`,
          severity: 'success',
        });
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
          setSnackbar({
            open: true,
            message: `${fileType} ouvert dans un nouvel onglet`,
            severity: 'success',
          });
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
          setSnackbar({
            open: true,
            message,
            severity: 'error',
          });
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
        setSnackbar({
          open: true,
          message: `${fileType} ouvert dans un nouvel onglet`,
          severity: 'success',
        });
      } catch (error) {
        let message = `Erreur lors de l'ouverture du ${fileType}`;
        if (error.response?.status === 404) {
          message = `Le ${fileType} n'est pas disponible`;
        } else if (error.response?.status === 401 || error.message === 'Token manquant') {
          message = 'Accès non autorisé. Veuillez vous reconnecter';
        } else if (error.message.includes('Network Error')) {
          message = 'Erreur réseau. Vérifiez votre connexion ou le serveur';
        }
        setSnackbar({
          open: true,
          message,
          severity: 'error',
        });
      }
    }
  };

  const handleCloseInterviewDialog = () => {
    setInterviewDialogOpen(false);
    setIsRescheduling(false);
    setInterviewDate("");
    setMeetLink("");
    if (!confirmationDialogOpen && !detailsDialogOpen) {
      setCurrentCandidature(null);
    }
  };

  const resetVisitedCandidatures = () => {
    localStorage.removeItem("visitedCandidatures");
    setVisitedCandidatures([]);
    setFilteredCandidatures([]);
    setSnackbar({ open: true, message: "Liste réinitialisée", severity: "info" });
  };

  const paginate = (items, pageNumber, pageSize) => {
    const startIndex = (pageNumber - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 4, mt: 10 }}>
        <Box sx={styles.header}>
          <Box>
            <Typography
              variant="h3"
              fontWeight={700}
              sx={{
                position: "relative",
                "&:after": {
                  content: '""',
                  position: "absolute",
                  bottom: -8,
                  left: 0,
                  width: 80,
                  height: 3,
                  background: `linear-gradient(90deg, #0288d1, #4fc3f7)`,
                  borderRadius: 2,
                },
              }}
            >
              Candidatures Récemment Consultées
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2.5, textDecoration: "none", borderBottom: "none" }}
            >
              Consultez les candidatures récemment visitées
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<FilterAlt />}
              onClick={() => setFiltersOpen(!filtersOpen)}
              sx={filterButtonStyle}
            >
              {filtersOpen ? "Masquer les filtres" : "Afficher les filtres"}
            </Button>
            <Button
              variant="contained"
              startIcon={<Clear />}
              onClick={resetVisitedCandidatures}
              sx={filterButtonStyle}
            >
              Réinitialiser
            </Button>
          </Box>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Collapse in={filtersOpen}>
          <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <input
                  id="candidat-filter"
                  type="text"
                  value={candidatNameFilter}
                  onChange={(e) => setCandidatNameFilter(e.target.value)}
                  style={styles.filterField}
                  placeholder="Rechercher un candidat..."
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <input
                  id="offre-filter"
                  type="text"
                  value={offreFilter}
                  onChange={(e) => setOffreFilter(e.target.value)}
                  style={styles.filterField}
                  placeholder="Rechercher une offre..."
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <input
                  id="date-postulation"
                  type="date"
                  value={datePostulationFilter}
                  onChange={(e) => setDatePostulationFilter(e.target.value)}
                  style={styles.filterField}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={styles.filterField}
                >
                  <option value="">Tous les statuts</option>
                  <option value="En attente">En attente</option>
                  <option value="Acceptée">Acceptée</option>
                  <option value="Refusée">Refusée</option>
                </select>
              </Grid>
              <Grid item xs={12} sm={6} md={4} sx={{ display: "flex", justifyContent: "flex-start", gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    applyFilters();
                    setCurrentPage(1);
                  }}
                  sx={gradientButtonStyle}
                >
                  Appliquer
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setCandidatNameFilter("");
                    setOffreFilter("");
                    setDatePostulationFilter("");
                    setStatusFilter("");
                    setFilteredCandidatures(visitedCandidatures);
                  }}
                  startIcon={<Clear />}
                  sx={{ ...styles.actionButton }}
                >
                  Réinitialiser
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Collapse>

        {filteredCandidatures.length === 0 ? (
          <Box sx={styles.emptyState}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Aucune candidature consultée récemment
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Les candidatures que vous consultez apparaîtront ici
            </Typography>
          </Box>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Candidat</th>
                  <th style={styles.tableHeaderCell}>Offre</th>
                  <th style={styles.tableHeaderCell}>Statut</th>
                  <th style={styles.tableHeaderCell}>Documents</th>
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filteredCandidatures, currentPage, itemsPerPage).map((candidature) => (
                  <tr key={candidature._id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{candidature.candidat?.nom || "Inconnu"}</td>
                    <td style={styles.tableCell}>{candidature.offre?.titre || "Non spécifié"}</td>
                    <td style={styles.tableCell}>
                      <Chip
                        label={candidature.statut}
                        color={getStatusColor(candidature.statut)}
                        size="small"
                        sx={styles.chip}
                      />
                    </td>
                    <td style={{ ...styles.tableCell, display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {candidature.cv ? (
                        <Tooltip title="Voir le CV">
                          <IconButton
                            onClick={() => handleOpenFile(candidature.cv.url, 'CV')}
                            color="primary"
                            aria-label="Voir le CV"
                          >
                            <EyeIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        "Aucun CV"
                      )}
                      {candidature.videoMotivation?.url && (
                        <Tooltip title="Voir la vidéo de motivation">
                          <IconButton
                            onClick={() => handleOpenFile(candidature.videoMotivation.url, 'vidéo de motivation')}
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
                            onClick={() => handleOpenFile(candidature.lettreMotivation.url, 'lettre de motivation')}
                            color="primary"
                            aria-label="Voir la lettre de motivation"
                          >
                            <PdfIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {!candidature.videoMotivation?.url && !candidature.lettreMotivation?.url && !candidature.cv && (
                        "Aucun document"
                      )}
                    </td>
                    <td style={styles.tableCell}>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, candidature)}
                        sx={styles.menuIcon}
                        aria-label="Plus d'actions"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2">Résultats par page:</Typography>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ padding: "4px", borderRadius: "4px", border: `1px solid ${theme.palette.divider}` }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
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
          </div>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: "visible",
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
              mt: 1.5,
              "&:before": {
                content: '""',
                display: "block",
                position: "absolute",
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: "background.paper",
                transform: "translateY(-50%) rotate(45deg)",
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <MenuItem
            onClick={() => {
              if (!currentCandidature || !currentCandidature._id) {
                setSnackbar({ open: true, message: "Aucune candidature sélectionnée", severity: "error" });
                return;
              }
              handleOpenDetailsDialog(currentCandidature);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <EyeIcon color="info" />
            </ListItemIcon>
            Détails
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (!currentCandidature || !currentCandidature._id) {
                setSnackbar({ open: true, message: "Aucune candidature sélectionnée", severity: "error" });
                return;
              }
              handleOpenConfirmationDialog("Acceptée", currentCandidature);
            }}
          >
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            Accepter
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (!currentCandidature || !currentCandidature._id) {
                setSnackbar({ open: true, message: "Aucune candidature sélectionnée", severity: "error" });
                return;
              }
              handleOpenConfirmationDialog("Refusée", currentCandidature);
            }}
          >
            <ListItemIcon>
              <Cancel color="error" />
            </ListItemIcon>
            Refuser
          </MenuItem>
          {!currentCandidature?.interviewScheduled && (
            <MenuItem
              onClick={() => {
                if (!currentCandidature || !currentCandidature._id) {
                  const fallbackCandidature = getCandidatureById(currentCandidature?._id);
                  if (!fallbackCandidature) {
                    setSnackbar({ open: true, message: "Aucune candidature sélectionnée", severity: "error" });
                    return;
                  }
                  setCurrentCandidature(fallbackCandidature);
                  handleOpenInterviewDialog(fallbackCandidature, false);
                } else {
                  handleOpenInterviewDialog(currentCandidature, false);
                }
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <Schedule color="primary" />
              </ListItemIcon>
              Planifier l'entretien
            </MenuItem>
          )}
          {currentCandidature?.interviewScheduled && (
            <MenuItem
              onClick={() => {
                if (!currentCandidature || !currentCandidature._id) {
                  const fallbackCandidature = getCandidatureById(currentCandidature?._id);
                  if (!fallbackCandidature) {
                    setSnackbar({ open: true, message: "Aucune candidature sélectionnée", severity: "error" });
                    return;
                  }
                  setCurrentCandidature(fallbackCandidature);
                  handleOpenInterviewDialog(fallbackCandidature, true);
                } else {
                  handleOpenInterviewDialog(currentCandidature, true);
                }
                handleMenuClose();
              }}
            >
              <ListItemIcon>
                <Schedule color="primary" />
              </ListItemIcon>
              Replanifier l'entretien
            </MenuItem>
          )}
        </Menu>

        <Dialog
          open={interviewDialogOpen}
          onClose={handleCloseInterviewDialog}
          PaperProps={{ sx: styles.dialog }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{isRescheduling ? "Replanifier un Entretien" : "Planifier un Entretien"}</DialogTitle>
          <DialogContent sx={{ paddingBottom: 2 }}>
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
          <DialogActions sx={{ padding: 2, backgroundColor: theme.palette.grey[100], justifyContent: "flex-end" }}>
            <Button onClick={handleCloseInterviewDialog} variant="outlined" sx={{ marginRight: 1 }}>
              Annuler
            </Button>
            <Button
              onClick={isRescheduling ? handleRescheduleInterview : handleScheduleInterview}
              variant="contained"
              sx={gradientButtonStyle}
            >
              {isRescheduling ? "Replanifier" : "Planifier"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={confirmationDialogOpen}
          onClose={handleCloseConfirmationDialog}
          PaperProps={{ sx: styles.dialog }}
        >
          <DialogTitle>Confirmer le changement de statut</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Êtes-vous sûr de vouloir marquer cette candidature comme <strong>{statusAction}</strong> ?
            </DialogContentText>
            {statusAction === "Acceptée" && currentCandidature?.skillsMatchPercentage !== undefined && (
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#0288d1' }}>
                Correspondance des compétences : {currentCandidature.skillsMatchPercentage}%
              </Typography>
            )}
            {currentCandidature?.warnings?.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3e0', borderRadius: '8px' }}>
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
          <DialogActions sx={{ padding: 2, backgroundColor: theme.palette.grey[100] }}>
            <Button onClick={handleCloseConfirmationDialog} variant="outlined" sx={{ marginRight: 1 }}>
              Annuler
            </Button>
            <Button
              onClick={handleUpdateStatut}
              variant="contained"
              sx={gradientButtonStyle}
            >
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>

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
                    <Typography variant="subtitle1" fontWeight={600}>
                      Candidat
                    </Typography>
                    <Typography variant="body2">
                      Nom: {currentCandidature.candidat?.nom || "Inconnu"}
                    </Typography>
                    <Typography variant="body2">
                      Email: {currentCandidature.candidat?.email || "Non spécifié"}
                    </Typography>
                    {currentCandidature.candidat?.telephone && (
                      <Typography variant="body2">
                        Téléphone: {currentCandidature.candidat.telephone}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Offre
                    </Typography>
                    <Typography variant="body2">
                      Titre: {currentCandidature.offre?.titre || "Non spécifié"}
                    </Typography>
                    {currentCandidature.offre?.dateExpiration && (
                      <Typography variant="body2">
                        Date d'expiration: {moment(currentCandidature.offre.dateExpiration).format("DD/MM/YYYY")}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Statut
                    </Typography>
                    <Chip
                      label={currentCandidature.statut}
                      color={getStatusColor(currentCandidature.statut)}
                      size="small"
                      sx={styles.chip}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Dates
                    </Typography>
                    <Typography variant="body2">
                      Date de postulation: {moment(currentCandidature.datePostulation).format("DD/MM/YYYY HH:mm")}
                    </Typography>
                    {currentCandidature.date_entretien && (
                      <Typography variant="body2">
                        Date d'entretien: {moment(currentCandidature.date_entretien).format("DD/MM/YYYY HH:mm")}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Documents
                    </Typography>
                    {currentCandidature.cv ? (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="body2">CV </Typography>
                        <Tooltip title="Afficher le CV">
                          <IconButton
                            onClick={() => handleOpenFile(currentCandidature.cv.url, 'CV')}
                            color="primary"
                            aria-label="Afficher le CV"
                          >
                            <EyeIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger le CV">
                          <IconButton
                            onClick={() => handleDownloadFile(currentCandidature._id, currentCandidature.cv.originalName, 'cv')}
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
                        <Typography variant="body2">
                          Vidéo de motivation 
                        </Typography>
                        <Tooltip title="Afficher la vidéo de motivation">
                          <IconButton
                            onClick={() => handleOpenFile(currentCandidature.videoMotivation.url, 'vidéo de motivation')}
                            color="primary"
                            aria-label="Afficher la vidéo de motivation"
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
                    {currentCandidature.lettreMotivation?.url && (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          Lettre de motivation 
                        </Typography>
                        <Tooltip title="Afficher la lettre de motivation">
                          <IconButton
                            onClick={() => handleOpenFile(currentCandidature.lettreMotivation.url, 'lettre de motivation')}
                            color="primary"
                            aria-label="Afficher la lettre de motivation"
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
                    {!currentCandidature.videoMotivation?.url && !currentCandidature.lettreMotivation?.url && (
                      <Typography variant="body2" sx={{ mb: 1 }}>Aucun document de motivation</Typography>
                    )}
                    {currentCandidature.interviewScheduled && currentCandidature.meet_link ? (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
                        <Typography variant="body2">Entretien</Typography>
                        <Tooltip title="Rejoindre l'entretien">
                          <IconButton
                            onClick={() => handleOpenFile(currentCandidature.meet_link, 'lien de réunion')}
                            color="primary"
                            aria-label="Rejoindre l'entretien"
                          >
                            <VideoIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Aucun entretien planifié
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ padding: 2, backgroundColor: theme.palette.grey[100] }}>
            <Button
              onClick={handleCloseDetailsDialog}
              variant="contained"
              sx={gradientButtonStyle}
            >
              Fermer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default RecentVisits;