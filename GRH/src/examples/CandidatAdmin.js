import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  TextField,
  Button,
  Avatar,
  IconButton,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  MoreVert as MoreIcon,
  CheckCircle as ReadIcon,
} from "@mui/icons-material";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { grey } from "@mui/material/colors";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const CandidatAdmin = () => {
  const [messages, setMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [adminId, setAdminId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const scrollToBottom = useCallback((force = false) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    
    if (force || isNearBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setShouldScrollToBottom(isAtBottom);
    };

    const scrollContainer = scrollContainerRef.current;
    scrollContainer?.addEventListener("scroll", handleScroll);
    return () => scrollContainer?.removeEventListener("scroll", handleScroll);
  }, []);

  const markMessagesAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Aucun token trouvé.");
      }
      await axios.post(
        "http://localhost:5000/api/messages/mark-read/candidat",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) =>
        prev.map((msg) =>
          !msg.lu && msg.expediteur?._id !== userId ? { ...msg, lu: true } : msg
        )
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
      setErrorMessage(error.response?.data?.message || "Erreur lors du marquage des messages comme lus.");
      setOpenSnackbar(true);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setTimeout(() => navigate("/authentification/sign-in"), 2000);
      }
    }
  }, [navigate, userId]);

  useEffect(() => {
    let isPollingActive = true;

    const fetchMessages = async () => {
      if (!isPollingActive) return;

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setErrorMessage("Aucun token trouvé.");
          setOpenSnackbar(true);
          return;
        }

        const lastMessage = messages[messages.length - 1];
        const since = lastMessage?.dateEnvoi || new Date(0).toISOString();

        const response = await axios.get(
          `http://localhost:5000/api/messages/candidat?since=${since}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log("Fetched messages:", response.data.messages); // Debug

        const sanitizedMessages = (response.data.messages || []).map((msg) => ({
          ...msg,
          dateEnvoi: msg.dateEnvoi && !isNaN(new Date(msg.dateEnvoi).getTime())
            ? new Date(msg.dateEnvoi).toISOString()
            : new Date().toISOString(),
          lu: msg.expediteur?._id !== userId ? true : msg.lu ?? false,
        }));

        if (sanitizedMessages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((msg) => msg._id));
            const newMessages = sanitizedMessages.filter((msg) => !existingIds.has(msg._id));
            if (newMessages.length === 0) return prev;
            console.log("Adding new messages:", newMessages); // Debug
            return [...prev, ...newMessages];
          });

          if (sanitizedMessages.some((msg) => msg.expediteur?._id !== userId)) {
            await markMessagesAsRead();
          }
        }

        setAdminId(response.data.adminId || "");

        if (isPollingActive) {
          setTimeout(fetchMessages, 5000);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        setErrorMessage(error.response?.data?.message || "Erreur lors du chargement des messages.");
        setOpenSnackbar(true);
        if (error.response?.status === 401 || error.response?.status === 403) {
          setTimeout(() => navigate("/authentification/sign-in"), 2000);
          isPollingActive = false;
        } else {
          setTimeout(() => {
            if (isPollingActive) fetchMessages();
          }, 5000);
        }
      } finally {
        setInitialLoading(false);
      }
    };

    fetchMessages();

    return () => {
      isPollingActive = false;
    };
  }, [navigate, messages, markMessagesAsRead, userId]);

  const handleSendMessage = useCallback(async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !adminId) {
      setErrorMessage("Le message ne peut pas être vide ou aucun administrateur sélectionné.");
      setOpenSnackbar(true);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("Aucun token trouvé.");
        setOpenSnackbar(true);
        return;
      }

      setIsSending(true);
      const currentMessage = newMessage;
      setNewMessage(""); // Clear input immediately

      console.log("Sending message:", { destinataireId: adminId, sujet: "Message candidat", contenu: currentMessage }); // Debug

      const response = await axios.post(
        "http://localhost:5000/api/send-message",
        {
          destinataireId: adminId,
          sujet: "Message candidat",
          contenu: currentMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Server response:", response.data); // Debug

      const newServerMessage = {
        ...response.data.message,
        dateEnvoi: response.data.message.dateEnvoi
          ? new Date(response.data.message.dateEnvoi).toISOString()
          : new Date().toISOString(),
        statut: "envoyé",
        lu: response.data.message.lu ?? false,
        expediteur: {
          _id: userId,
          nom: localStorage.getItem("userName") || "Vous",
          profils: [{ name: "Candidat" }],
        },
        destinataire: {
          _id: adminId,
          nom: "Administrateur",
          profils: [{ name: "Admin" }],
        },
      };

      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === newServerMessage._id);
        if (!exists) {
          console.log("Adding sent message:", newServerMessage); // Debug
          return [...prev, newServerMessage];
        }
        return prev;
      });

      setSuccessMessage("Message envoyé avec succès !");
      setOpenSnackbar(true);
      scrollToBottom(true);
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(currentMessage); // Restore message on failure
      const msg = error.response?.data?.message || "Échec de l'envoi du message.";
      setErrorMessage(msg);
      setOpenSnackbar(true);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, adminId, scrollToBottom, userId]);

  const handleMarkMessageAsRead = useCallback(
    async (messageId) => {
      const message = messages.find((msg) => msg._id === messageId);
      if (!message || message.lu || message.expediteur?._id === userId) {
        return;
      }
      await markMessagesAsRead();
    },
    [messages, markMessagesAsRead, userId]
  );

  const handleCloseSnackbar = useCallback(() => {
    setOpenSnackbar(false);
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  const messagesList = useMemo(() => {
    if (messages.length === 0) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: grey[500],
          }}
        >
          <Typography variant="h6" gutterBottom>
            Aucun message
          </Typography>
          <Typography variant="body1">
            Envoyez votre premier message pour commencer la conversation
          </Typography>
        </Box>
      );
    }

    return messages.map((message, index) => {
      const isSender = message.expediteur?._id === userId;
      const senderName = isSender ? "Vous" : message.expediteur?.nom || "Administrateur";
      const isFirstInGroup =
        index === 0 || messages[index - 1]?.expediteur?._id !== message.expediteur?._id;
      const isLastInGroup =
        index === messages.length - 1 || messages[index + 1]?.expediteur?._id !== message.expediteur?._id;

      return (
        <Box
          key={message._id}
          sx={{
            display: "flex",
            justifyContent: isSender ? "flex-end" : "flex-start",
            mb: isLastInGroup ? 2 : 0.5,
          }}
        >
          {!isSender && isFirstInGroup && (
            <Box sx={{ alignSelf: "flex-end", mr: 1, minWidth: 40 }}>
              <Avatar sx={{ width: 32, height: 32 }}>{senderName.charAt(0)}</Avatar>
            </Box>
          )}
          {!isSender && !isFirstInGroup && <Box sx={{ width: 40, mr: 1 }} />}

          <Box
            sx={{
              maxWidth: "75%",
              display: "flex",
              flexDirection: "column",
              alignItems: isSender ? "flex-end" : "flex-start",
            }}
          >
            {(isFirstInGroup || isSender) && (
              <Typography variant="caption" sx={{ color: "text.secondary", mb: 0.5, mx: 1 }}>
                {senderName}
              </Typography>
            )}

            <Badge
              badgeContent={!isSender && !message.lu ? 1 : 0}
              color="error"
              anchorOrigin={{ vertical: "top", horizontal: "left" }}
              sx={{ width: "100%" }}
            >
              <Box
                onClick={() => handleMarkMessageAsRead(message._id)}
                sx={{
                  p: 1.5,
                  borderRadius: 4,
                  bgcolor: isSender ? "action.selected" : "background.paper",
                  borderTopLeftRadius: isSender ? 12 : isFirstInGroup ? 12 : 4,
                  borderTopRightRadius: isSender ? (isFirstInGroup ? 12 : 4) : 12,
                  boxShadow: 1,
                  position: "relative",
                  cursor: !isSender && !message.lu ? "pointer" : "default",
                  width: "100%",
                }}
              >
                <Typography variant="body1">{message.contenu}</Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    mt: 0.5,
                    gap: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontSize: "0.65rem" }}
                  >
                    {message.dateEnvoi && !isNaN(new Date(message.dateEnvoi).getTime())
                      ? formatDistanceToNow(new Date(message.dateEnvoi), {
                          addSuffix: true,
                          locale: fr,
                        })
                      : "Juste maintenant"}
                  </Typography>
                  {isSender ? (
                    <Tooltip
                      title={
                        message.statut === "envoyé"
                          ? "Message envoyé avec succès"
                          : "Échec de l'envoi"
                      }
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {message.statut === "envoyé" ? (
                          <ReadIcon sx={{ fontSize: "1rem" }} />
                        ) : (
                          <CircularProgress size={12} thickness={5} />
                        )}
                      </Box>
                    </Tooltip>
                  ) : (
                    message.lu && (
                      <Tooltip title="Message lu">
                        <ReadIcon sx={{ fontSize: "1rem", color: "success.main" }} />
                      </Tooltip>
                    )
                  )}
                </Box>
              </Box>
            </Badge>
          </Box>
        </Box>
      );
    });
  }, [messages, userId, handleMarkMessageAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 4, mt: 10 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            color="success"
          >
            <Avatar sx={{ width: 56, height: 56 }}>A</Avatar>
          </Badge>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              Messagerie avec l'Administrateur
            </Typography>
            <Typography variant="body2" color="text.secondary">
              En ligne
            </Typography>
          </Box>
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
            sx={{ width: "100%" }}
          >
            {errorMessage || successMessage}
          </Alert>
        </Snackbar>

        {initialLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "70vh",
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 3,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                p: 2,
                bgcolor: "background.default",
                borderBottom: `1px solid ${grey[300]}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar>A</Avatar>
                <Typography variant="h6">Administrateur</Typography>
              </Box>
              <IconButton>
                <MoreIcon />
              </IconButton>
            </Box>

            <Box
              ref={scrollContainerRef}
              sx={{ flexGrow: 1, p: 2, overflowY: "auto", bgcolor: "background.default" }}
            >
              {messagesList}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ p: 2, borderTop: `1px solid ${grey[300]}`, bgcolor: "background.paper" }}>
              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <IconButton>
                  <AttachFileIcon />
                </IconButton>
                <IconButton>
                  <EmojiIcon />
                </IconButton>
                <TextField
                  fullWidth
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  variant="outlined"
                  size="small"
                  disabled={!adminId || isSending}
                  multiline
                  maxRows={4}
                />
                <Button
                  type="submit"
                  variant="contained"
                  endIcon={isSending ? <CircularProgress size={20} /> : <SendIcon />}
                  disabled={!newMessage.trim() || !adminId || isSending}
                  sx={{ borderRadius: 4, px: 4, py: 1, textTransform: "none" }}
                >
                  {isSending ? "Envoi..." : "Envoyer"}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default CandidatAdmin;