import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://uipcifmovofxbrrqnmrn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpcGNpZm1vdm9meGJycnFubXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjIwMTIsImV4cCI6MjA4OTM5ODAxMn0.uhi2znO4CQGIYv4zXKRsHgJyDfw-iGpc01-7SsYzmq8';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || (req.headers['x-real-ip'] as string)
    || req.socket?.remoteAddress
    || 'unknown';

  const { user_id, user_name, role, device } = req.body || {};

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/login_logs`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id,
        user_name,
        role,
        device,
        ip_address: ip,
        logged_in_at: new Date().toISOString(),
      }),
    });
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
