import { useState, useEffect } from "react";
import {
  Container,
  Button,
  Typography,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  styled
} from "@mui/material";
import { 
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  VerifiedUser as VerifiedUserIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { indigo, green, orange, blue, red } from '@mui/material/colors';

// Style personnalisé pour le tableau HTML
const StyledTable = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: theme.spacing(3),
  '& th': {
    fontWeight: 600,
    padding: theme.spacing(2),
    textAlign: 'left',
    backgroundColor: theme.palette.grey[100],
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  '& td': {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  '& tr:hover': {
    backgroundColor: theme.palette.action.hover
  }
}));

const UserValidation = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [validatedUsers, setValidatedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/users/pending", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const allUsers = response.data || [];
        setUsers(allUsers);
        setPendingUsers(allUsers.filter(user => !user.estValide));
        setValidatedUsers(allUsers.filter(user => user.estValide));
      } catch (error) {
        showNotification("Erreur lors du chargement des utilisateurs", 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleValidateUser = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/users/validate/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedUsers = users.map(user => 
        user._id === userId ? { ...user, estValide: true } : user
      );
      
      setUsers(updatedUsers);
      setPendingUsers(updatedUsers.filter(user => !user.estValide));
      setValidatedUsers(updatedUsers.filter(user => user.estValide));
      
      showNotification("Utilisateur validé avec succès");
    } catch (error) {
      showNotification("Erreur lors de la validation de l'utilisateur", 'error');
    }
  };

  const handleRejectUser = (userId) => {
    setSelectedUserId(userId);
    setOpenDialog(true);
  };

  const handleDelete = async () => {
    setOpenDialog(false);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/users/${selectedUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const updatedUsers = users.filter(user => user._id !== selectedUserId);
      setUsers(updatedUsers);
      setPendingUsers(updatedUsers.filter(user => !user.estValide));
      setValidatedUsers(updatedUsers.filter(user => user.estValide));
      
      showNotification("Utilisateur rejeté avec succès");
    } catch (error) {
      showNotification(error.response?.data?.message || "Échec de la suppression", 'error');
    }
  };

  const getUserRole = (user) => {
    if (!user.profils?.length) return "Aucun rôle";
    return user.profils.map(profil => profil.name).join(", ");
  };

  const currentUsers = activeTab === 'pending' ? pendingUsers : validatedUsers;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 4, mt:10 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: indigo[800], display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedUserIcon fontSize="large" />
                Validation des Utilisateurs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestion des demandes d'inscription
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Badge badgeContent={pendingUsers.length} color="error" overlap="circular">
                <Button
                  variant={activeTab === 'pending' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => setActiveTab('pending')}
                  startIcon={<HourglassEmptyIcon />}
                  sx={{ borderRadius: 2, px: 3 }}
                >
                  En attente
                </Button>
              </Badge>
              
              <Button
                variant={activeTab === 'validated' ? 'contained' : 'outlined'}
                color="success"
                onClick={() => setActiveTab('validated')}
                startIcon={<CheckCircleIcon />}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Validés
              </Button>
            </Box>
          </Box>

          <Snackbar
            open={notification.open}
            autoHideDuration={3000}
            onClose={() => setNotification({ ...notification, open: false })}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert severity={notification.severity}>
              {notification.message}
            </Alert>
          </Snackbar>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress size={60} />
            </Box>
          ) : (
            <Box component={Paper} elevation={3} sx={{ mt: 3, overflow: 'hidden' }}>
              <StyledTable>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Date d'inscription</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map(user => (
                    <tr key={user._id}>
                      <td>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: blue[100], color: blue[600] }}>
                            {user.nom?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography>{user.nom}</Typography>
                        </Box>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <Chip 
                          label={getUserRole(user)} 
                          size="small"
                          sx={{ 
                            backgroundColor: activeTab === 'pending' ? orange[100] : green[100],
                            color: activeTab === 'pending' ? orange[800] : green[800]
                          }}
                        />
                      </td>
                      <td>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {activeTab === 'pending' ? (
                          <>
                            <Tooltip title="Valider">
                              <IconButton
                                onClick={() => handleValidateUser(user._id)}
                                sx={{ color: green[600], backgroundColor: green[50], mr: 1 }}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Rejeter">
                              <IconButton
                                onClick={() => handleRejectUser(user._id)}
                                sx={{ color: red[600], backgroundColor: red[50] }}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip title="Voir les détails">
                            <IconButton
                              onClick={() => navigate(`/user-details/${user._id}`)}
                              sx={{ color: blue[600], backgroundColor: blue[50] }}
                            >
                              <PersonIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>

              {currentUsers.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', backgroundColor: 'background.paper' }}>
                  <Typography variant="h6" color="text.secondary">
                    {activeTab === 'pending' 
                      ? "Aucun utilisateur en attente de validation" 
                      : "Aucun utilisateur validé"}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)}
          PaperProps={{ sx: { borderRadius: 3, width: '100%', maxWidth: '400px' } }}
        >
          <DialogTitle sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 600 }}>
            Rejeter l'utilisateur
          </DialogTitle>
          <DialogContent sx={{ py: 3 }}>
            <DialogContentText>
              Êtes-vous sûr de vouloir rejeter cette demande d'inscription ? 
              L'utilisateur sera définitivement supprimé.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setOpenDialog(false)} variant="outlined" sx={{ borderRadius: 2, px: 3 }}>
              Annuler
            </Button>
            <Button onClick={handleDelete} variant="contained" color="error" sx={{ borderRadius: 2, px: 3 }}>
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
};

export default UserValidation;