import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "../examples/Navbars/DashboardNavbar";
import {
  Card,
  CardContent,
  Typography,
  Container,
  Grid,
  Box,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  Chip,
  Badge,
  Snackbar,
  Alert,
  Skeleton,
  Divider,
  Fade,
} from "@mui/material";
import {
  Business,
  Work,
  AttachMoney,
  LocationOn,
  Schedule,
  Info,
  Add,
  Edit,
  Delete,
  Close,
  Assignment,
  Archive,
  Warning,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";

// Custom Styles
const JobCard = styled(Card)(({ theme }) => ({
  borderRadius: '16px',
  boxShadow: theme.shadows[4],
  background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-6px)',
    boxShadow: theme.shadows[10],
  },
  position: 'relative',
  marginBottom: theme.spacing(3),
  border: '1px solid #e2e8f0',
  minHeight: '400px',
  display: 'flex',
  flexDirection: 'column',
}));

const ContractBadge = styled(Box)(({ theme, contracttype }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  padding: theme.spacing(1, 2.5),
  backgroundColor:
    contracttype === 'CDI' ? '#32e1e9' :
    contracttype === 'CDD' ? '#16a34a' :
    contracttype === 'Stage' ? '#f97316' :
    contracttype === 'Alternance' ? '#9333ea' : '#6b7280',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.9rem',
  borderRadius: '0 16px 16px 0',
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
  borderRadius: '16px',
  background: 'linear-gradient(145deg, #ffffff, #f1f5f9)',
  boxShadow: theme.shadows[3],
  marginBottom: theme.spacing(4),
  transition: 'box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
  overflowX: 'auto',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: '10px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.9rem',
  padding: theme.spacing(1, 2.5),
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: theme.shadows[5],
  },
}));

