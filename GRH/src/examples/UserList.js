import { useState, useEffect, useCallback } from "react";
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
  DialogContentText,
  DialogActions,
  Alert,
  Grid,
  Chip,
  Avatar,
  Snackbar,
  Button
} from "@mui/material";
import { 
  Delete as DeleteIcon,
  Person as PersonIcon,
  PowerSettingsNew as PowerSettingsNewIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { debounce } from "lodash";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [filters, setFilters] = useState({
    search: "",
    estActif: "",
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentification requise");

      const response = await axios.get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("API Response:", response.data);

      // Handle both flat array and nested structure
      let data = Array.isArray(response.data) ? response.data : response.data?.data || [];

      // Client-side filtering
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        data = data.filter(
          (user) =>
            user.nom?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower)
        );
      }
      if (filters.estActif !== "") {
        data = data.filter((user) => user.estActif === (filters.estActif === "true"));
      }

      // Client-side pagination
      const startIndex = (page - 1) * limit;
      const paginatedData = data.slice(startIndex, startIndex + limit);

      // Relaxed ID validation
      const validUsers = paginatedData.filter((user) => user._id);
      console.log("Filtered Users:", validUsers);

      setUsers(validUsers);
      setTotal(data.length);
      setError(null);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Erreur lors du chargement des utilisateurs";
      console.error("Erreur lors de la récupération des utilisateurs:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, filters]);

  // Debounced search
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

  const handleDelete = async () => {
    setOpenDialog(false);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      await axios.delete(`http://localhost:5000/api/users/${selectedUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((user) => user._id !== selectedUserId));
      setSnackbar({
        open: true,
        message: "Utilisateur supprimé avec succès !",
        severity: "success",
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Erreur lors de la suppression de l'utilisateur";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleToggleActive = async (userId, currentActiveState) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      await axios.put(`http://localhost:5000/api/users/toggle-active/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, estActif: !currentActiveState } : u
        )
      );
      setSnackbar({
        open: true,
        message: `Utilisateur ${currentActiveState ? "désactivé" : "activé"} avec succès !`,
        severity: "success",
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Erreur lors de la modification de l'état actif";
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

  // Styles
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
            {/* Header */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
              sx={{ borderBottom: "1px solid #e0e0e0" }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <PersonIcon sx={{ color: "#00B7CF", fontSize: 32 }} />
                <Typography variant="h5" fontWeight="bold">
                  Liste des Utilisateurs
                </Typography>
              </Box>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 3 }}
                action={
                  <Button color="inherit" size="small" onClick={fetchUsers}>
                    Réessayer
                  </Button>
                }
              >
                {error}
              </Alert>
            )}

            {/* Filters */}
            <Paper sx={{ mb: 3, p: 2, borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <SearchIcon color="action" />
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
                    inputProps={{ "aria-label": "Rechercher un utilisateur" }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={filters.estActif}
                      onChange={(e) => handleFilterChange("estActif", e.target.value)}
                      label="Statut"
                      aria-label="Filtrer par statut"
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="true">Actif</MenuItem>
                      <MenuItem value="false">Inactif</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Table */}
            <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...tableHeaderStyle, textAlign: "center" }}>Avatar</th>
                      <th style={tableHeaderStyle}>Nom</th>
                      <th style={tableHeaderStyle}>Email</th>
                      <th style={{ ...tableHeaderStyle, textAlign: "center" }}>Statut</th>
                      <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} style={{ ...tableCellStyle, textAlign: "center" }}>
                          <Box display="flex" alignItems="center" justifyContent="center" py={2}>
                            <CircularProgress size={24} sx={{ mr: 1 }} />
                            <Typography variant="body2">Chargement en cours...</Typography>
                          </Box>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ ...tableCellStyle, textAlign: "center" }}>
                          <Typography variant="body2">Aucun utilisateur disponible</Typography>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user._id}>
                          <td style={{ ...tableCellStyle, textAlign: "center" }}>
                            <Avatar
                              sx={{
                                bgcolor: "#4e73df",
                                width: 36,
                                height: 36,
                                fontSize: "1rem",
                                fontWeight: 500,
                              }}
                            >
                              {user.nom?.charAt(0).toUpperCase() || "?"}
                            </Avatar>
                          </td>
                          <td style={tableCellStyle}>
                            <Typography variant="body2" fontWeight={500}>
                              {user.nom || "N/A"}
                            </Typography>
                          </td>
                          <td style={tableCellStyle}>
                            <Typography variant="body2" color="text.secondary">
                              {user.email || "N/A"}
                            </Typography>
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: "center" }}>
                            <Chip
                              label={user.estActif ? "Actif" : "Inactif"}
                              color={user.estActif ? "success" : "error"}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: "0.8125rem",
                                height: 24,
                                "& .MuiChip-label": { px: 1.2 },
                              }}
                            />
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: "right" }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Supprimer">
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: "#00B7CF",
                                    "&:hover": { backgroundColor: "rgba(0, 183, 207, 0.08)" },
                                  }}
                                  onClick={() => {
                                    setSelectedUserId(user._id);
                                    setOpenDialog(true);
                                  }}
                                  aria-label={`Supprimer l'utilisateur ${user.nom || "inconnu"}`}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={user.estActif ? "Désactiver" : "Activer"}>
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: "#00B7CF",
                                    "&:hover": { backgroundColor: "rgba(0, 183, 207, 0.08)" },
                                  }}
                                  onClick={() => handleToggleActive(user._id, user.estActif)}
                                  aria-label={
                                    user.estActif
                                      ? `Désactiver l'utilisateur ${user.nom || "inconnu"}`
                                      : `Activer l'utilisateur ${user.nom || "inconnu"}`
                                  }
                                >
                                  <PowerSettingsNewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </td>
                        </tr>
                      ))
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
                    setLimit(Number(e.target.value));
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
                aria-label="Pagination des utilisateurs"
              />

              <Button
                startIcon={<RefreshIcon />}
                onClick={fetchUsers}
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
                aria-label="Actualiser la liste des utilisateurs"
              >
                Actualiser
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          PaperProps={{ sx: { borderRadius: 3 } }}
          aria-labelledby="delete-dialog-title"
        >
          <DialogTitle
            id="delete-dialog-title"
            sx={{ fontWeight: 600, backgroundColor: "#00B7CF", color: "#ffffff" }}
          >
            Confirmer la suppression
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <DialogContentText sx={{ fontSize: 15 }}>
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setOpenDialog(false)}
              sx={{ borderRadius: 2, color: "#00B7CF" }}
              aria-label="Annuler la suppression"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              variant="contained"
              sx={{
                borderRadius: 2,
                backgroundColor: "#00B7CF",
                "&:hover": { backgroundColor: "#0095B6" },
              }}
              aria-label="Confirmer la suppression"
            >
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          aria-live="polite"
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
};

export default UserList;