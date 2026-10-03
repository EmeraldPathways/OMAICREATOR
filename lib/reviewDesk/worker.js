import { eligible, withinHours, localParts, notificationReview, validateSettings } from './core.js';
import { sealToken, unsealToken, verifyPushJWT } from './security.js';
import { one, all, run, audit, loadSettings, putSettings, purge, ingest, getReview, saveDraft, learn, state } from './data.js';
import { requestJSON, googleToken, discover, sync, generate, publish, configureNotifications } from './providers.js';
import { html } from './ui.js';
import { ensureReviewDeskSchema } from './schema.ts';

const BRANDS = ['omega-financial', 'graduation-hoodies', 'bonner-of-ireland', 'eco-car-wash'];
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'self'",
};
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', ...extra } });
const page = (body, status = 200) => new Response(body, { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
const scope = env => ({ brandId: env.BRAND_ID });
const forBrand = (env, brandId) => Object.assign(Object.create(env), { BRAND_ID: brandId });

export function assertAutomationScheduler(settings, env) {
  if (settings.auto_mode !== 'off' && env.SCHEDULED_WORK_ENABLED !== true) {
    throw Error('Background automation is not configured for this Site. Manual sync, draft and publish actions remain available.');
  }
}

function config(env) {
  if (!env.DB || !env.PUBLIC_BASE_URL || !/^https:\/\/[^/?#]+$/.test(env.PUBLIC_BASE_URL)) throw Error('Review Desk workspace storage is not available. Check the D1 binding and HTTPS origin.');
}

async function auth(_request, env) {
  return env.SITES_PRIVATE_AUTH === '1' && typeof env.STUDIO_OWNER_EMAIL === 'string' ? env.STUDIO_OWNER_EMAIL : null;
}

function sameOrigin(request, env) { return request.headers.get('Origin') === env.PUBLIC_BASE_URL; }

async function input(request) {
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') throw Error('Expected JSON.');
  const text = await request.text();
  if (text.length > 100000) throw Error('Request too large.');
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Expected a JSON object.');
  return data;
}

function redirectUri(env) { return `${env.PUBLIC_BASE_URL}/api/review-desk/oauth/callback`; }

async function oauthStart(env, ownerEmail) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.TOKEN_KEY) throw Error('Google connection setup is incomplete. Add the Review Desk OAuth client and token encryption key in Site settings.');
  const state = crypto.randomUUID(), verifier = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const challenge = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await run(env, 'INSERT INTO rd_oauth_states(state,brand_id,owner_email,verifier,expires) VALUES(?,?,?,?,?)', state, env.BRAND_ID, ownerEmail, verifier, Date.now() + 600000);
  const params = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(env), response_type: 'code', scope: 'https://www.googleapis.com/auth/business.manage', access_type: 'offline', prompt: 'consent', state, code_challenge_method: 'S256', code_challenge: challenge });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function oauthFinish(env, ownerEmail, url) {
  const state = url.searchParams.get('state') || '';
  const row = await one(env, 'SELECT * FROM rd_oauth_states WHERE state=? AND brand_id=? AND owner_email=? AND expires>?', state, env.BRAND_ID, ownerEmail, Date.now());
  if (!row) throw Error('Google sign-in expired or belongs to a different business. Start again from Connections.');
  const deleted = await run(env, 'DELETE FROM rd_oauth_states WHERE state=? AND brand_id=? AND owner_email=?', state, env.BRAND_ID, ownerEmail);
  if (!deleted.meta.changes) throw Error('This Google sign-in was already used.');
  if (url.searchParams.get('error')) throw Error('Google sign-in was cancelled or rejected.');
  const code = url.searchParams.get('code');
  if (!code) throw Error('Google did not return an authorization code.');
  const result = await requestJSON(env, 'https://oauth2.googleapis.com/token', { data: { client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, code, code_verifier: row.verifier, redirect_uri: redirectUri(env), grant_type: 'authorization_code' }, form: true });
  if (!result.refresh_token) throw Error('Google did not grant offline access. Review Google consent and reconnect.');
  await run(env, 'INSERT INTO rd_secrets(brand_id,name,value) VALUES(?,?,?) ON CONFLICT(brand_id,name) DO UPDATE SET value=excluded.value', env.BRAND_ID, 'google_refresh', await sealToken(result.refresh_token, env));
  const settings = await loadSettings(scope(env), env);
  settings.auto_mode = 'off'; settings.publish_consent = false;
  await putSettings(scope(env), env, settings);
  await audit(scope(env), env, 'Google connected');
}

async function disconnect(env) {
  const settings = await loadSettings(scope(env), env);
  settings.auto_mode = 'off'; settings.publish_consent = false;
  await putSettings(scope(env), env, settings);
  const stored = await one(env, "SELECT value FROM rd_secrets WHERE brand_id=? AND name='google_refresh'", env.BRAND_ID);
  if (stored) {
    const refresh = await unsealToken(stored.value, env);
    try { await requestJSON(env, 'https://oauth2.googleapis.com/revoke', { data: { token: refresh }, form: true }); }
    catch (error) { if (error.status !== 400) throw Error('Google could not revoke access. Automation is off; retry disconnecting.'); }
  }
  await run(env, "DELETE FROM rd_secrets WHERE brand_id=? AND name='google_refresh'", env.BRAND_ID);
  await run(env, 'DELETE FROM rd_reviews WHERE brand_id=? AND demo=0', env.BRAND_ID);
  await run(env, 'DELETE FROM rd_locations WHERE brand_id=?', env.BRAND_ID);
  await audit(scope(env), env, 'Google disconnected');
}

async function act(env, name, data) {
  const s = scope(env), brandId = env.BRAND_ID;
  if (name === 'settings') {
    const old = await loadSettings(s, env), next = validateSettings(old, data);
    assertAutomationScheduler(next, env);
    if (old.auto_mode === 'off' && next.auto_mode !== 'off') {
      if (!env.OPENAI_API_KEY) throw Error('Add the Content Studio OpenAI key before enabling automation.');
      await sync(env); next.auto_since = Date.now(); next.synced_at = next.auto_since;
    }
    await putSettings(s, env, next); await audit(s, env, 'settings saved');
  } else if (name === 'sample') {
    for (const [id, person, rating, body] of [['demo-1', 'Sarah M.', 5, 'First visit and the car came back spotless. John removed the stains brilliantly.'], ['demo-2', 'Michael', 4, 'Friendly team and a great clean.'], ['demo-3', 'Aoife', 2, 'Disappointed with the wait and the interior was still dirty.'], ['demo-4', 'Patrick', 5, '']]) {
      await run(env, 'INSERT OR IGNORE INTO rd_reviews(brand_id,id,name,rating,text,demo,created,first_seen,source) VALUES(?,?,?,?,?,1,?,?,?)', brandId, id, person, rating, body, new Date().toISOString(), Date.now(), 'Sample');
    }
  } else if (name === 'discover') await discover(env);
  else if (name === 'sync') await sync(env);
  else if (name === 'notifications') await configureNotifications(env);
  else if (name === 'disconnect') await disconnect(env);
  else if (name === 'location') {
    if (!await one(env, 'SELECT 1 FROM rd_locations WHERE brand_id=? AND name=?', brandId, data.name)) throw Error('Unknown Google location for this business.');
    await run(env, 'UPDATE rd_locations SET enabled=? WHERE brand_id=? AND name=?', data.enabled === true ? 1 : 0, brandId, data.name);
  } else if (name === 'example-add') {
    const reply = data.reply;
    if (typeof reply !== 'string' || !reply.trim() || reply.length > 4096) throw Error('Provide an approved example reply of at most 4096 characters.');
    await run(env, "INSERT INTO rd_examples(brand_id,original,reply,created) VALUES(?,'',?,?)", brandId, reply.trim(), Date.now());
  } else if (name === 'example-delete') {
    if (!Number.isInteger(data.example_id)) throw Error('Invalid example.');
    await run(env, 'DELETE FROM rd_examples WHERE brand_id=? AND id=? AND review_id IS NULL', brandId, data.example_id);
  } else if (['draft', 'save', 'approve', 'publish', 'simulate'].includes(name)) {
    const review = await getReview(s, env, data.id);
    if (name === 'draft') {
      if (['published', 'sample-replied', 'publishing'].includes(review.status)) throw Error('Published replies are read-only.');
      const result = await generate(env, review);
      const saved = await saveDraft(s, env, review.id, result.reply, 'draft', result.flag);
      await run(env, 'UPDATE rd_reviews SET theme=? WHERE brand_id=? AND id=?', result.theme, brandId, saved.id);
    } else if (name === 'save' || name === 'approve') {
      await saveDraft(s, env, review.id, data.draft, name);
      if (name === 'approve') await learn(s, env, review.id);
    } else if (name === 'publish') {
      if (review.draft !== data.draft) throw Error('Save and approve the current wording before publishing.');
      await publish(env, review);
    } else {
      if (!review.demo || review.status !== 'approved') throw Error('Approve a sample reply first.');
      await run(env, "UPDATE rd_reviews SET status='sample-replied',published_at=? WHERE brand_id=? AND id=? AND status='approved'", new Date().toISOString(), brandId, review.id);
      await audit(s, env, 'sample replied', review.id);
    }
  } else throw Error('Unknown action.');
  return { ok: true };
}

async function autoTick(env, now = Date.now()) {
  const s = scope(env), brandId = env.BRAND_ID, settings = await loadSettings(s, env);
  if (settings.auto_mode === 'off') return;
  if (settings.auto_mode === 'publish' && !settings.publish_consent) throw Error('Automatic publishing requires express consent.');
  await run(env, "UPDATE rd_reviews SET status='new',processing_at=0 WHERE brand_id=? AND status='processing' AND processing_at<?", brandId, now - 20 * 60000);
  const due = await all(env, "SELECT * FROM rd_reviews WHERE brand_id=? AND demo=0 AND status='new' AND first_seen>? AND first_seen<=? ORDER BY first_seen LIMIT 50", brandId, settings.auto_since, now - settings.delay_minutes * 60000);
  for (const review of due) {
    if (!eligible(review, settings)) continue;
    if (settings.auto_mode === 'publish' && !withinHours(settings, now)) continue;
    const claim = await run(env, "UPDATE rd_reviews SET status='processing',processing_at=? WHERE brand_id=? AND id=? AND status='new'", now, brandId, review.id);
    if (!claim.meta.changes) continue;
    try {
      const result = await generate(env, review);
      const drafted = await run(env, "UPDATE rd_reviews SET draft=?,status='draft',flag=?,theme=?,processing_at=0 WHERE brand_id=? AND id=? AND status='processing'", result.reply, result.flag, result.theme, brandId, review.id);
      if (!drafted.meta.changes) continue;
      await audit(s, env, 'auto-drafted', review.id);
      if (settings.auto_mode === 'publish' && !result.flag) {
        const current = await loadSettings(s, env), sendAt = Date.now();
        if (current.auto_mode !== 'publish' || !current.publish_consent || !eligible(review, current) || !withinHours(current, sendAt)) continue;
        const day = localParts(current, sendAt).date;
        await run(env, 'INSERT OR IGNORE INTO rd_daily_budget(brand_id,day,used) VALUES(?,?,0)', brandId, day);
        const reserve = await run(env, 'UPDATE rd_daily_budget SET used=used+1 WHERE brand_id=? AND day=? AND used<?', brandId, day, current.limit);
        if (reserve.meta.changes) await publish(env, await getReview(s, env, review.id), true);
      }
    } catch (error) {
      await run(env, "UPDATE rd_reviews SET status='new',processing_at=0 WHERE brand_id=? AND id=? AND status='processing'", brandId, review.id);
      await audit(s, env, 'automation failed', review.id, error.message);
    }
  }
}

async function push(request, env) {
  const bearer = request.headers.get('Authorization') || '';
  if (!bearer.startsWith('Bearer ')) return json({ error: 'Authenticated Pub/Sub push required.' }, 401);
  try { await verifyPushJWT(bearer.slice(7), env, env.__fetch || fetch); }
  catch (error) { return json({ error: 'Invalid push identity.' }, error.message.includes('unavailable') ? 503 : 401); }
  await ensureReviewDeskSchema(env.DB);
  const body = await input(request);
  if (typeof body.message?.data !== 'string' || body.message.data.length > 100000) throw Error('Invalid Pub/Sub message.');
  const notification = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.message.data), x => x.charCodeAt(0))));
  const location = notification.locationName, id = notificationReview(notification, location);
  if (!id) return new Response(null, { status: 204 });
  const owners = await all(env, 'SELECT brand_id FROM rd_locations WHERE name=? AND enabled=1', location);
  if (owners.length !== 1) return new Response(null, { status: 204 });
  const brandEnv = forBrand(env, owners[0].brand_id);
  const token = await googleToken(brandEnv), review = await requestJSON(brandEnv, `https://mybusiness.googleapis.com/v4/${id}`, { token });
  await ingest(scope(brandEnv), brandEnv, review, location);
  await audit(scope(brandEnv), brandEnv, 'review notification', id);
  return new Response(null, { status: 204, headers });
}