const MesOffres = () => {
  const navigate = useNavigate();
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [filter, setFilter] = useState("");
  const [expirationFilter, setExpirationFilter] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const checkAuthToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      clearAuthAndRedirect();
    }
  };

  const clearAuthAndRedirect = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userProfile");
    navigate("/authentification/sign-in");
  };

  const fetchOffres = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Session expirée, veuillez vous reconnecter");
      }

      const response = await fetch("http://localhost:5000/api/offres/utilisateur/mes-offres", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la récupération des offres");
      }

      const data = await response.json();
      setOffres(data);
    } catch (error) {
      console.error("Erreur détaillée:", error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (offre) => {
    setSelectedOffre(offre);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedOffre(null);
  };

  const handleDeleteOpen = (offre) => {
    setSelectedOffre(offre);
    setOpenDeleteDialog(true);
  };

  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    setSelectedOffre(null);
  };

  const confirmDeleteOffre = async () => {
    if (!selectedOffre) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/offres/${selectedOffre._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la suppression de l'offre");
      }

      setOffres((prevOffres) => prevOffres.filter((offre) => offre._id !== selectedOffre._id));
      setSnackbar({
        open: true,
        message: "Offre supprimée avec succès !",
        severity: "success",
      });
      handleDeleteClose();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: "error",
      });
    }
  };

  const publierOffre = async (offreId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/offres/${offreId}/publier`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la publication de l'offre");
      }

      const updatedOffre = await response.json();
      setOffres((prevOffres) =>
        prevOffres.map((offre) => (offre._id === updatedOffre.offre._id ? updatedOffre.offre : offre))
      );
      setSnackbar({
        open: true,
        message: "Offre publiée avec succès !",
        severity: "success",
      });
    } catch (error) {
      console.error("Erreur lors de la publication:", error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: "error",
      });
    }
  };

  const handleViewCandidatures = (offreId) => {
    navigate(`/candidatures/${offreId}`);
  };

  const handleEditOffre = (offreId) => {
    navigate(`/modifier-offre/${offreId}`);
  };

  const resetFilters = () => {
    setFilter("");
    setExpirationFilter("");
  };

  useEffect(() => {
    checkAuthToken();
    fetchOffres();
  }, []);

  const isExpiringSoon = (expirationDate) => {
    const now = new Date();
    const diffInDays = (new Date(expirationDate) - now) / (1000 * 60 * 60 * 24);
    return diffInDays <= 3 && diffInDays >= 0;
  };

  const filteredOffres = offres.filter((offre) => {
    const now = new Date();
    const expirationDate = new Date(offre.dateExpiration);
    const isActive = expirationDate > now;
    const matchesSearch =
      offre.titre.toLowerCase().includes(filter.toLowerCase()) ||
      offre.metier.toLowerCase().includes(filter.toLowerCase());
    const matchesExpiration = expirationFilter
      ? new Date(expirationDate).toISOString().split("T")[0] === expirationFilter
      : true;

    return matchesSearch && isActive && matchesExpiration;
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container
        maxWidth="lg"
        sx={{
          py: 8,
          mt: 6,
          bgcolor: 'linear-gradient(145deg, #f1f5f9, #e2e8f0)',
          borderRadius: '16px',
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 700,
            color: '#111827',
            mb: 5,
            fontFamily: '"Inter", sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          Offres en cours
        </Typography>

        <FilterContainer>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
            sx={{ flexWrap: "wrap" }}
          >
            <input
              type="text"
              placeholder="Recherche par titre ou métier"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '1rem',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => e.target.style.border = '1px solid #2563eb'}
              onBlur={(e) => e.target.style.border = '1px solid #d1d5db'}
            />
            <input
              type="date"
              value={expirationFilter}
              onChange={(e) => setExpirationFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '1rem',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => e.target.style.border = '1px solid #2563eb'}
              onBlur={(e) => e.target.style.border = '1px solid #d1d5db'}
            />
            <ActionButton
              variant="outlined"
              onClick={resetFilters}
              sx={{
                bgcolor: '#ffffff',
                borderColor: '#6b7280',
                color: '#6b7280',
                '&:hover': { borderColor: '#2563eb', color: '#2563eb' },
              }}
            >
              Réinitialiser
            </ActionButton>
          </Stack>
        </FilterContainer>

        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 5, gap: 2 }}>
          <ActionButton
            variant="outlined"
            startIcon={<Archive />}
            onClick={() => navigate("/archives-offres")}
            sx={{
              bgcolor: '#ffffff',
              borderColor: '#6b7280',
              color: '#6b7280',
              '&:hover': { borderColor: '#2563eb', color: '#2563eb' },
            }}
          >
            Archives
          </ActionButton>
          <ActionButton
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate("/creer-offre")}
            sx={{
              bgcolor: '#32e1e9',
              color: '#ffffff',
              '&:hover': { bgcolor: '#2bc8d0' },
            }}
          >
            Nouvelle Offre
          </ActionButton>
        </Stack>

        {loading ? (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Skeleton
                  variant="rectangular"
                  height={400}
                  sx={{ borderRadius: '16px', bgcolor: '#e5e7eb' }}
                />
              </Grid>
            ))}
          </Grid>
        ) : filteredOffres.length === 0 ? (
          <Box
            sx={{
              p: 5,
              textAlign: "center",
              borderRadius: '16px',
              bgcolor: '#ffffff',
              boxShadow: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{ mb: 1, color: '#111827', fontFamily: '"Inter", sans-serif', fontWeight: 600 }}
            >
              Aucune offre active
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: '#6b7280', fontFamily: '"Inter", sans-serif' }}
            >
              Créez une nouvelle offre ou ajustez vos filtres.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredOffres.map((offre) => (
              <Grid item xs={12} sm={6} md={4} key={offre._id}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <JobCard>
                    <ContractBadge contracttype={offre.typeContrat}>
                      {offre.typeContrat}
                    </ContractBadge>
                    <CardContent
                      sx={{
                        pt: 5,
                        pb: 3,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        {isExpiringSoon(offre.dateExpiration) && (
                          <Chip
                            icon={<Warning />}
                            label="Expire bientôt"
                            size="small"
                            sx={{
                              mb: 2,
                              bgcolor: '#fee2e2',
                              color: '#dc2626',
                              fontWeight: 600,
                              borderRadius: '8px',
                            }}
                          />
                        )}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 2.5,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: '#111827',
                              fontFamily: '"Inter", sans-serif',
                              lineHeight: 1.4,
                              maxWidth: "60%",
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {offre.titre}
                          </Typography>
                          {offre.status === "brouillon" && (
                            <ActionButton
                              variant="contained"
                              size="small"
                              onClick={() => publierOffre(offre._id)}
                              sx={{
                                bgcolor: '#16a34a',
                                color: '#ffffff',
                                fontSize: '0.8rem',
                                padding: theme => theme.spacing(0.75, 1.5),
                                '&:hover': { bgcolor: '#15803d' },
                              }}
                            >
                              Publier
                            </ActionButton>
                          )}
                        </Box>

                        <Box sx={{ mb: 2.5 }}>
                          <Stack spacing={1.5}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Work sx={{ color: '#6b7280', fontSize: 20 }} />
                              <Typography
                                variant="body2"
                                sx={{
                                  color: '#4b5563',
                                  fontFamily: '"Inter", sans-serif',
                                  fontWeight: 500,
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {offre.metier}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <LocationOn sx={{ color: '#6b7280', fontSize: 20 }} />
                              <Typography
                                variant="body2"
                                sx={{
                                  color: '#4b5563',
                                  fontFamily: '"Inter", sans-serif',
                                  fontWeight: 500,
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {offre.ville}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Schedule sx={{ color: '#6b7280', fontSize: 20 }} />
                              <Typography
                                variant="body2"
                                sx={{
                                  color: '#4b5563',
                                  fontFamily: '"Inter", sans-serif',
                                  fontWeight: 500,
                                }}
                              >
                                Expire: {new Date(offre.dateExpiration).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>

                        <Box sx={{ mb: 2.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: '#111827',
                              display: "block",
                              mb: 1.5,
                              fontFamily: '"Inter", sans-serif',
                            }}
                          >
                            Compétences
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {offre.competencesRequises?.slice(0, 2).map((comp, index) => (
                              <Chip
                                key={index}
                                label={comp}
                                size="small"
                                sx={{
                                  bgcolor: '#e5e7eb',
                                  color: '#374151',
                                  borderRadius: '8px',
                                  fontWeight: 500,
                                }}
                              />
                            ))}
                            {offre.competencesRequises?.length > 2 && (
                              <Chip
                                label={`+${offre.competencesRequises.length - 2}`}
                                size="small"
                                sx={{
                                  bgcolor: '#e5e7eb',
                                  color: '#374151',
                                  borderRadius: '8px',
                                  fontWeight: 500,
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>

                      <Box>
                        <Divider sx={{ mb: 2.5, bgcolor: '#d1d5db' }} />
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Badge badgeContent={offre.candidatures || 0} color="primary">
                            <ActionButton
                              variant="text"
                              size="small"
                              startIcon={<Assignment />}
                              onClick={() => handleViewCandidatures(offre._id)}
                              sx={{
                                color: '#2563eb',
                                fontFamily: '"Inter", sans-serif',
                                fontWeight: 600,
                              }}
                            >
                              Candidatures
                            </ActionButton>
                          </Badge>
                          <Box>
                            <Tooltip title="Détails">
                              <IconButton
                                onClick={() => handleOpenModal(offre)}
                                sx={{
                                  color: '#6b7280',
                                  '&:hover': { color: '#2563eb' },
                                }}
                              >
                                <Info fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Modifier">
                              <IconButton
                                onClick={() => handleEditOffre(offre._id)}
                                sx={{
                                  color: '#6b7280',
                                  '&:hover': { color: '#2563eb' },
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton
                                onClick={() => handleDeleteOpen(offre)}
                                sx={{
                                  color: '#6b7280',
                                  '&:hover': { color: '#dc2626' },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </JobCard>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Modal des détails */}
        <Dialog
          open={openModal}
          onClose={handleCloseModal}
          maxWidth="md"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: '16px', boxShadow: 10, bgcolor: '#f8fafc' } }}
          TransitionComponent={Fade}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: '#f1f5f9',
              borderBottom: '1px solid #d1d5db',
              py: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#111827',
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Détails de l'Offre
            </Typography>
            <IconButton onClick={handleCloseModal} sx={{ color: '#6b7280' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ py: 5, bgcolor: '#f8fafc' }}>
            {selectedOffre && (
              <Box>
                <Box
                  sx={{
                    mb: 4,
                    p: 4,
                    bgcolor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: '#111827',
                      mb: 3,
                      fontFamily: '"Inter", sans-serif',
                    }}
                  >
                    Informations Générales
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                        <Business sx={{ color: '#6b7280', fontSize: 20 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#374151',
                            fontFamily: '"Inter", sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          <strong>Entreprise:</strong>{" "}
                          {selectedOffre.entreprise?.nomEntreprise || "Non spécifié"}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                        <Work sx={{ color: '#6b7280', fontSize: 20 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#374151',
                            fontFamily: '"Inter", sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          <strong>Métier:</strong> {selectedOffre.metier}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                        <AttachMoney sx={{ color: '#6b7280', fontSize: 20 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#374151',
                            fontFamily: '"Inter", sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          <strong>Rémunération:</strong> {selectedOffre.remuneration} €
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                        <LocationOn sx={{ color: '#6b7280', fontSize: 20 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#374151',
                            fontFamily: '"Inter", sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          <strong>Localisation:</strong> {selectedOffre.adresse},{" "}
                          {selectedOffre.codePostal} {selectedOffre.ville}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                        <Schedule sx={{ color: '#6b7280', fontSize: 20 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#374151',
                            fontFamily: '"Inter", sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          <strong>Expiration:</strong>{" "}
                          {new Date(selectedOffre.dateExpiration).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                        <Schedule sx={{ color: '#6b7280', fontSize: 20 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#374151',
                            fontFamily: '"Inter", sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          <strong>Publié:</strong>{" "}
                          {new Date(selectedOffre.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                <Box
                  sx={{
                    mb: 4,
                    p: 4,
                    bgcolor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: '#111827',
                      mb: 3,
                      fontFamily: '"Inter", sans-serif',
                    }}
                  >
                    Description
                  </Typography>
                  <Typography
                    sx={{
                      color: '#374151',
                      lineHeight: 1.7,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1rem',
                    }}
                  >
                    {selectedOffre.description}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    mb: 4,
                    p: 4,
                    bgcolor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: '#111827',
                      mb: 3,
                      fontFamily: '"Inter", sans-serif',
                    }}
                  >
                    Responsabilités
                  </Typography>
                  <Typography
                    sx={{
                      color: '#374151',
                      lineHeight: 1.7,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1rem',
                    }}
                  >
                    {selectedOffre.responsabilite}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    mb: 4,
                    p: 4,
                    bgcolor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: '#111827',
                      mb: 3,
                      fontFamily: '"Inter", sans-serif',
                    }}
                  >
                    Compétences Requises
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                    {selectedOffre.competencesRequises.map((competence, index) => (
                      <Chip
                        key={index}
                        label={competence}
                        sx={{
                          bgcolor: '#e5e7eb',
                          color: '#374151',
                          borderRadius: '8px',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 4,
                    bgcolor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: '#111827',
                      mb: 3,
                      fontFamily: '"Inter", sans-serif',
                    }}
                  >
                    Comment Postuler
                  </Typography>
                  <Typography
                    sx={{
                      color: '#374151',
                      lineHeight: 1.7,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1rem',
                    }}
                  >
                    {selectedOffre.commentPostuler}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              borderTop: '1px solid #d1d5db',
              p: 3,
              bgcolor: '#f1f5f9',
            }}
          >
            <ActionButton
              onClick={handleCloseModal}
              variant="outlined"
              sx={{
                borderColor: '#6b7280',
                color: '#6b7280',
                '&:hover': { borderColor: '#2563eb', color: '#2563eb' },
              }}
            >
              Fermer
            </ActionButton>
            {selectedOffre && (
              <ActionButton
                variant="contained"
                onClick={() => handleViewCandidatures(selectedOffre._id)}
                startIcon={<Assignment />}
                sx={{
                  bgcolor: '#2563eb',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#1d4ed8' },
                }}
              >
                Candidatures
              </ActionButton>
            )}
          </DialogActions>
        </Dialog>

        {/* Dialog de confirmation */}
        <Dialog
          open={openDeleteDialog}
          onClose={handleDeleteClose}
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: '16px',
              boxShadow: 10,
              bgcolor: '#f8fafc',
            },
          }}
          TransitionComponent={Fade}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: '#f1f5f9',
              borderBottom: '1px solid #d1d5db',
              py: 3,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#111827',
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Confirmer la Suppression
            </Typography>
            <IconButton onClick={handleDeleteClose} sx={{ color: '#6b7280' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ py: 4, bgcolor: '#f8fafc' }}>
            <Typography
              variant="body1"
              sx={{
                color: '#374151',
                fontFamily: '"Inter", sans-serif',
                fontWeight: 500,
              }}
            >
              Êtes-vous sûr de vouloir supprimer l'offre "{selectedOffre?.titre}" ?
            </Typography>
          </DialogContent>
          <DialogActions
            sx={{
              borderTop: '1px solid #d1d5db',
              p: 3,
              bgcolor: '#f1f5f9',
            }}
          >
            <ActionButton
              onClick={handleDeleteClose}
              variant="outlined"
              sx={{
                borderColor: '#6b7280',
                color: '#6b7280',
                '&:hover': { borderColor: '#2563eb', color: '#2563eb' },
              }}
            >
              Annuler
            </ActionButton>
            <ActionButton
              onClick={confirmDeleteOffre}
              variant="contained"
              sx={{
                bgcolor: '#dc2626',
                color: '#ffffff',
                '&:hover': { bgcolor: '#b91c1c' },
              }}
            >
              Supprimer
            </ActionButton>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{
              width: "100%",
              borderRadius: '10px',
              boxShadow: 5,
              fontFamily: '"Inter", sans-serif',
              bgcolor: snackbar.severity === 'success' ? '#dcfce7' : '#fee2e2',
              color: '#111827',
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

export default MesOffres;