import { useEffect, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  Grid,
  Snackbar,
  Alert,
  Button,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { styled } from "@mui/system";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArticleIcon from "@mui/icons-material/Article";
import AssignmentIcon from "@mui/icons-material/Assignment";
import WorkIcon from "@mui/icons-material/Work";
import EventIcon from "@mui/icons-material/Event";
import DescriptionIcon from "@mui/icons-material/Description";
import LockClockIcon from "@mui/icons-material/LockClock";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import PublishIcon from "@mui/icons-material/Publish";
import SignaturePad from "react-signature-canvas";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Fonctions utilitaires
const formatDate = (dateString) => {
  if (!dateString) return "Non spécifié";
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Date invalide"
      : date.toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  } catch {
    return "Date invalide";
  }
};

const isValidDataURL = (dataURL) => {
  const isValid =
    typeof dataURL === "string" &&
    dataURL.startsWith("data:image/png;base64,") &&
    dataURL.length > 100;
  if (!isValid) {
    console.error("Invalid signature data URL:", dataURL?.substring(0, 50) || "null");
  }
  return isValid;
};

const isValidPDFDataURL = (dataURL) => {
  const isValid =
    typeof dataURL === "string" &&
    dataURL.startsWith("data:application/pdf;base64,") &&
    dataURL.length > 100;
  if (!isValid) {
    console.error("Invalid PDF data URL:", {
      dataURL: dataURL?.substring(0, 50) || "null",
      startsWith: dataURL?.startsWith("data:application/pdf;base64,"),
      length: dataURL?.length,
    });
  }
  return isValid;
};

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: "12px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  },
}));

const InfoSection = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
  borderRadius: "8px",
  border: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(2),
}));

