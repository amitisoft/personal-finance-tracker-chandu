import { http } from "./http";

export type UserInfo = {
  id: string;
  email: string;
  displayName?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
};

export async function register(payload: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const res = await http.post<AuthResponse>("/api/auth/register", payload);
  return res.data;
}

export async function login(payload: { email: string; password: string }) {
  const res = await http.post<AuthResponse>("/api/auth/login", payload);
  return res.data;
}

export async function forgotPassword(payload: { email: string }) {
  const res = await http.post<{ message: string; devResetToken?: string }>(
    "/api/auth/forgot-password",
    payload,
  );
  return res.data;
}

export async function resetPassword(payload: {
  email: string;
  resetToken: string;
  newPassword: string;
}) {
  await http.post("/api/auth/reset-password", payload);
}
