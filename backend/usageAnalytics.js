function summarizeUsageEvents(events, limit = 200) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 200;
  const sorted = [...(events || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const recent = sorted.slice(0, safeLimit);

  const byAction = {};
  const byRole = {};
  const byOutcome = {};

  for (const item of recent) {
    byAction[item.action] = (byAction[item.action] || 0) + 1;
    byRole[item.role] = (byRole[item.role] || 0) + 1;
    const outcome = item.outcome || 'success';
    byOutcome[outcome] = (byOutcome[outcome] || 0) + 1;
  }

  return {
    totalEvents: (events || []).length,
    recentCount: recent.length,
    byAction,
    byRole,
    byOutcome,
  };
}

function detectUsageAnomalies(events, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const windowHours = Number.isFinite(options.windowHours) ? Math.max(options.windowHours, 1) : 24;
  const minEvents = Number.isFinite(options.minEvents) ? Math.max(options.minEvents, 1) : 25;
  const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  const bucket = new Map();
  for (const event of events || []) {
    const created = new Date(event.created_at);
    if (Number.isNaN(created.getTime()) || created < windowStart) continue;
    const key = event.actor_key || 'unknown';
    const current = bucket.get(key) || {
      actor_key: key,
      role: event.role || 'unknown',
      total: 0,
      blocked: 0,
      actions: {},
      last_seen: event.created_at,
    };
    current.total += 1;
    if ((event.outcome || 'success') === 'blocked') current.blocked += 1;
    current.actions[event.action] = (current.actions[event.action] || 0) + 1;
    if (new Date(current.last_seen) < created) current.last_seen = event.created_at;
    bucket.set(key, current);
  }

  return Array.from(bucket.values())
    .filter((row) => row.total >= minEvents || row.blocked >= Math.ceil(minEvents / 4))
    .sort((a, b) => (b.blocked - a.blocked) || (b.total - a.total));
}

module.exports = {
  summarizeUsageEvents,
  detectUsageAnomalies,
};
