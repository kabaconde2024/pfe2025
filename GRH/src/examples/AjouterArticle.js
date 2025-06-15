import React, { useEffect, useState } from "react";
import { Input, Button, Card, Typography, Space, Form, message } from "antd";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { ArrowLeftOutlined } from "@ant-design/icons";

const { TextArea } = Input;

const AjouterArticle = () => {
    const { contratId: contratIdFromParams, articleId } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [formData, setFormData] = useState({
        titreArticle: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [contratId, setContratId] = useState(contratIdFromParams);
    const isEditMode = !!articleId;

    // Charger les données de l'article en mode édition
    useEffect(() => {
        const fetchArticle = async () => {
            if (isEditMode) {
                const token = localStorage.getItem("token");
                if (!token) {
                    setError("Authentification requise");
                    return;
                }
                try {
                    const response = await axios.get(`http://localhost:5000/api/articles/${articleId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    const articleData = response.data.data || response.data;
                    setFormData({
                        titreArticle: articleData.titreArticle || '',
                        description: articleData.description || ''
                    });
                    setContratId(articleData.contrat?._id || contratIdFromParams);
                    form.setFieldsValue({
                        titreArticle: articleData.titreArticle || '',
                        description: articleData.description || ''
                    });
                } catch (error) {
                    message.error("Erreur lors du chargement de l'article.");
                    console.error("Fetch Article Error:", error.response ? error.response.data : error.message);
                    setError("Erreur lors du chargement de l'article");
                }
            }
        };

        fetchArticle();
    }, [articleId, isEditMode, form, contratIdFromParams]);

    const handleChange = (value, field) => {
        setFormData({ ...formData, [field]: value });
    };

    const updatePDF = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            message.error("Authentification requise");
            return;
        }
        try {
            // Récupérer le contrat pour vérifier s'il est publié
            const response = await axios.get(`http://localhost:5000/api/contrats/${contratId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const contrat = response.data.data;
            if (!contrat?.published) {
                return; // Ne pas mettre à jour le PDF si le contrat n'est pas publié
            }

            // Appeler l'endpoint pour mettre à jour le PDF
            await axios.put(`http://localhost:5000/api/contrats/${contratId}/update-pdf`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            message.success("PDF mis à jour avec succès");
        } catch (error) {
            console.error("Erreur lors de la mise à jour du PDF:", error);
            message.error(error.response?.data?.message || "Erreur lors de la mise à jour du PDF");
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
            setError("Authentification requise");
            setLoading(false);
            return;
        }
        try {
            if (isEditMode) {
                const response = await axios.put(`http://localhost:5000/api/articles/${articleId}`, {
                    titreArticle: values.titreArticle,
                    description: values.description,
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                message.success("Article modifié avec succès !");
                await updatePDF(); // Mettre à jour le PDF après modification
            } else {
                const response = await axios.post(`http://localhost:5000/api/articles`, {
                    titreArticle: values.titreArticle,
                    description: values.description,
                    contrat: contratId
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                message.success("Article ajouté avec succès !");
                await updatePDF(); // Mettre à jour le PDF après ajout
            }

            if (contratId) {
                navigate(`/contrat-details/${contratId}`);
            } else {
                setError("ID du contrat non défini.");
            }
        } catch (error) {
            message.error(isEditMode ? "Erreur lors de la modification de l'article." : "Erreur lors de l'ajout de l'article.");
            console.error("Erreur détaillée :", error.response?.data || error.message);
            setError(error.response?.data?.message || "Erreur lors de l'opération");
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
                    </Space>
                    <Typography.Title level={4} style={{ textAlign: 'center' }}>
                        {isEditMode ? "Modifier l'Article" : "Ajouter un Article"}
                    </Typography.Title>
                    {error && <Typography.Text type="danger">{error}</Typography.Text>}
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={formData}
                    >
                        <Form.Item
                            label="Titre de l'article"
                            name="titreArticle"
                            rules={[{ required: true, message: "Veuillez entrer le titre de l'article!" }]}
                        >
                            <Input
                                onChange={(e) => handleChange(e.target.value, "titreArticle")}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Description"
                            name="description"
                            rules={[{ required: true, message: "Veuillez entrer la description!" }]}
                        >
                            <TextArea
                                onChange={(e) => handleChange(e.target.value, "description")}
                                rows={4}
                            />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {loading ? (isEditMode ? "Modification en cours..." : "Ajout en cours...") : (isEditMode ? "Modifier l'Article" : "Ajouter l'Article")}
                            </Button>
                        </Form.Item>
                    </Form>
                </Space>
            </Card>
        </DashboardLayout>
    );
};

export default AjouterArticle;