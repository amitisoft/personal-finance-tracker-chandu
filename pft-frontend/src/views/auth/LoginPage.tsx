import { z } from "zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { login } from "../../api/auth";
import { AuthLayout } from "../../components/AuthLayout";
import { useAuthStore } from "../../store/authStore";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: passwordSchema,
});

type Form = z.infer<typeof schema>;

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Login failed. Please try again.";
}

export function LoginPage() {
  const nav = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const { register, handleSubmit, setError, formState } = useForm<Form>({
    defaultValues: { email: "", password: "" },
  });

  const mut = useMutation({
    mutationFn: (data: Form) => login(data),
    onSuccess: (res) => {
      setSession(res.accessToken, res.refreshToken, res.user);
      nav("/dashboard", { replace: true });
    },
    onError: (e) => {
      const msg = errorMessage(e);
      if (msg.toLowerCase().includes("password")) setError("password", { message: msg });
      else setError("email", { message: msg });
    },
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to PocketFinance to review balances, budgets, recurring items, and reports."
      footer={
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Forgot password?
          </Link>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
            Need an account? <Link component={RouterLink} to="/signup">Create one</Link>
          </Typography>
        </Stack>
      }
    >
      <Stack spacing={2.25}>
        {mut.isError && <Alert severity="error">{errorMessage(mut.error)}</Alert>}

        <form
          onSubmit={handleSubmit((raw) => {
            const parsed = schema.safeParse(raw);
            if (!parsed.success) {
              for (const issue of parsed.error.issues) {
                const key = issue.path[0] as keyof Form;
                setError(key, { message: issue.message });
              }
              return;
            }
            mut.mutate(parsed.data);
          })}
        >
          <Stack spacing={2}>
            <TextField
              required
              label="Email"
              type="email"
              autoComplete="email"
              error={!!formState.errors.email}
              helperText={formState.errors.email?.message}
              {...register("email")}
            />
            <TextField
              required
              label="Password"
              type="password"
              autoComplete="current-password"
              error={!!formState.errors.password}
              helperText={formState.errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={mut.isPending}>
              Log In
            </Button>
          </Stack>
        </form>

        <Box
          sx={{
            p: 0,
            borderRadius: 0,
            bgcolor: "transparent",
            border: "none",
          }}
        >
          <Typography fontWeight={800} sx={{ mb: 0.5, fontSize: 15 }}>
            What you get with PocketFinance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
            Country-aware accounts, clear transaction history, dashboard insights, and recurring payment tracking from one workspace.
          </Typography>
        </Box>
      </Stack>
    </AuthLayout>
  );
}
