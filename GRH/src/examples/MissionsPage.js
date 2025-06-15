import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Button,
  Chip,
  Avatar,
  Snackbar,
} from "@mui/material";
import axios from "axios";
import { debounce } from "lodash";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Assignment as AssignmentIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  DateRange as DateRangeIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// Format date pour l'affichage
const formatDate = (dateString) => {
  if (!dateString) return "Non définie";
  try {
    return format(parseISO(dateString), "dd MMM yyyy", { locale: fr });
  } catch {
    return "Date invalide";
  }
};

// Composant pour afficher un badge de statut
const getStatusChip = (statut) => {
  const statusMap = {
    "À faire": { label: "Planifiée", color: "primary" },
    "En cours": { label: "En cours", color: "warning" },
    "Terminé": { label: "Terminé", color: "success" },
    "Validé": { label: "Validé", color: "info" },
    "Annulée": { label: "Annulée", color: "error" },
  };

  const status = statusMap[statut] || { label: statut || "Inconnu", color: "default" };
  return (
    <Chip
      label={status.label}
      color={status.color}
      size="small"
      variant="outlined"
      sx={{
        fontSize: "0.8125rem",
        height: 24,
        "& .MuiChip-label": { px: 1.2 },
      }}
    />
  );
};

const MissionsPage = () => {
  const { contratId } = useParams();
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [filters, setFilters] = useState({
    search: "",
    statut: "",
    dateDebut: "",
    dateFin: "",
  });
  const [selectedMission, setSelectedMission] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [userId, setUserId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    feedback: "",
    feedbackDate: null,
    employeeName: "",
  });

  // Récupérer l'ID de l'utilisateur connecté
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentification requise");
        const response = await axios.get("http://localhost:5000/api/utilisateur/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.data?.id) {
          throw new Error("Identifiant utilisateur non trouvé dans la réponse");
        }
        console.log("Utilisateur connecté - ID:", response.data.id);
        setUserId(response.data.id);
      } catch (err) {
        console.error("Erreur lors de la récupération de l'utilisateur:", err);
        setError("Impossible de récupérer votre profil. Veuillez vous reconnecter.");
      }
    };
    fetchUserId();
  }, []);

  // Récupérer les missions
  const fetchMissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentification requise");
      if (!contratId || !/^[0-9a-fA-F]{24}$/.test(contratId)) {
        throw new Error("Identifiant de contrat invalide");
      }

      const params = {
        contrat: contratId,
        page,
        limit,
        search: filters.search,
        statut: filters.statut,
        dateDebut: filters.dateDebut,
        dateFin: filters.dateFin,
      };

      console.log("Fetching missions with params:", params);

      const response = await axios.get("http://localhost:5000/api/missions/contrat", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      console.log("Missions rechargées après mise à jour:", response.data);

      const data = response.data?.data || [];
      const validMissions = data.filter(
        (mission) => mission._id && /^[0-9a-fA-F]{24}$/.test(mission._id)
      );
      setMissions(validMissions);
      setTotal(response.data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Erreur lors du chargement des missions";
      console.error("Erreur lors de la récupération des missions:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchMissions();
    }
  }, [contratId, page, limit, filters, userId]);

  // Débouncer pour la recherche
  const debouncedSearch = useCallback(
    debounce((value) => {
      setFilters((prev) => ({ ...prev, search: value }));
      setPage(1);
    }, 500),
    []
  );

  const handleFilterChange = (name, value) => {
    if (name === "search") {
      debouncedSearch(value);
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
      setPage(1);
    }
  };

  const handleViewDetails = (mission) => {
    setSelectedMission(mission);
    setViewMode(true);
    setSelectedFile(null); // Réinitialiser le fichier sélectionné
  };

  const handleCloseDialog = () => {
    setSelectedMission(null);
    setViewMode(false);
    setError(null);
    setSelectedFile(null);
  };

  const handleViewFeedback = (feedback, feedbackDate, employeeName) => {
    setFeedbackModal({
      open: true,
      feedback: feedback || "Aucun feedback disponible",
      feedbackDate,
      employeeName,
    });
  };

  const handleCloseFeedbackModal = () => {
    setFeedbackModal({ open: false, feedback: "", feedbackDate: null, employeeName: "" });
  };

  const handleStatusChange = async (missionId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      console.log("Tentative de mise à jour du statut:", { missionId, newStatus });
      await axios.patch(
        `http://localhost:5000/api/missions/${missionId}/statut`,
        { statut: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Statut mis à jour avec succès");

      // Mettre à jour selectedMission immédiatement
      setSelectedMission((prev) => ({
        ...prev,
        statut: newStatus,
      }));

      // Recharger les missions pour synchroniser
      fetchMissions();

      setSnackbar({
        open: true,
        message: "Statut mis à jour avec succès !",
        severity: "success",
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Erreur lors de la mise à jour du statut";
      console.error("Erreur lors de la mise à jour du statut:", err);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
      setError(errorMessage);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    const maxSizeInMB = 5; // Limite de 5 Mo
    if (file && file.type === "application/pdf") {
      if (file.size > maxSizeInMB * 1024 * 1024) {
        setSnackbar({
          open: true,
          message: `Le fichier ne doit pas dépasser ${maxSizeInMB} Mo`,
          severity: "error",
        });
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
      }
    } else {
      setSnackbar({
        open: true,
        message: "Veuillez sélectionner un fichier PDF valide",
        severity: "error",
      });
      setSelectedFile(null);
    }
  };

  const handleUploadCompteRendu = async (missionId) => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: "Aucun fichier sélectionné",
        severity: "error",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");

      const formData = new FormData();
      formData.append("compteRendu", selectedFile);

      console.log("Tentative de téléversement du compte rendu:", { missionId });

      await axios.post(
        `http://localhost:5000/api/missions/${missionId}/compte-rendu`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSnackbar({
        open: true,
        message: "Compte rendu téléversé avec succès !",
        severity: "success",
      });
      setSelectedFile(null);
      fetchMissions();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Erreur lors du téléversement du compte rendu";
      console.error("Erreur lors du téléversement:", err);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleDownloadCompteRendu = async (missionId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");

      console.log("Tentative de téléchargement du compte rendu:", { missionId });

      const response = await axios.get(
        `http://localhost:5000/api/missions/${missionId}/compte-rendu`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `compte-rendu-${missionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: "Compte rendu téléchargé avec succès !",
        severity: "success",
      });
    } catch (err) {
      let errorMessage = "Erreur lors du téléchargement du compte rendu";
      if (err.response?.data) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch (e) {
          console.error("Erreur lors de l'analyse de l'erreur:", e);
        }
      }
      console.error("Erreur lors du téléchargement:", err);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Styles réutilisables
  const tableHeaderStyle = {
    padding: "14px 16px",
    fontWeight: 600,
    fontSize: "0.875rem",
    textAlign: "left",
    backgroundColor: "#00B7CF",
    color: "#ffffff",
    borderBottom: "1px solid #e0e0e0",
  };

  const tableCellStyle = {
    padding: "14px 16px",
    borderBottom: "1px solid #e0e0e0",
    verticalAlign: "middle",
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box py={3} mt={10} sx={{ backgroundColor: "#f5f7fa", minHeight: "100vh" }}>
        <Box px={3} maxWidth={1200} mx="auto">
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            {/* En-tête */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
              sx={{ borderBottom: "1px solid #e0e0e0" }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Tooltip title="Retour aux contrats">
                  <IconButton
                    onClick={() => navigate("/contrat_candidat")}
                    sx={{
                      color: "#00B7CF",
                      "&:hover": { backgroundColor: "rgba(0, 183, 207, 0.08)" },
                    }}
                    aria-label="Retour aux contrats"
                  >
                    <ArrowBackIcon />
                  </IconButton>
                </Tooltip>
                <Typography variant="h5" fontWeight="bold">
                  Mes Missions
                </Typography>
              </Box>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 3 }}
                action={
                  <Button color="inherit" size="small" onClick={fetchMissions}>
                    Réessayer
                  </Button>
                }
              >
                {error}
              </Alert>
            )}

            {/* Filtres */}
            <Paper sx={{ mb: 3, p: 2, borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <DateRangeIcon color="action" />
                <Typography variant="h6">Filtres</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Rechercher"
                    variant="outlined"
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
                    inputProps={{ "aria-label": "Rechercher une mission" }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={filters.statut}
                      onChange={(e) => handleFilterChange("statut", e.target.value)}
                      label="Statut"
                      aria-label="Filtrer par statut"
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="À faire">Planifiée</MenuItem>
                      <MenuItem value="En cours">En cours</MenuItem>
                      <MenuItem value="Terminé">Terminé</MenuItem>
                      <MenuItem value="Validé">Validé</MenuItem>
                      <MenuItem value="Annulée">Annulée</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Date de début après"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateDebut}
                    onChange={(e) => handleFilterChange("dateDebut", e.target.value)}
                    inputProps={{ "aria-label": "Filtrer par date de début" }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Date de fin avant"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateFin}
                    onChange={(e) => handleFilterChange("dateFin", e.target.value)}
                    inputProps={{ "aria-label": "Filtrer par date de fin" }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Tableau */}
            <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Titre</th>
                      <th style={tableHeaderStyle}>Statut Global</th>
                      <th style={tableHeaderStyle}>Période</th>
                      <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading || !userId ? (
                      <tr>
                        <td colSpan={4} style={{ ...tableCellStyle, textAlign: "center" }}>
                          <Box display="flex" alignItems="center" justifyContent="center" py={2}>
                            <CircularProgress size={24} sx={{ mr: 1 }} />
                            <Typography variant="body2">Chargement en cours...</Typography>
                          </Box>
                        </td>
                      </tr>
                    ) : missions.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ ...tableCellStyle, textAlign: "center" }}>
                          <Typography variant="body2">Aucune mission disponible</Typography>
                        </td>
                      </tr>
                    ) : (
                      missions.map((mission) => {
                        const isAssigned = mission.employee?.userId?.toString() === userId;
                        return (
                          <tr key={mission._id}>
                            <td style={tableCellStyle}>
                              <Box display="flex" alignItems="center" gap={2}>
                                <Avatar sx={{ bgcolor: "#4e73df", width: 36, height: 36 }}>
                                  <AssignmentIcon fontSize="small" />
                                </Avatar>
                                <Typography variant="body2" fontWeight={500}>
                                  {mission.nom || mission.titre || "Mission sans titre"}
                                </Typography>
                              </Box>
                            </td>
                            <td style={tableCellStyle}>{getStatusChip(mission.statut)}</td>
                            <td style={tableCellStyle}>
                              <Box display="flex" flexDirection="column">
                                <Typography variant="body2">{formatDate(mission.dateDebut)}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(mission.dateFin)}
                                </Typography>
                              </Box>
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: "right" }}>
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Voir détails">
                                  <IconButton
                                    size="small"
                                    sx={{
                                      color: "#00B7CF",
                                      "&:hover": { backgroundColor: "rgba(0, 183, 207, 0.08)" },
                                    }}
                                    onClick={() => handleViewDetails(mission)}
                                    aria-label={`Voir détails de la mission ${mission.nom || mission.titre || "sans titre"}`}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </Box>
            </Paper>

            {/* Pagination */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
              <FormControl variant="outlined" size="small" sx={{ minWidth: 80 }}>
                <InputLabel>Lignes</InputLabel>
                <Select
                  value={limit}
                  onChange={(e) => {
                    setLimit(e.target.value);
                    setPage(1);
                  }}
                  label="Lignes"
                  aria-label="Nombre de lignes par page"
                >
                  {[5, 10, 25, 50].map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Pagination
                count={Math.ceil(total / limit)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
                aria-label="Pagination des missions"
              />

              <Button
                startIcon={<RefreshIcon />}
                onClick={fetchMissions}
                variant="contained"
                sx={{
                  backgroundColor: "#00B7CF",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#0095B6",
                    boxShadow:
                      "0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)",
                  },
                }}
                aria-label="Actualiser la liste des missions"
              >
                Actualiser
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* Dialogue de détails */}
        <Dialog
          open={viewMode}
          onClose={handleCloseDialog}
          fullWidth
          maxWidth="md"
          PaperProps={{ sx: { borderRadius: 3 } }}
          aria-labelledby="dialog-title"
        >
          <DialogTitle
            id="dialog-title"
            sx={{ fontWeight: 600, backgroundColor: "#00B7CF", color: "#ffffff" }}
          >
            Détails de la mission
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {selectedMission && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ color: "#00B7CF" }}>
                    {selectedMission.nom || selectedMission.titre || "Mission sans titre"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Statut Global:
                  </Typography>
                  <Typography variant="body1">{getStatusChip(selectedMission.statut)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Date de début:
                  </Typography>
                  <Typography variant="body1">{formatDate(selectedMission.dateDebut)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Date de fin:
                  </Typography>
                  <Typography variant="body1">{formatDate(selectedMission.dateFin)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Description:
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedMission.description || "Aucune description disponible"}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Employé assigné :
                  </Typography>
                  {selectedMission.employee ? (
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      <Box display="flex" alignItems="center" gap={1} sx={{ m: 0.5, flexWrap: "wrap" }}>
                        <Chip
                          avatar={<Avatar>{selectedMission.employee.nom ? selectedMission.employee.nom[0] : "?"}</Avatar>}
                          label={selectedMission.employee.nom || "Inconnu"}
                          variant="outlined"
                        />
                        {selectedMission.employee.userId?.toString() === userId ? (
                          <>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <InputLabel>Mon Statut</InputLabel>
                              <Select
                                value={selectedMission.statut || "À faire"}
                                onChange={(e) =>
                                  handleStatusChange(selectedMission._id, e.target.value)
                                }
                                label="Mon Statut"
                                disabled={
                                  selectedMission.statut === "Validé" ||
                                  selectedMission.statut === "Annulée"
                                }
                                aria-label={`Modifier le statut de ${selectedMission.employee.nom || "Inconnu"}`}
                              >
                                <MenuItem value="À faire">Planifiée</MenuItem>
                                <MenuItem value="En cours">En cours</MenuItem>
                                <MenuItem value="Terminé">Terminé</MenuItem>
                                <MenuItem value="Annulée">Annulée</MenuItem>
                              </Select>
                            </FormControl>
                            {selectedMission.statut === "Terminé" && (
                              <Box display="flex" flexDirection="column" gap={2}>
                                <Box display="flex" flexDirection="column" gap={1}>
                                  <Box display="flex" alignItems="center" gap={2}>
                                    <Button
                                      variant="outlined"
                                      component="label"
                                      startIcon={<UploadFileIcon />}
                                      sx={{
                                        borderColor: "#00B7CF",
                                        color: "#00B7CF",
                                        "&:hover": {
                                          borderColor: "#0095B6",
                                          backgroundColor: "rgba(0, 183, 207, 0.08)",
                                        },
                                      }}
                                      disabled={
                                        selectedMission.statut === "Validé" ||
                                        selectedMission.statut === "Annulée"
                                      }
                                      aria-label="Sélectionner un fichier PDF"
                                    >
                                      Choisir un fichier PDF
                                      <input
                                        type="file"
                                        accept="application/pdf"
                                        hidden
                                        onChange={handleFileChange}
                                      />
                                    </Button>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={<UploadFileIcon />}
                                      onClick={() => handleUploadCompteRendu(selectedMission._id)}
                                      disabled={
                                        !selectedFile ||
                                        selectedMission.statut === "Validé" ||
                                        selectedMission.statut === "Annulée"
                                      }
                                      sx={{
                                        backgroundColor: "#00B7CF",
                                        "&:hover": { backgroundColor: "#0095B6" },
                                      }}
                                      aria-label="Téléverser le compte rendu"
                                    >
                                      Soumettre
                                    </Button>
                                  </Box>
                                  {selectedFile && (
                                    <Typography variant="body2" color="text.secondary">
                                      Fichier sélectionné : {selectedFile.name}
                                    </Typography>
                                  )}
                                </Box>
                                {selectedMission.compteRendu?.filename && (
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2" color="text.secondary">
                                      Soumis le {formatDate(selectedMission.compteRendu.dateSoumission)}
                                    </Typography>
                                    <Tooltip title="Télécharger le compte rendu">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDownloadCompteRendu(selectedMission._id)}
                                        sx={{
                                          color: "#00B7CF",
                                          "&:hover": { backgroundColor: "rgba(0, 183, 207, 0.08)" },
                                        }}
                                        aria-label="Télécharger le compte rendu"
                                      >
                                        <DownloadIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    {selectedMission.compteRendu?.feedback && (
                                      <Tooltip title="Voir le feedback">
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            handleViewFeedback(
                                              selectedMission.compteRendu.feedback,
                                              selectedMission.compteRendu.feedbackDate,
                                              selectedMission.employee.nom || "Inconnu"
                                            )
                                          }
                                          sx={{
                                            color: "#00B7CF",
                                            "&:hover": { backgroundColor: "rgba(0, 183, 207, 0.08)" },
                                          }}
                                          aria-label={`Voir le feedback pour ${selectedMission.employee.nom || "Inconnu"}`}
                                        >
                                          <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Box>
                                )}
                              </Box>
                            )}
                          </>
                        ) : (
                          <>
                            {getStatusChip(selectedMission.statut)}
                            {selectedMission.compteRendu?.feedback && (
                              <Tooltip title="Voir le feedback">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleViewFeedback(
                                      selectedMission.compteRendu.feedback,
                                      selectedMission.compteRendu.feedbackDate,
                                      selectedMission.employee.nom || "Inconnu"
                                    )
                                  }
                                  sx={{
                                    color: "#00B7CF",
                                    "&:hover": { backgroundColor: "rgba(0, 183, 207, 0.08)" },
                                  }}
                                  aria-label={`Voir le feedback pour ${selectedMission.employee.nom || "Inconnu"}`}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      Aucun employé assigné
                    </Typography>
                  )}
                </Grid>
                {selectedMission.tags?.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Tags:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {selectedMission.tags.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          color="secondary"
                          variant="outlined"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} sx={{ borderRadius: 2 }} aria-label="Fermer le dialogue">
              Fermer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialogue pour afficher le feedback */}
        <Dialog
          open={feedbackModal.open}
          onClose={handleCloseFeedbackModal}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: { borderRadius: 3 } }}
          aria-labelledby="feedback-dialog-title"
        >
          <DialogTitle
            id="feedback-dialog-title"
            sx={{ fontWeight: 600, backgroundColor: "#00B7CF", color: "#ffffff" }}
          >
            Feedback pour {feedbackModal.employeeName}
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Feedback:
            </Typography>
            <Typography variant="body1" paragraph>
              {feedbackModal.feedback}
            </Typography>
            {feedbackModal.feedbackDate && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Date du feedback:
                </Typography>
                <Typography variant="body1">
                  {formatDate(feedbackModal.feedbackDate)}
                </Typography>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleCloseFeedbackModal}
              sx={{ borderRadius: 2 }}
              aria-label="Fermer le dialogue de feedback"
            >
              Fermer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar pour feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          aria-live="polite"
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
};

export default MissionsPage;