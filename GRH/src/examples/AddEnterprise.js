import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, message, Card } from 'antd';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { ArrowLeftOutlined } from '@ant-design/icons'; // Import de l'icône de flèche gauche

// Liste simplifiée de pays
const countryList = [
    'Afghanistan', 'Albanie', 'Algérie', 'Andorre', 'Angola', 'Antigua-et-Barbuda',
    'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan', 'Bahamas',
    'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Bélarus', 'Bénin',
    'Bhoutan', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana', 'Brésil', 'Brunei',
    'Bulgarie', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodge', 'Cameroun',
    'Canada', 'Centrafrique', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
    'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', 'Croatie', 'Cuba',
    'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'El Salvador', 'Équateur',
    'Érythrée', 'Espagne', 'Estonie', 'Eswatini', 'États-Unis', 'Fidji',
    'Finlande', 'France', 'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce',
    'Grenade', 'Guatemala', 'Guinée', 'Guinée-Bissau', 'Guinée équatoriale',
    'Haïti', 'Honduras', 'Hongrie', 'Inde', 'Indonésie', 'Irak', 'Iran',
    'Irlande', 'Islande', 'Israël', 'Italie', 'Jamaïque', 'Japon', 'Jordanie',
    'Kazakhstan', 'Kenya', 'Kirghizistan', 'Kiribati', 'Koweït', 'Laos',
    'Lesotho', 'Lettonie', 'Liban', 'Liberia', 'Libye', 'Lituanie', 'Luxembourg',
    'Madagascar', 'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte', 'Maroc',
    'Maurice', 'Mauritanie', 'Mexique', 'Micronésie', 'Moldavie', 'Monaco',
    'Mongolie', 'Mozambique', 'Namibie', 'Nauru', 'Népal', 'Nicaragua', 'Niger',
    'Nigéria', 'Norvège', 'Nouvelle-Zélande', 'Oman', 'Panama', 'Papouasie-Nouvelle-Guinée',
    'Paraguay', 'Pays-Bas', 'Perou', 'Philippines', 'Pologne', 'Portugal',
    'Qatar', 'République centrafricaine', 'République dominicaine', 'République tchèque',
    'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda', 'Sao Tomé et Principe',
    'Arabie Saoudite', 'République Sud-Africaine', 'Sénégal', 'Serbie', 'Seychelles',
    'Sierra Leone', 'Singapour', 'Slovaquie', 'Slovénie', 'Somalie', 'Soudan',
    'Sri Lanka', 'Suisse', 'Suriname', 'Syrie', 'Tadjikistan', 'Tanzanie',
    'Thaïlande', 'Togo', 'Tonga', 'Trinité-et-Tobago', 'Tunisie', 'Turkménistan',
    'Turquie', 'Tuvalu', 'Ukraine', 'Uruguay', 'Vanuatu', 'Vatican', 'Venezuela',
    'Viêt Nam', 'Yémen', 'Zambie', 'Zimbabwe'
];

const { Option } = Select;

