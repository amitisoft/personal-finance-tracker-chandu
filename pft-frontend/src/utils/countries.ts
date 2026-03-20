export type CountryOption = {
  code: string;
  label: string;
  currency: string;
  locale: string;
};

export const countryOptions: CountryOption[] = [
  { code: "IN", label: "India", currency: "INR", locale: "en-IN" },
  { code: "US", label: "United States", currency: "USD", locale: "en-US" },
  { code: "GB", label: "United Kingdom", currency: "GBP", locale: "en-GB" },
  { code: "AE", label: "United Arab Emirates", currency: "AED", locale: "en-AE" },
  { code: "SG", label: "Singapore", currency: "SGD", locale: "en-SG" },
  { code: "AU", label: "Australia", currency: "AUD", locale: "en-AU" },
  { code: "CA", label: "Canada", currency: "CAD", locale: "en-CA" },
  { code: "DE", label: "Germany", currency: "EUR", locale: "de-DE" },
  { code: "FR", label: "France", currency: "EUR", locale: "fr-FR" },
  { code: "JP", label: "Japan", currency: "JPY", locale: "ja-JP" },
];

export function getCountryOption(countryCode?: string | null) {
  const code = (countryCode ?? "IN").trim().toUpperCase();
  return countryOptions.find((country) => country.code === code) ?? countryOptions[0];
}
