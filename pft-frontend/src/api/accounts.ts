import { http } from "./http";
import type { Account, AccountMembersResponse, ActivityLogItem } from "./types";

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

export async function getAccountMembers(accountId: string) {
  const res = await http.get<AccountMembersResponse>(`/api/accounts/${accountId}/members`);
  return res.data;
}

export async function inviteAccountMember(accountId: string, payload: { email: string; role: "viewer" | "editor" }) {
  const res = await http.post<{ status: string; email: string; role: string; devInviteToken?: string | null }>(
    `/api/accounts/${accountId}/invite`,
    payload,
  );
  return res.data;
}

export async function acceptAccountInvite(payload: { token: string }) {
  const res = await http.post<{ status: string; accountId: string; role: string }>("/api/accounts/invites/accept", payload);
  return res.data;
}

export async function updateAccountMemberRole(accountId: string, userId: string, payload: { role: "viewer" | "editor" | "owner" }) {
  await http.put(`/api/accounts/${accountId}/members/${userId}`, payload);
}

export async function getAccountActivity(accountId: string, params?: { limit?: number }) {
  const res = await http.get<ActivityLogItem[]>(`/api/accounts/${accountId}/activity`, { params });
  return res.data;
}
