import { supabase } from "@/lib/supabase";
import { getTable } from "@/lib/modeTable";

type ContactType = "email" | "phone";
type AddressType = "site" | "postal" | "other";

export type CsvRow = Record<string, string>;

export type ImportFieldKey =
  | "customer_name"
  | "site_email_primary"
  | "site_email_secondary"
  | "postal_email_primary"
  | "site_mobile_primary"
  | "site_phone_primary"
  | "site_phone_secondary"
  | "postal_phone_primary"
  | "postal_mobile_primary"
  | "site_address_line1"
  | "site_suburb"
  | "site_city"
  | "site_postcode"
  | "site_country"
  | "postal_address_line1"
  | "postal_suburb"
  | "postal_city"
  | "postal_postcode"
  | "postal_country";

export type CsvMapping = Partial<Record<string, ImportFieldKey>>;

export const IMPORT_FIELD_OPTIONS: Array<{ key: ImportFieldKey; label: string; required?: boolean }> = [
  { key: "customer_name", label: "Customer Name", required: true },
  { key: "site_email_primary", label: "Site Email (Primary)" },
  { key: "site_email_secondary", label: "Site Email (Secondary)" },
  { key: "postal_email_primary", label: "Postal Email (Primary)" },
  { key: "site_mobile_primary", label: "Site Mobile (Primary)" },
  { key: "site_phone_primary", label: "Site Phone (Primary)" },
  { key: "site_phone_secondary", label: "Site Phone (Secondary)" },
  { key: "postal_phone_primary", label: "Postal Phone (Primary)" },
  { key: "postal_mobile_primary", label: "Postal Mobile (Primary)" },
  { key: "site_address_line1", label: "Site Address Line 1" },
  { key: "site_suburb", label: "Site Suburb" },
  { key: "site_city", label: "Site City" },
  { key: "site_postcode", label: "Site Postcode" },
  { key: "site_country", label: "Site Country" },
  { key: "postal_address_line1", label: "Postal Address Line 1" },
  { key: "postal_suburb", label: "Postal Suburb" },
  { key: "postal_city", label: "Postal City" },
  { key: "postal_postcode", label: "Postal Postcode" },
  { key: "postal_country", label: "Postal Country" },
];

type ContactRecord = {
  type: ContactType;
  value: string;
  label: string;
  isPrimary: boolean;
};

type AddressRecord = {
  type: AddressType;
  line1: string;
  line2?: string;
  suburb?: string;
  city?: string;
  postcode?: string;
  country?: string;
  isPrimary: boolean;
};

const FIELD_TO_LEGACY_KEY: Record<ImportFieldKey, string> = {
  customer_name: "CustomerName",
  site_email_primary: "SAEmail1",
  site_email_secondary: "SAEmail2",
  postal_email_primary: "POEmail1",
  site_mobile_primary: "SAMobilePhone1",
  site_phone_primary: "SAPhone1",
  site_phone_secondary: "SAPhone2",
  postal_phone_primary: "POPhone1",
  postal_mobile_primary: "POMobilePhone1",
  site_address_line1: "SAAddress",
  site_suburb: "SASuburb",
  site_city: "SACity",
  site_postcode: "SAPostCode",
  site_country: "SACountry",
  postal_address_line1: "POAddress",
  postal_suburb: "POSuburb",
  postal_city: "POCity",
  postal_postcode: "POPostCode",
  postal_country: "POCountry",
};

const LEGACY_KEY_TO_FIELD: Partial<Record<string, ImportFieldKey>> = Object.entries(FIELD_TO_LEGACY_KEY).reduce(
  (acc, [field, key]) => ({ ...acc, [key]: field as ImportFieldKey }),
  {} as Partial<Record<string, ImportFieldKey>>
);

