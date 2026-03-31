import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  const hunterKey = process.env.HUNTER_API_KEY;
  if (!hunterKey) {
    return res.status(500).json({ error: 'Hunter API key not configured on server' });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const params = new URLSearchParams(url.search);
    params.delete('authorization');
    params.set('api_key', hunterKey);

    const hunterUrl = `https://api.hunter.io/v2/email-finder?${params.toString()}`;
    const response = await fetch(hunterUrl);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
