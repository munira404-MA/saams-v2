import { createClient } from '@supabase/supabase-js';

function normalizeUsername(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function normalizeSupabaseUrl(value = '') {
  return String(value)
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');
}

function keyKind(key = '') {
  const value = String(key).trim();
  if (value.startsWith('sb_secret_')) return 'secret';
  if (value.startsWith('eyJ')) return 'legacy-jwt';
  return value ? 'unknown' : 'missing';
}

function safeError(error) {
  return {
    message: error?.message || String(error || 'Unknown error'),
    code: error?.code || error?.error_code || '',
    status: error?.status || '',
  };
}

function logStage(stage, extra = {}) {
  console.log('[SAAMS admin-recovery]', JSON.stringify({ stage, ...extra }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const rawKeys = [
    { name: 'SUPABASE_SECRET_KEY', value: process.env.SUPABASE_SECRET_KEY },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
  ].filter((item) => String(item.value || '').trim());
  const recoveryCode = String(process.env.SAAMS_ADMIN_RECOVERY_CODE || '');

  logStage('request_received', {
    hasUrl: Boolean(url),
    urlHost: (() => { try { return new URL(url).host; } catch { return 'invalid-url'; } })(),
    keyTypes: rawKeys.map((item) => `${item.name}:${keyKind(item.value)}`),
    recoveryConfigured: Boolean(recoveryCode),
  });

  if (!url || !rawKeys.length) {
    logStage('missing_env');
    return res.status(500).json({ code: 'MISSING_ENV', error: 'Server Supabase settings are incomplete' });
  }
  if (!recoveryCode) {
    logStage('recovery_not_configured');
    return res.status(500).json({ code: 'RECOVERY_NOT_CONFIGURED', error: 'Admin recovery is not configured' });
  }

  const { username, password, code } = req.body || {};
  const normalized = normalizeUsername(username);
  const suppliedCode = String(code || '');

  if (!normalized || !password || !suppliedCode) {
    logStage('missing_fields', { hasUsername: Boolean(normalized), hasPassword: Boolean(password), hasCode: Boolean(suppliedCode) });
    return res.status(400).json({ code: 'MISSING_FIELDS', error: 'Missing required fields' });
  }
  if (String(password).length < 8) {
    logStage('weak_password', { length: String(password).length });
    return res.status(400).json({ code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters' });
  }
  if (suppliedCode !== recoveryCode) {
    logStage('invalid_recovery_code');
    return res.status(403).json({ code: 'INVALID_RECOVERY_CODE', error: 'Invalid recovery code' });
  }

  try {
    const adminClients = rawKeys.map((item) => ({
      name: item.name,
      kind: keyKind(item.value),
      client: createClient(url, String(item.value).trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    }));

    let selected = adminClients[0];
    let profile = null;
    let profileError = null;

    for (const candidate of adminClients) {
      logStage('profile_query_start', { key: candidate.name, kind: candidate.kind });
      const result = await candidate.client
        .from('profiles')
        .select('id,username,role,active')
        .eq('username', normalized)
        .maybeSingle();

      profile = result.data;
      profileError = result.error;

      if (!profileError) {
        selected = candidate;
        logStage('profile_query_ok', { key: candidate.name, found: Boolean(profile), role: profile?.role || '' });
        break;
      }

      const err = safeError(profileError);
      logStage('profile_query_failed', { key: candidate.name, ...err });
      const message = err.message.toLowerCase();
      if (!message.includes('invalid api key') && !message.includes('bad_jwt') && !message.includes('bad jwt')) break;
    }

    if (profileError) {
      return res.status(400).json({ code: 'PROFILE_QUERY_FAILED', stage: 'profile_query', error: profileError.message, supabase_code: profileError.code || '' });
    }
    if (!profile) {
      logStage('profile_not_found', { username: normalized });
      return res.status(404).json({ code: 'PROFILE_NOT_FOUND', stage: 'profile_lookup', error: 'Profile not found' });
    }
    if (profile.role !== 'super_admin') {
      logStage('not_super_admin', { role: profile.role || '' });
      return res.status(403).json({ code: 'NOT_SUPER_ADMIN', stage: 'role_check', error: 'Recovery is only available for system administrators' });
    }
    if (profile.active === false) {
      logStage('account_disabled');
      return res.status(403).json({ code: 'ACCOUNT_DISABLED', stage: 'active_check', error: 'System administrator account is disabled' });
    }

    let authUser = null;
    let authLookupError = null;
    let authSelected = selected;

    for (const candidate of adminClients) {
      logStage('auth_lookup_start', { key: candidate.name, kind: candidate.kind });
      const result = await candidate.client.auth.admin.getUserById(profile.id);
      authUser = result.data;
      authLookupError = result.error;

      if (!authLookupError && authUser?.user) {
        authSelected = candidate;
        logStage('auth_lookup_ok', { key: candidate.name });
        break;
      }

      const err = safeError(authLookupError);
      logStage('auth_lookup_failed', { key: candidate.name, ...err });
      const message = err.message.toLowerCase();
      const codeValue = String(err.code).toLowerCase();
      if (!message.includes('invalid api key') && !message.includes('bad jwt') && !message.includes('bad_jwt') && codeValue !== 'bad_jwt') break;
    }

    if (authLookupError || !authUser?.user) {
      return res.status(404).json({ code: 'AUTH_USER_NOT_FOUND', stage: 'auth_lookup', error: authLookupError?.message || 'Authentication user not found' });
    }

    let updateError = null;
    const ordered = [authSelected, ...adminClients.filter((item) => item !== authSelected)];
    for (const candidate of ordered) {
      logStage('password_update_start', { key: candidate.name, kind: candidate.kind });
      const result = await candidate.client.auth.admin.updateUserById(profile.id, {
        password: String(password),
        user_metadata: {
          ...(authUser.user.user_metadata || {}),
          username: normalized,
        },
      });
      updateError = result.error;
      if (!updateError) {
        logStage('password_update_ok', { key: candidate.name });
        break;
      }

      const err = safeError(updateError);
      logStage('password_update_failed', { key: candidate.name, ...err });
      const message = err.message.toLowerCase();
      const codeValue = String(err.code).toLowerCase();
      const keyRelated = message.includes('invalid api key') || message.includes('bad jwt') || message.includes('bad_jwt') || codeValue === 'bad_jwt';
      if (!keyRelated) break;
    }

    if (updateError) {
      return res.status(400).json({ code: 'RESET_FAILED', stage: 'password_update', error: updateError.message, supabase_code: updateError.code || updateError.error_code || '' });
    }

    logStage('success', { username: normalized });
    return res.status(200).json({ ok: true, username: normalized });
  } catch (error) {
    const err = safeError(error);
    logStage('unexpected', err);
    return res.status(500).json({ code: 'UNEXPECTED', stage: 'unexpected', error: err.message });
  }
}
