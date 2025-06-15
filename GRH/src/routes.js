import DefaultDashboard from "layouts/dashboard/index";
import EntrepriseDashboard from "layouts/dashboard/EntrepriseDashboard";
import CandidatsDashboard from "layouts/dashboard/CandidatsDashboard";
import CoachDashboard from "layouts/dashboard/CoachDashboard";
import Tables from "layouts/tables";
import Billing from "layouts/billing";
import Profile from "examples/ProfileList";
import SignIn from "layouts/authentication/sign-in";
import SignUp from "layouts/authentication/sign-up";
import AssociatiationMenu from "examples/AssociatiationMenu";
// Routes pour le tableau de bord par défaut
const defaultRoutes = [
  {
    type: "route",
    name: "Dashboard",
    key: "default-dashboard",
    route: "/dashboard",
    component: <DefaultDashboard />,
  },
  {
    type: "route",
    name: "Tables",
    key: "default-tables",
    route: "/tables",
    component: <Tables />,
  },
  {
    type: "route",
    name: "Sign In",
    key: "Sign-in",
    route: "/authentification/sign-in",
    component: <SignIn />,
  },
  {
    type: "route",
    name: "Sign Up",
    key: "Sign-up",
    route: "/authentification/sign-up",
    component: <SignUp/>,
  },
  /*{
    type: "route",
    name: "Menu",
    key: "default-signup",
    route: "/CreateMenu",
    component: <CreateMenu />,
  },*/
  {
    type: "route",
    name: "Menu",
    key: "default-signup",
    route: "/AssociatiationMenu",
    component: <AssociatiationMenu/>,
  },
   {
    type: "route",
    name: "Profile",
    key: "default-signup",
    route: "/Profile",
    component: <Profile/>,
  },
];

// Routes pour le tableau de bord de l'entreprise
const entrepriseDashboard = [
  {
    type: "route",
    name: "EntrepriseDashboard",
    key: "entreprise-dashboard",
    route: "/entreprise-dashboard",
    component: <EntrepriseDashboard />,
  },
  {
    type: "route",
    name: "Billing",
    key: "entreprise-billing",
    route: "/entreprise-billing", // Corrected path
    component: <Billing />,
  },
];

// Routes pour le tableau de bord des candidats
const candidatsDashboard = [
  {
    type: "route",
    name: "CandidatsDashboard",
    key: "candidats-dashboard",
    route: "/candidats-dashboard",
    component: <CandidatsDashboard />,
  },
];

// Routes pour le tableau de bord des coachs
const coachDashboard = [
  {
    type: "route",
    name: "CoachDashboard",
    key: "coach-dashboard",
    route: "/coach-dashboard",
    component: <CoachDashboard />,
  },
];

export { defaultRoutes, entrepriseDashboard, candidatsDashboard, coachDashboard };