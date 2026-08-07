import { createClient } from '@supabase/supabase-js';

function normalizeUsername(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const recoveryCode = process.env.SAAMS_ADMIN_RECOVERY_CODE;

  if (!url || !serviceKey) {
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
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id,username,role,active')
      .eq('username', normalized)
      .maybeSingle();

    if (profileError) return res.status(400).json({ code: 'PROFILE_QUERY_FAILED', error: profileError.message });
    if (!profile) return res.status(404).json({ code: 'PROFILE_NOT_FOUND', error: 'Profile not found' });
    if (profile.role !== 'super_admin') {
      return res.status(403).json({ code: 'NOT_SUPER_ADMIN', error: 'Recovery is only available for system administrators' });
    }
    if (profile.active === false) {
      return res.status(403).json({ code: 'ACCOUNT_DISABLED', error: 'System administrator account is disabled' });
    }

    const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(profile.id);
    if (authLookupError || !authUser?.user) {
      return res.status(404).json({ code: 'AUTH_USER_NOT_FOUND', error: authLookupError?.message || 'Authentication user not found' });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
      password: String(password),
      user_metadata: {
        ...(authUser.user.user_metadata || {}),
        username: normalized,
      },
    });
    if (updateError) return res.status(400).json({ code: 'RESET_FAILED', error: updateError.message });

    return res.status(200).json({ ok: true, username: normalized });
  } catch (error) {
    return res.status(500).json({ code: 'UNEXPECTED', error: error?.message || 'Unexpected server error' });
  }
}