function renderUi(env) {
  const brandId = JSON.stringify(env.BRAND_ID);
  return html
    .replace("<script>", `<script>window.REVIEW_DESK_BRAND_ID=${brandId};`)
    .replaceAll("fetch('/api/state')", "fetch('/api/review-desk/state?brandId='+encodeURIComponent(window.REVIEW_DESK_BRAND_ID))")
    .replaceAll("fetch('/api/oauth/start')", "fetch('/api/review-desk/oauth/start?brandId='+encodeURIComponent(window.REVIEW_DESK_BRAND_ID))")
    .replaceAll("fetch('/api/'+name", "fetch('/api/review-desk/'+name+'?brandId='+encodeURIComponent(window.REVIEW_DESK_BRAND_ID)")
    .replaceAll("location.href=j.url", "window.top.location.href=j.url")
    .replaceAll("location.origin+'/oauth/callback'", "location.origin+'/api/review-desk/oauth/callback'")
    .replaceAll("+'server environment and restart it.'", "+'Site environment variables.'")
    .replaceAll("Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>", "Set <code>REVIEW_DESK_GOOGLE_CLIENT_ID</code>, <code>REVIEW_DESK_GOOGLE_CLIENT_SECRET</code>, and <code>REVIEW_DESK_TOKEN_KEY</code>")
    .replace("if(a==='logout'){await fetch('/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.href='/';return}", "if(a==='logout'){return}")
    .replace('<button data-action="logout">Sign out</button>', '');
}

