import type { PaletteMode } from "@mui/material";

// ----------------------------------------------------------------------------
// MUI THEME TYPE AUGMENTATION
// By default, MUI's Palette/PaletteOptions TypeScript types only know about
// the built-in keys (primary, grey, text, background, etc). Since we're
// adding a brand-new custom `glass` key for the Netflix v2.0 glassmorphism
// tokens below, we have to tell TypeScript about it via "module
// augmentation" - otherwise every file that writes `theme.palette.glass.blur`
// would fail to compile with "Property 'glass' does not exist on type
// 'Palette'". This block is pure type information; it produces no runtime
// code at all.
// ----------------------------------------------------------------------------
declare module "@mui/material/styles" {
  interface Palette {
    glass: {
      background: string;
      backgroundStrong: string;
      border: string;
      blur: string;
      shadow: string;
    };
  }
  interface PaletteOptions {
    glass?: {
      background: string;
      backgroundStrong: string;
      border: string;
      blur: string;
      shadow: string;
    };
  }
}

const PRIMARY = {
  light: "#B8B8B8",
  main: "#141414",
  dark: "#0E0A0A",
};
const GREY = {
  100: "#F9FAFB",
  200: "#F4F6F8",
  300: "#DFE3E8",
  400: "#C4CDD5",
  500: "#919EAB",
  600: "#637381",
  700: "#454F5B",
  800: "#212B36",
  900: "#161C24",
};

const COMMON = {
  common: { black: "#000", white: "#fff" },
  primary: { ...PRIMARY, contrastText: "#fff" },
  grey: GREY,
  action: {
    active: GREY[500],
    hoverOpacity: 0.08,
    disabledOpacity: 0.48,
  },
};

// "Netflix v2.0" glassmorphism tokens. These are consumed via
// `theme.palette.glass.*` anywhere we want a frosted-glass surface
// (hero volume/maturity pill, hover-preview cards, dropdown menus). Keeping
// them here means the whole app's "glass" look can be re-tuned in one place
// instead of hunting down individual rgba() values in each component.
const GLASS = {
  // Semi-transparent panel fill - sits on top of whatever's behind it
  // (video, poster art, page background) and lets it show through softly.
  background: "rgba(20, 20, 20, 0.55)",
  // A slightly brighter variant for surfaces that need more separation
  // from a busy background (e.g. the expanded hover-preview card).
  backgroundStrong: "rgba(24, 24, 24, 0.72)",
  // Hairline border that catches the light on the edge of a glass panel.
  border: "1px solid rgba(255, 255, 255, 0.12)",
  // The actual frosting - blurs whatever is rendered behind the element.
  // Consumers apply this as `backdropFilter: theme.palette.glass.blur`.
  blur: "blur(16px)",
  shadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
};

const palette = {
  ...COMMON,
  text: { primary: "#fff", secondary: GREY[500], disabled: GREY[600] },
  background: { default: PRIMARY.main, paper: PRIMARY.main },
  glass: GLASS,
  mode: "dark" as PaletteMode,
};

export default palette;
