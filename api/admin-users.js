import { createClient } from '@supabase/supabase-js';

function normalizeUsername(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function clients(req) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) throw new Error('MISSING_ENV');

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('MISSING_TOKEN');

  return {
    userClient: createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    adminClient: createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function requireSuperAdmin(req) {
  const { userClient, adminClient } = clients(req);
  const { data: callerData, error: callerError } = await userClient.auth.getUser();
  if (callerError || !callerData?.user) throw new Error('INVALID_SESSION');

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role,active')
    .eq('id', callerData.user.id)
    .single();

  if (!callerProfile?.active || callerProfile.role !== 'super_admin') {
    throw new Error('FORBIDDEN');
  }
  return adminClient;
}

async function listUsers(adminClient) {
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id,username,full_name,role,nursery_id,permissions,active,created_at,nurseries(name_ar,name_en)')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const { data: authPage } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authLookup = new Map((authPage?.users || []).map((u) => [u.id, u]));

  return (profiles || []).map((row) => {
    const authUser = authLookup.get(row.id);
    return {
      id: row.id,
      username: row.username || '',
      full_name: row.full_name || '',
      role: row.role,
      nursery_id: row.nursery_id,
      nursery: row.nurseries?.name_ar || '',
      nursery_en: row.nurseries?.name_en || '',
      permissions: row.permissions || {},
      active: row.active !== false,
      last_login: authUser?.last_sign_in_at || '',
      last_activity: row.created_at ? 'حساب فعلي' : '',
      data_scope: row.role === 'nursery' ? 'nursery_only' : row.role === 'super_admin' ? 'all' : 'permissions',
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let adminClient;
  try {
    adminClient = await requireSuperAdmin(req);
  } catch (error) {
    const code = error?.message;
    if (code === 'MISSING_ENV') return res.status(500).json({ error: 'Missing Supabase server environment variables', code: 'MISSING_ENV' });
    if (code === 'MISSING_TOKEN' || code === 'INVALID_SESSION') return res.status(401).json({ error: 'Invalid session', code: code || 'INVALID_SESSION' });
    if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Super admin required', code: 'FORBIDDEN' });
    return res.status(500).json({ error: 'Authentication failed' });
  }

  const { action, user, id, active } = req.body || {};

  try {
    if (action === 'list') {
      return res.status(200).json({ users: await listUsers(adminClient) });
    }

    if (action === 'create') {
      const username = normalizeUsername(user?.username);
      if (!username || !user?.password || !user?.full_name || !user?.role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (user.role === 'nursery' && !user.nursery_id) {
        return res.status(400).json({ error: 'Nursery account requires nursery_id' });
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
        nursery_id: user.role === 'nursery' ? user.nursery_id : null,
        permissions: user.role === 'admin' ? (user.permissions || {}) : {},
        active: user.active !== false,
      });
      if (profileError) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return res.status(400).json({ error: profileError.message });
      }
      return res.status(200).json({ users: await listUsers(adminClient) });
    }

    if (action === 'update') {
      if (!id || !user) return res.status(400).json({ error: 'Missing user id' });
      const username = normalizeUsername(user.username);
      const updates = {
        username,
        full_name: user.full_name,
        role: user.role,
        nursery_id: user.role === 'nursery' ? user.nursery_id : null,
        permissions: user.role === 'admin' ? (user.permissions || {}) : {},
        active: user.active !== false,
      };
      const { error: profileError } = await adminClient.from('profiles').update(updates).eq('id', id);
      if (profileError) return res.status(400).json({ error: profileError.message });
      const authUpdate = { user_metadata: { username, full_name: user.full_name } };
      if (user.password) authUpdate.password = user.password;
      if (username) authUpdate.email = `${username}@saams.local`;
      const { error: authError } = await adminClient.auth.admin.updateUserById(id, authUpdate);
      if (authError) return res.status(400).json({ error: authError.message });
      return res.status(200).json({ users: await listUsers(adminClient) });
    }

    if (action === 'toggle') {
      if (!id) return res.status(400).json({ error: 'Missing user id' });
      const { error } = await adminClient.from('profiles').update({ active: Boolean(active) }).eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ users: await listUsers(adminClient) });
    }

    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing user id' });
      const { data: target } = await adminClient.from('profiles').select('role').eq('id', id).single();
      if (target?.role === 'super_admin') {
        const { count } = await adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'super_admin').eq('active', true);
        if ((count || 0) <= 1) return res.status(400).json({ error: 'Cannot delete the last system administrator' });
      }
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(id);
      if (deleteAuthError) return res.status(400).json({ error: deleteAuthError.message });
      return res.status(200).json({ users: await listUsers(adminClient) });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
}
