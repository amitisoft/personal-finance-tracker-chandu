import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type PageHeroProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHero({ title, description, actions }: PageHeroProps) {
  return (
    <Card
      sx={{
        mb: 2.5,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(233,241,255,0.96) 0%, rgba(243,247,255,0.98) 55%, rgba(236,245,255,0.96) 100%)",
        color: "text.primary",
        border: "1px solid rgba(98, 122, 204, 0.12)",
        boxShadow: "0px 18px 40px rgba(68,93,180,0.08)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(420px 180px at 100% 0%, rgba(109,131,214,0.18), transparent 68%), radial-gradient(360px 180px at 0% 100%, rgba(74, 160, 118, 0.12), transparent 70%)",
          pointerEvents: "none",
          animation: "heroGlow 5s ease-in-out infinite alternate",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: "linear-gradient(180deg, #4665bb 0%, #62b08b 100%)",
        },
      }}
    >
      <CardContent sx={{ py: 3, position: "relative", zIndex: 1, overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2.5}
        >
          <Box sx={{ maxWidth: 820, minWidth: 0 }}>
            <Typography
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1.25,
                py: 0.5,
                borderRadius: 999,
                letterSpacing: 2.1,
                color: "#3154ae",
                fontSize: 11.5,
                fontWeight: 900,
                bgcolor: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(70,101,187,0.14)",
                boxShadow: "0px 8px 18px rgba(70,101,187,0.08)",
              }}
            >
              OVERVIEW
            </Typography>
            <Typography variant="h4" sx={{ color: "#1e2a4a", mt: 0.4 }}>
              {title}
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.75, maxWidth: 720 }}>{description}</Typography>
          </Box>
          {actions ? (
            <Box
              sx={{
                flexShrink: { xs: 1, md: 0 },
                alignSelf: { xs: "stretch", md: "center" },
                minWidth: 0,
                maxWidth: "100%",
                width: { xs: "100%", md: "auto" },
                p: { xs: 0, md: 1 },
                borderRadius: 4,
                bgcolor: { xs: "transparent", md: "rgba(255,255,255,0.46)" },
                border: { xs: "none", md: "1px solid rgba(255,255,255,0.66)" },
                backdropFilter: { xs: "none", md: "blur(12px)" },
                overflowX: { xs: "auto", md: "visible" },
                overflowY: "hidden",
                WebkitOverflowScrolling: "touch",
                "& > *": {
                  minWidth: 0,
                },
              }}
            >
              {actions}
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
