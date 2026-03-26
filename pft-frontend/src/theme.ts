import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#3856a8" },
    secondary: { main: "#6d83d6" },
    success: { main: "#2e7d32" },
    warning: { main: "#ed6c02" },
    error: { main: "#d32f2f" },
    background: {
      default: "#f5f8ff",
      paper: "#ffffff",
    },
    text: {
      primary: "#162033",
      secondary: "#5f6b7c",
    },
    divider: "rgba(15,23,42,0.08)",
  },
  typography: {
    fontFamily: [
      "Inter",
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "Roboto",
      "Arial",
      "sans-serif",
    ].join(","),
    h3: { fontWeight: 800, letterSpacing: -0.6, fontSize: 38 },
    h4: { fontWeight: 800, letterSpacing: -0.45, fontSize: 32 },
    h5: { fontWeight: 760, letterSpacing: -0.25, fontSize: 22 },
    h6: { fontWeight: 750, letterSpacing: -0.15, fontSize: 18 },
    subtitle1: { fontWeight: 650 },
    subtitle2: { fontWeight: 700, fontSize: 13 },
    body1: { fontSize: 15, lineHeight: 1.6 },
    body2: { fontSize: 13.5, lineHeight: 1.6 },
    button: { fontWeight: 750 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: "light",
        },
        html: {
          scrollBehavior: "smooth",
        },
        "@keyframes pageEnter": {
          from: {
            opacity: 0,
            transform: "translateY(12px)",
          },
          to: {
            opacity: 1,
            transform: "translateY(0)",
          },
        },
        "@keyframes heroGlow": {
          "0%": {
            transform: "translate3d(0, 0, 0) scale(1)",
          },
          "100%": {
            transform: "translate3d(0, -6px, 0) scale(1.02)",
          },
        },
        body: {
          backgroundColor: "#f5f8ff",
          backgroundImage:
            "radial-gradient(900px 480px at 0% 0%, rgba(56,86,168,0.14), transparent 55%), radial-gradient(900px 460px at 100% 0%, rgba(109,131,214,0.14), transparent 52%), radial-gradient(680px 340px at 50% 24%, rgba(121, 182, 255, 0.09), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,248,255,1))",
          backgroundAttachment: "fixed",
          color: "#162033",
        },
        "*": {
          boxSizing: "border-box",
        },
        "*::before, *::after": {
          boxSizing: "border-box",
        },
        "#root": {
          minHeight: "100vh",
        },
        "::selection": {
          backgroundColor: "rgba(70,101,187,0.18)",
        },
        "::-webkit-scrollbar": {
          width: 10,
          height: 10,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: "rgba(255,255,255,0.3)",
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(95,107,124,0.28)",
          borderRadius: 999,
          border: "2px solid rgba(255,255,255,0.8)",
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: "rgba(70,101,187,0.34)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0px 12px 30px rgba(15, 23, 42, 0.06)",
          transition: "box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,249,255,0.98) 100%)",
          backdropFilter: "blur(14px)",
          boxShadow: "0px 16px 34px rgba(40, 62, 120, 0.08)",
          border: "1px solid rgba(92,118,205,0.10)",
          position: "relative",
          overflow: "hidden",
          transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(255,255,255,0.22), transparent 48%)",
            pointerEvents: "none",
          },
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0px 22px 44px rgba(40, 62, 120, 0.12)",
            borderColor: "rgba(92,118,205,0.18)",
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(3),
          "&:last-child": { paddingBottom: theme.spacing(3) },
          [theme.breakpoints.down("sm")]: {
            padding: theme.spacing(2),
            "&:last-child": { paddingBottom: theme.spacing(2) },
          },
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 999,
          fontWeight: 800,
          paddingLeft: 18,
          paddingRight: 18,
          boxShadow: "none",
          transition: "transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease",
        },
        contained: {
          backgroundImage: "linear-gradient(135deg, #4665bb 0%, #6f86df 100%)",
          boxShadow: "0px 10px 24px rgba(70, 101, 187, 0.20)",
          "&:hover": {
            boxShadow: "0px 14px 28px rgba(70, 101, 187, 0.28)",
            transform: "translateY(-1px)",
          },
        },
        outlined: {
          borderColor: "rgba(56,86,168,0.20)",
          backgroundColor: "#ffffff",
          "&:hover": {
            borderColor: "rgba(56,86,168,0.34)",
            backgroundColor: "rgba(255,255,255,0.96)",
          },
        },
        text: {
          "&:hover": {
            backgroundColor: "rgba(56,86,168,0.08)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "transform 180ms ease, background-color 180ms ease, box-shadow 180ms ease",
          "&:hover": {
            transform: "translateY(-1px)",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: "rgba(255,255,255,0.94)",
          transition: "box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(22,32,51,0.12)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(56,86,168,0.28)" },
          "&.Mui-focused": {
            backgroundColor: "#ffffff",
            boxShadow: "0px 0px 0px 4px rgba(109,131,214,0.12)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#6d83d6", borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        asterisk: {
          color: "#d32f2f",
          fontWeight: 800,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 22,
          [theme.breakpoints.down("sm")]: {
            margin: theme.spacing(1.5),
            width: `calc(100% - ${theme.spacing(3)})`,
          },
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontWeight: 900,
          [theme.breakpoints.down("sm")]: {
            padding: theme.spacing(2),
            paddingBottom: theme.spacing(1),
            fontSize: 18,
          },
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            paddingLeft: theme.spacing(2),
            paddingRight: theme.spacing(2),
          },
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          gap: theme.spacing(1),
          padding: theme.spacing(2),
          [theme.breakpoints.down("sm")]: {
            padding: theme.spacing(2),
            paddingTop: theme.spacing(1),
            flexWrap: "wrap",
          },
        }),
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: "#ffffff",
          backgroundImage: "none",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0px 18px 40px rgba(15, 23, 42, 0.10)",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          marginTop: 2,
          marginBottom: 2,
          transition: "background-color 180ms ease, transform 180ms ease",
          "&:hover": {
            transform: "translateX(2px)",
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          transition: "background-color 180ms ease, border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(56,86,168,0.05)",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td, &:last-child th": {
            borderBottom: 0,
          },
          "&:hover td": {
            backgroundColor: "rgba(56,86,168,0.035)",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "rgba(15,23,42,0.08)",
        },
        body: {
          fontSize: 14,
          color: "#162033",
        },
        head: {
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: 0.7,
          textTransform: "uppercase",
          color: "#63708a",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: 999,
          backdropFilter: "blur(10px)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.08)",
        },
        standardInfo: {
          backgroundColor: "rgba(56,86,168,0.08)",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: "rgba(15,23,42,0.08)",
          overflow: "hidden",
        },
        bar: {
          borderRadius: 999,
          backgroundImage: "linear-gradient(90deg, #4665bb 0%, #7e96f0 100%)",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "rgba(18, 27, 45, 0.92)",
          backdropFilter: "blur(10px)",
          borderRadius: 12,
          fontSize: 12,
          padding: "8px 10px",
        },
      },
    },
  },
});
