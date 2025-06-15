import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Container,
  Typography,
  Button,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa"; // Import uniquement FaPlus
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const Menu = () => {
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedMenu, setSelectedMenu] = useState(null);

  const fetchMenus = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get("http://localhost:5000/api/menu", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMenus(response.data.menus || []);
    } catch (err) {
      setError("Erreur lors de la récupération des menus.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleDeleteMenu = async (menuId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce menu ?")) {
      const token = localStorage.getItem("token");
      try {
        await axios.delete(`http://localhost:5000/api/menu/${menuId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenus((prevMenus) => prevMenus.filter((menu) => menu._id !== menuId));
        setSuccessMessage("Menu supprimé avec succès.");
      } catch (err) {
        setError("Erreur lors de la suppression du menu.");
      }
    }
  };

  const handleDeleteSousMenu = async (sousMenuId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce sous-menu ?")) {
      if (selectedMenu) {
        const token = localStorage.getItem("token");
        try {
          await axios.delete(`http://localhost:5000/api/menu/sousMenu/${sousMenuId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMenus((prevMenus) =>
            prevMenus.map((menu) => {
              if (menu._id === selectedMenu._id) {
                return {
                  ...menu,
                  sousMenus: menu.sousMenus.filter((sousMenu) => sousMenu._id !== sousMenuId),
                };
              }
              return menu;
            })
          );
          setSuccessMessage("Sous-menu supprimé avec succès.");
        } catch (err) {
          setError("Erreur lors de la suppression du sous-menu : " + (err.response?.data?.message || err.message));
        }
      }
    }
  };

  const handleMenuClick = (menu) => {
    setSelectedMenu(selectedMenu && selectedMenu._id === menu._id ? null : menu);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ marginTop: 6 }}>
        <Card sx={{ marginBottom: 5 }}>
          <CardContent>
            <Typography variant="h5" sx={{ marginBottom: 1 }}>
              Gestion des Menus
            </Typography>
            <Grid container justifyContent="flex-end" sx={{ marginBottom: 5 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<FaPlus />}
                onClick={() => navigate('/CreateMenu')}
                sx={{ marginRight: 2 }}
              >
                Ajouter Menu
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/AssociatiationMenu')}
              >
                Menu Associé
              </Button>
            </Grid>

            {loading && <CircularProgress />}
            {error && (
              <Snackbar
                message={error}
                autoHideDuration={3000}
                onClose={() => setError(null)}
              />
            )}
            {successMessage && (
              <Snackbar
                message={successMessage}
                autoHideDuration={3000}
                onClose={() => setSuccessMessage("")}
              />
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontFamily: 'Arial, sans-serif', fontSize: '14px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', backgroundColor: '#f2f2f2', width: '33.33%' }}>Nom du Menu</th>
                  <th style={{ padding: '12px', textAlign: 'left', backgroundColor: '#f2f2f2', width: '33.33%' }}>Cible</th>
                  <th style={{ padding: '12px', textAlign: 'left', backgroundColor: '#f2f2f2', width: '33.33%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menus.map(menu => (
                  <React.Fragment key={menu._id}>
                    <tr style={{ cursor: 'pointer', backgroundColor: '#fff' }}>
                      <td onClick={() => handleMenuClick(menu)} style={{ padding: '12px', textAlign: 'left', width: '33.33%' }}>
                        <span onClick={() => handleMenuClick(menu)} style={{ marginRight: '8px', fontSize: '20px', color: 'blue', cursor: 'pointer' }}>
                          {selectedMenu && selectedMenu._id === menu._id ? '-' : '+'}
                        </span>
                        {menu.nom}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'left', width: '33.33%' }}>{menu.route}</td>
                      <td style={{ padding: '12px', textAlign: 'left', width: '33.33%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => navigate(`/CreateMenu/${menu._id}`)}
                            startIcon={<FaEdit />}
                          >
                            Éditer
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            onClick={() => handleDeleteMenu(menu._id)}
                            startIcon={<FaTrash />}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {selectedMenu && selectedMenu._id === menu._id && selectedMenu.sousMenus && selectedMenu.sousMenus.length > 0 && (
                      <>
                        {selectedMenu.sousMenus.map((sousMenu) => (
                          <tr key={sousMenu._id}>
                            <td style={{ padding: '12px', paddingLeft: '40px', backgroundColor: '#fafafa', textAlign: 'left', width: '33.33%' }}>{sousMenu.nom}</td>
                            <td style={{ padding: '12px', textAlign: 'left', width: '33.33%' }}>{sousMenu.route}</td>
                            <td style={{ padding: '12px', textAlign: 'left', width: '33.33%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  onClick={() => navigate(`/CreateMenu/${sousMenu._id}`)}
                                  startIcon={<FaEdit />}
                                >
                                  Éditer
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="secondary"
                                  onClick={() => handleDeleteSousMenu(sousMenu._id)}
                                  startIcon={<FaTrash />}
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Container>
    </DashboardLayout>
  );
};

// Définir les types de props pour le composant Menu
Menu.propTypes = {
  menus: PropTypes.array.isRequired,
};

export default Menu;