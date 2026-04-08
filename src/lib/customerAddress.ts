/** Treat blank, whitespace, and literal "EMPTY" (common DB placeholder) as no address. */
export function normalizeCustomerAddress(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  if (/^empty$/i.test(s)) return "";
  return s;
}

/** For list subtitles: omit address segment when none. */
export function formatCustomerAddressSubtitle(address: string | null | undefined): string {
  return normalizeCustomerAddress(address);
}
