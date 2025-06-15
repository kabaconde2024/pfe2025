import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Avatar,
  Chip,
} from "@mui/material";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  HowToReg as HowToRegIcon,
  AccessTime as AccessTimeIcon,
  Receipt as ReceiptIcon,
  Assignment as AssignmentIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { indigo, teal, grey, deepOrange } from "@mui/material/colors";
import SignaturePad from "react-signature-canvas";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Fonctions de formatage de date
const formatDate = (dateString) => {
  if (!dateString) return "Non spécifié";
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Date invalide"
      : date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "Date invalide";
  }
};

const formatDateShort = (dateString) => {
  if (!dateString) return "Non spécifié";
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Date invalide"
      : date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
  } catch {
    return "Date invalide";
  }
};

// Format salaire
const formatSalaire = (salaire) => {
  if (typeof salaire === "string") {
    const trimmedSalaire = salaire.trim();
    const montant = parseFloat(trimmedSalaire);
    if (!isNaN(montant)) {
      return `${montant} €`;
    }
    return "Non spécifié";
  }
  if (salaire && typeof salaire === "object") {
    if (salaire.montant && salaire.devise && salaire.periodicite) {
      return `${salaire.montant} ${salaire.devise} par ${salaire.periodicite}`;
    }
    return "Données salaire non formatées";
  }
  return "Non spécifié";
};

// Validation signature
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

// Validation PDF
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

