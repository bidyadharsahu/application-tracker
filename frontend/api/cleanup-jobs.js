import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date().toISOString().split('T')[0];

  // Archive expired jobs
  const { data: expired } = await supabase
    .from('jobs')
    .select('*')
    .lt('last_date', today)
    .neq('applied', true);

  if (expired?.length > 0) {
    await supabase.from('archived_jobs').insert(
      expired.map(j => ({ ...j, original_id: j.id, archive_reason: 'last_date_passed' }))
    );
    await supabase.from('jobs').delete().in('id', expired.map(j => j.id));
  }

  res.json({ archived: expired?.length || 0 });
}
