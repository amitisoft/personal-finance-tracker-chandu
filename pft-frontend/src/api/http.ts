import axios from "axios";
import { config } from "../config";
import { useAuthStore } from "../store/authStore";

export const http = axios.create({
  baseURL: config.apiBaseUrl,
});

http.interceptors.request.use((req) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    req.headers = req.headers ?? {};
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      useAuthStore.getState().clear();
      if (typeof window !== "undefined") {
        const path = window.location?.pathname ?? "";
        if (!path.startsWith("/login")) {
          window.location.assign("/login");
        }
      }
    }
    throw err;
  },
);
