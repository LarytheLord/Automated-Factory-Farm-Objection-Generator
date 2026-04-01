'use strict';

const crypto = require('crypto');

const LETTER_PROMPT_VERSION = 'permit-letter-v1';

function createLetterGenerationRunId() {
    const stamp = Date.now();
    const suffix = crypto.randomBytes(4).toString('hex');
    return `lgr_${stamp}_${suffix}`;
}

function summarizePermitForRun(permitDetails = {}) {
    return {
        permit_id: permitDetails.id !== undefined && permitDetails.id !== null
            ? String(permitDetails.id)
            : null,
        permit_title: String(permitDetails.project_title || '').trim(),
        permit_location: String(permitDetails.location || '').trim(),
        permit_country: String(permitDetails.country || '').trim(),
        permit_activity: String(permitDetails.activity || '').trim(),
        permit_status: String(permitDetails.status || '').trim() || null,
        permit_category: String(permitDetails.category || '').trim() || null,
        permit_source_key: String(permitDetails.source_key || '').trim() || null,
        permit_source_name: String(permitDetails.source_name || '').trim() || null,
    };
}

function buildLetterGenerationRunRecord({
    runId,
    actor,
    permitDetails,
    letterMode,
    persona,
    status,
    generationStrategy,
    fallbackUsed = false,
    fallbackReason = null,
    modelName = null,
    errorMessage = null,
    startedAt,
    completedAt,
    outputLength = 0,
}) {
    return {
        run_id: runId,
        actor_kind: actor.actor_kind,
        actor_user_id: actor.actor_user_id,
        actor_role: actor.actor_role,
        trigger: 'api',
        status,
        generation_strategy: generationStrategy,
        fallback_used: Boolean(fallbackUsed),
        fallback_reason: fallbackReason || null,
        model_name: modelName || null,
        letter_mode: letterMode,
        persona_id: persona,
        prompt_version: LETTER_PROMPT_VERSION,
        ...summarizePermitForRun(permitDetails),
        output_length: Number(outputLength) || 0,
        error_message: errorMessage || null,
        started_at: startedAt,
        completed_at: completedAt,
        created_at: completedAt,
    };
}

function clampLetterGenerationRuns(runs, limit = 1000) {
    if (!Array.isArray(runs)) return [];
    if (runs.length <= limit) return runs;
    return runs.slice(-limit);
}

module.exports = {
    LETTER_PROMPT_VERSION,
    buildLetterGenerationRunRecord,
    clampLetterGenerationRuns,
    createLetterGenerationRunId,
};
