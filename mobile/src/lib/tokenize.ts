const CJK = /[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/;
const isCJK = (s: string) => CJK.test(s);

/** Splits text into glyphs (CJK) or words (Latin) and fades them in with a gentle rise. */
export function tokenize(text: string): string[] {
  if (isCJK(text)) {
    const out: string[] = [];
    // Latin runs (e.g. "Slow Sunday") stay whole words so they never break mid-word.
    const parts = text.match(/[A-Za-z0-9'’\-]+\s*|\s+|[^A-Za-z0-9'’\-\s]/g) ?? [];
    for (const ch of parts) {
      // keep closing punctuation attached to the previous glyph so it never starts a line
      if (out.length && /[，。、；：？！”’）》」』…,.;:?!]/.test(ch)) out[out.length - 1] += ch;
      else if (out.length && /[“‘（《「『]$/.test(out[out.length - 1])) out[out.length - 1] += ch;
      else out.push(ch);
    }
    return out;
  }
  return text.split(/\s+/).filter(Boolean);
}
