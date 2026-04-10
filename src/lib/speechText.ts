/**
 * Samsung/Android Chrome often marks several overlapping strings as "final": each new
 * slice repeats the earlier phrase and extends it (e.g. "1 2 3 … 7" then "1 2 3 … 8").
 * Naively joining all finals duplicates the run. This keeps ordered segments but drops
 * a segment when it is a strict extension of the previous one (string or word-prefix).
 */
export function mergeOverlappingFinalSegments(parts: string[]): string {
  const norm = parts.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (norm.length === 0) return "";

  const toComparableTokens = (value: string) => {
    const raw = value.toLowerCase().replace(/\s+/g, " ").trim();
    if (!raw) return [] as string[];
    const tokens: string[] = [];
    for (const token of raw.split(" ")) {
      const cleaned = token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
      if (!cleaned) continue;
      // Samsung often alternates "1234" and "1 2 3 4"; split pure digits for compare only.
      if (/^\d+$/.test(cleaned) && cleaned.length > 1) {
        tokens.push(...cleaned.split(""));
      } else {
        tokens.push(cleaned);
      }
    }
    return tokens;
  };

  const normalizeForCompare = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

  const isTokenPrefix = (shorter: string, longer: string) => {
    const a = toComparableTokens(shorter);
    const b = toComparableTokens(longer);
    if (a.length === 0 || b.length < a.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  const out: string[] = [];
  for (const p of norm) {
    if (out.length === 0) {
      out.push(p);
      continue;
    }
    const last = out[out.length - 1];
    const pCmp = normalizeForCompare(p);
    const lastCmp = normalizeForCompare(last);
    if (pCmp === lastCmp) continue;
    if (pCmp.startsWith(lastCmp) || isTokenPrefix(last, p)) {
      out[out.length - 1] = p;
      continue;
    }
    if (lastCmp.startsWith(pCmp) || isTokenPrefix(p, last)) {
      continue;
    }
    out.push(p);
  }
  return out.join(" ").trim();
}

/**
 * Normalizes speech-to-text output by trimming whitespace and reducing
 * obvious stutter/repetition artifacts produced by browser recognizers.
 */
export function sanitizeTranscript(raw: string): string {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const words = normalized.split(" ");

  // Collapse same word repeated 3+ times in a row down to 2.
  const cappedWordRepeats: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase();
    const last = cappedWordRepeats[cappedWordRepeats.length - 1]?.toLowerCase();
    const prev = cappedWordRepeats[cappedWordRepeats.length - 2]?.toLowerCase();
    if (last === lower && prev === lower) continue;
    cappedWordRepeats.push(word);
  }

  // Collapse immediately repeated phrases: "how old is how old is".
  const out: string[] = [];
  let i = 0;
  while (i < cappedWordRepeats.length) {
    let consumed = false;
    const maxPhraseSize = Math.min(12, Math.floor((cappedWordRepeats.length - i) / 2));
    for (let phraseSize = maxPhraseSize; phraseSize >= 2; phraseSize--) {
      const phrase = cappedWordRepeats
        .slice(i, i + phraseSize)
        .map((w) => w.toLowerCase())
        .join("\u0001");
      let repeats = 1;
      while (i + (repeats + 1) * phraseSize <= cappedWordRepeats.length) {
        const next = cappedWordRepeats
          .slice(i + repeats * phraseSize, i + (repeats + 1) * phraseSize)
          .map((w) => w.toLowerCase())
          .join("\u0001");
        if (next !== phrase) break;
        repeats++;
      }
      if (repeats >= 2) {
        out.push(...cappedWordRepeats.slice(i, i + phraseSize));
        i += repeats * phraseSize;
        consumed = true;
        break;
      }
    }
    if (!consumed) {
      out.push(cappedWordRepeats[i]);
      i++;
    }
  }

  return out.join(" ").trim();
}
