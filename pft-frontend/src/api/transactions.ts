import { http } from "./http";
import type { PagedResult, Transaction } from "./types";

export async function listTransactions(params: {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  q?: string;
  search?: string;
}) {
  const { q, search, ...rest } = params;
  const res = await http.get<PagedResult<Transaction>>("/api/transactions", {
    params: { ...rest, search: search ?? q },
  });
  return res.data;
}

export async function getTransaction(id: string) {
  const res = await http.get<Transaction>(`/api/transactions/${id}`);
  return res.data;
}

export async function createTransaction(payload: {
  type: string;
  amount: number;
  date: string;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  merchant?: string;
  note?: string;
  paymentMethod?: string;
  tags?: string[];
}) {
  const res = await http.post<Transaction>("/api/transactions", payload);
  return res.data;
}

export async function updateTransaction(
  id: string,
  payload: {
    type: string;
    amount: number;
    date: string;
    accountId: string;
    toAccountId?: string | null;
    categoryId?: string | null;
    merchant?: string;
    note?: string;
    paymentMethod?: string;
    tags?: string[];
  },
) {
  const res = await http.put<Transaction>(`/api/transactions/${id}`, payload);
  return res.data;
}

export async function deleteTransaction(id: string) {
  await http.delete(`/api/transactions/${id}`);
}