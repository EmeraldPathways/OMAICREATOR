import { FACTS } from "./facts";

export interface EstateHit {
  url: string;
  pageTitle: string;
  factId: string;
  kind: "retired" | "disputed" | "conflict";
  excerpt: string;
}

/**
 * Patterns that indicate a retired or disputed fact is still live somewhere.
 * Deliberately conservative: a false positive costs someone thirty seconds,
 * a false negative leaves a withdrawn product advertised on the website.
 */
const PATTERNS: { factId: string; kind: EstateHit["kind"]; re: RegExp; note: string }[] = [
  {
    factId: "day-one-ip",
    kind: "retired",
    re: /day[\s-]?one\s+(income\s+protection|cover|ip)\b/gi,
    note: "Withdrawn September 2026",
  },
  {
    factId: "assoc-icgp",
    kind: "retired",
    re: /\b(icgp|irish college of general practitioners)\b/gi,
    note: "No confirmed GP association partnership",
  },
  {
    factId: "client-count",
    kind: "disputed",
    re: /\b([12345],?[0-9]{3})\+?\s*(professional\s+)?clients?\b/gi,
    note: "Brand Guide says 2,000+; live assets say 2,500+",
  },
  {
    factId: "years-trading",
    kind: "disputed",
    re: /\b([12][0-9])\+?\s*years?\s+(in\s+business|of\s+experience|serving|trading|advising)/gi,
    note: "Brand Guide says 25 years; legacy assets say 20+",
  },
  {
    factId: "no-superiority",
    kind: "conflict",
    re: /\b(ireland'?s\s+leading|number\s+one|#1|the\s+best\s+financial|market\s+leader)\b/gi,
    note: "Unsubstantiated superiority claim",
  },
  {
    factId: "no-guarantees",
    kind: "conflict",
    re: /\b(guaranteed\s+(returns?|growth|income|outcome)|risk[\s-]free|assured\s+returns?)\b/gi,
    note: "Guaranteed-outcome language",
  },
];

function stripHtml(html: string): { text: string; title: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().slice(0, 160) : "";
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return { text, title };
}

export async function scanUrl(url: string): Promise<EstateHit[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "OmegaContentStudio/1.0 (internal asset audit)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);

  const type = res.headers.get("content-type") || "";
  if (!type.includes("html") && !type.includes("text")) {
    throw new Error(`${url} is ${type.split(";")[0] || "not text"} — only HTML pages can be scanned`);
  }

  const { text, title } = stripHtml(await res.text());
  const hits: EstateHit[] = [];

  for (const p of PATTERNS) {
    const re = new RegExp(p.re.source, p.re.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = Math.max(0, m.index - 90);
      hits.push({
        url,
        pageTitle: title,
        factId: p.factId,
        kind: p.kind,
        excerpt: "…" + text.slice(start, m.index + m[0].length + 90).trim() + "…",
      });
      if (hits.length > 40) break;
    }
  }

  // De-duplicate identical excerpts from overlapping patterns.
  const seen = new Set<string>();
  return hits.filter((h) => {
    const k = h.factId + h.excerpt;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function factNote(factId: string): string {
  const f = FACTS.find((x) => x.id === factId);
  if (f) return f.note || f.value;
  const p = PATTERNS.find((x) => x.factId === factId);
  return p?.note || "";
}
