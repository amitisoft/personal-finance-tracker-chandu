import { Alert, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import { AuthLayout } from "../../components/AuthLayout";
import { forgotPassword } from "../../services/auth";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const mut = useMutation({ mutationFn: () => forgotPassword({ email }) });

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Request a reset token and recover access to your PocketFinance account."
      footer={
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Remembered your password? <Link component={RouterLink} to="/login">Log in</Link>
        </Typography>
      }
    >
      <Stack spacing={2.25}>
        {mut.isSuccess && (
          <Alert severity="success">
            {mut.data.message}
            {mut.data.devResetToken ? ` Reset token: ${mut.data.devResetToken}` : ""}
          </Alert>
        )}
        {mut.isError && <Alert severity="error">Unable to request a password reset.</Alert>}
        <TextField required label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button variant="contained" fullWidth size="large" onClick={() => mut.mutate()} disabled={mut.isPending || !email}>
          Request reset
        </Button>
      </Stack>
    </AuthLayout>
  );
}
