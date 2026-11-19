/**
 * SMS on/off switch for the webhook.
 *
 * GET  -> { smsEnabled }
 * POST { smsEnabled: boolean } with header X-Admin-Password -> { smsEnabled }
 *
 * The value lives in Supabase (app_settings.sms_enabled) so it survives
 * function restarts; webhook.js reads it before sending any SMS.
 * Default / any error = OFF.
 */

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(data),
  };
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

function passwordMatches(given) {
  if (!ADMIN_PASSWORD || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function readSetting() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/app_settings?select=value&key=eq.sms_enabled&limit=1`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Could not read setting (${res.status})`);
  const rows = await res.json();
  return rows[0]?.value === true;
}

async function writeSetting(enabled) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
    method: 'POST',
    headers: headers({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    }),
    body: JSON.stringify({ key: 'sms_enabled', value: enabled, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Could not save setting (${res.status})`);
}

exports.handler = async (event) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Supabase is not configured' });
  }

  try {
    if (event.httpMethod === 'GET') {
      return json(200, { smsEnabled: await readSetting() });
    }

    if (event.httpMethod === 'POST') {
      const given = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
      if (!passwordMatches(given)) {
        return json(401, { error: 'Wrong password' });
      }
      const { smsEnabled } = JSON.parse(event.body || '{}');
      if (typeof smsEnabled !== 'boolean') {
        return json(400, { error: 'smsEnabled must be true or false' });
      }
      await writeSetting(smsEnabled);
      return json(200, { smsEnabled });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
