import { getCountryOption } from "./countries";

export function formatMoney(value: number, countryCode?: string | null) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const country = getCountryOption(countryCode);
  return new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function getCurrencySymbol(countryCode?: string | null) {
  const country = getCountryOption(countryCode);
  const parts = new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).formatToParts(0);

  return parts.find((part) => part.type === "currency")?.value ?? country.currency;
}

export function formatMoneyINR(value: number) {
  return formatMoney(value, "IN");
}
