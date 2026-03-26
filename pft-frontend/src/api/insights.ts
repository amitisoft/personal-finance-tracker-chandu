import { http } from "./http";
import type { HealthScore, InsightCard } from "./types";

export async function getHealthScore() {
  const res = await http.get<HealthScore>("/api/insights/health-score");
  return res.data;
}

export async function listInsights() {
  const res = await http.get<InsightCard[]>("/api/insights");
  return res.data;
}

