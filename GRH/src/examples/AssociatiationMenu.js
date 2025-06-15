import { useState, useEffect } from "react";
import {
    Button,
    Card,
    Typography,
    message,
    Select,
    Spin,
    Tag,
    Row,
    Col,
    Divider,
    Layout,
    List,
    Avatar,
    Space,
    Input,
    Popconfirm,
    Badge,
} from "antd";
import { useNavigate } from "react-router-dom"; 
import axios from "axios";
import { FaArrowLeft, FaUser, FaList, FaSearch } from "react-icons/fa";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

const { Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const CreateMenu = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        id_profil: [],
        menuId: ""
    });

    const [profils, setProfils] = useState([]);
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [profilsResponse, menusResponse] = await Promise.all([
                    axios.get("http://localhost:5000/api/profils"),
                    axios.get("http://localhost:5000/api/menu")
                ]);
                setProfils(profilsResponse.data || []);
                setMenus(menusResponse.data.menus || []);
            } catch (error) {
                message.error("Erreur lors du chargement des données.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleChange = (value, name) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const showMessage = (type, content) => {
        message[type]({
            content,
            duration: 3,
            style: { marginTop: '50px' }
        });
    };

    const showSuccessMessage = () => {
        message.success("Opération effectuée avec succès !");
    };

    const handleAssociation = async (e) => {
        e.preventDefault();
        
        if (!formData.menuId) {
            showMessage('warning', "Veuillez sélectionner un menu");
            return;
        }

        if (formData.id_profil.length === 0) {
            showMessage('warning', "Veuillez sélectionner au moins un profil");
            return;
        }

        setProcessing(true);
        try {
            const response = await axios.post("http://localhost:5000/api/menu/associer-menu-profil", {
                id_profil: formData.id_profil,
                menuId: formData.menuId
            });

            if (response.data.success) {
                showSuccessMessage();
                
                // Mise à jour optimisée de l'état local
                setMenus(prevMenus => 
                    prevMenus.map(menu => 
                        menu._id === formData.menuId
                            ? { 
                                ...menu, 
                                profil: [...new Set([...menu.profil, ...formData.id_profil])] 
                              }
                            : menu
                    )
                );
                
                setFormData({ id_profil: [], menuId: "" });
            } else {
                showMessage('error', response.data.message || "Échec de l'association");
            }
        } catch (error) {
            console.error("Erreur d'association:", error);
            showMessage('error', error.response?.data?.message || "Échec de l'association");
        } finally {
            setProcessing(false);
        }
    };

    const handleDissociate = async (profilId, menuId) => {
        setProcessing(true);
        try {
            const response = await axios.post("http://localhost:5000/api/menu/dissocier-menu-profil", {
                profilId: profilId,
                menuId: menuId
            });

            if (response.data.success) {
                showSuccessMessage();
                
                // Mise à jour optimisée de l'état local
                setMenus(prevMenus => 
                    prevMenus.map(menu => 
                        menu._id === menuId
                            ? { 
                                ...menu, 
                                profil: menu.profil.filter(id => id !== profilId) 
                              }
                            : menu
                    )
                );
            } else {
                showMessage('error', response.data.message || "Échec de la dissociation");
            }
        } catch (error) {
            console.error("Erreur de dissociation:", error);
            showMessage('error', error.response?.data?.message || "Échec de la dissociation");
        } finally {
            setProcessing(false);
        }
    };

    const mapOptions = (data) => {
        return data?.map(item => ({
            value: item._id,
            label: item.name || item.nom || "Sans nom"
        })) || [];
    };

    const filteredMenus = menus.filter(menu => 
        menu?.nom?.toLowerCase().includes(searchText.toLowerCase())
    );

    const hasAssociatedProfiles = menus.some(menu => menu?.profil?.length > 0);

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
                <Card style={{ maxWidth: '1100px', margin: 'auto', borderRadius: '8px', border: 'none', boxShadow: 'none' }}>
                    <Button 
                        type="text" 
                        icon={<FaArrowLeft />} 
                        onClick={() => navigate('/ListeMenu')}
                        style={{ marginBottom: '16px', padding: 0 }}
                    >
                        Retour
                    </Button>
                    <Title level={3} style={{ marginBottom: '24px', color: '#1890ff' }}>
                        Association des menus aux profils
                    </Title>

                    {loading ? (
                        <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }} />
                    ) : (
                        <>
                            <form onSubmit={handleAssociation}>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={12}>
                                        <Text strong>Profils :</Text>
                                        <Select
                                            mode="multiple"
                                            options={mapOptions(profils)}
                                            value={formData.id_profil}
                                            onChange={(value) => handleChange(value, "id_profil")}
                                            placeholder="Sélectionnez des profils"
                                            style={{ width: '100%', marginTop: '8px' }}
                                            loading={loading}
                                        />
                                    </Col>

                                    <Col xs={24} md={12}>
                                        <Text strong>Menus :</Text>
                                        <Select
                                            options={mapOptions(menus)}
                                            value={formData.menuId}
                                            onChange={(value) => handleChange(value, "menuId")}
                                            placeholder="Sélectionnez un menu"
                                            style={{ width: '100%', marginTop: '8px' }}
                                            loading={loading}
                                        />
                                    </Col>
                                </Row>

                                <Row justify="end" style={{ marginTop: '24px' }}>
                                    <Col>
                                        <Button 
                                            type="primary" 
                                            htmlType="submit" 
                                            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', borderRadius: '5px' }}
                                            disabled={!formData.menuId || formData.id_profil.length === 0 || processing}
                                            loading={processing}
                                        >
                                            {processing ? 'Traitement en cours...' : 'Associer Profils'}
                                        </Button>
                                    </Col>
                                </Row>

                                {formData.id_profil.length > 0 && (
                                    <div style={{ marginTop: '24px', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '5px' }}>
                                        <Text strong>Profils sélectionnés :</Text>
                                        <Row gutter={[8, 8]} style={{ marginTop: '8px' }}>
                                            {formData.id_profil.map((profilId) => {
                                                const profil = profils.find(p => p._id === profilId);
                                                return profil ? (
                                                    <Col key={profil._id}>
                                                        <Tag 
                                                            color="blue"
                                                            style={{ borderRadius: '5px' }}
                                                        >
                                                            {profil.name}
                                                        </Tag>
                                                    </Col>
                                                ) : null;
                                            })}
                                        </Row>
                                    </div>
                                )}
                            </form>

                            <Divider style={{ margin: '30px 0', color: '#d9d9d9' }}>Profils associés aux menus</Divider>

                            <Search
                                placeholder="Rechercher un menu"
                                allowClear
                                enterButton={<FaSearch />}
                                size="large"
                                onChange={(e) => setSearchText(e.target.value)}
                                style={{ marginBottom: '16px', borderRadius: '5px' }}
                            />

                            {!hasAssociatedProfiles ? (
                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: '20px' }}>
                                    Aucun profil associé à vos menus.
                                </Text>
                            ) : (
                                <List
                                    dataSource={filteredMenus.filter(menu => menu?.profil?.length > 0)}
                                    renderItem={menu => (
                                        <List.Item key={menu._id}>
                                            <Card style={{ width: '100%', borderRadius: '8px' }}>
                                                <Row justify="space-between" align="middle">
                                                    <Col>
                                                        <Space>
                                                            <Avatar icon={<FaList />} style={{ backgroundColor: '#f0f0f0', color: '#1890ff' }} />
                                                            <Text strong>{menu.nom}</Text>
                                                            <Badge 
                                                                count={menu.profil.length} 
                                                                style={{ backgroundColor: '#1890ff', marginLeft: '8px' }} 
                                                            />
                                                        </Space>
                                                    </Col>
                                                    <Col>
                                                        <Row gutter={[8, 8]}>
                                                            {menu.profil.map(profilId => {
                                                                const profil = profils.find(p => p._id === profilId);
                                                                return profil ? (
                                                                    <Col key={profil._id}>
                                                                        <Popconfirm
                                                                            title="Êtes-vous sûr de vouloir dissocier ce profil ?"
                                                                            onConfirm={() => handleDissociate(profil._id, menu._id)}
                                                                            okText="Oui"
                                                                            cancelText="Non"
                                                                        >
                                                                            <Card
                                                                                size="small"
                                                                                style={{ width: '200px', borderRadius: '5px', cursor: 'pointer' }}
                                                                            >
                                                                                <Space>
                                                                                    <Avatar icon={<FaUser />} style={{ backgroundColor: '#f0f0f0', color: '#1890ff' }} />
                                                                                    <Text strong>{profil.name}</Text>
                                                                                </Space>
                                                                            </Card>
                                                                        </Popconfirm>
                                                                    </Col>
                                                                ) : null;
                                                            })}
                                                        </Row>
                                                    </Col>
                                                </Row>
                                            </Card>
                                        </List.Item>
       
                             )}
                                />
                            )}
                        </>
                    )}
                </Card>
            </Content>
        </DashboardLayout>
    );
};

export default CreateMenu;