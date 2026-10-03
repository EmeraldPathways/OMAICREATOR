export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  published?: string;
  source: string;
}

export type Provider = "tavily" | "serper" | "brave";

/**
 * Domains we trust for Irish financial facts. Results from these are surfaced
 * first, because a citation is only as good as what it points at.
 */
export const PRIORITY_DOMAINS = [
  "revenue.ie",
  "citizensinformation.ie",
  "gov.ie",
  "welfare.ie",
  "centralbank.ie",
  "pensionsauthority.ie",
  "irishtimes.com",
  "rte.ie",
  "independent.ie",
  "businesspost.ie",
  "irishmedicaltimes.com",
  "medicalindependent.ie",
  "dentist.ie",
  "ipu.ie",
  "ihca.ie",
  "icgp.ie",
  "hse.ie",
];

const IRISH_NEWS_DOMAINS = [
  "irishtimes.com", "rte.ie", "independent.ie", "businesspost.ie",
  "irishexaminer.com", "breakingnews.ie", "thejournal.ie", "newstalk.com",
  "agriland.ie", "farmersjournal.ie", "irishmedicaltimes.com",
  "medicalindependent.ie", "hse.ie", "gov.ie", "revenue.ie", "centralbank.ie",
];

function irelandQuery(query: string, news: boolean) {
  return `${query.trim()} ${news ? "Irish news Ireland" : "Ireland Irish market"}`;
}

function isIrish(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.endsWith(".ie") || IRISH_NEWS_DOMAINS.some((d) => host.endsWith(d));
  } catch { return false; }
}

function rank(results: SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => {
    const score = (r: SearchResult) => {
      const host = (() => {
        try {
          return new URL(r.url).hostname.replace(/^www\./, "");
        } catch {
          return "";
        }
      })();
      const priority = PRIORITY_DOMAINS.some((d) => host.endsWith(d)) ? 2 : 0;
      const irish = host.endsWith(".ie") ? 1 : 0;
      return priority + irish;
    };
    return score(b) - score(a);
  });
}

async function tavily(
  query: string,
  key: string,
  news: boolean
): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      query: irelandQuery(query, news),
      search_depth: "advanced",
      topic: news ? "news" : "general",
      max_results: 8,
      include_answer: false,
      ...(news ? { days: 90 } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.results || []).map((r: Record<string, unknown>) => ({
    title: String(r.title ?? "Untitled"),
    url: String(r.url ?? ""),
    snippet: String(r.content ?? "").slice(0, 600),
    published: r.published_date ? String(r.published_date) : undefined,
    source: "tavily",
  }));
}

async function serper(
  query: string,
  key: string,
  news: boolean
): Promise<SearchResult[]> {
  const endpoint = news
    ? "https://google.serper.dev/news"
    : "https://google.serper.dev/search";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": key },
    body: JSON.stringify({ q: irelandQuery(query, news), gl: "ie", hl: "en-IE", location: "Ireland", num: 10 }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const items = news ? data.news || [] : data.organic || [];
  return items.map((r: Record<string, unknown>) => ({
    title: String(r.title ?? "Untitled"),
    url: String(r.link ?? ""),
    snippet: String(r.snippet ?? "").slice(0, 600),
    published: r.date ? String(r.date) : undefined,
    source: "serper",
  }));
}

async function brave(
  query: string,
  key: string,
  news: boolean
): Promise<SearchResult[]> {
  const base = news
    ? "https://api.search.brave.com/res/v1/news/search"
    : "https://api.search.brave.com/res/v1/web/search";
  const url = `${base}?q=${encodeURIComponent(irelandQuery(query, news))}&country=ie&count=10`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
  });
  if (!res.ok) throw new Error(`Brave ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const items = news ? data.results || [] : data.web?.results || [];
  return items.map((r: Record<string, unknown>) => ({
    title: String(r.title ?? "Untitled"),
    url: String(r.url ?? ""),
    snippet: String(r.description ?? "")
      .replace(/<[^>]+>/g, "")
      .slice(0, 600),
    published: r.age ? String(r.age) : undefined,
    source: "brave",
  }));
}

export async function runSearch(
  query: string,
  news: boolean,
  key: string,
  provider: Provider
): Promise<SearchResult[]> {
  const fn =
    provider === "serper" ? serper : provider === "brave" ? brave : tavily;
  const results = await fn(query, key, news);
  return rank(news ? results.filter((r) => isIrish(r.url)) : results);
}

export function resolveSearchKey(runtimeKey?: string): {
  key: string;
  provider: Provider;
} {
  const provider = (process.env.SEARCH_PROVIDER || "serper") as Provider;
  const envKey = process.env.SEARCH_API_KEY;
  if (envKey) return { key: envKey, provider };
  if (process.env.ALLOW_RUNTIME_KEYS === "true" && runtimeKey)
    return { key: runtimeKey, provider };
  throw new Error(
    "No search key. Set SEARCH_API_KEY and SEARCH_PROVIDER in Vercel > Settings > Environment Variables, then redeploy."
  );
}
