import React, { Component } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import DashboardLayout from "../examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "../examples/Navbars/DashboardNavbar";
import {
  Container,
  Typography,
  Box,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Grid,
  FormHelperText,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Person as PersonIcon,
  Class as ClassIcon,
  AssignmentInd as AssignmentIndIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const withNavigate = Component => props => {
  const navigate = useNavigate();
  return <Component {...props} navigate={navigate} />;
};

class AssignationCoach extends Component {
  static propTypes = {
    navigate: PropTypes.func.isRequired
  };

  _isMounted = false;

  state = {
    formations: [],
    filteredFormations: [],
    coaches: [],
    loading: true,
    error: null,
    selectedFormation: '',
    selectedCoach: '',
    selectedRole: 'formateur-secondaire',
    successMessage: null,
    filters: {
      coach: '',
      titre: '',
      statut: ''
    }
  };

  componentDidMount() {
    this._isMounted = true;
    this.fetchData();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchData = async () => {
    try {
      const [formations, coaches] = await Promise.all([
        this.fetchFormations(),
        this.fetchCoaches()
      ]);

      if (this._isMounted) {
        this.setState({
          formations,
          filteredFormations: formations,
          coaches,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          loading: false,
          error: error.response?.data?.message || error.message
        });
      }
    }
  };

  fetchFormations = async () => {
    const response = await axios.get('http://localhost:5000/api/formation', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data || response.data;
  };

  fetchCoaches = async () => {
    const response = await axios.get('http://localhost:5000/api/utilisateurs/coaches', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data || response.data;
  };

  handleAssignCoach = async () => {
    const { selectedFormation, selectedCoach, selectedRole } = this.state;
    
    if (!selectedFormation || !selectedCoach) {
      this.setState({ 
        error: 'Veuillez sélectionner une formation et un coach' 
      });
      return;
    }

    try {
      await axios.patch(
        `http://localhost:5000/api/formation/${selectedFormation}/assigner-formateur`,
        {
          utilisateurId: selectedCoach,
          role: selectedRole
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (this._isMounted) {
        this.setState({
          successMessage: 'Coach assigné avec succès!',
          error: null,
          selectedFormation: '',
          selectedCoach: '',
          selectedRole: 'formateur-secondaire'
        });
        this.fetchData();
      }
    } catch (error) {
      if (this._isMounted) {
        this.setState({ 
          error: error.response?.data?.message || 'Erreur lors de l\'assignation du coach',
          successMessage: null
        });
      }
    }
  };

  handleCancel = () => {
    this.setState({
      selectedFormation: '',
      selectedCoach: '',
      selectedRole: 'formateur-secondaire',
      error: null,
      successMessage: null
    });
  };

  handleFilterChange = (e) => {
    const { name, value } = e.target;
    this.setState(prevState => ({
      filters: {
        ...prevState.filters,
        [name]: value
      }
    }), this.applyFilters);
  };

  applyFilters = () => {
    const { formations, filters } = this.state;
    
    const filtered = formations.filter(formation => {
      const matchesCoach = filters.coach === '' || 
        (formation.formateursAssignes?.some(fa => 
          fa.utilisateur?._id === filters.coach));
      
      const matchesTitre = filters.titre === '' || 
        formation.titre.toLowerCase().includes(filters.titre.toLowerCase());
      
      const matchesStatut = filters.statut === '' || 
        formation.statut === filters.statut;
      
      return matchesCoach && matchesTitre && matchesStatut;
    });

    this.setState({ filteredFormations: filtered });
  };

  renderFormationSelector() {
    const { formations, selectedFormation } = this.state;
    return (
      <FormControl fullWidth sx={{ mb: 3 }} required>
        <TextField
          select
          label="Formation"
          value={selectedFormation}
          onChange={(e) => this.setState({ selectedFormation: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <ClassIcon color="primary" />
              </InputAdornment>
            ),
          }}
          variant="outlined"
        >
          <MenuItem value="">
            <em>Sélectionner une formation</em>
          </MenuItem>
          {formations.map(formation => (
            <MenuItem key={formation._id} value={formation._id}>
              {formation.titre} ({formation.modalite})
            </MenuItem>
          ))}
        </TextField>
        <FormHelperText sx={{ ml: 4 }}>Choisir une formation à assigner</FormHelperText>
      </FormControl>
    );
  }

  renderCoachSelector() {
    const { coaches, selectedCoach } = this.state;
    return (
      <FormControl fullWidth sx={{ mb: 3 }} required>
        <TextField
          select
          label="Coach"
          value={selectedCoach}
          onChange={(e) => this.setState({ selectedCoach: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon color="primary" />
              </InputAdornment>
            ),
          }}
          variant="outlined"
        >
          <MenuItem value="">
            <em>Sélectionner un coach</em>
          </MenuItem>
          {coaches.map(coach => (
            <MenuItem key={coach._id} value={coach._id}>
              {coach.nom} {coach.prenom}
            </MenuItem>
          ))}
        </TextField>
        <FormHelperText sx={{ ml: 4 }}>Choisir un coach à assigner</FormHelperText>
      </FormControl>
    );
  }

  renderRoleSelector() {
    const { selectedRole } = this.state;
    return (
      <FormControl fullWidth sx={{ mb: 3 }}>
        <TextField
          select
          label="Rôle"
          value={selectedRole}
          onChange={(e) => this.setState({ selectedRole: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AssignmentIndIcon color="primary" />
              </InputAdornment>
            ),
          }}
          variant="outlined"
        >
          <MenuItem value="formateur-principal">Formateur principal</MenuItem>
          <MenuItem value="formateur-secondaire">Formateur secondaire</MenuItem>
          <MenuItem value="modérateur">Modérateur</MenuItem>
        </TextField>
        <FormHelperText sx={{ ml: 4 }}>Définir le rôle du coach</FormHelperText>
      </FormControl>
    );
  }

  renderAssignationForm() {
    return (
      <Box component="fieldset" sx={{ 
        border: '1px solid #ddd',
        borderRadius: '8px',
        p: 3,
        mb: 4,
        backgroundColor: '#f9f9f9'
      }}>
        <legend style={{ 
          color: '#3f51b5',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          padding: '0 10px'
        }}>
          Formulaire d'assignation
        </legend>
        
        {this.renderFormationSelector()}
        {this.renderCoachSelector()}
        {this.renderRoleSelector()}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button 
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={this.handleCancel}
            sx={{
              backgroundColor: '#f44336',
              '&:hover': {
                backgroundColor: '#d32f2f'
              }
            }}
          >
            Annuler
          </Button>
          <Button 
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={this.handleAssignCoach}
            disabled={!this.state.selectedFormation || !this.state.selectedCoach}
            sx={{
              backgroundColor: '#00D9FF',
              '&:hover': {
                backgroundColor: '#388e3c'
              }
            }}
          >
            Assigner
          </Button>
        </Box>
      </Box>
    );
  }

  renderFilters() {
    const { coaches, filters } = this.state;
    return (
      <Box sx={{ 
        backgroundColor: '#f5f5f5',
        p: 2,
        borderRadius: '8px',
        mb: 3
      }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Filtres
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Coach assigné</InputLabel>
              <Select
                name="coach"
                value={filters.coach}
                onChange={this.handleFilterChange}
                label="Coach assigné"
              >
                <MenuItem value="">Tous les coaches</MenuItem>
                {coaches.map(coach => (
                  <MenuItem key={coach._id} value={coach._id}>
                    {coach.nom} {coach.prenom}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              name="titre"
              label="Titre de formation"
              value={filters.titre}
              onChange={this.handleFilterChange}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                name="statut"
                value={filters.statut}
                onChange={this.handleFilterChange}
                label="Statut"
              >
                <MenuItem value="">Tous les statuts</MenuItem>
                <MenuItem value="brouillon">brouillon</MenuItem>
                <MenuItem value="planifie">planifie</MenuItem>
                <MenuItem value="ouvert">ouvert</MenuItem>
                <MenuItem value="complet">complet</MenuItem>
                <MenuItem value="en-cours">en-cours</MenuItem>
                <MenuItem value="termine">termine</MenuItem>
                <MenuItem value="annule">annule</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    );
  }

  renderFormationsTable() {
    const { filteredFormations } = this.state;
    return (
      <>
        <Typography variant="h3" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Liste des Formations avec leurs Coachs
        </Typography>
        
        {this.renderFilters()}
        
        <Box sx={{ 
          overflow: 'auto',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            backgroundColor: 'white'
          }}>
            <thead>
              <tr style={{ 
                backgroundColor: '#00D9FF',
                color: 'white'
              }}>
                <th style={{ padding: '16px', textAlign: 'left' }}>Titre</th>
                <th style={{ padding: '16px', textAlign: 'left' }}>Modalité</th>
                <th style={{ padding: '16px', textAlign: 'left' }}>Statut</th>
                <th style={{ padding: '16px', textAlign: 'left' }}>Coachs Assignés</th>
              </tr>
            </thead>
            <tbody>
              {filteredFormations.length > 0 ? (
                filteredFormations.map((formation, index) => (
                  <tr key={formation._id} style={{ 
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9'
                  }}>
                    <td style={{ padding: '16px' }}>{formation.titre}</td>
                    <td style={{ padding: '16px' }}>{formation.modalite}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        backgroundColor: formation.statut === 'actif' ? '#4caf50' : 
                                         formation.statut === 'inactif' ? '#f44336' : '#ff9800',
                        color: 'white',
                        fontSize: '0.8rem'
                      }}>
                        {formation.statut}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {formation.formateursAssignes?.length > 0 ? (
                        <ul style={{ 
                          margin: 0, 
                          paddingLeft: '20px',
                          listStyleType: 'none'
                        }}>
                          {formation.formateursAssignes.map((fa, index) => (
                            <li key={index} style={{ marginBottom: '8px' }}>
                              <span style={{
                                fontWeight: '500',
                                color: '#333'
                              }}>
                                {fa.utilisateur?.nom} {fa.utilisateur?.prenom}
                              </span>
                              {fa.role && (
                                <span style={{
                                  display: 'inline-block',
                                  marginLeft: '8px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: '#e3f2fd',
                                  color: '#1976d2',
                                  fontSize: '0.75rem'
                                }}>
                                  {fa.role}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: '#9e9e9e', fontStyle: 'italic' }}>
                          Aucun coach assigné
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ 
                    padding: '20px',
                    textAlign: 'center',
                    color: '#9e9e9e',
                    fontStyle: 'italic'
                  }}>
                    Aucune formation ne correspond aux filtres sélectionnés
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </>
    );
  }

  render() {
    const { loading, error, successMessage } = this.state;
    const { navigate } = this.props;

    if (loading) {
      return (
        <DashboardLayout>
          <DashboardNavbar />
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container maxWidth="lg" sx={{ mt: 13 }}>
          <Box my={4}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h2" gutterBottom sx={{ 
                color: 'black',
                fontWeight: 'bold',
                pt: 4
              }}>
                Assignation des Coachs 
              </Typography>
              
              <Button 
                variant="contained"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/ListesFormations')}
                sx={{
                  backgroundColor: '#00D9FF',
                  '&:hover': {
                    backgroundColor: '#303f9f'
                  }
                }}
              >
                Retour aux sessions
              </Button>
            </Box>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            {this.renderAssignationForm()}
            {this.renderFormationsTable()}
          </Box>
        </Container>
      </DashboardLayout>
    );
  }
}

export default withNavigate(AssignationCoach);