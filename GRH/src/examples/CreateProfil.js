import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Form, Input, message, Typography, Row, Col, Space, Upload, Tag } from "antd";
import { ArrowLeftOutlined, UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const { Title } = Typography;

const CreateProfil = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [competences, setCompetences] = useState([]);
  const [newCompetence, setNewCompetence] = useState("");

  const beforeUpload = (file) => {
    const isPDF = file.type === "application/pdf";
    const isLt5M = file.size / 1024 / 1024 < 5;
    
    if (!isPDF) {
      message.error("Seuls les fichiers PDF sont acceptés !");
      return Upload.LIST_IGNORE;
    }
    
    if (!isLt5M) {
      message.error("Le fichier ne doit pas dépasser 5MB !");
      return Upload.LIST_IGNORE;
    }
    
    return false;
  };

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleAddCompetence = () => {
    const trimmedCompetence = newCompetence.trim();
    if (trimmedCompetence && !competences.includes(trimmedCompetence)) {
      setCompetences([...competences, trimmedCompetence]);
      setNewCompetence("");
    }
  };

  const handleRemoveCompetence = (competence) => {
    setCompetences(competences.filter((c) => c !== competence));
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
  
      if (!token || !userId) {
        message.error("Veuillez vous connecter");
        navigate("/login");
        return;
      }
  
      if (competences.length === 0) {
        message.error("Veuillez ajouter au moins une compétence");
        return;
      }
  
      const formData = new FormData();
      formData.append("metier", values.metier.trim());
      formData.append("user", userId);
      
      // Envoyer chaque compétence individuellement
      competences.forEach((comp, index) => {
        formData.append(`competences[${index}]`, comp);
      });
  
      if (fileList[0]?.originFileObj) {
        formData.append("cv", fileList[0].originFileObj);
      }
  
      const response = await axios.post(
        "http://localhost:5000/api/profil_user", 
        formData, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 10000
        }
      );
  
      if (response.data.success) {
        message.success("Profil créé avec succès !");
        navigate("/mon-profil", { state: { refresh: true } });
      } else {
        message.error(response.data.message || "Erreur lors de la création");
      }
    } catch (error) {
      console.error("Erreur:", error);
      let errorMsg = "Erreur lors de la création";
      
      if (error.response) {
        errorMsg = error.response.data?.message || errorMsg;
        if (error.response.data?.errors) {
          errorMsg = Object.values(error.response.data.errors).join(", ");
        }
      } else if (error.message.includes("timeout")) {
        errorMsg = "La requête a pris trop de temps";
      }
  
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
                  icon={<ArrowLeftOutlined style={{ color: "#1890ff" }} />}
                  onClick={() => navigate(-1)}
                  style={{ marginRight: 8 }}
                />
                <Title level={3} style={{ margin: 0, color: "#1890ff" }}>
                  Créer mon profil professionnel
                </Title>
              </Space>
            }
            style={{ 
              borderRadius: 8, 
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label="Métier principal"
                name="metier"
                rules={[
                  { required: true, message: "Veuillez indiquer votre métier" },
                  { min: 3, message: "Minimum 3 caractères", whitespace: true }
                ]}
              >
                <Input placeholder="Ex: Développeur Fullstack" maxLength={50} showCount />
              </Form.Item>

              <Form.Item
                label="Compétences"
                required
                validateStatus={competences.length === 0 ? "error" : "success"}
                help={competences.length === 0 ? "Au moins une compétence est requise" : null}
              >
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    value={newCompetence}
                    onChange={(e) => setNewCompetence(e.target.value)}
                    placeholder="Ajouter une compétence"
                    onPressEnter={handleAddCompetence}
                    maxLength={50}
                    showCount
                  />
                  <Button 
                    type="primary" 
                    onClick={handleAddCompetence} 
                    disabled={!newCompetence.trim()}
                  >
                    Ajouter
                  </Button>
                </Space.Compact>
                <div style={{ marginTop: 8 }}>
                  {competences.map((competence) => (
                    <Tag
                      key={competence}
                      closable
                      onClose={() => handleRemoveCompetence(competence)}
                      style={{ marginBottom: 4, padding: "4px 8px", fontSize: "14px" }}
                    >
                      {competence}
                    </Tag>
                  ))}
                </div>
              </Form.Item>

              <Form.Item
                label="CV (PDF uniquement, max 5MB)"
                name="cv"
                rules={[
                  {
                    validator: () => fileList.length === 0 || fileList[0].originFileObj?.type === "application/pdf" 
                      ? Promise.resolve() 
                      : Promise.reject("Seuls les PDF sont acceptés")
                  }
                ]}
              >
                <Upload
                  beforeUpload={beforeUpload}
                  onChange={handleUploadChange}
                  fileList={fileList}
                  maxCount={1}
                  accept=".pdf"
                >
                  <Button icon={<UploadOutlined />}>Sélectionner un fichier</Button>
                </Upload>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  disabled={competences.length === 0}
                  size="large"
                >
                  Enregistrer mon profil
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </DashboardLayout>
  );
};

export default CreateProfil;