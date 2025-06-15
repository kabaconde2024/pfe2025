import Avatar from "@mui/material/Avatar";
import { styled } from "@mui/material/styles";

export default styled(Avatar)(({ theme, ownerState = {} }) => {
  const { palette, functions, typography, boxShadows } = theme;
  const { shadow, bgColor = "primary", size } = ownerState;

  const { gradients, transparent } = palette;
  const { pxToRem, linearGradient } = functions;
  const { size: fontSize, fontWeightBold } = typography;

  console.log("ownerState:", ownerState);
  console.log("bgColor:", bgColor);
  console.log("gradients:", gradients);

  // Vérification et fallback pour gradients
  const backgroundValue =
    bgColor === "transparent"
      ? transparent.main
      : gradients[bgColor]
      ? linearGradient(gradients[bgColor].main, gradients[bgColor].state)
      : "white"; // Couleur de secours

  // Gestion de la taille
  let sizeValue;
  switch (size) {
    case "xs":
      sizeValue = { width: pxToRem(24), height: pxToRem(24), fontSize: fontSize.xs };
      break;
    case "sm":
      sizeValue = { width: pxToRem(36), height: pxToRem(36), fontSize: fontSize.sm };
      break;
    case "lg":
      sizeValue = { width: pxToRem(58), height: pxToRem(58), fontSize: fontSize.sm };
      break;
    case "xl":
      sizeValue = { width: pxToRem(74), height: pxToRem(74), fontSize: fontSize.md };
      break;
    case "xxl":
      sizeValue = { width: pxToRem(110), height: pxToRem(110), fontSize: fontSize.md };
      break;
    default:
      sizeValue = { width: pxToRem(48), height: pxToRem(48), fontSize: fontSize.md };
  }

  return {
    background: backgroundValue,
    fontWeight: fontWeightBold,
    boxShadow: boxShadows[shadow] || "none", // Évite undefined
    ...sizeValue,
  };
});
