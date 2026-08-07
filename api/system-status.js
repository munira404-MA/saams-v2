export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const hasUrl = Boolean(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return res.status(200).json({
    serverReachable: true,
    supabaseServerUrl: hasUrl,
    supabaseAnonKey: hasAnonKey,
    supabaseServiceRoleKey: hasServiceRoleKey,
    accountManagementReady: hasUrl && hasAnonKey && hasServiceRoleKey,
  });
}
