import { useState, memo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import ArgonInput from "components/ArgonInput";
import ArgonButton from "components/ArgonButton";
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";
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

const ResetPassword = memo(() => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();
  const { token } = useParams();

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    if (value && !validatePassword(value)) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newPassword || !confirmPassword) {
      setErrorMessage("Veuillez remplir tous les champs.");
      return;
    }
    if (!validatePassword(newPassword)) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`http://localhost:5000/api/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la réinitialisation du mot de passe");
      }

      const data = await response.json();
      setSuccessMessage(data.message);
      setTimeout(() => navigate("/authentification/sign-in"), 3000);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IllustrationLayout
      title="Nouveau mot de passe"
      description="Entrez votre nouveau mot de passe pour réinitialiser votre compte."
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
        {/* Right Side - Form */}
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
            aria-label="Formulaire de réinitialisation de mot de passe"
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
                Réinitialiser le mot de passe
              </ArgonTypography>
              <ArgonTypography
                variant="body2"
                color={theme.colors.muted}
                sx={{
                  fontSize: "0.875rem",
                  mt: 1,
                }}
              >
                Entrez et confirmez votre nouveau mot de passe
              </ArgonTypography>
            </ArgonBox>

            {/* New Password Field */}
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
                Nouveau mot de passe
              </ArgonTypography>
              <ArgonInput
                type="password"
                name="new-password"
                placeholder="••••••••"
                value={newPassword}
                onChange={handlePasswordChange}
                inputProps={{ "aria-label": "Nouveau mot de passe", autoComplete: "new-password" }}
                fullWidth
                error={!!passwordError}
                helperText={passwordError}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: theme.borderRadius,
                    background: "rgba(255, 255, 255, 0.9)",
                    border: `1px solid ${passwordError ? theme.colors.error : theme.colors.muted}`,
                    "& fieldset": { border: "none" },
                    "&:hover": { borderColor: passwordError ? theme.colors.error : theme.colors.accent },
                    "&.Mui-focused": {
                      borderColor: passwordError ? theme.colors.error : theme.colors.blue,
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

            {/* Confirm Password Field */}
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
                Confirmer le mot de passe
              </ArgonTypography>
              <ArgonInput
                type="password"
                name="confirm-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                inputProps={{ "aria-label": "Confirmer le mot de passe", autoComplete: "new-password" }}
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

            {/* Success Message */}
            {successMessage && (
              <ArgonBox
                sx={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: `1px solid ${theme.colors.success}`,
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
                    d="M20 6L9 17L4 12"
                    stroke={theme.colors.success}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <ArgonTypography
                  color={theme.colors.success}
                  variant="caption"
                  sx={{ fontSize: "0.875rem", flex: 1 }}
                >
                  {successMessage}
                </ArgonTypography>
              </ArgonBox>
            )}

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
                  {errorMessage}
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

            {/* Submit Button */}
            <ArgonBox mt={3}>
              <ArgonButton
                color="primary"
                size="large"
                type="submit"
                disabled={isLoading || !!passwordError}
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
                    Réinitialisation...
                  </>
                ) : (
                  "Réinitialiser"
                )}
              </ArgonButton>
            </ArgonBox>

            {/* Back to Sign In */}
            <ArgonTypography
              variant="caption"
              color={theme.colors.muted}
              sx={{
                fontSize: "0.875rem",
                display: "block",
                mt: 2,
              }}
            >
              Retour à la{" "}
              <ArgonTypography
                component={Link}
                to="/authentification/sign-in"
                color={theme.colors.blue}
                sx={{
                  textDecoration: "none",
                  "&:hover": { color: theme.colors.accent, textDecoration: "underline" },
                }}
              >
                connexion
              </ArgonTypography>
            </ArgonTypography>
          </ArgonBox>
        </ArgonBox>
      </ArgonBox>
    </IllustrationLayout>
  );
});

ResetPassword.displayName = "ResetPassword";

export default ResetPassword;