function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toLower(value) {
  return normalizeText(value).toLowerCase();
}

function scorePermitForObjection(permit) {
  const status = toLower(permit?.status);
  const category = toLower(permit?.category);
  const activity = toLower(permit?.activity);
  const notes = toLower(permit?.notes);

  let score = 0;
  const reasons = [];

  if (status === 'pending' || status.includes('review') || status.includes('draft') || status.includes('process')) {
    score += 70;
    reasons.push('permit is still open for objection');
  } else if (status === 'approved') {
    score -= 30;
    reasons.push('permit already approved');
  } else if (status === 'rejected' || status === 'withdrawn') {
    score -= 80;
    reasons.push('permit is not actively objection-relevant');
  }

  if (category === 'red') {
    score += 20;
    reasons.push('high-severity category');
  } else if (category === 'orange') {
    score += 10;
    reasons.push('elevated category');
  }

  const highImpactKeywords = ['cafo', 'poultry', 'broiler', 'layer', 'swine', 'pig', 'hog', 'dairy', 'livestock', 'farm'];
  if (highImpactKeywords.some((keyword) => activity.includes(keyword) || notes.includes(keyword))) {
    score += 15;
    reasons.push('high-impact livestock activity');
  }

  if (notes.includes('public hearing') || notes.includes('consultation') || notes.includes('comment period')) {
    score += 10;
    reasons.push('active public process signal');
  }

  const bounded = Math.max(0, Math.min(100, score));
  let tier = 'low';
  if (bounded >= 75) tier = 'critical';
  else if (bounded >= 55) tier = 'high';
  else if (bounded >= 30) tier = 'medium';

  return {
    score: bounded,
    tier,
    reasons,
  };
}

function annotateAndSortPermits(permits) {
  const list = Array.isArray(permits) ? permits : [];
  return list
    .map((permit) => {
      const priority = scorePermitForObjection(permit);
      return {
        ...permit,
        objection_priority_score: priority.score,
        objection_priority_tier: priority.tier,
        objection_priority_reasons: priority.reasons,
      };
    })
    .sort((a, b) => {
      const scoreDiff = (b.objection_priority_score || 0) - (a.objection_priority_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
}

module.exports = {
  scorePermitForObjection,
  annotateAndSortPermits,
};