const AUTO_HEADER_ALIASES: Record<ImportFieldKey, string[]> = {
  customer_name: ["customername", "clientname", "name", "customer name", "client name"],
  site_email_primary: ["saemail1", "siteemail1", "site email", "email"],
  site_email_secondary: ["saemail2", "siteemail2", "secondary email"],
  postal_email_primary: ["poemail1", "postalemail1", "postal email"],
  site_mobile_primary: ["samobilephone1", "site mobile", "mobile"],
  site_phone_primary: ["saphone1", "site phone"],
  site_phone_secondary: ["saphone2", "site phone 2"],
  postal_phone_primary: ["pophone1", "postal phone"],
  postal_mobile_primary: ["pomobilephone1", "postal mobile"],
  site_address_line1: ["saaddress", "site address", "address"],
  site_suburb: ["sasuburb", "site suburb", "suburb"],
  site_city: ["sacity", "site city", "city", "town"],
  site_postcode: ["sapostcode", "sapost code", "site postcode", "postcode", "zip"],
  site_country: ["sacountry", "site country", "country"],
  postal_address_line1: ["poaddress", "postal address"],
  postal_suburb: ["posuburb", "postal suburb"],
  postal_city: ["pocity", "postal city"],
  postal_postcode: ["popostcode", "popost code", "postal postcode"],
  postal_country: ["pocountry", "postal country"],
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      row.push(current);
      current = "";
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim().length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim());
  const mappedRows = rows.slice(1).map((values) => {
    const mapped: CsvRow = {};
    headers.forEach((header, index) => {
      mapped[header] = (values[index] ?? "").trim();
    });
    return mapped;
  });

  return { headers, rows: mappedRows };
}

const normalizeValue = (value: string): string => value.trim();
const normalizeEmail = (value: string): string => value.trim().toLowerCase();
const normalizePhone = (value: string): string => value.replace(/\s+/g, "").trim();
const normalizeAddressKey = (address: AddressRecord): string =>
  [address.type, address.line1, address.line2 ?? "", address.suburb ?? "", address.city ?? "", address.postcode ?? "", address.country ?? ""]
    .map((part) => part.trim().toLowerCase())
    .join("|");

function readFirstNonEmpty(row: CsvRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeValue(row[key] ?? "");
    if (value) return value;
  }
  return null;
}

function deriveContacts(row: CsvRow): ContactRecord[] {
  const contacts: ContactRecord[] = [];
  const emailSet = new Set<string>();
  const phoneSet = new Set<string>();

  ["SAEmail1", "SAEmail2", "POEmail1"].forEach((column, index) => {
    const raw = normalizeValue(row[column] ?? "");
    if (!raw) return;
    const dedupeKey = normalizeEmail(raw);
    if (emailSet.has(dedupeKey)) return;
    emailSet.add(dedupeKey);
    contacts.push({
      type: "email",
      value: raw,
      label: index === 0 ? "primary" : "secondary",
      isPrimary: index === 0,
    });
  });

  ["SAMobilePhone1", "SAPhone1", "SAPhone2", "POPhone1", "POMobilePhone1"].forEach((column) => {
    const raw = normalizeValue(row[column] ?? "");
    if (!raw) return;
    const dedupeKey = normalizePhone(raw);
    if (phoneSet.has(dedupeKey)) return;
    phoneSet.add(dedupeKey);
    const isPrimary = column === "SAMobilePhone1";
    contacts.push({
      type: "phone",
      value: raw,
      label: isPrimary ? "primary" : "secondary",
      isPrimary,
    });
  });

  const firstEmail = contacts.find((contact) => contact.type === "email");
  if (firstEmail && !contacts.some((contact) => contact.type === "email" && contact.isPrimary)) {
    firstEmail.isPrimary = true;
    firstEmail.label = "primary";
  }

  const firstPhone = contacts.find((contact) => contact.type === "phone");
  if (firstPhone && !contacts.some((contact) => contact.type === "phone" && contact.isPrimary)) {
    firstPhone.isPrimary = true;
    firstPhone.label = "primary";
  }

  return contacts;
}

function deriveAddresses(row: CsvRow): AddressRecord[] {
  const siteLine1 = normalizeValue(row.SAAddress ?? "");
  const postalLine1 = normalizeValue(row.POAddress ?? "");
  const addresses: AddressRecord[] = [];
  const dedupe = new Set<string>();

  if (siteLine1) {
    const siteAddress: AddressRecord = {
      type: "site",
      line1: siteLine1,
      suburb: normalizeValue(row.SASuburb ?? "") || undefined,
      city: normalizeValue(row.SACity ?? "") || undefined,
      postcode: normalizeValue(row.SAPostCode ?? row.SAPostcode ?? "") || undefined,
      country: normalizeValue(row.SACountry ?? "") || undefined,
      isPrimary: true,
    };
    dedupe.add(normalizeAddressKey(siteAddress));
    addresses.push(siteAddress);
  }

  if (postalLine1) {
    const postalAddress: AddressRecord = {
      type: "postal",
      line1: postalLine1,
      suburb: normalizeValue(row.POSuburb ?? "") || undefined,
      city: normalizeValue(row.POCity ?? "") || undefined,
      postcode: normalizeValue(row.POPostCode ?? row.POPostcode ?? "") || undefined,
      country: normalizeValue(row.POCountry ?? "") || undefined,
      isPrimary: false,
    };
    const key = normalizeAddressKey(postalAddress);
    if (!dedupe.has(key)) {
      dedupe.add(key);
      addresses.push(postalAddress);
    }
  }

  if (addresses.length > 0 && !addresses.some((address) => address.isPrimary)) {
    addresses[0].isPrimary = true;
  }

  return addresses;
}

