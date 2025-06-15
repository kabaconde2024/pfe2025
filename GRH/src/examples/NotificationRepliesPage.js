import React, { useState, useEffect } from 'react';
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
import {
  Email,
  Business,
  Reply,
  CheckCircle,
  Cancel,
  Notifications,
  Description,
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';

const NotificationRepliesPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentEntrepriseId, setCurrentEntrepriseId] = useState(null);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return 0;
      const response = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { entreprise_id: currentEntrepriseId },
      });
      if (response.data.success && typeof response.data.unreadCount === 'number') {
        return response.data.unreadCount;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Token manquant");

      const sentResponse = await axios.get(`${API_URL}/notifications/sent-by-entreprise`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const entrepriseId =
        sentResponse.data.entreprise_id ||
        (sentResponse.data.notifications?.length > 0
          ? sentResponse.data.notifications[0]?.entreprise_id
          : null);
      setCurrentEntrepriseId(entrepriseId);

      if (!entrepriseId) {
        console.log('Erreur: entrepriseId est null', sentResponse.data);
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const entrepriseExcludedTypes = [
        'CANDIDATURE_ACCEPTEE',
        'CANDIDATURE_REJETEE',
        'ENTRETIEN_PLANIFIE',
        'PREPARER_CONTRAT',
        'ENTRETIEN_EVALUE',
        'NEW_FORMATION_ASSIGNMENT',
        'NEW_FORMATION',
        'FEEDBACK_COMPTE_RENDU', // Added to excluded types
      ];

      const notificationsMap = new Map();

      sentResponse.data.notifications?.forEach((notif) => {
        if (notif?._id) notificationsMap.set(notif._id, notif);
      });

      const unreadResponse = await axios.get(`${API_URL}/notifications/unread`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { entreprise_id: entrepriseId },
      });

      const uniqueNotifications = unreadResponse.data.data
        ?.filter((notif) => {
          return (
            !entrepriseExcludedTypes.includes(notif?.type) ||
            (notif.replies?.some(
              (reply) =>
                reply?.sender_id?.toString() !== entrepriseId?.toString() &&
                reply?.read === false
            ))
          );
        })
        ?.reduce((acc, current) => {
          const key = current?.data?.contrat_id || current?._id;
          if (
            !acc.find((n) => n?.data?.contrat_id === key || n?._id === current?._id) &&
            current?._id
          ) {
            acc.push(current);
          }
          return acc;
        }, []);

      uniqueNotifications?.forEach((notif) => {
        if (notif?._id && !notificationsMap.has(notif._id)) notificationsMap.set(notif._id, notif);
      });

      const allNotifications = Array.from(notificationsMap.values())
        .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
        .filter(Boolean);

      const notificationsWithReplies = await Promise.all(
        allNotifications.map(async (notification) => {
          try {
            const repliesResponse = await axios.get(
              `${API_URL}/notifications/${notification._id}/replies`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            return { ...notification, replies: repliesResponse.data.replies || [] };
          } catch (error) {
            console.error(`Error fetching replies for ${notification._id}:`, error);
            return { ...notification, replies: [] };
          }
        })
      );

      const unreadCount = await fetchUnreadCount();
      setUnreadCount(unreadCount);
      setNotifications(notificationsWithReplies);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setSnackbar({ open: true, message: 'Erreur lors du chargement', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentEntrepriseId]);

  const fetchReplies = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Token manquant");

      const res = await axios.get(`${API_URL}/notifications/${notificationId}/replies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = res.data;

      const filteredReplies =
        data.type === 'CONTRAT_PUBLIE'
          ? data.replies?.filter(
              (reply) =>
                reply?.sender_id?.toString() === currentEntrepriseId?.toString() ||
                reply?.sender_id?.toString() === data?.adminId?.toString()
            ) || []
          : data.replies || [];

      await axios.put(`${API_URL}/notifications/${notificationId}/replies/mark-as-read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const updatedReplies = filteredReplies.map((reply) => ({
        ...reply,
        read: reply.sender_id?.toString() !== currentEntrepriseId?.toString() ? true : reply.read,
      }));

      setSelectedNotification({
        ...data,
        id: notificationId,
        notification_type: data.type,
        replies: updatedReplies,
      });

      if (['CONTRAT_PUBLIE', 'CONTRAT_REJETE_ENTREPRISE', 'NEW_FORMATION_ASSIGNMENT'].includes(data.type) && !data.read) {
        await axios.patch(`${API_URL}/notifications/${notificationId}/read`, { read: true }, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      const newUnreadCount = await fetchUnreadCount();
      setUnreadCount(newUnreadCount);

      await fetchNotifications();
    } catch (error) {
      console.error('Erreur fetchReplies:', error);
      setSnackbar({ open: true, message: 'Erreur lors du chargement des réponses', severity: 'error' });
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedNotification) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Token manquant");

      setReplyContent('');

      const res = await axios.post(
        `${API_URL}/notifications/${selectedNotification.id}/reply`,
        { content: replyContent, read: false },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (res.status >= 200 && res.status < 300) {
        setSnackbar({ open: true, message: 'Réponse envoyée', severity: 'success' });
        await fetchReplies(selectedNotification.id);
      }
    } catch (error) {
      console.error('Erreur envoi reply:', error);
      setSnackbar({ open: true, message: "Erreur lors de l'envoi", severity: 'error' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date invalide';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationType = (type) => {
    switch (type) {
      case 'ENTRETIEN_PLANIFIE':
        return 'Entretien planifié';
      case 'ENTRETIEN_ANNULE':
        return 'Entretien annulé';
      case 'ENTRETIEN_EVALUE':
        return 'Entretien évalué';
      case 'CANDIDATURE_ACCEPTEE':
        return 'Candidature acceptée';
      case 'CANDIDATURE_REFUSEE':
        return 'Candidature refusée';
      case 'CONTRAT_PUBLIE':
        return 'Contrat publié';
      case 'NOUVELLE_MISSION':
        return 'Nouvelle mission';
      case 'FEEDBACK_COMPTE_RENDU':
        return 'Feedback';
      case 'CONTRAT_REJETE_ENTREPRISE':
        return 'Contrat rejeté';
      case 'NEW_FORMATION_ASSIGNMENT':
        return 'Nouvelle formation assignée';
      case 'NEW_FORMATION':
        return 'Nouvelle formation';
      default:
        return type || 'Inconnu';
    }
  };

  const getReplyPlaceholder = (type) => {
    switch (type) {
      case 'CONTRAT_PUBLIE':
        return {
          title: "Répondre à l'administrateur",
          placeholder: "Votre réponse à l'administrateur...",
        };
      case 'NOUVELLE_MISSION':
        return {
          title: 'Répondre au candidat',
          placeholder: 'Votre réponse concernant la mission...',
        };
      case 'CONTRAT_REJETE_ENTREPRISE':
        return {
          title: 'Répondre au rejet du contrat',
          placeholder: 'Votre réponse concernant le rejet du contrat...',
        };
      case 'NEW_FORMATION_ASSIGNMENT':
        return {
          title: 'Répondre à l\'assignation de formation',
          placeholder: 'Votre réponse concernant la formation assignée...',
        };
      case 'NEW_FORMATION':
        return {
          title: 'Répondre à la nouvelle formation',
          placeholder: 'Votre réponse concernant la nouvelle formation...',
        };
      case 'ENTRETIEN_PLANIFIE':
      case 'ENTRETIEN_ANNULE':
      case 'ENTRETIEN_EVALUE':
        return { title: 'Répondre', placeholder: 'Votre réponse...' };
      case 'CANDIDATURE_ACCEPTEE':
      case 'CANDIDATURE_REFUSEE':
        return { title: 'Répondre au candidat', placeholder: 'Votre réponse au candidat...' };
      case 'FEEDBACK_COMPTE_RENDU':
        return { title: 'Répondre au feedback', placeholder: 'Votre réponse...' };
      default:
        return { title: 'Répondre', placeholder: 'Votre réponse...' };
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box sx={{ p: 3, mt: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Badge badgeContent={unreadCount} color="error">
            <Notifications />
          </Badge>
          <Typography variant="h4" sx={{ ml: 1 }}>
            Réponses aux notifications
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Paper sx={{ p: 2, width: '30%', maxHeight: '80vh', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              <List>
                {notifications.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aucune notification
                  </Typography>
                ) : (
                  notifications.map((notif) => {
                    const entrepriseExcludedTypes = [
                      'CANDIDATURE_ACCEPTEE',
                      'CANDIDATURE_REJETEE',
                      'ENTRETIEN_PLANIFIE',
                      'PREPARER_CONTRAT',
                      'ENTRETIEN_EVALUE',
                      'NEW_FORMATION_ASSIGNMENT',
                      'NEW_FORMATION',
                      'FEEDBACK_COMPTE_RENDU',
                    ];

                    const hasUnreadReplies =
                      notif.replies?.some(
                        (reply) =>
                          reply?.sender_id &&
                          reply.sender_id.toString() !== currentEntrepriseId?.toString() &&
                          reply.read === false
                      ) || false;

                    // Updated badge logic: For FEEDBACK_COMPTE_RENDU, only show badge if hasUnreadReplies
                    const showBadge =
                      notif.type === 'FEEDBACK_COMPTE_RENDU'
                        ? hasUnreadReplies
                        : entrepriseExcludedTypes.includes(notif.type)
                        ? hasUnreadReplies
                        : hasUnreadReplies || !notif.read;

                    return (
                      <React.Fragment key={notif._id}>
                        <ListItem
                          button
                          onClick={() => fetchReplies(notif._id)}
                          selected={selectedNotification?.id === notif._id}
                          sx={{
                            backgroundColor: showBadge ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' },
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: showBadge ? 'error.light' : 'default' }}>
                              {notif.type === 'RESPONSE' ? (
                                <Reply />
                              ) : notif.type?.includes('CANDIDATURE') ? (
                                notif.type === 'CANDIDATURE_ACCEPTEE' ? (
                                  <CheckCircle color="success" />
                                ) : (
                                  <Cancel color="error" />
                                )
                              ) : notif.type === 'CONTRAT_PUBLIE' ? (
                                <Business />
                              ) : notif.type === 'NOUVELLE_MISSION' ? (
                                <Description />
                              ) : notif.type === 'CONTRAT_REJETE_ENTREPRISE' ? (
                                <Cancel color="error" />
                              ) : ['NEW_FORMATION_ASSIGNMENT', 'NEW_FORMATION'].includes(notif.type) ? (
                                <Description />
                              ) : (
                                <Email />
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
                                  {['CONTRAT_PUBLIE', 'NOUVELLE_MISSION', 'CONTRAT_REJETE_ENTREPRISE', 'NEW_FORMATION_ASSIGNMENT', 'NEW_FORMATION'].includes(
                                    notif.type
                                  )
                                    ? getNotificationType(notif.type)
                                    : notif.data?.title || getNotificationType(notif.type)}
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
                                  {formatDate(notif.created_at)}
                                </Typography>
                                {notif.replies?.length > 0 && (
                                  <Chip
                                    label={`${notif.replies.length} réponse(s)`}
                                    size="small"
                                    color={showBadge ? 'error' : 'default'}
                                    sx={{ mt: 0.5 }}
                                  />
                                )}
                              </>
                            }
                          />
                        </ListItem>
                        <Divider variant="inset" component="li" />
                      </React.Fragment>
                    );
                  })
                )}
              </List>
            </Paper>

            <Box sx={{ flex: 1 }}>
              {selectedNotification ? (
                <>
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ mr: 2 }}>
                        {selectedNotification.notification_type === 'RESPONSE' ? (
                          <Reply />
                        ) : selectedNotification.notification_type?.includes('CANDIDATURE') ? (
                          selectedNotification.notification_type === 'CANDIDATURE_ACCEPTEE' ? (
                            <CheckCircle color="success" />
                          ) : (
                            <Cancel color="error" />
                          )
                        ) : selectedNotification.notification_type === 'CONTRAT_PUBLIE' ? (
                          <Business />
                        ) : selectedNotification.notification_type === 'NOUVELLE_MISSION' ? (
                          <Description />
                        ) : selectedNotification.notification_type === 'CONTRAT_REJETE_ENTREPRISE' ? (
                          <Cancel />
                        ) : ['NEW_FORMATION_ASSIGNMENT', 'NEW_FORMATION'].includes(selectedNotification.notification_type) ? (
                          <Description />
                        ) : (
                          <Email />
                        )}
                      </Avatar>
                      <Typography variant="h6">
                        {getNotificationType(selectedNotification.notification_type)}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {['CONTRAT_REJETE_ENTREPRISE', 'CONTRAT_REJETE_CANDIDAT'].includes(selectedNotification.notification_type)
                        ? selectedNotification.data?.commentaire || 'Aucun commentaire fourni'
                        : selectedNotification.data?.body ||
                          selectedNotification.data?.message ||
                          selectedNotification.message ||
                          'Aucun contenu'}
                    </Typography>
                    {['CONTRAT_PUBLIE', 'CONTRAT_REJETE_ENTREPRISE'].includes(
                      selectedNotification.notification_type
                    ) &&
                      selectedNotification.contrat && (
                        <Button
                          variant="text"
                          color="primary"
                          startIcon={<Description />}
                          onClick={() => navigate(`/contrat-details/${selectedNotification.contrat}`)}
                          sx={{ mb: 2 }}
                        >
                          Voir le contrat
                        </Button>
                      )}
                    {selectedNotification.notification_type === 'NOUVELLE_MISSION' &&
                      selectedNotification.data?.mission_id && (
                        <Button
                          variant="text"
                          color="primary"
                          startIcon={<Description />}
                          onClick={() =>
                            navigate(`/mission-details/${selectedNotification.data.mission_id}`)
                          }
                          sx={{ mb: 2 }}
                        >
                          Voir la mission
                        </Button>
                      )}
                    {['NEW_FORMATION_ASSIGNMENT', 'NEW_FORMATION'].includes(selectedNotification.notification_type) &&
                      selectedNotification.data?.formation_id && (
                        <Button
                          variant="text"
                          color="primary"
                          startIcon={<Description />}
                          onClick={() =>
                            navigate(`/formation-details/${selectedNotification.data.formation_id}`)
                          }
                          sx={{ mb: 2 }}
                        >
                          Voir la formation
                        </Button>
                      )}
                    <Typography variant="caption" color="text.secondary">
                      Envoyé le {formatDate(selectedNotification.created_at)}
                    </Typography>
                  </Paper>

                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Réponses ({selectedNotification.replies?.length || 0})
                  </Typography>
                  {selectedNotification.replies?.length > 0 ? (
                    <List sx={{ mb: 3 }}>
                      {selectedNotification.replies.map((reply, index) => (
                        <React.Fragment key={reply._id || `reply-${index}`}>
                          <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                              <Avatar>{reply.displayName ? reply.displayName.charAt(0) : 'U'}</Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography component="span" fontWeight="bold">
                                    {reply.displayName || 'Utilisateur'}
                                  </Typography>
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {formatDate(reply.created_at)}
                                  </Typography>
                                  {!reply.read &&
                                    reply.sender_id?.toString() !== currentEntrepriseId?.toString() && (
                                      <Chip label="Nouveau" color="error" size="small" />
                                    )}
                                </Box>
                              }
                              secondary={reply.content || 'Aucun contenu'}
                            />
                          </ListItem>
                          {index < selectedNotification.replies.length - 1 && (
                            <Divider inset component="li" />
                          )}
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Aucune réponse
                    </Typography>
                  )}

                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      {getReplyPlaceholder(selectedNotification.notification_type).title}
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder={
                        getReplyPlaceholder(selectedNotification.notification_type).placeholder
                      }
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<Reply />}
                      onClick={handleSendReply}
                      disabled={!replyContent.trim()}
                    >
                      Envoyer la réponse
                    </Button>
                  </Paper>
                </>
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Sélectionnez une notification pour voir les réponses
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>
        )}

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

export default NotificationRepliesPage;