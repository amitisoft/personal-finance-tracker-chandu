export function formatDisplayDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMonthLabel(year: number, monthIndex: number) {
  const date = new Date(year, monthIndex, 1);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
  }).format(date);
}
