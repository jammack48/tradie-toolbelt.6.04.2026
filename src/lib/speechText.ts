/**
 * Samsung/Android Chrome often marks several overlapping strings as "final": each new
 * slice repeats the earlier phrase and extends it (e.g. "1 2 3 … 7" then "1 2 3 … 8").
 * Naively joining all finals duplicates the run. This keeps ordered segments but drops
 * a segment when it is a strict extension of the previous one (string or word-prefix).
 */
export function mergeOverlappingFinalSegments(parts: string[]): string {
  const norm = parts.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (norm.length === 0) return "";

  const isTokenPrefix = (shorter: string, longer: string) => {
    const a = shorter.split(/\s+/).filter(Boolean);
    const b = longer.split(/\s+/).filter(Boolean);
    if (a.length === 0 || b.length < a.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].toLowerCase() !== b[i].toLowerCase()) return false;
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
    if (p === last) continue;
    if (p.startsWith(last) || isTokenPrefix(last, p)) {
      out[out.length - 1] = p;
      continue;
    }
    if (last.startsWith(p) || isTokenPrefix(p, last)) {
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

  // Collapse immediately repeated short phrases: "how old is how old is".
  const out: string[] = [];
  let i = 0;
  while (i < cappedWordRepeats.length) {
    let consumed = false;
    const maxPhraseSize = Math.min(6, Math.floor((cappedWordRepeats.length - i) / 2));
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