const ContratCandidat = () => {
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [openSignDialog, setOpenSignDialog] = useState(false);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [selectedContrat, setSelectedContrat] = useState(null);
  const [filterTitle, setFilterTitle] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [approbation, setApprobation] = useState(true);
  const sigPadRef = useRef(null);
  const navigate = useNavigate();

  // Fonction pour récupérer les contrats
  const fetchContrats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentification requise");
      const response = await axios.get("http://localhost:5000/api/contrats/candidat/publies?_t=" + new Date().getTime(), {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      const data = response.data?.data || [];
      console.log("Données des contrats reçues :", data.map(c => ({ 
        _id: c._id, 
        etat: c.etat,
        titre: c.titre,
        approbationCandidat: c.approbationCandidat,
        approbationEntreprise: c.approbationEntreprise,
        signatureCandidat: c.signatureCandidat,
        signatureEntreprise: c.signatureEntreprise,
        signatureAdmin: c.signatureAdmin,
        createdAt: c.createdAt,
      })));
      const validContrats = data
        .filter(c => c?._id && /^[0-9a-fA-F]{24}$/.test(c._id))
        .map(c => ({
          ...c,
          signatureAdmin: c.signatureAdmin?.signature && isValidDataURL(c.signatureAdmin.signature) ? c.signatureAdmin : null,
          signatureEntreprise: c.signatureEntreprise?.signature && isValidDataURL(c.signatureEntreprise.signature) ? c.signatureEntreprise : null,
          signatureCandidat: c.signatureCandidat?.signature && isValidDataURL(c.signatureCandidat.signature) ? c.signatureCandidat : null,
          approbationCandidat: c?.approbationCandidat || { approuve: null },
          approbationEntreprise: c?.approbationEntreprise || { approuve: null },
        }));
      if (validContrats.length === 0) {
        setErrorMessage("Aucun contrat publié valide trouvé");
        setContrats([]);
      } else {
        setContrats(validContrats);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des contrats:", err);
      setErrorMessage(err.response?.data?.message || err.message || "Erreur lors du chargement des contrats");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer la fiche de paie
  const fetchFicheDePaie = async (contratId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentification requise");
      const response = await axios.get("http://localhost:5000/api/fiches-de-paie", {
        headers: { Authorization: `Bearer ${token}` },
        params: { contrat: contratId },
        timeout: 10000,
      });
      const data = response.data?.data || [];
      if (data.length === 0) throw new Error("Aucune fiche de paie trouvée pour ce contrat");
      return data[0];
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Erreur lors de la récupération de la fiche de paie");
    }
  };

  // Fonction pour générer la fiche de paie en PDF
  const generateFicheDePaiePDF = (fiche) => {
    try {
      const ficheWithDefaults = {
        salaireBrut: fiche?.salaireBrut || 0,
        salaireNet: fiche?.salaireNet || 0,
        totalHeures: fiche?.totalHeures || 0,
        heuresSupplementaires: fiche?.heuresSupplementaires || 0,
        deductions: Array.isArray(fiche?.deductions) ? fiche.deductions : [],
        primes: Array.isArray(fiche?.primes) ? fiche.primes : [],
        absences: Array.isArray(fiche?.absences) ? fiche.absences : [],
        annee: fiche?.annee || new Date().getFullYear(),
        mois: fiche?.mois || new Date().getMonth() + 1,
        employe: fiche?.employe || { nom: "Non spécifié", prenom: "Non spécifié" },
        contrat: fiche?.contrat || { intitulePoste: "Non spécifié" },
        details: fiche?.details || {
          heuresNormales: 0,
          heuresSupplementaires: 0,
          congesPayes: 0,
          absences: [],
          joursNonJustifies: 0,
          tauxHoraire: 0,
          primes: [],
        },
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
        doc.text(`Fiche de Paie - ${ficheWithDefaults.employe.nom} ${ficheWithDefaults.employe.prenom}`, margin, 10);
        doc.line(margin, 12, pageWidth - margin, 12);
        y = 15;
      };

      const addFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${doc.internal.getNumberOfPages()} | Généré le ${formatDate(new Date())}`, pageWidth / 2, pageHeight - 10, { align: "center" });
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      };

      addHeader();
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      checkPageOverflow(20);
      doc.text("FICHE DE PAIE", pageWidth / 2, y, { align: "center" });
      y += 15;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      checkPageOverflow(40);
      doc.text(`Employé: ${ficheWithDefaults.employe.nom} ${ficheWithDefaults.employe.prenom}`, margin, y);
      y += 7;
      doc.text(`Poste: ${ficheWithDefaults.contrat.intitulePoste}`, margin, y);
      y += 7;
      doc.text(`Période: ${ficheWithDefaults.mois}/${ficheWithDefaults.annee}`, margin, y);
      y += 15;

      checkPageOverflow(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Détails du Salaire", margin, y);
      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      autoTable(doc, {
        startY: y,
        head: [["Critère", "Valeur"]],
        body: [
          ["Salaire Brut", `${ficheWithDefaults.salaireBrut.toFixed(2)} €`],
          ["Salaire Net", `${ficheWithDefaults.salaireNet.toFixed(2)} €`],
          ["Total Heures", `${ficheWithDefaults.totalHeures.toFixed(1)} h`],
          ["Heures Normales", `${ficheWithDefaults.details.heuresNormales.toFixed(1)} h`],
          ["Heures Supplémentaires", `${ficheWithDefaults.details.heuresSupplementaires.toFixed(1)} h`],
          ["Taux Horaire", `${ficheWithDefaults.details.tauxHoraire.toFixed(2)} €/h`],
          ["Congés Payés", `${ficheWithDefaults.details.congesPayes} jours`],
          ["Jours Non Justifiés", `${ficheWithDefaults.details.joursNonJustifies} jours`],
        ],
        theme: "striped",
        styles: { fontSize: 12, cellPadding: 2 },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 10;

      // Déductions
      if (ficheWithDefaults.deductions.length > 0) {
        checkPageOverflow(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Déductions", margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          head: [["Libellé", "Montant"]],
          body: ficheWithDefaults.deductions.map((deduction) => [
            deduction.libelle || "Non spécifié",
            `${(deduction.montant || 0).toFixed(2)} €`,
          ]),
          theme: "striped",
          styles: { fontSize: 12, cellPadding: 2 },
          margin: { left: margin, right: margin },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // Primes
      if (ficheWithDefaults.primes.length > 0) {
        checkPageOverflow(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Primes", margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          head: [["Libellé", "Montant"]],
          body: ficheWithDefaults.primes.map((prime) => [
            prime.libelle || "Non spécifié",
            `${(prime.montant || 0).toFixed(2)} €`,
          ]),
          theme: "striped",
          styles: { fontSize: 12, cellPadding: 2 },
          margin: { left: margin, right: margin },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // Absences
      if (ficheWithDefaults.absences.length > 0) {
        checkPageOverflow(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Absences", margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          head: [["Type", "Jours"]],
          body: ficheWithDefaults.absences.map((absence) => [
            absence.type || "Non spécifié",
            `${absence.jours || 0} jour(s)`,
          ]),
          theme: "striped",
          styles: { fontSize: 12, cellPadding: 2 },
          margin: { left: margin, right: margin },
        });
        y = doc.lastAutoTable.finalY + 10;
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

      if (!isValidPDFDataURL(pdfDataUrl)) throw new Error("PDF généré invalide");
      return pdfDataUrl;
    } catch (err) {
      throw new Error("Erreur lors de la génération du PDF de la fiche de paie");
    }
  };

  // Fonction pour voir la fiche de paie
  const handleViewFicheDePaie = async (contratId) => {
    try {
      if (!contratId || !/^[0-9a-fA-F]{24}$/.test(contratId))
        throw new Error("Identifiant de contrat invalide");
      const fiche = await fetchFicheDePaie(contratId);
      const pdfDataUrl = generateFicheDePaiePDF(fiche);
      const base64Data = pdfDataUrl.split("base64,")[1];
      if (!base64Data) throw new Error("Données PDF manquantes");
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, "_blank");
      if (!newWindow) throw new Error("Veuillez autoriser les pop-ups");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (err) {
      console.error("Erreur lors de l'ouverture du PDF:", err);
      setErrorMessage("Impossible d'ouvrir le PDF. Veuillez réessayer.");
    }
  };

  // Navigation vers missions
  const handleNavigateToMissions = (contratId) => {
    if (!contratId || !/^[0-9a-fA-F]{24}$/.test(contratId)) {
      setErrorMessage("Identifiant de contrat invalide.");
      return;
    }
    navigate(`/missions/${contratId}`);
  };

  // Navigation vers pointage
  const handleNavigateToPointage = (contratId) => {
    if (!contratId || !/^[0-9a-fA-F]{24}$/.test(contratId)) {
      setErrorMessage("Identifiant de contrat invalide.");
      return;
    }
    navigate(`/pointage/${contratId}`);
  };

  // Génération PDF contrat
  const generatePDF = (contrat) => {
    try {
      const contratWithDefaults = {
        ...contrat,
        entreprise: contrat?.entreprise || { nomEntreprise: "Non spécifié", adresseEntreprise: "Non spécifié" },
        user: contrat?.user || { nom: "Non spécifié" },
        titre: contrat?.titre || "Contrat sans titre",
        typeContrat: contrat?.typeContrat || "Non spécifié",
        dateDebut: contrat?.dateDebut || new Date().toISOString(),
        dateFin: contrat?.dateFin || null,
        intitulePoste: contrat?.intitulePoste || "Non spécifié",
        tempsTravail: contrat?.tempsTravail || "Non spécifié",
        salaire: contrat?.salaire || { montant: null, devise: null, periodicite: null },
        modalitesPaiement: contrat?.modalitesPaiement || "Non spécifié",
        articles: Array.isArray(contrat?.articles) ? contrat.articles : [],
        avenants: Array.isArray(contrat?.avenants) ? contrat.avenants : [],
        missions: Array.isArray(contrat?.missions) ? contrat.missions : [],
        signatureAdmin: contrat?.signatureAdmin || null,
        signatureEntreprise: contrat?.signatureEntreprise || null,
        signatureCandidat: contrat?.signatureCandidat || null,
        etat: contrat?.etat || "Non spécifié",
        approbationCandidat: contrat?.approbationCandidat || { approuve: null },
        approbationEntreprise: contrat?.approbationEntreprise || { approuve: null },
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
        doc.text(`${contratWithDefaults.entreprise.nomEntreprise} - Contrat`, margin, 10);
        doc.line(margin, 12, pageWidth - margin, 12);
        y = 15;
      };

      const addFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${doc.internal.getNumberOfPages()} | Généré le ${formatDate(new Date())}`, pageWidth / 2, pageHeight - 10, { align: "center" });
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      };

      addHeader();
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      checkPageOverflow(20);
      doc.text("CONTRAT DE TRAVAIL", pageWidth / 2, y, { align: "center" });
      y += 15;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      checkPageOverflow(50);
      doc.text(`Entre ${contratWithDefaults.entreprise.nomEntreprise} et ${contratWithDefaults.user.nom}`, margin, y);
      y += 10;
      doc.text(`Type: ${contratWithDefaults.typeContrat}`, margin, y);
      y += 7;
      doc.text(`Période: Du ${formatDate(contratWithDefaults.dateDebut)} au ${formatDate(contratWithDefaults.dateFin)}`, margin, y);
      y += 7;
      doc.text(`Poste: ${contratWithDefaults.intitulePoste}`, margin, y);
      y += 7;
      doc.text(`État: ${contratWithDefaults.etat}`, margin, y);
      y += 15;

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
          ["Salaire", formatSalaire(contratWithDefaults.salaire)],
          ["Modalités de paiement", contratWithDefaults.modalitesPaiement],
        ],
        theme: "striped",
        styles: { fontSize: 12, cellPadding: 2 },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 10;

      // Missions
      if (contratWithDefaults.missions.length > 0) {
        checkPageOverflow(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Missions", margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        contratWithDefaults.missions.forEach((mission, index) => {
          checkPageOverflow(40);
          doc.setFont("helvetica", "bold");
          const missionTitle = mission?.titre || "Sans titre";
          doc.text(`Mission ${index + 1}: ${missionTitle}`, margin, y);
          y += 7;
          doc.setFont("helvetica", "normal");
          const descLines = doc.splitTextToSize(mission?.description || "Pas de description", pageWidth - 2 * margin);
          checkPageOverflow(descLines.length * 7 + 10);
          doc.text(descLines, margin, y);
          y += descLines.length * 7 + 5;
          if (mission?.statut) {
            doc.text(`Statut: ${mission.statut}`, margin, y);
            y += 7;
          }
        });
        y += 5;
      }

      // Articles
      if (contratWithDefaults.articles.length > 0) {
        checkPageOverflow(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Articles", margin, y);
        y += 8;
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        contratWithDefaults.articles.forEach((article, index) => {
          checkPageOverflow(40);
          doc.setFont("helvetica", "bold");
          const articleTitle = article?.titreArticle || "Sans titre";
          doc.text(`Article ${index + 1}: ${articleTitle}`, margin, y);
          y += 7;
          doc.setFont("helvetica", "normal");
          const descLines = doc.splitTextToSize(article?.description || "Pas de description", pageWidth - 2 * margin);
          checkPageOverflow(descLines.length * 7 + 10);
          doc.text(descLines, margin, y);
          y += descLines.length * 7 + 5;
        });
        y += 5;
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
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        contratWithDefaults.avenants.forEach((avenant, index) => {
          checkPageOverflow(50);
          doc.setFont("helvetica", "bold");
          const avenantTitle = avenant?.titre || "Avenant sans titre";
          doc.text(avenantTitle, margin, y);
          y += 7;
          doc.setFont("helvetica", "normal");
          doc.text(`Date effet: ${formatDate(avenant?.dateEffet)}`, margin, y);
          y += 7;
          const descLines = doc.splitTextToSize(avenant?.description || "Pas de description", pageWidth - 2 * margin);
          checkPageOverflow(descLines.length * 7 + 10);
          doc.text(descLines, margin, y);
          y += descLines.length * 7 + 5;
        });
        y += 5;
      }

      // Signatures
      checkPageOverflow(100);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Signatures", margin, y);
      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      const signatureWidth = 50;
      const signatureHeight = 25;
      const signatureSpacing = 10;
      const signatures = [
        {
          signature: contratWithDefaults.signatureAdmin?.signature,
          role: "Administrateur",
          date: contratWithDefaults.signatureAdmin?.date,
        },
        {
          signature: contratWithDefaults.signatureEntreprise?.signature,
          role: "Entreprise",
          date: contratWithDefaults.signatureEntreprise?.date,
        },
        {
          signature: contratWithDefaults.signatureCandidat?.signature,
          role: "Candidat",
          date: contratWithDefaults.signatureCandidat?.date,
        },
      ].filter((sig) => sig.signature && isValidDataURL(sig.signature));

      if (signatures.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text("Aucune signature.", margin, y);
        y += 10;
      } else {
        const totalSignatureWidth = signatures.length * signatureWidth + (signatures.length - 1) * signatureSpacing;
        const startX = (pageWidth - totalSignatureWidth) / 2;

        signatures.forEach((sig, index) => {
          const xPos = startX + index * (signatureWidth + signatureSpacing);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.text(`Signature ${sig.role}:`, xPos, y);
          if (sig.signature && isValidDataURL(sig.signature)) {
            doc.addImage(sig.signature, "PNG", xPos, y + 5, signatureWidth, signatureHeight);
            // Ajout d'une ligne sous la signature
            doc.rect(xPos, y + 5 + signatureHeight, signatureWidth, 0.5);
            doc.text(`Signé le: ${formatDate(sig.date)}`, xPos, y + 5 + signatureHeight + 5);
          }
        });
        y += signatureHeight + 20;
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
      if (!isValidPDFDataURL(pdfDataUrl)) throw new Error("PDF généré invalide");
      return pdfDataUrl;
    } catch (err) {
      setErrorMessage("Erreur lors de la génération du PDF");
      return null;
    }
  };

  // Voir le contrat
  const handleViewContract = async (contrat) => {
    try {
      if (!contrat) throw new Error("Contrat non défini");
      const pdfDataUrl = generatePDF(contrat);
      if (!pdfDataUrl) return;
      const base64Data = pdfDataUrl.split("base64,")[1];
      if (!base64Data) throw new Error("Données PDF manquantes");
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, "_blank");
      if (!newWindow) throw new Error("Veuillez autoriser les pop-ups");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (err) {
      console.error("Erreur lors de l'ouverture du PDF:", err);
      setErrorMessage("Impossible d'ouvrir le PDF. Veuillez réessayer.");
    }
  };

  // Ouvrir la dialog de signature
  const handleOpenSignDialog = (contrat) => {
    if (!contrat) {
      setErrorMessage("Contrat non défini");
      return;
    }
    setSelectedContrat(contrat);
    setOpenSignDialog(true);
  };

  const handleCloseSignDialog = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
    }
    setOpenSignDialog(false);
    setSelectedContrat(null);
  };

  // Sauvegarder la signature
  const handleSignContrat = async (signatureDataUrl) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentification requise");
      if (!selectedContrat || !selectedContrat._id) throw new Error("ID du contrat manquant");
      if (!isValidDataURL(signatureDataUrl)) throw new Error("Signature invalide");

      const updatedContrat = {
        ...selectedContrat,
        signatureCandidat: {
          signature: signatureDataUrl,
          date: new Date().toISOString(),
        },
      };

      const pdfDataUrl = generatePDF(updatedContrat);
      if (!pdfDataUrl) throw new Error("Échec de la génération du PDF");

      await axios.post(
        `http://localhost:5000/api/contrats/${selectedContrat._id}/signature`,
        {
          signature: signatureDataUrl,
          role: "candidat",
          pdfData: pdfDataUrl,
          signaturePosition: { x: 50, y: 50, width: 150, height: 50, page: -1 },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );
      setSuccessMessage("Signature enregistrée avec succès");
      await fetchContrats();
    } catch (err) {
      console.error("Erreur lors de la signature:", err);
      setErrorMessage(err.response?.data?.message || "Erreur lors de la signature");
    }
  };

  const handleSaveSignature = () => {
    try {
      if (!sigPadRef.current) throw new Error("Canvas de signature non disponible");
      if (sigPadRef.current.isEmpty()) throw new Error("Veuillez dessiner une signature");
      const signatureDataUrl = sigPadRef.current.toDataURL("image/png");
      if (!isValidDataURL(signatureDataUrl)) throw new Error("La signature n'a pas pu être générée");
      handleSignContrat(signatureDataUrl);
      handleCloseSignDialog();
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de la signature:", err);
      setErrorMessage(err.message || "Erreur lors de l'enregistrement de la signature");
    }
  };

  // Ouvrir la dialog d'approbation
  const handleOpenApproveDialog = (contrat) => {
    if (!contrat) {
      setErrorMessage("Contrat non défini");
      return;
    }
    setSelectedContrat(contrat);
    setOpenApproveDialog(true);
  };

  const handleCloseApproveDialog = () => {
    setOpenApproveDialog(false);
    setCommentaire("");
    setApprobation(true);
    setSelectedContrat(null);
  };

  // Soumettre l'approbation ou le rejet
  const handleSubmitApprobation = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentification requise");
      if (!selectedContrat || !selectedContrat._id) throw new Error("ID du contrat manquant");

      const endpoint = approbation
        ? `http://localhost:5000/api/contrats/${selectedContrat._id}/approbation-candidat`
        : `http://localhost:5000/api/contrats/${selectedContrat._id}/rejet-candidat`;

      const payload = approbation
        ? { approuve: true, commentaire }
        : { commentaire };

      await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      setSuccessMessage(`Contrat ${approbation ? "approuvé" : "rejeté"} avec succès`);
      await fetchContrats();
      handleCloseApproveDialog();
    } catch (err) {
      console.error(`Erreur lors de l'${approbation ? "approbation" : "rejet"}:`, err);
      setErrorMessage(err.response?.data?.message || `Erreur lors de l'${approbation ? "approbation" : "rejet"}`);
    }
  };

  // Vérifier si le contrat peut être signé
  const canSign = (contrat) => {
    const isValidState = contrat.etat === "approuve" || contrat.etat === "approuvé";
    const hasCandidateApproval = contrat.approbationCandidat?.approuve === true;
    const hasCompanyApproval = contrat.approbationEntreprise?.approuve === true;
    const noCandidateSignature = !contrat.signatureCandidat?.signature || !isValidDataURL(contrat.signatureCandidat.signature);

    console.log("Évaluation canSign:", {
      id: contrat._id,
      etat: contrat.etat,
      isValidState,
      hasCandidateApproval,
      hasCompanyApproval,
      noCandidateSignature,
    });

    return (
      isValidState &&
      hasCandidateApproval &&
      hasCompanyApproval &&
      noCandidateSignature
    );
  };

  // Vérifier si on peut ajouter une mission
  const canAddMission = (contrat) => {
    const currentDate = new Date();
    const startDate = new Date(contrat.dateDebut);
    return (contrat.etat === "signe" || contrat.etat === "signé") && currentDate >= startDate;
  };

  const filteredContrats = contrats
    .filter(c => c?.titre?.toLowerCase().includes(filterTitle.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  useEffect(() => {
    fetchContrats();
  }, []);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 4, mt: 9 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 4,
            background: "linear-gradient(to bottom, #f5f7fa, #e4e8f0)",
            minHeight: "80vh",
          }}
        >
          {/* En-tête */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: indigo[700],
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <DescriptionIcon fontSize="large" />
                Mes Contrats Publiés
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {contrats.length} contrat(s)
              </Typography>
            </Box>
          </Box>

          {/* Recherche */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Rechercher par titre..."
            value={filterTitle}
            onChange={(e) => setFilterTitle(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: grey[500], mr: 1 }} />,
            }}
            sx={{ mb: 4, borderRadius: 2, backgroundColor: "#fff", "& fieldset": { borderColor: grey[300] } }}
          />

          {/* Snackbar succès */}
          <Snackbar
            open={!!successMessage}
            autoHideDuration={6000}
            onClose={() => setSuccessMessage("")}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert severity="success" sx={{ width: "100%" }}>
              {successMessage}
            </Alert>
          </Snackbar>
          {/* Snackbar erreur */}
          <Snackbar
            open={!!errorMessage}
            autoHideDuration={6000}
            onClose={() => setErrorMessage("")}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert severity="error" sx={{ width: "100%" }}>
              {errorMessage}
            </Alert>
          </Snackbar>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
              <CircularProgress size={60} />
            </Box>
          ) : filteredContrats.length > 0 ? (
            <Grid container spacing={3}>
              {filteredContrats.map((contrat) => {
                
                return (
                  <Grid item xs={12} key={contrat._id}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        borderLeft: `4px solid ${
                          ["signe", "signé"].includes(contrat.etat)
                            ? teal[500]
                            : contrat.etat === "rejete"
                            ? deepOrange[500]
                            : indigo[600]
                        }`,
                        transition: "all 0.3s ease",
                        "&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" },
                      }}
                    >
                      {/* En-tête de contrat */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: indigo[800],
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Avatar sx={{ bgcolor: indigo[100], color: indigo[600], width: 32, height: 32 }}>
                              <DescriptionIcon fontSize="small" />
                            </Avatar>
                            {contrat.titre || "Contrat sans titre"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateShort(contrat.createdAt)}
                            <span
                              style={{
                                color:
                                  ["signe", "signé"].includes(contrat.etat)
                                    ? teal[600]
                                    : contrat.etat === "rejete"
                                    ? deepOrange[600]
                                    : indigo[600],
                                marginLeft: "8px",
                                fontWeight: "bold",
                              }}
                            >
                              ●{" "}
                              {["signe", "signé"].includes(contrat.etat)
                                ? "Signé"
                                : contrat.etat === "rejete"
                                ? "Rejeté"
                                : contrat.etat === "approuve" || contrat.etat === "approuvé"
                                ? "Approuvé"
                                : contrat.etat === "approuve_partiellement"
                                ? "Approuvé partiellement"
                                : "En attente d'approbation"}
                            </span>
                          </Typography>
                        </Box>
                        {/* Actions */}
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                          {/* Voir le contrat */}
                          <Tooltip title="Voir le contrat">
                            <IconButton
                              onClick={() => handleViewContract(contrat)}
                              sx={{ color: indigo[600], backgroundColor: indigo[50], "&:hover": { backgroundColor: indigo[100] } }}
                              aria-label="Voir le contrat"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {/* Approuver/Rejeter */}
                          {contrat.etat !== "signe" && contrat.etat !== "signé" && contrat.etat !== "approuve" && contrat.etat !== "approuvé" && (
                            <Tooltip title="Approuver/Rejeter le contrat">
                              <Button
                                variant="contained"
                                color="primary"
                                startIcon={<HowToRegIcon />}
                                onClick={() => handleOpenApproveDialog(contrat)}
                                sx={{ borderRadius: 8 }}
                                aria-label="Approuver/Rejeter le contrat"
                              >
                                Approuver
                              </Button>
                            </Tooltip>
                          )}
                          {/* Signer */}
                          {canSign(contrat) && (
                            <Tooltip title="Signer le contrat">
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<HowToRegIcon />}
                                onClick={() => handleOpenSignDialog(contrat)}
                                sx={{ borderRadius: 8 }}
                                aria-label="Signer le contrat"
                              >
                                Signer
                              </Button>
                            </Tooltip>
                          )}
                          {/* Accès fiche de paie et missions */}
                          {canAddMission(contrat) && (
                            <>
                              <Tooltip title="Voir la fiche de paie">
                                <IconButton
                                  onClick={() => handleViewFicheDePaie(contrat._id)}
                                  sx={{ color: indigo[600], backgroundColor: "#fff", "&:hover": { backgroundColor: indigo[100] } }}
                                  aria-label="Voir la fiche de paie"
                                >
                                  <ReceiptIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Voir les missions">
                                <IconButton
                                  onClick={() => handleNavigateToMissions(contrat._id)}
                                  sx={{ color: indigo[600], backgroundColor: "#fff", "&:hover": { backgroundColor: indigo[100] } }}
                                  aria-label="Voir les missions"
                                >
                                  <AssignmentIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Pointage">
                                <IconButton
                                  onClick={() => handleNavigateToPointage(contrat._id)}
                                  sx={{ color: indigo[600], backgroundColor: "#fff", "&:hover": { backgroundColor: indigo[100] } }}
                                  aria-label="Pointage"
                                >
                                  <AccessTimeIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </Box>

                      {/* Infos complémentaires */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={7} md={4}>
                          <Typography variant="body2">
                            <strong>Entreprise :</strong> {contrat.entreprise?.nomEntreprise || "Non spécifié"}
                          </Typography>
                        </Grid>
                        <Grid item xs={7} md={4}>
                          <Typography variant="body2">
                            <strong>Employé :</strong> {contrat.user?.nom || "Non spécifié"}
                          </Typography>
                        </Grid>
                        <Grid item xs={3} md={4}>
                          <Typography variant="body2">
                            <strong>Type :</strong> {contrat.typeContrat?.toUpperCase() || "Non spécifié"}
                          </Typography>
                        </Grid>
                      </Grid>

                      {/* Statuts et signatures */}
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                        {contrat.approbationCandidat?.approuve && (
                          <Chip
                            icon={<PersonIcon />}
                            label={`Candidat: Approuvé le ${formatDate(contrat.approbationCandidat.date)}`}
                            color="success"
                            variant="outlined"
                          />
                        )}
                        {contrat.approbationCandidat?.approuve === false && (
                          <Chip
                            icon={<PersonIcon />}
                            label={`Candidat: Rejeté le ${formatDate(contrat.approbationCandidat.date)}`}
                            color="error"
                            variant="outlined"
                          />
                        )}
                        {contrat.signatureAdmin?.signature && isValidDataURL(contrat.signatureAdmin.signature) && (
                          <Chip
                            icon={<AdminPanelSettingsIcon />}
                            label={`Signé par Admin le: ${formatDate(contrat.signatureAdmin.date)}`}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {contrat.signatureEntreprise?.signature && isValidDataURL(contrat.signatureEntreprise.signature) && (
                          <Chip
                            icon={<BusinessIcon />}
                            label={`Signé par Entreprise le: ${formatDate(contrat.signatureEntreprise.date)}`}
                            color="success"
                            variant="outlined"
                          />
                        )}
                        {contrat.signatureCandidat?.signature && isValidDataURL(contrat.signatureCandidat.signature) && (
                          <Chip
                            icon={<PersonIcon />}
                            label={`Signé par Candidat le: ${formatDate(contrat.signatureCandidat.date)}`}
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Typography variant="h6" align="center" color="text.secondary" sx={{ mt: 4 }}>
              Aucun contrat à afficher. Vérifiez votre connexion ou contactez l'administrateur.
            </Typography>
          )}

          {/* Dialog pour approbation */}
          <Dialog
            open={openApproveDialog}
            onClose={handleCloseApproveDialog}
            maxWidth="sm"
            fullWidth
            aria-labelledby="approve-dialog-title"
            aria-describedby="approve-dialog-description"
          >
            <DialogTitle id="approve-dialog-title">Approuver ou Rejeter le contrat</DialogTitle>
            <DialogContent>
              <DialogContentText id="approve-dialog-description">
                Veuillez indiquer si vous approuvez ou rejetez le contrat. Vous pouvez ajouter un commentaire optionnel.
              </DialogContentText>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant={approbation ? "contained" : "outlined"}
                  color="success"
                  onClick={() => setApprobation(true)}
                  sx={{ mr: 1 }}
                >
                  Approuver
                </Button>
                <Button
                  variant={!approbation ? "contained" : "outlined"}
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
              <Button onClick={handleCloseApproveDialog} color="secondary">
                Annuler
              </Button>
              <Button onClick={handleSubmitApprobation} variant="contained" color="primary">
                Confirmer
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog pour signature */}
          <Dialog
            open={openSignDialog}
            onClose={handleCloseSignDialog}
            maxWidth="sm"
            fullWidth
            aria-labelledby="sign-dialog-title"
            aria-describedby="sign-dialog-description"
          >
            <DialogTitle id="sign-dialog-title">Signer le contrat</DialogTitle>
            <DialogContent>
              <DialogContentText id="sign-dialog-description">
                Veuillez dessiner votre signature dans l'espace ci-dessous.
              </DialogContentText>
              <Box sx={{ mt: 2, border: "1px solid #ccc", borderRadius: 1, overflow: "hidden" }}>
                <SignaturePad
                  ref={sigPadRef}
                  canvasProps={{
                    width: 500,
                    height: 200,
                    style: { backgroundColor: "#fff" },
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseSignDialog} color="secondary">
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (sigPadRef.current) {
                    sigPadRef.current.clear();
                  }
                }}
                variant="outlined"
                color="secondary"
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

export default ContratCandidat;