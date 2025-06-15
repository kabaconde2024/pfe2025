import { useState, useEffect } from "react";
import {
  Container,
  Button,
  Typography,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  TextField,
  Grid,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  Edit as EditIcon,
  Info as InfoIcon,
  AccessTime as AccessTimeIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from "@mui/icons-material";
import { indigo, teal, deepOrange, grey, red } from "@mui/material/colors";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Fonction de formatage de date
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

// Fonction de formatage de salaire
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

// Validation des Data URLs
const isValidDataURL = (dataURL) => {
  return (
    typeof dataURL === "string" &&
    dataURL.startsWith("data:image/png;base64,") &&
    dataURL.length > 100
  );
};

const isValidPDFDataURL = (dataURL) => {
  return (
    typeof dataURL === "string" &&
    dataURL.startsWith("data:application/pdf;base64,") &&
    dataURL.length > 100
  );
};

// Fonction de génération de PDF
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
      etat: contrat?.etat || "non_signe",
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
    const etatLabel = {
      non_signe: "Non signé",
      signé: "Signé",
      rejete: "Rejeté",
      resilie: "Résilié",
    }[contratWithDefaults.etat] || "Non spécifié";
    doc.text(`État: ${etatLabel}`, margin, y);
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
    

// Dans la fonction generatePDF, remplacez la section des signatures par :

// Signatures
checkPageOverflow(100);
doc.setFont("helvetica", "bold");
doc.setFontSize(14);
doc.text("Signatures", margin, y);
y += 8;
doc.line(margin, y, pageWidth - margin, y);
y += 15;

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
  // Affichage vertical des libellés
  doc.setFont("helvetica", "bold");
  signatures.forEach((sig) => {
    doc.text(`Signature ${sig.role}:`, margin, y);
    y += 7;
  });
  
  y += 5; // Espace entre libellés et dates
  
  // Affichage vertical des dates
  doc.setFont("helvetica", "bold");
  signatures.forEach((sig) => {
    doc.text(`Signé le: ${formatDate(sig.date)}`, margin, y);
    y += 7;
  });
  
  y += 15; // Espace après les signatures
  
  // Ajout des images de signature si nécessaire
  // (Vous pouvez les ajouter ailleurs dans le PDF si besoin)
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
    console.error("Erreur lors de la génération du PDF:", err);
    return null;
  }
};

