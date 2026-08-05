import { createClient } from '@supabase/supabase-js';

function normalizeUsername(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return res.status(500).json({ error: 'Missing Supabase server environment variables' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerData, error: callerError } = await userClient.auth.getUser();
  if (callerError || !callerData?.user) return res.status(401).json({ error: 'Invalid session' });

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role,active')
    .eq('id', callerData.user.id)
    .single();
  if (!callerProfile?.active || callerProfile.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin required' });
  }

  const { action, user } = req.body || {};
  if (action !== 'create') return res.status(400).json({ error: 'Unsupported action' });

  const username = normalizeUsername(user?.username);
  if (!username || !user?.password || !user?.full_name || !user?.role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const email = `${username}@saams.local`;

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: user.password,
    email_confirm: true,
    user_metadata: { username, full_name: user.full_name },
  });
  if (createError) return res.status(400).json({ error: createError.message });

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: created.user.id,
    username,
    full_name: user.full_name,
    role: user.role,
    nursery_id: user.nursery_id || null,
    permissions: user.permissions || {},
    active: user.active !== false,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return res.status(400).json({ error: profileError.message });
  }

  return res.status(200).json({ id: created.user.id, email, username });
}
