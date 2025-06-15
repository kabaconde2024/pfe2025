import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
} from '@mui/material';
import axios from 'axios';

function CreateMenuForm() {
  const [formData, setFormData] = useState({
    nom: "",
    route: "",
    parent: "",
    id_profil: "",
    menuType: "menu"
  });
  const [profils, setProfils] = useState([]);
  const [menus, setMenus] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchProfils = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/auth/profils");
      setProfils(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des profils :", error);
      setErrorMessage("Erreur lors du chargement des profils.");
    }
  };

  const fetchMenus = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get("http://localhost:5000/api/auth/mes-menus", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMenus(response.data.menus || []);
    } catch (error) {
      console.error("Erreur lors du chargement des menus :", error);
      setErrorMessage("Erreur lors du chargement des menus.");
    }
  };

  useEffect(() => {
    fetchProfils();
    fetchMenus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const token = localStorage.getItem("token");

    try {
      const response = await axios.post("http://localhost:5000/api/auth/menus", formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 201) {
        setSuccessMessage("Menu créé avec succès !");
        setFormData({
          nom: "",
          route: "",
          parent: "",
          id_profil: "",
          menuType: "menu"
        }); // Réinitialiser le formulaire
      }
    } catch (error) {
      console.error("Erreur lors de la création du menu :", error.message);
      setErrorMessage(error.response?.data?.message || "Erreur inconnue.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
      {successMessage && <Snackbar message={successMessage} autoHideDuration={3000} onClose={() => setSuccessMessage("")} />}
      {errorMessage && <Snackbar message={errorMessage} autoHideDuration={3000} onClose={() => setErrorMessage("")} />}
      
      <TextField
        label="Nom du Menu"
        name="nom"
        value={formData.nom}
        onChange={handleChange}
        required
        fullWidth
        margin="normal"
      />
      <TextField
        label="Route"
        name="route"
        value={formData.route}
        onChange={handleChange}
        required
        fullWidth
        margin="normal"
      />

      <FormControl fullWidth variant="outlined" margin="normal">
        <InputLabel id="menuType">Type de Menu</InputLabel>
        <Select
          labelId="menuType"
          name="menuType"
          value={formData.menuType}
          onChange={handleChange}
        >
          <MenuItem value="menu">Menu</MenuItem>
          <MenuItem value="sous-menu">Sous-Menu</MenuItem>
        </Select>
      </FormControl>

      {formData.menuType === "sous-menu" && (
        <FormControl fullWidth variant="outlined" margin="normal">
          <InputLabel id="parent">Menu Parent</InputLabel>
          <Select 
            name="parent" 
            value={formData.parent} 
            onChange={handleChange}
          >
            <MenuItem value="">
              <em>Aucun</em>
            </MenuItem>
            {menus.map((menu) => (
              <MenuItem key={menu._id} value={menu._id}>{menu.nom}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl fullWidth required margin="normal">
        <InputLabel id="id_profil">Profil</InputLabel>
        <Select 
          name="id_profil" 
          value={formData.id_profil} 
          onChange={handleChange}
          required
        >
          <MenuItem value="" disabled>Sélectionnez un profil</MenuItem>
          {profils.map((profil) => (
            <MenuItem key={profil._id} value={profil._id}>{profil.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button variant="contained" type="submit" sx={{ marginTop: 2 }}>
        Créer
      </Button>
    </form>
  );
}

export default CreateMenuForm;