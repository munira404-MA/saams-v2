import { createClient } from '@supabase/supabase-js';
import { supabaseClientOptions } from './_supabase-network.js';

function normalizeUsername(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

function clients(req) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const adminKeys = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY].filter(Boolean);
  if (!url || !anonKey || !adminKeys.length) throw new Error('MISSING_ENV');

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('MISSING_TOKEN');

  return {
    userClient: createClient(url, anonKey, supabaseClientOptions({ global: { headers: { Authorization: `Bearer ${token}` } } })),
    adminClients: adminKeys.map((key) => createClient(url, key, supabaseClientOptions())),
  };
}

async function requireSuperAdmin(req) {
  const { userClient, adminClients } = clients(req);
  const { data: callerData, error: callerError } = await userClient.auth.getUser();
  if (callerError || !callerData?.user) throw new Error('INVALID_SESSION');

  let adminClient = adminClients[0];
  let callerProfile = null;
  let profileError = null;
  for (const candidate of adminClients) {
    const result = await candidate
      .from('profiles')
      .select('role,active,username')
      .eq('id', callerData.user.id)
      .single();
    callerProfile = result.data;
    profileError = result.error;
    if (!profileError && callerProfile) {
      adminClient = candidate;
      break;
    }
    const message = String(profileError?.message || '').toLowerCase();
    if (!message.includes('invalid api key') && !message.includes('bad_jwt')) break;
  }

  if (profileError || !callerProfile) {
    const error = new Error('PROFILE_NOT_FOUND');
    error.callerId = callerData.user.id;
    error.details = profileError?.message || '';
    throw error;
  }

  // Older production rows may have active = NULL. Treat only an explicit false as disabled.
  if (callerProfile.active === false || callerProfile.role !== 'super_admin') {
    const error = new Error('FORBIDDEN');
    error.callerId = callerData.user.id;
    error.callerRole = callerProfile.role || '';
    error.callerUsername = callerProfile.username || '';
    error.callerActive = callerProfile.active;
    throw error;
  }
  return { adminClient, adminClients, caller: { id: callerData.user.id, role: callerProfile.role, username: callerProfile.username || '' } };
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

async function runAuthAdmin(adminClients, operation) {
  let lastError = null;
  for (const candidate of adminClients) {
    const result = await operation(candidate);
    if (!result?.error) return { ...result, client: candidate };
    lastError = result.error;
    const message = String(result.error?.message || '').toLowerCase();
    const code = String(result.error?.code || result.error?.error_code || '').toLowerCase();
    const keyRelated = message.includes('invalid api key') || message.includes('bad jwt') || message.includes('bad_jwt') || code === 'bad_jwt';
    if (!keyRelated) return { ...result, client: candidate };
  }
  return { error: lastError || new Error('Supabase admin authentication failed'), client: adminClients[0] };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let adminClient;
  let adminClients = [];
  let caller;
  try {
    const auth = await requireSuperAdmin(req);
    adminClient = auth.adminClient;
    adminClients = auth.adminClients || [auth.adminClient];
    caller = auth.caller;
  } catch (error) {
    const code = error?.message;
    if (code === 'MISSING_ENV') return res.status(500).json({ error: 'Missing Supabase server environment variables', code: 'MISSING_ENV' });
    if (code === 'MISSING_TOKEN' || code === 'INVALID_SESSION') return res.status(401).json({ error: 'Invalid session', code: code || 'INVALID_SESSION' });
    if (code === 'PROFILE_NOT_FOUND') return res.status(403).json({ error: 'Authenticated user profile was not found', code: 'PROFILE_NOT_FOUND', caller_id: error?.callerId || '' });
    if (code === 'FORBIDDEN') return res.status(403).json({
      error: 'Super admin required',
      code: 'FORBIDDEN',
      caller_id: error?.callerId || '',
      caller_role: error?.callerRole || '',
      caller_username: error?.callerUsername || '',
      caller_active: error?.callerActive ?? null,
    });
    return res.status(500).json({ error: 'Authentication failed' });
  }

  const { action, user, id, active } = req.body || {};

  try {
    if (action === 'list') {
      return res.status(200).json({ users: await listUsers(adminClient), caller });
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
      const createResult = await runAuthAdmin(adminClients, (client) => client.auth.admin.createUser({
        email,
        password: user.password,
        email_confirm: true,
        user_metadata: { username, full_name: user.full_name },
      }));
      const created = createResult.data;
      const createError = createResult.error;
      const writeClient = createResult.client || adminClient;
      if (createError) return res.status(400).json({ error: createError.message, code: createError.code || createError.error_code || '' });

      const { error: profileError } = await writeClient.from('profiles').insert({
        id: created.user.id,
        username,
        full_name: user.full_name,
        role: user.role,
        nursery_id: user.role === 'nursery' ? user.nursery_id : null,
        permissions: user.role === 'admin' ? (user.permissions || {}) : {},
        active: user.active !== false,
      });
      if (profileError) {
        await runAuthAdmin(adminClients, (client) => client.auth.admin.deleteUser(created.user.id));
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
      const authResult = await runAuthAdmin(adminClients, (client) => client.auth.admin.updateUserById(id, authUpdate));
      const authError = authResult.error;
      if (authError) return res.status(400).json({ error: authError.message, code: authError.code || authError.error_code || '' });
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
      const deleteResult = await runAuthAdmin(adminClients, (client) => client.auth.admin.deleteUser(id));
      const deleteAuthError = deleteResult.error;
      if (deleteAuthError) return res.status(400).json({ error: deleteAuthError.message, code: deleteAuthError.code || deleteAuthError.error_code || '' });
      return res.status(200).json({ users: await listUsers(adminClient) });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
}
