/**
 * HubSpot — private app token.
 *
 * OAuth would be better for a multi-user install, but a private app token is
 * what one marketing team actually needs and it can be created in five minutes:
 * HubSpot > Settings > Integrations > Private Apps > Create.
 *
 * Scopes required:
 *   content                    (blog posts)
 *   marketing-email            (marketing emails)
 *   crm.objects.owners.read    (resolving the sender)
 *
 * Everything is created as a DRAFT. Nothing this tool does can publish to a
 * live audience — that stays a deliberate human action inside HubSpot.
 */

const BASE = "https://api.hubapi.com";

function token(): string {
  const t = process.env.HUBSPOT_TOKEN;
  if (!t) {
    throw new Error(
      "No HUBSPOT_TOKEN. Create a private app in HubSpot > Settings > Integrations > " +
        "Private Apps with the content and marketing-email scopes, then add the token " +
        "in Vercel and redeploy."
    );
  }
  return t;
}

async function hs(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    // HubSpot's scope errors are the common failure and its message is useful.
    throw new Error(`HubSpot ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

export async function testConnection() {
  const data = await hs("/cms/v3/blogs/posts?limit=1");
  return { ok: true, sample: Array.isArray(data.results) ? data.results.length : 0 };
}

/** Plain text to simple HTML, preserving paragraph breaks. */
function toHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>").replace(/</g, "&lt;")}</p>`)
    .join("\n");
}

export async function pushBlogDraft(opts: {
  title: string;
  body: string;
  metaDescription?: string;
  contentGroupId?: string;
}) {
  const payload: Record<string, unknown> = {
    name: opts.title,
    postBody: toHtml(opts.body),
    state: "DRAFT",
    ...(opts.metaDescription ? { metaDescription: opts.metaDescription.slice(0, 155) } : {}),
    ...(opts.contentGroupId ? { contentGroupId: opts.contentGroupId } : {}),
  };
  const created = await hs("/cms/v3/blogs/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { id: created.id, url: created.url || null };
}

export async function pushEmailDraft(opts: {
  name: string;
  subject: string;
  body: string;
  previewText?: string;
}) {
  const payload: Record<string, unknown> = {
    name: opts.name,
    subject: opts.subject,
    state: "DRAFT",
    content: {
      widgets: {
        main_content: {
          body: { html: toHtml(opts.body) },
        },
      },
    },
    ...(opts.previewText ? { previewText: opts.previewText } : {}),
  };
  const created = await hs("/marketing/v3/emails", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { id: created.id, url: null };
}

export function hubspotReady() {
  return Boolean(process.env.HUBSPOT_TOKEN);
}
