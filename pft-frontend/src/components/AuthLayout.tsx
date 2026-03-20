import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};
const highlights = [
  "Track income, expenses, and transfers in one place.",
  "Monitor budgets, recurring bills, and savings goals.",
  "Use country-aware accounts with the right currency formatting.",
];
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 1.5, md: 2.5 },
        py: { xs: 1.5, md: 2 },
        background: "linear-gradient(135deg, #f8fbff 0%, #f1f5ff 38%, #eef3ff 72%, #f8fbff 100%)",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1320,
          height: { xs: "auto", md: "min(860px, calc(100dvh - 32px))" },
          maxHeight: { xs: "none", md: "calc(100dvh - 32px)" },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "0.98fr 0.9fr" },
          gap: { xs: 2, md: 3 },
          alignItems: "stretch",
          "& .MuiOutlinedInput-root": {
            borderRadius: 0,
            backgroundColor: "transparent",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "transparent",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "transparent",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(79, 108, 190, 0.38)",
              borderWidth: 1,
            },
          },
          "& .MuiInputBase-input": {
            fontSize: { xs: 15, md: 16 },
          },
          "& .MuiInputLabel-root": {
            fontSize: { xs: 15, md: 16 },
          },
        }}
      >
        <Box
          sx={{
            minHeight: { xs: 260, md: "100%" },
            px: { xs: 3, md: 4.5 },
            py: { xs: 3, md: 4 },
            color: "#fff",
            display: "flex",
            alignItems: "flex-end",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(73, 101, 184, 0.88) 0%, rgba(59, 82, 150, 0.84) 42%, rgba(43, 61, 118, 0.88) 100%)",
          }}
        >
          <Box sx={{ maxWidth: 460 }}>
            <Typography sx={{ fontSize: 12, letterSpacing: 2.6, fontWeight: 800, opacity: 0.9, mb: 1.25 }}>
              POCKETFINANCE
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 30, md: "clamp(2.7rem, 4.2vw, 4.35rem)" },
                lineHeight: 1.08,
                mb: 1.5,
                fontWeight: 900,
              }}
            >
              Stay on top of every rupee, dollar, and recurring bill.
            </Typography>
            <Typography sx={{ fontSize: { xs: 15, md: 16.5 }, opacity: 0.92, mb: 2.25, maxWidth: 420, lineHeight: 1.55 }}>
              Personal Finance Tracker gives you a clean workspace for balances, budgets, transactions, and financial trends.
            </Typography>
            <Stack spacing={1.1}>
              {highlights.map((item) => (
                <Typography key={item} sx={{ fontSize: { xs: 13.5, md: 14.5 }, fontWeight: 600, opacity: 0.95, lineHeight: 1.45 }}>
                  {item}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: { xs: 1, md: 1.5 },
            py: { xs: 1, md: 1.5 },
            minHeight: 0,
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 540, minHeight: 0 }}>
            <Stack spacing={2.25} sx={{ minHeight: 0 }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: 13, letterSpacing: 0.8, fontWeight: 900, color: "primary.main", mb: 0.5 }}>
                  PocketFinance
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, fontSize: { xs: 30, md: 38 } }}>
                  {title}
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: { xs: 15.5, md: 16.5 }, lineHeight: 1.55 }}>
                  {subtitle}
                </Typography>
              </Box>
              {children}
              {footer ? <Box>{footer}</Box> : null}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
