import PropTypes from "prop-types";
import Grid from "@mui/material/Grid";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import DefaultNavbar from "examples/Navbars/DefaultNavbar";
import PageLayout from "examples/LayoutContainers/PageLayout";

const theme = {
  colors: {
    primary: "#5B21B6",
    secondary: "#8B5CF6",
    accent: "#C4B5FD",
    background: "#F9FAFB",
    text: "#111827",
    muted: "#6B7280",
  },
  borderRadius: "12px",
  shadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
  transitions: "all 0.3s ease-in-out",
};

function CoverLayout({ title, description, button, children }) {
  return (
    <PageLayout background={theme.colors.background}>
      <DefaultNavbar
        action={{
          type: "external",
          route: "https://creative-tim.com/product/argon-dashboard-material-ui",
          label: "Free Download",
          color: "primary",
          ...button,
        }}
        sx={{
          position: "fixed",
          top: 0,
          width: "100%",
          background: `linear-gradient(90deg, rgba(255, 255, 255, 0.95), rgba(91, 33, 182, 0.05))`,
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          height: "60px",
          zIndex: 1100,
          boxSizing: "border-box",
        }}
      />
      <Grid
        container
        sx={{
          alignItems: "flex-start",
          justifyContent: "center",
          p: { xs: 1, sm: 2, md: 3 },
          pt: { xs: 6, md: 7 }, // Increased to match IllustrationLayout
          mb: { xs: 2, md: 3 }, // Increased to match IllustrationLayout
          boxSizing: "border-box",
        }}
      >
        <Grid item xs={12} sx={{ height: "100%", boxSizing: "border-box" }}>
          <ArgonBox
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
            px={{ xs: 1, sm: 2 }}
            sx={{ boxSizing: "border-box" }}
          >
            <ArgonBox sx={{ mt: { xs: 8, md: 8 }, boxSizing: "border-box" }}> {/* Increased to match IllustrationLayout */}
              <ArgonTypography
                variant="h3"
                fontWeight="bold"
                color={theme.colors.text}
                sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" }, mb: 0.5, boxSizing: "border-box" }} // Matched with IllustrationLayout
              >
                {title}
              </ArgonTypography>
              <ArgonTypography
                variant="body2"
                color={theme.colors.muted}
                sx={{ fontSize: "0.75rem", mb: 2, boxSizing: "border-box" }} // Matched with IllustrationLayout
              >
                {description}
              </ArgonTypography>
            </ArgonBox>
            <ArgonBox sx={{ width: "100%", maxWidth: "1000px", boxSizing: "border-box" }}>
              {children}
            </ArgonBox>
          </ArgonBox>
        </Grid>
      </Grid>
    </PageLayout>
  );
}

CoverLayout.defaultProps = {
  title: "",
  description: "",
  button: { color: "primary" },
};

CoverLayout.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  button: PropTypes.shape({
    type: PropTypes.string,
    route: PropTypes.string,
    label: PropTypes.string,
    color: PropTypes.string,
  }),
  children: PropTypes.node.isRequired,
};

export default CoverLayout;