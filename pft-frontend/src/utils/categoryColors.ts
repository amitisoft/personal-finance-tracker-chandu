export const CATEGORY_COLORS = [
  "#6366f1",
  "#60a5fa",
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#a78bfa",
  "#f472b6",
];

export function categoryColor(categoryName: string) {
  const name = (categoryName ?? "").trim().toLowerCase();
  if (!name) return CATEGORY_COLORS[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}
