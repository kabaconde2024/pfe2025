import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import axios from 'axios';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';
import { Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PointageEmployes = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedContracts, setExpandedContracts] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(null);
  const [monthInputs, setMonthInputs] = useState({});
  const dialogRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setEmployees([]);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('Session expirée. Veuillez vous reconnecter.');
        setOpenSnackbar(true);
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/pointage/admin/entreprises`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Format de données invalide reçu du serveur.');
      }

      const allEmployees = response.data.flatMap((entreprise) =>
        Array.isArray(entreprise.employes)
          ? entreprise.employes.map((employee) => ({
              ...employee,
              entrepriseNom: entreprise.nomEntreprise || 'Inconnue',
            }))
          : []
      );

      if (allEmployees.length === 0) {
        setErrorMessage('Aucun employé trouvé pour votre entreprise.');
        setOpenSnackbar(true);
      }

      setEmployees(allEmployees);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.response ? 'Erreur lors du chargement des données.' : 'Erreur réseau. Veuillez vérifier votre connexion.');
      setErrorMessage(msg);
      setOpenSnackbar(true);
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        setOpenDialog(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const toggleRow = (employeeId) => {
    setExpandedRows((prev) => ({ ...prev, [employeeId]: !prev[employeeId] }));
  };

  const toggleContract = (employeeId, contratId) => {
    setExpandedContracts((prev) => ({
      ...prev,
      [`${employeeId}-${contratId}`]: !prev[`${employeeId}-${contratId}`],
    }));
  };

  const toggleDialog = (itemType, itemId) => {
    if (openDialog === `${itemType}-${itemId}`) {
      setOpenDialog(null);
    } else {
      setOpenDialog(`${itemType}-${itemId}`);
    }
  };

  const toggleMonthDialog = (employeeId, contratId) => {
    const dialogId = `${employeeId}-${contratId}`;
    if (openDialog === dialogId) {
      setOpenDialog(null);
      setMonthInputs((prev) => ({ ...prev, [dialogId]: '' }));
    } else {
      setOpenDialog(dialogId);
      setMonthInputs((prev) => ({ ...prev, [dialogId]: '' }));
    }
  };

  const filterByDateRange = (items) => {
    if (!Array.isArray(items)) return [];
    if (!startDate && !endDate) return items;
    return items.filter((item) => {
      const itemDate = new Date(item.date);
      if (isNaN(itemDate.getTime())) return false;
      const start = startDate ? new Date(startDate) : new Date(-8640000000000000);
      const end = endDate ? new Date(endDate) : new Date(8640000000000000);
      return itemDate >= start && itemDate <= end;
    });
  };

  const getStatusBadge = (statut) => {
    const normalizedStatut = statut?.toLowerCase() || 'inconnu';
    const colors = {
      validé: '#2E7D32',
      'en attente': '#F57C00',
      rejeté: '#C62828',
      inconnu: '#B0BEC5',
    };
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: '16px',
          backgroundColor: colors[normalizedStatut],
          color: 'white',
          fontSize: '12px',
          fontWeight: '500',
          textTransform: 'capitalize',
        }}
      >
        {normalizedStatut}
      </span>
    );
  };

  const isFilePath = (justificatif) => {
    if (!justificatif || typeof justificatif !== 'string') {
      console.warn('Valeur de justificatif invalide:', justificatif);
      return false;
    }
    const normalizedJustificatif = justificatif.toLowerCase();
    return normalizedJustificatif.startsWith('/uploads/justificatifs/');
  };

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter((employee) =>
      (employee.nom || '').toLowerCase().includes(nameFilter.toLowerCase())
    );
  }, [employees, nameFilter]);

  const filteredData = useMemo(() => {
    const dataMap = {};
    employees.forEach((employee) => {
      if (!Array.isArray(employee.contrats)) return;
      employee.contrats.forEach((contrat) => {
        const key = `${employee._id}-${contrat.contratId}`;
        dataMap[key] = {
          pointages: filterByDateRange(contrat.pointages || []),
          absences: filterByDateRange(contrat.absences || []),
        };
      });
    });
    return dataMap;
  }, [employees, startDate, endDate]);

  const handleValidatePointage = async (pointageId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/api/pointage/validate/${pointageId}`,
        { statut: 'validé' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(response.data.message || 'Pointage validé avec succès !');
      setOpenSnackbar(true);
      await fetchData();
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        'Erreur lors de la validation du pointage';
      setErrorMessage(msg);
      setOpenSnackbar(true);
      console.error('Validate pointage error:', error);
    } finally {
      setLoading(false);
      setOpenDialog(null);
    }
  };

  const handleRejectPointage = async (pointageId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/api/pointage/validate/${pointageId}`,
        { statut: 'rejeté' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(response.data.message || 'Pointage rejeté avec succès !');
      setOpenSnackbar(true);
      await fetchData();
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        'Erreur lors du rejet du pointage';
      setErrorMessage(msg);
      setOpenSnackbar(true);
      console.error('Reject pointage error:', error);
    } finally {
      setLoading(false);
      setOpenDialog(null);
    }
  };

  const handleValidateAbsence = async (absenceId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/api/pointage/absences/validate/${absenceId}`,
        { statut: 'validé' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(response.data.message || 'Absence validée avec succès !');
      setOpenSnackbar(true);
      await fetchData();
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        'Erreur lors de la validation de l\'absence';
      setErrorMessage(msg);
      setOpenSnackbar(true);
      console.error('Validate absence error:', error);
    } finally {
      setLoading(false);
      setOpenDialog(null);
    }
  };

  const handleRejectAbsence = async (absenceId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/api/pointage/absences/reject/${absenceId}`,
        { statut: 'rejeté' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(response.data.message || 'Absence rejetée avec succès !');
      setOpenSnackbar(true);
      await fetchData();
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        'Erreur lors du rejet de l\'absence';
      setErrorMessage(msg);
      setOpenSnackbar(true);
      console.error('Reject absence error:', error);
    } finally {
      setLoading(false);
      setOpenDialog(null);
    }
  };

  const handleViewFiche = async (ficheId) => {
    if (!ficheId) {
      setErrorMessage('Identifiant de la fiche de paie manquant.');
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('Session expirée. Veuillez vous reconnecter.');
        setOpenSnackbar(true);
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/pointage/fiche-de-paie/${ficheId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'];
      if (contentType !== 'application/pdf') {
        throw new Error('Le fichier reçu n\'est pas un PDF valide.');
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        setErrorMessage('Veuillez autoriser les pop-ups pour visualiser la fiche de paie.');
        setOpenSnackbar(true);
        window.URL.revokeObjectURL(url);
        setLoading(false);
        return;
      }

      setSuccessMessage('Fiche de paie ouverte avec succès !');
      setOpenSnackbar(true);

      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      let msg = 'Erreur lors du chargement de la fiche de paie.';

      if (error.response && error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          msg = json.message || msg;
        } catch (e) {
          msg = 'Erreur lors de l\'analyse de la réponse du serveur.';
        }
      } else if (error.response?.status === 404) {
        msg = 'Fiche de paie introuvable.';
      } else if (error.message) {
        msg = error.message;
      }

      setErrorMessage(msg);
      setOpenSnackbar(true);
      console.error('View fiche error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCode = () => {
    const code = `import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import axios from 'axios';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';
import { Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// ... (rest of the PointageEmployes component code) ...
`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PointageEmployes Code</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; background: #f4f4f4; }
            pre { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>PointageEmployes Component Code</h1>
          <pre>${code}</pre>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } else {
      setErrorMessage('Veuillez autoriser les pop-ups pour visualiser le code.');
      setOpenSnackbar(true);
    }
  };

  const handleValidateMonth = async (employeeId, contratId) => {
    const employee = employees.find((e) => e._id === employeeId);
    if (!employee) {
      setErrorMessage('Employé introuvable');
      setOpenSnackbar(true);
      return;
    }
    const contrat = employee.contrats?.find((c) => c.contratId === contratId);
    if (!contrat) {
      setErrorMessage('Contrat introuvable');
      setOpenSnackbar(true);
      return;
    }

    const dialogId = `${employeeId}-${contratId}`;
    const monthYear = monthInputs[dialogId];

    if (!monthYear) {
      setErrorMessage('Veuillez saisir un mois et une année');
      setOpenSnackbar(true);
      return;
    }
    if (!/^\d{2}\/\d{4}$/.test(monthYear)) {
      setErrorMessage('Format de mois invalide. Utilisez MM/YYYY (ex. 05/2025)');
      setOpenSnackbar(true);
      return;
    }
    const [month, year] = monthYear.split('/').map(Number);
    if (month < 1 || month > 12) {
      setErrorMessage('Mois invalide');
      setOpenSnackbar(true);
      return;
    }
    if (year < 1900 || year > new Date().getFullYear() + 1) {
      setErrorMessage('Année invalide');
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/api/pointage/validate-month/${employeeId}/${contratId}`,
        { monthYear },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(response.data.message || 'Mois validé avec succès !');
      setOpenSnackbar(true);
      await fetchData();
      setMonthInputs((prev) => ({ ...prev, [dialogId]: '' }));
      setOpenDialog(null);
    } catch (error) {
      const msg =
        error.response?.data?.code === 'MONTH_ALREADY_VALIDATED'
          ? `Le mois ${monthYear} est déjà validé.`
          : error.response?.data?.message || 'Erreur lors de la validation';
      console.log('Erreur API:', msg);
      setErrorMessage(msg);
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const getLatestPoste = (contrats) => {
    if (!Array.isArray(contrats) || contrats.length === 0) return '-';
    const sortedContrats = [...contrats].sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut));
    return sortedContrats[0]?.intitulePoste || '-';
  };

  const renderActionDialog = (itemType, itemId, handleValidate, handleReject) => {
    if (!openDialog || openDialog !== `${itemType}-${itemId}`) return null;

    const title = itemType === 'pointage' ? 'Gérer le Pointage' : 'Gérer l\'Absence';

    return ReactDOM.createPortal(
      <div
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
        }}
      >
        <div
          ref={dialogRef}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px',
            width: '450px',
            maxWidth: '95%',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            position: 'relative',
            transition: 'transform 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <button
            onClick={() => setOpenDialog(null)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: '#718096',
              cursor: 'pointer',
              transition: 'color 0.2s',
              zIndex: 2100,
            }}
            onMouseOver={(e) => (e.target.style.color = '#4A5568')}
            onMouseOut={(e) => (e.target.style.color = '#718096')}
            aria-label="Fermer la boîte de dialogue"
          >
            ×
          </button>
          <h3 style={{ margin: '0 0 20px', color: '#1A202C', fontSize: '20px', fontWeight: '700' }}>
            {title}
          </h3>
          <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
            <button
              onClick={() => handleValidate(itemId)}
              disabled={loading}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: loading ? '#EDF2F7' : '#2E7D32',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                flex: 1,
                boxShadow: loading ? 'none' : '0 4px 12px rgba(46, 143, 50, 0.3)',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => !loading && (e.target.style.background = '#1F4E2F')}
              onMouseOut={(e) => !loading && (e.target.style.background = '#2E7D32')}
              aria-label={`Valider ${itemType}`}
            >
              Valider
            </button>
            <button
              onClick={() => handleReject(itemId)}
              disabled={loading}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: loading ? '#EDF2F7' : '#C62828',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                flex: 1,
                boxShadow: loading ? 'none' : '0 4px 12px rgba(198, 40, 40, 0.3)',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => !loading && (e.target.style.background = '#A52727')}
              onMouseOut={(e) => !loading && (e.target.style.background = '#C62828')}
              aria-label={`Rejeter ${itemType}`}
            >
              Rejeter
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderContractDetails = (employee, contrat) => {
    const key = `${employee._id}-${contrat.contratId}`;
    const { pointages, absences } = filteredData[key] || { pointages: [], absences: [] };

    const hasPendingItems =
      pointages.some((p) => p.statut?.toLowerCase() === 'en attente') ||
      absences.some((a) => a.statut?.toLowerCase() === 'en attente');

    const dialogId = `${employee._id}-${contrat.contratId}`;
    const monthYear = monthInputs[dialogId] || '';
    const isMonthValid = /^\d{2}\/\d{4}$/.test(monthYear);
    const isMonthValidated = contrat.mois_valides?.some(
      (m) => m.mois === monthYear && m.statut === 'validé'
    );
    const disableReason = !monthYear
      ? 'Veuillez saisir un mois et une année'
      : !isMonthValid
      ? 'Format de mois invalide (MM/YYYY)'
      : hasPendingItems
      ? 'Validez ou rejetez tous les pointages/absences en attente'
      : isMonthValidated
      ? `Le mois ${monthYear} est déjà validé`
      : '';
    const buttonDisabled = loading || !isMonthValid || hasPendingItems || isMonthValidated;

    return (
      <div
        key={contrat.contratId}
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            <h4 style={{ margin: '0', color: '#2D3748', fontSize: '16px', fontWeight: '600' }}>
              Contrat: {contrat.intitulePoste || 'Non spécifié'}
            </h4>
            <p style={{ margin: '4px 0', color: '#718096', fontSize: '14px' }}>
              Début: {contrat.dateDebut ? new Date(contrat.dateDebut).toLocaleDateString('fr-FR') : '-'}
              {contrat.dateFin ? ` - Fin: ${new Date(contrat.dateFin).toLocaleDateString('fr-FR')}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => toggleContract(employee._id, contrat.contratId)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#4A90E2',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => (e.target.style.background = '#357ABD')}
              onMouseOut={(e) => (e.target.style.background = '#4A90E2')}
              aria-label={expandedContracts[`${employee._id}-${contrat.contratId}`] ? 'Masquer les détails du contrat' : 'Afficher les détails du contrat'}
            >
              {expandedContracts[`${employee._id}-${contrat.contratId}`] ? 'Masquer' : 'Afficher'}
            </button>
            <button
              onClick={() => toggleMonthDialog(employee._id, contrat.contratId)}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: loading ? '#EDF2F7' : '#2E7D32',
                color: 'white',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => !loading && (e.target.style.background = '#1F4E2F')}
              onMouseOut={(e) => !loading && (e.target.style.background = '#2E7D32')}
              aria-label="Valider le mois pour ce contrat"
            >
              Valider Mois
            </button>
          </div>
        </div>

        {openDialog === `${employee._id}-${contrat.contratId}` && (
          <div
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2000,
            }}
          >
            <div
              ref={dialogRef}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '28px',
                width: '450px',
                maxWidth: '95%',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                position: 'relative',
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <button
                onClick={() => toggleMonthDialog(employee._id, contrat.contratId)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#718096',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  zIndex: 2100,
                }}
                onMouseOver={(e) => (e.target.style.color = '#4A5568')}
                onMouseOut={(e) => (e.target.style.color = '#718096')}
                aria-label="Fermer la boîte de dialogue"
              >
                ×
              </button>
              <h3 style={{ margin: '0 0 20px', color: '#1A202C', fontSize: '20px', fontWeight: '700' }}>
                Valider le mois pour {employee.nom || '-'} ({contrat.intitulePoste || 'Non spécifié'})
              </h3>
              <input
                type="text"
                placeholder="MM/YYYY (ex. 05/2025)"
                value={monthInputs[`${employee._id}-${contrat.contratId}`] || ''}
                onChange={(e) => {
                  setMonthInputs((prev) => ({
                    ...prev,
                    [`${employee._id}-${contrat.contratId}`]: e.target.value,
                  }));
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E0',
                  fontSize: '14px',
                  backgroundColor: '#F7FAFC',
                  color: '#2D3748',
                  width: '100%',
                  transition: 'all 0.3s ease',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                  marginBottom: '16px',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4A90E2';
                  e.target.style.boxShadow = 'inset 0 2px 4px rgba(74, 144, 226, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CBD5E0';
                  e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)';
                }}
                aria-label="Saisir le mois et l'année"
              />
              {disableReason && (
                <div
                  style={{
                    background: '#FED7D7',
                    color: '#822727',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    margin: '16px 0',
                  }}
                >
                  {disableReason}
                </div>
              )}
              <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                <button
                  onClick={() => handleValidateMonth(employee._id, contrat.contratId)}
                  disabled={buttonDisabled}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: buttonDisabled ? '#EDF2F7' : '#2E7D32',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: buttonDisabled ? 'not-allowed' : 'pointer',
                    flex: 1,
                    boxShadow: buttonDisabled ? 'none' : '0 4px 12px rgba(46, 143, 50, 0.3)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseOver={(e) => !buttonDisabled && (e.target.style.background = '#1F4E2F')}
                  onMouseOut={(e) => !buttonDisabled && (e.target.style.background = '#2E7D32')}
                  aria-label="Valider le mois"
                >
                  Valider
                </button>
                <button
                  onClick={() => toggleMonthDialog(employee._id, contrat.contratId)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E0',
                    background: 'transparent',
                    color: '#4A5568',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    flex: 1,
                    transition: 'all 0.3s ease',
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#EDF2F7';
                    e.target.style.borderColor = '#A0AEC0';
                    e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.borderColor = '#CBD5E0';
                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                  aria-label="Annuler la validation"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {expandedContracts[`${employee._id}-${contrat.contratId}`] && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px', color: '#2D3748', fontSize: '16px', fontWeight: '600' }}>Pointages</h4>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                borderSpacing: '0',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '24px',
              }}
              role="grid"
              aria-label="Tableau des pointages"
            >
              <thead style={{ backgroundColor: '#EDF2F7' }}>
                <tr>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Date</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Heure Début</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Heure Fin</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Pause (h)</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Statut</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pointages.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#718096', fontSize: '14px', backgroundColor: '#F7FAFC' }}>
                      Aucun pointage disponible
                    </td>
                  </tr>
                ) : (
                  pointages.map((pointage) => (
                    <tr key={pointage._id} style={{ borderTop: '1px solid #E5E7EB', transition: 'all 0.3s ease' }}>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {pointage.date ? new Date(pointage.date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {pointage.heure_debut || '-'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {pointage.heure_fin || '-'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {pointage.duree_pause || '-'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>{getStatusBadge(pointage.statut)}</td>
                      <td style={{ padding: '10px 16px', position: 'relative' }}>
                        {pointage.statut?.toLowerCase() === 'en attente' ? (
                          <>
                            <IconButton
                              onClick={() => toggleDialog('pointage', pointage._id)}
                              disabled={loading}
                              style={{
                                color: '#4A90E2',
                                transition: 'all 0.3s ease',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#357ABD')}
                              onMouseOut={(e) => (e.currentTarget.style.color = '#4A90E2')}
                              aria-label="Ouvrir les actions pour ce pointage"
                            >
                              <MoreVertIcon />
                            </IconButton>
                            {renderActionDialog('pointage', pointage._id, handleValidatePointage, handleRejectPointage)}
                          </>
                        ) : (
                          <span style={{ color: '#718096', fontSize: '14px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <h4 style={{ margin: '24px 0 12px', color: '#2D3748', fontSize: '16px', fontWeight: '600' }}>Absences</h4>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                borderSpacing: '0',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '24px',
              }}
              role="grid"
              aria-label="Tableau des absences"
            >
              <thead style={{ backgroundColor: '#EDF2F7' }}>
                <tr>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Type</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Date</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Durée (jours)</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Justification</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Statut</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {absences.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#718096', fontSize: '14px', backgroundColor: '#F7FAFC' }}>
                      Aucune absence disponible
                    </td>
                  </tr>
                ) : (
                  absences.map((absence) => (
                    <tr key={absence._id} style={{ borderBottom: '1px solid #E5E7EB', transition: 'all 0.3s ease' }}>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {absence.type || '-'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {absence.date ? new Date(absence.date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {absence.duree || '-'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {isFilePath(absence.justificatif) ? (
                          <a
                            href={`${API_URL}${absence.justificatif}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="justificatif-link"
                            aria-label="Voir le justificatif d'absence"
                          >
                            Justificatif d'absence
                          </a>
                        ) : (
                          <span>{absence.justificatif || '-'}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>{getStatusBadge(absence.statut)}</td>
                      <td style={{ padding: '10px 16px', position: 'relative' }}>
                        {absence.statut?.toLowerCase() === 'en attente' ? (
                          <>
                            <IconButton
                              onClick={() => toggleDialog('absence', absence._id)}
                              disabled={loading}
                              style={{
                                color: '#4A90E2',
                                transition: 'all 0.3s ease',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#357ABD')}
                              onMouseOut={(e) => (e.currentTarget.style.color = '#4A90E2')}
                              aria-label="Ouvrir les actions pour cette absence"
                            >
                              <MoreVertIcon />
                            </IconButton>
                            {renderActionDialog('absence', absence._id, handleValidateAbsence, handleRejectAbsence)}
                          </>
                        ) : (
                          <span style={{ color: '#718096', fontSize: '14px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <h4 style={{ margin: '24px 0 12px', color: '#2D3748', fontSize: '16px', fontWeight: '600' }}>Fiches de Paie</h4>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                borderSpacing: '0',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
              role="grid"
              aria-label="Tableau des fiches de paie"
            >
              <thead style={{ backgroundColor: '#EDF2F7' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Période</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Salaire Brut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Salaire Net</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(!contrat.fichesDePaie || contrat.fichesDePaie.length === 0) ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#718096', fontSize: '14px', backgroundColor: '#F7FAFC' }}>
                      Aucune fiche de paie disponible
                    </td>
                  </tr>
                ) : (
                  contrat.fichesDePaie.map((fiche) => (
                    <tr key={fiche._id} style={{ borderBottom: '1px solid #E5E7EB', transition: 'all 0.3s ease' }}>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {fiche.mois && fiche.annee ? `${fiche.mois}/${fiche.annee}` : '-'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {typeof fiche.salaireBrut === 'number' ? fiche.salaireBrut.toFixed(2) + ' €' : '-'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#2D3748', fontSize: '14px' }}>
                        {typeof fiche.salaireNet === 'number' ? fiche.salaireNet.toFixed(2) + ' €' : '-'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <button
                          onClick={() => handleViewFiche(fiche._id)}
                          disabled={loading}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: loading ? '#EDF2F7' : '#4A90E2',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 4px rgba(74, 144, 226, 0.2)',
                          }}
                          onMouseOver={(e) => !loading && (e.target.style.background = '#357ABD')}
                          onMouseOut={(e) => !loading && (e.target.style.background = '#4A90E2')}
                          aria-label="Visualiser la fiche de paie"
                        >
                          Visualiser PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px',
          marginTop: '80px',
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '24px',
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #E5E7EB',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#1A202C',
                margin: '0',
                lineHeight: '1.2',
              }}
            >
              <svg style={{ width: '32px', height: '32px', fill: '#4A5568' }} viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              Pointages et Absences des Employés
            </h2>
            <p style={{ fontSize: '14px', color: '#718096', margin: '8px 0 0', fontWeight: '400' }}>
              Gestion des pointages, absences et fiches de paie des employés
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Filtrer par nom d'employé"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5E0',
                fontSize: '14px',
                width: '220px',
                backgroundColor: '#F7FAFC',
                color: '#2D3748',
                transition: 'all 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4A90E2';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(74,144,226,0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5E0';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)';
              }}
              aria-label="Filtrer par nom d'employé"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5E0',
                fontSize: '14px',
                backgroundColor: '#F7FAFC',
                color: '#2D3748',
                transition: 'all 0.3s ease',
              }}
              onMouseDown={(e) => {
                e.target.style.borderColor = '#4A90E2';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(74,144,226,0.2)';
              }}
              onMouseUp={(e) => {
                e.target.style.borderColor = '#D1D5E0';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)';
              }}
              aria-label="Sélectionner la date de début"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5E0',
                fontSize: '14px',
                backgroundColor: '#F7FAFC',
                color: '#2D3748',
                transition: 'all 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4A90E2';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(74,144,226,0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5E0';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)';
              }}
              aria-label="Sélectionner la date de fin"
            />
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setNameFilter('');
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #D1D5E0',
                background: 'transparent',
                color: '#4A5568',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#EDF2F7';
                e.target.style.borderColor = '#A0AEC0';
                e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = '#D1D5E0';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              }}
              aria-label="Réinitialiser les filtres"
            >
              Réinitialiser
            </button>
            <button
              onClick={handleViewCode}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#4A90E2',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(74,144,226,0.2)',
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#357ABD';
                e.target.style.boxShadow = '0 4px 6px rgba(74,144,226,0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#4A90E2';
                e.target.style.boxShadow = '0 2px 4px rgba(74,144,226,0.2)';
              }}
              aria-label="Visualiser le code"
            >
              Visualiser Code
            </button>
          </div>
        </div>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          message={errorMessage || successMessage}
          action={
            <IconButton size="small" aria-label="fermer" color="inherit" onClick={handleCloseSnackbar}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
          sx={{
            '& .MuiSnackbarContent-root': {
              backgroundColor: errorMessage ? '#FED7D7' : '#C6F6D5',
              color: errorMessage ? '#822727' : '#22543D',
              fontSize: '15px',
              fontWeight: '500',
              borderRadius: '10px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            },
          }}
        />

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <div
              style={{
                border: '6px solid #EDF2F7',
                borderTop: '6px solid #4A90E2',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        )}

        {!loading && (
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0',
              backgroundColor: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              fontSize: '14px',
            }}
            role="grid"
            aria-label="Tableau des employés"
          >
            <thead style={{ backgroundColor: '#F7FAFC' }}>
              <tr>
                <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '15px' }}></th>
                <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '15px' }}>Employé</th>
                <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '15px' }}>Email</th>
                <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '15px' }}>Poste</th>
                <th style={{ padding: '18px 24px', textAlign: 'left', fontWeight: '600', color: '#2D3748', fontSize: '15px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#718096', fontSize: '15px', backgroundColor: '#F7FAFC' }}>
                    Aucun employé disponible
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee, index) => (
                  <React.Fragment key={employee._id}>
                    <tr
                      style={{
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F7FAFC',
                        transition: 'background-color 0.3s ease',
                        borderBottom: '1px solid #E5E7EB',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDF2F7')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#FFFFFF' : '#F7FAFC')}
                    >
                      <td style={{ padding: '18px 24px' }}>
                        <button
                          onClick={() => toggleRow(employee._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '20px',
                            color: '#2D3748',
                            fontWeight: '600',
                            transition: 'transform 0.2s',
                          }}
                          onMouseOver={(e) => (e.target.style.transform = 'scale(1.1)')}
                          onMouseOut={(e) => (e.target.style.transform = 'scale(1)')}
                          aria-label={expandedRows[employee._id] ? 'Réduire les détails de l\'employé' : 'Afficher les détails de l\'employé'}
                        >
                          {expandedRows[employee._id] ? '−' : '+'}
                        </button>
                      </td>
                      <td style={{ padding: '18px 24px', fontWeight: '600', color: '#2D3748', fontSize: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: '#EDF2F7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              fontWeight: '600',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              color: '#2D3748',
                            }}
                          >
                            {employee.nom?.charAt(0).toUpperCase() || '-'}
                          </div>
                          {employee.nom || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '18px 24px', color: '#718096', fontSize: '15px' }}>{employee.email || '-'}</td>
                      <td style={{ padding: '18px 24px', color: '#718096', fontSize: '15px' }}>{getLatestPoste(employee.contrats)}</td>
                      <td style={{ padding: '18px 24px' }}></td>
                    </tr>

                    {expandedRows[employee._id] && (
                      <tr>
                        <td colSpan={5} style={{ padding: '0', backgroundColor: '#F7FAFC' }}>
                          <div style={{ margin: '0 32px' }}>
                            <h3 style={{ margin: '0 0 20px', color: '#1A202C', fontSize: '18px', fontWeight: '700' }}>Contrats</h3>
                            {Array.isArray(employee.contrats) && employee.contrats.length > 0 ? (
                              employee.contrats.map((contrat) => renderContractDetails(employee, contrat))
                            ) : (
                              <p style={{ color: '#718096', fontSize: '14px' }}>Aucun contrat disponible</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        )}
        <style>{`
          .justificatif-link {
            color: #4A90E2;
            text-decoration: none;
            font-size: 14px;
          }
          .justificatif-link:hover {
            text-decoration: underline;
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
};

export default PointageEmployes;