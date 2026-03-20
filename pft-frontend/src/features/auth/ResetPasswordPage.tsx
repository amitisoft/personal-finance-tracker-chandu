import { Alert, Button, Stack, TextField, Typography, Link } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import { AuthLayout } from "../../components/AuthLayout";
import { resetPassword } from "../../services/auth";

export function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const mut = useMutation({ mutationFn: () => resetPassword({ email, resetToken, newPassword }) });

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter the reset token and a new password to regain access to PocketFinance."
      footer={
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Back to <Link component={RouterLink} to="/login">Log in</Link>
        </Typography>
      }
    >
      <Stack spacing={2.25}>
        {mut.isSuccess && <Alert severity="success">Password updated.</Alert>}
        {mut.isError && <Alert severity="error">Reset failed.</Alert>}
        <TextField required label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField required label="Reset token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
        <TextField required label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Button variant="contained" fullWidth size="large" onClick={() => mut.mutate()} disabled={mut.isPending || !email || !resetToken || newPassword.length < 8}>
          Reset password
        </Button>
      </Stack>
    </AuthLayout>
  );
}
