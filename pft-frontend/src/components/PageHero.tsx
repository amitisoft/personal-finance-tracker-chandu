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
        background: "linear-gradient(135deg, rgba(233,241,255,0.96) 0%, rgba(243,247,255,0.98) 55%, rgba(236,245,255,0.96) 100%)",
        color: "text.primary",
        border: "1px solid rgba(98, 122, 204, 0.12)",
        boxShadow: "0px 18px 40px rgba(68,93,180,0.08)",
      }}
    >
      <CardContent sx={{ py: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2}
        >
          <Box>
            <Typography sx={{ letterSpacing: 2.4, color: "rgba(15,23,42,0.62)", fontSize: 12 }}>OVERVIEW</Typography>
            <Typography variant="h4" sx={{ color: "#1e2a4a" }}>{title}</Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.75, maxWidth: 720 }}>{description}</Typography>
          </Box>
          {actions ? <Box>{actions}</Box> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
