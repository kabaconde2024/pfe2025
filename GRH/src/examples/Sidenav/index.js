import React, { useEffect, useState } from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import SidenavItem from "examples/Sidenav/SidenavItem";
import SidenavFooter from "examples/Sidenav/SidenavFooter";
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import { useArgonController, setMiniSidenav } from "context";
import axios from "axios";
import * as AntdIcons from '@ant-design/icons';
import * as MuiIcons from '@mui/icons-material';

function Sidenav({ color, brand, brandName, ...rest }) {
    const [controller, dispatch] = useArgonController();
    const { miniSidenav, darkSidenav, layout } = controller;
    const location = useLocation();
    const [allMenus, setAllMenus] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [openSubmenu, setOpenSubmenu] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const clearAuthAndRedirect = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userProfile');
        window.location.href = '/authentification/sign-in';
    };

    useEffect(() => {
        const fetchMenus = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/menu");
                setAllMenus(response.data.menus);
            } catch (error) {
                console.error("Erreur lors de la récupération des menus :", error);
            }
        };

        const fetchUserProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                clearAuthAndRedirect();
                return;
            }

            try {
                const response = await axios.get("http://localhost:5000/api/profils/Connected", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    validateStatus: function (status) {
                        return status < 500;
                    }
                });

                if (response.status === 401) {
                    throw new Error("Token invalide ou expiré");
                }

                if (!response.data.profils || response.data.profils.length === 0) {
                    throw new Error("Aucun profil trouvé");
                }
                
                setUserProfile(response.data.profils[0]);
            } catch (error) {
                console.error("Erreur lors de la récupération du profil :", error.message);
                clearAuthAndRedirect();
            } finally {
                setLoading(false);
            }
        };

        fetchMenus();
        fetchUserProfile();

        const handleMiniSidenav = () => setMiniSidenav(dispatch, window.innerWidth < 1200);
        window.addEventListener("resize", handleMiniSidenav);
        handleMiniSidenav();

        return () => window.removeEventListener("resize", handleMiniSidenav);
    }, [dispatch, navigate]);

    useEffect(() => {
        const checkTokenValidity = setInterval(async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                await axios.get("http://localhost:5000/api/auth/validate-token", {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                if (error.response?.status === 401) {
                    clearAuthAndRedirect();
                }
            }
        }, 300000);

        return () => clearInterval(checkTokenValidity);
    }, []);

    const toggleSubmenu = (menuId) => {
        setOpenSubmenu((prev) => ({ ...prev, [menuId]: !prev[menuId] }));
    };

    const getIcon = (iconName) => {
        return MuiIcons[iconName] || AntdIcons[iconName] || MuiIcons.Dashboard;
    };

    const handleMenuClick = (menu) => {
        const token = localStorage.getItem('token');
        if (!token) {
            clearAuthAndRedirect();
            return;
        }

        const hasSubmenus = menu.sousMenus && menu.sousMenus.length > 0;
        
        if (hasSubmenus) {
            toggleSubmenu(menu._id);
        } else if (menu.route) {
            navigate(menu.route);
        }
    };

    const renderMenuItem = (menu) => {
        const hasSubmenus = menu.sousMenus && menu.sousMenus.length > 0;
        const isActive = location.pathname === menu.route;

        return (
            <div key={menu._id}>
                <div onClick={() => handleMenuClick(menu)}>
                    <ArgonBox 
                        display="flex" 
                        alignItems="center" 
                        sx={{ 
                            padding: "12px", 
                            cursor: "pointer", 
                            justifyContent: "space-between", 
                            transition: "background-color 0.3s", 
                            borderRadius: "4px",
                            backgroundColor: isActive && !hasSubmenus ? 
                                (darkSidenav ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)") : 
                                "transparent",
                            '&:hover': { 
                                backgroundColor: darkSidenav ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" 
                            } 
                        }}
                    >
                        <ArgonBox display="flex" alignItems="center">
                            {React.createElement(getIcon(menu.iconUrl), { 
                                style: { 
                                    marginRight: 8,
                                    fontSize: "0.875rem",
                                    color: isActive && !hasSubmenus ? 
                                        (darkSidenav ? "white" : "primary.main") : 
                                        "inherit"
                                } 
                            })}
                            <ArgonTypography 
                                variant="body2" 
                                color={isActive && !hasSubmenus ? 
                                    (darkSidenav ? "white" : "primary") : 
                                    (darkSidenav ? "white" : "dark")}
                                sx={{ fontWeight: isActive && !hasSubmenus ? "bold" : "normal" }}
                            >
                                {menu.nom}
                            </ArgonTypography>
                        </ArgonBox>
                        <ArgonBox>
                            {hasSubmenus ? (
                                openSubmenu[menu._id] ? 
                                    <AntdIcons.UpOutlined style={{ fontSize: "0.75rem" }} /> : 
                                    <AntdIcons.DownOutlined style={{ fontSize: "0.75rem" }} />
                            ) : (
                                <AntdIcons.RightOutlined style={{ fontSize: "0.75rem" }} />
                            )}
                        </ArgonBox>
                    </ArgonBox>
                </div>
                {hasSubmenus && openSubmenu[menu._id] && (
                    <List component="list" disablePadding sx={{ paddingLeft: 2 }}>
                        {menu.sousMenus.map((sousMenu) => (
                            <div 
                                key={sousMenu._id} 
                                onClick={() => {
                                    const token = localStorage.getItem('token');
                                    if (!token) {
                                        clearAuthAndRedirect();
                                        return;
                                    }
                                    navigate(sousMenu.route);
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                <SidenavItem
                                    name={sousMenu.nom}
                                    active={location.pathname === sousMenu.route}
                                    sx={{ 
                                        paddingLeft: "2", 
                                        marginTop: '0.25rem', 
                                        marginBottom: '0.25rem', 
                                        '&:hover': { 
                                            backgroundColor: darkSidenav ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" 
                                        },
                                        backgroundColor: location.pathname === sousMenu.route ? 
                                            (darkSidenav ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)") : 
                                            "transparent"
                                    }}
                                />
                            </div>
                        ))}
                    </List>
                )}
            </div>
        );
    };

    const filteredMenus = allMenus.filter(menu => 
        userProfile && userProfile.menus && 
        userProfile.menus.some(userMenu => userMenu._id.toString() === menu._id.toString())
    );

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <SidenavRoot {...rest} variant="permanent" ownerState={{ darkSidenav, miniSidenav, layout }}>
            <ArgonBox pt={3} pb={1} px={4} textAlign="center">
                <ArgonBox display={{ xs: "block", xl: "none" }} position="absolute" top={0} right={0} p={1.625} onClick={() => setMiniSidenav(dispatch, true)} sx={{ cursor: "pointer" }}>
                    <ArgonTypography variant="h6" color="secondary">
                        <AntdIcons.CloseOutlined style={{ fontWeight: "bold", fontSize: "1.5rem" }} />
                    </ArgonTypography>
                </ArgonBox>
                <ArgonBox component={NavLink} to="/" display="flex" alignItems="center">
                    <ArgonBox width={!brandName && "100%"}>
                        <ArgonTypography
                            component="h6"
                            variant="button"
                            fontWeight="medium"
                            color={darkSidenav ? "white" : "dark"}
                            sx={{ fontSize: "1.25rem" }}
                        >
                            {brandName}
                        </ArgonTypography>
                    </ArgonBox>
                </ArgonBox>
            </ArgonBox>
            <Divider light={darkSidenav} />
            <List>{filteredMenus.map(renderMenuItem)}</List>
            <ArgonBox pt={1} mt="auto" mb={2} mx={2}>
                <SidenavFooter />
                <ArgonBox mt={2}></ArgonBox>
            </ArgonBox>
        </SidenavRoot>
    );
}

Sidenav.defaultProps = {
    color: "info",
    brand: ""
};

Sidenav.propTypes = {
    color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
    brand: PropTypes.string,
    brandName: PropTypes.string.isRequired
};

export default Sidenav;