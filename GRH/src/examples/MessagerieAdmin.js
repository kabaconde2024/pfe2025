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
  Tooltip
} from "@mui/material";
import {
  Send as SendIcon,
  Person as PersonIcon,
  AttachFile as AttachFileIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import axios from "axios";
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';
import { indigo, grey, blue, green, orange } from '@mui/material/colors';
import { formatDistanceToNow, format } from 'date-fns';
import frLocale from 'date-fns/locale/fr';
import { useNavigate } from "react-router-dom";

const MessagerieAdmin = () => {
  const [entreprises, setEntreprises] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState({
    entreprises: false,
    messages: false,
    sending: false,
    unreadCounts: false
  });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isScrolling, setIsScrolling] = useState(false);
  const messagesContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Format full date
  const formatDate = useCallback((date) => {
    try {
      return format(new Date(date), 'PPpp', { locale: frLocale });
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
        (msg.lu ?? false) === (newMsg.lu ?? false)
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

  // Handle API errors
  const handleApiError = useCallback((error, defaultMessage) => {
    const message = error.response?.data?.message || defaultMessage;
    setErrorMessage(message);
    setOpenSnackbar(true);
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("token");
      navigate("/authentification/sign-in");
    }
  }, [navigate]);

  // Fetch unread message counts for enterprises
  const fetchUnreadCounts = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, unreadCounts: true }));
      const token = localStorage.getItem("token");
      if (!token) return;
      const counts = {};
      for (const entreprise of entreprises) {
        if (entreprise?._id) {
          const response = await axios.get(
            `http://localhost:5000/api/messages/unread-count/${entreprise._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          counts[entreprise._id] = response.data.success && typeof response.data.unreadCount === 'number'
            ? response.data.unreadCount
            : 0;
        }
      }
      setUnreadCounts(counts);
    } catch (error) {
      console.error("Erreur lors du chargement des compteurs de messages non lus:", error);
      handleApiError(error, "Erreur lors du chargement des compteurs de messages.");
    } finally {
      setLoading(prev => ({ ...prev, unreadCounts: false }));
    }
  }, [entreprises, handleApiError]);

  // Fetch enterprises
  useEffect(() => {
    const fetchEntreprises = async () => {
      try {
        setLoading(prev => ({ ...prev, entreprises: true }));
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token d'authentification manquant.");
        const response = await axios.get("http://localhost:5000/api/utilisateurs-entreprise", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const validEntreprises = Array.isArray(response.data.data)
          ? response.data.data.filter(entreprise => entreprise && entreprise._id)
          : [];
        setEntreprises(validEntreprises);
      } catch (error) {
        console.error("Erreur lors du chargement des entreprises:", error);
        handleApiError(error, "Erreur lors du chargement des entreprises.");
      } finally {
        setLoading(prev => ({ ...prev, entreprises: false }));
      }
    };
    fetchEntreprises();
  }, [handleApiError]);

  // Poll unread counts
  useEffect(() => {
    if (entreprises.length === 0) return;
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000); // Increased to 30s
    return () => clearInterval(interval);
  }, [entreprises, fetchUnreadCounts]);

  // Fetch messages with scroll preservation
  const fetchMessages = useCallback(async (isInitialFetch = true) => {
    if (!selectedEntreprise || (!isInitialFetch && isScrolling)) {
      console.log("Skipping fetchMessages: no enterprise selected or user is scrolling");
      return;
    }

    const scrollPosition = preserveScrollPosition();
    try {
      setLoading(prev => ({ ...prev, messages: true }));
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token d'authentification manquant.");
      const response = await axios.get(`http://localhost:5000/api/messages/${selectedEntreprise}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newMessages = Array.isArray(response.data)
        ? response.data.map(msg => ({
            ...msg,
            dateEnvoi: new Date(msg.dateEnvoi).toISOString(),
            statut: msg.statut || "envoyé",
            lu: msg.lu ?? false,
          }))
        : [];

      console.log(`Fetched ${newMessages.length} messages`);
      setMessages(prev => {
        if (areMessagesEqual(prev, newMessages)) {
          console.log("Messages unchanged, skipping update");
          return prev;
        }
        console.log("Updating messages");
        return newMessages;
      });

      if (isInitialFetch) {
        try {
          await axios.post(
            `http://localhost:5000/api/messages/mark-read/${selectedEntreprise}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setUnreadCounts(prev => ({ ...prev, [selectedEntreprise]: 0 }));
        } catch (error) {
          console.error("Erreur lors du marquage des messages comme lus:", error);
        }
      }
      setTimeout(() => restoreScrollPosition(scrollPosition), 0);
    } catch (error) {
      console.error("Erreur lors du chargement des messages:", error);
      handleApiError(error, "Erreur lors du chargement des messages.");
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  }, [selectedEntreprise, isScrolling, areMessagesEqual, handleApiError, preserveScrollPosition, restoreScrollPosition]);

  // Poll messages
  useEffect(() => {
    if (!selectedEntreprise) return;
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 30000); // Increased to 30s
    return () => clearInterval(interval);
  }, [fetchMessages, selectedEntreprise]);

  // Select enterprise
  const handleSelectEntreprise = useCallback((entreprise) => {
    if (entreprise && entreprise._id) {
      setSelectedEntreprise(entreprise._id);
      setMessages([]);
    }
  }, []);

  // Send message with scroll preservation
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newMessage.trim() || !selectedEntreprise) return;

    const scrollPosition = preserveScrollPosition();
    setLoading(prev => ({ ...prev, sending: true }));
    const token = localStorage.getItem("token");
    try {
      const response = await axios.post(
        "http://localhost:5000/api/send-message",
        {
          destinataireId: selectedEntreprise,
          sujet: "Message rapide",
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
        expediteur: { _id: localStorage.getItem("userId"), nom: "Admin" },
        destinataire: { _id: selectedEntreprise },
        contenu: newMessage,
        dateEnvoi: new Date().toISOString(),
        statut: "envoyé",
        lu: false,
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage("");
      setSuccessMessage("Message envoyé avec succès !");
      setOpenSnackbar(true);
      setTimeout(() => restoreScrollPosition(scrollPosition), 0);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      handleApiError(error, "Échec de l'envoi du message.");
    } finally {
      setLoading(prev => ({ ...prev, sending: false }));
    }
  }, [newMessage, selectedEntreprise, handleApiError, preserveScrollPosition, restoreScrollPosition]);

  // Close snackbar
  const handleCloseSnackbar = useCallback(() => {
    setOpenSnackbar(false);
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  // Filter enterprises
  const filteredEntreprises = useMemo(() => {
    return entreprises.filter(entreprise =>
      entreprise &&
      (entreprise.nomEntreprise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       entreprise.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       entreprise.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [entreprises, searchTerm]);

  // Memoized message list
  const messagesList = useMemo(() => {
    if (messages.length === 0) {
      return (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          textAlign: 'center'
        }}>
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

    return messages.map((message, index) => (
      message && message.expediteur ? (
        <Box
          key={message._id || `msg-${index}`}
          sx={{
            display: 'flex',
            justifyContent: message.expediteur._id === localStorage.getItem("userId") ? 'flex-end' : 'flex-start',
            mb: 2,
          }}
        >
          <Tooltip
            title={formatDate(message.dateEnvoi)}
            placement={message.expediteur._id === localStorage.getItem("userId") ? 'left' : 'right'}
          >
            <Box
              sx={{
                maxWidth: '70%',
                p: 2,
                borderRadius: 2,
                bgcolor: message.expediteur._id === localStorage.getItem("userId") ? indigo[50] : 'background.paper',
                boxShadow: 1,
                border: `1px solid ${message.expediteur._id === localStorage.getItem("userId") ? indigo[100] : grey[200]}`,
                position: 'relative',
                '&:hover': { boxShadow: 2 }
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {message.expediteur.nom || message.expediteur.nomEntreprise || 'Inconnu'}
              </Typography>
              <Typography sx={{ wordBreak: 'break-word' }}>{message.contenu}</Typography>
              <Box sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                mt: 1
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                  {format(new Date(message.dateEnvoi), 'HH:mm')}
                </Typography>
                {message.expediteur._id === localStorage.getItem("userId") && (
                  message.statut === 'envoyé' ? (
                    <CheckCircleIcon sx={{ fontSize: 14, color: green[500] }} />
                  ) : (
                    <ScheduleIcon sx={{ fontSize: 14, color: grey[500] }} />
                  )
                )}
              </Box>
            </Box>
          </Tooltip>
        </Box>
      ) : null
    ));
  }, [messages, formatDate]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="xl" sx={{ py: 4, mt: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, color: indigo[800] }}>
            <PersonIcon fontSize="large" />
            Messagerie
          </Typography>
          <Chip
            label={`${entreprises.length} contacts`}
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.875rem' }}
          />
        </Box>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={errorMessage ? "error" : "success"}
            sx={{ width: '100%' }}
            variant="filled"
          >
            {errorMessage || successMessage}
          </Alert>
        </Snackbar>

        <Box sx={{ display: 'flex', height: '75vh', gap: 2, borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
          <Box sx={{ width: '30%', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${grey[200]}` }}>
              <TextField
                fullWidth
                placeholder="Rechercher une entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                  sx: { bgcolor: grey[50] }
                }}
                size="small"
              />
            </Box>

            <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
              {loading.entreprises || loading.unreadCounts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={60} />
                </Box>
              ) : (
                <List disablePadding>
                  {filteredEntreprises.length === 0 ? (
                    <ListItem>
                      <ListItemText
                        primary="Aucune entreprise trouvée"
                        sx={{ textAlign: 'center', color: grey[600] }}
                      />
                    </ListItem>
                  ) : (
                    filteredEntreprises.map((entreprise) => (
                      entreprise && entreprise._id ? (
                        <ListItem
                          key={entreprise._id}
                          button
                          selected={selectedEntreprise === entreprise._id}
                          onClick={() => handleSelectEntreprise(entreprise)}
                          sx={{
                            '&:hover': { bgcolor: grey[100] },
                            '&.Mui-selected': {
                              bgcolor: indigo[50],
                              borderLeft: `4px solid ${indigo[500]}`,
                            },
                            px: 2,
                            py: 1.5,
                            borderBottom: `1px solid ${grey[100]}`,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <ListItemAvatar>
                            <Badge
                              overlap="circular"
                              badgeContent={unreadCounts[entreprise._id] || null}
                              color="error"
                              invisible={!unreadCounts[entreprise._id]}
                            >
                              <Avatar
                                sx={{
                                  bgcolor: blue[100],
                                  color: blue[600],
                                  width: 40,
                                  height: 40
                                }}
                              >
                                {entreprise.nomEntreprise?.charAt(0).toUpperCase() || entreprise.nom?.charAt(0).toUpperCase() || '?'}
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {entreprise.nomEntreprise || entreprise.nom || 'Inconnu'}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {entreprise.email || 'N/A'}
                              </Typography>
                            }
                            sx={{ ml: 1 }}
                          />
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            {entreprise.lastMessageDate && (
                              <Typography variant="caption" color="text.secondary">
                                {formatRelativeDate(entreprise.lastMessageDate)}
                              </Typography>
                            )}
                            {unreadCounts[entreprise._id] > 0 && (
                              <Box sx={{
                                bgcolor: indigo[500],
                                color: 'white',
                                borderRadius: '50%',
                                width: 20,
                                height: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mt: 0.5
                              }}>
                                <Typography variant="caption">
                                  {unreadCounts[entreprise._id]}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </ListItem>
                      ) : null
                    ))
                  )}
                </List>
              )}
            </Box>
          </Box>

          <Box sx={{
            width: '70%',
            bgcolor: grey[50],
            display: 'flex',
            flexDirection: 'column',
            borderLeft: `1px solid ${grey[200]}`
          }}>
            {selectedEntreprise ? (
              <>
                <Box sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  borderBottom: `1px solid ${grey[200]}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        bgcolor: orange[100],
                        color: orange[600],
                        width: 40,
                        height: 40,
                        mr: 2
                      }}
                    >
                      {entreprises.find(e => e._id === selectedEntreprise)?.nomEntreprise?.charAt(0).toUpperCase() ||
                       entreprises.find(e => e._id === selectedEntreprise)?.nom?.charAt(0).toUpperCase() || '?'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {entreprises.find(e => e._id === selectedEntreprise)?.nomEntreprise ||
                         entreprises.find(e => e._id === selectedEntreprise)?.nom || 'Inconnu'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {entreprises.find(e => e._id === selectedEntreprise)?.email || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <IconButton>
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Box
                  ref={messagesContainerRef}
                  sx={{
                    flexGrow: 1,
                    p: 2,
                    overflowY: 'auto',
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9))',
                    backgroundSize: 'cover',
                    backgroundAttachment: 'local',
                    minHeight: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  {loading.messages ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress size={60} />
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ textAlign: 'center', my: 2 }}>
                        <Chip
                          label={`Conversation avec ${entreprises.find(e => e._id === selectedEntreprise)?.nomEntreprise ||
                                 entreprises.find(e => e._id === selectedEntreprise)?.nom || 'Inconnu'}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      {messagesList}
                    </>
                  )}
                </Box>

                <Box sx={{
                  p: 2,
                  borderTop: `1px solid ${grey[200]}`,
                  bgcolor: 'background.paper'
                }}>
                  <Box
                    component="form"
                    onSubmit={handleSendMessage}
                    noValidate
                    sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
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
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 4,
                          bgcolor: grey[50]
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      endIcon={<SendIcon />}
                      disabled={!newMessage.trim() || loading.sending || !selectedEntreprise}
                      sx={{
                        borderRadius: 4,
                        px: 3,
                        py: 1.5,
                        textTransform: 'none',
                        boxShadow: 'none',
                        '&:hover': { boxShadow: 'none' }
                      }}
                    >
                      {loading.sending ? 'Envoi...' : 'Envoyer'}
                    </Button>
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                textAlign: 'center',
                p: 4
              }}>
                <PersonIcon sx={{ fontSize: 80, color: grey[300], mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  Sélectionnez une entreprise
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '60%' }}>
                  Choisissez une entreprise dans la liste pour afficher la conversation ou commencer une nouvelle discussion
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </DashboardLayout>
  );
};

export default MessagerieAdmin;