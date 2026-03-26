import { http } from "./http";
import type { ForecastDaily, ForecastMonth } from "./types";

export async function forecastMonth(params?: { from?: string; to?: string; accountId?: string }) {
  const res = await http.get<ForecastMonth>("/api/forecast/month", { params });
  return res.data;
}

export async function forecastDaily(params?: { from?: string; to?: string; accountId?: string }) {
  const res = await http.get<ForecastDaily>("/api/forecast/daily", { params });
  return res.data;
}

