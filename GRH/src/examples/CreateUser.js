import { useState, useEffect } from "react";
import {
    Container,
    Button,
    TextField,
    Typography,
    Snackbar,
    Alert,
    Grid,
    CircularProgress,
    InputAdornment,
} from "@mui/material"; 
import { useNavigate, useParams } from "react-router-dom"; 
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { AccountCircle, Email, Lock } from "@mui/icons-material";

const CreateUser = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Récupérer l'ID de l'utilisateur depuis l'URL
    const [nom, setNom] = useState("");
    const [email, setEmail] = useState("");
    const [motDePasse, setMotDePasse] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            const fetchUser = async () => {
                setLoading(true);
                try {
                    const token = localStorage.getItem("token");
                    const response = await axios.get(`http://localhost:5000/api/users/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    // Remplir les champs avec les informations de l'utilisateur
                    setNom(response.data.nom);
                    setEmail(response.data.email);
                    setMotDePasse(""); // Assurez-vous que le mot de passe n'est pas pré-rempli lors de l'édition
                } catch (error) {
                    const message = error.response?.data?.message || "Erreur lors du chargement de l'utilisateur.";
                    setErrorMessage(message);
                } finally {
                    setLoading(false);
                }
            };

            fetchUser();
        } else {
            // Si on est en mode création, réinitialiser tous les champs
            resetFields();
        }
    }, [id]);

    const resetFields = () => {
        setNom("");
        setEmail("");
        setMotDePasse(""); // Réinitialise aussi le mot de passe
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (id) {
                await axios.put(`http://localhost:5000/api/users/${id}`, {
                    nom,
                    email,
                    motDePasse, // Envoyer motDePasse seulement s'il est défini (pas vide)
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuccessMessage("Utilisateur modifié avec succès !");
            } else {
                await axios.post("http://localhost:5000/api/register", {
                    nom,
                    email,
                    motDePasse,
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuccessMessage("Utilisateur créé avec succès !");
            }
            resetFields(); // Appelle la fonction pour réinitialiser les champs

            // Rediriger vers la liste des utilisateurs
            setTimeout(() => {
                navigate('/UserList'); // Rediriger vers la page des utilisateurs
            }, 1000);
        } catch (error) {
            const message = error.response?.data?.message || "Échec de la création ou de la modification de l'utilisateur.";
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <Container maxWidth="sm" sx={{ marginTop: 15 }}>
                <Typography variant="h5" sx={{ marginBottom: 3, fontWeight: 'bold', textAlign: 'center' }}>
                    {id ? "Modifier l'Utilisateur" : "Ajouter un Utilisateur"}
                </Typography>
                
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Nom"
                                variant="outlined"
                                value={nom}
                                onChange={(e) => setNom(e.target.value)}
                                required
                                sx={{ marginBottom: 2 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <AccountCircle />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Email"
                                variant="outlined"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                sx={{ marginBottom: 2 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Email />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Mot de Passe"
                                variant="outlined"
                                type="password"
                                value={motDePasse}
                                onChange={(e) => setMotDePasse(e.target.value)}
                                required={!id}  // Champ requis seulement si c'est une création
                                sx={{ marginBottom: 2 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button variant="contained" color="primary" type="submit" disabled={loading} fullWidth>
                                {loading ? <CircularProgress size={24} color="inherit" /> : (id ? "Modifier Utilisateur" : "Ajouter Utilisateur")}
                            </Button>
                        </Grid>
                    </Grid>
                </form>

                <Snackbar open={!!successMessage} autoHideDuration={3000} onClose={() => setSuccessMessage("")}>
                    <Alert severity="success">{successMessage}</Alert>
                </Snackbar>
                <Snackbar open={!!errorMessage} autoHideDuration={3000} onClose={() => setErrorMessage("")}>
                    <Alert severity="error">{errorMessage}</Alert>
                </Snackbar>
            </Container>
        </DashboardLayout>
    );
};

export default CreateUser;