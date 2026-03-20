import { z } from "zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Alert, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { register as registerApi } from "../../api/auth";
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
  displayName: z.string().trim().max(120, "Display name must be at most 120 characters").optional(),
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
  return "Registration failed. Please try again.";
}

export function RegisterPage() {
  const nav = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const { register, handleSubmit, setError, formState } = useForm<Form>({
    defaultValues: { displayName: "", email: "", password: "" },
  });

  const mut = useMutation({
    mutationFn: (data: Form) => {
      const payload = {
        ...data,
        displayName: data.displayName?.trim() ? data.displayName.trim() : undefined,
      };
      return registerApi(payload);
    },
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
      title="Create your account"
      subtitle="Start using PocketFinance to manage accounts, transactions, budgets, goals, and reports."
      footer={
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Already have an account? <Link component={RouterLink} to="/login">Log in</Link>
        </Typography>
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
              label="Display name"
              error={!!formState.errors.displayName}
              helperText={formState.errors.displayName?.message}
              {...register("displayName")}
            />
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
              autoComplete="new-password"
              error={!!formState.errors.password}
              helperText={formState.errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={mut.isPending}>
              Sign Up
            </Button>
          </Stack>
        </form>
      </Stack>
    </AuthLayout>
  );
}
