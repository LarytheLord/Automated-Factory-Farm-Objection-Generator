'use strict';

/**
 * Permit Scheduler — Vercel-compatible source-rotation cron pipeline.
 *
 * Instead of syncing all sources in one long-running process (impossible on
 * serverless with 10s timeout), this module:
 *   1. Picks the next eligible "fast" source from the ingestion_schedule table
 *   2. Fetches + normalizes permits from that one source
 *   3. Upserts results directly into the Supabase `permits` table
 *   4. Records the run in `ingestion_runs` and updates the schedule
 */

const { readSourcePermits, mapSourceRecordToPermit, shouldIncludePermit, normalizePermit } = require('./permitIngestion');

const BATCH_SIZE = 50;

/**
 * Pick the next source to scrape based on eligibility and priority.
 * Returns null if all sources are up-to-date.
 */
async function pickNextSource(supabase) {
    const { data, error } = await supabase
        .from('ingestion_schedule')
        .select('source_key, source_name, poll_interval_hours')
        .eq('enabled', true)
        .eq('tier', 'fast')
        .lte('next_eligible_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('last_run_at', { ascending: true, nullsFirst: true })
        .limit(1)
        .single();

    if (error || !data) return null;
    return data;
}

/**
 * Upsert normalized permits into the Supabase `permits` table.
 * Uses the unique `ingest_key` index for deduplication.
 */
async function upsertPermitsToSupabase(supabase, permits) {
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < permits.length; i += BATCH_SIZE) {
        const batch = permits.slice(i, i + BATCH_SIZE);

        // Check which ingest_keys already exist
        const keys = batch.map((p) => p.ingest_key).filter(Boolean);
        const { data: existing } = await supabase
            .from('permits')
            .select('id, ingest_key')
            .in('ingest_key', keys);

        const existingMap = new Map((existing || []).map((e) => [e.ingest_key, e.id]));

        for (const permit of batch) {
            const payload = {
                project_title: permit.project_title,
                location: permit.location,
                country: permit.country,
                activity: permit.activity,
                status: (permit.status || 'pending').toLowerCase(),
                category: permit.category || 'Unknown',
                notes: permit.notes || '',
                ingest_key: permit.ingest_key,
                source_key: permit.source_key,
                source_name: permit.source_name,
                source_url: permit.source_url || null,
                external_id: permit.external_id || null,
                updated_at: new Date().toISOString(),
            };

            const existingId = existingMap.get(permit.ingest_key);

            if (existingId) {
                const { error } = await supabase
                    .from('permits')
                    .update(payload)
                    .eq('id', existingId);
                if (!error) updated += 1;
            } else {
                const { error } = await supabase
                    .from('permits')
                    .insert(payload);
                if (!error) inserted += 1;
            }
        }
    }

    return { inserted, updated };
}

/**
 * Record a completed ingestion run and update the schedule.
 */
async function completeSourceRun(supabase, sourceKey, stats) {
    const now = new Date();
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Insert run log
    await supabase.from('ingestion_runs').insert({
        run_id: runId,
        source_key: sourceKey,
        trigger: stats.trigger || 'cron',
        started_at: stats.startedAt || now.toISOString(),
        completed_at: now.toISOString(),
        status: stats.errors > 0 ? (stats.inserted > 0 ? 'partial' : 'failed') : 'success',
        records_fetched: stats.fetched || 0,
        records_inserted: stats.inserted || 0,
        records_updated: stats.updated || 0,
        records_skipped: stats.skipped || 0,
        errors: stats.errors || 0,
        error_messages: stats.errorMessages || [],
    }).then(() => {}).catch(() => {});

    // Update schedule
    const pollHours = stats.pollIntervalHours || 48;
    const nextEligible = new Date(now.getTime() + pollHours * 60 * 60 * 1000);

    await supabase
        .from('ingestion_schedule')
        .update({
            last_run_at: now.toISOString(),
            last_run_status: stats.errors > 0 ? (stats.inserted > 0 ? 'partial' : 'failed') : 'success',
            last_run_records_fetched: stats.fetched || 0,
            last_run_records_inserted: stats.inserted || 0,
            last_run_duration_ms: stats.durationMs || 0,
            last_error: stats.lastError || null,
            next_eligible_at: nextEligible.toISOString(),
            updated_at: now.toISOString(),
        })
        .eq('source_key', sourceKey)
        .then(() => {}).catch(() => {});

    return runId;
}

/**
 * Run a single-source scrape: fetch → normalize → upsert to Supabase.
 *
 * @param {object} supabase — Supabase client
 * @param {object} sourceConfig — source object from permit-sources.json
 * @param {object} [opts]
 * @param {string} [opts.trigger] — 'cron' | 'manual' | 'github-actions'
 * @param {number} [opts.fetchTimeoutMs] — HTTP timeout (default 7000 for Vercel)
 */
async function runSingleSourceSync(supabase, sourceConfig, opts = {}) {
    const startedAt = new Date();
    const trigger = opts.trigger || 'cron';
    const fetchTimeoutMs = opts.fetchTimeoutMs || 7000;
    const stats = {
        fetched: 0, inserted: 0, updated: 0, skipped: 0,
        errors: 0, errorMessages: [], lastError: null,
        trigger, startedAt: startedAt.toISOString(),
        pollIntervalHours: sourceConfig.poll_interval_hours || 48,
    };

    try {
        // Override source timeout for Vercel
        const source = { ...sourceConfig, timeout_ms: fetchTimeoutMs };

        // Fetch raw records from the source
        const rawRecords = await readSourcePermits(source, __dirname);
        stats.fetched = rawRecords.length;

        // Transform, filter, normalize
        const nowIso = startedAt.toISOString();
        const normalized = [];

        for (const record of rawRecords) {
            try {
                const mapped = mapSourceRecordToPermit(record, source);
                if (!shouldIncludePermit(mapped, source)) {
                    stats.skipped += 1;
                    continue;
                }
                const permit = normalizePermit(mapped, source, nowIso);
                if (!permit.project_title || !permit.country || !permit.location) {
                    stats.skipped += 1;
                    continue;
                }
                normalized.push(permit);
            } catch (e) {
                stats.errors += 1;
                stats.errorMessages.push(String(e.message || e).slice(0, 200));
            }
        }

        // Upsert to Supabase
        if (normalized.length > 0) {
            const upsertResult = await upsertPermitsToSupabase(supabase, normalized);
            stats.inserted = upsertResult.inserted;
            stats.updated = upsertResult.updated;
        }
    } catch (e) {
        stats.errors += 1;
        stats.lastError = String(e.message || e).slice(0, 500);
        stats.errorMessages.push(stats.lastError);
    }

    stats.durationMs = Date.now() - startedAt.getTime();

    // Record the run
    await completeSourceRun(supabase, sourceConfig.key, stats);

    return stats;
}

module.exports = {
    pickNextSource,
    upsertPermitsToSupabase,
    completeSourceRun,
    runSingleSourceSync,
};
