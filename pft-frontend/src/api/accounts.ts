import { http } from "./http";
import type { Account } from "./types";

export async function listAccounts() {
  const res = await http.get<Account[]>("/api/accounts");
  return res.data;
}

export async function createAccount(payload: {
  name: string;
  type: string;
  countryCode: string;
  openingBalance: number;
  institutionName?: string;
}) {
  const res = await http.post<Account>("/api/accounts", payload);
  return res.data;
}

export async function updateAccount(payload: { id: string; name: string; type: string; countryCode: string; institutionName?: string | null }) {
  const res = await http.put<Account>(`/api/accounts/${payload.id}`, {
    name: payload.name,
    type: payload.type,
    countryCode: payload.countryCode,
    institutionName: payload.institutionName ?? null,
  });
  return res.data;
}

export async function deleteAccount(id: string) {
  await http.delete(`/api/accounts/${id}`);
}
