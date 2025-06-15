import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const Pointage = () => {
  const navigate = useNavigate();
  const { contratId } = useParams();
  const [user, setUser] = useState(null);
  const [contrat, setContrat] = useState(null);
  const [pointage, setPointage] = useState({
    date: new Date().toISOString().split("T")[0],
    heure_debut: "",
    heure_fin: "",
    pause: 1,
    _id: null,
    pointageDocId: null,
  });
  const [historiquePointages, setHistoriquePointages] = useState([]);
  const [historiqueAbsences, setHistoriqueAbsences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [showAbsenceDialog, setShowAbsenceDialog] = useState(false);
  const [absenceData, setAbsenceData] = useState({
    type: "maladie",
    date: new Date().toISOString().split("T")[0],
    duree_jours: 1,
    justificatifFile: null,
  });
  const [activeTab, setActiveTab] = useState(0);

  // Fonction pour capturer l'heure actuelle au format HH:mm
  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Vérifier si un pointage existe pour la date actuelle
  const hasPointageForToday = () => {
    const today = new Date().toISOString().split("T")[0];
    return historiquePointages.some(
      (p) => new Date(p.date.split("/").reverse().join("-")).toISOString().split("T")[0] === today
    );
  };

  // Vérifier si un pointage pour aujourd'hui a déjà une heure de fin
  const hasDepartureForToday = () => {
    const today = new Date().toISOString().split("T")[0];
    return historiquePointages.some(
      (p) =>
        new Date(p.date.split("/").reverse().join("-")).toISOString().split("T")[0] === today &&
        p.heure_fin
    );
  };

  // Gestionnaire pour pointer l'arrivée
  const handlePointArrival = () => {
    if (hasPointageForToday()) {
      setErrorMessage("Un pointage a déjà été enregistré pour aujourd'hui.");
      setOpenSnackbar(true);
      return;
    }
    if (pointage.heure_debut) {
      setErrorMessage("L'heure d'arrivée a déjà été enregistrée pour aujourd'hui.");
      setOpenSnackbar(true);
      return;
    }
    const currentTime = getCurrentTime();
    setPointage({ ...pointage, heure_debut: currentTime });
    setSuccessMessage("Heure d'arrivée enregistrée avec succès !");
    setOpenSnackbar(true);
  };

  // Gestionnaire pour pointer le départ
  const handlePointDeparture = () => {
    if (!pointage.heure_debut) {
      setErrorMessage("Veuillez d'abord pointer l'heure d'arrivée.");
      setOpenSnackbar(true);
      return;
    }
    if (hasDepartureForToday()) {
      setErrorMessage("L'heure de départ a déjà été enregistrée pour aujourd'hui.");
      setOpenSnackbar(true);
      return;
    }
    const currentTime = getCurrentTime();
    const [debutHeure, debutMinute] = pointage.heure_debut.split(":").map(Number);
    const [finHeure, finMinute] = currentTime.split(":").map(Number);
    const debutTotalMinutes = debutHeure * 60 + debutMinute;
    const finTotalMinutes = finHeure * 60 + finMinute;
    const minutesDifference = finTotalMinutes - debutTotalMinutes;
    if (minutesDifference < 5) {
      setErrorMessage("L'heure de départ doit être au moins 5 minutes après l'heure d'arrivée.");
      setOpenSnackbar(true);
      return;
    }
    if (finTotalMinutes <= debutTotalMinutes) {
      setErrorMessage("L'heure de départ doit être postérieure à l'heure d'arrivée.");
      setOpenSnackbar(true);
      return;
    }
    setPointage({ ...pointage, heure_fin: currentTime });
    setSuccessMessage("Heure de départ enregistrée avec succès !");
    setOpenSnackbar(true);
  };

  const reloadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found.");
        throw new Error("Aucun token d'authentification trouvé. Veuillez vous reconnecter.");
      }
      console.log("Token found (partial):", token.substring(0, 20) + "...");

      // Validate contratId
      if (!contratId || !/^[0-9a-fA-F]{24}$/.test(contratId)) {
        console.error("Invalid contratId:", contratId);
        throw new Error(`Identifiant de contrat invalide dans l'URL: ${contratId}`);
      }
      console.log("Fetching data for contract ID:", contratId);

      // Fetch authenticated user
      console.log("Fetching user data...");
      const userResponse = await axios.get("http://localhost:5000/api/utilisateur/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("User data received:", userResponse.data?.id, userResponse.data?.nom);
      if (!userResponse.data?.id) {
        throw new Error("Aucune donnée utilisateur valide reçue.");
      }
      setUser(userResponse.data);

      // Fetch contract
      console.log("Fetching contract data...");
      const contratResponse = await axios.get(`http://localhost:5000/api/contrats/${contratId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Contract response:", contratResponse.data);
      if (!contratResponse.data?.data?._id) {
        console.error("No valid contract found in response:", contratResponse.data);
        throw new Error(`Aucun contrat trouvé pour l'ID: ${contratId}`);
      }
      setContrat(contratResponse.data.data);

      // Fetch pointages for the user and contract
      console.log("Fetching pointages...");
      const pointagesResponse = await axios.get("http://localhost:5000/api/pointage", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          utilisateur: userResponse.data.id,
          contrat: contratId,
        },
      });
      console.log("Pointages received:", pointagesResponse.data.length, "documents");

      let allPointages = [];
      let allAbsences = [];

      pointagesResponse.data.forEach((doc) => {
        allPointages = [...allPointages, ...doc.pointages.map((p) => ({ ...p, pointageDocId: doc._id }))];
        allAbsences = [...allAbsences, ...doc.absences];
      });
      console.log("Total pointages:", allPointages.length, "Total absences:", allAbsences.length);

      const validateTimeFormat = (time) => /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time);

      // Sort pointages by date (descending)
      setHistoriquePointages(
        allPointages
          .map((p) => {
            if (!validateTimeFormat(p.heure_debut) || (p.heure_fin && !validateTimeFormat(p.heure_fin))) {
              console.warn("Invalid time format for pointage:", p);
              return null;
            }
            return {
              date: new Date(p.date).toLocaleDateString("fr-FR"),
              heure_debut: p.heure_debut,
              heure_fin: p.heure_fin,
              pause: p.pause,
              total: calculateHours(p.heure_debut, p.heure_fin, p.pause),
              statut: p.statut,
              _id: p._id,
              pointageDocId: p.pointageDocId,
            };
          })
          .filter((entry) => entry !== null)
          .sort((a, b) => new Date(b.date.split("/").reverse().join("-")) - new Date(a.date.split("/").reverse().join("-")))
      );

      // Sort absences by date (descending)
      setHistoriqueAbsences(
        allAbsences
          .map((a) => ({
            type: a.type,
            date: new Date(a.date).toLocaleDateString("fr-FR"),
            duree_jours: a.duree_jours,
            statut: a.statut,
            justificatif: a.justificatif || "-",
          }))
          .sort((a, b) => new Date(b.date.split("/").reverse().join("-")) - new Date(a.date.split("/").reverse().join("-")))
      );
    } catch (error) {
      console.error("Erreur lors du chargement des données:", {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
        } : null,
        stack: error.stack,
      });
      const errorMsg = error.response?.data?.message || error.message || "Erreur lors du chargement des données.";
      setErrorMessage(errorMsg);
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Pointage component mounted with contratId:", contratId);
    reloadData();
  }, [contratId]);

  // Réinitialisation quotidienne de l'état pointage
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (pointage.date !== today) {
      setPointage({
        ...pointage,
        date: today,
        heure_debut: "",
        heure_fin: "",
      });
    }
  }, [pointage.date]);

  const handleSavePointage = async () => {
    if (!user || !contrat) {
      console.error("Cannot save pointage: missing user or contract", { user, contrat });
      setErrorMessage("Utilisateur ou contrat non chargé.");
      setOpenSnackbar(true);
      return;
    }
    if (!pointage.date || !pointage.heure_debut || !pointage.heure_fin) {
      console.warn("Invalid pointage data:", pointage);
      setErrorMessage("Veuillez remplir l'heure de début et l'heure de fin.");
      setOpenSnackbar(true);
      return;
    }

    const [debutHeure, debutMinute] = pointage.heure_debut.split(":").map(Number);
    const [finHeure, finMinute] = pointage.heure_fin.split(":").map(Number);
    const debutTotalMinutes = debutHeure * 60 + debutMinute;
    const finTotalMinutes = finHeure * 60 + finMinute;
    const minutesDifference = finTotalMinutes - debutTotalMinutes;
    if (minutesDifference < 5) {
      console.warn("Shift too short:", minutesDifference, "minutes");
      setErrorMessage("La durée du pointage doit être d'au moins 5 minutes.");
      setOpenSnackbar(true);
      return;
    }
    if (finTotalMinutes <= debutTotalMinutes) {
      console.warn("Invalid time range: end time is not after start time", {
        heure_debut: pointage.heure_debut,
        heure_fin: pointage.heure_fin,
      });
      setErrorMessage("L'heure de fin doit être postérieure à l'heure de début.");
      setOpenSnackbar(true);
      return;
    }

    // Vérifier si un pointage existe déjà pour aujourd'hui
    if (hasPointageForToday() && !pointage._id) {
      setErrorMessage("Un pointage a déjà été enregistré pour aujourd'hui.");
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const pointageData = {
        pointages: [{
          date: pointage.date,
          heure_debut: pointage.heure_debut,
          heure_fin: pointage.heure_fin,
          pause: pointage.pause,
          statut: "en attente",
        }],
        utilisateur: user.id,
        contrat: contrat._id,
      };

      console.log("Saving pointage data:", pointageData);
      let response;
      if (pointage._id && pointage.pointageDocId) {
        pointageData.pointages[0]._id = pointage._id;
        response = await axios.put(
          `http://localhost:5000/api/pointage/${pointage.pointageDocId}`,
          pointageData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        response = await axios.post(
          "http://localhost:5000/api/pointage",
          pointageData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      console.log("Pointage saved successfully:", response.data);

      await reloadData();
      setSuccessMessage("Pointage enregistré avec succès !");
      setOpenSnackbar(true);
      setPointage({
        date: new Date().toISOString().split("T")[0],
        heure_debut: "",
        heure_fin: "",
        pause: 1,
        _id: null,
        pointageDocId: null,
      });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du pointage:", {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
        } : null,
      });
      setErrorMessage(error.response?.data?.message || "Erreur lors de l'enregistrement du pointage.");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAbsence = async () => {
    if (!user || !contrat) {
      console.error("Cannot submit absence: missing user or contract", { user, contrat });
      setErrorMessage("Utilisateur ou contrat non chargé.");
      setOpenSnackbar(true);
      return;
    }
    if (!absenceData.type || !absenceData.date || absenceData.duree_jours < 1) {
      console.warn("Invalid absence data:", absenceData);
      setErrorMessage("Veuillez remplir tous les champs requis pour l'absence.");
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("type", absenceData.type);
      formData.append("date", absenceData.date);
      formData.append("duree_jours", absenceData.duree_jours);
      if (absenceData.type === "maladie" && absenceData.justificatifFile) {
        formData.append("justificatifFile", absenceData.justificatifFile);
      }
      formData.append("utilisateur", user.id);
      formData.append("contrat", contrat._id);
      formData.append("statut", "en attente");

      console.log("Submitting absence data...");
      let response;
      if (pointage.pointageDocId) {
        response = await axios.put(
          `http://localhost:5000/api/pointage/${pointage.pointageDocId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
        );
      } else {
        response = await axios.post(
          "http://localhost:5000/api/pointage",
          formData,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
        );
      }
      console.log("Absence submitted successfully:", response.data);

      await reloadData();
      setSuccessMessage("Absence déclarée avec succès !");
      setOpenSnackbar(true);
      setShowAbsenceDialog(false);
      setAbsenceData({
        type: "maladie",
        date: new Date().toISOString().split("T")[0],
        duree_jours: 1,
        justificatifFile: null,
      });
    } catch (error) {
      console.error("Erreur lors de la déclaration d'absence:", {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
        } : null,
      });
      setErrorMessage(error.response?.data?.message || "Erreur lors de la déclaration d'absence.");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (start, end, pause) => {
    if (!start || !end || pause === undefined) return "0 h";
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute) - pause * 60;
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    return Math.max(totalMinutes / 60, 0).toFixed(1) + " h";
  };

  const handleCloseSnackbar = () => {
    console.log("Closing snackbar");
    setOpenSnackbar(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const isFilePath = (justificatif) => {
    return justificatif && justificatif.startsWith('/Uploads/justificatifs/');
  };

  const handleBack = () => {
    navigate("/contrat_candidat");
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 0', marginTop: '80px' }}>
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={handleBack}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #3F51B5',
              background: 'transparent',
              color: '#3F51B5',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Retour aux contrats
          </button>
        </div>
        <div style={{
          border: '2px solid #E0E0E0',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '32px'
        }}>
          <div style={{
            backgroundColor: '#E8EAF6',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg style={{ width: '24px', height: '24px', fill: '#3F51B5' }} viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3F51B5', margin: '0' }}>
              Mes pointages
            </h2>
          </div>
          <div style={{ padding: '16px' }}>
            {!contrat ? (
              <p style={{ color: '#D32F2F', fontSize: '16px', textAlign: 'center' }}>
                Aucun contrat trouvé pour cet ID. Veuillez vérifier l'identifiant ou retourner à la liste des contrats.
              </p>
            ) : (
              <>
                <h3 style={{ fontSize: '1.25rem', margin: '0 0 8px' }}>
                  Bonjour, {user ? user.nom : "Chargement..."}
                </h3>
                <p style={{ margin: '0 0 8px', color: '#757575' }}>
                  Contrat actif : {contrat ? `${contrat.typeContrat} - ${contrat.intitulePoste}` : "Aucun contrat actif"}
                </p>
                <div style={{ borderTop: '2px solid #E0E0E0', padding: '16px 0', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#757575' }}>Date</label>
                    <span style={{ padding: '8px', fontSize: '14px', color: '#3F51B5' }}>
                      {new Date(pointage.date).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#757575' }}>
                      Heure d'arrivée
                    </label>
                    <button
                      onClick={handlePointArrival}
                      disabled={loading || !user || !contrat || pointage.heure_debut || hasPointageForToday()}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '4px',
                        border: 'none',
                        background: loading || !user || !contrat || pointage.heure_debut || hasPointageForToday() ? '#B0BEC5' : '#3F51B5',
                        color: 'white',
                        cursor: loading || !user || !contrat || pointage.heure_debut || hasPointageForToday() ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Pointer l'arrivée
                    </button>
                    {pointage.heure_debut && (
                      <span style={{ marginLeft: '8px', color: '#3F51B5' }}>
                        {pointage.heure_debut}
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#757575' }}>
                      Heure de départ
                    </label>
                    <button
                      onClick={handlePointDeparture}
                      disabled={loading || !user || !contrat || !pointage.heure_debut || pointage.heure_fin || hasDepartureForToday()}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '4px',
                        border: 'none',
                        background:
                          loading || !user || !contrat || !pointage.heure_debut || pointage.heure_fin || hasDepartureForToday()
                            ? '#B0BEC5'
                            : '#3F51B5',
                        color: 'white',
                        cursor:
                          loading || !user || !contrat || !pointage.heure_debut || pointage.heure_fin || hasDepartureForToday()
                            ? 'not-allowed'
                            : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Pointer le départ
                    </button>
                    {pointage.heure_fin && (
                      <span style={{ marginLeft: '8px', color: '#3F51B5' }}>
                        {pointage.heure_fin}
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#757575' }}>
                      Pause (en heures)
                    </label>
                    <input
                      type="number"
                      value={pointage.pause}
                      onChange={(e) => setPointage({ ...pointage, pause: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.5"
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #B0BEC5',
                        fontSize: '14px',
                        width: '200px'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', padding: '16px 0', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleSavePointage}
                    disabled={loading || !user || !contrat}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: 'none',
                      background: loading || !user || !contrat ? '#B0BEC5' : '#3F51B5',
                      color: 'white',
                      cursor: loading || !user || !contrat ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {loading ? "Chargement..." : "Enregistrer le pointage"}
                  </button>
                  <button
                    onClick={() => setShowAbsenceDialog(true)}
                    disabled={loading || !user || !contrat}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: '1px solid #3F51B5',
                      background: 'transparent',
                      color: '#3F51B5',
                      cursor: loading || !user || !contrat ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Déclarer une absence
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Historique Section */}
        {contrat && (
          <div style={{
            border: '2px solid #E0E0E0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#E8EAF6',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg style={{ width: '24px', height: '24px', fill: '#3F51B5' }} viewBox="0 0 24 24">
                <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/>
              </svg>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3F51B5', margin: '0' }}>
                Historique
              </h2>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #E0E0E0' }}>
              <button
                onClick={() => setActiveTab(0)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: activeTab === 0 ? '#E8EAF6' : 'transparent',
                  color: activeTab === 0 ? '#3F51B5' : '#757575',
                  fontWeight: activeTab === 0 ? 'bold' : 'normal',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Pointages
              </button>
              <button
                onClick={() => setActiveTab(1)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: activeTab === 1 ? '#E8EAF6' : 'transparent',
                  color: activeTab === 1 ? '#3F51B5' : '#757575',
                  fontWeight: activeTab === 1 ? 'bold' : 'normal',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Absences
              </button>
            </div>
            <div style={{ border: '1px solid #E0E0E0', borderRadius: '4px', backgroundColor: 'white' }}>
              {activeTab === 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#E8EAF6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>📅 Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>⏱ Arrivée</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>⏱ Départ</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>🕒 Pause</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>🕒 Total</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historiquePointages.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: '#B0BEC5' }}>
                          Aucun pointage disponible
                        </td>
                      </tr>
                    ) : (
                      historiquePointages.map((entry, index) => (
                        <tr
                          key={index}
                          style={{ backgroundColor: index % 2 === 0 ? 'white' : '#FAFAFA' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEEEEE'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#FAFAFA'}
                        >
                          <td style={{ padding: '12px' }}>{entry.date}</td>
                          <td style={{ padding: '12px' }}>{entry.heure_debut}</td>
                          <td style={{ padding: '12px' }}>{entry.heure_fin}</td>
                          <td style={{ padding: '12px' }}>{entry.pause} h</td>
                          <td style={{ padding: '12px' }}>{entry.total}</td>
                          <td style={{ padding: '12px', color: entry.statut === 'en attente' ? '#F57C00' : entry.statut === 'validé' ? '#4CAF50' : '#D32F2F' }}>
                            {entry.statut}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#E8EAF6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>📅 Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>⏱ Durée</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>Statut</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#3F51B5' }}>Justificatif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historiqueAbsences.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#B0BEC5' }}>
                          Aucune absence déclarée
                        </td>
                      </tr>
                    ) : (
                      historiqueAbsences.map((absence, index) => (
                        <tr
                          key={index}
                          style={{ backgroundColor: index % 2 === 0 ? 'white' : '#FAFAFA' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEEEEE'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#FAFAFA'}
                        >
                          <td style={{ padding: '12px' }}>{absence.type}</td>
                          <td style={{ padding: '12px' }}>{absence.date}</td>
                          <td style={{ padding: '12px' }}>{absence.duree_jours} jour(s)</td>
                          <td style={{ padding: '12px', color: absence.statut === 'en attente' ? '#F57C00' : absence.statut === 'validé' ? '#4CAF50' : '#D32F2F' }}>
                            {absence.statut}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {isFilePath(absence.justificatif) ? (
                              <a
                                href={`http://localhost:5000${absence.justificatif}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="justificatif-link"
                              >
                                Justificatif d'absence
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <style>{`
              .justificatif-link {
                color: #3F51B5;
                text-decoration: none;
              }
              .justificatif-link:hover {
                text-decoration: underline;
              }
            `}</style>
          </div>
        )}

        {showAbsenceDialog && (
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '500px',
              maxWidth: '90%',
              padding: '16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ margin: '0 0 16px', backgroundColor: '#3F51B5', color: 'white', padding: '12px', borderRadius: '4px 4px 0 0' }}>
                Déclarer une absence
              </h3>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <select
                  value={absenceData.type}
                  onChange={(e) => setAbsenceData({ ...absenceData, type: e.target.value })}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #B0BEC5',
                    fontSize: '14px'
                  }}
                >
                  <option value="maladie">Maladie</option>
                  <option value="congé payé">Congé payé</option>
                  <option value="congé sans solde">Congé sans solde</option>
                  <option value="autre">Autre</option>
                </select>
                <input
                  type="date"
                  value={absenceData.date}
                  onChange={(e) => setAbsenceData({ ...absenceData, date: e.target.value })}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: absenceData.date ? '1px solid #B0BEC5' : '1px solid #D32F2F',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="number"
                  value={absenceData.duree_jours}
                  onChange={(e) => setAbsenceData({ ...absenceData, duree_jours: parseInt(e.target.value) || 1 })}
                  min="1"
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: absenceData.duree_jours >= 1 ? '1px solid #B0BEC5' : '1px solid #D32F2F',
                    fontSize: '14px'
                  }}
                />
                {absenceData.type === "maladie" && (
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setAbsenceData({ ...absenceData, justificatifFile: e.target.files[0] })}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #B0BEC5',
                      fontSize: '14px'
                    }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', gap: '8px' }}>
                <button
                  onClick={() => setShowAbsenceDialog(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid #3F51B5',
                    background: 'transparent',
                    color: '#3F51B5',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitAbsence}
                  disabled={loading || !absenceData.type || !absenceData.date || absenceData.duree_jours < 1}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    background: loading || !absenceData.type || !absenceData.date || absenceData.duree_jours < 1 ? '#B0BEC5' : '#3F51B5',
                    color: 'white',
                    cursor: loading || !absenceData.type || !absenceData.date || absenceData.duree_jours < 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? "Chargement..." : "Valider"}
                </button>
              </div>
            </div>
          </div>
        )}

        {openSnackbar && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: errorMessage ? '#D32F2F' : '#4CAF50',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: '1000',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <span>{errorMessage || successMessage}</span>
            <button
              onClick={handleCloseSnackbar}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <div style={{
              border: '8px solid #E0E0E0',
              borderTop: '8px solid #3F51B5',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Pointage;