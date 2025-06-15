import React, { useEffect, useState } from "react";
import DashboardLayout from "../examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "../examples/Navbars/DashboardNavbar";
import {
  Card,
  CardContent,
  Typography,
  Container,
  Grid,
  CircularProgress,
  Box,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import {
  Business,
  Work,
  AttachMoney,
  LocationOn,
  Event,
  Info,
  FilterAlt,
} from "@mui/icons-material";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ListesOffres = () => {
  const [offres, setOffres] = useState([]);
  const [filteredOffres, setFilteredOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  // Filtres
  const [statusFilter, setStatusFilter] = useState("tous");
  const [expirationFilter, setExpirationFilter] = useState("toutes");

  // Récupérer les offres depuis le backend
  useEffect(() => {
    const fetchOffres = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/api/offres", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des offres");
        }

        const data = await response.json();
        setOffres(data);
        setFilteredOffres(data);
        setError(null);
      } catch (error) {
        console.error("Fetch error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOffres();
  }, []);

  // Appliquer les filtres
  useEffect(() => {
    let result = [...offres];

    // Filtre par statut
    if (statusFilter !== "tous") {
      result = result.filter((offre) => offre.status === statusFilter);
    }

    // Filtre par date d'expiration
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expirationFilter === "expirees") {
      result = result.filter(
        (offre) => new Date(offre.dateExpiration) < today
      );
    } else if (expirationFilter === "non-expirees") {
      result = result.filter(
        (offre) => new Date(offre.dateExpiration) >= today
      );
    }

    setFilteredOffres(result);
  }, [offres, statusFilter, expirationFilter]);

  const handlePublish = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/offres/${id}/publier`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la publication");
      }

      const updatedOffer = await response.json();
      setOffres(
        offres.map((offre) =>
          offre._id === id ? { ...offre, status: "publié" } : offre
        )
      );
    } catch (error) {
      console.error("Erreur lors de la publication:", error);
      setError(error.message);
    }
  };

  const handleOpenDetails = (offre) => {
    setSelectedOffre(offre);
    setOpenDialog(true);
  };

  const handleCloseDetails = () => {
    setOpenDialog(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} style={{ marginTop: 105 }}>
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <CircularProgress size={60} />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Chargement des offres...
            </Typography>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} style={{ marginTop: 105 }}>
          <Box textAlign="center" p={4}>
            <Typography color="error" variant="h6">
              Erreur: {error}
            </Typography>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} style={{ marginTop: 105 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Liste des offres
        </Typography>

        {/* Barre de filtres */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
            alignItems: "center",
          }}
        >
          <FilterAlt color="primary" />
          <TextField
            select
            label="Statut"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="tous">Tous</MenuItem>
            <MenuItem value="brouillon">Brouillon</MenuItem>
            <MenuItem value="publié">Publié</MenuItem>
          </TextField>

          <TextField
            select
            label="Expiration"
            value={expirationFilter}
            onChange={(e) => setExpirationFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="toutes">Toutes</MenuItem>
            <MenuItem value="expirees">Expirées</MenuItem>
            <MenuItem value="non-expirees">Non expirées</MenuItem>
          </TextField>
        </Box>

        <Grid container spacing={3}>
          {filteredOffres.map((offre) => (
            <Grid item xs={12} sm={6} md={4} key={offre._id}>
              <Card>
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="h6" gutterBottom>
                      {offre.titre}
                    </Typography>
                    <IconButton
                      onClick={() => handleOpenDetails(offre)}
                      color="primary"
                    >
                      <Info />
                    </IconButton>
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <Business fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary" ml={1}>
                      {offre.entreprise?.nomEntreprise || "Non spécifié"}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <Work fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary" ml={1}>
                      {offre.metier || "Non spécifié"}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <AttachMoney fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary" ml={1}>
                      {offre.remuneration} €
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary" ml={1}>
                      {offre.ville}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" mb={2}>
                    <Event fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary" ml={1}>
                      Expire le:{" "}
                      {format(new Date(offre.dateExpiration), "dd/MM/yyyy", {
                        locale: fr,
                      })}
                    </Typography>
                  </Box>

                  <Chip
                    label={offre.status}
                    color={offre.status === "publié" ? "success" : "default"}
                    size="small"
                  />

                  {offre.status === "brouillon" && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handlePublish(offre._id)}
                      sx={{ mt: 2 }}
                      fullWidth
                    >
                      Publier
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Modal pour les détails */}
        <Dialog open={openDialog} onClose={handleCloseDetails} maxWidth="md">
          <DialogTitle>Détails de l'offre</DialogTitle>
          <DialogContent dividers>
            {selectedOffre && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedOffre.titre}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                  <strong>Entreprise:</strong>{" "}
                  {selectedOffre.entreprise?.nomEntreprise || "Non spécifié"}
                </Typography>

                <Typography paragraph>
                  <strong>Description:</strong> {selectedOffre.description}
                </Typography>

                <Typography paragraph>
                  <strong>Type d'emploi:</strong> {selectedOffre.typeEmploi}
                </Typography>

                <Typography paragraph>
                  <strong>Compétences requises:</strong>{" "}
                  {selectedOffre.competencesRequises.join(", ")}
                </Typography>

                <Typography paragraph>
                  <strong>Rémunération:</strong> {selectedOffre.remuneration} €
                </Typography>

                <Typography paragraph>
                  <strong>Localisation:</strong> {selectedOffre.adresse},{" "}
                  {selectedOffre.codePostal} {selectedOffre.ville}
                </Typography>

                <Typography paragraph>
                  <strong>Date d'expiration:</strong>{" "}
                  {format(new Date(selectedOffre.dateExpiration), "PPPP", {
                    locale: fr,
                  })}
                </Typography>

                <Typography paragraph>
                  <strong>Comment postuler:</strong> {selectedOffre.commentPostuler}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetails} color="primary">
              Fermer
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
};

export default ListesOffres;