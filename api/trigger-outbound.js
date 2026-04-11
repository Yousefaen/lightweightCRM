import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authenticated Supabase user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Internally call the cron endpoint with CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ error: 'CRON_SECRET not configured on server' });
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const cronUrl = `${protocol}://${host}/api/cron/daily-outbound?manual=1`;

  try {
    const cronRes = await fetch(cronUrl, {
      headers: { 'Authorization': `Bearer ${cronSecret}` },
    });

    const body = await cronRes.json();

    if (!cronRes.ok) {
      return res.status(cronRes.status).json(body);
    }

    return res.status(200).json(body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