const ContratDetails = () => {
  const { contratId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userType, setUserType] = useState(null);
  const [contrat, setContrat] = useState(null);
  const [signatureStatus, setSignatureStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [expanded, setExpanded] = useState({
    infoContrat: true,
    detailsPoste: true,
    conditionsTravail: true,
    articles: false,
    avenants: false,
  });
  const [openSignDialog, setOpenSignDialog] = useState(false);
  const sigPadRef = useRef(null);

  const validSeverities = new Set(["success", "error", "warning", "info"]);

  // Snackbar
  const showSnackbar = (message, severity = "success") => {
    const validatedSeverity = validSeverities.has(severity) ? severity : "success";
    setSnackbar({ open: true, message, severity: validatedSeverity });
  };
  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  // Accordion
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded((prev) => ({ ...prev, [panel]: isExpanded }));
  };

  // Verrouillage après 1h
  const isActionLocked = (createdAt) => {
    if (!createdAt) return false;
    const now = new Date();
    const createdDate = new Date(createdAt);
    const diffHours = (now - createdDate) / (1000 * 60 * 60);
    return diffHours > 1;
  };

  const hasUserSigned = () => {
    return user && contrat && user._id && signatureStatus?.hasSigned;
  };

  const getSignatureStatusMessage = () => {
    if (!signatureStatus || !contrat || !userType || contrat.etat === "signé") return null;
    const { hasSigned, signedRoles, pendingRoles } = signatureStatus;
    if (hasSigned) {
      return pendingRoles.length > 0
        ? `Vous avez signé. En attente de la signature de : ${pendingRoles.join(" et ")}.`
        : "Vous avez signé. Toutes les signatures sont complètes.";
    }
    const message = signedRoles.length > 0 ? [`Signé par : ${signedRoles.join(", ")}.`] : [];
    message.push("Votre signature est requise.");
    return message.join(" ");
  };

  // Récupération utilisateur
  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentification requise");
    try {
      const response = await axios.get("http://localhost:5000/api/utilisateur/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;
      setUser(userData);
      if (userData?.profils && Array.isArray(userData.profils)) {
        const isAdminFlag = userData.profils.some((p) => p.name === "Admin");
        setIsAdmin(isAdminFlag);
        setUserType(
          isAdminFlag
            ? "Admin"
            : userData.profils.some((p) => p.name === "Entreprise")
            ? "Entreprise"
            : userData.profils.some((p) => p.name === "Candidat")
            ? "Candidat"
            : null
        );
      } else {
        setIsAdmin(false);
        setUserType(null);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de l'utilisateur:", err.message);
      throw new Error("Impossible de récupérer les informations de l'utilisateur");
    }
  }, []);

  // Récupération détails contrat
  const fetchContratDetails = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !isValidObjectId(contratId))
      throw new Error(!token ? "Authentification requise" : "ID de contrat invalide");
    try {
      const response = await axios.get(`http://localhost:5000/api/contrats/${contratId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      if (!response?.data?.success) throw new Error(response.data?.message || "Format de réponse invalide");
      const data = response.data.data;
      setContrat({
        ...data,
        titre: data.titre || "Contrat sans titre",
        articles: Array.isArray(data.articles) ? data.articles : [],
        avenants: Array.isArray(data.avenants) ? data.avenants : [],
        etat: data.etat || "non signé",
        typeContrat: data.typeContrat || "Non spécifié",
        dateDebut: data.dateDebut || null,
        dateFin: data.dateFin || null,
        intitulePoste: data.intitulePoste || "Non spécifié",
        tempsTravail: data.tempsTravail || "Non spécifié",
        salaire: data.salaire || "Non spécifié",
        modalitesPaiement: data.modalitesPaiement || "Non spécifié",
        entreprise: data.entreprise || { nomEntreprise: "Non spécifié", adresseEntreprise: "Non spécifié" },
        user: data.user || { nom: "Non spécifié" },
        signatureAdmin: data.signatureAdmin || null,
        signatureEntreprise: data.signatureEntreprise || null,
        signatureCandidat: data.signatureCandidat || null,
        createdBy: data.createdBy || "Non spécifié",
        lastModifiedBy: data.lastModifiedBy || "Non spécifié",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
        published: data.published || false,
      });
    } catch (err) {
      console.error("Erreur lors de la récupération du contrat:", err.message);
      throw new Error(err.response?.data?.message || "Erreur lors du chargement du contrat");
    }
  }, [contratId]);

  // Récupération état signatures
  const fetchSignatureStatus = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentification requise pour l'état des signatures");
    try {
      const response = await axios.get(`http://localhost:5000/api/contrats/${contratId}/signature-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response?.data?.success) throw new Error(response.data?.message || "Format de réponse invalide");
      setSignatureStatus(response.data.data);
    } catch (err) {
      console.error("Erreur lors de la récupération de l'état des signatures:", err.message);
      throw new Error("Impossible de récupérer l'état des signatures");
    }
  }, [contratId]);

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchUser();
        await Promise.all([fetchContratDetails(), fetchSignatureStatus()]);
      } catch (err) {
        setError(err.message || "Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchUser, fetchContratDetails, fetchSignatureStatus]);

  // Dialog signer
  const handleOpenSignDialog = () => {
    if (!contrat) {
      showSnackbar("Le contrat n'est pas chargé", "error");
      return;
    }
    if (!isAdmin && !contrat.published) {
      showSnackbar("Ce contrat n'est pas publié. Un administrateur doit le publier avant signature.", "warning");
      return;
    }
    setOpenSignDialog(true);
  };
  const handleCloseSignDialog = () => {
    if (sigPadRef.current) sigPadRef.current.clear();
    setOpenSignDialog(false);
  };

  // Générer PDF
  const generatePDF = (tempContrat = contrat) => {
    if (!tempContrat) {
      showSnackbar("Le contrat n'est pas chargé", "error");
      return null;
    }
    try {
      const contratWithDefaults = {
        ...tempContrat,
        entreprise: tempContrat.entreprise || { nomEntreprise: "Inconnu", adresseEntreprise: "Inconnu" },
        user: tempContrat.user || { nom: "Inconnu" },
        titre: tempContrat.titre || "Contrat sans titre",
        typeContrat: tempContrat.typeContrat || "Non spécifié",
        dateDebut: tempContrat.dateDebut || new Date().toISOString(),
        dateFin: tempContrat.dateFin || null,
        intitulePoste: tempContrat.intitulePoste || "Non spécifié",
        tempsTravail: tempContrat.tempsTravail || "Non spécifié",
        salaire: tempContrat.salaire || "Non spécifié",
        modalitesPaiement: tempContrat.modalitesPaiement || "Non spécifié",
        articles: Array.isArray(tempContrat.articles) ? tempContrat.articles : [],
        avenants: Array.isArray(tempContrat.avenants) ? tempContrat.avenants : [],
        signatureAdmin: tempContrat.signatureAdmin || null,
        signatureEntreprise: tempContrat.signatureEntreprise || null,
        signatureCandidat: tempContrat.signatureCandidat || null,
      };

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100);
        doc.text(`${contratWithDefaults.entreprise.nomEntreprise} - Contrat`, margin, y);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        y += 5;
      };

      const addFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${doc.internal.getNumberOfPages()} | Généré le ${formatDate(new Date())}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      };

      addHeader();
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      checkPageOverflow(20);
      doc.text("CONTRAT DE TRAVAIL", pageWidth / 2, y, { align: "center" });
      y += 15;

      // Infos générales
      checkPageOverflow(40);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Entre ${contratWithDefaults.entreprise.nomEntreprise} et ${contratWithDefaults.user.nom}`,
        margin,
        y
      );
      y += 10;
      doc.text(`Type: ${contratWithDefaults.typeContrat}`, margin, y);
      y += 7;
      doc.text(
        `Période: Du ${formatDate(contratWithDefaults.dateDebut)} au ${formatDate(contratWithDefaults.dateFin) || "Non spécifié"}`,
        margin,
        y
      );
      y += 7;
      doc.text(`Poste: ${contratWithDefaults.intitulePoste}`, margin, y);
      y += 15;

      // Conditions de travail
      checkPageOverflow(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Conditions de travail", margin, y);
      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      autoTable(doc, {
        startY: y,
        head: [["Critère", "Détail"]],
        body: [
          ["Temps de travail", contratWithDefaults.tempsTravail],
          ["Salaire", contratWithDefaults.salaire],
          ["Modalités de paiement", contratWithDefaults.modalitesPaiement],
        ],
        theme: "striped",
        styles: { fontSize: 10, cellPadding: 2, font: "helvetica" },
        headStyles: { fillColor: [60, 141, 188], textColor: 255, fontStyle: "bold" },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 10;

      // Articles
      if (contratWithDefaults.articles.length > 0) {
        checkPageOverflow(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Articles", margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        contratWithDefaults.articles.forEach((article, index) => {
          checkPageOverflow(50);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text(`Article ${index + 1}`, margin, y);
          y += 7;

          const articleBody = [
            ["Titre", article.titreArticle || "Sans titre"],
            ["Description", article.description || "Pas de description"],
          ];

          autoTable(doc, {
            startY: y,
            head: [["Champ", "Détail"]],
            body: articleBody,
            theme: "striped",
            styles: { fontSize: 10, cellPadding: 2, font: "helvetica" },
            headStyles: { fillColor: [60, 141, 188], textColor: 255, fontStyle: "bold" },
            margin: { left: margin, right: margin },
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: pageWidth - 2 * margin - 40 } },
          });
          y = doc.lastAutoTable.finalY + 10;
        });
      }

      // Avenants
      if (contratWithDefaults.avenants.length > 0) {
        checkPageOverflow(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Avenants", margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        contratWithDefaults.avenants.forEach((avenant, index) => {
          checkPageOverflow(50);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text(`Avenant ${index + 1}`, margin, y);
          y += 7;

          const avenantBody = [
            ["Titre", avenant.titre || "Sans titre"],
            ["Date effet", formatDate(avenant.dateEffet) || "Non spécifié"],
            ["Description", avenant.description || "Pas de description"],
          ];

          autoTable(doc, {
            startY: y,
            head: [["Champ", "Détail"]],
            body: avenantBody,
            theme: "striped",
            styles: { fontSize: 10, cellPadding: 2, font: "helvetica" },
            headStyles: { fillColor: [60, 141, 188], textColor: 255, fontStyle: "bold" },
            margin: { left: margin, right: margin },
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: pageWidth - 2 * margin - 40 } },
          });
          y = doc.lastAutoTable.finalY + 10;
        });
      }

      // Signatures
      checkPageOverflow(120);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Signatures", margin, y);
      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      const signatureWidth = 50;
      const signatureHeight = 25;
      const signatureSlots = [
        { signature: contrat.signatureAdmin?.signature, role: "Administrateur", date: contrat.signatureAdmin?.date },
        { signature: contrat.signatureEntreprise?.signature, role: "Entreprise", date: contrat.signatureEntreprise?.date },
        { signature: contrat.signatureCandidat?.signature, role: "Candidat", date: contrat.signatureCandidat?.date },
      ];

      let hasSignatures = false;

      signatureSlots.forEach((slot) => {
        checkPageOverflow(50);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Signature ${slot.role}`, margin, y);
        y += 5;
        if (slot.signature && isValidDataURL(slot.signature) && slot.date) {
          hasSignatures = true;
          doc.addImage(slot.signature, "PNG", margin, y, signatureWidth, signatureHeight);
          doc.rect(margin, y + signatureHeight, signatureWidth, 0.5);
          y += signatureHeight + 5;
          doc.text(`Signé le: ${formatDate(slot.date)}`, margin, y);
        } else {
          doc.setTextColor(150);
          doc.text(`Non signé`, margin, y + signatureHeight / 2);
          doc.setTextColor(0);
          y += signatureHeight;
        }
        y += 15;
      });

      if (!hasSignatures) {
        checkPageOverflow(20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text("Aucune signature disponible.", margin, y);
        y += 10;
      }

      addFooter();
      const pdfBase64 = doc.output("datauristring");
      if (!pdfBase64) throw new Error("Échec de la génération du PDF");

      let pdfDataUrl = pdfBase64;
      if (!pdfDataUrl.startsWith("data:application/pdf;base64,")) {
        const base64Match = pdfDataUrl.match(/base64,(.+)/);
        if (base64Match && base64Match[1]) {
          pdfDataUrl = `data:application/pdf;base64,${base64Match[1]}`;
        } else {
          throw new Error("Format de data URL invalide");
        }
      }

      if (!isValidPDFDataURL(pdfDataUrl)) {
        console.error("Generated PDF data URL failed validation:", {
          dataURL: pdfDataUrl.substring(0, 50),
          length: pdfDataUrl.length,
        });
        throw new Error("PDF généré invalide");
      }

      return pdfDataUrl;
    } catch (err) {
      console.error("Erreur lors de la génération du PDF:", err.message);
      showSnackbar("Erreur lors de la génération du PDF", "error");
      return null;
    }
  };

  // Mise à jour du PDF
  const updatePDF = async () => {
    const token = localStorage.getItem("token");
    if (!token || !contrat || !contrat.published) {
      showSnackbar(
        !token ? "Authentification requise" : !contrat ? "Contrat non chargé" : "Contrat non publié",
        "error"
      );
      return;
    }
    try {
      const pdfDataUrl = generatePDF();
      if (!pdfDataUrl) {
        showSnackbar("Échec de la génération du PDF", "error");
        return;
      }
      await axios.put(`http://localhost:5000/api/contrats/${contratId}/update-pdf`, { pdfData: pdfDataUrl }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSnackbar("PDF mis à jour", "success");
      await fetchContratDetails();
    } catch (err) {
      console.error("Erreur lors de la mise à jour du PDF:", err.message);
      showSnackbar(err.response?.data?.message || "Erreur lors de la mise à jour du PDF", "error");
    }
  };

  // Ajout / suppression d'items
  const handleItemChange = async (endpoint, action, itemId, itemData) => {
    const token = localStorage.getItem("token");
    if (!token || !contrat) {
      showSnackbar(!token ? "Authentification requise" : "Contrat non chargé", "error");
      return;
    }
    try {
      if (action === "add") {
        const url =
          endpoint === "articles"
            ? `http://localhost:5000/api/articles`
            : `http://localhost:5000/api/contrats/${contratId}/${endpoint}`;
        const data = endpoint === "articles" ? { ...itemData, contrat: contratId } : itemData;
        await axios.post(url, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showSnackbar(`${endpoint.slice(0, -1)} ajouté`, "success");
        await fetchContratDetails();
        if (contrat.published) await updatePDF();
      } else if (action === "delete") {
        const item = contrat[endpoint]?.find((item) => item._id === itemId);
        if (!item) {
          showSnackbar("Élément non trouvé", "error");
          return;
        }
        if (isActionLocked(item.createdAt)) {
          showSnackbar("Action verrouillée après 1 heure", "warning");
          return;
        }
        if (!window.confirm(`Supprimer cet ${endpoint.slice(0, -1)} ?`)) return;
        await axios.delete(`http://localhost:5000/api/${endpoint}/${itemId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showSnackbar(`${endpoint.slice(0, -1)} supprimé`, "success");
        await fetchContratDetails();
        if (contrat.published) await updatePDF();
      }
    } catch (err) {
      console.error(`Erreur lors de ${action} de ${endpoint}:`, err.message);
      showSnackbar(err.response?.data?.message || `Erreur lors de ${action} de ${endpoint}`, "error");
    }
  };

  // Signer le contrat
  const handleSignContrat = async (signatureDataUrl) => {
    const token = localStorage.getItem("token");
    if (!token || !contratId || !userType || !contrat) {
      showSnackbar(
        !token
          ? "Authentification requise"
          : !contratId
          ? "ID du contrat manquant"
          : !userType
          ? "Rôle utilisateur non défini"
          : "Contrat non chargé",
        "error"
      );
      return;
    }
    try {
      const updatedContrat = {
        ...contrat,
        [`signature${userType}`]: {
          signature: signatureDataUrl,
          date: new Date().toISOString(),
        },
      };
      const pdfDataUrl = generatePDF(updatedContrat);
      if (!pdfDataUrl) {
        showSnackbar("Échec de la génération du PDF", "error");
        return;
      }
      await axios.post(
        `http://localhost:5000/api/contrats/${contratId}/signature`,
        {
          signature: signatureDataUrl,
          role: userType.toLowerCase(),
          pdfData: pdfDataUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContrat(updatedContrat);
      await Promise.all([fetchContratDetails(), fetchSignatureStatus()]);
      showSnackbar("Signature enregistrée", "success");
    } catch (err) {
      console.error("Erreur lors de la signature:", err.message);
      showSnackbar(
        err.response?.data?.message || "Erreur lors de l'enregistrement de la signature",
        "error"
      );
    }
  };

  // Sauvegarder signature
  const handleSaveSignature = () => {
    if (!sigPadRef.current) {
      showSnackbar("Canvas de signature non disponible", "error");
      return;
    }
    if (sigPadRef.current.isEmpty()) {
      showSnackbar("Veuillez dessiner une signature", "warning");
      return;
    }
    const signatureDataUrl = sigPadRef.current.toDataURL("image/png");
    if (!isValidDataURL(signatureDataUrl)) {
      showSnackbar("Signature invalide", "error");
      return;
    }
    handleSignContrat(signatureDataUrl);
    setOpenSignDialog(false);
    sigPadRef.current.clear();
  };

  // Publier le contrat
  const handlePublishContrat = async () => {
    const token = localStorage.getItem("token");
    if (!token || !contrat || !isValidObjectId(contratId)) {
      showSnackbar(
        !token ? "Authentification requise" : !contrat ? "Contrat non chargé" : "ID de contrat invalide",
        "error"
      );
      return;
    }
    if (contrat.published) {
      showSnackbar("Contrat déjà publié", "warning");
      return;
    }
    try {
      const pdfDataUrl = generatePDF();
      if (!pdfDataUrl) {
        showSnackbar("Échec de la génération du PDF", "error");
        return;
      }
      await axios.put(`http://localhost:5000/api/contrats/${contratId}/publier`, { pdfData: pdfDataUrl }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSnackbar("Contrat publié", "success");
      await fetchContratDetails();
    } catch (err) {
      console.error("Erreur lors de la publication:", err.message);
      showSnackbar(err.response?.data?.message || "Erreur lors de la publication", "error");
    }
  };

  // Supprimer un item
  const handleDeleteItem = (endpoint, id, createdAt) => {
    handleItemChange(endpoint, "delete", id, null);
  };

  // Modifier un item
  const handleEditClick = (id, createdAt, type) => {
    if (isActionLocked(createdAt)) {
      showSnackbar(`Modification verrouillée après 1 heure`, "warning");
      return;
    }
    const validTypes = ["article", "avenant"];
    if (!validTypes.includes(type) || !isValidObjectId(id)) {
      showSnackbar("Type ou ID invalide", "error");
      return;
    }
    navigate(`/modifier-${type}/${id}`);
  };

  // Retour
  const handleBackRedirect = () => {
    const routes = {
      Admin: "/contrats",
      Entreprise: "/contrat_entreprise",
      Candidat: "/contrat_candidat",
    };
    navigate(routes[userType] || "/contrats");
  };

  // Affichage
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error || !contrat) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Alert severity="error" sx={{ width: "90%", maxWidth: "600px" }}>
          {error || "Contrat non trouvé"}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackRedirect}
          aria-label="Retour"
        >
          Retour
        </Button>
      </Box>
    );
  }

  const isContratSigned = contrat.etat === "signé";
  const signatureStatusMessage = getSignatureStatusMessage();
  const canPublish = isAdmin && !contrat.published && !isContratSigned;

  const signatureChips = [
    {
      signature: contrat.signatureAdmin,
      icon: <AdminPanelSettingsIcon />,
      label: "Admin",
      color: "primary",
    },
    {
      signature: contrat.signatureEntreprise,
      icon: <BusinessIcon />,
      label: "Entreprise",
      color: "secondary",
    },
    {
      signature: contrat.signatureCandidat,
      icon: <PersonIcon />,
      label: "Candidat",
      color: "success",
    },
  ].filter((chip) => chip.signature?.signature && chip.signature?.date);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Bouton retour */}
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackRedirect}
            variant="outlined"
            color="primary"
            aria-label="Retour"
          >
            Retour
          </Button>
        </Box>

        {/* Card principal */}
        <StyledCard>
          <CardContent>
            {/* En-tête */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography variant="h3" sx={{ fontWeight: 700, color: "primary.main" }}>
                {contrat.titre}
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {/* Bouton signer */}
                {!hasUserSigned() && !isContratSigned && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<HowToRegIcon />}
                    onClick={handleOpenSignDialog}
                    sx={{ borderRadius: "8px" }}
                    aria-label="Signer"
                  >
                    Signer
                  </Button>
                )}
                {/* Signé */}
                {isContratSigned && (
                  <Chip icon={<HowToRegIcon />} label="Signé" color="success" sx={{ height: "40px" }} />
                )}
                {/* Publier */}
                {canPublish && (
                  <Tooltip title="Publier le contrat">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PublishIcon />}
                      onClick={handlePublishContrat}
                      sx={{ borderRadius: "8px" }}
                      aria-label="Publier"
                    >
                      Publier
                    </Button>
                  </Tooltip>
                )}
                {/* Republier */}
                {isAdmin && contrat.published && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PublishIcon />}
                    onClick={updatePDF}
                    sx={{ borderRadius: "8px" }}
                    aria-label="Republier"
                  >
                    Republier
                  </Button>
                )}
                {/* Badge publié */}
                {contrat.published && (
                  <Chip
                    icon={<PublishIcon />}
                    label="Publié"
                    color="primary"
                    sx={{ height: "40px" }}
                  />
                )}
              </Box>
            </Box>

            {/* Infos rapides */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
              <Chip
                icon={<WorkIcon />}
                label={`Type: ${contrat.typeContrat}`}
                variant="outlined"
                color="primary"
              />
              <Chip icon={<EventIcon />} label={`Début: ${formatDate(contrat.dateDebut)}`} />
              <Chip icon={<EventIcon />} label={`Fin: ${formatDate(contrat.dateFin)}`} />
              {isContratSigned && contrat.dateSignature && (
                <Chip
                  icon={<HowToRegIcon />}
                  label={`Signé le: ${formatDate(contrat.dateSignature)}`}
                  color="success"
                />
              )}
            </Box>

            {/* Signatures */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
              {signatureChips.map((chip, index) => (
                <Chip
                  key={index}
                  icon={chip.icon}
                  label={`${chip.label}: ${formatDate(chip.signature.date)}`}
                  color={chip.color}
                  variant="outlined"
                />
              ))}
            </Box>

            {/* Message statut signature */}
            {signatureStatusMessage && (
              <Alert severity={hasUserSigned() ? "info" : "warning"} sx={{ mb: 3 }}>
                {signatureStatusMessage}
              </Alert>
            )}

            {/* Accords */}
            {/* Informations du contrat */}
            <Accordion
              expanded={expanded.infoContrat}
              onChange={handleAccordionChange("infoContrat")}
              elevation={0}
              sx={{ mb: 2 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="info-contrat-content"
                id="info-contrat-header"
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <AssignmentIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Informations du contrat
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {/* Entreprise */}
                  <Grid item xs={12} md={6}>
                    <InfoSection>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: "primary.main" }}>
                        Entreprise
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Nom"
                            secondary={contrat.entreprise?.nomEntreprise || "Non spécifié"}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Adresse"
                            secondary={contrat.entreprise?.adresseEntreprise || "Non spécifié"}
                          />
                        </ListItem>
                      </List>
                    </InfoSection>
                  </Grid>
                  {/* Employé */}
                  <Grid item xs={12} md={6}>
                    <InfoSection>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: "primary.main" }}>
                        Employé
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="Nom" secondary={contrat.user?.nom || "Non spécifié"} />
                        </ListItem>
                      </List>
                    </InfoSection>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Détails du poste */}
            <Accordion
              expanded={expanded.detailsPoste}
              onChange={handleAccordionChange("detailsPoste")}
              elevation={0}
              sx={{ mb: 2 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="details-poste-content"
                id="details-poste-header"
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <WorkIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Détails du poste
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <InfoSection>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Intitulé du poste
                  </Typography>
                  <Typography>{contrat.intitulePoste || "Non spécifié"}</Typography>
                </InfoSection>
              </AccordionDetails>
            </Accordion>

            {/* Conditions de travail */}
            <Accordion
              expanded={expanded.conditionsTravail}
              onChange={handleAccordionChange("conditionsTravail")}
              elevation={0}
              sx={{ mb: 2 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="conditions-travail-content"
                id="conditions-travail-header"
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <EventIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Conditions de travail
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <InfoSection>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Temps de travail
                      </Typography>
                      <Typography>{contrat.tempsTravail || "Non spécifié"}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Salaire
                      </Typography>
                      <Typography>{contrat.salaire || "Non spécifié"}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Modalités de paiement
                      </Typography>
                      <Typography>{contrat.modalitesPaiement || "Non spécifié"}</Typography>
                    </Grid>
                  </Grid>
                </InfoSection>
              </AccordionDetails>
            </Accordion>

            {/* Articles */}
            <Accordion
              expanded={expanded.articles}
              onChange={handleAccordionChange("articles")}
              elevation={0}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="articles-content"
                id="articles-header"
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ArticleIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Articles
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {isAdmin && (
                  <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate(`/ajouter-article/${contratId}`)}
                      aria-label="Ajouter article"
                    >
                      Ajouter article
                    </Button>
                  </Box>
                )}
                {contrat.articles?.length > 0 ? (
                  <Grid container spacing={3}>
                    {contrat.articles.map((article, index) => (
                      <Grid item xs={12} key={article._id || `article-${index}`}>
                        <StyledCard>
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Article {index + 1}: {article.titreArticle || "Sans titre"}
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                <Tooltip
                                  title={
                                    isActionLocked(article.createdAt)
                                      ? "Modification verrouillée"
                                      : "Modifier article"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleEditClick(article._id, article.createdAt, "article")}
                                      disabled={isActionLocked(article.createdAt)}
                                      aria-label="Modifier article"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                {isActionLocked(article.createdAt) && (
                                  <LockClockIcon color="warning" fontSize="small" />
                                )}
                                <Tooltip
                                  title={
                                    isActionLocked(article.createdAt)
                                      ? "Suppression verrouillée"
                                      : "Supprimer article"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteItem("articles", article._id, article.createdAt)}
                                      disabled={isActionLocked(article.createdAt)}
                                      aria-label="Supprimer article"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Box>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Typography sx={{ whiteSpace: "pre-line" }}>
                              {article.description || "Pas de description"}
                            </Typography>
                          </CardContent>
                        </StyledCard>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{ p: 3, textAlign: "center", backgroundColor: "background.default" }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      Aucun article.
                    </Typography>
                  </Paper>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Avenants */}
            <Accordion
              expanded={expanded.avenants}
              onChange={handleAccordionChange("avenants")}
              elevation={0}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="avenants-content"
                id="avenants-header"
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <DescriptionIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Avenants
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {isAdmin && (
                  <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate(`/ajouter-avenant/${contratId}`)}
                      aria-label="Ajouter avenant"
                    >
                      Ajouter avenant
                    </Button>
                  </Box>
                )}
                {contrat.avenants?.length > 0 ? (
                  <Grid container spacing={3}>
                    {contrat.avenants.map((avenant, index) => (
                      <Grid item xs={12} key={avenant._id || `avenant-${index}`}>
                        <StyledCard>
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Avenant {index + 1}: {avenant.titre || "Sans titre"}
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                <Tooltip
                                  title={
                                    isActionLocked(avenant.createdAt)
                                      ? "Modification verrouillée"
                                      : "Modifier avenant"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleEditClick(avenant._id, avenant.createdAt, "avenant")}
                                      disabled={isActionLocked(avenant.createdAt)}
                                      aria-label="Modifier avenant"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                {isActionLocked(avenant.createdAt) && (
                                  <LockClockIcon color="warning" fontSize="small" />
                                )}
                                <Tooltip
                                  title={
                                    isActionLocked(avenant.createdAt)
                                      ? "Suppression verrouillée"
                                      : "Supprimer avenant"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteItem("avenants", avenant._id, avenant.createdAt)}
                                      disabled={isActionLocked(avenant.createdAt)}
                                      aria-label="Supprimer avenant"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Box>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  Date effet
                                </Typography>
                                <Typography>{formatDate(avenant.dateEffet)}</Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  Description
                                </Typography>
                                <Typography sx={{ whiteSpace: "pre-line" }}>
                                  {avenant.description || "Pas de description"}
                                </Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </StyledCard>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{ p: 3, textAlign: "center", backgroundColor: "background.default" }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      Aucun avenant.
                    </Typography>
                  </Paper>
                )}
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </StyledCard>
      </Container>

      {/* Dialogue signature */}
      <Dialog open={openSignDialog} onClose={handleCloseSignDialog} maxWidth="md" fullWidth>
        <DialogTitle>Signer le contrat</DialogTitle>
        <DialogContent>
          <DialogContentText>Dessinez votre signature ci-dessous.</DialogContentText>
          <Box sx={{ border: "1px solid #ccc", p: 1, mt: 2, height: 200 }}>
            <SignaturePad
              ref={sigPadRef}
              canvasProps={{
                height: 180,
                style: { backgroundColor: "white", width: "100%" },
              }}
              penColor="black"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSignDialog} aria-label="Annuler">
            Annuler
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSignature}
            aria-label="Enregistrer"
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

ContratDetails.propTypes = {};

export default ContratDetails;