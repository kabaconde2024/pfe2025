import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useArgonController } from "context";
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";
import theme from "assets/theme";
import themeDark from "assets/theme-dark";
import { defaultRoutes, entrepriseDashboard, candidatsDashboard, coachDashboard } from "routes";
import CreateMenu from './examples/CreateMenu';
import SignIn from './layouts/authentication/sign-in'; 
import ForgotPassword from './layouts/authentication/ForgotPassword'; 
import ResetPassword from './layouts/authentication/ResetPassword'; 
import SignUp from './layouts/authentication/sign-up';
import CreateProfile from 'examples/CreateProfile';
import Profile from 'examples/ProfileList';
import UserList from 'examples/UserList';
import CreateUser from 'examples/CreateUser';
import AssociateProfiles from 'examples/AssociateProfiles';
import ProtectedRoute from './PrivateRoute';
import ContratList from 'examples/ContratList';
import CreateContrat from 'examples/CreateContrat ';
import ContratDetails from 'examples/ContratDetails';
import AjouterArticle from 'examples/AjouterArticle';
import AjouterAvenant from "examples/AjouterAvenant";
import AjouterPointage from "examples/AjouterPointage";
import EntrepriseList from './examples/EntrepriseList'; 
import AddEnterprise from "examples/AddEnterprise";
import FichesDePaie from 'examples/FichesDePaie';
import CreateAnnonce from "examples/CreateAnnonce ";
import ListesOffres from "examples/ListesOffres";
import ListedesCandidatures from "examples/ListedesCandidatures"
import OffresPublier from "examples/OffresPublier";
import ProfilCv from "examples/ProfilCv";
import ProfilsList from 'examples/ProfilsList';
import Favoris from "examples/Favoris";
import MesCandidatures from "examples/MesCandidatures";
import Menu from "examples/menu";

