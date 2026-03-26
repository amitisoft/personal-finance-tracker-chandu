import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { acceptAccountInvite } from "../../api/accounts";
import { PageHero } from "../../components/PageHero";

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Failed to accept invite. Please try again.";
}

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = String(params.get("token") ?? "").trim();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("Missing invite token.");
        return;
      }

      setStatus("loading");
      try {
        const res = await acceptAccountInvite({ token });
        if (!mounted) return;
        setStatus("success");
        setMessage(`Invite ${res.status}. You now have ${res.role} access.`);
      } catch (e) {
        if (!mounted) return;
        setStatus("error");
        setMessage(errorMessage(e));
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <Box>
      <PageHero title="Accept invite" description="Join a shared account using your invite token." />

      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            {status === "loading" && <LinearProgress sx={{ borderRadius: 999 }} />}
            {status === "error" && <Alert severity="error">{message}</Alert>}
            {status === "success" && <Alert severity="success">{message}</Alert>}
            {status === "idle" && <Typography color="text.secondary">Ready to accept invite.</Typography>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button component={RouterLink} to="/accounts" variant="contained">
                Go to accounts
              </Button>
              <Button component={RouterLink} to="/dashboard" variant="outlined">
                Back to dashboard
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