const AddEnterprise = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Récupérer l'ID de l'URL si présent
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [utilisateurs, setUtilisateurs] = useState([]); // État pour stocker les utilisateurs

    // Fonction pour récupérer les en-têtes d'authentification
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token'); // Récupérez le token depuis le stockage local
        return {
            Authorization: `Bearer ${token}`,
        };
    };

    // Récupérer les utilisateurs et les données de l'entreprise si on modifie
    useEffect(() => {
        const fetchUtilisateurs = async () => {
            try {
                const headers = getAuthHeaders(); // Ajoutez les en-têtes d'authentification
                const response = await axios.get('http://localhost:5000/api/users', { headers });
                console.log('Utilisateurs récupérés:', response.data); // Log pour déboguer

                // Filtrer les utilisateurs pour ne garder que ceux avec un profil "Entreprise"
                const utilisateursFiltres = response.data.filter((user) => {
                    return user.profils.some((profil) => profil.name === "Entreprise");
                });

                console.log('Utilisateurs filtrés:', utilisateursFiltres); // Log pour déboguer
                setUtilisateurs(utilisateursFiltres);
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    message.error("Session expirée. Veuillez vous reconnecter.");
                    navigate('/login'); // Redirigez vers la page de connexion
                } else {
                    message.error("Erreur lors de la récupération des utilisateurs.");
                    console.error('Erreur:', error);
                }
            }
        };

        fetchUtilisateurs();

        if (id) {
            const fetchEntrepriseData = async () => {
                setLoading(true);
                try {
                    const headers = getAuthHeaders(); // Ajoutez les en-têtes d'authentification
                    const response = await axios.get(`http://localhost:5000/api/entreprises/${id}`, { headers });
                    console.log('Données de l\'entreprise:', response.data); // Log pour déboguer
                    const { nom, adresse, email, telephone, pays, codePostal, responsable } = response.data;
                    form.setFieldsValue({
                        nom,
                        adresse,
                        email,
                        telephone,
                        pays,
                        codePostal,
                        responsable // Assurez-vous que cette clé correspond à `name` dans le `Form.Item`
                    });
                } catch (error) {
                    if (error.response && error.response.status === 401) {
                        message.error("Session expirée. Veuillez vous reconnecter.");
                        navigate('/authentification/sign-in'); // Redirigez vers la page de connexion
                    } else {
                        message.error("Erreur lors du chargement des données de l'entreprise.");
                        console.error('Erreur:', error);
                    }
                } finally {
                    setLoading(false);
                }
            };

            fetchEntrepriseData();
        }
    }, [id, form, navigate]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const headers = getAuthHeaders(); // Ajoutez les en-têtes d'authentification
            const utilisateurId = values.responsable; // Récupérez l'utilisateur sélectionné
            if (id) {
                await axios.put(`http://localhost:5000/api/entreprises/${id}`, { ...values, utilisateurId, offres: [] }, { headers });
                message.success("Entreprise modifiée avec succès !");
            } else {
                await axios.post('http://localhost:5000/api/entreprises', { ...values, utilisateurId, offres: [] }, { headers });
                message.success("Entreprise ajoutée avec succès !");
            }
            navigate('/entreprises'); // Redirige vers la liste des entreprises
        } catch (error) {
            if (error.response && error.response.status === 401) {
                message.error("Session expirée. Veuillez vous reconnecter.");
                navigate('/login'); // Redirigez vers la page de connexion
            } else {
                message.error("Erreur lors de l'ajout de l'entreprise !");
                console.error('Erreur:', error.response ? error.response.data.message : error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <div style={{ padding: '50px', display: 'flex', justifyContent: 'center' }}>
                <Card 
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button 
                                type="text" 
                                icon={<ArrowLeftOutlined />} 
                                onClick={() => navigate('/entreprises')} 
                                style={{ marginRight: '10px' }}
                            />
                            {id ? "Modifier une entreprise" : "Ajouter une entreprise"}
                        </div>
                    } 
                    style={{ width: 600 }}
                >
                    <Form
                        form={form}
                        name="add-enterprise"
                        layout="vertical"
                        onFinish={onFinish}
                    >
                        <Form.Item
                            label="Nom de l'entreprise"
                            name="nom"
                            rules={[{ required: true, message: "Veuillez entrer le nom de l'entreprise !" }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Adresse"
                            name="adresse"
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                { required: true, message: "Veuillez entrer l'email de l'entreprise !" },
                                { type: 'email', message: "Entrez un email valide !" }
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Numéro de téléphone"
                            name="telephone"
                            rules={[
                                { required: true, message: "Veuillez entrer le numéro de téléphone !" },
                                { pattern: /^[0-9]*$/, message: "Le numéro de téléphone doit contenir uniquement des chiffres !" }
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Pays"
                            name="pays"
                            rules={[{ required: true, message: "Veuillez sélectionner un pays !" }]}
                        >
                            <Select 
                                placeholder="Sélectionnez un pays" 
                                showSearch
                                optionFilterProp="children"
                            >
                                {countryList.map((country) => (
                                    <Option key={country} value={country}>
                                        {country}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="Code Postal"
                            name="codePostal"
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Responsable"
                            name="responsable" // Assurez-vous que cette clé correspond à la clé dans la base de données
                            rules={[{ required: true, message: "Veuillez sélectionner un utilisateur !" }]}
                        >
                            <Select placeholder="Sélectionnez un utilisateur">
                                {utilisateurs.map((user) => (
                                    <Option key={user._id} value={user._id}>
                                        {user.nom}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {id ? "Modifier l'entreprise" : "Ajouter l'entreprise"}
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AddEnterprise;