import { forwardRef } from "react";

import IconButton, { IconButtonProps } from "@mui/material/IconButton";

const PlayerControlButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, sx, ...others }, ref) => (
    <IconButton
      ref={ref}
      sx={[
        {
          padding: { xs: 0.5, sm: 1 },
          "& svg, & span": { transition: "transform .3s" },
          "&:hover svg, &:hover span": {
            msTransform: "scale(1.3)",
            WebkitTransform: "scale(1.3)",
            transform: "scale(1.3)",
          },
        },
        // MUI's array `sx` syntax merges each entry left-to-right instead
        // of one object replacing another, so a caller passing its own
        // `sx` (e.g. the frosted-glass background on the back button) adds
        // on top of the built-in hover-scale behavior rather than wiping
        // it out. `sx` can be an object, an array, or undefined depending
        // on what the caller passed, so we normalize it into an array here.
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...others}
    >
      {children}
    </IconButton>
  )
);

export default PlayerControlButton;