export async function handleReviewDeskRequest(request, env) {
  try {
    config(env);
    const url = new URL(request.url);
    if (url.origin !== env.PUBLIC_BASE_URL) return json({ error: 'Invalid host.' }, 403);
    if (url.pathname === '/webhooks/pubsub') return request.method === 'POST' ? await push(request, env) : json({ error: 'Not found.' }, 404);
    if (request.method === 'POST' && !sameOrigin(request, env)) return json({ error: 'Invalid origin.' }, 403);
    const ownerEmail = await auth(request, env);
    if (!ownerEmail) return json({ error: 'Sign in required.' }, 401);
    if (url.pathname === '/' && request.method === 'GET') return page(renderUi(env));
    if (url.pathname === '/api/state' && request.method === 'GET') return json(await state(scope(env), env));
    if (url.pathname === '/api/oauth/start' && request.method === 'GET') return json({ url: await oauthStart(env, ownerEmail) });
    if (url.pathname === '/oauth/callback' && request.method === 'GET') {
      await oauthFinish(env, ownerEmail, url);
      const target = new URL('/', env.PUBLIC_BASE_URL);
      target.searchParams.set('reviewDeskConnected', '1');
      target.searchParams.set('brandId', env.BRAND_ID);
      return new Response(null, { status: 303, headers: { ...headers, Location: target.toString() } });
    }
    if (url.pathname.startsWith('/api/') && request.method === 'POST') return json(await act(env, url.pathname.slice(5), await input(request)));
    return json({ error: 'Not found.' }, 404);
  } catch (error) {
    return json({ error: String(error.message || 'Request failed.').slice(0, 300) }, error instanceof SyntaxError ? 400 : error.status >= 500 ? 503 : 400);
  }
}

export async function scheduledBrand(_event, env) {
  await purge(scope(env), env);
  try {
    if (await one(env, "SELECT 1 FROM rd_secrets WHERE brand_id=? AND name='google_refresh'", env.BRAND_ID) && await one(env, 'SELECT 1 FROM rd_locations WHERE brand_id=? AND enabled=1', env.BRAND_ID)) await sync(env);
    await autoTick(env);
  } catch (error) {
    await audit(scope(env), env, 'scheduled check failed', '', error.message);
    throw error;
  }
}

const reviewDeskWorker = {
  fetch: handleReviewDeskRequest,
  async scheduled(event, env) {
    config(env);
    for (const brandId of BRANDS) await scheduledBrand(event, forBrand(env, brandId));
  },
};

export default reviewDeskWorker;
