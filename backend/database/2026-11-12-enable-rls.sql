-- Enable row level security on every table in the public schema and close the
-- anon / authenticated PostgREST surface.
--
-- Why there are no per-user policies:
--   The app does not use Supabase Auth. Users live in public.users and the
--   backend issues its own JWTs, so auth.uid() is never set for any request.
--   The browser never talks to Supabase (the Next.js app only calls /api/*,
--   which proxies to the Express backend). Every query is made by the backend
--   with SUPABASE_KEY. Per-row policies for "authenticated" would therefore
--   match nothing, and any policy for "anon" would only reopen the hole.
--
--   Result: RLS on, no policies for anon/authenticated (default deny), and
--   the service_role (BYPASSRLS) is the only role that can read or write.
--
-- REQUIRED BEFORE APPLYING: backend SUPABASE_KEY must be the service_role /
-- secret key (sb_secret_... or a JWT whose role is service_role). With the
-- anon key (what .env.example currently suggests) the backend loses all
-- access to these tables once this runs.
--
-- Safe to re-run. Tables/views that do not exist in a given database are skipped.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'users',
        'permits',
        'objections',
        'activity_log',
        'access_approvals',
        'feedback_submissions',
        'ingestion_schedule',
        'ingestion_runs',
        'letter_generation_runs'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            -- Defense in depth: also drop the table grants Supabase gives anon/authenticated by default.
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
            -- Make the service role's access explicit (it bypasses RLS regardless).
            EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
        END IF;
    END LOOP;
END $$;

-- Views are owned by the migrating role and run with its privileges by default,
-- which bypasses RLS on the underlying tables. Make them run as the caller
-- (PostgreSQL 15+) and revoke anon/authenticated access outright.
DO $$
DECLARE
    v text;
    views text[] := ARRAY['stats_view', 'recent_activity_view'];
BEGIN
    FOREACH v IN ARRAY views LOOP
        IF to_regclass(format('public.%I', v)) IS NOT NULL THEN
            IF current_setting('server_version_num')::int >= 150000 THEN
                EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v);
            END IF;
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', v);
            EXECUTE format('GRANT SELECT ON TABLE public.%I TO service_role', v);
        END IF;
    END LOOP;
END $$;

-- Sequences behind BIGSERIAL ids (access_approvals, feedback_submissions).
DO $$
DECLARE s text;
BEGIN
    FOREACH s IN ARRAY ARRAY['access_approvals_id_seq', 'feedback_submissions_id_seq'] LOOP
        IF to_regclass(format('public.%I', s)) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon, authenticated', s);
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO service_role', s);
        END IF;
    END LOOP;
END $$;