import Accueil from "examples/Accueil"
import Offre from "examples/Offre";
import AnnoncesList from "examples/AnnoncesList";
import MesAnnonces from "examples/MesAnnonces";
import EntretiensList from "examples/EntretiensList";
import CreateProfil from "examples/CreateProfil";
import MesOffres from "examples/MesOffres";
import InfoEntreprise from "examples/InfoEntreprise";
import ModifierInfo from "examples/ModifierInfo";
import Candidatures from "examples/Candidatures";
import ArchivesOffres from "examples/ArchivesOffres";
import ProfilsFavoris from "examples/ProfilsFavoris";
import RecentVisits from "examples/RecentVisits";
import StatistiquesOffres from "examples/StatistiquesOffres";
import StatistiqueCandidatures from "examples/StatistiqueCandidatures";
import NotificationsPage from "examples/NotificationsPage";
import UserValidation from "examples/UserValidation";
import NotificationRepliesPage from "examples/NotificationRepliesPage";
import AjouterMission from "examples/AjouterMission";
import ContratEntreprise from "examples/ContratEntreprise";
import ContratCandidat from "examples/ContratCandidat";
import AdminNotification from "examples/AdminNotification";
import OffresValidation from "examples/OffresValidation";
import OffresValidees from "examples/OffresValidees";
import AnnoncesPubliees from "examples/AnnoncesPubliees";
import OffresClotureesStats from "examples/OffresClotureesStats";
import Pointage from "examples/Pointage";
import ListEmployes from "examples/ListEmployes";
import PointageEmployes from "examples/PointageEmployes";
import ListCandidatures from "examples/ListCandidatures";
import MessagerieAdmin from "examples/MessagerieAdmin";
import MessagerieEntreprise from "examples/MessagerieEntreprise";
import AdminCandidat from "examples/AdminCandidat";
import CandidatAdmin from "examples/CandidatAdmin";
import CreateMission from "examples/CreateMission";
import ListMissions from "examples/ListMissions";
import MissionsPage from "examples/MissionsPage";
import AdminMissionValidation from "examples/AdminMissionValidation";
import CreateFormation from "examples/CreateFormation";
import ListeFormations from "examples/ListeFormations";
import CalendrierFormateurs from "examples/CalendrierFormateurs";
import AssignationCoach from "examples/AssignationCoach";
import InfoCandidat from "examples/InfoCandidat";
import MesFormations from "examples/MesFormations";
import CoachFormations from "examples/CoachFormations";
const App = () => {
  const [controller] = useArgonController();
  const { layout, darkMode } = controller;
  const { pathname } = useLocation();

  const token = localStorage.getItem("token");
  const userProfile = localStorage.getItem("userProfile"); // Récupération du profil utilisateur
  const isAuthenticated = !!token;

  // Logs pour déboguer l'authentification
  console.log("User Token:", token);
  console.log("User Profile:", userProfile);
  console.log("Is Authenticated:", isAuthenticated);

  const [activeDashboard, setActiveDashboard] = useState("default");
  const [dynamicRoutes, setDynamicRoutes] = useState([]);

  const getDashboardRoute = () => {
    if (!isAuthenticated) return "/authentification/sign-in";

    switch (userProfile) {
      case "Candidat":
        return "/candidats-dashboard";
      case "Entreprise":
        return "/entreprise-dashboard";
      case "Coach":
        return "/coach-dashboard";
      case "Admin":
        return "/dashboard";
      default:
        return "/dashboard";
    }
  };

  useEffect(() => {
    document.documentElement.scrollTop = 0;

    let newDashboard = "default";
    
    if (pathname.startsWith("/entreprise-dashboard")) {
      newDashboard = "entreprise";
    } else if (pathname.startsWith("/candidats-dashboard")) {
      newDashboard = "candidats";
    } else if (pathname.startsWith("/coach-dashboard")) {
      newDashboard = "coach";
    }

    console.log("Active Dashboard:", newDashboard);
    setActiveDashboard(newDashboard);
  }, [pathname]);

  // Sélection des routes selon le tableau de bord actif
  const routesToShow = 
    activeDashboard === "coach" ? coachDashboard :
    activeDashboard === "candidats" ? candidatsDashboard :
    activeDashboard === "entreprise" ? entrepriseDashboard :
    defaultRoutes;

  // Combinez les routes dynamiques avec celles existantes
  const combinedRoutes = [...routesToShow, ...dynamicRoutes];

  return (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />

      {isAuthenticated && layout === "dashboard" && (
        <>
          <Sidenav brand="Argon Dashboard 2 PRO" routes={combinedRoutes} />
          <Configurator />
        </>
      )}

      <Routes>
        {/* Routes publiques */}
        <Route path="/authentification/sign-in" element={<SignIn />} />
        <Route path="/authentification/sign-up" element={<SignUp />} />
        <Route path="/authentification/forgot-password" element={<ForgotPassword />} />
        <Route path="/authentification/reset-password/:token" element={<ResetPassword />} />
        {/* Routes protégées */}
        {combinedRoutes.map((route) => {
          return (
            <Route 
              key={route.key} 
              path={route.route} 
              element={<ProtectedRoute element={route.component} allowedRoles={getAllowedRoles(route.route)} />}
            />
          )
        })}

        {/* Autres routes protégées */}
        <Route path="/ListeMenu" element={<ProtectedRoute element={<Menu />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="//CreateMenu/:menuId?" element={<ProtectedRoute element={<CreateMenu />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/create-profil" element={<ProtectedRoute element={<CreateProfile />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/UserList" element={<ProtectedRoute element={<UserList />} allowedRoles={['admin']} />} />
        <Route path="/Profile" element={<ProtectedRoute element={<Profile />} allowedRoles={['admin']} />} />
        <Route path="/create-profil/:id" element={<ProtectedRoute element={<CreateProfile />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/create-user" element={<ProtectedRoute element={<CreateUser />} allowedRoles={['admin']} />} />
        <Route path="/create-user/:id" element={<ProtectedRoute element={<CreateUser />} allowedRoles={['admin']} />} />
        <Route path="/associate-profiles" element={<ProtectedRoute element={<AssociateProfiles />} allowedRoles={['admin']} />} />
        <Route path="/contrats" element={<ProtectedRoute element={<ContratList />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/edit-contrat/:contratId" element={<ProtectedRoute element={<CreateContrat />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/create-contrat" element={<ProtectedRoute element={<CreateContrat />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/contrat-details/:contratId" element={<ProtectedRoute element={<ContratDetails />} allowedRoles={['admin', 'entreprise', 'candidat']} />} />
        <Route path="/ajouter-article/:contratId" element={<ProtectedRoute element={<AjouterArticle />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/ajouter-mission/:contratId" element={<ProtectedRoute element={<AjouterMission/>} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/modifier-article/:articleId" element={<ProtectedRoute element={<AjouterArticle />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/ajouter-avenant/:contratId" element={<ProtectedRoute element={<AjouterAvenant />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/modifier-avenant/:avenantId" element={<ProtectedRoute element={<AjouterAvenant />} allowedRoles={['admin', 'entreprise']} />} />
        <Route path="/entreprises" element={<ProtectedRoute element={<EntrepriseList />} allowedRoles={['admin']} />} /> 
        <Route path="/creer_entreprise" element={<ProtectedRoute element={<AddEnterprise />} allowedRoles={['admin']} />} />
        <Route path="/modifier_entreprise/:id" element={<ProtectedRoute element={<AddEnterprise />} allowedRoles={['admin']} />} /> 
        <Route path="/fiches-de-paie" element={<ProtectedRoute element={<FichesDePaie />} allowedRoles={['admin', 'entreprise', 'candidat']} />} />
        <Route path="/create_annonce" element={<ProtectedRoute element={<CreateAnnonce />} allowedRoles={['Candidat']} />} />
        <Route path="/listesOffres" element={<ProtectedRoute element={<ListesOffres />} allowedRoles={['Entreprise','Admin']} />}/>
        <Route path="/creer-offre" element={<ProtectedRoute element={<Offre />} allowedRoles={['Entreprise','Admin']} />} />       
        <Route path="/listeCandicature" element={<ProtectedRoute element={<ListedesCandidatures />} allowedRoles={['Entreprise','Admin']} />} />
        <Route path="/OffresPublier" element={<ProtectedRoute element={<OffresPublier />} allowedRoles={['admin', 'entreprise', 'candidat', 'coach']} />} />
        <Route path="/ProfilsList" element={<ProtectedRoute element={<ProfilsList />} allowedRoles={['candidat']} />} />  
        <Route path="/ProfilCv" element={<ProtectedRoute element={<ProfilCv />} allowedRoles={['candidat']} />} />
        <Route path="/CreateAnnonce" element={<ProtectedRoute element={<CreateAnnonce />} allowedRoles={['candidat']} />} />
        <Route path="/AnnoncesList" element={<AnnoncesList element={<AnnoncesList />} allowedRoles={['candidat']} />} />
        <Route path="/MesAnnonces" element={<MesAnnonces element={<MesAnnonces />} allowedRoles={['candidat']} />} />
        <Route path="/Favoris" element={<Favoris element={<Favoris />} allowedRoles={['candidat']} />} />
        <Route path="/MesCandidatures" element={<MesCandidatures element={<MesCandidatures />} allowedRoles={['candidat']} />} />
        <Route path="/CreateAnnonce" element={<ProtectedRoute element={<CreateAnnonce />} allowedRoles={['Candidat']} />} />
        <Route path="/ListesOffres" element={<ProtectedRoute element={<ListesOffres />} allowedRoles={['admin','Entreprise']} />} />
        <Route path="/ListeCandidature" element={<ProtectedRoute element={<ListedesCandidatures/>} allowedRoles={['Entreprise','admin']} />} />
        <Route path="/Accueil" element={<ProtectedRoute element={<Accueil/>} allowedRoles={['Candidat']} />} />
        <Route path="/creer-offre" element={<ProtectedRoute element={<Offre/>} allowedRoles={['Entreprise','Admin']} />} />
        <Route path="/modifier-offre/:id" element={<ProtectedRoute element={<Offre/>} allowedRoles={['Entreprise','Admin']} />} />
        <Route path="/AnnoncesList" element={<ProtectedRoute element={<AnnoncesList/>} allowedRoles={['Entreprise','Admin']} />} />
        <Route path="/annonces" element={<ProtectedRoute element={<MesAnnonces/>} allowedRoles={['Candidat']} />} />
        <Route path="/candidatures" element={<ProtectedRoute element={<MesCandidatures/>} allowedRoles={['Candidat']} />} />
        <Route path="/entretiens" element={<ProtectedRoute element={<EntretiensList/>} allowedRoles={['Entreprise']} />} />
        <Route path="/ProfilUser" element={<ProtectedRoute element={<CreateProfil/>} allowedRoles={['Candidat']} />} />
        <Route path="/ProfilCv" element={<ProtectedRoute element={<ProfilCv/>} allowedRoles={['Candidat']} />} />
        <Route path="/ProfilsList" element={<ProtectedRoute element={<ProfilsList/>} allowedRoles={['Candidat']} />} />
        <Route path="/MesOffres" element={<ProtectedRoute element={<MesOffres/>} allowedRoles={['Entreprise']} />} />
        <Route path="/InfoEntreprise" element={<ProtectedRoute element={<InfoEntreprise/>} allowedRoles={['Entreprise']} />} />
        <Route path="/InfoCandidat" element={<ProtectedRoute element={<InfoCandidat/>} allowedRoles={['Candidat']} />} />
        <Route path="/modifier-info" element={<ProtectedRoute element={<ModifierInfo />} allowedRoles={['Entreprise','Candidat']} />} />
        <Route path="/candidatures/:offreId" element={<ProtectedRoute element={<Candidatures/>} allowedRoles={['Entreprise']} />} />
        <Route path="/archives-offres" element={<ProtectedRoute element={<ArchivesOffres/>} allowedRoles={['Entreprise']} />} />
        <Route path="/profils-favoris" element={<ProtectedRoute element={<ProfilsFavoris/>} allowedRoles={['Entreprise']} />} />
        <Route path="/recent-visits" element={<ProtectedRoute element={<RecentVisits/>} allowedRoles={['Entreprise']} />} />
        <Route path="/statistiques_offres" element={<ProtectedRoute element={<StatistiquesOffres />} allowedRoles={['Entreprise']} />} />
        <Route path="/statistiques_candidatures" element={<ProtectedRoute element={<StatistiqueCandidatures />} allowedRoles={['Entreprise']} />} />
        <Route path="/Notification" element={<ProtectedRoute element={<NotificationsPage />} allowedRoles={['Candidat']} />} />
        <Route path="/validation" element={<ProtectedRoute element={<UserValidation />} allowedRoles={['Admin']} />} />
        <Route path="/reponse" element={<ProtectedRoute element={<NotificationRepliesPage />} allowedRoles={['Entreprise']} />} />
        <Route path="/contrat_entreprise" element={<ProtectedRoute element={<ContratEntreprise />} allowedRoles={['Entreprise']} />} />
        <Route path="/contrat_candidat" element={<ProtectedRoute element={<ContratCandidat />} allowedRoles={['Candidat']} />} />
        <Route path="/adminNotification" element={<ProtectedRoute element={<AdminNotification />} allowedRoles={['Admin']} />} />
        <Route path="/OffresValidation" element={<ProtectedRoute element={<OffresValidation/>} allowedRoles={['Admin']} />} />
        <Route path="/OffresValidees" element={<ProtectedRoute element={<OffresValidees/>} allowedRoles={['Admin']} />} />
        <Route path="/AnnoncesPubliees" element={<ProtectedRoute element={<AnnoncesPubliees/>} allowedRoles={['Admin']} />} />
        <Route path="/OffresClotureesStats" element={<ProtectedRoute element={<OffresClotureesStats/>} allowedRoles={['Admin']} />} />
        <Route path="/Pointage" element={<ProtectedRoute element={<Pointage/>} allowedRoles={['Candidat']} />} />
        <Route path="/pointage/:contratId" element={<ProtectedRoute element={<Pointage/>} allowedRoles={['Candidat']} />} />
        <Route path="/ListEmployes" element={<ProtectedRoute element={<ListEmployes/>} allowedRoles={['Entreprise']} />} />
        <Route path="/PointageEmployes" element={<ProtectedRoute element={<PointageEmployes/>} allowedRoles={['Entreprise']} />} />
        <Route path="/ListCandidatures" element={<ProtectedRoute element={<ListCandidatures/>} allowedRoles={['Admin']} />} />
        <Route path="/MessagerieAdmin" element={<ProtectedRoute element={<MessagerieAdmin/>} allowedRoles={['Admin']} />} />
        <Route path="/MessagerieEntreprise" element={<ProtectedRoute element={<MessagerieEntreprise/>} allowedRoles={['Entreprise']} />} />
        <Route path="/AdminCandidat" element={<ProtectedRoute element={<AdminCandidat/>} allowedRoles={['Admin']} />} />
        <Route path="/CandidatAdmin" element={<ProtectedRoute element={<CandidatAdmin/>} allowedRoles={['Candidat']} />} />
        <Route path="/CreateMission" element={<ProtectedRoute element={<CreateMission/>} allowedRoles={['Entreprise']} />} />
        <Route path="/ListMissions" element={<ProtectedRoute element={<ListMissions/>} allowedRoles={['Entreprise']} />} />
        <Route path="/missions/:contratId" element={<ProtectedRoute element={<MissionsPage/>} allowedRoles={['Candidat']} />} />
        <Route path="/AdminMissionValidation" element={<ProtectedRoute element={<AdminMissionValidation/>} allowedRoles={['Admin']} />} />
        <Route path="/CreateFormation" element={<ProtectedRoute element={<CreateFormation/>} allowedRoles={['Entreprise']} />} />
        <Route path="/ListeFormations" element={<ProtectedRoute element={<ListeFormations/>} allowedRoles={['Entreprise']} />} />
        <Route path="/CalendrierFormateurs" element={<ProtectedRoute element={<CalendrierFormateurs/>} allowedRoles={['Entreprise']} />} />
        <Route path="/AssignationCoach" element={<ProtectedRoute element={<AssignationCoach/>} allowedRoles={['Entreprise']} />} />
        <Route path="/MesFormations" element={<ProtectedRoute element={<MesFormations/>} allowedRoles={['Candidat']} />} />
        <Route path="/CoachFormations" element={<ProtectedRoute element={<CoachFormations/>} allowedRoles={['Candidat']} />} />

        <Route path="/" element={<Navigate to={getDashboardRoute()} />} />
        <Route path="*" element={<Navigate to={getDashboardRoute()} />} />
      </Routes>
    </ThemeProvider>
  );
};

// Fonction utilitaire pour déterminer les rôles autorisés en fonction de la route
const getAllowedRoles = (route) => {
  if (route.startsWith("/entreprise")) return ['admin', 'entreprise'];
  if (route.startsWith("/candidats")) return ['admin', 'candidat'];
  if (route.startsWith("/coach")) return ['admin', 'coach'];
  return ['admin', 'entreprise', 'candidat', 'coach']; // Par défaut, tous les rôles sont autorisés
};

export default App;