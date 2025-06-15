import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  message,
  Typography,
  Row,
  Col,
  Space,
  DatePicker,
  Skeleton,
  Radio,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import axios from "axios";
import moment from "moment";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const { Title } = Typography;
const { Option } = Select;

// Function to validate MongoDB ObjectId (24-character hexadecimal string)
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// Cache utility functions
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const getCachedData = (key) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_TTL) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
};
const setCachedData = (key, data) => {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
};

const CreateContrat = () => {
  const navigate = useNavigate();
  const { contratId } = useParams();
  const [form] = Form.useForm();

  const [entreprises, setEntreprises] = useState([]);
  const [candidats, setCandidats] = useState([]);
  const [allEntretiens, setAllEntretiens] = useState([]);
  const [offres, setOffres] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingEntreprises, setLoadingEntreprises] = useState(true);
  const [loadingOffres, setLoadingOffres] = useState(true);
  const [loadingEntretiens, setLoadingEntretiens] = useState(false);
  const [loadingContrat, setLoadingContrat] = useState(!!contratId);
  const [submitting, setSubmitting] = useState(false);
  const [sourceType, setSourceType] = useState("offre"); // "offre" or "announce"

  // Fonction pour récupérer le nom de l'entreprise par ID
  const getEntrepriseNomFromId = useCallback(
    (entrepriseId) => {
      if (!entrepriseId) return "non spécifié";
      const e = entreprises.find((ent) => ent._id.toString() === entrepriseId.toString());
      return e ? e.nomEntreprise : "non spécifié";
    },
    [entreprises]
  );

  // Fonction pour obtenir le nom de l'entreprise à partir d'une offre ou annonce
  const getEntrepriseNom = useCallback(
    (source) => {
      if (!source) return "non spécifié";
      if (typeof source.entreprise === "object" && source.entreprise?.nomEntreprise) {
        return source.entreprise.nomEntreprise;
      }
      return getEntrepriseNomFromId(source.entreprise);
    },
    [getEntrepriseNomFromId]
  );

  // Chargement des entreprises
  const loadEntreprises = async () => {
    try {
      const cached = getCachedData("entreprises");
      if (cached) {
        setEntreprises(cached);
        setLoadingEntreprises(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      const response = await axios.get("http://localhost:5000/api/utilisateurs-entreprise?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      console.log("Entreprises chargées:", data);
      setEntreprises(data);
      setCachedData("entreprises", data);
    } catch (err) {
      console.error("Erreur chargement entreprises:", err);
      message.error("Erreur lors du chargement des entreprises: " + (err.message || "Erreur inconnue"));
    } finally {
      setLoadingEntreprises(false);
    }
  };

  // Chargement des offres
  const loadOffres = async () => {
    try {
      const cached = getCachedData("offres");
      if (cached) {
        setOffres(cached);
        setLoadingOffres(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      const response = await axios.get("http://localhost:5000/api/offres?limit=50&active=true", {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      console.log("Offres chargées:", data);
      setOffres(data);
      setCachedData("offres", data);
    } catch (err) {
      console.error("Erreur chargement offres:", err);
      message.error("Erreur lors du chargement des offres: " + (err.message || "Erreur inconnue"));
    } finally {
      setLoadingOffres(false);
    }
  };

  // Chargement des entretiens positifs pour annonces
  const loadAnnouncements = async () => {
    try {
      // Forcer la suppression du cache pour débogage
      localStorage.removeItem("announcements");
      console.log("Cache announcements supprimé");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");

      const response = await axios.get("http://localhost:5000/api/entretiens/positifs-annonce", {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      console.log("Réponse API annonces:", response.data);

      const data = Array.isArray(response.data.data) ? response.data.data : [];
      console.log("Données annonces traitées:", data);

      if (data.length === 0) {
        message.info("Aucun entretien positif pour annonces trouvé.");
      }

      setAnnouncements(data);
      setCachedData("announcements", data);
    } catch (err) {
      console.error("Erreur chargement annonces:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      message.error("Erreur lors du chargement des annonces: " + (err.message || "Erreur inconnue"));
      setAnnouncements([]);
    }
  };

  // Chargement des entretiens pour une offre spécifique
  const loadEntretiens = async (offreId) => {
    try {
      setLoadingEntretiens(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      const response = await axios.get(
        `http://localhost:5000/api/entretiens?offre_id=${offreId}&resultat=Positif`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      console.log("Entretiens pour offre", offreId, ":", data);
      if (data.length === 0) {
        message.warning("Aucun entretien positif trouvé pour cette offre.");
      }
      setAllEntretiens(data);
      filterCandidatsByOffre(offreId, data);
    } catch (err) {
      console.error("Erreur chargement entretiens:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      message.error("Erreur lors du chargement des entretiens: " + (err.message || "Erreur inconnue"));
    } finally {
      setLoadingEntretiens(false);
    }
  };

  // Chargement du contrat pour modification
  const loadContratData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token manquant");
      const response = await axios.get(`http://localhost:5000/api/contrats/${contratId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      const contrat = response.data.data || response.data;
      if (!contrat) throw new Error("Entretien non trouvé");

      console.log("Contrat chargé:", contrat);

      form.setFieldsValue({
        sourceType: contrat.entretien ? "announce" : "offre",
        source: contrat.offre?._id
          ? {
              value: contrat.offre._id.toString(),
              label: `${contrat.offre.titre || "Sans titre"} - ${getEntrepriseNom(contrat.offre)}`,
            }
          : contrat.entretien?._id
          ? {
              value: contrat.entretien._id.toString(),
              label: `Entretien avec ${contrat.entretien.candidat_id?.nom || "Inconnu"} ${
                contrat.entretien.candidat_id?.prenom || ""
              } - ${contrat.entretien.entreprise_id?.nomEntreprise || "Non spécifié"}`,
            }
          : null,
        titre: contrat.titre || "",
        entrepriseId: {
          value: contrat.entreprise?._id.toString() || "",
          label: contrat.entreprise?.nomEntreprise || getEntrepriseNomFromId(contrat.entreprise?._id),
        },
        candidatId: {
          value: contrat.user?._id.toString() || "",
          label: `${contrat.user?.nom || "Inconnu"} ${contrat.user?.prenom || ""} (${contrat.user?.email || "non disponible"})`.trim(),
        },
        dateDebut: contrat.dateDebut ? moment(contrat.dateDebut) : null,
        dateFin: contrat.dateFin ? moment(contrat.dateFin) : null,
        intitulePoste: contrat.intitulePoste || "",
        typeContrat: (contrat.typeContrat || "").toLowerCase(),
        tempsTravail: contrat.tempsTravail || "",
        salaire: contrat.salaire || "",
        modalitesPaiement: contrat.modalitesPaiement || "virement_bancaire",
      });

      if (contrat.offre?._id) {
        await loadEntretiens(contrat.offre._id);
      } else if (contrat.entretien) {
        setCandidats([
          {
            id: contrat.entretien.candidat_id?._id.toString() || "",
            nom: `${contrat.entretien.candidat_id?.nom || "Inconnu"} ${contrat.entretien.candidat_id?.prenom || ""}`.trim(),
            email: contrat.entretien.candidat_id?.email || "non disponible",
          },
        ]);
      }
    } catch (err) {
      console.error("Erreur chargement contrat:", err);
      message.error("Erreur lors du chargement du contrat: " + (err.message || "Erreur inconnue"));
    } finally {
      setLoadingContrat(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadEntreprises(), loadOffres(), loadAnnouncements()]);
        if (contratId) await loadContratData();
      } catch (err) {
        console.error("Erreur chargement initial:", err);
        message.error("Erreur lors du chargement initial");
        navigate("/contrats");
      }
    };
    loadData();
  }, [contratId, navigate]);

  // Filtrer les candidats par offre
  const filterCandidatsByOffre = useCallback(
    (offreId, entretiens = allEntretiens) => {
      const candidatsValides = entretiens
        .filter(
          (entretien) =>
            entretien.resultat === "Positif" &&
            (entretien.candidature_id?.candidat || entretien.candidat_id) &&
            entretien.offre_id === offreId
        )
        .map((entretien) => {
          const candidat = entretien.candidature_id?.candidat || entretien.candidat_id;
          return {
            id: candidat?._id?.toString() || "",
            nom: `${candidat?.nom || "Inconnu"} ${candidat?.prenom || ""}`.trim() || "Candidat sans nom",
            email: candidat?.email || "email non disponible",
          };
        });
      console.log("Candidats filtrés pour offre", offreId, ":", candidatsValides);
      setCandidats(candidatsValides);
      if (candidatsValides.length === 0) {
        message.warning("Aucun candidat éligible trouvé pour cette offre.");
      }
    },
    [allEntretiens]
  );

  // Gestion du changement de type de source
  const handleSourceTypeChange = (value) => {
    setSourceType(value);
    form.setFieldsValue({ source: null, candidatId: null, entrepriseId: null });
    setCandidats([]);
    setAllEntretiens([]);
  };

  // Gestion du changement de source (offre ou annonce)
  const handleSourceChange = async (value) => {
    if (!value) {
      form.setFieldsValue({ candidatId: null, entrepriseId: null });
      setCandidats([]);
      return;
    }

    if (sourceType === "offre") {
      const offreId = value.value;
      const offreSel = offres.find((o) => o._id === offreId);
      if (!offreSel) {
        message.error("Offre non trouvée");
        return;
      }

      let entrepriseId = typeof offreSel.entreprise === "object"
        ? offreSel.entreprise?._id || offreSel.entreprise?.id
        : offreSel.entreprise;

      if (!isValidObjectId(entrepriseId)) {
        const matchingEntreprise = entreprises.find(
          (e) => e.nomEntreprise === getEntrepriseNom(offreSel) || e._id.toString() === offreSel.entreprise?.id
        );
        if (matchingEntreprise && isValidObjectId(matchingEntreprise._id)) {
          entrepriseId = matchingEntreprise._id;
        } else if (entreprises.length > 0 && isValidObjectId(entreprises[0]._id)) {
          entrepriseId = entreprises[0]._id;
          message.warning(`Entreprise par défaut sélectionnée: ${entreprises[0].nomEntreprise}`);
        } else {
          message.error("Aucune entreprise valide trouvée.");
          return;
        }
      }

      await loadEntretiens(offreId);
      form.setFieldsValue({
        entrepriseId: {
          value: entrepriseId.toString(),
          label: getEntrepriseNom(offreSel) || getEntrepriseNomFromId(entrepriseId),
        },
        titre: `Contrat ${offreSel.typeEmploi || "CDI"} - ${offreSel.metier || offreSel.titre}`,
        intitulePoste: offreSel.metier || offreSel.titre || "",
        typeContrat: (offreSel.typeEmploi || "").toLowerCase(),
        candidatId: null,
      });
    } else {
      const entretienId = value.value;
      const entretienSel = announcements.find((e) => e._id.toString() === entretienId);
      if (!entretienSel) {
        message.error("Entretien non trouvé");
        return;
      }

      const candidat = {
        id: entretienSel.candidat_id?._id.toString() || "",
        nom: `${entretienSel.candidat_id?.nom || "Inconnu"} ${entretienSel.candidat_id?.prenom || ""}`.trim() || "Candidat sans nom",
        email: entretienSel.candidat_id?.email || "non disponible",
      };

      if (!isValidObjectId(candidat.id)) {
        message.error("ID du candidat invalide pour cet entretien");
        return;
      }

      console.log("Candidat sélectionné pour entretien", entretienId, ":", candidat);

      setCandidats([candidat]);

      form.setFieldsValue({
        entrepriseId: {
          value: entretienSel.entreprise_id?._id.toString() || "",
          label: entretienSel.entreprise_id?.nomEntreprise || "Non spécifié",
        },
        candidatId: {
          value: candidat.id,
          label: `${candidat.nom} (${candidat.email})`,
        },
        titre: `Contrat - Annonce ${entretienSel.annonce_id?.titre || "Sans titre"}`,
        intitulePoste: entretienSel.annonce_id?.metier || entretienSel.annonce_id?.titre || "Poste non défini",
        typeContrat: (entretienSel.annonce_id?.typeEmploi || entretienSel.annonce_id?.typeContrat || "freelance").toLowerCase(),
      });
    }
  };

  // Gestion de la soumission
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      console.log("Valeurs du formulaire:", values);

      if (!values.candidatId?.value || !values.entrepriseId?.value) {
        message.error("Veuillez sélectionner un candidat et une entreprise valides.");
        return;
      }

      const contratData = {
        titre: values.titre,
        user: values.candidatId.value,
        entreprise: values.entrepriseId.value,
        offre: sourceType === "offre" ? values.source?.value : null,
        entretien: sourceType === "announce" ? values.source?.value : null,
        typeContrat: values.typeContrat.toUpperCase(),
        dateDebut: values.dateDebut ? values.dateDebut.toISOString() : null,
        dateFin: values.dateFin ? values.dateFin.toISOString() : null,
        intitulePoste: values.intitulePoste,
        missions: [],
        tempsTravail: values.tempsTravail,
        salaire: values.salaire,
        modalitesPaiement: values.modalitesPaiement,
      };

      // Validate ObjectIds
      if (!isValidObjectId(contratData.user)) {
        message.error("ID du candidat invalide");
        setSubmitting(false);
        return;
      }
      if (!isValidObjectId(contratData.entreprise)) {
        message.error("ID de l'entreprise invalide");
        setSubmitting(false);
        return;
      }
      if (contratData.offre && !isValidObjectId(contratData.offre)) {
        message.error("ID de l’offre invalide");
        setSubmitting(false);
        return;
      }
      if (contratData.entretien && !isValidObjectId(contratData.entretien)) {
        message.error("ID de l’entretien invalide");
        setSubmitting(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Token d'authentification manquant");
        setSubmitting(false);
        return;
      }

      const url = contratId
        ? `http://localhost:5000/api/contrats/${contratId}`
        : "http://localhost:5000/api/contrats";
      const method = contratId ? axios.put : axios.post;
      const response = await method(url, contratData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      console.log("Réponse création/mise à jour contrat:", response.data);
      message.success(`Contrat ${contratId ? "mis à jour" : "créé"} avec succès`);
      navigate("/contrats");
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      message.error(err.response?.data?.message || "Erreur lors de l'enregistrement du contrat");
    } finally {
      setSubmitting(false);
    }
  };

  // Débogage de l'état announcements et candidats
  useEffect(() => {
    console.log("État announcements mis à jour:", announcements);
  }, [announcements]);

  useEffect(() => {
    console.log("État candidats mis à jour:", candidats);
  }, [candidats]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Row justify="center" style={{ marginTop: 24 }}>
        <Col xs={24} md={16} lg={12}>
          <Card
            title={
              <Space>
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate(-1)}
                  style={{ marginRight: 8 }}
                />
                <Title level={3} style={{ margin: 0 }}>
                  {contratId ? "Modifier le Contrat" : "Créer un Contrat"}
                </Title>
              </Space>
            }
            bordered={false}
            style={{
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                modalitesPaiement: "virement_bancaire",
                typeContrat: "cdi",
                sourceType: "offre",
              }}
            >
              <Form.Item
                label="Type de source"
                name="sourceType"
                rules={[{ required: true, message: "Veuillez sélectionner le type de source" }]}
              >
                <Radio.Group onChange={(e) => handleSourceTypeChange(e.target.value)}>
                  <Radio.Button value="offre">Offre</Radio.Button>
                  <Radio.Button value="announce">Annonce</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="source"
                label={sourceType === "offre" ? "Offre associée" : "Entretien de l'annonce"}
                rules={[{ required: true, message: "Veuillez sélectionner une source" }]}
              >
                {sourceType === "offre" ? (
                  loadingOffres ? (
                    <Skeleton.Input active style={{ width: "100%" }} />
                  ) : (
                    <Select
                      placeholder="Sélectionnez une offre"
                      onChange={handleSourceChange}
                      showSearch
                      optionFilterProp="label"
                      labelInValue
                      allowClear
                    >
                      {offres.map((offre) => (
                        <Option
                          key={offre._id}
                          value={offre._id}
                          label={`${offre.titre} - ${getEntrepriseNom(offre)}`}
                        >
                          {`${offre.titre} - ${getEntrepriseNom(offre)}`}
                        </Option>
                      ))}
                    </Select>
                  )
                ) : (
                  <Select
                    placeholder="Sélectionnez un entretien"
                    onChange={handleSourceChange}
                    showSearch
                    optionFilterProp="label"
                    labelInValue
                    allowClear
                    loading={loadingEntretiens}
                  >
                    {announcements.length > 0 ? (
                      announcements.map((entretien) => (
                        <Option
                          key={entretien._id}
                          value={entretien._id}
                          label={`Entretien avec ${entretien.candidat_id?.nom || "Inconnu"} ${
                            entretien.candidat_id?.prenom || ""
                          } - ${entretien.entreprise_id?.nomEntreprise || "Non spécifié"}`}
                        >
                          {`Entretien avec ${entretien.candidat_id?.nom || "Inconnu"} ${
                            entretien.candidat_id?.prenom || ""
                          } - ${entretien.entreprise_id?.nomEntreprise || "Non spécifié"}`}
                        </Option>
                      ))
                    ) : (
                      <Option disabled value="">
                        Aucun entretien disponible
                      </Option>
                    )}
                  </Select>
                )}
              </Form.Item>

              <Form.Item
                name="titre"
                label="Titre du contrat"
                rules={[{ required: true, message: "Ce champ est obligatoire" }]}
              >
                {loadingContrat ? (
                  <Skeleton.Input active style={{ width: "100%" }} />
                ) : (
                  <Input placeholder="Ex: Contrat de travail CDI" />
                )}
              </Form.Item>

              <Form.Item
                name="entrepriseId"
                label="Entreprise"
                rules={[{ required: true, message: "Ce champ est obligatoire" }]}
              >
                {loadingEntreprises ? (
                  <Skeleton.Input active style={{ width: "100%" }} />
                ) : (
                  <Select
                    placeholder="Sélectionnez une entreprise"
                    showSearch
                    optionFilterProp="children"
                    labelInValue
                    disabled={!!form.getFieldValue("source")}
                  >
                    {entreprises.map((entreprise) => (
                      <Option
                        key={entreprise._id}
                        value={entreprise._id}
                        label={entreprise.nomEntreprise}
                      >
                        {entreprise.nomEntreprise}
                      </Option>
                    ))}
                  </Select>
                )}
              </Form.Item>

              <Form.Item
                name="candidatId"
                label="Candidat"
                rules={[{ required: true, message: "Ce champ est obligatoire" }]}
              >
                {loadingEntretiens || !form.getFieldValue("source") ? (
                  <Skeleton.Input active style={{ width: "100%" }} />
                ) : candidats.length === 0 ? (
                  <Select placeholder="Aucun candidat disponible pour cette source" disabled />
                ) : (
                  <Select
                    placeholder="Sélectionnez un candidat"
                    disabled={!form.getFieldValue("source")}
                    labelInValue
                    showSearch
                    optionFilterProp="children"
                  >
                    {candidats.map((candidat) => (
                      <Option
                        key={candidat.id}
                        value={candidat.id}
                        label={`${candidat.nom} (${candidat.email})`}
                      >
                        {`${candidat.nom} (${candidat.email})`}
                      </Option>
                    ))}
                  </Select>
                )}
              </Form.Item>

              <Form.Item
                name="typeContrat"
                label="Type de contrat"
                rules={[{ required: true, message: "Ce champ est obligatoire" }]}
              >
                <Select>
                  <Option value="cdi">CDI</Option>
                  <Option value="cdd">CDD</Option>
                  <Option value="freelance">Freelance</Option>
                  <Option value="stage">Stage</Option>
                  <Option value="alternance">Alternance</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="dateDebut"
                label="Date de début"
                rules={[{ required: true, message: "Ce champ est obligatoire" }]}
              >
                {loadingContrat ? (
                  <Skeleton.Input active style={{ width: "100%" }} />
                ) : (
                  <DatePicker style={{ width: "100%" }} />
                )}
              </Form.Item>

              <Form.Item
                name="dateFin"
                label="Date de fin"
                dependencies={["typeContrat", "dateDebut"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue("typeContrat") === "cdi") return Promise.resolve();
                      if (!value)
                        return Promise.reject("La date de fin est requise pour ce type de contrat");
                      if (
                        value &&
                        getFieldValue("dateDebut") &&
                        value.isBefore(getFieldValue("dateDebut"))
                      ) {
                        return Promise.reject("La date de fin doit être après la date de début");
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                {loadingContrat ? (
                  <Skeleton.Input active style={{ width: "100%" }} />
                ) : (
                  <DatePicker
                    style={{ width: "100%" }}
                    disabled={form.getFieldValue("typeContrat") === "cdi"}
                  />
                )}
              </Form.Item>

              <Form.Item
                name="intitulePoste"
                label="Intitulé du poste"
                rules={[{ required: true, message: "Ce champ est obligatoire" }]}
              >
                {loadingContrat ? (
                  <Skeleton.Input active style={{ width: "100%" }} />
                ) : (
                  <Input placeholder="Ex: Développeur Full Stack" />
                )}
              </Form.Item>

              <Form.Item
                name="tempsTravail"
                label="Temps de travail"
                rules={[{ required: true, message: "Ce champ est obligatoire" }]}
              >
                <Input placeholder="Ex: 35 heures par semaine" />
              </Form.Item>

              <Form.Item
                name="salaire"
                label="Salaire"
                rules={[{ required: true, message: "Ce champ est obligatoire" }]}
              >
                <Input placeholder="Ex: 3000€ brut mensuel" />
              </Form.Item>

              <Form.Item
                name="modalitesPaiement"
                label="Modalités de paiement"
                rules={[{ required: true, message: "Ce champ est obligatoire" }]}
              >
                <Select>
                  <Option value="virement_bancaire">Virement bancaire</Option>
                  <Option value="cheque">Chèque</Option>
                  <Option value="especes">Espèces</Option>
                  <Option value="paypal">PayPal</Option>
                  <Option value="autre">Autre</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={submitting}
                >
                  {contratId ? "Mettre à jour le contrat" : "Créer le contrat"}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </DashboardLayout>
  );
};

export default CreateContrat;