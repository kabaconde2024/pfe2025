import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Button,
  Typography,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  Grid,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

import axios from 'axios';
import DashboardLayout from 'examples/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'examples/Navbars/DashboardNavbar';

import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Description as DescriptionIcon,
  HowToReg as HowToRegIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

import { indigo, teal, grey, deepOrange } from '@mui/material/colors';
import SignaturePad from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

// Configuration de l'intercepteur Axios pour gérer les erreurs 401
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.warn('Erreur 401: Session expirée ou token invalide');
      return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter.'));
    }
    return Promise.reject(error);
  }
);

// Fonctions de formatage
const formatDate = (dateString) => {
  if (!dateString) return 'Non spécifié';
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? 'Date invalide'
      : date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'Date invalide';
  }
};

const formatDateShort = (dateString) => {
  if (!dateString) return 'Non spécifié';
  try {
    const date = new Date(dateString);
    return isNaN(date?.getTime())
      ? 'Date invalide'
      : date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  } catch {
    return 'Date invalide';
  }
};

const formatSalaire = (salaire) => {
  if (typeof salaire === 'string') {
    const montant = parseFloat(salaire);
    if (!isNaN(montant)) return `${montant} €`;
    return 'Salaire non spécifié';
  }
  if (salaire && typeof salaire === 'object') {
    if (salaire.montant && salaire.devise && salaire.periodicite)
      return `${salaire.montant} ${salaire.devise} par ${salaire.periodicite}`;
    return 'Données salaire non formatées';
  }
  return 'Non spécifié';
};

const isValidDataURL = (dataURL) => {
  const valid = typeof dataURL === 'string' && dataURL.startsWith('data:image/png;base64,') && dataURL.length > 100;
  if (!valid) console.error('Invalid signature data URL:', dataURL?.substring(0, 50) || 'null');
  return valid;
};

const isValidPDFDataURL = (dataURL) => {
  const valid = typeof dataURL === 'string' && dataURL.startsWith('data:application/pdf;base64,') && dataURL.length > 100;
  if (!valid) console.error('Invalid PDF data URL:', {
    dataURL: dataURL?.substring(0, 50) || 'null',
    startsWith: dataURL?.startsWith('data:application/pdf;base64,'),
    length: dataURL?.length,
  });
  return valid;
};

