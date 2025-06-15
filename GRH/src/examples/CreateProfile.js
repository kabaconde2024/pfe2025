import { useState, useEffect } from "react";
import {
    Container,
    TextField,
    Button,
    Snackbar,
    Alert,
    Typography,
    Box,
    Paper,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const CreateProfile = () => {
    const navigate = useNavigate();
    const { profileId } = useParams();
    const [name, setName] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            if (profileId) {
                try {
                    const response = await axios.get(`http://localhost:5000/api/profils/${profileId}`);
                    if (response.data) {
                        setName(response.data.name);
                    } else {
                        throw new Error("Profil non trouvé");
                    }
                } catch (error) {
                    const message = error.response?.data?.message || "Erreur lors de la récupération du profil.";
                    setErrorMessage(message);
                }
            }
        };
        fetchProfile();
    }, [profileId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (profileId) {
                await axios.put(`http://localhost:5000/api/profils/${profileId}`, { name });
                setSuccessMessage("Profil modifié avec succès !");
            } else {
                await axios.post("http://localhost:5000/api/profils", { name });
                setSuccessMessage("Profil ajouté avec succès !");
            }
            setTimeout(() => {
                navigate('/');  
            }, 2000);
        } catch (error) {
            const message = error.response?.data?.message || "Échec de l'enregistrement du profil.";
            setErrorMessage(message);
        }
    };

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <Container sx={{ maxWidth: 50, marginTop: 8 }}>
                <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {profileId ? "Modifier un Profil" : "Ajouter un Profil"}
                        </Typography>
                    </Box>
                    <form onSubmit={handleSubmit}>
                        <TextField
                            label="Nom du Profil"
                            variant="outlined"
                            fullWidth
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            sx={{
                                marginBottom: 2,
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: '#ccc',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#3f51b5',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#3f51b5',
                                    },
                                },
                            }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            type="submit"
                            sx={{ width: 'auto' }} // The button will take only the required width based on its content
                        >
                            {profileId ? "Modifier" : "Ajouter"}
                        </Button>
                        </Box>
                    </form>
                    <Snackbar open={!!successMessage} autoHideDuration={3000} onClose={() => setSuccessMessage("")}>
                        <Alert severity="success" onClose={() => setSuccessMessage("")}>
                            {successMessage}
                        </Alert>
                    </Snackbar>
                    <Snackbar open={!!errorMessage} autoHideDuration={3000} onClose={() => setErrorMessage("")}>
                        <Alert severity="error" onClose={() => setErrorMessage("")}>
                            {errorMessage}
                        </Alert>
                    </Snackbar>
                </Paper>
            </Container>
        </DashboardLayout>
    );
};

export default CreateProfile;