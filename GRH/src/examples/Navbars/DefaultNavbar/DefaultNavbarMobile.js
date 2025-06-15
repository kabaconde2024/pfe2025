import { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Collapse from "@mui/material/Collapse";
import MuiLink from "@mui/material/Link";
import Icon from "@mui/material/Icon";
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";
import DefaultNavbarDropdown from "examples/Navbars/DefaultNavbar/DefaultNavbarDropdown";
import { useArgonController } from "context";

function DefaultNavbarMobile({ routes = [], open }) { // Valeur par défaut pour routes
  const [collapse, setCollapse] = useState("");
  const [controller] = useArgonController();
  const { darkMode } = controller;

  const handleSetCollapse = (name) => (collapse === name ? setCollapse(false) : setCollapse(name));

  // Vérification de 'routes' pour éviter les erreurs
  if (!Array.isArray(routes)) {
    console.error("Expected 'routes' to be an array but received:", routes);
    return null; // Ou un autre rendu alternatif
  }

  const renderNavbarItems = routes.map(
    ({ name, icon, collapse: routeCollapses, href, route, collapse: navCollapse }) => (
      <DefaultNavbarDropdown
        key={name}
        name={name}
        icon={icon}
        collapseStatus={name === collapse}
        onClick={() => handleSetCollapse(name)}
        href={href}
        route={route}
        collapse={Boolean(navCollapse)}
      >
        <ArgonBox sx={{ height: "15rem", maxHeight: "15rem", overflowY: "scroll" }}>
          {routeCollapses && Array.isArray(routeCollapses) && routeCollapses.map((item) => (
            <ArgonBox key={item.name} px={item.icon ? 1 : 2}>
              {item.collapse ? (
                <>
                  <ArgonBox width="100%" display="flex" alignItems="center" p={1}>
                    {item.icon && (
                      <ArgonBox
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        width="1.5rem"
                        height="1.5rem"
                        borderRadius="md"
                        color="text"
                        mr={1}
                        fontSize="1rem"
                        lineHeight={1}
                      >
                        {typeof item.icon === "string" ? <Icon>{item.icon}</Icon> : item.icon}
                      </ArgonBox>
                    )}
                    <ArgonTypography
                      display="block"
                      variant="button"
                      fontWeight="bold"
                      textTransform="capitalize"
                    >
                      {item.name}
                    </ArgonTypography>
                  </ArgonBox>
                  {item.collapse && Array.isArray(item.collapse) && item.collapse.map((el, index) => (
                    <ArgonTypography
                      key={el.name}
                      component={el.route ? Link : MuiLink}
                      to={el.route ? el.route : ""}
                      href={el.href ? el.href : ""}
                      target={el.href ? "_blank" : ""}
                      rel={el.href ? "noreferrer" : "noreferrer"}
                      minWidth="11.25rem"
                      display="block"
                      variant="button"
                      color="text"
                      textTransform="capitalize"
                      fontWeight="regular"
                      py={0.625}
                      px={item.icon ? 5 : 2}
                      mb={index === item.collapse.length - 1 ? 2 : 0}
                      sx={{
                        cursor: "pointer",
                        transition: "all 300ms linear",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.1)",
                        },
                      }}
                    >
                      {el.name}
                    </ArgonTypography>
                  ))}
                </>
              ) : (
                <ArgonBox
                  display="flex"
                  component={item.route ? Link : MuiLink}
                  to={item.route ? item.route : ""}
                  href={item.href ? item.href : ""}
                  target={item.href ? "_blank" : ""}
                  rel={item.href ? "noreferrer" : "noreferrer"}
                  sx={{
                    cursor: "pointer",
                    transition: "all 300ms linear",
                    py: 1,
                    px: 1.625,
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.05)",
                    },
                  }}
                >
                  <ArgonBox
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    width="1.5rem"
                    height="1.5rem"
                    borderRadius="md"
                    color="text"
                    mr={1}
                    fontSize="1rem"
                    lineHeight={1}
                  >
                    {typeof item.icon === "string" ? <Icon>{item.icon}</Icon> : item.icon}
                  </ArgonBox>
                  <ArgonBox>
                    <ArgonTypography
                      display="block"
                      variant="button"
                      fontWeight={!item.description ? "regular" : "bold"}
                      mt={!item.description ? 0.25 : 0}
                      textTransform="capitalize"
                    >
                      {item.name || " "}
                    </ArgonTypography>
                    {item.description && (
                      <ArgonTypography
                        display="block"
                        variant="button"
                        color="text"
                        fontWeight="regular"
                        sx={{ transition: "all 300ms linear" }}
                      >
                        {item.description}
                      </ArgonTypography>
                    )}
                  </ArgonBox>
                </ArgonBox>
              )}
            </ArgonBox>
          ))}
        </ArgonBox>
      </DefaultNavbarDropdown>
    )
  );

  return (
    <Collapse in={Boolean(open)} timeout="auto" unmountOnExit>
      <ArgonBox width="calc(100% + 1.625rem)" my={2} ml={-2}>
        {renderNavbarItems}
      </ArgonBox>
    </Collapse>
  );
}

// Typechecking props for the DefaultNavbarMobile
DefaultNavbarMobile.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
  open: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
};

export default DefaultNavbarMobile;