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
  Paper,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
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
import { green, blue, orange } from "@mui/material/colors";

// Couleurs pour les graphiques
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

// Formatage des nombres
const formatNumber = (num) => new Intl.NumberFormat("fr-FR").format(num);

// Composant Tooltip personnalisé avec propTypes
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="body2">{`${formatNumber(payload[0].value)} consultations`}</Typography>
        <Typography variant="body2">{`${payload[0].payload.pourcentage.toFixed(1)}% du total`}</Typography>
      </Paper>
    );
  }
  return null;
};

CustomPieTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number,
      payload: PropTypes.shape({
        pourcentage: PropTypes.number,
      }),
    })
  ),
};

// Données par défaut pour éviter les erreurs
const defaultStats = {
  totalConsultations: 0,
  moyenneConsultations: 0,
  nombreOffres: 0,
  offresPopulaires: [],
  repartitionTypeEmploi: [],
  evolutionConsultations: [],
};

const StatistiquesOffres = () => {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30days");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Vous devez être connecté pour accéder à ces données");
        }

        const [statsResponse, evolutionResponse, repartitionResponse] = await Promise.all([
          fetch(`http://localhost:5000/api/offres/statistiques/consultations?range=${timeRange}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }).catch(() => Promise.reject(new Error("Erreur réseau ou serveur indisponible"))),
          fetch(`http://localhost:5000/api/offres/statistiques/evolution-consultations?range=${timeRange}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }).catch(() => Promise.reject(new Error("Erreur réseau ou serveur indisponible"))),
          fetch(`http://localhost:5000/api/offres/statistiques/repartition-type-emploi?range=${timeRange}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }).catch(() => Promise.reject(new Error("Erreur réseau ou serveur indisponible"))),
        ]);

        if (!statsResponse.ok || !evolutionResponse.ok || !repartitionResponse.ok) {
          let errorData;
          try {
            errorData = await Promise.any([
              statsResponse.json().catch(() => ({})),
              evolutionResponse.json().catch(() => ({})),
              repartitionResponse.json().catch(() => ({})),
            ]);
          } catch {
            errorData = {};
          }
          let message = errorData.message || "Une erreur inattendue est survenue";
          if (errorData.code === "NO_OFFERS_FOUND" || statsResponse.status === 404) {
            setStats(defaultStats);
            setError("Aucun employé avec un contrat signé n’a été trouvé pour votre entreprise.");
            return;
          } else if (errorData.code === "INVALID_RANGE") {
            message = "Période sélectionnée invalide. Veuillez choisir une autre période.";
          } else if (errorData.code === "NOT_ENTERPRISE") {
            message = "Accès réservé aux comptes entreprise.";
          } else if (errorData.code === "INVALID_USER_ID") {
            message = "Identifiant utilisateur invalide.";
          } else if (statsResponse.status === 500) {
            message = "Erreur serveur. Veuillez réessayer plus tard.";
          }
          throw new Error(message);
        }

        const [statsData, evolutionData, repartitionData] = await Promise.all([
          statsResponse.json(),
          evolutionResponse.json(),
          repartitionResponse.json(),
        ]);

        const offresPopulaires = (statsData.offresPopulaires || []).map((offre) => ({
          titre: offre?.titre
            ? offre.titre.length > 20
              ? `${offre.titre.substring(0, 20)}...`
              : offre.titre
            : "Titre non disponible",
          consultations: offre?.consultations || 0,
          datePublication: offre?.datePublication || new Date(),
        }));

        const evolutionConsultations = evolutionData.map((item) => ({
          name:
            timeRange === "90days"
              ? `Semaine ${item.period.split("-")[1] || item.period}`
              : timeRange === "all"
              ? item.period
              : item.period,
          consultations: item.count || 0,
        }));

        const repartitionTypeEmploi = repartitionData.map((item) => ({
          type: item.type || "Non spécifié",
          consultations: item.consultations || 0,
          pourcentage: item.pourcentage || 0,
        }));

        setStats({
          totalConsultations: statsData.totalConsultations || 0,
          moyenneConsultations: statsData.moyenneConsultations || 0,
          nombreOffres: statsData.nombreOffres || 0,
          offresPopulaires,
          repartitionTypeEmploi,
          evolutionConsultations,
        });
        setError(null);
      } catch (err) {
        console.error("Erreur lors de la récupération des données:", err);
        setError(err.message || "Une erreur inattendue est survenue");
        setStats(defaultStats);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange]);

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={60} />
              <Typography variant="h6">Chargement des statistiques...</Typography>
            </Stack>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

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
            <Typography color="text.secondary">{error}</Typography>
            {error.includes("Aucun employé avec un contrat signé") ? (
              <Button variant="contained" href="/MesOffres">
                Publier une offre
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={() => setTimeRange("30days")}
                disabled={timeRange === "30days"}
              >
                Revenir à 30 jours
              </Button>
            )}
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 4, mt: 10 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h3" component="h1">
            Statistiques des Consultations
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

        {/* Cartes de synthèse */}
        <Grid container spacing={3} mb={4}>
          {[
            {
              title: "Total consultations",
              value: stats.totalConsultations,
              unit: "consultations",
              icon: "📊",
              color: blue[500],
            },
            {
              title: "Moyenne par offre",
              value: stats.moyenneConsultations,
              unit: "consultations/offre",
              icon: "📈",
              color: green[500],
            },
            {
              title: "Offres publiées",
              value: stats.nombreOffres,
              unit: "offres",
              icon: "📋",
              color: orange[500],
            },
          ].map((item, index) => (
            <Grid item xs={12} md={4} key={index}>
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

        {/* Graphiques */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Top 5 des offres les plus consultées
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  {stats.offresPopulaires.length > 0 ? (
                    <BarChart
                      data={stats.offresPopulaires}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="titre" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatNumber(value), "Consultations"]} />
                      <Legend />
                      <Bar dataKey="consultations" name="Consultations" fill="#8884d8" radius={[4, 4, 0, 0]} />
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
                      <Typography>Aucun employé avec un contrat signé n’a été trouvé pour votre entreprise.</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Publiez une offre pour voir les statistiques
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
                  {stats.repartitionTypeEmploi.length > 0 ? (
                    <PieChart>
                      <Pie
                        data={stats.repartitionTypeEmploi}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="consultations"
                        nameKey="type"
                        label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stats.repartitionTypeEmploi.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
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
                      <Typography>Aucun employé avec un contrat signé n’a été trouvé pour votre entreprise.</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Publiez une offre pour voir les statistiques
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
                  Évolution des consultations
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  {stats.evolutionConsultations.length > 0 ? (
                    <LineChart
                      data={stats.evolutionConsultations}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${formatNumber(value)}`, "Consultations"]} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="consultations"
                        name="Consultations"
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
                      <Typography>Aucun employé avec un contrat signé n’a été trouvé pour votre entreprise.</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Publiez une offre pour voir les statistiques
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
                  Détail des offres populaires
                </Typography>
                <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
                  <Table sx={{ minWidth: 500 }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "1px solid #ddd" }}>
                        <th style={{ fontWeight: "bold", padding: "8px", textAlign: "left", minWidth: "200px" }}>Offre</th>
                        <th style={{ fontWeight: "bold", padding: "8px", textAlign: "center", minWidth: "120px" }}>Consultations</th>
                        <th style={{ fontWeight: "bold", padding: "8px", textAlign: "center", minWidth: "120px" }}>Date publication</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.offresPopulaires.length > 0 ? (
                        stats.offresPopulaires.map((offre, index) => (
                          <tr key={index} style={{ borderBottom: "1px solid #ddd" }}>
                            <td style={{ padding: "8px", textAlign: "left", maxWidth: "200px", wordBreak: "break-word" }}>
                              {offre.titre}
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{formatNumber(offre.consultations)}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              {new Date(offre.datePublication).toLocaleDateString("fr-FR")}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ padding: "8px", textAlign: "center" }}>
                            Aucun employé avec un contrat signé n’a été trouvé pour votre entreprise.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  );
};

StatistiquesOffres.propTypes = {};

export default StatistiquesOffres;