const ContratList = () => {
  const navigate = useNavigate();
  const [contrats, setContrats] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterTitle, setFilterTitle] = useState("");
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Récupérer utilisateur connecté
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("Aucun token trouvé");
        return;
      }
      const response = await axios.get("http://localhost:5000/api/utilisateur/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(response.data);
      setCurrentUserId(response.data.id.toString());
      console.log("ID de l'utilisateur connecté:", response.data.id);
    } catch (err) {
      console.error("Erreur lors de la récupération de l'utilisateur:", err);
    }
  };

  const fetchContrats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/contrats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data || [];
      if (!Array.isArray(data)) {
        throw new Error("Format de données invalide");
      }
      setContrats(data);
      data.forEach(contrat => {
        console.log(`Contrat ${contrat._id} - État: ${contrat.etat}, Signature Admin: ${!!contrat.signatureAdmin?.signature}`);
      });
      if (data.length === 0) {
        setSuccessMessage("Aucun contrat disponible. Créez-en un nouveau !");
      }
    } catch (err) {
      console.error("Erreur lors du chargement:", err);
      setErrorMessage(
        err.response?.data?.message || "Erreur lors du chargement"
      );
      setContrats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchContrats();
  }, []);

  const handleDetailsClick = (id) => navigate(`/contrat-details/${id}`);
  const handlePointagesClick = (id) => navigate(`/contrats/${id}/pointages`);
  const handleEditClick = (id) => {
    const contrat = contrats.find((c) => c._id === id);
    if (contrat?.etat === "signé") {
      setErrorMessage("Ce contrat est signé et ne peut plus être modifié");
    } else {
      navigate(`/edit-contrat/${id}`);
    }
  };

  const handlePublish = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Authentification requise");
      return;
    }
    setLoadingPublish(true);
    try {
      await axios.put(
        `http://localhost:5000/api/contrats/${id}/publier`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchContrats();
      setSuccessMessage("Contrat publié avec succès");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.message || "Erreur lors de la publication"
      );
    } finally {
      setLoadingPublish(false);
    }
  };

  // Visualiser le PDF existant
  const handleViewPDF = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/contrats/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 30000);
    } catch (err) {
      console.error("Erreur lors de la récupération du PDF:", err);
      setErrorMessage("Erreur lors de la récupération du PDF");
    }
  };

  // Régénérer et mettre à jour le PDF
  const handleRegeneratePDF = async (id) => {
    try {
      const token = localStorage.getItem("token");
      // Récupérer les données complètes du contrat
      const response = await axios.get(`http://localhost:5000/api/contrats/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contrat = response.data.data;
      if (!contrat) throw new Error("Contrat non trouvé");

      // Générer le nouveau PDF
      const pdfDataUrl = generatePDF(contrat);
      if (!pdfDataUrl) throw new Error("Échec de la génération du PDF");

      // Mettre à jour le PDF dans le backend
      await axios.put(
        `http://localhost:5000/api/contrats/${id}/update-pdf`,
        { pdfData: pdfDataUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Afficher le nouveau PDF
      const base64Data = pdfDataUrl.split("base64,")[1];
      if (!base64Data) throw new Error("Données PDF manquantes");
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

      // Rafraîchir la liste des contrats
      await fetchContrats();
      setSuccessMessage("PDF régénéré et mis à jour avec succès");
    } catch (err) {
      console.error("Erreur lors de la régénération du PDF:", err);
      setErrorMessage(err.response?.data?.message || "Erreur lors de la régénération du PDF");
    }
  };

  // Formater l'état du contrat
  const getEtatLabel = (etat) => {
    switch (etat) {
      case "non_signe":
        return "Non signé";
      case "signé":
        return "Signé";
      case "rejete":
        return "Rejeté";
      case "resilie":
        return "Résilié";
      default:
        return "Non spécifié";
    }
  };

  // Obtenir la couleur en fonction de l'état
  const getEtatColor = (etat) => {
    switch (etat) {
      case "signé":
        return teal[500];
      case "non_signe":
        return deepOrange[500];
      case "rejete":
        return red[500];
      case "resilie":
        return red[700];
      default:
        return grey[500];
    }
  };

  const filteredContrats = contrats
    .filter((c) =>
      c?.titre?.toLowerCase()?.includes(filterTitle.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
                Liste des Contrats
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {contrats.length} contrat(s) au total -{" "}
                Connecté en tant que: {currentUser?.nom || "Utilisateur"}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/create-contrat")}
              startIcon={<AddIcon />}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                textTransform: "none",
                fontSize: "1rem",
              }}
            >
              Créer un contrat
            </Button>
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
              sx: {
                borderRadius: 2,
                backgroundColor: "white",
                "& fieldset": { borderColor: grey[300] },
              },
            }}
            sx={{ mb: 4 }}
          />

          {/* Notifications */}
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

          {/* Contenu */}
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "50vh",
              }}
            >
              <CircularProgress size={60} />
            </Box>
          ) : filteredContrats.length === 0 ? (
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                backgroundColor: grey[50],
                borderRadius: 3,
              }}
            >
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                {filterTitle
                  ? "Aucun résultat pour votre recherche"
                  : "Aucun contrat disponible"}
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate("/create-contrat")}
                startIcon={<AddIcon />}
              >
                Créer un nouveau contrat
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredContrats.map((contrat) => (
                <Grid item xs={12} key={contrat._id}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      borderLeft: `4px solid ${getEtatColor(contrat.etat)}`,
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    {/* En-tête */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      {/* Infos contrat */}
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
                          <Avatar
                            sx={{
                              bgcolor: indigo[100],
                              color: indigo[600],
                              width: 32,
                              height: 32,
                            }}
                          >
                            <DescriptionIcon fontSize="small" />
                          </Avatar>
                          {contrat.titre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(contrat.createdAt).toLocaleDateString("fr-FR")}
                        </Typography>
                      </Box>
                      {/* Actions */}
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Tooltip title="Modifier">
                          <span>
                            <IconButton
                              onClick={() => handleEditClick(contrat._id)}
                              disabled={contrat.etat === "signé"}
                              sx={{
                                color: teal[600],
                                backgroundColor: teal[50],
                                "&:hover": { backgroundColor: teal[100] },
                                "&:disabled": { color: grey[500] },
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Détails">
                          <IconButton
                            onClick={() => handleDetailsClick(contrat._id)}
                            sx={{
                              color: indigo[600],
                              backgroundColor: indigo[50],
                              "&:hover": { backgroundColor: indigo[100] },
                            }}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Visualiser le PDF">
                          <IconButton
                            onClick={() => handleViewPDF(contrat._id)}
                            disabled={!contrat.pdfPath}
                            sx={{
                              color: red[600],
                              backgroundColor: red[50],
                              "&:hover": { backgroundColor: red[100] },
                              "&:disabled": { color: grey[500] },
                            }}
                          >
                            <PictureAsPdfIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    {/* Infos complémentaires */}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={3}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <BusinessIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            <strong>Entreprise:</strong>{" "}
                            {contrat.entreprise?.nomEntreprise || "Non spécifié"}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            <strong>Employé:</strong> {contrat.user?.nom || "Non spécifié"}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            <strong>Type:</strong> {contrat.typeContrat || "Non spécifié"}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <DescriptionIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            <strong>État:</strong>{" "}
                            <Chip
                              label={getEtatLabel(contrat.etat)}
                              size="small"
                              sx={{
                                backgroundColor: getEtatColor(contrat.etat),
                                color: "white",
                                fontWeight: "bold",
                              }}
                            />
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Container>
    </DashboardLayout>
  );
};

export default ContratList;