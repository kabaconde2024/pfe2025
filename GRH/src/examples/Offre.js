import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "./LayoutContainers/DashboardLayout";
import DashboardNavbar from "./Navbars/DashboardNavbar";
import { jwtDecode } from "jwt-decode";
import moment from "moment";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Typography,
  Tag,
  message,
  Row,
  Col
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const Offre = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [competences, setCompetences] = useState([]);
  const [currentCompetence, setCurrentCompetence] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const token = localStorage.getItem("token");
  let userId = "";

  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      userId = decodedToken.id;
    } catch (error) {
      console.error("Erreur lors du décodage du token", error);
    }
  }

  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      const fetchOffreData = async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/offres/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            throw new Error("Erreur lors de la récupération de l'offre");
          }

          const offreData = await response.json();
          
          form.setFieldsValue({
            titre: offreData.titre,
            metier: offreData.metier,
            nombrePostes: offreData.nombrePostes,
            typeEmploi: offreData.typeEmploi,
            remuneration: offreData.remuneration,
            adresse: offreData.adresse,
            ville: offreData.ville,
            codePostal: offreData.codePostal,
            responsabilite: offreData.responsabilite,
            description: offreData.description,
            dateExpiration: moment(offreData.dateExpiration),
          });
          
          setCompetences(Array.isArray(offreData.competencesRequises) ? offreData.competencesRequises : []);
        } catch (error) {
          message.error(error.message);
          console.error(error);
        }
      };

      fetchOffreData();
    }
  }, [id, form, token]);

  const handleAddCompetence = () => {
    if (currentCompetence.trim() && !competences.includes(currentCompetence.trim())) {
      setCompetences([...competences, currentCompetence.trim()]);
      setCurrentCompetence("");
    }
  };

  const handleRemoveCompetence = (competenceToRemove) => {
    setCompetences(competences.filter(competence => competence !== competenceToRemove));
  };

  const handleSubmit = async (values) => {
    const data = {
      ...values,
      competencesRequises: competences,
      dateExpiration: values.dateExpiration.format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
      entreprise: userId,
    };

    const url = isEditMode ? `http://localhost:5000/api/offres/${id}` : "http://localhost:5000/api/offres/creer";
    const method = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'enregistrement de l'offre");
      }

      message.success(`Offre ${isEditMode ? "modifiée" : "créée"} avec succès !`);
      form.resetFields();
      setCompetences([]);
      navigate("/MesOffres");
    } catch (error) {
      message.error(error.message);
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate("/MesOffres")}
            style={{ marginBottom: 16 }}
          >
            Retour
          </Button>

          <Title level={2} style={{ textAlign: "center", marginBottom: 24 }}>
            {isEditMode ? "Modifier l'Offre" : "Ajouter une Offre"}
          </Title>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            <Form.Item
              label="Titre"
              name="titre"
              rules={[{ required: true, message: "Veuillez saisir le titre" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Métier"
              name="metier"
              rules={[{ required: true, message: "Veuillez saisir le métier" }]}
            >
              <Input />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Nombre de postes"
                  name="nombrePostes"
                  rules={[{ required: true, message: "Veuillez saisir le nombre de postes" }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Type d'emploi"
                  name="typeEmploi"
                  initialValue="Temps plein"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="CDD">CDD</Option>
                    <Option value="CDI">CDI</Option>
                    <Option value="Interim">Interim</Option>
                    <Option value="Temps plein">Temps plein</Option>
                    <Option value="Temps partiel">Temps partiel</Option>
                    <Option value="Freelance">Freelance</Option>
                    <Option value="Stage">Stage</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Rémunération"
              name="remuneration"
              rules={[{ required: true, message: "Veuillez saisir la rémunération" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Adresse"
              name="adresse"
              rules={[{ required: true, message: "Veuillez saisir l'adresse" }]}
            >
              <Input />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Ville"
                  name="ville"
                  rules={[{ required: true, message: "Veuillez saisir la ville" }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Code postal"
                  name="codePostal"
                  rules={[{ required: true, message: "Veuillez saisir le code postal" }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Responsabilités"
              name="responsabilite"
              rules={[{ required: true, message: "Veuillez saisir les responsabilités" }]}
            >
              <TextArea rows={3} />
            </Form.Item>

            <Form.Item label="Compétences requises">
              <div style={{ display: 'flex', marginBottom: 8 }}>
                <Input
                  value={currentCompetence}
                  onChange={(e) => setCurrentCompetence(e.target.value)}
                  onPressEnter={handleAddCompetence}
                  style={{ flex: 1 }}
                  placeholder="Ajouter une compétence"
                />
                <Button onClick={handleAddCompetence} style={{ marginLeft: 8 }}>
                  Ajouter
                </Button>
              </div>
              <div>
                {competences.map((competence, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => handleRemoveCompetence(competence)}
                    style={{ marginBottom: 4 }}
                  >
                    {competence}
                  </Tag>
                ))}
              </div>
            </Form.Item>

            <Form.Item
              label="Description du poste"
              name="description"
              rules={[{ required: true, message: "Veuillez saisir la description" }]}
            >
              <TextArea rows={4} />
            </Form.Item>

            <Form.Item
              label="Date d'expiration"
              name="dateExpiration"
              rules={[{ required: true, message: "Veuillez sélectionner une date" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large">
                {isEditMode ? "Modifier l'offre" : "Publier l'offre"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </DashboardLayout>
  );
};

Offre.propTypes = {
  onAddOffre: PropTypes.func,
};

export default Offre;