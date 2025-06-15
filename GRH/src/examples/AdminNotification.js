import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  TextField,
  Button,
  Paper,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Badge,
} from '@mui/material';
import { Business, Reply, Notifications, CheckCircle, Check, Cancel } from '@mui/icons-material';
import axios from 'axios';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';

// Types de notifications exclus pour la logique des non-lues
const excludedAdminTypes = ['RESPONSE', 'CONTRAT_PUBLIE'];

const AdminNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminId, setAdminId] = useState(null);
  const [markingAsRead, setMarkingAsRead] = useState({});

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch admin ID
      const userResponse = await axios.get('http://localhost:5000/api/utilisateur/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      const currentAdminId = userResponse.data?.id;
      if (!currentAdminId) {
        throw new Error('Admin ID not found in user response');
      }
      console.log(`[${new Date().toISOString()}] Admin ID from /utilisateur/me: ${currentAdminId}`);
      setAdminId(currentAdminId);

      // Fetch notifications and unread count in parallel
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        axios.get(`http://localhost:5000/api/notifications/admin`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }),
        axios.get(`http://localhost:5000/api/notifications/admin/unread-count`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }),
      ]);

      console.log('fetchNotifications - Response:', {
        unreadCount: unreadCountResponse.data.unreadCount,
        notificationCount: notificationsResponse.data.data?.length || 0,
        timestamp: new Date().toISOString(),
      });

      const adminNotifications = notificationsResponse.data?.data || [];
      setUnreadCount(unreadCountResponse.data?.unreadCount || 0);

      // Fetch replies for each notification
      const notificationsWithReplies = await Promise.all(
        adminNotifications.map(async (notification) => {
          try {
            const repliesResponse = await axios.get(
              `http://localhost:5000/api/notifications/${notification._id}/replies`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Cache-Control': 'no-cache',
                  Pragma: 'no-cache',
                },
              }
            );
            console.log(`Replies for notification ${notification._id}:`, {
              replyCount: repliesResponse.data.replies?.length || 0,
              type: repliesResponse.data.type,
              timestamp: new Date().toISOString(),
            });
            return { ...notification, replies: repliesResponse.data.replies || [] };
          } catch (error) {
            console.error(`fetchNotifications - Error fetching replies for notification ${notification._id}:`, {
              error: error.response?.data?.message || error.message,
              status: error.response?.status,
              timestamp: new Date().toISOString(),
            });
            return { ...notification, replies: [] };
          }
        })
      );

      setNotifications(notificationsWithReplies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error('fetchNotifications - Error:', {
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des notifications',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const fetchReplies = async (notificationId) => {
    try {
      if (!notificationId) {
        throw new Error('Notification ID is undefined or null');
      }

      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/notifications/${notificationId}/replies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      console.log(`[${new Date().toISOString()}] fetchReplies - Success for notification ${notificationId}:`, {
        replyCount: response.data.replies?.length || 0,
        type: response.data.type,
      });

      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, replies: response.data.replies || [] } : notif
        )
      );

      setSelectedNotification({
        id: notificationId,
        notification_type: response.data.type || 'Inconnu',
        commentaire: response.data.commentaire || 'Aucun commentaire',
        data: response.data.data || {},
        created_at: response.data.created_at,
        replies: response.data.replies || [],
        adminId: response.data.adminId,
      });
    } catch (error) {
      console.error('fetchReplies - Error:', {
        notificationId,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors du chargement des réponses',
        severity: 'error',
      });
      setSelectedNotification(null); // Reset to avoid inconsistent state
    }
  };

  const markAsRead = async (notificationId) => {
    if (markingAsRead[notificationId]) return;

    setMarkingAsRead((prev) => ({ ...prev, [notificationId]: true }));

    // Optimistic update
    setNotifications((prev) =>
      prev.map((notif) =>
        notif._id === notificationId
          ? {
              ...notif,
              read: true,
              replies: notif.replies.map((reply) => ({
                ...reply,
                read: true,
              })),
            }
          : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const token = localStorage.getItem('token');
      if (!token || !adminId) {
        throw new Error('Token or adminId missing');
      }

      await axios.patch(
        `http://localhost:5000/api/notifications/admin/mark-as-read/${notificationId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }
      );

      await fetchNotifications();
      if (selectedNotification?.id === notificationId) {
        await fetchReplies(notificationId);
      }
    } catch (error) {
      console.error('markAsRead - Error:', {
        notificationId,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors du marquage comme lu',
        severity: 'error',
      });
      await fetchNotifications();
    } finally {
      setMarkingAsRead((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !adminId) {
        throw new Error('Token or adminId missing');
      }

      await axios.patch(
        `http://localhost:5000/api/notifications/mark-all-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }
      );

      console.log('markAllAsRead - Success:', {
        timestamp: new Date().toISOString(),
      });

      setNotifications((prev) =>
        prev.map((notif) => ({
          ...notif,
          read: true,
          replies: notif.replies.map((reply) => ({
            ...reply,
            read: true,
          })),
        }))
      );
      setUnreadCount(0);
      setSnackbar({
        open: true,
        message: 'Toutes les notifications marquées comme lues',
        severity: 'success',
      });

      await fetchNotifications();
      if (selectedNotification) {
        await fetchReplies(selectedNotification.id);
      }
    } catch (error) {
      console.error('markAllAsRead - Error:', {
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors du marquage de toutes les notifications',
        severity: 'error',
      });
      await fetchNotifications();
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedNotification) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/notifications/${selectedNotification.id}/reply`,
        { content: replyContent, read: false },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }
      );

      console.log('handleSendReply - Success:', {
        notificationId: selectedNotification.id,
        contentLength: replyContent.length,
        timestamp: new Date().toISOString(),
      });

      setSnackbar({ open: true, message: 'Réponse envoyée avec succès', severity: 'success' });
      setReplyContent('');

      // Optimistic update
      setSelectedNotification((prev) => ({
        ...prev,
        replies: [
          ...prev.replies,
          {
            _id: response.data.notification._id,
            content: replyContent,
            read: false,
            sender_id: adminId,
            displayName: 'Vous',
            created_at: new Date().toISOString(),
          },
        ],
      }));

      await fetchReplies(selectedNotification.id);
      await fetchNotifications();
    } catch (error) {
      console.error('handleSendReply - Error:', {
        notificationId: selectedNotification.id,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erreur lors de l'envoi de la réponse",
        severity: 'error',
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      console.warn('formatDate - Invalid date string:', dateString);
      return 'Date invalide';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error('formatDate - Invalid date:', dateString);
      return 'Date invalide';
    }
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Mappe les types de notifications aux libellés affichés
  const getNotificationType = (type) => {
    switch (type) {
      case 'CONTRAT_PUBLIE':
        return 'Contrat publié';
      case 'PREPARER_CONTRAT':
        return 'Préparation de contrat requise';
      case 'CONTRAT_REJETE_CANDIDAT':
        return 'Contrat rejeté par le candidat';
      case 'CONTRAT_REJETE_ENTREPRISE':
        return "Contrat rejeté par l'entreprise";
      default:
        return type || 'Inconnu';
    }
  };

  // Extrait l'ID de l'expéditeur en tant que chaîne
  const getSenderId = (senderId) => {
    if (!senderId) return null;
    if (typeof senderId === 'string') return senderId;
    if (senderId._id) return senderId._id.toString();
    console.warn('getSenderId - Unexpected sender_id format:', senderId);
    return null;
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3, mt: 10 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton aria-label="notifications">
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          <Typography variant="h4" sx={{ ml: 2, flexGrow: 1 }}>
            Notifications Administrateur
          </Typography>
          {unreadCount > 0 && (
            <Button
              variant="contained"
              startIcon={<Check />}
              onClick={markAllAsRead}
              sx={{ ml: 2 }}
            >
              Marquer tout comme lu
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 3 }}>
            {/* Liste des notifications */}
            <Paper sx={{ p: 2, width: '30%', maxHeight: '80vh', overflow: 'auto' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Notifications
              </Typography>
              <List>
                {notifications.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aucune notification trouvée
                  </Typography>
                ) : (
                  notifications.map((notification) => {
                    // Vérification si une réponse non lue existe et ne vient pas de l'admin
                    const hasUnreadNonAdminReply = (notification.replies || []).some((reply) => {
                      const senderId = getSenderId(reply.sender_id);
                      return senderId && senderId !== adminId && !reply.read;
                    });

                    // Vérification si la notification est non lue et n'est pas de type exclu
                    const isNotificationUnread =
                      !notification.read && !excludedAdminTypes.includes(notification.type);

                    // Déterminer si on affiche un badge
                    const showBadge = excludedAdminTypes.includes(notification.type)
                      ? hasUnreadNonAdminReply
                      : hasUnreadNonAdminReply || isNotificationUnread;

                    return (
                      <React.Fragment key={notification._id}>
                        <ListItem
                          button
                          onClick={async () => {
                            await fetchReplies(notification._id);
                            if (showBadge) {
                              await markAsRead(notification._id);
                            }
                          }}
                          selected={selectedNotification?.id === notification._id}
                          disabled={markingAsRead[notification._id]}
                          sx={{
                            backgroundColor: showBadge ? 'rgba(0, 0, 0, 0.05)' : 'inherit',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' },
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: showBadge ? 'error.light' : 'default' }}>
                              {notification.type === 'RESPONSE' ? (
                                <Reply />
                              ) : ['CONTRAT_REJETE_CANDIDAT', 'CONTRAT_REJETE_ENTREPRISE'].includes(
                                  notification.type
                                ) ? (
                                <Cancel color="error" />
                              ) : (
                                <Business />
                              )}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontWeight: showBadge ? 'bold' : 'normal',
                                    color: showBadge ? 'error.main' : 'inherit',
                                  }}
                                >
                                  {notification.data?.title || getNotificationType(notification.type)}
                                </Typography>
                                {showBadge && (
                                  <Chip
                                    label="Nouveau"
                                    size="small"
                                    color="error"
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color={showBadge ? 'error.main' : 'text.secondary'}
                                  sx={{ display: 'block' }}
                                >
                                  {formatDate(notification.created_at)}
                                </Typography>
                                {notification.replies?.length > 0 && (
                                  <Chip
                                    label={`${notification.replies.length} réponse(s)`}
                                    size="small"
                                    color={showBadge ? 'error' : 'default'}
                                    sx={{ mt: '4px' }}
                                  />
                                )}
                              </>
                            }
                          />
                          {showBadge && (
                            <IconButton
                              edge="end"
                              aria-label="mark as read"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await markAsRead(notification._id);
                              }}
                              disabled={markingAsRead[notification._id]}
                            >
                              {markingAsRead[notification._id] ? (
                                <CircularProgress size={24} />
                              ) : (
                                <CheckCircle color="primary" />
                              )}
                            </IconButton>
                          )}
                        </ListItem>
                        <Divider variant="inset" component="li" />
                      </React.Fragment>
                    );
                  })
                )}
              </List>
            </Paper>

            {/* Détails de la notification */}
            <Box sx={{ flex: 1 }}>
              {selectedNotification ? (
                <>
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {['CONTRAT_REJETE_CANDIDAT', 'CONTRAT_REJETE_ENTREPRISE'].includes(
                        selectedNotification.notification_type
                      ) ? (
                        <Cancel color="error" sx={{ mr: 2 }} />
                      ) : (
                        <Business color="primary" sx={{ mr: 2 }} />
                      )}
                      <Typography variant="h6">
                        {getNotificationType(selectedNotification.notification_type)}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Message: {['CONTRAT_REJETE_ENTREPRISE', 'CONTRAT_REJETE_CANDIDAT'].includes(selectedNotification.notification_type)
                        ? selectedNotification.data?.commentaire || 'Aucun commentaire'
                        : selectedNotification.data?.message || selectedNotification.data?.body || 'Aucun message'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Envoyé le {formatDate(selectedNotification.created_at)}
                    </Typography>
                  </Paper>

                  {/* Liste des réponses */}
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Réponses ({selectedNotification.replies.length})
                  </Typography>

                  {selectedNotification.replies.length > 0 ? (
                    <List sx={{ mb: 3 }}>
                      {selectedNotification.replies.map((reply, index) => (
                        <React.Fragment key={reply._id || `reply-${index}`}>
                          <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                              <Avatar>
                                {reply.displayName ? reply.displayName.charAt(0) : 'U'}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography component="span" fontWeight="bold">
                                    {reply.displayName || 'Utilisateur inconnu'}
                                  </Typography>
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {formatDate(reply.created_at)}
                                  </Typography>
                                </Box>
                              }
                              secondary={reply.content || 'Aucun contenu'}
                            />
                          </ListItem>
                          {index < selectedNotification.replies.length - 1 && (
                            <Divider variant="inset" component="li" />
                          )}
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Aucune réponse
                    </Typography>
                  )}

                  {/* Formulaire de réponse */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Répondre
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      variant="outlined"
                      placeholder="Votre réponse..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<Reply />}
                      onClick={handleSendReply}
                      disabled={!replyContent.trim() || loading}
                    >
                      Envoyer la réponse
                    </Button>
                  </Paper>
                </>
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Sélectionnez une notification pour voir les réponses
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>
        )}

        {/* Snackbar pour notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
};

export default AdminNotification;