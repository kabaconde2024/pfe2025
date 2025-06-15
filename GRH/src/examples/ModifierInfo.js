import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import DashboardLayout from "../examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "../examples/Navbars/DashboardNavbar";
import { Container } from "@mui/material";
import { 
  Form,
  Input,
  Button,
  Row,
  Col,
  Divider,
  Spin,
  Alert,
  notification,
  Select,
  DatePicker,
  Upload
} from 'antd';
import { 
  ShopOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  SaveOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  UserOutlined,
  MailOutlined,
  UploadOutlined
} from '@ant-design/icons';
import moment from 'moment';

const ModifierInfo = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form] = Form.useForm();
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();
  const [fileList, setFileList] = useState([]);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Session expirée, veuillez vous reconnecter");
      }

      const response = await fetch("http://localhost:5000/api/utilisateur/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/authentification/sign-in");
          return;
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      const isCandidat = data.profils.some(profil => profil.name === 'Candidat');
      const isEntreprise = data.profils.some(profil => profil.name === 'Entreprise');
      setUserProfile(isCandidat ? 'Candidat' : isEntreprise ? 'Entreprise' : null);

      // Pre-fill form based on profile
      if (isCandidat) {
        form.setFieldsValue({
          nom: data.nom?.trim() || '', // Added nom field
          telephone: data.telephone?.trim() || '',
          pays: data.pays?.trim() || '',
          codePostal: data.codePostal?.trim() || '',
          ville: data.ville?.trim() || '',
          adresse: data.adresse?.trim() || '',
          dateNaissance: data.dateNaissance ? moment(data.dateNaissance) : null,
          photoProfil: data.photoProfil ? [{ uid: '-1', name: 'photo.jpg', status: 'done', url: data.photoProfil }] : []
        });
        setFileList(data.photoProfil ? [{ uid: '-1', name: 'photo.jpg', status: 'done', url: data.photoProfil }] : []);
      } else if (isEntreprise) {
        form.setFieldsValue({
          nom: data.nom?.trim() || '',
          email: data.email?.trim() || '',
          nomEntreprise: data.nomEntreprise?.trim() || '',
          adresseEntreprise: data.adresseEntreprise?.trim() || '',
          telephoneEntreprise: data.telephoneEntreprise?.trim() || '',
          paysEntreprise: data.paysEntreprise?.trim() || '',
          codePostalEntreprise: data.codePostalEntreprise?.trim() || '',
          secteurActivite: data.secteurActivite || 'Autre',
          photoProfil: data.photoProfil ? [{ uid: '-1', name: 'photo.jpg', status: 'done', url: data.photoProfil }] : []
        });
        setFileList(data.photoProfil ? [{ uid: '-1', name: 'photo.jpg', status: 'done', url: data.photoProfil }] : []);
      }
    } catch (error) {
      console.error("Erreur de récupération:", error);
      setError(error.message);
      notification.error({
        message: 'Erreur',
        description: "Impossible de charger les informations",
        duration: 4
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Session expirée, veuillez vous reconnecter");
      }

      // Trim all string values and prepare photoProfil
      const sanitizedValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value
        ])
      );

      // Include photoProfil from fileList
      sanitizedValues.photoProfil = fileList.length > 0 && fileList[0].url ? fileList[0].url : undefined;

      const endpoint = userProfile === 'Candidat' 
        ? 'http://localhost:5000/api/utilisateur/update/candidat'
        : 'http://localhost:5000/api/utilisateur/update/entreprise';

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sanitizedValues)
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/authentification/sign-in");
          return;
        }
        if (response.status === 403) {
          throw new Error("Accès refusé. Profil non autorisé.");
        }
        throw new Error(`Erreur ${response.status}`);
      }

      await response.json();
      
      notification.success({
        message: 'Succès',
        description: 'Modifications enregistrées avec succès',
        duration: 2
      });

      setTimeout(() => {
        navigate(userProfile === 'Candidat' ? '/InfoCandidat' : '/InfoEntreprise');
      }, 2000);

    } catch (error) {
      console.error("Erreur de modification:", error);
      notification.error({
        message: 'Erreur',
        description: error.message || "Échec de la mise à jour des informations",
        duration: 4
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = ({ file, onSuccess, onError }) => {
    // Convertir l'image en base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      // Valider le format
      const base64Regex = /^data:image\/(jpeg|png);base64,/;
      if (!base64Regex.test(base64String)) {
        onError(new Error('Format d’image invalide. Utilisez JPEG ou PNG.'));
        notification.error({
          message: 'Erreur',
          description: 'Format d’image invalide. Utilisez JPEG ou PNG.',
          duration: 4
        });
        return;
      }
      // Vérifier la taille (limite à ~1MB)
      const base64Data = base64String.split(',')[1];
      // Estimer la taille décodée: base64 gonfle les données de ~33%, donc taille ≈ (length * 3) / 4
      const estimatedSize = (base64Data.length * 3) / 4;
      if (estimatedSize > 1 * 1024 * 1024) {
        onError(new Error('L’image est trop volumineuse (limite: 1MB).'));
        notification.error({
          message: 'Erreur',
          description: 'L’image est trop volumineuse (limite: 1MB).',
          duration: 4
        });
        return;
      }
      setFileList([{ uid: file.uid, name: file.name, status: 'done', url: base64String }]);
      onSuccess();
    };
    reader.onerror = () => {
      onError(new Error('Erreur lors du chargement de l’image.'));
      notification.error({
        message: 'Erreur',
        description: 'Erreur lors du chargement de l’image.',
        duration: 4
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setFileList([]);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <Container sx={{ mt: 15, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container sx={{ mt: 15, mb: 4, maxWidth: 'lg' }}>
        {error && (
          <Alert
            message="Erreur"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 24 }}
          />
        )}
        
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="photoProfil"
            label="Photo de profil"
            rules={[{ required: false }]}
          >
            <Upload
              fileList={fileList}
              customRequest={handleUpload}
              onRemove={handleRemove}
              accept="image/jpeg,image/png"
              maxCount={1}
              listType="picture"
            >
              <Button icon={<UploadOutlined />}>Charger une photo (JPEG/PNG, max 1MB)</Button>
            </Upload>
          </Form.Item>

          {userProfile === 'Candidat' ? (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="nom"
                    label="Nom"
                    rules={[{ required: true, message: 'Ce champ est obligatoire' }]}
                  >
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="telephone"
                    label="Téléphone"
                    rules={[
                      { required: false },
                      { 
                        pattern: /^[0-9\s\+\-\.]{6,20}$/,
                        message: 'Format de téléphone invalide' 
                      }
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="Optionnel" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="pays"
                    label="Pays"
                    rules={[{ required: false }]}
                  >
                    <Input prefix={<GlobalOutlined />} placeholder="Optionnel" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="codePostal"
                    label="Code postal"
                    rules={[
                      { required: false },
                      { 
                        pattern: /^[a-zA-Z0-9\s\-]{3,10}$/,
                        message: 'Format de code postal invalide' 
                      }
                    ]}
                  >
                    <Input prefix={<EnvironmentOutlined />} placeholder="Optionnel" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="ville"
                    label="Ville"
                    rules={[{ required: false }]}
                  >
                    <Input prefix={<EnvironmentOutlined />} placeholder="Optionnel" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="adresse"
                    label="Adresse complète"
                    rules={[{ required: false }]}
                  >
                    <Input.TextArea rows={3} prefix={<EnvironmentOutlined />} placeholder="Optionnel" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="dateNaissance"
                label="Date de naissance"
                rules={[{ required: false }]}
              >
                <DatePicker
                  format="YYYY-MM-DD"
                  placeholder="Sélectionner une date"
                  suffixIcon={<CalendarOutlined />}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          ) : userProfile === 'Entreprise' ? (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="nom"
                    label="Nom du responsable"
                    rules={[{ required: true, message: 'Ce champ est obligatoire' }]}
                  >
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Ce champ est obligatoire' },
                      { type: 'email', message: 'Email non valide' }
                    ]}
                  >
                    <Input prefix={<MailOutlined />} type="email" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="nomEntreprise"
                    label="Nom de l'entreprise"
                    rules={[{ required: true, message: 'Ce champ est obligatoire' }]}
                  >
                    <Input prefix={<ShopOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="telephoneEntreprise"
                    label="Téléphone"
                    rules={[
                      { required: false },
                      { 
                        pattern: /^[0-9\s\+\-\.]{6,20}$/,
                        message: 'Format de téléphone invalide' 
                      }
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="Optionnel" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="secteurActivite"
                    label="Secteur d'activité"
                    rules={[{ required: true, message: 'Ce champ est obligatoire' }]}
                  >
                    <Select
                      suffixIcon={<ApartmentOutlined />}
                      options={[
                        { value: 'Technologie', label: 'Technologie/IT' },
                        { value: 'Sante', label: 'Santé' },
                        { value: 'Finance', label: 'Finance/Banque' },
                        { value: 'Education', label: 'Éducation' },
                        { value: 'Commerce', label: 'Commerce' },
                        { value: 'Industrie', label: 'Industrie' },
                        { value: 'Autre', label: 'Autre' }
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="adresseEntreprise"
                label="Adresse complète"
                rules={[{ required: true, message: 'Ce champ est obligatoire' }]}
              >
                <Input.TextArea rows={3} prefix={<EnvironmentOutlined />} />
              </Form.Item>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="codePostalEntreprise"
                    label="Code postal"
                    rules={[
                      { required: false },
                      { 
                        pattern: /^[a-zA-Z0-9\s\-]{3,10}$/,
                        message: 'Format de code postal invalide' 
                      }
                    ]}
                  >
                    <Input prefix={<EnvironmentOutlined />} placeholder="Optionnel" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="paysEntreprise"
                    label="Pays"
                    rules={[{ required: true, message: 'Ce champ est obligatoire' }]}
                  >
                    <Input prefix={<GlobalOutlined />} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : (
            <Alert
              message="Erreur"
              description="Profil utilisateur non reconnu."
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Divider />

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              Enregistrer les modifications
            </Button>
          </Form.Item>
        </Form>
      </Container>
    </DashboardLayout>
  );
};

export default ModifierInfo;