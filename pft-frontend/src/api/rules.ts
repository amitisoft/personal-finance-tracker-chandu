import { http } from "./http";
import type { Rule } from "./types";

export async function listRules() {
  const res = await http.get<Rule[]>("/api/rules");
  return res.data;
}

export async function createRule(payload: {
  name: string;
  priority?: number;
  isActive?: boolean;
  condition: { field: string; operator: string; value: any };
  action: { type: string; value: any };
}) {
  const res = await http.post<Rule>("/api/rules", payload);
  return res.data;
}

export async function updateRule(
  id: string,
  payload: {
    name: string;
    priority?: number;
    isActive?: boolean;
    condition: { field: string; operator: string; value: any };
    action: { type: string; value: any };
  },
) {
  const res = await http.put<Rule>(`/api/rules/${id}`, payload);
  return res.data;
}

export async function deleteRule(id: string) {
  await http.delete(`/api/rules/${id}`);
}

