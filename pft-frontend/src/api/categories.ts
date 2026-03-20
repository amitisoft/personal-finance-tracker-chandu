import { http } from "./http";
import type { Category } from "./types";

export async function listCategories(includeArchived = false) {
  const res = await http.get<Category[]>("/api/categories", {
    params: { includeArchived },
  });
  return res.data;
}

export async function createCategory(payload: {
  name: string;
  type: string;
  color?: string;
  icon?: string;
}) {
  const res = await http.post<Category>("/api/categories", payload);
  return res.data;
}

export async function updateCategory(
  id: string,
  payload: { name: string; type: string; color?: string | null; icon?: string | null; isArchived: boolean },
) {
  const res = await http.put<Category>(`/api/categories/${id}`, payload);
  return res.data;
}

export async function deleteCategory(id: string) {
  await http.delete(`/api/categories/${id}`);
}