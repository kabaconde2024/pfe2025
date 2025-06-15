import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
    Button,
    Card,
    Select,
    Input,
    TimePicker,
    InputNumber,
    Tag,
    message,
    Spin,
    Form as AntForm,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const { Option } = Select;

const AjouterPointage = () => {
    const { contratId, pointageId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const initialValues = {
        typePointage: "",
        lieuPointage: "",
        heuresDebut: "",
        heuresFin: "",
        pauseDejeuner: "",
        heuresSupplementaires: 0,
        typeAbsence: [],
    };

    const validationSchema = Yup.object({
        typePointage: Yup.string().required("Le type de pointage est requis"),
        lieuPointage: Yup.string().required("Le lieu de pointage est requis"),
        heuresDebut: Yup.string().required("L'heure de début est requise"),
        heuresFin: Yup.string().required("L'heure de fin est requise"),
        pauseDejeuner: Yup.string().required("La pause déjeuner est requise"),
        heuresSupplementaires: Yup.number().min(0, "Les heures supplémentaires ne peuvent pas être négatives"),
        typeAbsence: Yup.array().of(Yup.string()),
    });

    useEffect(() => {
        const fetchPointageDetails = async () => {
            if (pointageId) {
                setLoading(true);
                const token = localStorage.getItem("token");
                try {
                    const response = await axios.get(`http://localhost:5000/api/pointage/${pointageId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    initialValues = response.data;
                } catch (error) {
                    message.error("Erreur lors du chargement du pointage.");
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchPointageDetails();
    }, [pointageId]);

    const handleSubmit = async (values) => {
        const token = localStorage.getItem("token");
        try {
            if (pointageId) {
                await axios.put(`http://localhost:5000/api/pointage/${pointageId}`, values, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                message.success("Pointage modifié avec succès !");
            } else {
                await axios.post(`http://localhost:5000/api/pointage`, { ...values, contrat: contratId }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                message.success("Pointage ajouté avec succès !");
            }
            navigate(`/contrat-details/${contratId}`);
        } catch (error) {
            message.error("Erreur lors de l'ajout du pointage.");
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <DashboardNavbar />
                <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                    <Spin size="large" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
                <Card
                    title={
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate(-1)}
                                style={{ marginRight: "8px" }}
                            />
                            <span>{pointageId ? "Modifier un Pointage" : "Ajouter un Pointage"}</span>
                        </div>
                    }
                    style={{ width: "600px" }} // Largeur fixe du formulaire
                >
                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={handleSubmit}
                    >
                        {({ values, setFieldValue }) => (
                            <AntForm layout="vertical">
                                <AntForm.Item label="Type de Pointage" required>
                                    <Field
                                        name="typePointage"
                                        as={Select}
                                        placeholder="Sélectionnez un type de pointage"
                                        onChange={(value) => setFieldValue("typePointage", value)}
                                        style={{ width: "100%" }} // Largeur réduite
                                    >
                                        <Option value="manuel">Manuel</Option>
                                        <Option value="electronique">Électronique</Option>
                                    </Field>
                                    <ErrorMessage name="typePointage" component="div" className="ant-form-item-explain-error" />
                                </AntForm.Item>

                                <AntForm.Item label="Lieu de Pointage" required>
                                    <Field
                                        name="lieuPointage"
                                        as={Input}
                                        placeholder="Entrez le lieu de pointage"
                                        onChange={(e) => setFieldValue("lieuPointage", e.target.value)}
                                        style={{ width: "100%" }} // Largeur réduite
                                    />
                                    <ErrorMessage name="lieuPointage" component="div" className="ant-form-item-explain-error" />
                                </AntForm.Item>

                                <AntForm.Item label="Heures de Début" required>
                                    <Field
                                        name="heuresDebut"
                                        as={TimePicker}
                                        format="HH:mm"
                                        placeholder="Sélectionnez l'heure de début"
                                        onChange={(time, timeString) => setFieldValue("heuresDebut", timeString)}
                                        style={{ width: "100%" }} // Largeur réduite
                                    />
                                    <ErrorMessage name="heuresDebut" component="div" className="ant-form-item-explain-error" />
                                </AntForm.Item>

                                <AntForm.Item label="Heures de Fin" required>
                                    <Field
                                        name="heuresFin"
                                        as={TimePicker}
                                        format="HH:mm"
                                        placeholder="Sélectionnez l'heure de fin"
                                        onChange={(time, timeString) => setFieldValue("heuresFin", timeString)}
                                        style={{ width: "100%" }} // Largeur réduite
                                    />
                                    <ErrorMessage name="heuresFin" component="div" className="ant-form-item-explain-error" />
                                </AntForm.Item>

                                <AntForm.Item label="Pause Déjeuner" required>
                                    <Field
                                        name="pauseDejeuner"
                                        as={Input}
                                        placeholder="Entrez la pause déjeuner (ex: 12:30-13:30)"
                                        onChange={(e) => setFieldValue("pauseDejeuner", e.target.value)}
                                        style={{ width: "100%" }} // Largeur réduite
                                    />
                                    <ErrorMessage name="pauseDejeuner" component="div" className="ant-form-item-explain-error" />
                                </AntForm.Item>

                                <AntForm.Item label="Heures Supplémentaires">
                                    <Field
                                        name="heuresSupplementaires"
                                        as={InputNumber}
                                        min={0}
                                        onChange={(value) => setFieldValue("heuresSupplementaires", value)}
                                        style={{ width: "100%" }} // Largeur réduite
                                    />
                                    <ErrorMessage name="heuresSupplementaires" component="div" className="ant-form-item-explain-error" />
                                </AntForm.Item>

                                <AntForm.Item label="Type d'Absence">
                                    <Field
                                        name="typeAbsence"
                                        as={Select}
                                        mode="multiple"
                                        placeholder="Sélectionnez le type d'absence"
                                        onChange={(value) => setFieldValue("typeAbsence", value)}
                                        tagRender={({ value, closable, onClose }) => (
                                            <Tag closable={closable} onClose={onClose} style={{ margin: "4px" }}>
                                                {value}
                                            </Tag>
                                        )}
                                        style={{ width: "100%" }} // Largeur réduite
                                    >
                                        <Option value="maladie">Maladie</Option>
                                        <Option value="congé payé">Congé Payé</Option>
                                        <Option value="autre">Autre</Option>
                                        <Option value="absent">Absent</Option>
                                    </Field>
                                    <ErrorMessage name="typeAbsence" component="div" className="ant-form-item-explain-error" />
                                </AntForm.Item>

                                <AntForm.Item>
                                    <Button type="primary" htmlType="submit" style={{ width: "100%" }}>
                                        {pointageId ? "Modifier Pointage" : "Ajouter Pointage"}
                                    </Button>
                                </AntForm.Item>
                            </AntForm>
                        )}
                    </Formik>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AjouterPointage;