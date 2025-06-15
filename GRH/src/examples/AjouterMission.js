import React, { useEffect, useState } from "react";
import { Input, Button, Card, Typography, Space, Form, message, DatePicker, Select } from "antd";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { ArrowLeftOutlined } from "@ant-design/icons";
import moment from "moment";

const { TextArea } = Input;
const { Option } = Select;

const AjouterMission = () => {
    const { missionId, contratId } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [contrat, setContrat] = useState(null); // Added to store contract details
    const isEditMode = !!missionId;

    // Fetch mission details if in edit mode
    useEffect(() => {
        if (isEditMode) {
            const fetchMission = async () => {
                const token = localStorage.getItem("token");
                try {
                    const response = await axios.get(`http://localhost:5000/api/missions/${missionId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    form.setFieldsValue({
                        titre: response.data.titre,
                        description: response.data.description,
                        dateDebut: response.data.dateDebut ? moment(response.data.dateDebut) : null,
                        dateFin: response.data.dateFin ? moment(response.data.dateFin) : null,
                        statut: response.data.statut,
                        commentaires: response.data.commentaires
                    });
                } catch (err) {
                    message.error("Erreur lors du chargement de la mission");
                }
            };
            fetchMission();
        }
    }, [missionId, isEditMode, form]);

    // Fetch contract details to check start date
    useEffect(() => {
        const fetchContrat = async () => {
            const token = localStorage.getItem("token");
            try {
                const response = await axios.get(`http://localhost:5000/api/contrats/${contratId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setContrat(response.data);
            } catch (err) {
                message.error("Erreur lors du chargement du contrat");
                setError("Impossible de vérifier les détails du contrat");
            }
        };
        fetchContrat();
    }, [contratId]);

    const handleFinish = async (values) => {
        setLoading(true);
        const token = localStorage.getItem("token");
        try {
            // Check if contract exists and has started
            if (!contrat) {
                throw new Error("Détails du contrat non disponibles");
            }
            const currentDate = moment().startOf('day');
            const contratStartDate = moment(contrat.dateDebut).startOf('day');
            if (currentDate.isBefore(contratStartDate)) {
                throw new Error("Le contrat n'a pas encore débuté. Vous ne pouvez pas ajouter de mission.");
            }

            const payload = {
                titre: values.titre,
                description: values.description,
                dateDebut: values.dateDebut ? values.dateDebut.toISOString() : null,
                dateFin: values.dateFin ? values.dateFin.toISOString() : null,
                statut: values.statut,
                commentaires: values.commentaires,
                contrat: contratId
            };

            if (isEditMode) {
                await axios.put(`http://localhost:5000/api/missions/${missionId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success("Mission modifiée avec succès !");
            } else {
                await axios.post(`http://localhost:5000/api/missions`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                message.success("Mission ajoutée avec succès !");
            }
            navigate('/contrat_entreprise');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || (isEditMode ? "Erreur lors de la modification" : "Erreur lors de l'ajout");
            message.error(errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <Card style={{ marginTop: 32, maxWidth: 700, margin: 'auto' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                        Retour
                    </Button>
                    <Typography.Title level={4} style={{ textAlign: 'center' }}>
                        {isEditMode ? "Modifier la Mission" : "Ajouter une Mission"}
                    </Typography.Title>
                    {error && (
                        <Typography.Text type="danger" style={{ textAlign: 'center' }}>
                            {error}
                        </Typography.Text>
                    )}
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFinish}
                        initialValues={{
                            statut: "À faire"
                        }}
                    >
                        <Form.Item
                            label="Titre"
                            name="titre"
                            rules={[{ required: true, message: 'Veuillez entrer le titre' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label="Description"
                            name="description"
                            rules={[{ required: true, message: 'Veuillez entrer la description' }]}
                        >
                            <TextArea rows={4} />
                        </Form.Item>
                        <Form.Item
                            label="Date de début"
                            name="dateDebut"
                            rules={[{ required: true, message: 'Sélectionnez la date de début' }]}
                        >
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label="Date de fin"
                            name="dateFin"
                        >
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                            label="Statut"
                            name="statut"
                        >
                            <Select>
                                <Option value="À faire">À faire</Option>
                                <Option value="En cours">En cours</Option>
                                <Option value="Terminée">Terminée</Option>
                                <Option value="Annulée">Annulée</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label="Commentaires"
                            name="commentaires"
                        >
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {isEditMode ? "Modifier la Mission" : "Ajouter la Mission"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Space>
            </Card>
        </DashboardLayout>
    );
};

export default AjouterMission;
