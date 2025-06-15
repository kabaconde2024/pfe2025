import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  Grid,
  Menu,
} from "@mui/material";
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { blue } from '@mui/material/colors';

const ListEmployes = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [userToEdit, setUserToEdit] = useState({ nom: "", email: "", role: "" });
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuUserId, setMenuUserId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    poste: ''
  });

  const loadEmployes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Aucun token d'authentification trouvé. Veuillez vous connecter.");
      }

      const params = {
        page,
        limit,
        search: filters.search,
        poste: filters.poste
      };
      const response = await axios.get("http://localhost:5000/api/employes", {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      let employeeData = [];
      let totalCount = 0;

      if (Array.isArray(response.data)) {
        employeeData = response.data;
        totalCount = response.data.length;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        employeeData = response.data.data;
        totalCount = response.data.pagination?.total || employeeData.length;
      } else {
        throw new Error("Structure de réponse API inattendue.");
      }

      setUsers(employeeData);
      setTotal(totalCount);
      setErrorMessage(null);
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Erreur lors du chargement des employés.";
      setErrorMessage(msg);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployes();
  }, [page, limit, filters]);

  const handleOpenEdit = (user) => {
    setUserToEdit({ nom: user.nom, email: user.email, role: user.role || "" });
    setSelectedUserId(user._id);
    setOpenEditDialog(true);
  };

  const handleSaveEdit = async () => {
    const token = localStorage.getItem("token");
    try {
      if (!token) {
        throw new Error("Aucun token d'authentification trouvé.");
      }
      // Update name and email
      await axios.put(`http://localhost:5000/api/users/${selectedUserId}`, {
        nom: userToEdit.nom,
        email: userToEdit.email
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update role
      await axios.put(`http://localhost:5000/api/employes/${selectedUserId}/role`, {
        role: userToEdit.role
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMessage("Employé modifié avec succès !");
      setOpenSnackbar(true);
      setOpenEditDialog(false);
      loadEmployes();
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Échec de la modification";
      setErrorMessage(msg);
      setOpenSnackbar(true);
    }
  };

  const handleAssignRole = async (userId, role) => {
    const token = localStorage.getItem("token");
    try {
      if (!token) {
        throw new Error("Aucun token d'authentification trouvé.");
      }
      await axios.put(`http://localhost:5000/api/employes/${userId}/role`, {
        role: role
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMessage(`Rôle ${role} assigné avec succès !`);
      setOpenSnackbar(true);
      // Update the local state to reflect the change
      setUsers(users.map(user => 
        user._id === userId ? { ...user, role: role } : user
      ));
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Échec de l'assignation du rôle";
      setErrorMessage(msg);
      setOpenSnackbar(true);
    }
  };

  const handleDelete = async () => {
    setOpenDialog(false);
    const token = localStorage.getItem("token");
    try {
      if (!token) {
        throw new Error("Aucun token d'authentification trouvé.");
      }
      await axios.delete(`http://localhost:5000/api/users/${selectedUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMessage("Employé supprimé avec succès !");
      setOpenSnackbar(true);
      loadEmployes();
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Échec de la suppression";
      setErrorMessage(msg);
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleMenuOpen = (event, userId) => {
    setAnchorEl(event.currentTarget);
    setMenuUserId(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuUserId(null);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  // Styles réutilisables
  const tableHeaderStyle = {
    padding: '14px 16px',
    fontWeight: 600,
    fontSize: '0.875rem',
    textAlign: 'left',
    backgroundColor: '#00B7CF',
    color: '#ffffff',
    borderBottom: '1px solid #e0e0e0'
  };

  const tableCellStyle = {
    padding: '14px 16px',
    borderBottom: '1px solid #e0e0e0',
    verticalAlign: 'middle'
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box py={11} sx={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <Box px={3} maxWidth={1200} mx="auto">
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: 'transparent', boxShadow: 'none' }}>
            
            {/* En-tête */}
            <Box mb={4} sx={{ backgroundColor: 'white', p: 3, borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>Liste des Employés</Typography>
            </Box>

            {errorMessage && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setErrorMessage(null)}>{errorMessage}</Alert>}

            {/* Filtres */}
            <Paper sx={{ mb: 3, p: 2, borderRadius: 3 }}>
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
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Poste</InputLabel>
                    <Select
                      value={filters.poste}
                      onChange={(e) => handleFilterChange('poste', e.target.value)}
                      label="Poste"
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="Développeur Full Stack">Développeur Full Stack</MenuItem>
                      <MenuItem value="Développeur Backend">Développeur Backend</MenuItem>
                      <MenuItem value="Manager">Manager</MenuItem>
                      <MenuItem value="Designer">Designer</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Tableau */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Avatar</th>
                      <th style={tableHeaderStyle}>Nom</th>
                      <th style={tableHeaderStyle}>Email</th>
                      <th style={tableHeaderStyle}>Poste</th>
                      <th style={tableHeaderStyle}>Rôle</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center' }}>
                          <Typography variant="body2">Chargement en cours...</Typography>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center' }}>
                          <Typography variant="body2">Aucun employé disponible</Typography>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user._id} style={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}>
                          <td style={tableCellStyle}>
                            <Avatar sx={{ bgcolor: blue[100], color: blue[600], width: 36, height: 36 }}>
                              {user.nom.charAt(0).toUpperCase()}
                            </Avatar>
                          </td>
                          <td style={tableCellStyle}>
                            <Typography variant="body2" fontWeight={500}>{user.nom}</Typography>
                          </td>
                          <td style={tableCellStyle}>
                            <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                          </td>
                          <td style={tableCellStyle}>
                            <Typography variant="body2" color="text.secondary">
                              {user.poste ? user.poste : 'Aucun poste'}
                            </Typography>
                          </td>
                          <td style={tableCellStyle}>
                            <Typography variant="body2" color="text.secondary">
                              {user.role || 'Aucun rôle'}
                            </Typography>
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                            <IconButton
                              size="small"
                              onClick={(event) => handleMenuOpen(event, user._id)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                            <Menu
                              anchorEl={anchorEl}
                              open={Boolean(anchorEl) && menuUserId === user._id}
                              onClose={handleMenuClose}
                              PaperProps={{
                                elevation: 1,
                                sx: {
                                  mt: 1,
                                  borderRadius: 2,
                                },
                              }}
                            >
                              <MenuItem
                                onClick={() => {
                                  handleOpenEdit(user);
                                  handleMenuClose();
                                }}
                              >
                                <EditIcon fontSize="small" sx={{ mr: 1, color: '#666' }} />
                                Éditer
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  handleAssignRole(user._id, "Coach");
                                  handleMenuClose();
                                }}
                              >
                                <Typography variant="body2" sx={{ ml: 4 }}>Assigner Coach</Typography>
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  handleAssignRole(user._id, "Formateur");
                                  handleMenuClose();
                                }}
                              >
                                <Typography variant="body2" sx={{ ml: 4 }}>Assigner Formateur</Typography>
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  setSelectedUserId(user._id);
                                  setOpenDialog(true);
                                  handleMenuClose();
                                }}
                              >
                                <DeleteIcon fontSize="small" sx={{ mr: 1, color: '#dc3545' }} />
                                Supprimer
                              </MenuItem>
                            </Menu>
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
                  onChange={(e) => { setLimit(e.target.value); setPage(1); }}
                  label="Lignes"
                >
                  {[5, 10, 25, 50].map(opt => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Pagination
                count={Math.ceil(total / limit)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
              />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Modal édition */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600, backgroundColor: '#00B7CF', color: '#ffffff' }}>
          Modifier l'employé
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {errorMessage && <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nom"
                value={userToEdit.nom}
                onChange={(e) => setUserToEdit({ ...userToEdit, nom: e.target.value })}
                sx={{ mb: 3 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                value={userToEdit.email}
                onChange={(e) => setUserToEdit({ ...userToEdit, email: e.target.value })}
                sx={{ mb: 3 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Rôle</InputLabel>
                <Select
                  value={userToEdit.role}
                  onChange={(e) => setUserToEdit({ ...userToEdit, role: e.target.value })}
                  label="Rôle"
                >
                  <MenuItem value="">Aucun rôle</MenuItem>
                  <MenuItem value="Coach">Coach</MenuItem>
                  <MenuItem value="Formateur">Formateur</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenEditDialog(false)} sx={{ borderRadius: 2 }}>
            Annuler
          </Button>
          <Button 
            onClick={handleSaveEdit}
            variant="contained"
            sx={{ 
              borderRadius: 2,
              backgroundColor: '#00B7CF',
              '&:hover': { backgroundColor: '#0095B6' }
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={Boolean(openDialog)} onClose={() => setOpenDialog(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmer la suppression</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer cet employé ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ borderRadius: 2 }}>
            Annuler
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" sx={{ borderRadius: 2 }}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={errorMessage ? "error" : "success"} sx={{ width: '100%' }}>
          {errorMessage || successMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default ListEmployes;