import { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonButton from "components/ArgonButton";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import {
  Avatar,
  TextField,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Slide,
  IconButton
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Info as InfoIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Public as CountryIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const EntrepriseList = () => {
  const [entreprises, setEntreprises] = useState([]);
  const [filteredEntreprises, setFilteredEntreprises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/utilisateurs-entreprise", {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: page + 1, limit: rowsPerPage },
        });
        setEntreprises(response.data.data);
        setFilteredEntreprises(response.data.data);
        setTotal(response.data.total);
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
        setErrorMessage(error.response?.data?.message || "Erreur lors du chargement des entreprises.");
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, rowsPerPage]);

  useEffect(() => {
    const filtered = entreprises.filter((entreprise) =>
      (entreprise.nomEntreprise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (entreprise.email && entreprise.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (entreprise.paysEntreprise && entreprise.paysEntreprise.toLowerCase().includes(searchTerm.toLowerCase())))
    );
    setFilteredEntreprises(filtered);
  }, [searchTerm, entreprises]);

  const handleDelete = async (entrepriseId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette entreprise ?")) {
      const token = localStorage.getItem("token");
      try {
        await axios.delete(`http://localhost:5000/api/utilisateurs/${entrepriseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage("Entreprise supprimée avec succès !");
        setOpenSnackbar(true);
        setEntreprises(prev => prev.filter(e => e._id !== entrepriseId));
      } catch (error) {
        const msg = error.response?.data?.message || "Échec de la suppression.";
        setErrorMessage(msg);
        setOpenSnackbar(true);
      }
    }
  };

  const handleOpenDialog = (entreprise) => {
    setSelectedEntreprise(entreprise);
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEntreprise(null);
  };
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage("");
    setSuccessMessage("");
  };
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <ArgonBox py={3}>
        <ArgonBox
          mt={10} 
          mb={3}
          p={4}
          bgColor="white"
          borderRadius="xl"
          boxShadow={3}
          sx={{
            background: "linear-gradient(135deg, #F5F7FA 0%, #E4E7EB 100%)",
            border: "1px solid #E0E0E0",
          }}
        >
          {/* Header */}
          <ArgonBox mb={4}>
            <Grid container justifyContent="space-between" alignItems="center">
              <Grid item>
                <ArgonTypography
                  variant="h3"
                  color="text"
                  fontWeight="bold"
                  sx={{ color: "#1A1A1A", display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Icon fontSize="large">business</Icon>
                  Gestion des entreprises
                </ArgonTypography>
                <ArgonTypography variant="body1" color="text" sx={{ color: "#4A4A4A" }}>
                  {filteredEntreprises.length} entreprise(s) enregistrée(s)
                </ArgonTypography>
              </Grid>
              <Grid item>
                <TextField
                  variant="outlined"
                  placeholder="Rechercher une entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: "#4A4A4A", mr: 1 }} />,
                    sx: {
                      borderRadius: 10,
                      backgroundColor: "white",
                      transition: "all 0.3s ease",
                      "&:hover": { boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.1)" },
                    },
                  }}
                  sx={{ width: { xs: "100%", sm: 300 } }}
                />
              </Grid>
            </Grid>
          </ArgonBox>

          {/* Snackbar */}
          <Snackbar
            open={openSnackbar}
            autoHideDuration={3000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            TransitionComponent={(props) => <Slide {...props} direction="down" />}
          >
            <ArgonBox
              bgColor={errorMessage ? "error" : "success"}
              color="white"
              p={2}
              borderRadius="lg"
              boxShadow={3}
            >
              <ArgonTypography variant="body2">
                {errorMessage || successMessage}
              </ArgonTypography>
            </ArgonBox>
          </Snackbar>

          {/* Loader */}
          {loading && (
            <ArgonBox display="flex" justifyContent="center" alignItems="center" height={300}>
              <CircularProgress size={60} sx={{ color: "#3B82F6" }} />
            </ArgonBox>
          )}

          {/* Empty state */}
          {!loading && filteredEntreprises.length === 0 && (
            <ArgonBox 
              p={4} 
              textAlign="center" 
              bgColor="white"
              borderRadius="lg"
              boxShadow={2}
            >
              {searchTerm ? (
                <>
                  <ArgonTypography variant="h6" color="text" sx={{ color: "#4A4A4A", mb: 2 }}>
                    Aucune entreprise ne correspond à votre recherche
                  </ArgonTypography>
                  <ArgonButton 
                    variant="contained" 
                    color="primary" 
                    onClick={() => setSearchTerm("")}
                    sx={{ borderRadius: 2, px: 4 }}
                  >
                    Réinitialiser la recherche
                  </ArgonButton>
                </>
              ) : (
                <ArgonTypography variant="h6" color="text" sx={{ color: "#4A4A4A" }}>
                  Aucune entreprise disponible
                </ArgonTypography>
              )}
            </ArgonBox>
          )}

          {/* Entreprises list */}
          {!loading && filteredEntreprises.length > 0 && (
            <>
              <ArgonBox sx={{ overflowX: "auto", mt: 2 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ backgroundColor: "#F5F7FA" }}>
                    <tr>
                      <th style={{ padding: "12px", fontWeight: "600", color: "#1A1A1A", textAlign: "left" }}>Entreprise</th>
                      <th style={{ padding: "12px", fontWeight: "600", color: "#1A1A1A", textAlign: "left" }}>Pays</th>
                      <th style={{ padding: "12px", fontWeight: "600", color: "#1A1A1A", textAlign: "left" }}>Email</th>
                      <th style={{ padding: "12px", fontWeight: "600", color: "#1A1A1A", textAlign: "left" }}>Téléphone</th>
                      <th style={{ padding: "12px", fontWeight: "600", color: "#1A1A1A", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntreprises.map((entreprise) => (
                      <tr key={entreprise._id}
                        style={{
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F5F7FA"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td style={{ padding: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                          <Avatar sx={{ bgcolor: "#10B981", color: "white", width: 32, height: 32 }}>
                            {entreprise.nomEntreprise?.charAt(0)?.toUpperCase() || "E"}
                          </Avatar>
                          <ArgonTypography variant="button" fontWeight="medium" color="text">
                            {entreprise.nomEntreprise || entreprise.nom || "Nom non spécifié"}
                          </ArgonTypography>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <ArgonTypography variant="body2" color="text">
                            {entreprise.paysEntreprise || "Non spécifié"}
                          </ArgonTypography>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <ArgonTypography variant="body2" color="text">
                            {entreprise.email || "Non spécifié"}
                          </ArgonTypography>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <ArgonTypography variant="body2" color="text">
                            {entreprise.telephoneEntreprise || "Non spécifié"}
                          </ArgonTypography>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <Tooltip title="Détails">
                            <IconButton
                              onClick={() => handleOpenDialog(entreprise)}
                              sx={{
                                color: "#3B82F6",
                                backgroundColor: "#EFF6FF",
                                "&:hover": { backgroundColor: "#DBEAFE" },
                                marginRight: 1,
                              }}
                            >
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton
                              onClick={() => handleDelete(entreprise._id)}
                              sx={{
                                color: "#EF4444",
                                backgroundColor: "#FEE2E2",
                                "&:hover": { backgroundColor: "#FECACA" },
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ArgonBox>
              
              {/* Pagination */}
              <ArgonBox display="flex" justifyContent="center" mt={3}>
                <ArgonButton
                  variant="outlined"
                  color="primary"
                  disabled={page === 0}
                  onClick={() => setPage(prev => Math.max(prev - 1, 0))}
                  sx={{ marginRight: 1 }}
                >
                  Précédent
                </ArgonButton>
                <ArgonButton
                  variant="outlined"
                  color="primary"
                  disabled={(page + 1) * rowsPerPage >= total}
                  onClick={() => setPage(prev => prev + 1)}
                >
                  Suivant
                </ArgonButton>
              </ArgonBox>
            </>
          )}

          {/* Entreprise details dialog */}
          <Dialog
            open={openDialog}
            onClose={handleCloseDialog}
            PaperProps={{
              sx: {
                borderRadius: "16px",
                width: "100%",
                maxWidth: "600px",
                background: "linear-gradient(135deg, #F5F7FA 0%, #E4E7EB 100%)",
              },
            }}
          >
            <DialogTitle
              sx={{
                backgroundColor: "#3B82F6",
                color: "white",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <BusinessIcon />
              Détails de l'entreprise
            </DialogTitle>
            <DialogContent sx={{ py: 4 }}>
              {selectedEntreprise && (
                <ArgonBox>
                  {/* Header */}
                  <ArgonBox
                    display="flex"
                    alignItems="center"
                    flexDirection="column"
                    mb={4}
                  >
                    <Avatar
                      sx={{ 
                        bgcolor: "#10B981", 
                        color: "white", 
                        width: 80, 
                        height: 80,
                        fontSize: "2rem",
                        mb: 2
                      }}
                    >
                      {selectedEntreprise.nomEntreprise?.charAt(0)?.toUpperCase() || "E"}
                    </Avatar>
                    <ArgonTypography
                      variant="h3"
                      fontWeight="bold"
                      color="text"
                      sx={{ color: "#1A1A1A", textAlign: "center" }}
                    >
                      {selectedEntreprise.nomEntreprise || selectedEntreprise.nom || "Nom non spécifié"}
                    </ArgonTypography>
                  </ArgonBox>
                  
                  <Divider sx={{ mb: 3 }} />
                  
                  {/* Details grid */}
                  <Grid container spacing={3}>
                    {/* Adresse */}
                    <Grid item xs={12} sm={6}>
                      <ArgonBox
                        p={2}
                        borderRadius="lg"
                        bgColor="white"
                        boxShadow={2}
                      >
                        <ArgonTypography
                          variant="button"
                          fontWeight="bold"
                          color="text"
                          sx={{
                            mb: 1,
                            color: "#4A4A4A",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <LocationIcon fontSize="small" /> Adresse
                        </ArgonTypography>
                        <ArgonTypography variant="body2" color="text">
                          {selectedEntreprise.adresseEntreprise || "Non spécifiée"}
                        </ArgonTypography>
                      </ArgonBox>
                    </Grid>
                    
                    {/* Pays */}
                    <Grid item xs={12} sm={6}>
                      <ArgonBox
                        p={2}
                        borderRadius="lg"
                        bgColor="white"
                        boxShadow={2}
                      >
                        <ArgonTypography
                          variant="button"
                          fontWeight="bold"
                          color="text"
                          sx={{
                            mb: 1,
                            color: "#4A4A4A",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <CountryIcon fontSize="small" /> Pays
                        </ArgonTypography>
                        <ArgonTypography variant="body2" color="text">
                          {selectedEntreprise.paysEntreprise || "Non spécifié"}
                        </ArgonTypography>
                      </ArgonBox>
                    </Grid>
                    
                    {/* Email */}
                    <Grid item xs={12} sm={6}>
                      <ArgonBox
                        p={2}
                        borderRadius="lg"
                        bgColor="white"
                        boxShadow={2}
                      >
                        <ArgonTypography
                          variant="button"
                          fontWeight="bold"
                          color="text"
                          sx={{
                            mb: 1,
                            color: "#4A4A4A",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <EmailIcon fontSize="small" /> Email
                        </ArgonTypography>
                        <ArgonTypography variant="body2" color="text">
                          {selectedEntreprise.email || "Non spécifié"}
                        </ArgonTypography>
                      </ArgonBox>
                    </Grid>
                    
                    {/* Téléphone */}
                    <Grid item xs={12} sm={6}>
                      <ArgonBox
                        p={2}
                        borderRadius="lg"
                        bgColor="white"
                        boxShadow={2}
                      >
                        <ArgonTypography
                          variant="button"
                          fontWeight="bold"
                          color="text"
                          sx={{
                            mb: 1,
                            color: "#4A4A4A",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <PhoneIcon fontSize="small" /> Téléphone
                        </ArgonTypography>
                        <ArgonTypography variant="body2" color="text">
                          {selectedEntreprise.telephoneEntreprise || "Non spécifié"}
                        </ArgonTypography>
                      </ArgonBox>
                    </Grid>
                    
                    {/* Secteur d'activité */}
                    <Grid item xs={12}>
                      <ArgonBox
                        p={2}
                        borderRadius="lg"
                        bgColor="white"
                        boxShadow={2}
                      >
                        <ArgonTypography
                          variant="button"
                          fontWeight="bold"
                          color="text"
                          sx={{
                            mb: 1,
                            color: "#4A4A4A",
                          }}
                        >
                          Secteur d'activité
                        </ArgonTypography>
                        <ArgonTypography variant="body2" color="text">
                          {selectedEntreprise.secteurActivite || "Non spécifié"}
                        </ArgonTypography>
                      </ArgonBox>
                    </Grid>
                  </Grid>
                </ArgonBox>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <ArgonButton
                onClick={handleCloseDialog}
                variant="contained"
                color="primary"
                sx={{
                  borderRadius: "8px",
                  px: 4,
                }}
              >
                Fermer
              </ArgonButton>
            </DialogActions>
          </Dialog>
        </ArgonBox>
      </ArgonBox>
      <Footer />
    </DashboardLayout>
  );
};

export default EntrepriseList;