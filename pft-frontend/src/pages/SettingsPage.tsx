import { Box, Typography } from "@mui/material";

export function SettingsPage() {
  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ letterSpacing: 2, opacity: 0.8, fontSize: 12 }}>OVERVIEW</Typography>
        <Typography variant="h4">Settings</Typography>
        <Typography color="text.secondary">Profile, preferences, and app configuration.</Typography>
      </Box>
      <Typography color="text.secondary">Coming soon.</Typography>
    </Box>
  );
}
