import { createClient } from '@supabase/supabase-js';

function normalizeUsername(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const adminKeys = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY].filter(Boolean);
  const recoveryCode = process.env.SAAMS_ADMIN_RECOVERY_CODE;

  if (!url || !adminKeys.length) {
    return res.status(500).json({ code: 'MISSING_ENV', error: 'Server Supabase settings are incomplete' });
  }
  if (!recoveryCode) {
    return res.status(500).json({ code: 'RECOVERY_NOT_CONFIGURED', error: 'Admin recovery is not configured' });
  }

  const { username, password, code } = req.body || {};
  const normalized = normalizeUsername(username);
  const suppliedCode = String(code || '');

  if (!normalized || !password || !suppliedCode) {
    return res.status(400).json({ code: 'MISSING_FIELDS', error: 'Missing required fields' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters' });
  }
  if (suppliedCode !== recoveryCode) {
    return res.status(403).json({ code: 'INVALID_RECOVERY_CODE', error: 'Invalid recovery code' });
  }

  try {
    const adminClients = adminKeys.map((key) => createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }));

    let admin = adminClients[0];
    let profile = null;
    let profileError = null;
    for (const candidate of adminClients) {
      const result = await candidate
        .from('profiles')
        .select('id,username,role,active')
        .eq('username', normalized)
        .maybeSingle();
      profile = result.data;
      profileError = result.error;
      if (!profileError) {
        admin = candidate;
        break;
      }
      const message = String(profileError?.message || '').toLowerCase();
      if (!message.includes('invalid api key') && !message.includes('bad_jwt')) break;
    }

    if (profileError) return res.status(400).json({ code: 'PROFILE_QUERY_FAILED', error: profileError.message });
    if (!profile) return res.status(404).json({ code: 'PROFILE_NOT_FOUND', error: 'Profile not found' });
    if (profile.role !== 'super_admin') {
      return res.status(403).json({ code: 'NOT_SUPER_ADMIN', error: 'Recovery is only available for system administrators' });
    }
    if (profile.active === false) {
      return res.status(403).json({ code: 'ACCOUNT_DISABLED', error: 'System administrator account is disabled' });
    }

    let authUser = null;
    let authLookupError = null;
    let authClient = admin;
    for (const candidate of adminClients) {
      const result = await candidate.auth.admin.getUserById(profile.id);
      authUser = result.data;
      authLookupError = result.error;
      if (!authLookupError && authUser?.user) {
        authClient = candidate;
        break;
      }
      const message = String(authLookupError?.message || '').toLowerCase();
      const code = String(authLookupError?.code || authLookupError?.error_code || '').toLowerCase();
      if (!message.includes('invalid api key') && !message.includes('bad_jwt') && code !== 'bad_jwt') break;
    }
    if (authLookupError || !authUser?.user) {
      return res.status(404).json({ code: 'AUTH_USER_NOT_FOUND', error: authLookupError?.message || 'Authentication user not found' });
    }

    let updateError = null;
    const orderedClients = [authClient, ...adminClients.filter((client) => client !== authClient)];
    for (const candidate of orderedClients) {
      const result = await candidate.auth.admin.updateUserById(profile.id, {
        password: String(password),
        user_metadata: {
          ...(authUser.user.user_metadata || {}),
          username: normalized,
        },
      });
      updateError = result.error;
      if (!updateError) break;
      const message = String(updateError?.message || '').toLowerCase();
      const code = String(updateError?.code || updateError?.error_code || '').toLowerCase();
      const keyRelated = message.includes('invalid api key') || message.includes('bad jwt') || message.includes('bad_jwt') || code === 'bad_jwt';
      if (!keyRelated) break;
    }
    if (updateError) return res.status(400).json({ code: 'RESET_FAILED', error: updateError.message, supabase_code: updateError.code || updateError.error_code || '' });

    return res.status(200).json({ ok: true, username: normalized });
  } catch (error) {
    return res.status(500).json({ code: 'UNEXPECTED', error: error?.message || 'Unexpected server error' });
  }
}
