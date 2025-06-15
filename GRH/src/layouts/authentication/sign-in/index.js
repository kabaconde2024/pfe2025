import { useState, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Switch from "@mui/material/Switch";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonInput from "components/ArgonInput";
import ArgonButton from "components/ArgonButton";
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";
import { jwtDecode } from "jwt-decode";
import logo from "assets/images/Logos.jpeg";
import { keyframes } from "@emotion/react";

// Theme object
const theme = {
  colors: {
    primary: "#5B21B6",
    secondary: "#8B5CF6",
    accent: "#C4B5FD",
    blue: "#32E1E9",
    background: "#F9FAFB",
    text: "#111827",
    muted: "#6B7280",
    error: "#EF4444",
    success: "#10B981",
  },
  borderRadius: "12px",
  shadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
  transitions: "all 0.3s ease-in-out",
};

// Animations
const fadeIn = keyframes`
  0% { opacity: 0; transform: translateY(15px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const Illustration = memo(() => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError("Veuillez entrer un email valide.");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      setErrorMessage("Veuillez remplir tous les champs.");
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage("Veuillez entrer un email valide.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, motDePasse: password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur d'authentification");
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      const decoded = jwtDecode(data.token);
      const userProfile = decoded.profil;
      localStorage.setItem("userProfile", userProfile);

      const routes = {
        Admin: "/dashboard",
        Coach: "/coach-dashboard",
        Candidat: "/candidats-dashboard",
        Entreprise: "/entreprise-dashboard",
      };
      navigate(routes[userProfile] || "/dashboard");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IllustrationLayout
      title="Bienvenue sur Votre Plateforme"
      description="Rejoignez notre communauté pour gérer vos projets, collaborer avec votre équipe et accéder à des ressources exclusives. Connectez-vous pour commencer votre expérience personnalisée !"
    >
      <ArgonBox
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          width: "100%",
          maxWidth: "1000px",
          minHeight: { xs: "auto", md: "450px" },
          borderRadius: theme.borderRadius,
          boxShadow: theme.shadow,
          background: `rgba(50, 225, 233, 0.85)`,
          backdropFilter: "blur(10px)",
          overflow: "hidden",
          animation: `${fadeIn} 0.5s ease-out`,
          mx: "auto",
          mt: { xs: 1, md: 2 },
        }}
      >
        {/* Left Side - Branding */}
        <ArgonBox
          sx={{
            flex: { xs: "0 0 100%", md: "0 0 40%" },
            background: theme.colors.blue,
            backgroundImage: `url(${logo})`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            p: { xs: 1, sm: 2, md: 3 },
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.4)",
              zIndex: 1,
            },
          }}
        />
        {/* Right Side - Login Form */}
        <ArgonBox
          sx={{
            flex: { xs: "0 0 100%", md: "0 0 60%" },
            p: { xs: 3, sm: 4, md: 5 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: theme.colors.background,
            borderRadius: { xs: "0", md: `0 ${theme.borderRadius} ${theme.borderRadius} 0` },
          }}
        >
          <ArgonBox
            component="form"
            role="form"
            onSubmit={handleSubmit}
            sx={{
              maxWidth: "400px",
              mx: "auto",
              textAlign: "center",
              width: "100%",
              "& > *:not(:last-child)": {
                mb: 2,
              },
            }}
            aria-label="Formulaire de connexion"
            autoComplete="off"
          >
            {/* Header Section */}
            <ArgonBox mb={3}>
              <ArgonTypography
                variant="h3"
                fontWeight="bold"
                color={theme.colors.text}
                sx={{
                  fontSize: { xs: "1.5rem", sm: "1.75rem" },
                  lineHeight: 1.3,
                }}
              >
                Se connecter
              </ArgonTypography>
              <ArgonTypography
                variant="body2"
                color={theme.colors.muted}
                sx={{
                  fontSize: "0.875rem",
                  mt: 1,
                }}
              >
                Entrez vos identifiants pour accéder à votre compte
              </ArgonTypography>
            </ArgonBox>

            {/* Email Field */}
            <ArgonBox>
              <ArgonTypography
                variant="caption"
                fontWeight="medium"
                color={theme.colors.text}
                sx={{
                  display: "block",
                  mb: 1,
                  fontSize: "0.875rem",
                  textAlign: "left",
                }}
              >
                Email
              </ArgonTypography>
              <ArgonInput
                type="email"
                name="user-email"
                placeholder="votre@email.com"
                value={email}
                onChange={handleEmailChange}
                inputProps={{ 
                  "aria-label": "Adresse email", 
                  autoComplete: "off",
                  id: "unique-email-id" 
                }}
                fullWidth
                error={!!emailError}
                helperText={emailError}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: theme.borderRadius,
                    background: "rgba(255, 255, 255, 0.9)",
                    border: `1px solid ${emailError ? theme.colors.error : theme.colors.muted}`,
                    "& fieldset": { border: "none" },
                    "&:hover": { borderColor: emailError ? theme.colors.error : theme.colors.accent },
                    "&.Mui-focused": {
                      borderColor: emailError ? theme.colors.error : theme.colors.blue,
                      boxShadow: `0 0 0 3px rgba(50, 225, 233, 0.2)`,
                    },
                  },
                  "& input": {
                    padding: "12px 14px",
                    fontSize: "0.875rem",
                    color: theme.colors.text,
                  },
                  "& .MuiFormHelperText-root": {
                    color: theme.colors.error,
                    fontSize: "0.75rem",
                    mt: 0.5,
                  },
                  transition: theme.transitions,
                }}
              />
            </ArgonBox>

            {/* Password Field */}
            <ArgonBox>
              <ArgonTypography
                variant="caption"
                fontWeight="medium"
                color={theme.colors.text}
                sx={{
                  display: "block",
                  mb: 1,
                  fontSize: "0.875rem",
                  textAlign: "left",
                }}
              >
                Mot de passe
              </ArgonTypography>
              <ArgonInput
                type="password"
                name="user-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputProps={{ 
                  "aria-label": "Mot de passe", 
                  autoComplete: "new-password",
                  id: "unique-password-id" 
                }}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: theme.borderRadius,
                    background: "rgba(255, 255, 255, 0.9)",
                    border: `1px solid ${theme.colors.muted}`,
                    "& fieldset": { border: "none" },
                    "&:hover": { borderColor: theme.colors.accent },
                    "&.Mui-focused": {
                      borderColor: theme.colors.blue,
                      boxShadow: `0 0 0 3px rgba(50, 225, 233, 0.2)`,
                    },
                  },
                  "& input": {
                    padding: "12px 14px",
                    fontSize: "0.875rem",
                    color: theme.colors.text,
                  },
                  transition: theme.transitions,
                }}
              />
            </ArgonBox>

            {/* Error Message */}
            {errorMessage && (
              <ArgonBox
                sx={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${theme.colors.error}`,
                  borderRadius: "8px",
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  animation: `${fadeIn} 0.3s ease-in`,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                    stroke={theme.colors.error}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <ArgonTypography
                  color={theme.colors.error}
                  variant="caption"
                  sx={{ fontSize: "0.875rem", flex: 1 }}
                >
                  {errorMessage.includes('Votre compte est désactivé') ? (
                    <>
                      Votre compte est désactivé. Veuillez{" "}
                      <ArgonTypography
                        component={Link}
                        to="/contact-admin"
                        color={theme.colors.blue}
                        sx={{
                          textDecoration: "none",
                          "&:hover": { color: theme.colors.accent, textDecoration: "underline" },
                        }}
                      >
                        contacter l'administrateur
                      </ArgonTypography>.
                    </>
                  ) : (
                    errorMessage
                  )}
                </ArgonTypography>
                <ArgonButton
                  variant="text"
                  color="error"
                  onClick={() => setErrorMessage("")}
                  sx={{ minWidth: "auto", p: 0 }}
                  aria-label="Fermer l'erreur"
                >
                  ✕
                </ArgonButton>
              </ArgonBox>
            )}

            {/* Forgot Password Link */}
            <ArgonBox
              display="flex"
              justifyContent="flex-end"
            >
              <ArgonTypography
                component={Link}
                to="/authentification/forgot-password"
                variant="caption"
                color={theme.colors.blue}
                sx={{
                  fontSize: "0.875rem",
                  textDecoration: "none",
                  "&:hover": { color: theme.colors.accent, textDecoration: "underline" },
                }}
              >
                Mot de passe oublié ?
              </ArgonTypography>
            </ArgonBox>

            {/* Login Button */}
            <ArgonBox mt={3}>
              <ArgonButton
                color="primary"
                size="large"
                type="submit"
                disabled={isLoading || !!emailError}
                fullWidth
                sx={{
                  borderRadius: theme.borderRadius,
                  padding: "12px 16px",
                  fontWeight: "600",
                  textTransform: "none",
                  fontSize: "0.9375rem",
                  background: theme.colors.blue,
                  color: theme.colors.text,
                  "&:hover": {
                    background: theme.colors.accent,
                    boxShadow: `0 4px 12px rgba(196, 181, 253, 0.3)`,
                  },
                  "&:disabled": {
                    background: `rgba(50, 225, 233, 0.5)`,
                    color: `rgba(17, 24, 39, 0.7)`,
                  },
                }}
              >
                {isLoading ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ marginRight: "8px", animation: "spin 1s linear infinite" }}
                    >
                      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                      <path
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19Z"
                        fill={theme.colors.text}
                        opacity="0.2"
                      />
                      <path
                        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22V19C8.13401 19 5 15.866 5 12C5 8.13401 8.13401 5 12 5V2Z"
                        fill={theme.colors.text}
                      />
                    </svg>
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </ArgonButton>
            </ArgonBox>

            {/* Sign Up Link */}
            <ArgonTypography
              variant="caption"
              color={theme.colors.muted}
              sx={{
                fontSize: "0.875rem",
                display: "block",
                mt: 2,
              }}
            >
              Pas de compte ?{" "}
              <ArgonTypography
                component={Link}
                to="/authentification/sign-up"
                color={theme.colors.blue}
                sx={{
                  textDecoration: "none",
                  "&:hover": { color: theme.colors.accent, textDecoration: "underline" },
                }}
              >
                Créer un compte
              </ArgonTypography>
            </ArgonTypography>
          </ArgonBox>
        </ArgonBox>
      </ArgonBox>
    </IllustrationLayout>
  );
});

Illustration.displayName = "Illustration";

export default Illustration;