function autoMapHeaders(headers: string[]): CsvMapping {
  const mapping: CsvMapping = {};
  const claimedFields = new Set<ImportFieldKey>();

  for (const header of headers) {
    const norm = normalizeHeader(header);

    const direct = LEGACY_KEY_TO_FIELD[header] ?? LEGACY_KEY_TO_FIELD[header.trim()];
    if (direct && !claimedFields.has(direct)) {
      mapping[header] = direct;
      claimedFields.add(direct);
      continue;
    }

    const matchedField = (Object.keys(AUTO_HEADER_ALIASES) as ImportFieldKey[]).find((field) => {
      if (claimedFields.has(field)) return false;
      return AUTO_HEADER_ALIASES[field].some((alias) => normalizeHeader(alias) === norm);
    });

    if (matchedField) {
      mapping[header] = matchedField;
      claimedFields.add(matchedField);
    }
  }

  return mapping;
}

function mapRowsToLegacy(rows: CsvRow[], mapping: CsvMapping): CsvRow[] {
  return rows.map((row) => {
    const mapped: CsvRow = {};

    Object.entries(row).forEach(([header, value]) => {
      const explicitField = mapping[header];
      if (explicitField) {
        mapped[FIELD_TO_LEGACY_KEY[explicitField]] = value;
      }
      if (LEGACY_KEY_TO_FIELD[header]) {
        mapped[header] = value;
      }
    });

    return mapped;
  });
}

export async function parseCustomerCsvFile(file: File): Promise<{ headers: string[]; totalRows: number; sampleRows: CsvRow[]; suggestedMapping: CsvMapping }> {
  const text = await file.text();
  const { headers, rows } = parseCsv(text);

  return {
    headers,
    totalRows: rows.length,
    sampleRows: rows.slice(0, 5),
    suggestedMapping: autoMapHeaders(headers),
  };
}

export async function importCustomersCsv(file: File, mapping?: CsvMapping, isDemo = false): Promise<{ imported: number }> {
  const text = await file.text();
  const { headers, rows } = parseCsv(text);

  if (rows.length === 0) {
    return { imported: 0 };
  }

  const resolvedMapping = mapping ?? autoMapHeaders(headers);
  const hasNameMapping = Object.values(resolvedMapping).includes("customer_name");
  if (!hasNameMapping) {
    throw new Error("CSV mapping is missing Customer Name.");
  }

  const normalizedRows = mapRowsToLegacy(rows, resolvedMapping);
  let imported = 0;

  for (const row of normalizedRows) {
    const name = readFirstNonEmpty(row, ["CustomerName", "ClientName", "Name"]);
    if (!name) continue;

    const contacts = deriveContacts(row);
    const addresses = deriveAddresses(row);

    const primaryEmail = contacts.find((contact) => contact.type === "email" && contact.isPrimary)?.value
      ?? contacts.find((contact) => contact.type === "email")?.value
      ?? null;
    const primaryPhone = contacts.find((contact) => contact.type === "phone" && contact.isPrimary)?.value
      ?? contacts.find((contact) => contact.type === "phone")?.value
      ?? null;
    const primaryAddress = addresses.find((address) => address.isPrimary) ?? addresses[0];

    const flatAddress = primaryAddress
      ? [primaryAddress.line1, primaryAddress.suburb, primaryAddress.city, primaryAddress.postcode, primaryAddress.country].filter(Boolean).join(", ")
      : "";

    const { error: customerError } = await (supabase as any)
      .from(getTable("customers", isDemo))
      .insert({
        name,
        email: primaryEmail ?? "",
        phone: primaryPhone ?? "",
        address: flatAddress,
        status: "active",
        contacts,
      });

    if (customerError) {
      throw customerError;
    }

    imported += 1;
  }

  return { imported };
}
