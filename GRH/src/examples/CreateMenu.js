import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Select,
  Form,
  Input,
  Card,
  Typography,
  message,
  Spin,
} from "antd";
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import * as Icons from '@ant-design/icons';

const { Option } = Select; // Cette ligne est très importante

const CreateMenu = () => {
  const navigate = useNavigate();
  const { menuId } = useParams();
  const [form] = Form.useForm();

  const [formData, setFormData] = useState({
    nom: "",
    route: "",
    parent: "",
    menuType: "menu",
    iconUrl: ""
  });

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/menu");
        setMenus(response.data.menus || []);
      } catch (error) {
        console.error("Erreur lors du chargement des menus :", error);
        message.error("Erreur lors du chargement des menus.");
      }
    };

    const fetchMenuData = async () => {
      if (menuId) {
        try {
          const responseSubMenu = await axios.get(`http://localhost:5000/api/menu/sous-menu/${menuId}`);
          const parentMenuId = responseSubMenu.data.parent;
          const newData = {
            nom: responseSubMenu.data.nom || "",
            route: responseSubMenu.data.route || "",
            parent: parentMenuId || "",
            menuType: "sous-menu",
            iconUrl: responseSubMenu.data.iconUrl || ""
          };
          form.setFieldsValue(newData);
          setFormData(newData);
        } catch (error) {
          if (error.response?.status === 404) {
            try {
              const responseMenu = await axios.get(`http://localhost:5000/api/menu/${menuId}`);
              const newData = {
                nom: responseMenu.data.nom || "",
                route: responseMenu.data.route || "",
                parent: "",
                menuType: "menu",
                iconUrl: responseMenu.data.iconUrl || ""
              };
              form.setFieldsValue(newData);
              setFormData(newData);
            } catch (error) {
              message.error("Erreur lors du chargement du menu.");
            }
          } else {
            message.error("Erreur lors du chargement du sous-menu.");
          }
        }
      }
    };

    fetchMenus();
    fetchMenuData();
  }, [menuId, form]);

  const handleChange = (value, field) => {
    const newData = { 
      ...formData, 
      [field]: value,
      ...(field === "menuType" && { 
        ...(value === "sous-menu" ? { iconUrl: "" } : { parent: "" })
      })
    };
    setFormData(newData);
    form.setFieldsValue(newData);
  };

  const handleCreateFile = async (targetFileName) => {
    const content = `// Fichier créé pour le ${targetFileName}\n\n// Ajoutez ici le code spécifique à votre menu.`;
    
    try {
      await axios.post('http://localhost:5000/api/profils/create-file', {
        targetFileName,
        content,
      });
    } catch (error) {
      console.error("Erreur lors de la création du fichier:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      setLoading(true);
      
      const token = localStorage.getItem("token");
      const isSubMenu = formData.menuType === "sous-menu";
      const url = menuId 
        ? (isSubMenu 
          ? `http://localhost:5000/api/menu/sous-menu/${menuId}`
          : `http://localhost:5000/api/menu/${menuId}`) 
        : "http://localhost:5000/api/menu";
        
      const method = menuId ? 'put' : 'post';
      const payload = { ...formData };
      if (!isSubMenu) payload.parent = null;

      const response = await axios[method](url, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if ([200, 201].includes(response.status)) {
        message.success(`Menu ${menuId ? "modifié" : "créé"} avec succès !`);
        
        if (formData.route) {
          await handleCreateFile(formData.route);
        }

        navigate('/ListeMenu');
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data?.message || "Erreur lors de l'enregistrement.");
      } else if (!error.message.includes("validateFields")) {
        message.error("Erreur de connexion au serveur.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Card style={{ margin: '32px auto', maxWidth: '600px', padding: 20 }}>
        <Button 
          type="primary" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/ListeMenu')}
          style={{ marginBottom: 20 }} 
        >
          Retour
        </Button>
        <Typography.Title level={4} style={{ marginBottom: 20 }}>
          {menuId ? "Modifier un Menu/Sous-Menu" : "Créer un Menu/Sous-Menu"}
        </Typography.Title>

        <Spin spinning={loading}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item 
              label="Type de Menu" 
              name="menuType"
              rules={[{ required: true, message: 'Veuillez sélectionner un type!' }]}
            >
              <Select onChange={(value) => handleChange(value, 'menuType')}>
                <Option value="menu">Menu</Option>
                <Option value="sous-menu">Sous-Menu</Option>
              </Select>
            </Form.Item>

            <Form.Item 
              label="Nom du Menu"
              name="nom"
              rules={[{ required: true, message: 'Veuillez entrer le nom du menu!' }]}
            >
              <Input 
                onChange={(e) => handleChange(e.target.value, 'nom')}
                placeholder="Entrez le nom du menu" 
              />
            </Form.Item>

            <Form.Item 
              label="Cible"
              name="route"
              rules={[{ required: true, message: 'Veuillez entrer la route du menu!' }]}
            >
              <Input 
                onChange={(e) => handleChange(e.target.value, 'route')}
                placeholder="Entrez la route du menu" 
              />
            </Form.Item>

            {formData.menuType === "menu" && (
              <Form.Item 
                label="Icône" 
                name="iconUrl"
                rules={[{ required: true, message: 'Veuillez entrer le nom de l\'icône!' }]}
              >
                <Input 
                  onChange={(e) => handleChange(e.target.value, 'iconUrl')}
                  placeholder="Entrez le nom de l'icône" 
                />
                <Typography.Paragraph style={{ marginTop: 10 }}>
                  Vous pouvez rechercher des icônes disponibles <a href="https://ant.design/components/icon" target="_blank" rel="noopener noreferrer">ici</a>.
                </Typography.Paragraph>
              </Form.Item>
            )}

            {formData.menuType === "sous-menu" && (
              <Form.Item 
                label="Menu Parent"
                name="parent"
                rules={[{ required: true, message: 'Veuillez sélectionner un menu parent!' }]}
              >
                <Select
                  onChange={(value) => handleChange(value, 'parent')}
                  placeholder="Sélectionnez un menu parent"
                >
                  {menus.map(menu => (
                    <Option key={menu._id} value={menu._id}>
                      {menu.nom}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Button 
              type="primary" 
              htmlType="submit"
              style={{ width: '100%', marginTop: 16 }}
              loading={loading}
            >
              {menuId ? "Modifier" : "Créer"}
            </Button>
          </Form>
        </Spin>
      </Card>
    </DashboardLayout>
  );
};

CreateMenu.propTypes = {
  // Pas de props supplémentaires requises dans ce contexte
};

export default CreateMenu;