import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";
import Badge from "@mui/material/Badge";
import Avatar from "@mui/material/Avatar";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import {
  navbar,
  navbarContainer,
  navbarRow,
  navbarIconButton,
  navbarDesktopMenu,
  navbarMobileMenu,
} from "examples/Navbars/DashboardNavbar/styles";
import {
  useArgonController,
  setTransparentNavbar,
  setMiniSidenav,
} from "context";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function DashboardNavbar({ absolute, light, isMini }) {
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useArgonController();
  const { miniSidenav, transparentNavbar, fixedNavbar } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [selectedValue, setSelectedValue] = useState("");
  const [profils, setProfils] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadNewUserNotifications, setUnreadNewUserNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState({ enterprise: 0, candidate: 0 });
  const [currentProfile, setCurrentProfile] = useState(null);
  const [unreadCandidateMessages, setUnreadCandidateMessages] = useState(0);
  const [unreadEnterpriseMessages, setUnreadEnterpriseMessages] = useState(0);
  const [adminId, setAdminId] = useState(null);
  const [unreadFormationNotifications, setUnreadFormationNotifications] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const getAuthToken = () => localStorage.getItem("token");

  const getUserIdFromToken = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1])).id;
    } catch (error) {
      console.error("Error parsing token:", error);
      return null;
    }
  };

  const handleApiError = (error, errorMessage) => {
    console.error(errorMessage, error);
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("token");
      navigate("/authentification/sign-in");
    }
    return false;
  };

  const fetchUserProfile = async () => {
    const token = getAuthToken();
    if (!token) {
      setProfilePhoto(null);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/utilisateur/me`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setProfilePhoto(response.data.photoProfil || null);
    } catch (error) {
      handleApiError(error, "Error fetching user profile:");
      setProfilePhoto(null);
    }
  };

  const fetchAdminId = async () => {
    const token = getAuthToken();
    if (!token) {
      setAdminId(null);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/admin-id`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setAdminId(response.data.adminId || null);
    } catch (error) {
      handleApiError(error, "Error fetching admin ID:");
      setAdminId(null);
    }
  };

  const fetchUnreadMessages = async () => {
    if (currentProfile !== "Admin") {
      setUnreadMessages({ enterprise: 0, candidate: 0 });
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setUnreadMessages({ enterprise: 0, candidate: 0 });
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/messages/unread-count/admin`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (response.data.success && typeof response.data.unreadCount === "number") {
        setUnreadMessages({
          enterprise: response.data.details?.enterprise || 0,
          candidate: response.data.details?.candidate || 0,
        });
      } else {
        setUnreadMessages({ enterprise: 0, candidate: 0 });
      }
    } catch (error) {
      handleApiError(error, "Error fetching unread messages:");
      setUnreadMessages({ enterprise: 0, candidate: 0 });
    }
  };

  const fetchUnreadCandidateMessages = async () => {
    if (currentProfile !== "Candidat") {
      setUnreadCandidateMessages(0);
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setUnreadCandidateMessages(0);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/messages/unread-count/candidat`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (response.data.success && typeof response.data.unreadCount === "number") {
        console.log(`Unread candidate messages: ${response.data.unreadCount}`);
        setUnreadCandidateMessages(response.data.unreadCount);
      } else {
        setUnreadCandidateMessages(0);
      }
    } catch (error) {
      handleApiError(error, "Error fetching candidate unread messages:");
      setUnreadCandidateMessages(0);
    }
  };

  const fetchUnreadEnterpriseMessages = async () => {
    if (currentProfile !== "Entreprise") {
      setUnreadEnterpriseMessages(0);
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setUnreadEnterpriseMessages(0);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/messages/unread-count/entreprise`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (response.data.success && typeof response.data.unreadCount === "number") {
        setUnreadEnterpriseMessages(response.data.unreadCount);
      } else {
        setUnreadEnterpriseMessages(0);
      }
    } catch (error) {
      handleApiError(error, "Error fetching enterprise unread messages:");
      setUnreadEnterpriseMessages(0);
    }
  };

  const fetchUnreadNewUserNotifications = async () => {
    if (currentProfile !== "Admin") {
      setUnreadNewUserNotifications(0);
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setUnreadNewUserNotifications(0);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/notifications/admin/unread`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      console.log('fetchUnreadNewUserNotifications response:', response.data);
      if (response.data.success && Array.isArray(response.data.data)) {
        const newUserNotifications = response.data.data.filter((notif) => notif.type === "NEW_USER").length;
        console.log('Unread NEW_USER notifications count:', newUserNotifications);
        setUnreadNewUserNotifications(newUserNotifications);
      } else {
        console.log('No valid notifications data, setting unreadNewUserNotifications to 0');
        setUnreadNewUserNotifications(0);
      }
    } catch (error) {
      handleApiError(error, "Error fetching new user notifications:");
      setUnreadNewUserNotifications(0);
    }
  };

  const fetchUnreadFormationNotifications = async () => {
    if (currentProfile !== "Candidat") {
      setUnreadFormationNotifications(0);
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setUnreadFormationNotifications(0);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/notifications/`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (response.data.success && Array.isArray(response.data.data)) {
        const formationNotifications = response.data.data.filter(
          (notif) => notif.type === "NEW_FORMATION" && !notif.read
        );
        console.log("Unread NEW_FORMATION notifications:", formationNotifications);
        setUnreadFormationNotifications(formationNotifications.length);
      } else {
        setUnreadFormationNotifications(0);
      }
    } catch (error) {
      handleApiError(error, "Error fetching formation notifications:");
      setUnreadFormationNotifications(0);
    }
  };

  const fetchUnreadNotifications = async () => {
    if (!adminId && currentProfile !== "Candidat" && currentProfile !== "Entreprise") {
      setUnreadNotifications(0);
      return;
    }
    const token = getAuthToken();
    if (!token || !currentProfile) {
      setUnreadNotifications(0);
      return;
    }
    try {
      let unreadCount = 0;
      const userId = getUserIdFromToken(token);
      if (!userId) {
        setUnreadNotifications(0);
        return;
      }

      if (currentProfile === "Entreprise") {
        const response = await axios.get(`${API_URL}/notifications/unread-count?entreprise_id=${userId}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (response.data.success && typeof response.data.unreadCount === "number") {
          unreadCount = response.data.unreadCount;
        }
      } else if (currentProfile === "Admin") {
        const response = await axios.get(`${API_URL}/notifications/admin/unread-count`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (response.data.success && typeof response.data.unreadCount === "number") {
          unreadCount = response.data.unreadCount;
        }
      } else if (currentProfile === "Candidat") {
        const response = await axios.get(`${API_URL}/notifications/`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (response.data.success && Array.isArray(response.data.data)) {
          const notifications = response.data.data
            .filter((n) => n.type !== "REPONSE_NOTIFICATION" && n.type !== "NEW_FORMATION")
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          console.log("Unread notifications (excl. NEW_FORMATION):", notifications.filter(n => !n.read));
          
          notifications.forEach((n) => {
            if (!n.read && (n.user_id === userId || n.userId === userId) && n.type !== "CONTRAT_REJETE_CANDIDAT") {
              unreadCount++;
            }
            if (n.replies && Array.isArray(n.replies)) {
              const unreadReplies = n.replies.filter(
                (reply) => !reply.read && reply.sender_id?.toString() !== userId
              );
              console.log(`Unread replies for notification ${n._id}:`, unreadReplies);
              unreadCount += unreadReplies.length;
            }
          });
        }
      }
      console.log(`Total unread notifications: ${unreadCount}`);
      setUnreadNotifications(unreadCount);
    } catch (error) {
      handleApiError(error, "Error fetching notifications:");
      setUnreadNotifications(0);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const token = getAuthToken();
    if (!token) {
      return false;
    }
    try {
      if (currentProfile === "Entreprise") {
        const entrepriseId = getUserIdFromToken(token);
        if (entrepriseId) {
          await axios.patch(
            `${API_URL}/notifications/mark-all-read?entreprise_id=${entrepriseId}&type=CONTRAT_PUBLIE`,
            { read: true },
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
          );
          await axios.put(
            `${API_URL}/notifications/replies/mark-as-read?entreprise_id=${entrepriseId}`,
            {},
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
          );
        }
        setUnreadNotifications(0);
        return true;
      } else if (currentProfile === "Admin") {
        await axios.put(
          `${API_URL}/notifications/admin/mark-as-read`,
          {},
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        setUnreadNotifications(0);
        setUnreadNewUserNotifications(0);
        return true;
      } else if (currentProfile === "Candidat") {
        const response = await axios.get(`${API_URL}/notifications/`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (response.data.success && Array.isArray(response.data.data)) {
          const notificationsToMark = response.data.data
            .filter(n => (n.user_id === getUserIdFromToken(token) || n.userId === getUserIdFromToken(token)) && 
                        !n.read && 
                        n.type !== "CONTRAT_REJETE_CANDIDAT");
          
          await Promise.all(notificationsToMark.map(async (n) => {
            await axios.patch(
              `${API_URL}/notifications/${n._id}/read`,
              { read: true },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }));
        }
        setUnreadNotifications(0);
        setUnreadFormationNotifications(0);
        return true;
      }
      return false;
    } catch (error) {
      handleApiError(error, "Error marking notifications as read:");
      setUnreadNotifications(0);
      setUnreadNewUserNotifications(0);
      setUnreadFormationNotifications(0);
      return false;
    }
  };

  const markNewUserNotificationsAsRead = async (notificationIds) => {
    const token = getAuthToken();
    if (!token) {
      console.log('No token, cannot mark NEW_USER notifications as read');
      return false;
    }
    try {
      await Promise.all(notificationIds.map(async (id) => {
        await axios.patch(
          `${API_URL}/notifications/admin/mark-as-read/${id}`,
          { read: true },
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
      }));
      console.log(`Marked ${notificationIds.length} NEW_USER notifications as read`);
      setUnreadNewUserNotifications(0);
      return true;
    } catch (error) {
      handleApiError(error, "Error marking NEW_USER notifications as read:");
      return false;
    }
  };

  const fetchProfils = async () => {
    const token = getAuthToken();
    if (!token) {
      setProfils([]);
      setCurrentProfile(null);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/profils/Connected`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.profils?.length > 0) {
        setProfils(response.data.profils);
        setCurrentProfile(response.data.profils[0].name);
      } else {
        setProfils([]);
        setCurrentProfile(null);
      }
    } catch (error) {
      handleApiError(error, "Error fetching profiles:");
      setProfils([]);
      setCurrentProfile(null);
    }
  };

  useEffect(() => {
    setNavbarType(fixedNavbar ? "sticky" : "static");
    const handleTransparentNavbar = () => {
      setTransparentNavbar(dispatch, (fixedNavbar && window.scrollY === 0) || !fixedNavbar);
    };
    fetchProfils();
    fetchAdminId();
    fetchUserProfile();
    window.addEventListener("scroll", handleTransparentNavbar);
    handleTransparentNavbar();
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar, currentProfile]);

  useEffect(() => {
    fetchUnreadNotifications();
    fetchUnreadNewUserNotifications();
    fetchUnreadMessages();
    fetchUnreadCandidateMessages();
    fetchUnreadEnterpriseMessages();
    fetchUnreadFormationNotifications();
    const intervals = [
      setInterval(fetchUnreadNotifications, 15000),
      setInterval(fetchUnreadNewUserNotifications, 15000),
      setInterval(fetchUnreadMessages, 15000),
      setInterval(fetchUnreadCandidateMessages, 15000),
      setInterval(fetchUnreadEnterpriseMessages, 15000),
      setInterval(fetchUnreadFormationNotifications, 15000),
    ];
    return () => intervals.forEach(clearInterval);
  }, [currentProfile, adminId]);

  useEffect(() => {
    const markAsRead = async () => {
      const success = await markAllNotificationsAsRead();
      if (success) {
        await fetchUnreadNotifications();
        await fetchUnreadNewUserNotifications();
        await fetchUnreadFormationNotifications();
      }
    };
    if (
      (location.pathname === "/adminNotification" && currentProfile === "Admin") ||
      (location.pathname === "/CandidatAdmin" && currentProfile === "Candidat") ||
      (location.pathname === "/MesFormations" && currentProfile === "Candidat")
    ) {
      markAsRead();
    }
  }, [location.pathname, currentProfile]);

  const handleNotificationClick = async () => {
    console.log('handleNotificationClick called', {
      currentProfile,
      unreadNewUserNotifications,
      unreadNotifications,
      unreadMessages,
    });

    if (currentProfile === "Candidat") {
      if (unreadFormationNotifications > 0) {
        console.log('Navigating to /MesFormations');
        navigate("/MesFormations");
      } else if (unreadNotifications > 0) {
        console.log('Navigating to /Notification');
        navigate("/Notification");
      } else if (unreadCandidateMessages > 0) {
        console.log('Navigating to /CandidatAdmin');
        navigate("/CandidatAdmin");
      } else {
        console.log('Navigating to /Notification (default)');
        navigate("/Notification");
      }
    } else if (currentProfile === "Entreprise") {
      if (unreadEnterpriseMessages > 0) {
        console.log('Navigating to /MessagerieEntreprise');
        navigate("/MessagerieEntreprise");
      } else if (unreadNotifications > 0) {
        console.log('Navigating to /reponse');
        navigate("/reponse");
      } else {
        console.log('Navigating to /reponse (default)');
        navigate("/reponse");
      }
    } else if (currentProfile === "Admin") {
      const token = getAuthToken();
      if (!token) {
        console.log('No token, navigating to /authentification/sign-in');
        navigate("/authentification/sign-in");
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/notifications/admin/unread`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        console.log('Unread notifications response:', response.data);
        if (response.data.success && Array.isArray(response.data.data)) {
          const newUserNotifications = response.data.data.filter((notif) => notif.type === "NEW_USER" && !notif.read);
          if (newUserNotifications.length > 0) {
            console.log('Found NEW_USER notifications:', newUserNotifications);
            const notificationIds = newUserNotifications.map((notif) => notif._id);
            await markNewUserNotificationsAsRead(notificationIds);
            console.log('Navigating to /validation');
            navigate("/validation");
            return;
          }
        }
      } catch (error) {
        handleApiError(error, "Error checking new user notifications:");
      }
      // Fallback navigation for other admin notifications or messages
      if (unreadMessages.enterprise > 0) {
        console.log('Navigating to /MessagerieAdmin');
        navigate("/MessagerieAdmin");
      } else if (unreadMessages.candidate > 0) {
        console.log('Navigating to /AdminCandidat');
        navigate("/AdminCandidat");
      } else if (unreadNotifications > 0) {
        console.log('Navigating to /adminNotification');
        navigate("/adminNotification");
      } else {
        console.log('Navigating to /dashboard (default)');
        navigate("/dashboard");
      }
    } else {
      console.log('Navigating to /dashboard (default)');
      navigate("/dashboard");
    }
  };

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleOpenMenu = (event) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);

  const handleSelectChange = (event) => {
    const selectedProfileId = event.target.value;
    setSelectedValue(selectedProfileId);
    const selectedProfile = profils.find((profil) => profil._id === selectedProfileId);
    if (selectedProfile) {
      setCurrentProfile(selectedProfile.name);
      handleProfileRedirection(selectedProfile.name);
    }
  };

  const handleProfileRedirection = (profileName) => {
    const token = getAuthToken();
    if (!token) {
      navigate("/authentification/sign-in");
      return;
    }
    const routes = {
      Admin: "/dashboard",
      Coach: "/coach-dashboard",
      Candidat: "/candidats-dashboard",
      Entreprise: "/entreprise-page",
    };
    navigate(routes[profileName] || "/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/authentification/sign-in");
  };

  const renderMenu = () => (
    <Menu
      anchorEl={openMenu}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      open={Boolean(openMenu)}
      onClose={handleCloseMenu}
      sx={{ mt: 2 }}
    >
      <MenuItem>
        <select value={selectedValue} onChange={handleSelectChange} style={{ padding: "8px", width: "150px" }}>
          <option value="">Choisissez un profil</option>
          {profils.map((profil) => (
            <option key={profil._id} value={profil._id}>
              {profil.name}
            </option>
          ))}
        </select>
      </MenuItem>
    </Menu>
  );

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      sx={(theme) => navbar(theme, { transparentNavbar, absolute, light })}
    >
      <Toolbar sx={(theme) => navbarContainer(theme, { navbarType })}>
        <ArgonBox
          color={light && transparentNavbar ? "white" : "dark"}
          mb={{ xs: 1, md: 0 }}
          sx={(theme) => navbarRow(theme, { isMini })}
        >
          <IconButton
            size="small"
            color={light && transparentNavbar ? "white" : "dark"}
            sx={navbarDesktopMenu}
            onClick={() => handleProfileRedirection(currentProfile)}
            title="Retour à l'accueil"
          >
            <Icon fontSize="medium">home</Icon>
          </IconButton>
        </ArgonBox>
        {isMini ? null : (
          <ArgonBox sx={(theme) => navbarRow(theme, { isMini })}>
            <ArgonBox color={light ? "white" : "inherit"}>
              {(currentProfile === "Candidat" || currentProfile === "Entreprise" || currentProfile === "Admin") && (
                <IconButton
                  size="small"
                  color={light && transparentNavbar ? "white" : "dark"}
                  sx={navbarIconButton}
                  onClick={handleNotificationClick}
                  aria-label={`Notifications (${currentProfile === "Admin" ? unreadNotifications + unreadMessages.enterprise + unreadMessages.candidate : currentProfile === "Candidat" ? unreadNotifications + unreadCandidateMessages + unreadFormationNotifications : unreadNotifications + unreadEnterpriseMessages})`}
                >
                  <Badge
                    badgeContent={
                      currentProfile === "Admin"
                        ? unreadNotifications + unreadMessages.enterprise + unreadMessages.candidate
                        : currentProfile === "Candidat"
                        ? unreadNotifications + unreadCandidateMessages + unreadFormationNotifications
                        : unreadNotifications + unreadEnterpriseMessages
                    }
                    color="error"
                    overlap="circular"
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    <Icon>notifications</Icon>
                  </Badge>
                </IconButton>
              )}
              {(currentProfile === "Candidat" || currentProfile === "Entreprise" || currentProfile === "Coach") && (
                <IconButton
                  size="small"
                  color={light && transparentNavbar ? "white" : "dark"}
                  sx={navbarIconButton}
                  aria-label="Photo de profil"
                >
                  {(currentProfile === "Candidat" || currentProfile === "Entreprise") ? (
                    <Avatar
                      src={profilePhoto}
                      sx={{ width: 40, height: 40 }}
                    >
                      {!profilePhoto && <Icon>person</Icon>}
                    </Avatar>
                  ) : (
                    <Icon>account_circle</Icon>
                  )}
                </IconButton>
              )}
              <IconButton sx={navbarIconButton} size="small" onClick={handleLogout}>
                <ArgonTypography
                  variant="button"
                  fontWeight="medium"
                  color={light && transparentNavbar ? "white" : "dark"}
                >
                  Déconnexion
                </ArgonTypography>
              </IconButton>
              <IconButton
                size="small"
                color={light && transparentNavbar ? "white" : "dark"}
                sx={navbarMobileMenu}
                onClick={handleMiniSidenav}
                aria-label={miniSidenav ? "Ouvrir le menu" : "Fermer le menu"}
              >
                <Icon>{miniSidenav ? "menu_open" : "menu"}</Icon>
              </IconButton>
              {currentProfile === "Admin" && (
                <IconButton
                  size="small"
                  color={light && transparentNavbar ? "white" : "dark"}
                  sx={navbarIconButton}
                  aria-controls="menu-menu"
                  aria-haspopup="true"
                  onClick={handleOpenMenu}
                  aria-label="Changer de profil"
                >
                  <Icon>account_circle</Icon>
                </IconButton>
              )}
              {currentProfile === "Admin" && renderMenu()}
            </ArgonBox>
          </ArgonBox>
        )}
      </Toolbar>
    </AppBar>
  );
}

DashboardNavbar.defaultProps = {
  absolute: false,
  light: true,
  isMini: false,
};

DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
};

export default DashboardNavbar;