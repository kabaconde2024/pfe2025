import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Divider,
  Paper
} from "@mui/material";
import { 
  Search as SearchIcon,
  DateRange as DateIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Visibility as ViewIcon
} from "@mui/icons-material";

const FichesDePaie = () => {
  const navigate = useNavigate();
  const [fichesData, setFichesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchFichesData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/fiches-de-paie`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFichesData(response.data || []);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Erreur lors du chargement des fiches de paie";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFichesData();
  }, []);

  const groupByEmployee = (fiches) => {
    return fiches.reduce((acc, fiche) => {
      const employeId = fiche.employe._id;
      if (!acc[employeId]) {
        acc[employeId] = {
          ...fiche.employe,
          fiches: [],
          dates: new Set()
        };
      }
      acc[employeId].fiches.push(fiche);
      acc[employeId].dates.add(fiche.createdAt.split('T')[0]); // Ajout de la date dans le format attendu
      return acc;
    }, {});
  };

  const handleEmployeeChange = (event) => {
    setSelectedEmployee(event.target.value);
    setSelectedDate("");
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress size={60} />
        </Box>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </DashboardLayout>
    );
  }

  const employeesData = groupByEmployee(fichesData);
  const employeesList = Object.values(employeesData).sort((a, b) =>
    `${a.nom} `.localeCompare(`${b.nom}`)
  );

  const filteredEmployees = employeesList.filter(employee =>
    employee.nom.toLowerCase().includes(searchText.toLowerCase())
  );

  const getFilteredFiches = () => {
    if (!selectedEmployee || selectedEmployee === "all") return fichesData;

    const employee = employeesData[selectedEmployee];
    if (!employee) return [];

    if (!selectedDate) return employee.fiches;

    return employee.fiches.filter(fiche => {
      const ficheDate = new Date(fiche.createdAt).toISOString().split('T')[0]; // Mettre au format YYYY-MM-DD
      return ficheDate === selectedDate;
    });
  };

  const filteredFiches = getFilteredFiches();
  const selectedEmployeeData = selectedEmployee && selectedEmployee !== "all" 
    ? employeesData[selectedEmployee] 
    : null;
  const availableDates = selectedEmployeeData
    ? Array.from(selectedEmployeeData.dates).sort((a, b) => new Date(b) - new Date(a))
    : [];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3, mt: 8 }}>
        <Card elevation={3} sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 3,
              p: 2,
              color: 'white',
              borderRadius: 1
            }}>
              <Typography variant="h4" component="h1">
                <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Fiches de Paie
              </Typography>
            </Box>

            <Box sx={{ mb: 4 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Rechercher un employé"
                value={searchText}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Select
                  fullWidth
                  variant="outlined"
                  placeholder="Sélectionner un employé"
                  value={selectedEmployee || "all"}
                  onChange={handleEmployeeChange}
                  startAdornment={<PersonIcon />}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="all">Tous les employés</MenuItem>
                  {filteredEmployees.map(employee => (
                    <MenuItem key={employee._id} value={employee._id}>
                      {employee.nom.trim() || 'Inconnu'}
                    </MenuItem>
                  ))}
                </Select>

                {selectedEmployee && selectedEmployee !== "all" && (
                  <Select
                    fullWidth
                    variant="outlined"
                    placeholder="Sélectionner une date"
                    value={selectedDate || ""}
                    onChange={handleDateChange}
                    startAdornment={<DateIcon />}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="">Toutes les dates</MenuItem>
                    {availableDates.map(date => (
                      <MenuItem key={date} value={date}>
                        {new Date(date).toLocaleDateString('fr-FR')} {/* Utilisation du format de date français */}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Paper elevation={0} sx={{ overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontFamily: 'Roboto, sans-serif'
                }}>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#f5f5f5',
                      borderBottom: '2px solid #e0e0e0'
                    }}>
                      <th style={{ 
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        color: '#424242',
                        width: '25%'
                      }}>Employé</th>
                      <th style={{ 
                        padding: '16px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        color: '#424242',
                        width: '20%'
                      }}>Date</th>
                      <th style={{ 
                        padding: '16px',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        color: '#424242',
                        width: '20%'
                      }}>Montant Brut</th>
                      <th style={{ 
                        padding: '16px',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        color: '#424242',
                        width: '20%'
                      }}>Net à Payer</th>
                      <th style={{ 
                        padding: '16px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        color: '#424242',
                        width: '15%'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiches.length > 0 ? (
                      filteredFiches.map(fiche => (
                        <tr key={fiche._id} style={{ 
                          borderBottom: '1px solid #e0e0e0',
                        }}>
                          <td style={{ 
                            padding: '16px',
                            textAlign: 'left',
                            fontWeight: 500,
                            color: '#212121'
                          }}>{fiche.employe?.nom || 'N/A'}</td>
                          <td style={{ 
                            padding: '16px',
                            textAlign: 'center',
                            color: '#616161'
                          }}>
                            {/* Afficher la date avec le fuseau horaire UTC */}
                            {new Date(fiche.createdAt).toLocaleDateString('fr-FR', { timeZone: 'UTC' })}
                          </td>
                          <td style={{ 
                            padding: '16px',
                            textAlign: 'right',
                            fontWeight: 500,
                            color: '#1976d2'
                          }}>
                            {fiche.salaireBrut ? (
                              <>
                                {fiche.salaireBrut.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span style={{ color: '#9e9e9e', fontSize: '0.75rem', marginLeft: '4px' }}>€</span>
                              </>
                            ) : 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '16px',
                            textAlign: 'right',
                            fontWeight: 500,
                            color: '#388e3c'
                          }}>
                            {fiche.salaireNet ? (
                              <>
                                {fiche.salaireNet.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span style={{ color: '#9e9e9e', fontSize: '0.75rem', marginLeft: '4px' }}>€</span>
                              </>
                            ) : 'N/A'}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={() => navigate(`/fiches-de-paie/${fiche._id}`)}
                              sx={{ 
                                borderRadius: 2,
                                textTransform: 'none',
                                px: 2
                              }}
                            >
                              Détails
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ 
                          padding: '40px 16px',
                          textAlign: 'center',
                          color: '#9e9e9e'
                        }}>
                          Aucune fiche de paie trouvée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>
            </Paper>
          </CardContent>
        </Card>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage("")}
        >
          <Alert severity="success" onClose={() => setSuccessMessage("")}>
            {successMessage}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
};

export default FichesDePaie;