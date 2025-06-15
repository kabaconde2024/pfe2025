import { useState, useEffect } from "react";
import {
    Container,
    Typography,
    Snackbar,
    Alert,
    Button,
    CircularProgress,
    Box,
    Autocomplete,
    TextField,
    Grid,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Paper,
    Card,
    CardContent,
} from "@mui/material";
import { useNavigate } from "react-router-dom"; 
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const AssociateProfiles = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedProfiles, setSelectedProfiles] = useState([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                
                const [usersRes, profilesRes] = await Promise.all([
                    axios.get("http://localhost:5000/api/users", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get("http://localhost:5000/api/profils", {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                ]);

                setUsers(usersRes.data?.map(user => ({
                    id: user._id,
                    nom: user.nom || 'Sans nom',
                    profils: user.profils || []
                })) || []);

                setProfiles(profilesRes.data?.map(profile => ({
                    id: profile._id,
                    name: profile.name || 'Sans nom'
                })) || []);

            } catch (error) {
                const message = error.response?.data?.message || "Erreur lors du chargement des données.";
                setErrorMessage(message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedUser || selectedProfiles.length === 0) {
            setErrorMessage("Veuillez sélectionner un utilisateur et au moins un profil");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const profileIds = selectedProfiles.map(p => p.id);

            // Vérification des profils déjà associés
            const userResponse = await axios.get(`http://localhost:5000/api/users/${selectedUser.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const existingProfileIds = userResponse.data?.profils?.map(p => p._id) || [];
            const alreadyAssociated = profileIds.some(id => existingProfileIds.includes(id));

            if (alreadyAssociated) {
                setErrorMessage("Un ou plusieurs profils sont déjà associés à cet utilisateur.");
                return;
            }

            await axios.post("http://localhost:5000/api/associate-profiles", {
                userId: selectedUser.id,
                profileIds
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Mise à jour locale de l'état
            setUsers(prevUsers => prevUsers.map(user => {
                if (user.id === selectedUser.id) {
                    return {
                        ...user,
                        profils: [...user.profils, ...selectedProfiles.map(p => ({ _id: p.id, name: p.name }))]
                    };
                }
                return user;
            }));

            setSuccessMessage("Profils associés avec succès !");
            setSelectedUser(null);
            setSelectedProfiles([]);

        } catch (error) {
            const message = error.response?.data?.message || "Erreur lors de l'association des profils.";
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    const handleDissociateProfile = async (userId, profileId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            await axios.put(`http://localhost:5000/api/dissociate-profile`, 
                { userId, profileId }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Mise à jour locale de l'état
            setUsers(prevUsers => prevUsers.map(user => {
                if (user.id === userId) {
                    return {
                        ...user,
                        profils: user.profils.filter(p => p._id !== profileId)
                    };
                }
                return user;
            }));

            setSuccessMessage("Profil dissocié avec succès !");
        } catch (error) {
            const message = error.response?.data?.message || "Erreur lors de la dissociation du profil.";
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <Container maxWidth="md" sx={{ marginTop: 4 }}>
                <Card>
                    <CardContent>
                        <Snackbar open={!!successMessage} autoHideDuration={3000} onClose={() => setSuccessMessage("")}>
                            <Alert severity="success">{successMessage}</Alert>
                        </Snackbar>
                        <Snackbar open={!!errorMessage} autoHideDuration={3000} onClose={() => setErrorMessage("")}>
                            <Alert severity="error">{errorMessage}</Alert>
                        </Snackbar>

                        {loading && (
                            <Box sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}>
                                <CircularProgress />
                            </Box>
                        )}

                        <form onSubmit={handleSubmit}>
                            <Grid container spacing={3} sx={{ marginTop: 2 }}>
                                <Grid item xs={12} md={6}>
                                    <Autocomplete
                                        options={users}
                                        getOptionLabel={(option) => option.nom}
                                        value={selectedUser}
                                        onChange={(event, newValue) => setSelectedUser(newValue)}
                                        renderInput={(params) => (
                                            <TextField 
                                                {...params} 
                                                label="Sélectionner un utilisateur" 
                                                variant="outlined" 
                                                required
                                            />
                                        )}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Autocomplete
                                        multiple
                                        options={profiles}
                                        getOptionLabel={(option) => option.name}
                                        value={selectedProfiles}
                                        onChange={(event, newValue) => setSelectedProfiles(newValue)}
                                        renderInput={(params) => (
                                            <TextField 
                                                {...params} 
                                                label="Sélectionner des profils" 
                                                variant="outlined" 
                                            />
                                        )}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip 
                                                    key={option.id} 
                                                    label={option.name} 
                                                    {...getTagProps({ index })} 
                                                />
                                            ))
                                        }
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                        <Button 
                                            type="submit" 
                                            variant="contained" 
                                            color="primary"
                                            disabled={!selectedUser || selectedProfiles.length === 0}
                                        >
                                            Associer
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </form>

                        <Typography variant="h6" sx={{ marginTop: 4, fontWeight: 'bold', textAlign: 'center' }}>
                            Utilisateurs et profils associés
                        </Typography>

                        <TableContainer component={Paper} sx={{ marginTop: 2 }}>
                            <Table>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>{user.nom}</TableCell>
                                            <TableCell align="right">
                                                {user.profils?.length > 0 ? (
                                                    user.profils.map(profile => (
                                                        <Chip
                                                            key={profile._id}
                                                            label={profile.name}
                                                            onDelete={() => handleDissociateProfile(user.id, profile._id)}
                                                            sx={{ margin: 0.5 }}
                                                        />
                                                    ))
                                                ) : (
                                                    <Typography variant="body2" color="textSecondary">
                                                        Aucun profil associé
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Container>
        </DashboardLayout>
    );
};

export default AssociateProfiles; 