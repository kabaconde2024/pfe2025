import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { Card, Tag, List, message, Typography, TimePicker, Alert } from 'antd';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const { Title, Text } = Typography;
const localizer = momentLocalizer(moment);

const CalendrierFormateurs = ({ formationId, onSelectSlot }) => {
  const [formateurs, setFormateurs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (formationId) {
      chargerDonnees();
    }
  }, [formationId]);

  const chargerDonnees = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }

      // Fetch user profile to determine role
      const userResponse = await axios.get('http://localhost:5000/api/utilisateur/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const isEntreprise = userResponse.data.profils.some(profil => profil.name === 'Entreprise');
      setUserRole(isEntreprise ? 'entreprise' : 'other');

      // Fetch planning for specific formation
      const response = await axios.get(`http://localhost:5000/api/formation/${formationId}/planning`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const eventsFormatted = response.data.formateurs.flatMap(formateur => {
        return formateur.formations.map(formation => ({
          id: formation.id,
          title: `${formation.titre} (${formateur.nom}) - ${moment(formation.debut).format('HH:mm')} à ${moment(formation.fin).format('HH:mm')}`,
          start: new Date(formation.debut),
          end: new Date(formation.fin),
          resourceId: formateur.id,
          formateur: `${formateur.nom} ${formateur.prenom}`,
          competences: formateur.competences,
          type: 'formation'
        }));
      });

      setFormateurs(response.data.formateurs);
      setEvents(eventsFormatted);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de chargement des données';
      setError(errorMessage);
      message.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slotInfo) => {
    if (userRole !== 'entreprise') {
      message.info('Seule l\'entreprise peut sélectionner des créneaux horaires');
      return;
    }

    const { start, end } = slotInfo;
    setSelectedRange({ start, end });

    const conflits = events.filter(event =>
      moment(start).isBefore(moment(event.end)) &&
      moment(end).isAfter(moment(event.start))
    );

    if (conflits.length > 0) {
      message.warning(
        <List
          size="small"
          header={<div>Conflits détectés avec :</div>}
          dataSource={conflits}
          renderItem={event => (
            <List.Item>
              <Text strong>{event.formateur}</Text>: {event.title} ({moment(event.start).format('HH:mm')}-{moment(event.end).format('HH:mm')})
            </List.Item>
          )}
        />
      );
      return;
    }

    const formateursDisponibles = formateurs.filter(formateur =>
      !events.some(event =>
        event.resourceId === formateur.id &&
        moment(start).isBefore(moment(event.end)) &&
        moment(end).isAfter(moment(event.start))
      )
    );

    if (onSelectSlot) {
      onSelectSlot({
        start,
        end,
        formateursDisponibles
      });
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#1890ff';
    if (event.type === 'formation') {
      backgroundColor = '#f5222d';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        padding: '2px 5px',
        opacity: 0.8,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    };
  };

  const handleTimeChange = (time, field) => {
    if (userRole !== 'entreprise') {
      return;
    }

    if (!selectedRange) return;

    const newRange = {
      ...selectedRange,
      [field]: moment(selectedRange[field])
        .set({
          hour: time.hour(),
          minute: time.minute()
        })
        .toDate()
    };

    setSelectedRange(newRange);
    handleSelectSlot(newRange);
  };

  // If no formationId is provided, render a simple calendar
  if (!formationId) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <div style={{ padding: '34px' }}>
          <Card
            title={<Title level={3} style={{ margin: 0 }}>Calendrier</Title>}
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <div style={{ height: '70vh', marginTop: '16px' }}>
              <Calendar
                localizer={localizer}
                events={[]}
                startAccessor="start"
                endAccessor="end"
                defaultView="month"
                views={['month', 'week', 'day']}
                step={60}
                timeslots={1}
                min={new Date(0, 0, 0, 8, 0, 0)}
                max={new Date(0, 0, 0, 20, 0, 0)}
                messages={{
                  today: 'Aujourd\'hui',
                  previous: 'Précédent',
                  next: 'Suivant',
                  month: 'Mois',
                  week: 'Semaine',
                  day: 'Jour'
                }}
              />
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // If error, display error message
  if (error) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <div style={{ padding: '34px' }}>
          <Alert
            message="Erreur"
            description={error}
            type="error"
            showIcon
            style={{ maxWidth: 600, margin: '0 auto' }}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Original rendering for users with valid formationId
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <div style={{ padding: '34px' }}>
        <Card
          title={<Title level={3} style={{ margin: 0 }}>Calendrier de la Formation</Title>}
          style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          {userRole !== 'entreprise' && (
            <Alert
              message="Information"
              description="Vous pouvez consulter le calendrier, mais seule l'entreprise peut planifier des créneaux."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            {selectedRange && userRole === 'entreprise' && (
              <>
                <div>
                  <Text strong>Début:</Text>
                  <TimePicker
                    format="HH:mm"
                    defaultValue={moment(selectedRange.start)}
                    onChange={(time) => handleTimeChange(time, 'start')}
                    style={{ marginLeft: '8px' }}
                  />
                </div>
                <div>
                  <Text strong>Fin:</Text>
                  <TimePicker
                    format="HH:mm"
                    defaultValue={moment(selectedRange.end)}
                    onChange={(time) => handleTimeChange(time, 'end')}
                    style={{ marginLeft: '8px' }}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ height: '70vh', marginTop: '16px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              selectable={userRole === 'entreprise'}
              onSelectSlot={handleSelectSlot}
              defaultView="week"
              views={['month', 'week', 'day']}
              step={60}
              timeslots={1}
              min={new Date(0, 0, 0, 8, 0, 0)}
              max={new Date(0, 0, 0, 20, 0, 0)}
              eventPropGetter={eventStyleGetter}
              messages={{
                today: 'Aujourd\'hui',
                previous: 'Précédent',
                next: 'Suivant',
                month: 'Mois',
                week: 'Semaine',
                day: 'Jour'
              }}
            />
          </div>
          <div style={{ marginTop: '16px' }}>
            <Tag color="#1890ff">Disponible</Tag>
            <Tag color="#f5222d">Formation existante</Tag>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

CalendrierFormateurs.propTypes = {
  formationId: PropTypes.string,
  onSelectSlot: PropTypes.func
};

export default CalendrierFormateurs;