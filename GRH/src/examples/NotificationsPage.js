import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  List,
  Tag,
  Typography,
  message,
  Badge,
  Button,
  Input,
  Checkbox,
  Space,
  Card,
  Popconfirm,
  Avatar,
  Divider,
  Spin,
  Modal,
} from 'antd';
import {
  BellOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  MessageOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  FileDoneOutlined,
  ProjectOutlined,
  FileTextOutlined,
  EyeOutlined,
} from '@ant-design/icons';

import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';

import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('fr');
dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const { TextArea } = Input;

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [expandedReplies, setExpandedReplies] = useState({});
  const [markingAsRead, setMarkingAsRead] = useState({});
  const [adminId, setAdminId] = useState(null);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const navigate = useNavigate();

  const getUserIdFromToken = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1])).id;
    } catch (error) {
      console.error('Error parsing token:', error);
      message.error('Token invalide, veuillez vous reconnecter');
      localStorage.removeItem('token');
      navigate('/authentification/sign-in');
      return null;
    }
  };

  const getTagColor = (type) => {
    const colors = {
      ENTRETIEN_PLANIFIE: 'geekblue',
      ENTRETIEN_ANNULE: 'red',
      ENTRETIEN_EVALUE: 'green',
      NOUVELLE_OFFRE: 'cyan',
      CANDIDATURE_ACCEPTEE: 'green',
      CANDIDATURE_REFUSEE: 'volcano',
      MESSAGE: 'purple',
      RAPPEL: 'gold',
      CONTRAT_PUBLIE: 'blue',
      NOUVELLE_MISSION: 'purple',
      FEEDBACK_COMPTE_RENDU: 'purple',
      CONTRAT_REJETE_CANDIDAT: 'volcano',
      NEW_FORMATION: 'blue',
      NEW_FORMATION_ASSIGNMENT: 'purple',
      default: 'gray',
    };
    return colors[type] || colors.default;
  };

  const getNotificationIcon = (type) => {
    const icons = {
      ENTRETIEN_PLANIFIE: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
      ENTRETIEN_ANNULE: <CloseOutlined style={{ color: '#ff4d4f' }} />,
      ENTRETIEN_EVALUE: <CheckOutlined style={{ color: '#52c41a' }} />,
      CANDIDATURE_ACCEPTEE: <CheckOutlined style={{ color: '#52c41a' }} />,
      CANDIDATURE_REFUSEE: <CloseOutlined style={{ color: '#ff4d4f' }} />,
      CONTRAT_PUBLIE: <FileDoneOutlined style={{ color: '#1890ff' }} />,
      NOUVELLE_MISSION: <ProjectOutlined style={{ color: '#722ed1' }} />,
      FEEDBACK_COMPTE_RENDU: <FileTextOutlined style={{ color: '#722ed1' }} />,
      CONTRAT_REJETE_CANDIDAT: <CloseOutlined style={{ color: '#ff4d4f' }} />,
      NEW_FORMATION: <FileTextOutlined style={{ color: '#1890ff' }} />,
      NEW_FORMATION_ASSIGNMENT: <ProjectOutlined style={{ color: '#722ed1' }} />,
      default: <BellOutlined style={{ color: '#faad14' }} />,
    };
    return icons[type] || icons.default;
  };

  const getAuthToken = () => localStorage.getItem('token');

  const fetchAdminId = async () => {
    const token = getAuthToken();
    if (!token) {
      console.log('No token for fetching admin ID');
      setAdminId(null);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/utilisateur/me`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.data.id) {
        setAdminId(response.data.id);
      } else {
        console.error('No admin ID found in response');
        setAdminId(null);
      }
    } catch (error) {
      console.error('Error fetching admin ID:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        message.error('Session expirée, veuillez vous reconnecter');
        localStorage.removeItem('token');
        navigate('/authentification/sign-in');
      } else {
        message.error('Erreur lors de la récupération de l’ID admin');
        setAdminId(null);
      }
    }
  };

  const fetchNotifications = async () => {
    const token = getAuthToken();
    if (!token) {
      message.error('Authentification requise');
      setLoading(false);
      return;
    }

    if (!adminId) {
      console.log('Admin ID not available, skipping notification fetch');
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        const userId = getUserIdFromToken(token);
        if (!userId) return;

        // Fetch reply details for notifications with replies
        const notificationsWithReplies = await Promise.all(
          response.data.data.map(async (notification) => {
            if (notification.replies?.length > 0) {
              try {
                const replyResponse = await axios.get(`${API_URL}/notifications/${notification._id}/replies`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (replyResponse.data.success) {
                  return { ...notification, replies: replyResponse.data.replies };
                }
              } catch (error) {
                console.error(`Error fetching replies for notification ${notification._id}:`, error);
              }
            }
            return notification;
          })
        );

        const filteredNotifications = notificationsWithReplies
          .filter((n) => {
            const isValid = n.type !== 'REPONSE_NOTIFICATION' && (n.user_id || n.userId || n.entreprise_id);
            if (!isValid && n.type === 'ENTRETIEN_EVALUE') {
              console.log(`Filtered out ENTRETIEN_EVALUE notification:`, n);
            }
            return isValid;
          })
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        console.log('Fetched notifications:', {
          count: filteredNotifications.length,
          entretienEvalueNotifications: filteredNotifications.filter(n => n.type === 'ENTRETIEN_EVALUE'),
        });

        setNotifications(filteredNotifications);

        const unreadCount = filteredNotifications.reduce((count, n) => {
          let tempCount = count;
          // Exclure CONTRAT_REJETE_CANDIDAT du comptage si l'utilisateur est le candidat
          if (!n.read && (n.user_id === userId || n.userId === userId)) {
            if (n.type !== 'CONTRAT_REJETE_CANDIDAT') {
              tempCount += 1;
            }
          }
          if (n.replies?.length) {
            tempCount += n.replies.filter(
              (reply) => !reply.read && reply.sender_id?.toString() !== userId
            ).length;
          }
          return tempCount;
        }, 0);

        setUnreadCount(unreadCount);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      message.error(error.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      await axios.patch(
        `${API_URL}/notifications/${notificationId}/read`,
        { read: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      return false;
    }
  };

  const markReplyAsRead = async (notificationId, replyId) => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      await axios.patch(
        `${API_URL}/notifications/${notificationId}/replies/${replyId}/mark-as-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (error) {
      console.error('Erreur lors du marquage de la réponse comme lue:', error);
      return false;
    }
  };

  const toggleNotificationReadStatus = async (notification) => {
    const token = getAuthToken();
    if (!token || !adminId) return;

    const notificationId = notification._id;
    setMarkingAsRead((prev) => ({ ...prev, [notificationId]: true }));

    try {
      const userId = getUserIdFromToken(token);
      if (!userId) return;

      let unreadCountDelta = 0;

      const updatedNotifications = [...notifications]; // évite mutation directe
      const notificationIndex = updatedNotifications.findIndex((n) => n._id === notificationId);

      if (!notification.read && (notification.user_id === userId || notification.userId === userId)) {
        const success = await markAsRead(notificationId);
        if (success && notificationIndex !== -1) {
          updatedNotifications[notificationIndex].read = true;
          unreadCountDelta -= 1;
        }
      }

      if (notification.replies?.length > 0) {
        const repliesToMark = notification.replies
          .filter((r) => !r.read && r.sender_id?.toString() !== userId)
          .map((r) => r._id);

        if (repliesToMark.length > 0) {
          const results = await Promise.all(
            repliesToMark.map((replyId) => markReplyAsRead(notification._id, replyId))
          );
          const success = results.every((result) => result);
          if (success && notificationIndex !== -1) {
            updatedNotifications[notificationIndex].replies = updatedNotifications[notificationIndex].replies.map(
              (reply) => (repliesToMark.includes(reply._id) ? { ...reply, read: true } : reply)
            );
            unreadCountDelta -= repliesToMark.length;
          }
        }
      }

      setNotifications(updatedNotifications);
      setUnreadCount((prev) => Math.max(0, prev + unreadCountDelta));
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de lecture:', error);
      message.error('Erreur lors de la mise à jour du statut de lecture');
    } finally {
      setMarkingAsRead((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  const markAllAsRead = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await axios.patch(
        `${API_URL}/notifications/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userId = getUserIdFromToken(token);
      if (!userId) return;

      const updatedNotifications = notifications.map((n) => {
        if (
          n.user_id === userId ||
          n.userId === userId ||
          n.entreprise_id === userId ||
          (n.type === 'CONTRAT_PUBLIE' && n.data?.admin_id === userId)
        ) {
          return {
            ...n,
            read: true,
            replies: n.replies
              ? n.replies.map((r) => ({
                  ...r,
                  read: r.sender_id?.toString() === userId ? r.read : true,
                }))
              : n.replies,
          };
        }
        return n;
      });

      setNotifications(updatedNotifications);
      setUnreadCount(0);
      message.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
      message.error('Erreur lors du marquage de toutes les notifications comme lues');
    }
  };

  const handleSelectNotification = (notificationId, checked) => {
    setSelectedNotifications((prev) =>
      checked ? [...prev, notificationId] : prev.filter((id) => id !== notificationId)
    );
  };

  const handleSelectAll = (e) => {
    setSelectedNotifications(e.target.checked ? notifications.map((n) => n._id) : []);
  };

  const deleteSelectedNotifications = async () => {
    if (!selectedNotifications.length) {
      message.warning('Aucune notification sélectionnée');
      return;
    }

    const token = getAuthToken();
    if (!token || !adminId) return;

    try {
      const response = await axios.delete(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { ids: selectedNotifications },
      });

      if (response.data?.success) {
        const userId = getUserIdFromToken(token);
        if (!userId) return;

        const deletedUnreadCount = notifications
          .filter((n) => selectedNotifications.includes(n._id))
          .reduce((count, n) => {
            let tempCount = count;
            if (!n.read && (n.user_id === userId || n.userId === userId)) {
              tempCount += 1;
            }
            if (n.replies?.length) {
              tempCount += n.replies.filter(
                (reply) => !reply.read && reply.sender_id?.toString() !== userId
              ).length;
            }
            return tempCount;
          }, 0);

        setNotifications((prev) => prev.filter((n) => !selectedNotifications.includes(n._id)));
        setSelectedNotifications([]);
        setUnreadCount((prev) => Math.max(0, prev - deletedUnreadCount));
        message.success(response.data.message || 'Notifications supprimées avec succès');
      } else {
        message.error(response.data?.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des notifications:', error);
      message.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const deleteNotification = async (notificationId) => {
    const token = getAuthToken();
    if (!token || !adminId) return;

    try {
      const response = await axios.delete(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { ids: [notificationId] },
      });

      if (response.data?.success) {
        const userId = getUserIdFromToken(token);
        if (!userId) return;

        const deletedNotification = notifications.find((n) => n._id === notificationId);
        let deletedUnreadCount = 0;
        if (
          deletedNotification &&
          !deletedNotification.read &&
          (deletedNotification.user_id === userId || deletedNotification.userId === userId)
        ) {
          deletedUnreadCount += 1;
        }
        if (deletedNotification?.replies?.length) {
          deletedUnreadCount += deletedNotification.replies.filter(
            (reply) => !reply.read && reply.sender_id?.toString() !== userId
          ).length;
        }

        setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
        setUnreadCount((prev) => Math.max(0, prev - deletedUnreadCount));
        message.success('Notification supprimée avec succès');
      } else {
        message.error(response.data?.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
      message.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const startReply = (notification) => {
    setReplyingTo(notification);
    setReplyContent('');
    toggleNotificationReadStatus(notification);
  };

  const sendReply = async () => {
    if (!replyContent?.trim()) {
      message.error('Veuillez saisir un message.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      message.error('Authentification requise');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/notifications/${replyingTo._id}/reply`,
        { content: replyContent, read: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Erreur lors de l’envoi de la réponse");
      }

      message.success('Réponse envoyée avec succès');
      setReplyingTo(null);
      setReplyContent('');
      await fetchNotifications();
    } catch (error) {
      console.error("Erreur lors de l’envoi de la réponse :", error);
      message.error(error.response?.data?.message || "Erreur lors de l’envoi de la réponse");
    }
  };

  const toggleReplies = async (notificationId) => {
    const token = getAuthToken();
    if (!token || !adminId) {
      return;
    }

    const userId = getUserIdFromToken(token);
    if (!userId) return;

    const isExpanding = !expandedReplies[notificationId];

    setExpandedReplies((prev) => ({
      ...prev,
      [notificationId]: isExpanding,
    }));

    if (isExpanding) {
      const notification = notifications.find((n) => n._id === notificationId);
      if (notification?.replies?.length > 0) {
        setMarkingAsRead((prev) => ({ ...prev, [notificationId]: true }));
        try {
          const repliesToMark = notification.replies
            .filter((r) => !r.read && r.sender_id?.toString() !== userId)
            .map((r) => r._id);

          if (repliesToMark.length > 0) {
            const results = await Promise.all(
              repliesToMark.map((replyId) => markReplyAsRead(notification._id, replyId))
            );
            const success = results.every((result) => result);
            if (success) {
              setNotifications((prev) =>
                prev.map((n) =>
                  n._id === notificationId
                    ? {
                        ...n,
                        replies: n.replies.map((reply) =>
                          repliesToMark.includes(reply._id) ? { ...reply, read: true } : reply
                        ),
                      }
                    : n
                )
              );
              setUnreadCount((prev) => Math.max(0, prev - repliesToMark.length));
            }
          }
        } catch (error) {
          console.error('Erreur lors du marquage des réponses comme lues:', error);
          message.error('Erreur lors du marquage des réponses comme lues');
        } finally {
          setMarkingAsRead((prev) => ({ ...prev, [notificationId]: false }));
        }
      }
    }
  };

  const handleViewContract = async (notification) => {
    if (
      !['NOUVELLE_MISSION', 'FEEDBACK_COMPTE_RENDU', 'CONTRAT_REJETE_CANDIDAT'].includes(notification.type) ||
      !notification.userId ||
      !notification.contrat
    ) {
      console.warn('Invalid notification data:', {
        type: notification.type,
        userId: notification.userId,
        contrat: notification.contrat,
      });
      message.error('Notification invalide');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      message.error('Authentification requise');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/utilisateur/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userId = response.data.id;
      if (!userId) {
        throw new Error('ID utilisateur non trouvé');
      }

      if (notification.userId.toString() === userId && notification.contrat) {
        const contratId = notification.contrat?._id || notification.contrat;
        if (
          !contratId ||
          typeof contratId !== 'string' ||
          !/^[0-9a-fA-F]{24}$/.test(contratId)
        ) {
          throw new Error(`Identifiant de contrat invalide: ${contratId}`);
        }

        console.log('Navigating to contract:', { userId, contratId });
        await toggleNotificationReadStatus(notification);
        navigate(`/contrat_candidat?contratId=${contratId}`);
      } else {
        console.error('Utilisateur non autorisé ou contrat non trouvé', {
          userId,
          notificationUserId: notification.userId,
          contrat: notification.contrat,
        });
        message.error('Aucun contrat associé trouvé pour cette notification.');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l’utilisateur ou du contrat:', error);
      message.error(error.response?.data?.message || 'Erreur lors de l’accès au contrat.');
    }
  };

  const showFeedbackModal = (notification) => {
    setSelectedFeedback(notification.data?.feedback || '');
    setIsFeedbackModalVisible(true);
    toggleNotificationReadStatus(notification);
  };

  const handleFeedbackModalOk = () => {
    setIsFeedbackModalVisible(false);
    setSelectedFeedback(null);
  };

  const handleFeedbackModalCancel = () => {
    setIsFeedbackModalVisible(false);
    setSelectedFeedback(null);
  };

  // Filtrage des notifications selon l'onglet
  const filteredNotifications = notifications.filter((notification) => {
    const token = getAuthToken();
    if (!token || !adminId) return false;
    const userId = getUserIdFromToken(token);
    if (!userId) return false;
    if (activeTab === 'all') return true;
    return (
      (!notification.read && (notification.user_id === userId || notification.userId === userId)) ||
      (notification.replies?.length &&
        notification.replies.some(
          (reply) => !reply.read && reply.sender_id?.toString() !== userId
        ))
    );
  });

  const getLatestInterviewTime = (notification) => {
    if (notification.replies?.length > 0) {
      const latestReply = notification.replies
        .filter((reply) => reply.content.includes('replanifié pour le'))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      if (latestReply) {
        const dateMatch = latestReply.content.match(/(\d{1,2}\/\d{2}\/\d{4})\sà\s(\d{2}:\d{2})/);
        if (dateMatch) {
          const [_, date, time] = dateMatch;
          return dayjs(`${date} ${time}`, 'DD/MM/YYYY HH:mm').format('dddd D MMMM YYYY [à] HH[h]');
        }
      }
    }
    return notification.data?.date_entretien
      ? dayjs(notification.data.date_entretien).format('dddd D MMMM YYYY [à] HH[h]')
      : null;
  };

  const renderNotificationContent = (notification) => {
    console.log('Rendering notification:', notification);
    const token = getAuthToken();
    const userId = token ? getUserIdFromToken(token) : null;
    const hasReplies = notification.replies?.length > 0;
    const hasRecentReply = hasReplies && notification.replies.some(
      (reply) => !reply.read && reply.sender_id?.toString() !== userId
    );
    const isExpanded = expandedReplies[notification._id] || (activeTab === 'unread' && hasRecentReply);
    const isUnreadDueToRepliesOnly = activeTab === 'unread' && notification.read && hasRecentReply;

    if (!notification.data) {
      return <div>Données de notification manquantes</div>;
    }

    // Helper function to extract Google Meet link from message
    const extractMeetLink = (message) => {
      if (!message) return null;
      const meetLinkRegex = /https:\/\/meet\.google\.com\/[a-zA-Z0-9-]+/;
      const match = message.match(meetLinkRegex);
      return match ? match[0] : null;
    };

    // Extract message and meet link
    const messageContent = notification.data?.message || notification.data?.body || '';
    const meetLink = extractMeetLink(messageContent);
    const displayMessage = meetLink ? messageContent.replace(meetLink, '').replace(/Lien Meet:\s*/, '').trim() : messageContent;

    return (
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 12,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar
              icon={getNotificationIcon(notification.type)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.8)',
                border: `2px solid ${notification.read && !hasRecentReply ? '#d9d9d9' : '#1565c0'}`,
              }}
            />
            <Checkbox
              checked={selectedNotifications.includes(notification._id)}
              onChange={(e) => {
                e.stopPropagation();
                handleSelectNotification(notification._id, e.target.checked);
              }}
            >
              <Space>
                <Badge dot={hasRecentReply} offset={[8, 0]} style={{ backgroundColor: '#52c41a' }}>
                  <Text
                    strong
                    style={{ fontSize: 16, marginLeft: 8 }}
                  >
                    {notification.type === 'CONTRAT_PUBLIE'
                      ? 'Contrat publié'
                      : notification.type === 'NOUVELLE_MISSION'
                      ? 'Nouvelle mission'
                      : notification.type === 'FEEDBACK'
                      ? 'Feedback / Compte-rendu'
                      : notification.type === 'ENTRETIEN_EVALUE'
                      ? 'Entretien évalué'
                      : notification.type === 'CONTRAT_REJETE_CANDIDAT'
                      ? 'Contrat rejeté'
                      : notification.type === 'NEW_FORMATION'
                      ? 'Nouvelle formation'
                      : notification.type === 'NEW_FORMATION_ASSIGNMENT'
                      ? 'Assignation à une formation'
                      : notification.data?.name || notification.type.replace(/_/g, ' ').toLowerCase()}
                  </Text>
                </Badge>
                {hasRecentReply && (
                  <Badge count="Nouveau" size="small" style={{ backgroundColor: '#ff4444' }}>
                    <MessageOutlined style={{ color: '#ff4444', marginLeft: 8 }} />
                  </Badge>
                )}
              </Space>
            </Checkbox>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!notification.read && (notification.user_id === userId || notification.userId === userId) && (
              <Tag color="red">Nouveau</Tag>
            )}
            <Tag color={getTagColor(notification.type)}>
              {notification.type === 'CONTRAT_PUBLIE'
                ? 'Contrat publié'
                : notification.type === 'NOUVELLE_MISSION'
                ? 'Nouvelle mission'
                : notification.type === 'FEEDBACK'
                ? 'Feedback / Compte-rendu'
                : notification.type === 'ENTRETIEN_EVALUE'
                ? 'Entretien évalué'
                : notification.type === 'CONTRAT_REJETE_CANDIDAT'
                ? 'Contrat rejeté'
                : notification.type === 'NEW_FORMATION'
                ? 'Nouvelle formation'
                : notification.type === 'NEW_FORMATION_ASSIGNMENT'
                ? 'Assignation à une formation'
                : notification.type.replace(/_/g, ' ').toLowerCase()}
            </Tag>
          </div>
        </div>

        {/* Contenu principal de la notification */}
        <div
          style={{
            margin: '8px 0',
            paddingLeft: 16,
            borderLeft: `3px solid ${getTagColor(notification.type)}`,
            marginLeft: 28,
            cursor: 'pointer',
          }}
          onClick={() => {
            if (!replyingTo || replyingTo._id !== notification._id) {
              console.log(`Marking notification ${notification._id} as read`);
              toggleNotificationReadStatus(notification);
            }
          }}
        >
          {(() => {
            switch (notification.type) {
              case 'ENTRETIEN_PLANIFIE':
                return (
                  <>
                    <div>
                      {notification.data?.message ? (
                        <>
                          {notification.data.message.split('Lien de la réunion : ')[0]}
                          {notification.data?.meet_link ? (
                            <>
                              {' '}
                              <a
                                href={notification.data.meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1565c0', textDecoration: 'underline' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Rejoindre la réunion
                              </a>
                            </>
                          ) : (
                            ' (Lien de réunion non disponible)'
                          )}
                        </>
                      ) : (
                        'Planification d’entretien en attente de détails'
                      )}
                    </div>
                    {getLatestInterviewTime(notification) && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CalendarOutlined />
                        <Text>{getLatestInterviewTime(notification)}</Text>
                      </div>
                    )}
                  </>
                );

              case 'ENTRETIEN_EVALUE':
                return (
                  <>
                    <div>{notification.data?.message || 'Votre entretien a été évalué.'}</div>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckOutlined style={{ color: '#52c41a' }} />
                      <Text>Évaluation de l’entretien</Text>
                    </div>
                  </>
                );

              case 'CONTRAT_PUBLIE':
                return <div>{notification.data?.message || 'Un nouveau contrat a été publié.'}</div>;

              case 'NOUVELLE_MISSION':
                return (
                  <>
                    <div>{notification.data?.message || notification.data?.body || 'Nouvelle mission assignée.'}</div>
                    {notification.contrat && (
                      <Button
                        type="link"
                        icon={<FileTextOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContract(notification);
                        }}
                        style={{ marginTop: 8, padding: 0 }}
                      >
                        Voir le contrat associé
                      </Button>
                    )}
                  </>
                );

              case 'FEEDBACK':
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text>{notification.data?.message || notification.data?.body || 'Nouveau feedback reçu.'}</Text>
                      {notification.data?.feedback && (
                        <Button
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            showFeedbackModal(notification);
                          }}
                          style={{ padding: 0 }}
                          aria-label="Voir le feedback"
                        >
                          Voir le feedback
                        </Button>
                      )}
                    </div>
                    {notification.contrat && (
                      <Button
                        type="link"
                        icon={<FileTextOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContract(notification);
                        }}
                        style={{ marginTop: 8, padding: 0 }}
                      >
                        Voir le contrat associé
                      </Button>
                    )}
                  </>
                );

              case 'CONTRAT_REJETE_CANDIDAT':
                return (
                  <>
                    <div>
                      {notification.data?.commentaire || 'Le contrat a été rejeté par le candidat.'}
                    </div>
                    {notification.contrat && (
                      <Button
                        type="link"
                        icon={<FileTextOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContract(notification);
                        }}
                        style={{ marginTop: 8, padding: 0 }}
                      >
                        Voir le contrat associé
                      </Button>
                    )}
                  </>
                );

              case 'NEW_FORMATION':
              case 'NEW_FORMATION_ASSIGNMENT':
                return (
                  <>
                    <div>{displayMessage || 'Aucune information disponible'}</div>
                    {meetLink && (
                      <Button
                        type="link"
                        icon={<CalendarOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(meetLink, '_blank', 'noopener,noreferrer');
                        }}
                        style={{ marginTop: 8, padding: 0 }}
                      >
                        Rejoindre
                      </Button>
                    )}
                  </>
                );

              default:
                return displayMessage || 'Aucune donnée disponible';
            }
          })()}
        </div>

        {/* Actions en bas de notification */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: 44,
            marginTop: 12,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(notification.created_at).fromNow()}
          </Text>
          <Space>
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                startReply(notification);
              }}
            >
              Répondre
            </Button>
            {hasReplies && (
              <Button
                type="text"
                icon={isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleReplies(notification._id);
                }}
              >
                {isExpanded ? 'Masquer' : 'Afficher'} les réponses
              </Button>
            )}
            <Popconfirm
              title="Confirmez pour supprimer cette notification ?"
              onConfirm={(e) => {
                e?.stopPropagation();
                deleteNotification(notification._id);
              }}
              okText="Oui"
              cancelText="Non"
            >
              <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          </Space>
        </div>

        {/* Réponses */}
        {hasReplies && isExpanded && (
          <div
            style={{
              marginTop: 16,
              marginLeft: 28,
              borderLeft: '2px solid #f0f0f0',
              paddingLeft: 16,
            }}
          >
            {(activeTab === 'unread' && isUnreadDueToRepliesOnly
              ? notification.replies.filter(
                  (reply) => !reply.read && reply.sender_id?.toString() !== userId
                )
              : notification.replies
            ).map((reply) => (
              <div
                key={reply._id}
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  backgroundColor: reply.read || reply.sender_id?.toString() === userId ? '#fafafa' : '#e6f7ff',
                  borderRadius: 8,
                  borderLeft: `3px solid ${reply.read || reply.sender_id?.toString() === userId ? '#d9d9d9' : '#1565c0'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar
                      size="small"
                      style={{
                        backgroundColor: reply.sender_id?.toString() === userId ? '#52c41a' : '#1565c0',
                        color: '#fff',
                      }}
                    >
                      {reply.displayName ? reply.displayName[0] : reply.sender_id?.toString() === userId ? 'V' : 'U'}
                    </Avatar>
                    <Text
                      strong
                    >
                      {reply.sender_id?.toString() === userId ? 'Vous' : reply.displayName || 'Utilisateur'}
                    </Text>
                    {!reply.read && reply.sender_id?.toString() !== userId && (
                      <Tag color="red">Nouveau</Tag>
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(reply.created_at).fromNow()}
                  </Text>
                </div>
                <Text style={{ marginTop: 8, display: 'block', paddingLeft: 24 }}>{reply.content}</Text>
              </div>
            ))}
          </div>
        )}

        {/* Zone de réponse */}
        {replyingTo?._id === notification._id && (
          <div
            style={{
              marginTop: 16,
              marginLeft: 16,
              marginRight: 28,
              backgroundColor: '#fff',
              padding: 16,
              borderRadius: 8,
            }}
          >
            <TextArea
              rows={5}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Votre réponse..."
              autoSize={{ minRows: 3, maxRows: 6 }}
              style={{
                marginBottom: 8,
                border: '1px solid #d0e0d9',
                borderRadius: 4,
                padding: 8,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'end', gap: 8 }}>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                Annuler
              </Button>
              <Button
                type="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  sendReply();
                }}
              >
                Envoyer
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Initialisation
  useEffect(() => {
    fetchAdminId();
  }, []);

  useEffect(() => {
    if (adminId) {
      fetchNotifications();
      const interval = setInterval(() => {
        if (!Object.values(markingAsRead).some((status) => status)) {
          fetchNotifications();
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [adminId, markingAsRead]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <div style={{ padding: '20px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <BellOutlined style={{ fontSize: 24, color: '#1565c0' }} />
              <Title level={3} style={{ margin: 0 }}>
                Mes notifications
              </Title>
              {unreadCount > 0 && (
                <Badge
                  count={unreadCount}
                  style={{
                    backgroundColor: '#ff4444',
                    boxShadow: '0 0 0 1px #fff',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                />
              )}
            </div>
          }
          extra={
            <Space>
              <Button
                type="primary"
                ghost
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Tout marquer comme lu
              </Button>
            </Space>
          }
          bordered={false}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ padding: 24 }}>
            {/* Onglets */}
            <div style={{ marginBottom: 24 }}>
              <Space size="middle">
                <Button
                  type={activeTab === 'all' ? 'primary' : 'default'}
                  onClick={() => setActiveTab('all')}
                >
                  Toutes
                </Button>
                <Button
                  type={activeTab === 'unread' ? 'primary' : 'default'}
                  onClick={() => setActiveTab('unread')}
                >
                  Non lues
                </Button>
              </Space>
            </div>

            {/* Actions */}
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Checkbox onChange={handleSelectAll}>Sélectionner tout</Checkbox>
                <Popconfirm
                  title="Confirmez pour supprimer les notifications sélectionnées ?"
                  onConfirm={deleteSelectedNotifications}
                  okText="Oui"
                  cancelText="Non"
                  disabled={selectedNotifications.length === 0}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selectedNotifications.length === 0}
                  >
                    Supprimer ({selectedNotifications.length})
                  </Button>
                </Popconfirm>
              </Space>
            </div>

            <Divider />

            {/* Liste des notifications */}
            <List
              loading={loading}
              dataSource={filteredNotifications}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'Aucune notification disponible' }}
              renderItem={(item) => {
                const token = getAuthToken();
                const userId = token ? getUserIdFromToken(token) : null;
                return (
                  <List.Item
                    key={item._id}
                    style={{
                      padding: '16px 0',
                      marginBottom: 16,
                      transition: 'all 0.3s',
                    }}
                  >
                    <Card
                      hoverable
                      style={{
                        width: '100%',
                        borderLeft: `4px solid ${
                          item.read &&
                          !item.replies?.some(
                            (r) => !r.read && r.sender_id?.toString() !== userId
                          )
                            ? '#d9d9d9'
                            : '#1565c0'
                        }`,
                        borderRadius: 8,
                        backgroundColor: (item.read &&
                            !item.replies?.some(
                              (r) => !r.read && r.sender_id?.toString() !== userId
                            )) ?
                          '#fafafa' : '#e6f7ff',
                        opacity: markingAsRead[item._id] && (!replyingTo || replyingTo._id !== item._id) ? 0.7 : 1,
                      }}
                      bodyStyle={{ padding: '16px 20px' }}
                    >
                      {markingAsRead[item._id] && (!replyingTo || replyingTo._id !== item._id) ? (
                        <Spin style={{ display: 'block', textAlign: 'center', padding: 16 }} />
                      ) : (
                        renderNotificationContent(item)
                      )}
                    </Card>
                  </List.Item>
                );
              }}
            />
          </div>
        </Card>

        {/* Modal Feedback */}
        <Modal
          title="Feedback de la mission"
          open={isFeedbackModalVisible}
          onOk={handleFeedbackModalOk}
          onCancel={handleFeedbackModalCancel}
          footer={[
            <Button key="close" onClick={handleFeedbackModalCancel}>
              Fermer
            </Button>,
          ]}
          width={600}
        >
          <Text>{selectedFeedback || 'Aucun feedback disponible'}</Text>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;