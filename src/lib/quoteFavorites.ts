export type FavoriteLineSection = "labour" | "materials" | "extras";

export type FavoriteLineTemplate = {
  id: string;
  name: string;
  section: FavoriteLineSection;
  unitPrice: number;
  unit: string;
};

const storageKey = (companyId: string | null) => `tt_quote_line_favorites_${companyId ?? "local"}`;

export function loadQuoteFavorites(companyId: string | null): FavoriteLineTemplate[] {
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is FavoriteLineTemplate =>
        x != null &&
        typeof x === "object" &&
        typeof (x as FavoriteLineTemplate).id === "string" &&
        typeof (x as FavoriteLineTemplate).name === "string" &&
        ["labour", "materials", "extras"].includes((x as FavoriteLineTemplate).section)
    );
  } catch {
    return [];
  }
}

export function saveQuoteFavorite(companyId: string | null, item: Omit<FavoriteLineTemplate, "id">): FavoriteLineTemplate {
  const id = `fav-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const next: FavoriteLineTemplate = { ...item, id };
  const prev = loadQuoteFavorites(companyId);
  const merged = [next, ...prev.filter((p) => p.name !== item.name || p.section !== item.section)].slice(0, 80);
  try {
    localStorage.setItem(storageKey(companyId), JSON.stringify(merged));
  } catch {
    /* quota */
  }
  return next;
}
