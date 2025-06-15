import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Avatar,
  Button,
} from "@mui/material";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { green, red, orange, blue } from "@mui/material/colors";

const defaultStats = {
  totalCandidatures: 0,
  candidaturesParStatut: [],
  evolutionCandidatures: [],
  repartitionParType: [],
};

const formatNumber = (num) => new Intl.NumberFormat("fr-FR").format(num);

const StatistiqueCandidatures = () => {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30days");

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Vous devez être connecté pour accéder à ces données");
      setLoading(false);
      return;
    }

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const statsResponse = await fetch(
        `http://localhost:5000/api/candidatures/statistiques?range=${timeRange}`,
        requestOptions
      );

      if (!statsResponse.ok) {
        const errorData = await statsResponse.json();
        let message = errorData.message || "Erreur lors de la récupération des statistiques";
        if (errorData.code === "NO_OFFERS_FOUND") {
          message = "Vous n'avez publié aucune offre. Créez une offre pour voir les statistiques.";
        } else if (errorData.code === "NO_CANDIDATURES_FOUND") {
          message = `${message} Essayez une période différente (ex: 30 jours) ou vérifiez vos candidatures.`;
        } else if (errorData.code === "INVALID_RANGE") {
          message = "Période sélectionnée invalide. Veuillez choisir une autre période.";
        }
        throw new Error(message);
      }

      const statsData = await statsResponse.json();

      // Formatage des données pour les graphiques
      const formattedRepartition = statsData.repartitionParType.map((item) => ({
        type: item.type || "Non spécifié",
        candidatures: item.candidatures || 0,
      }));

      // Formatage des données d'évolution
      const formattedEvolution = statsData.evolutionCandidatures.map((item) => ({
        ...item,
        periode:
          timeRange === "90days" || timeRange === "all"
            ? `Semaine ${item.periode.split("-")[1] || item.periode}`
            : item.periode,
      }));

      setStats({
        ...statsData,
        repartitionParType: formattedRepartition,
        evolutionCandidatures: formattedEvolution,
      });

      setError(null);
    } catch (err) {
      console.error("Erreur lors de la récupération des données:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Fonction pour obtenir la couleur de l'état des candidatures
  const getStatusColor = (status) => {
    switch (status) {
      case "Acceptée":
        return green[500];
      case "Refusée":
        return red[500];
      case "En cours d'évaluation":
        return orange[500];
      case "En attente":
        return blue[300];
      default:
        return blue[500];
    }
  };

  // Affichage lors du chargement
  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={60} />
              <Typography variant="h6">Chargement des données...</Typography>
            </Stack>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="lg">
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="60vh"
            flexDirection="column"
            gap={2}
          >
            <Typography color="error">{error}</Typography>
            <Button
              variant="outlined"
              onClick={() => setTimeRange("30days")}
              disabled={timeRange === "30days"}
            >
              Revenir à 30 jours
            </Button>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  // Affichage principal du composant
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 4, mt: 10 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h3" component="h1">
            Vue d'ensemble des candidatures
          </Typography>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Période</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Période"
            >
              <MenuItem value="7days">7 derniers jours</MenuItem>
              <MenuItem value="30days">30 derniers jours</MenuItem>
              <MenuItem value="90days">90 derniers jours</MenuItem>
              <MenuItem value="all">Toutes périodes</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3} mb={4}>
          {[
            {
              title: "Total candidatures",
              value: stats.totalCandidatures,
              unit: "candidatures",
              icon: "📄",
              color: blue[500],
            },
            {
              title: "Acceptées",
              value: stats.candidaturesParStatut.find((s) => s.statut === "Acceptée")?.count || 0,
              unit: "candidatures",
              icon: "✅",
              color: green[500],
            },
            {
              title: "En attente",
              value: stats.candidaturesParStatut.find((s) => s.statut === "En attente")?.count || 0,
              unit: "candidatures",
              icon: "⏳",
              color: blue[300],
            },
            {
              title: "Refusées",
              value: stats.candidaturesParStatut.find((s) => s.statut === "Refusée")?.count || 0,
              unit: "candidatures",
              icon: "❌",
              color: red[500],
            },
          ].map((item, index) => (
            <Grid item xs={12} md={3} key={index}>
              <Card elevation={3} sx={{ height: "100%" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: item.color, mr: 2, color: "white", fontSize: "1.5rem" }}>
                      {item.icon}
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold">
                      {formatNumber(item.value)}
                    </Typography>
                  </Box>
                  <Typography color="text.secondary">{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.unit}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Répartition par statut
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  {stats.candidaturesParStatut.length > 0 ? (
                    <PieChart>
                      <Pie
                        data={stats.candidaturesParStatut}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="count"
                        nameKey="statut"
                        label={({ statut, percent }) => `${statut}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.candidaturesParStatut.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getStatusColor(entry.statut)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} candidatures`, "Nombre"]} />
                      <Legend />
                    </PieChart>
                  ) : (
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      height="100%"
                      flexDirection="column"
                      gap={2}
                    >
                      <Typography>Aucune donnée disponible</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Essayez une période différente (ex: 30 jours)
                      </Typography>
                    </Box>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Évolution des candidatures
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  {stats.evolutionCandidatures.length > 0 ? (
                    <LineChart
                      data={stats.evolutionCandidatures}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periode" angle={-45} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`${value} candidatures`, "Nombre"]}
                        labelFormatter={(label) => `Période: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="candidatures"
                        name="Candidatures"
                        stroke="#8884d8"
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  ) : (
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      height="100%"
                      flexDirection="column"
                      gap={2}
                    >
                      <Typography>Aucune donnée disponible</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Essayez une période différente (ex: 30 jours)
                      </Typography>
                    </Box>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Répartition par type d'emploi
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  {stats.repartitionParType.length > 0 ? (
                    <BarChart
                      data={stats.repartitionParType}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" angle={-45} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`${value} candidatures`, "Nombre"]}
                        labelFormatter={(label) => `Type: ${label}`}
                      />
                      <Legend />
                      <Bar
                        dataKey="candidatures"
                        name="Candidatures"
                        fill="#8884d8"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  ) : (
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      height="100%"
                      flexDirection="column"
                      gap={2}
                    >
                      <Typography>Aucune donnée disponible</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Essayez une période différente (ex: 30 jours)
                      </Typography>
                    </Box>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  );
};

StatistiqueCandidatures.propTypes = {
  // Props si nécessaire
};

export default StatistiqueCandidatures;