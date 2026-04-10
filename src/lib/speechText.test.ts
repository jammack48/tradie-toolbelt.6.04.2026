import { describe, expect, it } from "vitest";
import { mergeOverlappingFinalSegments, sanitizeTranscript } from "@/lib/speechText";

describe("mergeOverlappingFinalSegments", () => {
  it("collapses Samsung-style numeric overlap chains", () => {
    const merged = mergeOverlappingFinalSegments([
      "12",
      "1234",
      "1 2 3 4 5 6 7",
      "1 2 3 4 5 6 7 8",
    ]);
    expect(merged).toBe("1 2 3 4 5 6 7 8");
  });

  it("keeps separate phrases when they are not overlaps", () => {
    const merged = mergeOverlappingFinalSegments([
      "replace kitchen tap",
      "fix leaking outdoor hose",
    ]);
    expect(merged).toBe("replace kitchen tap fix leaking outdoor hose");
  });
});

describe("sanitizeTranscript", () => {
  it("collapses immediately repeated long phrases", () => {
    const text = "1 2 3 4 5 6 7 8 1 2 3 4 5 6 7 8";
    expect(sanitizeTranscript(text)).toBe("1 2 3 4 5 6 7 8");
  });
});
