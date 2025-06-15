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
  Paper,
  Snackbar,
  Alert,
  Skeleton,
  Divider,
} from "@mui/material";
import {
  Business,
  Work,
  AttachMoney,
  LocationOn,
  Schedule,
  Info,
  ArrowBack,
  Edit,
  Delete,
  Close,
  Assignment,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";

// Custom Styles
const PremiumCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
  borderRadius: 12,
  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.06)`,
  background: "#FFFFFF",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-3px)",
    boxShadow: `0 8px 24px rgba(0, 0, 0, 0.12)`,
  },
  overflow: "hidden",
  position: "relative",
  minHeight: '360px',
  display: 'flex',
  flexDirection: 'column',
}));

const ContractBadge = styled(Box)(({ theme, contracttype }) => ({
  position: "absolute",
  top: 12,
  right: 12,
  padding: theme.spacing(0.5, 1.5),
  background:
    contracttype === "CDI"
      ? "#32e1e9"
      : contracttype === "CDD"
      ? "#2DD4BF"
      : contracttype === "Stage"
      ? "#F472B6"
      : contracttype === "Alternance"
      ? "#6366F1"
      : "#6B7280",
  color: "#FFFFFF",
  fontWeight: 600,
  fontSize: "0.75rem",
  borderRadius: 8,
  textTransform: "uppercase",
}));

const FilterPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  background: "#FFFFFF",
  boxShadow: `0 2px 12px rgba(0, 0, 0, 0.05)`,
  marginBottom: theme.spacing(3),
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: "none",
  padding: theme.spacing(0.75, 2),
  fontWeight: 500,
  fontSize: "0.85rem",
  transition: "all 0.2s ease",
  "&:hover": {
    transform: "scale(1.03)",
    boxShadow: `0 3px 10px rgba(0, 0, 0, 0.1)`,
  },
}));

const ArchivesOffres = () => {
  const navigate = useNavigate();
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
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
      setError(error.message);
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

  const handleEditOffre = (offreId) => {
    navigate(`/modifier-offre/${offreId}`);
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

  const resetFilters = () => {
    setFilter("");
    setExpirationFilter("");
  };

  useEffect(() => {
    checkAuthToken();
    fetchOffres();
  }, []);

  const filteredOffres = offres.filter((offre) => {
    const now = new Date();
    const expirationDate = new Date(offre.dateExpiration);
    const isExpired = expirationDate <= now;
    const matchesSearch =
      offre.titre.toLowerCase().includes(filter.toLowerCase()) ||
      offre.metier.toLowerCase().includes(filter.toLowerCase());
    const matchesExpiration = expirationFilter
      ? new Date(expirationDate).toISOString().split("T")[0] === expirationFilter
      : true;

    return matchesSearch && isExpired && matchesExpiration;
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container
        maxWidth="xl"
        sx={{
          py: 6,
          mt: 10,
          bgcolor: "linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              fontFamily: '"Roboto", sans-serif',
              letterSpacing: "-0.5px",
            }}
          >
            Offres Expirées
          </Typography>
          <ActionButton
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/MesOffres")}
            sx={{
              bgcolor: "#32e1e9",
              color: "#FFFFFF",
              "&:hover": { bgcolor: "#2bc8d0" },
            }}
          >
            Offres en cours
          </ActionButton>
        </Stack>

        <FilterPaper>
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
                bgcolor: "#FFFFFF",
                borderColor: "#D1D5DB",
                color: theme => theme.palette.primary.main,
                "&:hover": { bgcolor: "#F3F4F6", borderColor: theme => theme.palette.primary.main },
              }}
            >
              Réinitialiser
            </ActionButton>
          </Stack>
        </FilterPaper>

        {loading ? (
          <Grid container spacing={2.5}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Skeleton
                  variant="rectangular"
                  height={360}
                  sx={{ borderRadius: 12, bgcolor: "#E5E7EB" }}
                />
              </Grid>
            ))}
          </Grid>
        ) : error ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 12,
              bgcolor: "#FFFFFF",
              boxShadow: `0 2px 12px rgba(0, 0, 0, 0.05)`,
            }}
          >
            <Typography
              variant="h5"
              sx={{ mb: 1, color: "#EF4444", fontFamily: '"Roboto", sans-serif' }}
            >
              Erreur: {error}
            </Typography>
          </Paper>
        ) : filteredOffres.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 12,
              bgcolor: "#FFFFFF",
              boxShadow: `0 2px 12px rgba(0, 0, 0, 0.05)`,
            }}
          >
            <Typography
              variant="h5"
              sx={{ mb: 1, color: theme => theme.palette.primary.main, fontFamily: '"Roboto", sans-serif' }}
            >
              Aucune offre expirée
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "#6B7280", fontFamily: '"Roboto", sans-serif' }}
            >
              Aucune offre expirée ne correspond à votre recherche.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            {filteredOffres.map((offre) => (
              <Grid item xs={12} sm={6} md={4} key={offre._id}>
                <PremiumCard>
                  <ContractBadge contracttype={offre.typeContrat}>
                    {offre.typeContrat}
                  </ContractBadge>
                  <Box
                    sx={{
                      height: 70,
                      bgcolor: "#6B7280",
                      borderRadius: "12px 12px 0 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Work sx={{ fontSize: 32, color: "#FFFFFF" }} />
                  </Box>
                  <CardContent
                    sx={{
                      p: 2,
                      pb: 2.5,
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: theme => theme.palette.primary.main,
                          fontFamily: '"Roboto", sans-serif',
                          lineHeight: 1.3,
                          mb: 1,
                          fontSize: "1rem",
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {offre.titre}
                      </Typography>
                      <Box sx={{ mb: 1.5 }}>
                        <Stack spacing={0.8}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <Schedule sx={{ color: "#6B7280", fontSize: 16 }} />
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#F472B6",
                                fontFamily: '"Roboto", sans-serif',
                                fontSize: "0.8rem",
                              }}
                            >
                              Expirée le: {new Date(offre.dateExpiration).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <Business sx={{ color: "#6B7280", fontSize: 16 }} />
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#6B7280",
                                fontFamily: '"Roboto", sans-serif',
                                fontSize: "0.8rem",
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {offre.entreprise?.nomEntreprise || "Non spécifié"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <Work sx={{ color: "#6B7280", fontSize: 16 }} />
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#6B7280",
                                fontFamily: '"Roboto", sans-serif',
                                fontSize: "0.8rem",
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {offre.metier}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <AttachMoney sx={{ color: "#6B7280", fontSize: 16 }} />
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#6B7280",
                                fontFamily: '"Roboto", sans-serif',
                                fontSize: "0.8rem",
                              }}
                            >
                              {offre.remuneration} €
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <LocationOn sx={{ color: "#6B7280", fontSize: 16 }} />
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#6B7280",
                                fontFamily: '"Roboto", sans-serif',
                                fontSize: "0.8rem",
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {offre.ville}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>

                      <Box sx={{ mb: 1.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 500,
                            color: theme => theme.palette.primary.main,
                            display: "block",
                            mb: 0.8,
                            fontFamily: '"Roboto", sans-serif',
                            fontSize: "0.7rem",
                          }}
                        >
                          Compétences
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                          {offre.competencesRequises?.slice(0, 2).map((comp, index) => (
                            <Chip
                              key={index}
                              label={comp}
                              size="small"
                              sx={{
                                bgcolor: "#E5E7EB",
                                color: theme => theme.palette.primary.main,
                                fontWeight: 500,
                                borderRadius: 6,
                                fontFamily: '"Roboto", sans-serif',
                                fontSize: "0.7rem",
                              }}
                            />
                          ))}
                          {offre.competencesRequises?.length > 2 && (
                            <Chip
                              label={`+${offre.competencesRequises.length - 2}`}
                              size="small"
                              sx={{
                                bgcolor: "#E5E7EB",
                                color: theme => theme.palette.primary.main,
                                fontWeight: 500,
                                borderRadius: 6,
                                fontFamily: '"Roboto", sans-serif',
                                fontSize: "0.7rem",
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Box>
                      <Divider sx={{ mb: 1, bgcolor: "#E5E7EB" }} />
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
                            onClick={() => navigate(`/candidatures/${offre._id}`)}
                            sx={{
                              color: "#2DD4BF",
                              fontFamily: '"Roboto", sans-serif',
                              fontSize: "0.75rem",
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
                                color: "#6B7280",
                                "&:hover": { color: theme => theme.palette.primary.main },
                              }}
                            >
                              <Info fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Modifier">
                            <IconButton
                              onClick={() => handleEditOffre(offre._id)}
                              sx={{
                                color: "#6B7280",
                                "&:hover": { color: theme => theme.palette.primary.main },
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton
                              onClick={() => handleDeleteOpen(offre)}
                              sx={{
                                color: "#6B7280",
                                "&:hover": { color: "#EF4444" },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </PremiumCard>
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
          sx={{
            "& .MuiDialog-paper": {
              borderRadius: 12,
              bgcolor: "#FFFFFF",
              boxShadow: `0 6px 20px rgba(0, 0, 0, 0.1)`,
            },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "#F9FAFB",
              py: 2,
              px: 3,
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: theme => theme.palette.primary.main,
                fontFamily: '"Roboto", sans-serif',
              }}
            >
              Détails de l'Offre
            </Typography>
            <IconButton onClick={handleCloseModal} sx={{ color: "#6B7280" }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ py: 3, px: 3, bgcolor: "#FFFFFF" }}>
            {selectedOffre && (
              <Box>
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: "#F9FAFB",
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: theme => theme.palette.primary.main,
                      mb: 1.5,
                      fontFamily: '"Roboto", sans-serif',
                    }}
                  >
                    Informations Générales
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Business sx={{ color: "#6B7280", fontSize: 18 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: theme => theme.palette.primary.main,
                            fontFamily: '"Roboto", sans-serif',
                            fontSize: "0.85rem",
                          }}
                        >
                          <strong>Entreprise:</strong>{" "}
                          {selectedOffre.entreprise?.nomEntreprise || "Non spécifié"}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Work sx={{ color: "#6B7280", fontSize: 18 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: theme => theme.palette.primary.main,
                            fontFamily: '"Roboto", sans-serif',
                            fontSize: "0.85rem",
                          }}
                        >
                          <strong>Métier:</strong> {selectedOffre.metier}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <AttachMoney sx={{ color: "#6B7280", fontSize: 18 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: theme => theme.palette.primary.main,
                            fontFamily: '"Roboto", sans-serif',
                            fontSize: "0.85rem",
                          }}
                        >
                          <strong>Rémunération:</strong> {selectedOffre.remuneration} €
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <LocationOn sx={{ color: "#6B7280", fontSize: 18 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: theme => theme.palette.primary.main,
                            fontFamily: '"Roboto", sans-serif',
                            fontSize: "0.85rem",
                          }}
                        >
                          <strong>Localisation:</strong> {selectedOffre.adresse},{" "}
                          {selectedOffre.codePostal} {selectedOffre.ville}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Schedule sx={{ color: "#6B7280", fontSize: 18 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#F472B6",
                            fontFamily: '"Roboto", sans-serif',
                            fontSize: "0.85rem",
                          }}
                        >
                          <strong>Expirée le:</strong>{" "}
                          {new Date(selectedOffre.dateExpiration).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Schedule sx={{ color: "#6B7280", fontSize: 18 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: theme => theme.palette.primary.main,
                            fontFamily: '"Roboto", sans-serif',
                            fontSize: "0.85rem",
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
                    mb: 2,
                    p: 2,
                    bgcolor: "#F9FAFB",
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: theme => theme.palette.primary.main,
                      mb: 1.5,
                      fontFamily: '"Roboto", sans-serif',
                    }}
                  >
                    Description
                  </Typography>
                  <Typography
                    sx={{
                      color: "#6B7280",
                      lineHeight: 1.6,
                      fontFamily: '"Roboto", sans-serif',
                      fontSize: "0.85rem",
                    }}
                  >
                    {selectedOffre.description}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: "#F9FAFB",
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: theme => theme.palette.primary.main,
                      mb: 1.5,
                      fontFamily: '"Roboto", sans-serif',
                    }}
                  >
                    Responsabilités
                  </Typography>
                  <Typography
                    sx={{
                      color: "#6B7280",
                      lineHeight: 1.6,
                      fontFamily: '"Roboto", sans-serif',
                      fontSize: "0.85rem",
                    }}
                  >
                    {selectedOffre.responsabilite}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: "#F9FAFB",
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: theme => theme.palette.primary.main,
                      mb: 1.5,
                      fontFamily: '"Roboto", sans-serif',
                    }}
                  >
                    Compétences Requises
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                    {selectedOffre.competencesRequises.map((competence, index) => (
                      <Chip
                        key={index}
                        label={competence}
                        sx={{
                          bgcolor: "#E5E7EB",
                          color: theme => theme.palette.primary.main,
                          fontWeight: 500,
                          borderRadius: 6,
                          fontFamily: '"Roboto", sans-serif',
                          fontSize: "0.75rem",
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    bgcolor: "#F9FAFB",
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: theme => theme.palette.primary.main,
                      mb: 1.5,
                      fontFamily: '"Roboto", sans-serif',
                    }}
                  >
                    Comment Postuler
                  </Typography>
                  <Typography
                    sx={{
                      color: "#6B7280",
                      lineHeight: 1.6,
                      fontFamily: '"Roboto", sans-serif',
                      fontSize: "0.85rem",
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
              borderTop: "1px solid #E5E7EB",
              p: 2,
              bgcolor: "#F9FAFB",
              justifyContent: "space-between",
            }}
          >
            <ActionButton
              onClick={handleCloseModal}
              variant="outlined"
              sx={{
                bgcolor: "#FFFFFF",
                borderColor: "#D1D5DB",
                color: theme => theme.palette.primary.main,
                "&:hover": { bgcolor: "#F3F4F6", borderColor: theme => theme.palette.primary.main },
              }}
            >
              Fermer
            </ActionButton>
            {selectedOffre && (
              <ActionButton
                variant="contained"
                onClick={() => navigate(`/candidatures/${selectedOffre._id}`)}
                startIcon={<Assignment />}
                sx={{
                  bgcolor: "#2DD4BF",
                  color: "#FFFFFF",
                  "&:hover": { bgcolor: "#14B8A6" },
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
            "& .MuiDialog-paper": {
              borderRadius: 12,
              bgcolor: "#FFFFFF",
              boxShadow: `0 6px 20px rgba(0, 0, 0, 0.1)`,
            },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "#F9FAFB",
              py: 2,
              px: 3,
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: theme => theme.palette.primary.main,
                fontFamily: '"Roboto", sans-serif',
              }}
            >
              Confirmer la Suppression
            </Typography>
            <IconButton onClick={handleDeleteClose} sx={{ color: "#6B7280" }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ py: 3, px: 3, bgcolor: "#FFFFFF" }}>
            <Typography
              variant="body1"
              sx={{
                color: "#6B7280",
                fontFamily: '"Roboto", sans-serif',
                fontSize: "0.85rem",
              }}
            >
              Êtes-vous sûr de vouloir supprimer l'offre "{selectedOffre?.titre}" ?
            </Typography>
          </DialogContent>
          <DialogActions
            sx={{
              borderTop: "1px solid #E5E7EB",
              p: 2,
              bgcolor: "#F9FAFB",
            }}
          >
            <ActionButton
              onClick={handleDeleteClose}
              variant="outlined"
              sx={{
                bgcolor: "#FFFFFF",
                borderColor: "#D1D5DB",
                color: theme => theme.palette.primary.main,
                "&:hover": { bgcolor: "#F3F4F6", borderColor: theme => theme.palette.primary.main },
              }}
            >
              Annuler
            </ActionButton>
            <ActionButton
              onClick={confirmDeleteOffre}
              variant="contained"
              sx={{
                bgcolor: "#EF4444",
                color: "#FFFFFF",
                "&:hover": { bgcolor: "#DC2626" },
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
              borderRadius: 10,
              bgcolor: "#FFFFFF",
              boxShadow: `0 4px 16px rgba(0, 0, 0, 0.1)`,
              fontFamily: '"Roboto", sans-serif',
              fontWeight: 500,
              fontSize: "0.85rem",
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

export default ArchivesOffres;