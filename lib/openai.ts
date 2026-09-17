export interface ChatOpts {
  system: string;
  user: string;
  apiKey: string;
  model?: string;
  temperature?: number;
}

export async function chatJSON<T>(opts: ChatOpts): Promise<T> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model || process.env.OPENAI_MODEL || "gpt-4o",
      temperature: opts.temperature ?? 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      "The model did not return valid JSON. First 300 characters: " +
        cleaned.slice(0, 300)
    );
  }
}

/** Resolve the key: env var first, runtime override only if explicitly allowed. */
export function resolveOpenAIKey(runtimeKey?: string): string {
  const envKey = process.env.OPENAI_API_KEY;
  if (envKey) return envKey;
  if (process.env.ALLOW_RUNTIME_KEYS === "true" && runtimeKey) return runtimeKey;
  throw new Error(
    "No OpenAI key. Set OPENAI_API_KEY in Vercel > Settings > Environment Variables, then redeploy."
  );
}
