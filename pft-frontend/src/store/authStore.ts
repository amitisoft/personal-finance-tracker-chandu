import { create } from "zustand";
import type { UserInfo } from "../api/auth";
import { useNotificationStore } from "./notificationStore";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  expiresAtMs: number | null;
  setSession: (accessToken: string, refreshToken: string, user: UserInfo) => void;
  clear: () => void;
};

const ACCESS_KEY = "pft.accessToken";
const REFRESH_KEY = "pft.refreshToken";
const USER_KEY = "pft.user";

let logoutTimer: number | null = null;

function clearLogoutTimer() {
  if (logoutTimer != null) {
    window.clearTimeout(logoutTimer);
    logoutTimer = null;
  }
}

function parseJwtExpMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(payload));
    const exp = typeof json?.exp === "number" ? json.exp : null;
    if (!exp) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

function scheduleLogout(accessToken: string, clear: () => void) {
  clearLogoutTimer();
  const expMs = parseJwtExpMs(accessToken);
  if (!expMs) return expMs;

  const now = Date.now();
  const msUntilExpiry = expMs - now;

  if (msUntilExpiry <= 0) {
    clear();
    return expMs;
  }

  logoutTimer = window.setTimeout(() => {
    clear();
    if (typeof window !== "undefined") {
      const path = window.location?.pathname ?? "";
      if (!path.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
  }, Math.max(0, msUntilExpiry - 1000));

  return expMs;
}

function readStoredUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const initialAccessToken = localStorage.getItem(ACCESS_KEY);
  const initialRefreshToken = localStorage.getItem(REFRESH_KEY);
  const initialUser = readStoredUser();

  const clear = () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    useNotificationStore.getState().clearRuleAlerts();
    clearLogoutTimer();
    set({ accessToken: null, refreshToken: null, user: null, expiresAtMs: null });
  };

  const initialExpiry = initialAccessToken ? scheduleLogout(initialAccessToken, clear) : null;

  return {
    accessToken: initialAccessToken,
    refreshToken: initialRefreshToken,
    user: initialUser,
    expiresAtMs: initialExpiry,
    setSession: (accessToken, refreshToken, user) => {
      localStorage.setItem(ACCESS_KEY, accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      const expiresAtMs = scheduleLogout(accessToken, clear);
      set({ accessToken, refreshToken, user, expiresAtMs });
    },
    clear,
  };
});
