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
        body: {
          backgroundColor: "#f5f8ff",
          backgroundImage:
            "radial-gradient(900px 480px at 0% 0%, rgba(56,86,168,0.10), transparent 55%), radial-gradient(900px 460px at 100% 0%, rgba(109,131,214,0.10), transparent 52%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(245,248,255,1))",
          backgroundAttachment: "fixed",
        },
        "*": {
          boxSizing: "border-box",
        },
        "::-webkit-scrollbar": {
          width: 10,
          height: 10,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(95,107,124,0.28)",
          borderRadius: 999,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0px 12px 30px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,247,255,0.98) 100%)",
          boxShadow: "0px 16px 34px rgba(40, 62, 120, 0.08)",
          border: "1px solid rgba(92,118,205,0.10)",
        },
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
        },
        contained: {
          backgroundImage: "linear-gradient(135deg, #4665bb 0%, #6f86df 100%)",
          boxShadow: "0px 10px 24px rgba(70, 101, 187, 0.20)",
        },
        outlined: {
          borderColor: "rgba(56,86,168,0.20)",
          backgroundColor: "#ffffff",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: "#ffffff",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(22,32,51,0.12)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(56,86,168,0.28)" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#6d83d6", borderWidth: 2 },
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
        paper: {
          borderRadius: 22,
        },
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
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: "rgba(15,23,42,0.08)",
        },
      },
    },
  },
});
