import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Container,
  Typography,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  Avatar,
  IconButton,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Send as SendIcon,
  Person as PersonIcon,
  AttachFile as AttachFileIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { indigo, grey, blue, green, orange } from "@mui/material/colors";
import { formatDistanceToNow, format } from "date-fns";
import frLocale from "date-fns/locale/fr";

const AdminCandidat = () => {
  const [candidats, setCandidats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedCandidat, setSelectedCandidat] = useState(null);
  const [selectedCandidatDetails, setSelectedCandidatDetails] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState({
    candidats: false,
    messages: false,
    sending: false,
  });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const messagesContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Format full date
  const formatDate = useCallback((date) => {
    try {
      return format(new Date(date), "PPpp", { locale: frLocale });
    } catch {
      return "Date inconnue";
    }
  }, []);

  // Format relative date
  const formatRelativeDate = useCallback((date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: frLocale });
    } catch {
      return "Il y a un moment";
    }
  }, []);

  // Compare messages to avoid unnecessary updates
  const areMessagesEqual = useCallback((prevMessages, newMessages) => {
    if (!Array.isArray(prevMessages) || !Array.isArray(newMessages)) return false;
    if (prevMessages.length !== newMessages.length) return false;
    return prevMessages.every((msg, i) => {
      const newMsg = newMessages[i];
      return (
        msg._id === newMsg._id &&
        msg.contenu === newMsg.contenu &&
        new Date(msg.dateEnvoi).getTime() === new Date(newMsg.dateEnvoi).getTime() &&
        msg.statut === newMsg.statut &&
        msg.lu === newMsg.lu
      );
    });
  }, []);

  // Preserve scroll position
  const preserveScrollPosition = useCallback(() => {
    if (!messagesContainerRef.current) return 0;
    const position = messagesContainerRef.current.scrollTop;
    console.log("Preserving scroll position:", position);
    return position;
  }, []);

  const restoreScrollPosition = useCallback((scrollPosition) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = scrollPosition;
      console.log("Restored scroll position:", scrollPosition);
    }
  }, []);

  // Detect scrolling activity
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        console.log("Scrolling stopped");
      }, 1000);
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (container) container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async (candidatIds) => {
    const token = localStorage.getItem("token");
    if (!token) return {};

    const counts = {};
    for (const candidatId of candidatIds) {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/messages/unread-count/candidat/${candidatId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        counts[candidatId] = response.data.unreadCount || 0;
      } catch (error) {
        console.error(`Error fetching unread count for candidate ${candidatId}:`, error);
        counts[candidatId] = 0;
      }
    }
    return counts;
  }, []);

  // Mark messages as read
  const markMessagesAsRead = useCallback(
    async (candidatId) => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const scrollPosition = preserveScrollPosition();
      try {
        await axios.post(
          `http://localhost:5000/api/messages/mark-read/candidat/${candidatId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUnreadCounts((prev) => ({ ...prev, [candidatId]: 0 }));
        setMessages((prev) =>
          prev.map((msg) =>
            msg.expediteur._id === candidatId && !msg.lu ? { ...msg, lu: true } : msg
          )
        );
        setTimeout(() => restoreScrollPosition(scrollPosition), 0);
      } catch (error) {
        console.error(`Error marking messages as read for candidate ${candidatId}:`, error);
        setErrorMessage("Erreur lors du marquage des messages comme lus.");
        setOpenSnackbar(true);
      }
    },
    [preserveScrollPosition, restoreScrollPosition]
  );

  // Load candidates
  useEffect(() => {
    const fetchCandidats = async () => {
      try {
        setLoading((prev) => ({ ...prev, candidats: true }));
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Token d'authentification manquant.");
        }

        const response = await axios.get("http://localhost:5000/api/user", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const validCandidats = Array.isArray(response.data)
          ? response.data.filter((c) => c._id && c.profils?.name === "Candidat")
          : [];

        if (validCandidats.length === 0) {
          setErrorMessage("Aucun candidat trouvé.");
          setOpenSnackbar(true);
        }

        setCandidats(validCandidats);
        const candidatIds = validCandidats.map((c) => c._id);
        const counts = await fetchUnreadCounts(candidatIds);
        setUnreadCounts(counts);
      } catch (error) {
        console.error("Erreur lors du chargement des candidats :", error);
        setErrorMessage(error.response?.data?.message || "Erreur lors du chargement des candidats.");
        setOpenSnackbar(true);
      } finally {
        setLoading((prev) => ({ ...prev, candidats: false }));
      }
    };
    fetchCandidats();
  }, [fetchUnreadCounts]);

  // Fetch messages with scroll preservation
  const fetchMessages = useCallback(
    async (isInitialFetch = true) => {
      if (!selectedCandidat || (!isInitialFetch && isScrolling)) {
        console.log("Skipping fetchMessages: no candidate selected or user is scrolling");
        return;
      }

      const scrollPosition = preserveScrollPosition();
      try {
        setLoading((prev) => ({ ...prev, messages: true }));
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token d'authentification manquant");

        const response = await axios.get(`http://localhost:5000/api/messages/${selectedCandidat}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const newMessages = Array.isArray(response.data)
          ? response.data.map((msg) => ({
              ...msg,
              dateEnvoi: new Date(msg.dateEnvoi).toISOString(),
              statut: msg.statut || "envoyé",
              lu: msg.lu ?? false,
            }))
          : [];

        console.log(`Fetched ${newMessages.length} messages`);
        setMessages((prevMessages) => {
          if (areMessagesEqual(prevMessages, newMessages)) {
            console.log("Messages unchanged, skipping update");
            return prevMessages;
          }
          console.log("Updating messages");
          return newMessages;
        });

        if (isInitialFetch) {
          await markMessagesAsRead(selectedCandidat);
        }
        setTimeout(() => restoreScrollPosition(scrollPosition), 0);
      } catch (error) {
        console.error("Erreur lors du chargement des messages :", error);
        setErrorMessage(error.response?.data?.message || "Erreur lors du chargement des messages.");
        setOpenSnackbar(true);
      } finally {
        setLoading((prev) => ({ ...prev, messages: false }));
      }
    },
    [selectedCandidat, isScrolling, areMessagesEqual, markMessagesAsRead, preserveScrollPosition, restoreScrollPosition]
  );

  // Polling for messages
  useEffect(() => {
    if (!selectedCandidat) return;

    fetchMessages(true); // Initial fetch with mark as read
    const interval = setInterval(() => fetchMessages(false), 30000); // Polling without marking as read
    return () => clearInterval(interval);
  }, [fetchMessages, selectedCandidat]);

  // Select candidate
  const handleSelectCandidat = useCallback((candidat) => {
    if (candidat && candidat._id) {
      setSelectedCandidat(candidat._id);
      setSelectedCandidatDetails(candidat);
      setMessages([]);
    }
  }, []);

  // Send message with scroll preservation
  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation(); // Extra safety to prevent form bubbling
      if (!newMessage.trim() || !selectedCandidat) return;

      const scrollPosition = preserveScrollPosition();
      setLoading((prev) => ({ ...prev, sending: true }));
      const token = localStorage.getItem("token");
      try {
        const response = await axios.post(
          "http://localhost:5000/api/send-message",
          {
            destinataireId: selectedCandidat,
            sujet: "Message professionnel",
            contenu: newMessage,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const newMsg = {
          _id: response.data.messageId || `temp-${Date.now()}`,
          expediteur: {
            _id: localStorage.getItem("userId"),
            nom: "Admin",
          },
          destinataire: { _id: selectedCandidat },
          contenu: newMessage,
          dateEnvoi: new Date().toISOString(),
          statut: "envoyé",
          lu: false,
        };

        setMessages((prev) => [...prev, newMsg]);
        setNewMessage("");
        setSuccessMessage("Message envoyé avec succès !");
        setOpenSnackbar(true);
        setTimeout(() => restoreScrollPosition(scrollPosition), 0);
      } catch (error) {
        console.error("Erreur lors de l'envoi du message :", error);
        setErrorMessage(error.response?.data?.message || "Échec de l'envoi du message.");
        setOpenSnackbar(true);
      } finally {
        setLoading((prev) => ({ ...prev, sending: false }));
      }
    },
    [newMessage, selectedCandidat, preserveScrollPosition, restoreScrollPosition]
  );

  // Handle context menu
  const handleMenuOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Close snackbar
  const handleCloseSnackbar = useCallback(() => {
    setOpenSnackbar(false);
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  // Filter candidates
  const filteredCandidats = useMemo(() => {
    return candidats.filter(
      (candidat) =>
        candidat &&
        (candidat.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidat.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidat.metier?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [candidats, searchTerm]);

  // Memoized message list
  const messagesList = useMemo(() => {
    if (messages.length === 0) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            textAlign: "center",
          }}
        >
          <PersonIcon sx={{ fontSize: 60, color: grey[400], mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Aucun message dans cette conversation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Envoyez votre premier message pour commencer la discussion
          </Typography>
        </Box>
      );
    }

    return messages.map((message) => (
      <Box
        key={message._id || `temp-${message.dateEnvoi}`}
        sx={{
          display: "flex",
          justifyContent:
            message.expediteur._id === localStorage.getItem("userId") ? "flex-end" : "flex-start",
          mb: 2,
        }}
      >
        <Tooltip
          title={formatDate(message.dateEnvoi)}
          placement={message.expediteur._id === localStorage.getItem("userId") ? "left" : "right"}
        >
          <Box
            sx={{
              maxWidth: "70%",
              p: 2,
              borderRadius: 2,
              bgcolor:
                message.expediteur._id === localStorage.getItem("userId")
                  ? indigo[50]
                  : "background.paper",
              boxShadow: 1,
              border: `1px solid ${
                message.expediteur._id === localStorage.getItem("userId") ? indigo[100] : grey[200]
              }`,
              position: "relative",
              "&:hover": { boxShadow: 2 },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              {message.expediteur.nom || "Inconnu"}
            </Typography>
            <Typography sx={{ wordBreak: "break-word" }}>{message.contenu}</Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                {format(new Date(message.dateEnvoi), "HH:mm")}
              </Typography>
              {message.expediteur._id === localStorage.getItem("userId") && (
                message.statut === "envoyé" ? (
                  <CheckCircleIcon sx={{ fontSize: 14, color: green[500] }} />
                ) : (
                  <ScheduleIcon sx={{ fontSize: 14, color: grey[500] }} />
                )
              )}
            </Box>
          </Box>
        </Tooltip>
      </Box>
    ));
  }, [messages, formatDate]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ py: 4, mt: 10 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1, color: indigo[600] }}
          >
            <PersonIcon fontSize="large" />
            Messagerie avec Candidats
          </Typography>
          <Chip
            label={`${candidats.length} candidats`}
            color="primary"
            variant="outlined"
            sx={{ fontSize: "0.875rem" }}
          />
        </Box>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={errorMessage ? "error" : "success"}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {errorMessage || successMessage}
          </Alert>
        </Snackbar>

        <Box sx={{ display: "flex", height: "75vh", gap: 2, borderRadius: 2, overflow: "hidden", boxShadow: 3 }}>
          <Box sx={{ width: "30%", bgcolor: "background.paper", display: "flex", flexDirection: "column" }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${grey[200]}` }}>
              <TextField
                fullWidth
                placeholder="Rechercher un candidat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                  sx: { bgcolor: grey[50] },
                }}
                size="small"
              />
            </Box>
            <Box sx={{ overflowY: "auto", flexGrow: 1 }}>
              {loading.candidats ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <CircularProgress size={60} />
                </Box>
              ) : (
                <List disablePadding>
                  {filteredCandidats.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="Aucun candidat trouvé" sx={{ textAlign: "center", color: grey[600] }} />
                    </ListItem>
                  ) : (
                    filteredCandidats.map((candidat) => (
                      <ListItem
                        key={candidat._id}
                        button
                        selected={selectedCandidat === candidat._id}
                        onClick={() => handleSelectCandidat(candidat)}
                        sx={{
                          "&:hover": { bgcolor: grey[100] },
                          "&.Mui-selected": {
                            bgcolor: indigo[50],
                            borderLeft: `4px solid ${indigo[500]}`,
                          },
                          px: 2,
                          py: 1.5,
                          borderBottom: `1px solid ${grey[100]}`,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <ListItemAvatar>
                          <Badge
                            overlap="circular"
                            badgeContent={unreadCounts[candidat._id] || 0}
                            color="error"
                            invisible={!unreadCounts[candidat._id]}
                          >
                            <Avatar sx={{ bgcolor: blue[100], color: blue[600], width: 40, height: 40 }}>
                              {candidat.nom?.charAt(0).toUpperCase() || "?"}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {candidat.nom || "Inconnu"}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {candidat.metier || candidat.email || "N/A"}
                            </Typography>
                          }
                          sx={{ ml: 1 }}
                        />
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          {candidat.lastMessageDate && (
                            <Typography variant="caption" color="text.secondary">
                              {formatRelativeDate(candidat.lastMessageDate)}
                            </Typography>
                          )}
                          {unreadCounts[candidat._id] > 0 && (
                            <Box
                              sx={{
                                bgcolor: indigo[500],
                                color: "white",
                                borderRadius: "50%",
                                width: 20,
                                height: 20,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                mt: 0.5,
                              }}
                            >
                              <Typography variant="caption">{unreadCounts[candidat._id]}</Typography>
                            </Box>
                          )}
                        </Box>
                      </ListItem>
                    ))
                  )}
                </List>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              width: "70%",
              bgcolor: grey[50],
              display: "flex",
              flexDirection: "column",
              borderLeft: `1px solid ${grey[200]}`,
            }}
          >
            {selectedCandidat ? (
              <>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "background.paper",
                    borderBottom: `1px solid ${grey[200]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Avatar sx={{ bgcolor: orange[100], color: orange[600], width: 40, height: 40, mr: 2 }}>
                      {selectedCandidatDetails?.nom?.charAt(0).toUpperCase() || "?"}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {selectedCandidatDetails?.nom || "Inconnu"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedCandidatDetails?.metier || selectedCandidatDetails?.email || "N/A"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <IconButton onClick={handleMenuOpen}>
                      <MoreVertIcon />
                    </IconButton>
                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                      <MenuItem onClick={handleMenuClose}>Profil du candidat</MenuItem>
                      <MenuItem onClick={handleMenuClose}>Marquer comme non lu</MenuItem>
                      <MenuItem onClick={handleMenuClose}>Archiver la conversation</MenuItem>
                    </Menu>
                  </Box>
                </Box>
                <Box
                  ref={messagesContainerRef}
                  sx={{
                    flexGrow: 1,
                    p: 2,
                    overflowY: "auto",
                    backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9))",
                    backgroundSize: "cover",
                    backgroundAttachment: "local",
                    minHeight: 0,
                    boxSizing: "border-box",
                  }}
                >
                  {loading.messages ? (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                      <CircularProgress size={60} />
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ textAlign: "center", my: 2 }}>
                        <Chip
                          label={`Conversation avec ${selectedCandidatDetails?.nom || "Inconnu"}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      {messagesList}
                    </>
                  )}
                </Box>
                <Box sx={{ p: 2, borderTop: `1px solid ${grey[200]}`, bgcolor: "background.paper" }}>
                  <Box
                    component="form"
                    onSubmit={handleSendMessage}
                    noValidate
                    sx={{ display: "flex", gap: 1, alignItems: "center" }}
                  >
                    <IconButton color="primary">
                      <AttachFileIcon />
                    </IconButton>
                    <TextField
                      fullWidth
                      placeholder="Écrivez votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      multiline
                      maxRows={4}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 4,
                          bgcolor: grey[50],
                        },
                      }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      endIcon={<SendIcon />}
                      disabled={!newMessage.trim() || loading.sending || !selectedCandidat}
                      sx={{
                        borderRadius: 4,
                        px: 3,
                        py: 1.5,
                        textTransform: "none",
                        boxShadow: "none",
                        "&:hover": { boxShadow: "none" },
                      }}
                    >
                      {loading.sending ? "Envoi..." : "Envoyer"}
                    </Button>
                  </Box>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  textAlign: "center",
                  p: 4,
                }}
              >
                <PersonIcon sx={{ fontSize: 80, color: grey[500], mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  Sélectionnez un candidat
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: "60%" }}>
                  Choisissez un candidat dans la liste pour afficher la conversation ou commencer une nouvelle discussion
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </DashboardLayout>
  );
};

export default AdminCandidat;