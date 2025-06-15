import React, { useState, useEffect } from "react";
import { Input, Button, Card, Typography, Space, Form, DatePicker } from "antd";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { ArrowLeftOutlined } from "@ant-design/icons";

const { TextArea } = Input;

const AjouterAvenant = () => {
    const { contratId, avenantId } = useParams(); // Récupérer contratId et avenantId de l'URL
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        titre: '',      // Titre de l'avenant
        dateEffet: null,  // Date d'effet de l'avenant
        description: '', // Description de l'avenant
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [loadedContratId, setLoadedContratId] = useState(contratId); // Gérer le contratId dans le mode édition
    const isEditMode = !!avenantId; // Vérifier si nous sommes en mode édition

    // Charger les données de l'avenant en mode édition
    useEffect(() => {
        if (isEditMode) {
            const fetchAvenant = async () => {
                const token = localStorage.getItem("token");
                try {
                    const response = await axios.get(`http://localhost:5000/api/avenants/${avenantId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    // Pré-remplir le formulaire avec les données de l'avenant
                    setFormData(response.data);
                    setLoadedContratId(response.data.contrat); // Récupérer le contratId depuis l'avenant
                } catch (error) {
                    setError("Erreur lors du chargement de l'avenant.");
                    console.error(error);
                }
            };
            fetchAvenant();
        }
    }, [avenantId, isEditMode]);

    const handleChange = (value, field) => {
        setFormData((prevState) => ({ ...prevState, [field]: value }));
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        const token = localStorage.getItem("token");

        try {
            if (isEditMode) {
                // En mode édition, envoyer une requête PUT pour mettre à jour l'avenant
                await axios.put(`http://localhost:5000/api/avenants/${avenantId}`, { ...values }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            } else {
                // En mode ajout, envoyer une requête POST pour créer un nouvel avenant
                await axios.post(`http://localhost:5000/api/avenants`, { 
                    ...values, 
                    contrat: loadedContratId // Utilisation de loadedContratId pour l'ajout
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }
            // Rediriger vers la page des détails du contrat après l'ajout ou la modification
            if (loadedContratId) {
                navigate(`/contrat-details/${loadedContratId}`);
            } else {
                console.error("Erreur : loadedContratId est undefined");
            }
        } catch (error) {
            setError(isEditMode ? "Erreur lors de la modification de l'avenant." : "Erreur lors de l'ajout de l'avenant.");
            console.error("Erreur détaillée :", error.response?.data || error.message); // Affichez l'erreur détaillée
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <Card style={{ marginTop: '32px', maxWidth: '600px', margin: 'auto' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Space style={{ marginBottom: '16px' }}>
                        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                            Retour
                        </Button>
                        <Typography.Title level={4}>
                            {isEditMode ? "Modifier l'Avenant" : "Ajouter un Avenant"}
                        </Typography.Title>
                    </Space>
                    {error && <Typography.Text type="danger">{error}</Typography.Text>}
                    <Form
                        layout="vertical"
                        initialValues={formData}
                        onFinish={handleSubmit}
                    >
                        <Form.Item
                            label="Titre de l'avenant"
                            name="titre"
                            rules={[{ required: true, message: "Veuillez entrer le titre de l'avenant!" }]}
                        >
                            <Input onChange={(e) => handleChange(e.target.value, "titre")} />
                        </Form.Item>
                        <Form.Item
                            label="Date d'effet"
                            name="dateEffet"
                            rules={[{ required: true, message: "Veuillez sélectionner la date d'effet!" }]}
                        >
                            <DatePicker onChange={(date, dateString) => handleChange(dateString, "dateEffet")} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label="Description"
                            name="description"
                            rules={[{ required: true, message: "Veuillez entrer la description!" }]}
                        >
                            <TextArea onChange={(e) => handleChange(e.target.value, "description")} rows={4} />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {loading ? (isEditMode ? "Modification en cours..." : "Ajout en cours...") : (isEditMode ? "Modifier l'Avenant" : "Ajouter l'Avenant")}
                            </Button>
                        </Form.Item>
                    </Form>
                </Space>
            </Card>
        </DashboardLayout>
    );
};

export default AjouterAvenant;