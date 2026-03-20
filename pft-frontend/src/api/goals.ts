import { http } from "./http";
import type { Goal } from "./types";

export async function listGoals() {
  const res = await http.get<Goal[]>("/api/goals");
  return res.data;
}

export async function createGoal(payload: { name: string; targetAmount: number; targetDate?: string | null }) {
  const res = await http.post<Goal>("/api/goals", payload);
  return res.data;
}

export async function updateGoal(
  id: string,
  payload: { name: string; targetAmount: number; targetDate?: string | null; status: string },
) {
  const res = await http.put<Goal>(`/api/goals/${id}`, payload);
  return res.data;
}

export async function deleteGoal(id: string) {
  await http.delete(`/api/goals/${id}`);
}