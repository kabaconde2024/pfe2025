import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Button,
  Typography,
  CircularProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Paper,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  TextField,
  Select,
} from "@mui/material";
import {
  Download as DownloadIcon,
  PlayCircle as PlayCircleIcon,
  Visibility as EyeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Description as PdfIcon,
  MoreVert as MoreVertIcon,
  Work as WorkIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import axios from "axios";
import moment from "moment";
import "moment/locale/fr";
import DashboardLayout from "../examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "../examples/Navbars/DashboardNavbar";

moment.locale("fr");

const Candidatures = () => {
  const { offreId } = useParams();
  const theme = useTheme();
  const navigate = useNavigate();

  // States
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offreDetails, setOffreDetails] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [selectedCandidatureId, setSelectedCandidatureId] = useState(null);
  const [currentCandidature, setCurrentCandidature] = useState(null);
  const [statusAction, setStatusAction] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const API_BASE_URL = "http://localhost:5000/api";

  // Styles
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
    chip: {
      borderRadius: "8px",
      fontWeight: 600,
      px: 1,
      py: 0.5,
    },
    actionButton: {
      borderRadius: "12px",
      textTransform: "none",
      fontWeight: 600,
      px: 3,
      py: 1,
      color: "#616161",
      borderColor: "#616161",
      "&:hover": { bgcolor: "#f5f5f5" },
    },
    dialog: {
      borderRadius: "20px",
      p: 3,
      background: theme.palette.background.paper,
      boxShadow: theme.shadows[8],
    },
    menuIcon: {
      color: theme.palette.text.secondary,
      "&:hover": { color: "#0288d1" },
    },
    menuPaper: {
      width: 200, // Reduced menu width
      maxWidth: "100%",
      elevation: 0,
      overflow: "visible",
      filter: "drop-shadow(0px 1px 4px rgba(0,0,0,0.2))", // Lighter shadow
      mt: 1,
      borderRadius: "8px",
      "& .MuiMenuItem-root": {
        fontSize: "0.875rem", // Smaller typography
        py: 1, // Reduced vertical padding
      },
      "& .MuiListItemIcon-root": {
        minWidth: 32, // Smaller icon container
        "& .MuiSvgIcon-root": {
          fontSize: "1rem", // Smaller icons
        },
      },
    },
  };

  const primaryButtonStyle = {
    bgcolor: "#0288d1",
    color: "#ffffff",
    fontWeight: 600,
    textTransform: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    "&:hover": { bgcolor: "#01579b" },
  };

  // Handlers
  const showSnackbar = useCallback((message, severity) => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, open: false }));
    }, 8000);
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case "Acceptée": return "success";
      case "Refusée": return "error";
      case "En attente":
      case "En cours d'évaluation": return "warning";
      default: return "info";
    }
  }, []);

  const checkInterviewScheduled = useCallback(async (candidatureId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      const response = await axios.get(`${API_BASE_URL}/entretiens/check/${candidatureId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { planned, meet_link, entretien_id, date_entretien } = response.data;
      if (!planned || !entretien_id || !date_entretien || !moment(date_entretien).isValid()) {
        return { planned: false, meet_link: null, entretien_id: null, date_entretien: null };
      }
      return {
        planned: true,
        meet_link: meet_link || null,
        entretien_id,
        date_entretien,
      };
    } catch (error) {
      showSnackbar(error.response?.data?.message || "Erreur lors de la vérification de l'entretien", "error");
      return { planned: false, meet_link: null, entretien_id: null, date_entretien: null };
    }
  }, [showSnackbar]);

  const countMatchingSkills = useCallback((requiredSkills, candidateSkills) => {
    if (!requiredSkills || !candidateSkills) return 0;
    const reqSkills = Array.isArray(requiredSkills) ? requiredSkills : [requiredSkills];
    const candSkills = Array.isArray(candidateSkills) ? candidateSkills : [candidateSkills];
    const candSkillsLower = candSkills.map(s => String(s).toLowerCase().trim());
    const candSet = new Set(candSkillsLower);
    return reqSkills.reduce((count, skill) => {
      if (candSet.has(String(skill).toLowerCase().trim())) return count + 1;
      return count;
    }, 0);
  }, []);

  const handleDownloadFile = useCallback(async (candidatureId, filename, endpoint) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      const response = await axios.get(`${API_BASE_URL}/candidatures/${candidatureId}/${endpoint}`, {
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
      showSnackbar(`Téléchargement du ${endpoint === "cv" ? "CV" : endpoint === "video" ? "vidéo" : "lettre"} réussi`, "success");
    } catch (error) {
      const msg = error.response?.status === 404
        ? `Le ${endpoint === "cv" ? "CV" : endpoint === "video" ? "vidéo" : "lettre"} n'est pas disponible`
        : error.message === "Token manquant"
        ? "Accès non autorisé. Veuillez vous reconnecter"
        : `Échec du téléchargement du ${endpoint === "cv" ? "CV" : endpoint === "video" ? "vidéo" : "lettre"}`;
      showSnackbar(msg, "error");
    }
  }, [showSnackbar]);

  const handleFileOpen = useCallback(async (url, fileType) => {
    if (!url) {
      showSnackbar(`Aucun ${fileType} disponible`, "error");
      return;
    }
    if (["vidéo de motivation", "lien de réunion"].includes(fileType)) {
      try {
        const isValidUrl = /^https?:\/\//.test(url);
        if (!isValidUrl) throw new Error("URL invalide");
        window.open(url, "_blank");
        showSnackbar(`${fileType} ouvert dans un nouvel onglet`, "success");
      } catch (error) {
        try {
          const token = localStorage.getItem("token");
          if (!token) throw new Error("Token manquant");
          const response = await axios.get(url, {
            responseType: "blob",
            headers: { Authorization: `Bearer ${token}` },
          });
          const contentType = response.headers["content-type"];
          if (fileType === "vidéo de motivation" && !contentType.includes("video")) {
            throw new Error("Le fichier reçu n'est pas une vidéo");
          }
          const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
          window.open(blobUrl, "_blank");
          window.URL.revokeObjectURL(blobUrl);
          showSnackbar(`${fileType} ouvert dans un nouvel onglet`, "success");
        } catch (blobError) {
          let msg = `Erreur lors de l'ouverture de ${fileType}`;
          if (blobError.response?.status === 404) msg = `Le ${fileType} n'est pas disponible`;
          else if (blobError.response?.status === 401 || blobError.message === "Token manquant") msg = "Accès non autorisé. Veuillez vous reconnecter";
          else if (blobError.message.includes("pas une vidéo")) msg = "Le fichier reçu n'est pas une vidéo valide";
          else if (blobError.message.includes("Network Error")) msg = "Erreur réseau. Vérifiez votre connexion ou le serveur";
          showSnackbar(msg, "error");
        }
      }
    } else {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token manquant");
        const response = await axios.get(`${url}?view=true`, {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        });
        const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: response.headers["content-type"] }));
        window.open(blobUrl, "_blank");
        window.URL.revokeObjectURL(blobUrl);
        showSnackbar(`${fileType} ouvert dans un nouvel onglet`, "success");
      } catch (error) {
        const msg = error.response?.status === 404
          ? `Le ${fileType} n'est pas disponible`
          : error.response?.status === 401 || error.message === "Token manquant"
          ? "Accès non autorisé. Veuillez vous reconnecter"
          : "Erreur réseau. Vérifiez votre connexion ou le serveur";
        showSnackbar(msg, "error");
      }
    }
  }, [showSnackbar]);

  const fetchCandidatures = useCallback(async () => {
    if (!offreId) {
      showSnackbar("ID de l'offre manquant", "error");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");

      const offreResponse = await axios.get(`${API_BASE_URL}/offres/${offreId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffreDetails(offreResponse.data);

      const candidaturesResponse = await axios.get(`${API_BASE_URL}/offres/${offreId}/candidatures`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const candidaturesWithDocs = await Promise.all(
        candidaturesResponse.data.candidatures.map(async (c) => {
          if (!c._id || !c.candidat || !c.offre) {
            return null;
          }
          const interviewData = await checkInterviewScheduled(c._id);
          const requiredSkills = c.offre?.competencesRequises || [];
          return {
            ...c,
            cv: c.cv
              ? { ...c.cv, originalName: c.cv.originalName || `CV_${(c.candidat?.nom || "Candidat").replace(/\s+/g, "_")}.pdf` }
              : null,
            videoMotivation: c.videoMotivation
              ? { ...c.videoMotivation, originalName: c.videoMotivation.originalName || "video_motivation.mp4" }
              : null,
            lettreMotivation: c.lettreMotivation
              ? { ...c.lettreMotivation, originalName: c.lettreMotivation.originalName || "lettre_motivation.pdf" }
              : null,
            interviewScheduled: interviewData.planned && !!interviewData.entretien_id && !!interviewData.date_entretien && moment(interviewData.date_entretien).isValid(),
            meet_link: interviewData.meet_link,
            entretien_id: interviewData.entretien_id,
            date_entretien: interviewData.date_entretien && moment(interviewData.date_entretien).isValid() ? interviewData.date_entretien : null,
            requiredSkills,
          };
        })
      );
      const filtered = candidaturesWithDocs.filter(Boolean);
      setCandidatures(filtered);
    } catch (error) {
      showSnackbar(error.response?.data?.message || "Erreur lors du chargement", "error");
    } finally {
      setLoading(false);
    }
  }, [offreId, checkInterviewScheduled, showSnackbar]);

  const handleMenuOpen = (e, candidature) => {
    if (!candidature?._id) {
      showSnackbar("Candidature invalide", "error");
      return;
    }
    setAnchorEl(e.currentTarget);
    setCurrentCandidature(candidature);
    setSelectedCandidatureId(candidature._id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOpenDetailsDialog = (candidature) => {
    if (!candidature?._id) {
      showSnackbar("Candidature invalide", "error");
      return;
    }
    setCurrentCandidature(candidature);
    setSelectedCandidatureId(candidature._id);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    if (!interviewDialogOpen && !confirmationDialogOpen) {
      setCurrentCandidature(null);
      setSelectedCandidatureId(null);
    }
  };

  const handleOpenConfirmationDialog = (id, action) => {
    const c = candidatures.find(c => c._id === id);
    if (!c) {
      showSnackbar("Candidature non trouvée", "error");
      return;
    }
    setSelectedCandidatureId(id);
    setStatusAction(action);
    const warnings = [];
    if (action === "Acceptée") {
      const requiredSkills = c.offre?.competencesRequises || [];
      const candidateSkills = c.profilCv?.competences || [];
      const matchCount = countMatchingSkills(requiredSkills, candidateSkills);
      if (matchCount < 2) warnings.push("Le candidat possède moins de 2 compétences requises.");
      if (!c.cv) warnings.push("Le CV du candidat est manquant.");
      if (!c.videoMotivation?.url && !c.lettreMotivation?.url)
        warnings.push("Le document de motivation (vidéo ou lettre) du candidat est manquant.");
    }
    setCurrentCandidature({ ...c, warnings });
    setConfirmationDialogOpen(true);
  };

  const handleCloseConfirmationDialog = () => {
    setConfirmationDialogOpen(false);
    setStatusAction("");
    if (!interviewDialogOpen && !detailsDialogOpen) {
      setCurrentCandidature(null);
      setSelectedCandidatureId(null);
    }
  };

  const handleOpenInterviewDialog = async (candidature, reschedule = false) => {
    if (!candidature || !candidature._id || !candidature.candidat || !candidature.offre) {
      showSnackbar("Erreur : Candidature invalide ou données manquantes", "error");
      return;
    }
    try {
      const interviewData = await checkInterviewScheduled(candidature._id);
      setCandidatures((prev) =>
        prev.map((c) =>
          c._id === candidature._id
            ? {
                ...c,
                interviewScheduled: interviewData.planned && !!interviewData.entretien_id && !!interviewData.date_entretien && moment(interviewData.date_entretien).isValid(),
                meet_link: interviewData.meet_link,
                entretien_id: interviewData.entretien_id,
                date_entretien: interviewData.date_entretien && moment(interviewData.date_entretien).isValid() ? interviewData.date_entretien : null,
              }
            : c
        )
      );
      setCurrentCandidature((prev) =>
        prev && prev._id === candidature._id
          ? {
              ...prev,
              interviewScheduled: interviewData.planned && !!interviewData.entretien_id && !!interviewData.date_entretien && moment(interviewData.date_entretien).isValid(),
              meet_link: interviewData.meet_link,
              entretien_id: interviewData.entretien_id,
              date_entretien: interviewData.date_entretien && moment(interviewData.date_entretien).isValid() ? interviewData.date_entretien : null,
            }
          : candidature
      );
      if (reschedule) {
        if (!interviewData.planned) {
          showSnackbar("Aucun entretien existant à replanifier", "error");
          return;
        }
        if (!interviewData.entretien_id) {
          showSnackbar("Erreur : Identifiant d'entretien manquant", "error");
          return;
        }
        if (!interviewData.date_entretien || !moment(interviewData.date_entretien).isValid()) {
          showSnackbar("Erreur : Date d'entretien invalide", "error");
          return;
        }
        setIsRescheduling(true);
        setInterviewDate(new Date(interviewData.date_entretien).toISOString().slice(0, 16));
        setMeetLink(interviewData.meet_link || "");
      } else {
        setIsRescheduling(false);
        setInterviewDate("");
        setMeetLink("");
      }
      setSelectedCandidatureId(candidature._id);
      setInterviewDialogOpen(true);
    } catch (error) {
      showSnackbar(error.response?.data?.message || "Erreur lors de la vérification de l'entretien", "error");
    }
  };

  const handleCloseInterviewDialog = () => {
    setInterviewDialogOpen(false);
    setIsRescheduling(false);
    setInterviewDate("");
    setMeetLink("");
    if (!confirmationDialogOpen && !detailsDialogOpen) {
      setCurrentCandidature(null);
      setSelectedCandidatureId(null);
    }
  };

  const handleScheduleInterview = async () => {
    let candidature = currentCandidature;
    if (!candidature || !candidature._id || !candidature.candidat || !candidature.offre) {
      candidature = candidatures.find(c => c._id === selectedCandidatureId);
      if (!candidature || !candidature._id || !candidature.candidat || !candidature.offre) {
        showSnackbar("Aucune candidature valide sélectionnée", "error");
        return;
      }
      setCurrentCandidature(candidature);
    }
    if (!interviewDate || !meetLink || !/^https?:\/\//.test(meetLink)) {
      showSnackbar("Date ou lien de réunion invalide", "warning");
      return;
    }
    if (!moment(interviewDate).isValid()) {
      showSnackbar("Date d'entretien invalide", "warning");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      const response = await axios.post(
        `${API_BASE_URL}/entretiens`,
        {
          candidature_id: candidature._id,
          candidat_id: candidature.candidat?._id || "",
          offre_id: candidature.offre?._id || "",
          date_entretien: new Date(interviewDate).toISOString(),
          meet_link: meetLink,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidatures((prev) =>
        prev.map((c) =>
          c._id === candidature._id
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
      showSnackbar("Entretien planifié avec succès", "success");
      handleCloseInterviewDialog();
    } catch (error) {
      showSnackbar(error.response?.data?.message || "Erreur lors de la planification", "error");
    }
  };

  const handleRescheduleInterview = async () => {
    let candidature = currentCandidature;
    if (!candidature || !candidature._id || !candidature.entretien_id || !candidature.candidat || !candidature.offre) {
      candidature = candidatures.find(c => c._id === selectedCandidatureId);
      if (!candidature || !candidature._id || !candidature.entretien_id || !candidature.candidat || !candidature.offre) {
        showSnackbar("Aucun entretien valide à replanifier", "error");
        return;
      }
      setCurrentCandidature(candidature);
    }
    if (!interviewDate || !meetLink || !/^https?:\/\//.test(meetLink)) {
      showSnackbar("Date ou lien de réunion invalide", "warning");
      return;
    }
    if (!moment(interviewDate).isValid()) {
      showSnackbar("Date d'entretien invalide", "warning");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      const response = await axios.put(
        `${API_BASE_URL}/entretiens/reschedule/${candidature.entretien_id}`,
        {
          date_entretien: new Date(interviewDate).toISOString(),
          meet_link: meetLink,
          statut: "Planifié",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidatures((prev) =>
        prev.map((c) =>
          c._id === candidature._id
            ? {
                ...c,
                meet_link: meetLink,
                date_entretien: new Date(interviewDate).toISOString(),
                entretien_id: response.data.entretien_id || candidature.entretien_id,
              }
            : c
        )
      );
      showSnackbar("Entretien replanifié avec succès", "success");
      handleCloseInterviewDialog();
    } catch (error) {
      showSnackbar(error.response?.data?.message || "Erreur lors de la replanification", "error");
    }
  };

  const handleUpdateStatut = useCallback(async () => {
    if (!selectedCandidatureId) {
      showSnackbar("Aucune candidature sélectionnée", "error");
      return;
    }
    const c = candidatures.find(c => c._id === selectedCandidatureId);
    if (!c) {
      showSnackbar("Candidature non trouvée", "error");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      await axios.patch(
        `${API_BASE_URL}/candidatures/${selectedCandidatureId}/statut`,
        { statut: statusAction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCandidatures((prev) =>
        prev.map((cand) =>
          cand._id === selectedCandidatureId ? { ...cand, statut: statusAction } : cand
        )
      );
      showSnackbar(`Candidature ${statusAction.toLowerCase()}`, "success");
      handleCloseConfirmationDialog();
    } catch (error) {
      showSnackbar(error.response?.data?.message || "Erreur lors de la mise à jour", "error");
    }
  }, [selectedCandidatureId, candidatures, statusAction, showSnackbar]);

  const paginate = (items, pageNumber, pageSize) => {
    const start = (pageNumber - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/authentication/sign-in");
      return;
    }
    fetchCandidatures();
  }, [navigate, fetchCandidatures]);

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
        {/* En-tête et boutons */}
        <Box sx={styles.header}>
          <Box>
            <Typography
              variant="h3"
              fontWeight={700}
              sx={{
                color: theme.palette.text.primary,
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
              Candidatures pour l'offre: {offreDetails?.titre || offreId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
              Consultez et gérez les candidatures pour cette offre
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              component={Link}
              to="/recent-visits"
              startIcon={<HistoryIcon />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                color: "#0288d1",
                "&:hover": { color: "#01579b" },
              }}
              variant="text"
            >
              Historique
            </Button>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchCandidatures}
              sx={primaryButtonStyle}
            >
              Rafraîchir
            </Button>
          </Box>
        </Box>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={8000}
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

        {/* Liste candidatures */}
        {candidatures.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: "16px" }}>
            <WorkIcon sx={{ fontSize: 60, color: theme.palette.text.disabled, mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Aucune candidature disponible
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Aucune candidature n'a été soumise pour cette offre.
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
          <Box sx={{ borderRadius: "16px", overflow: "hidden", boxShadow: theme.shadows[3], width: "100%", my: 3 }}>
            {/* Table */}
            <Box sx={{ overflowX: "auto" }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                <Box
                  component="thead"
                  sx={{
                    backgroundColor: theme.palette.primary.light,
                    color: theme.palette.primary.contrastText,
                    fontWeight: 600,
                  }}
                >
                  <tr>
                    <Box component="th" sx={{ p: 2, textAlign: "left", borderBottom: `1px solid ${theme.palette.divider}` }}>Candidat</Box>
                    <Box component="th" sx={{ p: 2, textAlign: "left", borderBottom: `1px solid ${theme.palette.divider}` }}>Offre</Box>
                    <Box component="th" sx={{ p: 2, textAlign: "left", borderBottom: `1px solid ${theme.palette.divider}` }}>Statut</Box>
                    <Box component="th" sx={{ p: 2, textAlign: "left", borderBottom: `1px solid ${theme.palette.divider}` }}>Documents</Box>
                    <Box component="th" sx={{ p: 2, textAlign: "right", borderBottom: `1px solid ${theme.palette.divider}` }}>Actions</Box>
                  </tr>
                </Box>
                <Box component="tbody">
                  {paginate(candidatures, currentPage, itemsPerPage).map((c) => (
                    <Box
                      key={c._id}
                      component="tr"
                      sx={{
                        "&:hover": { backgroundColor: theme.palette.action.hover },
                      }}
                    >
                      <Box component="td" sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        {c.candidat?.nom || "Inconnu"}
                      </Box>
                      <Box component="td" sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        {c.offre?.titre || "Non spécifié"}
                      </Box>
                      <Box component="td" sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <Chip label={c.statut} color={getStatusColor(c.statut)} size="small" sx={styles.chip} />
                      </Box>
                      <Box
                        component="td"
                        sx={{
                          p: 2,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          display: "flex",
                          gap: 1,
                        }}
                      >
                        {c.cv ? (
                          <Tooltip title="Voir le CV">
                            <IconButton onClick={() => handleFileOpen(c.cv.url, "CV")} color="primary" aria-label="Voir le CV">
                              <EyeIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          "Aucun CV"
                        )}
                        {c.videoMotivation?.url && (
                          <Tooltip title="Voir la vidéo de motivation">
                            <IconButton
                              onClick={() => handleFileOpen(c.videoMotivation.url, "vidéo de motivation")}
                              color="primary"
                              aria-label="Voir la vidéo de motivation"
                            >
                              <PlayCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {c.lettreMotivation?.url && (
                          <Tooltip title="Voir la lettre de motivation">
                            <IconButton
                              onClick={() => handleFileOpen(c.lettreMotivation.url, "lettre de motivation")}
                              color="primary"
                              aria-label="Voir la lettre de motivation"
                            >
                              <PdfIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!c.videoMotivation?.url && !c.lettreMotivation?.url && !c.cv && "Aucun document"}
                      </Box>
                      <Box component="td" sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <IconButton onClick={(e) => handleMenuOpen(e, c)} sx={styles.menuIcon} aria-label="Plus d'actions">
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
            {/* Pagination */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                  onClick={() => setCurrentPage((p) => p - 1)}
                  sx={styles.actionButton}
                >
                  Précédent
                </Button>
                <Button
                  disabled={currentPage >= Math.ceil(candidatures.length / itemsPerPage)}
                  onClick={() => setCurrentPage((p) => p + 1)}
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
          open={Boolean(anchorEl) && !!currentCandidature && !!currentCandidature._id}
          onClose={handleMenuClose}
          PaperProps={{ sx: styles.menuPaper }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          {currentCandidature && currentCandidature._id && (
            <>
              <MenuItem
                onClick={() => {
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
                  handleOpenConfirmationDialog(currentCandidature._id, "Acceptée");
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                Accepter
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleOpenConfirmationDialog(currentCandidature._id, "Refusée");
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <CancelIcon color="error" />
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
                    <ScheduleIcon color="primary" />
                  </ListItemIcon>
                  Planifier l'entretien
                </MenuItem>
              )}
              {currentCandidature.interviewScheduled && currentCandidature.entretien_id && currentCandidature.date_entretien && (
                <MenuItem
                  onClick={() => {
                    handleOpenInterviewDialog(currentCandidature, true);
                    handleMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <ScheduleIcon color="primary" />
                  </ListItemIcon>
                  Replanifier l'entretien
                </MenuItem>
              )}
              {currentCandidature.cv && (
                <MenuItem
                  onClick={() => {
                    handleDownloadFile(currentCandidature._id, currentCandidature.cv.originalName, "cv");
                    handleMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <DownloadIcon color="primary" />
                  </ListItemIcon>
                  Télécharger le CV
                </MenuItem>
              )}
              {currentCandidature.videoMotivation?.url && (
                <>
                  <MenuItem
                    onClick={() => {
                      handleFileOpen(currentCandidature.videoMotivation.url, "vidéo de motivation");
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <PlayCircleIcon color="primary" />
                    </ListItemIcon>
                    Voir la vidéo
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleDownloadFile(currentCandidature._id, currentCandidature.videoMotivation.originalName, "video");
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <DownloadIcon color="primary" />
                    </ListItemIcon>
                    Télécharger la vidéo
                  </MenuItem>
                </>
              )}
              {currentCandidature.lettreMotivation?.url && (
                <>
                  <MenuItem
                    onClick={() => {
                      handleFileOpen(currentCandidature.lettreMotivation.url, "lettre de motivation");
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <PdfIcon color="primary" />
                    </ListItemIcon>
                    Voir la lettre
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleDownloadFile(currentCandidature._id, currentCandidature.lettreMotivation.originalName, "lettre");
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <DownloadIcon color="primary" />
                    </ListItemIcon>
                    Télécharger la lettre
                  </MenuItem>
                </>
              )}
            </>
          )}
        </Menu>

        {/* Dialog de confirmation */}
        <Dialog
          open={confirmationDialogOpen}
          onClose={handleCloseConfirmationDialog}
          PaperProps={{ sx: styles.dialog }}
        >
          <DialogTitle>Confirmer le changement de statut</DialogTitle>
          <DialogContent>
            <Typography>
              Êtes-vous sûr de vouloir marquer cette candidature comme <strong>{statusAction}</strong> ?
            </Typography>
            {currentCandidature?.warnings?.length > 0 && (
              <Box sx={{ mb: 2, p: 2, bgcolor: "#fff3e0", borderRadius: "8px" }}>
                <Typography variant="subtitle2" color="warning.main" fontWeight="600">
                  Avertissements :
                </Typography>
                {currentCandidature.warnings.map((w, i) => (
                  <Typography key={i} variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    - {w}
                  </Typography>
                ))}
                <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                  Vous pouvez tout de même accepter cette candidature si vous le souhaitez.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfirmationDialog} variant="outlined" sx={styles.actionButton}>
              Annuler
            </Button>
            <Button onClick={handleUpdateStatut} variant="contained" sx={primaryButtonStyle}>
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog détails */}
        <Dialog
          open={detailsDialogOpen}
          onClose={handleCloseDetailsDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: styles.dialog }}
        >
          <DialogTitle>Détails de la candidature</DialogTitle>
          <DialogContent>
            {currentCandidature ? (
              <Box>
                {/* Détails candidat et offre */}
                <Grid container spacing={2}>
                  {/* Candidat */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Candidat
                    </Typography>
                    <Typography>Nom: {currentCandidature.candidat?.nom || "Inconnu"}</Typography>
                    <Typography>Email: {currentCandidature.candidat?.email || "Non spécifié"}</Typography>
                    {currentCandidature.candidat?.telephone && (
                      <Typography>Téléphone: {currentCandidature.candidat.telephone}</Typography>
                    )}
                  </Grid>
                  {/* Offre */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Offre
                    </Typography>
                    <Typography>Titre: {currentCandidature.offre?.titre || "Non spécifié"}</Typography>
                    {currentCandidature.offre?.dateExpiration && (
                      <Typography>
                        Date d'expiration: {moment(currentCandidature.offre.dateExpiration).format("DD/MM/YYYY")}
                      </Typography>
                    )}
                  </Grid>
                  {/* Statut */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Statut
                    </Typography>
                    <Chip label={currentCandidature.statut} color={getStatusColor(currentCandidature.statut)} size="small" sx={styles.chip} />
                  </Grid>
                  {/* Documents */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Documents
                    </Typography>
                    {/* CV */}
                    {currentCandidature.cv && (
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography>CV ({currentCandidature.cv.originalName})</Typography>
                        <Tooltip title="Voir le CV">
                          <IconButton onClick={() => handleFileOpen(currentCandidature.cv.url, "CV")} color="primary" aria-label="Voir le CV">
                            <EyeIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger le CV">
                          <IconButton
                            onClick={() => handleDownloadFile(currentCandidature._id, currentCandidature.cv.originalName, "cv")}
                            color="primary"
                            aria-label="Télécharger le CV"
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {/* Vidéo motivation */}
                    {currentCandidature.videoMotivation?.url && (
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography>Vidéo de motivation </Typography>
                        <Tooltip title="Voir la vidéo de motivation">
                          <IconButton
                            onClick={() => handleFileOpen(currentCandidature.videoMotivation.url, "vidéo de motivation")}
                            color="primary"
                            aria-label="Voir la vidéo de motivation"
                          >
                            <PlayCircleIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger la vidéo de motivation">
                          <IconButton
                            onClick={() => handleDownloadFile(currentCandidature._id, currentCandidature.videoMotivation.originalName, "video")}
                            color="primary"
                            aria-label="Télécharger la vidéo"
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {/* Lettre motivation */}
                    {currentCandidature.lettreMotivation?.url && (
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography>Lettre de motivation ({currentCandidature.lettreMotivation.originalName})</Typography>
                        <Tooltip title="Voir la lettre de motivation">
                          <IconButton
                            onClick={() => handleFileOpen(currentCandidature.lettreMotivation.url, "lettre de motivation")}
                            color="primary"
                            aria-label="Voir la lettre de motivation"
                          >
                            <PdfIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger la lettre de motivation">
                          <IconButton
                            onClick={() => handleDownloadFile(currentCandidature._id, currentCandidature.lettreMotivation.originalName, "lettre")}
                            color="primary"
                            aria-label="Télécharger la lettre"
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {!currentCandidature.videoMotivation?.url && !currentCandidature.lettreMotivation?.url && (
                      <Typography>Aucun document de motivation</Typography>
                    )}
                    {/* Entretien */}
                    {currentCandidature.interviewScheduled && currentCandidature.meet_link && currentCandidature.date_entretien && (
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <Typography>
                          Entretien prévu le {moment(currentCandidature.date_entretien).format("DD/MM/YYYY HH:mm")}
                        </Typography>
                        <Tooltip title="Rejoindre l'entretien">
                          <IconButton
                            onClick={() => handleFileOpen(currentCandidature.meet_link, "lien de réunion")}
                            color="primary"
                            aria-label="Rejoindre l'entretien"
                          >
                            <ScheduleIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {!currentCandidature.interviewScheduled && (
                      <Typography>Aucun entretien planifié</Typography>
                    )}
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Typography color="error">Aucune donnée de candidature disponible</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetailsDialog} variant="contained" sx={primaryButtonStyle}>
              Fermer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialogue planification / replanification */}
        <Dialog
          open={interviewDialogOpen}
          onClose={handleCloseInterviewDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: styles.dialog }}
        >
          <DialogTitle>{isRescheduling ? "Replanifier un entretien" : "Planifier un entretien"} </DialogTitle>
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
              type="text"
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
              {isRescheduling ? "Replanifier" : "Planifier"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default Candidatures;