import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonInput from "components/ArgonInput";
import ArgonButton from "components/ArgonButton";
import CoverLayout from "layouts/authentication/components/CoverLayout";
import Separator from "layouts/authentication/components/Separator";
import { keyframes } from "@emotion/react";
import logo from "assets/images/Logos.jpeg";

// Fallback image in case logo fails to load
const fallbackLogo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%2332E1E9'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='20' text-anchor='middle' alignment-baseline='middle' fill='%23FFFFFF'%3ELogo%3C/text%3E%3C/svg%3E";

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

// Configure axios timeout
axios.defaults.timeout = 5000;

function Cover() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [idProfil, setIdProfil] = useState("");
  const [profils, setProfils] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const errorRef = useRef(null);

  useEffect(() => {
    // Clear any potential prefilled values from localStorage or state on mount
    setNom("");
    setEmail("");
    setMotDePasse("");
    setIdProfil("");
    localStorage.removeItem("nom");
    localStorage.removeItem("email");
    localStorage.removeItem("motDePasse");
    localStorage.removeItem("idProfil");

    const abortController = new AbortController();

    const fetchProfils = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/profils/", {
          signal: abortController.signal,
        });
        if (response?.data && Array.isArray(response.data)) {
          const filteredProfils = response.data.filter(
            (profil) =>
              !profil.name?.toLowerCase().includes("admin") &&
              !profil.role?.toLowerCase().includes("admin")
          );
          console.log("Fetched profiles:", filteredProfils);
          setProfils(filteredProfils);
          if (filteredProfils.length === 0) {
            setError("Aucun profil disponible. Contactez un administrateur.");
          }
        } else {
          console.error("Invalid response data:", response?.data);
          setError("Les données des profils sont invalides. Veuillez réessayer plus tard.");
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("Request aborted");
          return;
        }
        console.error("Error fetching profiles:", err);
        setError(
          err.code === "ECONNABORTED"
            ? "Délai d'attente dépassé. Vérifiez votre connexion et réessayez."
            : err.response?.status === 404
            ? "Service indisponible. Veuillez réessayer plus tard."
            : err.response?.status === 403
            ? "Accès refusé. Contactez un administrateur."
            : err.response?.status === 401
            ? "Authentification requise. Contactez un administrateur."
            : err.response?.status === 429
            ? "Trop de requêtes. Veuillez réessayer plus tard."
            : "Erreur réseau. Vérifiez votre connexion et réessayez."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfils();

    return () => abortController.abort();
  }, []);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!nom || !email || !motDePasse || !idProfil) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Veuillez entrer une adresse email valide.");
      return;
    }

    if (!validatePassword(motDePasse)) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    const selectedProfil = profils.find((p) => p._id === idProfil);
    if (!selectedProfil) {
      setError("Profil sélectionné invalide.");
      return;
    }
    if (
      selectedProfil.name?.toLowerCase().includes("admin") ||
      selectedProfil.role?.toLowerCase().includes("admin")
    ) {
      setError(
        "Vous ne pouvez pas créer un compte avec un profil d'administrateur. Contactez un administrateur."
      );
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/api/register", {
        nom,
        email,
        motDePasse,
        profils: [idProfil],
      });
      setMessage(
        "Votre inscription a été enregistrée. Un administrateur va vérifier votre compte avant que vous puissiez vous connecter. Vous recevrez une notification par email une fois votre compte validé."
      );
      setNom("");
      setEmail("");
      setMotDePasse("");
      setIdProfil("");
    } catch (err) {
      console.error("Error during registration:", err);
      if (err.response?.status === 400 && err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 500) {
        setError("Erreur serveur. Veuillez réessayer plus tard.");
      } else if (err.response?.status === 403) {
        setError("Accès refusé. Contactez un administrateur.");
      } else if (err.response?.status === 401) {
        setError("Authentification requise. Contactez un administrateur.");
      } else if (err.response?.status === 429) {
        setError("Trop de requêtes. Veuillez réessayer plus tard.");
      } else if (err.code === "ECONNABORTED") {
        setError("Délai d'attente dépassé. Vérifiez votre connexion et réessayez.");
      } else {
        setError("Une erreur est survenue. Vérifiez votre connexion et réessayez.");
      }
    }
  }, [nom, email, motDePasse, idProfil, profils]);

  const handleImageError = useCallback((e) => {
    console.warn("Logo failed to load, using fallback:", logo);
    e.target.style.backgroundImage = `url(${fallbackLogo})`;
    e.target.style.backgroundColor = theme.colors.blue;
    e.target.style.backgroundSize = "100% 100%";
    e.target.style.backgroundPosition = "center";
  }, []);

  return (
    <CoverLayout
      title="Bienvenue sur Votre Plateforme"
      description="Créez votre compte pour rejoindre notre communauté, gérer vos projets, collaborer avec votre équipe et accéder à des ressources exclusives !"
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
          mt: { xs: 0.5, md: 1 },
          boxSizing: "border-box",
        }}
      >
        {/* Left Side - Branding */}
        <ArgonBox
          sx={{
            flex: { xs: "0 0 100%", md: "0 0 45%" },
            background: theme.colors.blue,
            backgroundImage: `url(${logo})`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            p: { xs: 2, sm: 3, md: 4 },
            minHeight: { xs: "200px", md: "450px" },
            position: "relative",
            overflow: "hidden",
            boxSizing: "border-box",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.2)",
              zIndex: 1,
            },
          }}
          onError={handleImageError}
        />
        {/* Right Side - Registration Form */}
        <ArgonBox
          sx={{
            flex: { xs: "0 0 100%", md: "0 0 55%" },
            p: { xs: 2, sm: 3, md: 4 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: theme.colors.background,
            borderRadius: { xs: "0", md: `0 ${theme.borderRadius} ${theme.borderRadius} 0` },
            boxSizing: "border-box",
          }}
        >
          <ArgonBox
            component="form"
            role="form"
            onSubmit={handleRegister}
            sx={{
              maxWidth: "400px",
              mx: "auto",
              textAlign: "center",
              width: "100%",
              "& > *:not(:last-child)": { mb: 1.5 },
              boxSizing: "border-box",
            }}
            aria-label="Formulaire d'inscription"
          >
            {/* Header Section */}
            <ArgonBox mb={2}>
              <ArgonTypography
                variant="h3"
                fontWeight="bold"
                color={theme.colors.text}
                sx={{
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                  lineHeight: 1.3,
                  boxSizing: "border-box",
                }}
              >
                S'inscrire
              </ArgonTypography>
              <ArgonTypography
                variant="body2"
                color={theme.colors.muted}
                sx={{
                  fontSize: "0.75rem",
                  mt: 0.5,
                  boxSizing: "border-box",
                }}
              >
                Entrez vos informations pour créer un compte
              </ArgonTypography>
            </ArgonBox>
            <ArgonBox px={2}>
              <Separator />
            </ArgonBox>
            {loading && (
              <ArgonBox textAlign="center">
                <ArgonTypography
                  variant="caption"
                  color={theme.colors.muted}
                  sx={{ fontSize: "0.75rem", boxSizing: "border-box" }}
                >
                  Chargement des profils...
                </ArgonTypography>
              </ArgonBox>
            )}
            {message && (
              <ArgonBox
                role="alert"
                aria-live="polite"
                sx={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: `1px solid ${theme.colors.success}`,
                  borderRadius: "8px",
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  animation: `${fadeIn} 0.3s ease-in`,
                  wordBreak: "break-word",
                  maxHeight: "100px",
                  overflowY: "auto",
                  boxSizing: "border-box",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke={theme.colors.success}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <ArgonTypography
                  variant="caption"
                  color={theme.colors.success}
                  sx={{ fontSize: "0.75rem", flex: 1, boxSizing: "border-box" }}
                >
                  {message}
                </ArgonTypography>
              </ArgonBox>
            )}
            {error && (
              <ArgonBox
                ref={errorRef}
                role="alert"
                aria-live="polite"
                tabIndex={-1}
                sx={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${theme.colors.error}`,
                  borderRadius: "8px",
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  animation: `${fadeIn} 0.3s ease-in`,
                  wordBreak: "break-word",
                  maxHeight: "100px",
                  overflowY: "auto",
                  boxSizing: "border-box",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
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
                  variant="caption"
                  color={theme.colors.error}
                  sx={{ fontSize: "0.75rem", flex: 1, boxSizing: "border-box" }}
                >
                  {error}
                </ArgonTypography>
                <ArgonButton
                  variant="text"
                  color="error"
                  onClick={() => setError("")}
                  sx={{ minWidth: "auto", p: 0, boxSizing: "border-box" }}
                  aria-label="Fermer l'erreur"
                >
                  ✕
                </ArgonButton>
              </ArgonBox>
            )}
            {/* Nom Field */}
            <ArgonBox>
              <ArgonTypography
                variant="caption"
                fontWeight="medium"
                color={theme.colors.text}
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.75rem",
                  textAlign: "left",
                  boxSizing: "border-box",
                }}
              >
                Nom
              </ArgonTypography>
              <ArgonInput
                placeholder="Votre nom"
                value={nom}
                onChange={(e) => setNom(e.target.value.trim())}
                required
                fullWidth
                autoComplete="off"
                inputProps={{ "aria-label": "Nom", "aria-required": "true" }}
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
                    boxSizing: "border-box",
                  },
                  "& input": {
                    padding: "10px 12px",
                    fontSize: "0.75rem",
                    color: theme.colors.text,
                    boxSizing: "border-box",
                  },
                  transition: theme.transitions,
                }}
              />
            </ArgonBox>
            {/* Email Field */}
            <ArgonBox>
              <ArgonTypography
                variant="caption"
                fontWeight="medium"
                color={theme.colors.text}
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.75rem",
                  textAlign: "left",
                  boxSizing: "border-box",
                }}
              >
                Email
              </ArgonTypography>
              <ArgonInput
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                required
                fullWidth
                autoComplete="off"
                inputProps={{ "aria-label": "Adresse email", "aria-required": "true" }}
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
                    boxSizing: "border-box",
                  },
                  "& input": {
                    padding: "10px 12px",
                    fontSize: "0.75rem",
                    color: theme.colors.text,
                    boxSizing: "border-box",
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
                  mb: 0.5,
                  fontSize: "0.75rem",
                  textAlign: "left",
                  boxSizing: "border-box",
                }}
              >
                Mot de passe
              </ArgonTypography>
              <ArgonInput
                type="password"
                placeholder="••••••••"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
                fullWidth
                autoComplete="new-password"
                inputProps={{ "aria-label": "Mot de passe", "aria-required": "true" }}
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
                    boxSizing: "border-box",
                  },
                  "& input": {
                    padding: "10px 12px",
                    fontSize: "0.75rem",
                    color: theme.colors.text,
                    boxSizing: "border-box",
                  },
                  transition: theme.transitions,
                }}
              />
            </ArgonBox>
            {/* Profil Field - Updated with native select */}
            <ArgonBox>
              <ArgonTypography
                variant="caption"
                fontWeight="medium"
                color={theme.colors.text}
                sx={{
                  display: "block",
                  mb: 0.5,
                  fontSize: "0.75rem",
                  textAlign: "left",
                  boxSizing: "border-box",
                }}
              >
                Profil
              </ArgonTypography>
              <select
                value={idProfil}
                onChange={(e) => setIdProfil(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: theme.borderRadius,
                  border: `1px solid ${theme.colors.muted}`,
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  fontSize: "0.75rem",
                  color: idProfil === "" ? theme.colors.muted : theme.colors.text,
                  appearance: "menulist",
                  outline: "none",
                  transition: theme.transitions,
                  "&:hover": {
                    borderColor: theme.colors.accent,
                  },
                  "&:focus": {
                    borderColor: theme.colors.blue,
                    boxShadow: `0 0 0 3px rgba(50, 225, 233, 0.2)`,
                  },
                }}
              >
                <option value="" disabled>
                  Sélectionnez un profil
                </option>
                {profils.length > 0 ? (
                  profils.map((profil) => (
                    <option key={profil._id} value={profil._id}>
                      {profil.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Aucun profil disponible</option>
                )}
              </select>
            </ArgonBox>
            {/* Submit Button */}
            <ArgonBox mt={2}>
              <ArgonButton
                type="submit"
                color="primary"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  borderRadius: theme.borderRadius,
                  padding: "10px 14px",
                  fontWeight: "600",
                  textTransform: "none",
                  fontSize: "0.875rem",
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
                  boxSizing: "border-box",
                }}
              >
                S'inscrire
              </ArgonButton>
            </ArgonBox>
            {/* Login Link */}
            <ArgonTypography
              variant="caption"
              color={theme.colors.muted}
              sx={{
                fontSize: "0.75rem",
                display: "block",
                mt: 1.5,
                boxSizing: "border-box",
              }}
            >
              Déjà un compte ?{" "}
              <ArgonTypography
                component={Link}
                to="/authentification/sign-in"
                color={theme.colors.blue}
                sx={{
                  textDecoration: "none",
                  "&:hover": { color: theme.colors.accent, textDecoration: "underline" },
                  boxSizing: "border-box",
                }}
              >
                Connexion
              </ArgonTypography>
            </ArgonTypography>
          </ArgonBox>
        </ArgonBox>
      </ArgonBox>
    </CoverLayout>
  );
}

export default Cover;