const ContratEntreprise = () => {
  const [contrats, setContrats] = useState([]);
  const [missionsByContrat, setMissionsByContrat] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterTitle, setFilterTitle] = useState('');
  const [openSignDialog, setOpenSignDialog] = useState(false);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [selectedContrat, setSelectedContrat] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [approbation, setApprobation] = useState(true);
  const sigPadRef = useRef(null);
  const navigate = useNavigate();

  // Fonction principale de chargement
  const fetchContratsAndMissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('Veuillez vous connecter.');
        navigate('/login');
        return;
      }

      console.log('Fetching contrats with token:', token.substring(0, 20) + '...');
      const contratsResponse = await axios.get(
        `http://localhost:5000/api/contrats/entreprise/publies?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      console.log('Réponse API contrats:', contratsResponse.data);
      const data = Array.isArray(contratsResponse.data?.data) ? contratsResponse.data.data : [];

      // Assouplir la validation des _id
      const validContrats = data
        .filter(c => c?._id && typeof c._id === 'string')
        .map(c => ({
          ...c,
          signatureAdmin: c.signatureAdmin?.signature && isValidDataURL(c.signatureAdmin.signature) ? c.signatureAdmin : null,
          signatureEntreprise: c.signatureEntreprise?.signature && isValidDataURL(c.signatureEntreprise.signature) ? c.signatureEntreprise : null,
          signatureCandidat: c.signatureCandidat?.signature && isValidDataURL(c.signatureCandidat.signature) ? c.signatureCandidat : null,
          approbationCandidat: c?.approbationCandidat || { approuve: null },
          approbationEntreprise: c?.approbationEntreprise || { approuve: null },
        }));

      console.log('Contrats filtrés:', validContrats);
      setContrats(validContrats);
      setTotal(Number(contratsResponse.data?.pagination?.total) || validContrats.length);

      const missionsData = {};
      for (const contrat of validContrats) {
        try {
          const missionsResponse = await axios.get(
            `http://localhost:5000/api/missions/contrat?contrat=${contrat._id}&page=1&limit=0`,
            { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
          );
          missionsData[contrat._id] = {
            missions: [],
            total: missionsResponse.data?.pagination?.total || 0,
          };
        } catch (err) {
          console.error(`Erreur missions pour contrat ${contrat._id}:`, err);
          missionsData[contrat._id] = { missions: [], total: 0 };
        }
      }
      setMissionsByContrat(missionsData);

      if (validContrats.length === 0) {
        setSuccessMessage('Aucun contrat publié. Créez-en un nouveau !');
      }
    } catch (err) {
      console.error('Erreur chargement:', err);
      setErrorMessage(err.message || 'Erreur lors du chargement des contrats.');
      setContrats([]);
      setMissionsByContrat({});
      if (err.message === 'Session expirée. Veuillez vous reconnecter.') {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContratsAndMissions();
  }, [page, limit]);

  const handleViewMissions = (contratId) => {
    if (!contratId || typeof contratId !== 'string') {
      setErrorMessage('ID contrat invalide');
      return;
    }
    navigate(`/ListMissions?contrat=${contratId}`);
  };

  const generatePDF = (contrat) => {
    try {
      const contratData = {
        ...contrat,
        entreprise: contrat.entreprise || { nomEntreprise: 'Non spécifié', adresse: 'Non spécifié' },
        user: contrat.user || { nom: 'Non spécifié' },
        titre: contrat.titre || 'Contrat sans titre',
        typeContrat: contrat.typeContrat || 'Non spécifié',
        dateDebut: contrat.dateDebut || new Date().toISOString(),
        dateFin: contrat.dateFin || null,
        intitulePoste: contrat.intitulePoste || 'Non spécifié',
        tempsTravail: contrat.tempsTravail || 'Non spécifié',
        salaire: contrat.salaire || { montant: null, devise: null, periodicite: null },
        modalitesPaiement: contrat.modalitesPaiement || 'Non spécifié',
        articles: Array.isArray(contrat.articles) ? contrat.articles : [],
        avenants: Array.isArray(contrat.avenants) ? contrat.avenants : [],
        missions: Array.isArray(contrat.missions) ? contrat.missions : [],
        signatureAdmin: contrat.signatureAdmin,
        signatureEntreprise: contrat.signatureEntreprise,
        signatureCandidat: contrat.signatureCandidat,
        etat: contrat.etat,
        approbationCandidat: contrat.approbationCandidat,
        approbationEntreprise: contrat.approbationEntreprise,
      };

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxY = pageHeight - margin;
      let y = margin;

      const checkPageOverflow = (requiredHeight) => {
        if (y + requiredHeight > maxY) {
          addFooter();
          doc.addPage();
          y = margin;
          addHeader();
        }
      };

      const addHeader = () => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text(`${contratData.entreprise.nomEntreprise} - Contrat`, margin, 10);
        doc.line(margin, 12, pageWidth - margin, 12);
        y = 15;
      };

      const addFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${doc.internal.getNumberOfPages()} | Généré le ${formatDate(new Date())}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      };

      addHeader();
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      checkPageOverflow(20);
      doc.text('CONTRAT DE TRAVAIL', pageWidth / 2, y, { align: 'center' });
      y += 15;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      checkPageOverflow(50);
      doc.text(`Entre ${contratData.entreprise.nomEntreprise} et ${contratData.user.nom}`, margin, y);
      y += 10;
      doc.text(`Type: ${contratData.typeContrat}`, margin, y);
      y += 7;
      doc.text(`Période: Du ${formatDate(contratData.dateDebut)} au ${formatDate(contratData.dateFin)}`, margin, y);
      y += 7;
      doc.text(`Poste: ${contratData.intitulePoste}`, margin, y);
      y += 7;
      doc.text(`État: ${contratData.etat}`, margin, y);
      y += 15;

      checkPageOverflow(50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Conditions de travail', margin, y);
      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Critère', 'Détail']],
        body: [
          ['Temps de travail', contratData.tempsTravail],
          ['Salaire', formatSalaire(contratData.salaire)],
          ['Modalités de paiement', contratData.modalitesPaiement],
        ],
        theme: 'striped',
        styles: { fontSize: 12, cellPadding: 2 },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 10;

      if (contratData.missions.length > 0) {
        checkPageOverflow(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Missions', margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        contratData.missions.forEach((mission, index) => {
          checkPageOverflow(40);
          doc.setFont('helvetica', 'bold');
          const title = mission.titre || 'Sans titre';
          doc.text(`Mission ${index + 1}: ${title}`, margin, y);
          y += 7;
          doc.setFont('helvetica', 'normal');
          const descLines = doc.splitTextToSize(mission.description || 'Pas de description', pageWidth - 2 * margin);
          checkPageOverflow(descLines.length * 7 + 10);
          doc.text(descLines, margin, y);
          y += descLines.length * 7 + 5;
          if (mission.statut) {
            doc.text(`Statut: ${mission.statut}`, margin, y);
            y += 7;
          }
        });
        y += 5;
      }

      if (contratData.articles.length > 0) {
        checkPageOverflow(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Articles', margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        contratData.articles.forEach((article, index) => {
          checkPageOverflow(40);
          doc.setFont('helvetica', 'bold');
          const titleArt = article.titreArticle || 'Sans titre';
          doc.text(`Article ${index + 1}: ${titleArt}`, margin, y);
          y += 7;
          doc.setFont('helvetica', 'normal');
          const descLines = doc.splitTextToSize(article.description || 'Pas de description', pageWidth - 2 * margin);
          checkPageOverflow(descLines.length * 7 + 10);
          doc.text(descLines, margin, y);
          y += descLines.length * 7 + 5;
        });
        y += 5;
      }

      if (contratData.avenants.length > 0) {
        checkPageOverflow(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Avenants', margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        contratData.avenants.forEach((avenant, index) => {
          checkPageOverflow(50);
          doc.setFont('helvetica', 'bold');
          const titleAvenant = avenant.titre || 'Avenant sans titre';
          doc.text(titleAvenant, margin, y);
          y += 7;
          doc.setFont('helvetica', 'normal');
          doc.text(`Date effet: ${formatDate(avenant.dateEffet)}`, margin, y);
          y += 7;
          const descLines = doc.splitTextToSize(avenant.description || 'Pas de description', pageWidth - 2 * margin);
          checkPageOverflow(descLines.length * 7 + 10);
          doc.text(descLines, margin, y);
          y += descLines.length * 7 + 5;
        });
        y += 5;
      }

      checkPageOverflow(100);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Signatures', margin, y);
      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      const signatures = [
        {
          signature: contrat.signatureAdmin?.signature,
          role: 'Admin',
          date: contrat.signatureAdmin?.date,
        },
        {
          signature: contrat.signatureEntreprise?.signature,
          role: 'Entreprise',
          date: contrat.signatureEntreprise?.date,
        },
        {
          signature: contrat.signatureCandidat?.signature,
          role: 'Candidat',
          date: contrat.signatureCandidat?.date,
        },
      ].filter((sig) => sig.signature && isValidDataURL(sig.signature));

      const signatureWidth = 50;
      const signatureHeight = 25;
      const signatureSpacing = 10;
      if (signatures.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text('Aucune signature.', margin, y);
        y += 10;
      } else {
        const totalWidth = signatures.length * signatureWidth + (signatures.length - 1) * signatureSpacing;
        const startX = (pageWidth - totalWidth) / 2;
        signatures.forEach((sig, index) => {
          const xPos = startX + index * (signatureWidth + signatureSpacing);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(12);
          doc.text(`Signature ${sig.role}:`, xPos, y);
          if (sig.signature && isValidDataURL(sig.signature)) {
            try {
              doc.addImage(sig.signature, 'PNG', xPos, y + 5, signatureWidth, signatureHeight);
              doc.rect(xPos, y + 5 + signatureHeight, signatureWidth, 0.5);
              doc.text(`Signé le: ${formatDate(sig.date)}`, xPos, y + 5 + signatureHeight + 5);
            } catch (err) {
              console.error('Erreur ajout signature:', err);
            }
          }
        });
        y += signatureHeight + 20;
      }

      addFooter();

      const pdfData = doc.output('datauristring');
      if (!pdfData) throw new Error('Échec de la génération PDF');

      let pdfDataUrl = pdfData;
      if (!pdfDataUrl.startsWith('data:application/pdf;base64,')) {
        const match = pdfData.match(/base64,(.+)/);
        if (match && match[1]) {
          pdfDataUrl = `data:application/pdf;base64,${match[1]}`;
        } else {
          throw new Error('Format de data URL invalide');
        }
      }
      if (!isValidPDFDataURL(pdfDataUrl)) throw new Error('PDF invalide');

      return pdfDataUrl;
    } catch (err) {
      console.error('Erreur generatePDF:', err);
      setErrorMessage('Erreur lors de la génération du PDF');
      return null;
    }
  };

  const handleViewContract = (contrat) => {
    try {
      if (!contrat) throw new Error('Contrat non défini');
      const pdfUrl = generatePDF(contrat);
      if (!pdfUrl) return;
      const base64 = pdfUrl.split('base64,')[1];
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      if (!newWindow) throw new Error('Veuillez autoriser les pop-ups');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error('Erreur ouverture PDF:', err);
      setErrorMessage('Impossible d\'ouvrir le PDF.');
    }
  };

  const handleOpenSignDialog = (contrat) => {
    if (!contrat) {
      setErrorMessage('Contrat non défini');
      return;
    }
    setSelectedContrat(contrat);
    setOpenSignDialog(true);
  };

  const handleCloseSignDialog = () => {
    if (sigPadRef.current) sigPadRef.current.clear();
    setOpenSignDialog(false);
    setSelectedContrat(null);
  };

  const handleSaveSignature = () => {
    try {
      if (!sigPadRef.current) throw new Error('Canvas non disponible');
      if (sigPadRef.current.isEmpty()) throw new Error('Dessinez votre signature');
      const signatureDataUrl = sigPadRef.current.toDataURL('image/png');
      if (!isValidDataURL(signatureDataUrl)) throw new Error('Signature invalide');
      handleSignContrat(signatureDataUrl);
      handleCloseSignDialog();
    } catch (err) {
      console.error('Erreur signature:', err);
      setErrorMessage(err.message || 'Erreur lors de la signature');
    }
  };

  const handleSignContrat = async (signatureDataUrl) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('Veuillez vous connecter.');
        navigate('/login');
        return;
      }
      if (!selectedContrat || !selectedContrat._id) throw new Error('ID contrat manquant');

      const updatedContrat = {
        ...selectedContrat,
        signatureEntreprise: { signature: signatureDataUrl, date: new Date().toISOString() },
      };

      const pdfUrl = generatePDF(updatedContrat);
      if (!pdfUrl) throw new Error('Échec de la génération PDF');

      await axios.post(
        `http://localhost:5000/api/contrats/${selectedContrat._id}/signature`,
        {
          signature: signatureDataUrl,
          role: 'entreprise',
          pdfData: pdfUrl,
          signaturePosition: { x: 50, y: 50, width: 150, height: 50, page: -1 },
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      setSuccessMessage('Signature enregistrée avec succès');
      await fetchContratsAndMissions();
    } catch (err) {
      console.error('Erreur signature:', err);
      setErrorMessage(err.message || 'Erreur lors de la signature');
    }
  };

  const handleOpenApproveDialog = (contrat) => {
    if (!contrat) {
      setErrorMessage('Contrat non défini');
      return;
    }
    setSelectedContrat(contrat);
    setOpenApproveDialog(true);
  };

  const handleCloseApproveDialog = () => {
    setOpenApproveDialog(false);
    setCommentaire('');
    setApprobation(true);
    setSelectedContrat(null);
  };

  const handleSubmitApprobation = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('Veuillez vous connecter.');
        navigate('/login');
        return;
      }
      if (!selectedContrat || !selectedContrat._id) throw new Error('ID contrat manquant');

      const endpoint = approbation
        ? `http://localhost:5000/api/contrats/${selectedContrat._id}/approbation-entreprise`
        : `http://localhost:5000/api/contrats/${selectedContrat._id}/rejet-entreprise`;

      const payload = approbation
        ? { approuve: true, commentaire }
        : { commentaire };

      await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      setSuccessMessage(`Contrat ${approbation ? 'approuvé' : 'rejeté'} avec succès`);
      await fetchContratsAndMissions();
      handleCloseApproveDialog();
    } catch (err) {
      console.error(`Erreur ${approbation ? 'approbation' : 'rejet'}:`, err);
      setErrorMessage(err.message || `Erreur lors de l'${approbation ? 'approbation' : 'rejet'}`);
    }
  };

  const canSign = (contrat) => {
    const isValidState = ['approuve', 'approuvé'].includes(contrat.etat);
    const hasCandidateApproval = contrat.approbationCandidat?.approuve === true;
    const hasEnterpriseApproval = contrat.approbationEntreprise?.approuve === true;
    const noSignatureEntreprise = !contrat.signatureEntreprise?.signature || !isValidDataURL(contrat.signatureEntreprise.signature);
    return isValidState && hasCandidateApproval && hasEnterpriseApproval && noSignatureEntreprise;
  };

  const canAddMission = (contrat) => {
    const now = new Date();
    const debut = contrat.dateDebut ? new Date(contrat.dateDebut) : null;
    return (contrat.etat === 'signe' || contrat.etat === 'signé') && (!debut || now >= debut);
  };

  const filteredContrats = contrats
    .filter(c => c.titre?.toLowerCase().includes(filterTitle.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 4, mt: 9 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: '8px',
            background: 'linear-gradient(to bottom, #f5f7fa, #e4e8f0)',
            minHeight: '80vh',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: indigo[700], display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon fontSize="large" />
                Liste des Contrats Publiés
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {total} contrat(s) au total
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Rechercher par titre..."
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ color: grey[500], mr: 1 }} /> }}
              sx={{ borderRadius: '8px', backgroundColor: 'white', '& fieldset': { borderColor: grey[300] } }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Lignes</InputLabel>
              <Select
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                label="Lignes"
                sx={{ height: '40px' }}
              >
                {[5, 10, 25].map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Snackbar
            open={!!successMessage}
            autoHideDuration={6000}
            onClose={() => setSuccessMessage('')}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert severity="success" sx={{ width: '100%' }}>
              {successMessage}
            </Alert>
          </Snackbar>
          <Snackbar
            open={!!errorMessage}
            autoHideDuration={6000}
            onClose={() => setErrorMessage('')}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert severity="error" sx={{ width: '100%' }}>
              {errorMessage}
            </Alert>
          </Snackbar>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <CircularProgress />
            </Box>
          ) : filteredContrats.length > 0 ? (
            <>
              <Grid container spacing={3}>
                {filteredContrats.map((contrat) => (
                  <Grid item xs={12} key={contrat._id}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 3,
                        borderRadius: '8px',
                        borderLeft: `4px solid ${
                          ['signe', 'signé'].includes(contrat.etat) ? teal[500] :
                          contrat.etat === 'rejete' ? deepOrange[500] :
                          indigo[600]
                        }`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: indigo[800],
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Avatar sx={{ bgcolor: indigo[100], color: indigo[600], width: 32, height: 32 }}>
                              <DescriptionIcon fontSize="small" />
                            </Avatar>
                            {contrat.titre || 'Contrat sans titre'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateShort(contrat.createdAt)}
                            <span
                              style={{
                                color:
                                  ['signe', 'signé'].includes(contrat.etat) ? teal[600] :
                                  contrat.etat === 'rejete' ? deepOrange[600] :
                                  indigo[600],
                                marginLeft: '10px',
                                fontWeight: 'bold',
                              }}
                            >
                              •{' '}
                              {['signe', 'signé'].includes(contrat.etat)
                                ? 'Signé'
                                : contrat.etat === 'rejete'
                                ? 'Rejeté'
                                : ['approuve', 'approuvé'].includes(contrat.etat)
                                ? 'Approuvé'
                                : contrat.etat === 'approuve_partiellement'
                                ? 'Approuvé partiellement'
                                : 'En attente d\'approbation'}
                            </span>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Tooltip title="Voir le contrat">
                            <IconButton
                              onClick={() => handleViewContract(contrat)}
                              sx={{
                                color: indigo[600],
                                backgroundColor: 'white',
                                '&:hover': { backgroundColor: indigo[100] },
                              }}
                              aria-label="Voir le contrat"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {contrat.etat !== 'signe' && contrat.etat !== 'signé' && contrat.etat !== 'approuve' && contrat.etat !== 'approuvé' && (
                            <Tooltip title="Approuver / Rejeter">
                              <Button
                                variant="contained"
                                startIcon={<HowToRegIcon />}
                                onClick={() => handleOpenApproveDialog(contrat)}
                                sx={{ borderRadius: '8px' }}
                              >
                                Approuver
                              </Button>
                            </Tooltip>
                          )}
                          {canSign(contrat) && (
                            <Tooltip title="Signer le contrat">
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<HowToRegIcon />}
                                onClick={() => handleOpenSignDialog(contrat)}
                                sx={{ borderRadius: '8px' }}
                              >
                                Signer
                              </Button>
                            </Tooltip>
                          )}
                          {canAddMission(contrat) && (
                            <Tooltip title="Voir missions">
                              <IconButton
                                onClick={() => handleViewMissions(contrat._id)}
                                sx={{ color: indigo[600], backgroundColor: 'white', '&:hover': { backgroundColor: indigo[100] } }}
                              >
                                <AssignmentIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2">
                            <strong>Entreprise :</strong> {contrat.entreprise?.nomEntreprise || 'Non spécifié'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2">
                            <strong>Employé :</strong> {contrat.user?.nom || 'Non spécifié'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2">
                            <strong>Type :</strong> {contrat.typeContrat?.toUpperCase() || 'Non spécifié'}
                          </Typography>
                        </Grid>
                      </Grid>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {contrat.approbationEntreprise?.approuve && (
                          <Chip icon={<BusinessIcon />} label={`Entreprise: Approuvé le ${formatDate(contrat.approbationEntreprise.date)}`} color="success" variant="outlined" />
                        )}
                        {contrat.approbationEntreprise?.approuve === false && (
                          <Chip icon={<BusinessIcon />} label={`Entreprise: Rejeté le ${formatDate(contrat.approbationEntreprise.date)}`} color="error" variant="outlined" />
                        )}
                        {contrat.signatureAdmin?.signature && isValidDataURL(contrat.signatureAdmin.signature) && (
                          <Chip icon={<AdminPanelSettingsIcon />} label={`Signé par Admin le: ${formatDate(contrat.signatureAdmin.date)}`} color="primary" variant="outlined" />
                        )}
                        {contrat.signatureEntreprise?.signature && isValidDataURL(contrat.signatureEntreprise.signature) && (
                          <Chip icon={<BusinessIcon />} label={`Signé par Entreprise le: ${formatDate(contrat.signatureEntreprise.date)}`} color="success" variant="outlined" />
                        )}
                        {contrat.signatureCandidat?.signature && isValidDataURL(contrat.signatureCandidat.signature) && (
                          <Chip icon={<PersonIcon />} label={`Signé par Candidat le: ${formatDate(contrat.signatureCandidat.date)}`} color="success" variant="outlined" />
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              {Math.ceil(total / limit) > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={Math.ceil(total / limit)}
                    page={page}
                    onChange={(e, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          ) : (
            <Typography align="center" variant="h6" color="text.secondary" sx={{ mt: 6 }}>
              Aucun contrat publié à afficher.
            </Typography>
          )}

          <Dialog
            open={openApproveDialog}
            onClose={handleCloseApproveDialog}
            maxWidth="sm"
            fullWidth
            aria-labelledby="approveDialog-title"
            aria-describedby="approveDialog-description"
          >
            <DialogTitle id="approveDialog-title">Approuver / Rejeter le contrat</DialogTitle>
            <DialogContent>
              <DialogContentText id="approveDialog-description">
                Veuillez indiquer votre décision. Vous pouvez ajouter un commentaire.
              </DialogContentText>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant={approbation ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => setApprobation(true)}
                >
                  Approuver
                </Button>
                <Button
                  variant={!approbation ? 'contained' : 'outlined'}
                  color="error"
                  onClick={() => setApprobation(false)}
                >
                  Rejeter
                </Button>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Commentaire (optionnel)"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                sx={{ mt: 2 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseApproveDialog} color="secondary">Annuler</Button>
              <Button onClick={handleSubmitApprobation} variant="contained" color="primary">Confirmer</Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={openSignDialog}
            onClose={handleCloseSignDialog}
            maxWidth="sm"
            fullWidth
            aria-labelledby="signDialog-title"
            aria-describedby="signDialog-description"
          >
            <DialogTitle id="signDialog-title">Signer le contrat</DialogTitle>
            <DialogContent>
              <DialogContentText id="signDialog-description">
                Dessinez votre signature ci-dessous, puis cliquez sur "Enregistrer".
              </DialogContentText>
              <Box sx={{ border: '1px solid #ccc', p: 2, mt: 2, height: 200 }}>
                <SignaturePad
                  ref={sigPadRef}
                  canvasProps={{
                    height: 180,
                    style: { width: '100%' },
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseSignDialog}>Annuler</Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => { if (sigPadRef.current) sigPadRef.current.clear(); }}
              >
                Effacer
              </Button>
              <Button onClick={handleSaveSignature} variant="contained" color="primary">
                Enregistrer
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Container>
    </DashboardLayout>
  );
};

export default ContratEntreprise;