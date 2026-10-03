import { DEFAULT, REVIEW_NAME, analytics } from './core.js';
import { assertReviewDeskBrandId } from './schema.ts';

const DAY = 86400000;
const brand = scope => {
  assertReviewDeskBrandId(scope?.brandId);
  return scope.brandId;
};

export const one = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
export const all = async (env, sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results;
export const run = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).run();

export async function loadSettings(scope, env) {
  const brandId = brand(scope);
  await run(env, 'INSERT OR IGNORE INTO rd_settings(brand_id,data) VALUES(?,?)', brandId, JSON.stringify(DEFAULT));
  const row = await one(env, 'SELECT data FROM rd_settings WHERE brand_id=?', brandId);
  return { ...DEFAULT, ...JSON.parse(row.data) };
}

export const putSettings = (scope, env, settings) => run(
  env,
  'INSERT INTO rd_settings(brand_id,data) VALUES(?,?) ON CONFLICT(brand_id) DO UPDATE SET data=excluded.data',
  brand(scope), JSON.stringify(settings),
);

export async function audit(scope, env, action, review = '', detail = '') {
  const brandId = brand(scope);
  let digest = '';
  if (review) digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(review)))].slice(0, 6).map(x => x.toString(16).padStart(2, '0')).join('');
  await run(env, 'INSERT INTO rd_audit(brand_id,ts,action,review,detail) VALUES(?,?,?,?,?)', brandId, Date.now(), action, digest, String(detail).slice(0, 300));
}

export async function purge(scope, env, now = Date.now()) {
  const brandId = brand(scope), cutoff = now - 30 * DAY;
  await run(env, 'DELETE FROM rd_reviews WHERE brand_id=? AND demo=0 AND (first_seen<? OR created<?)', brandId, cutoff, new Date(cutoff).toISOString());
  await run(env, 'DELETE FROM rd_locations WHERE brand_id=? AND seen<?', brandId, cutoff);
  await run(env, 'DELETE FROM rd_audit WHERE brand_id=? AND ts<?', brandId, cutoff);
  await run(env, 'DELETE FROM rd_oauth_states WHERE brand_id=? AND expires<?', brandId, now);
  await run(env, 'DELETE FROM rd_daily_budget WHERE brand_id=? AND day<?', brandId, new Date(cutoff).toISOString().slice(0, 10));
}

export async function ingest(scope, env, review, parent, now = Date.now()) {
  const brandId = brand(scope), id = review.name || `${parent}/reviews/${review.reviewId}`;
  if (!REVIEW_NAME.test(id) || !id.startsWith(`${parent}/reviews/`)) throw Error('Invalid review name from Google.');
  const created = review.createTime || '';
  if (!Number.isFinite(Date.parse(created)) || Date.parse(created) < now - 30 * DAY) return false;
  const rating = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[review.starRating] || 0;
  const name = review.reviewer?.displayName || 'Customer', body = review.comment || '', updated = review.updateTime || '';
  const reply = review.reviewReply?.comment || '', published = review.reviewReply?.updateTime || '';
  const old = await one(env, 'SELECT * FROM rd_reviews WHERE brand_id=? AND id=?', brandId, id);
  if (!old) {
    await run(env, 'INSERT OR IGNORE INTO rd_reviews(brand_id,id,name,rating,text,draft,status,demo,updated,location,created,first_seen,published_at,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', brandId, id, name, rating, body, reply, reply ? 'published' : 'new', 0, updated, parent, created, now, published, 'Google');
    return true;
  }
  const changed = old.updated !== updated || old.text !== body || old.rating !== rating;
  let status = old.status, draft = old.draft, flag = old.flag;
  if (reply) { status = 'published'; draft = reply; flag = ''; }
  else if (old.status === 'published') { status = 'draft'; flag = 'Google reply was removed; check before replying again'; }
  else if (changed) { status = old.draft ? 'draft' : 'new'; flag = 'Review changed; recheck the reply'; }
  await run(env, 'UPDATE rd_reviews SET name=?,rating=?,text=?,draft=?,status=?,updated=?,location=?,created=?,published_at=?,flag=? WHERE brand_id=? AND id=?', name, rating, body, draft, status, updated, parent, created, published, flag, brandId, id);
  return true;
}

export async function listReviews(scope, env) {
  return all(env, 'SELECT * FROM rd_reviews WHERE brand_id=? ORDER BY demo ASC, created DESC, first_seen DESC', brand(scope));
}

export async function getReview(scope, env, id) {
  const r = typeof id === 'string' ? await one(env, 'SELECT * FROM rd_reviews WHERE brand_id=? AND id=?', brand(scope), id) : null;
  if (!r) throw Error('Review not found for this business.');
  return r;
}

export async function saveDraft(scope, env, id, text, mode = 'save', flag = '') {
  const brandId = brand(scope);
  if (typeof text !== 'string' || !text.trim() || text.length > 4096) throw Error('Reply must contain 1–4096 characters.');
  const r = await getReview(scope, env, id);
  if (['published', 'sample-replied', 'publishing', 'processing'].includes(r.status)) throw Error('This reply is being processed or is read-only. Reload and try again.');
  const status = mode === 'approve' ? 'approved' : 'draft';
  const result = await run(env, "UPDATE rd_reviews SET draft=?,status=?,flag=?,theme='' WHERE brand_id=? AND id=? AND status NOT IN ('published','sample-replied','publishing','processing')", text.trim(), status, mode === 'approve' ? '' : (flag || r.flag), brandId, id);
  if (!result.meta.changes) throw Error('Review status changed; reload and try again.');
  await audit(scope, env, mode, id);
  return getReview(scope, env, id);
}

export async function learn(scope, env, id) {
  const brandId = brand(scope), r = await getReview(scope, env, id);
  if (r.demo || !r.draft) return;
  const key = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${brandId}:${id}`)))].map(x => x.toString(16).padStart(2, '0')).join('');
  await run(env, "INSERT INTO rd_examples(brand_id,review_id,original,reply,created) VALUES(?,?,'',?,?) ON CONFLICT(brand_id,review_id) DO UPDATE SET reply=excluded.reply,created=excluded.created", brandId, key, r.draft, Date.now());
}

export async function state(scope, env) {
  const brandId = brand(scope);
  await purge(scope, env);
  const [reviews, locations, examples, history, settings, token] = await Promise.all([
    listReviews(scope, env),
    all(env, 'SELECT * FROM rd_locations WHERE brand_id=? ORDER BY title', brandId),
    all(env, 'SELECT * FROM rd_examples WHERE brand_id=? ORDER BY created DESC LIMIT 100', brandId),
    all(env, 'SELECT * FROM rd_audit WHERE brand_id=? ORDER BY ts DESC LIMIT 60', brandId),
    loadSettings(scope, env),
    one(env, "SELECT 1 FROM rd_secrets WHERE brand_id=? AND name='google_refresh'", brandId),
  ]);
  return {
    reviews, locations, examples, audit: history.map(x => ({ ...x, ts: x.ts / 1000 })),
    settings: { ...settings, synced_at: settings.synced_at / 1000 }, analytics: analytics(reviews, settings),
    ai: !!env.OPENAI_API_KEY,
    google: !!token,
    automation_ready: env.SCHEDULED_WORK_ENABLED === true,
    oauth_ready: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.TOKEN_KEY),
    notifications_ready: !!(env.PUBSUB_TOPIC && env.PUSH_SERVICE_ACCOUNT && env.PUSH_AUDIENCE),
  };
}
