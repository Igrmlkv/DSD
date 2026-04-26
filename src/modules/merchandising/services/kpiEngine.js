import {
  KPI_CODES, KPI_THRESHOLDS, KPI_FORMULA_VERSION, DEFAULT_PSS_WEIGHTS,
  ANSWER_SOURCES,
} from '../../../constants/merchAudit';

// Local KPI Engine (spec §6).
// Used in kpiEngineMode='dual' to give the merchandiser instant feedback offline.
// The server remains source of truth — when /sync/kpi_results returns server-computed values,
// the UI shows the server result and discards local-only entries.
//
// All formulas are deterministic and versioned via KPI_FORMULA_VERSION.

// computeLocalKpis(template, answers, photosByQuestion) → { kpis: [{kpi_code,value,status,...}], pss }
export function computeLocalKpis(template, answers, photosByQuestion) {
  const questions = (template?.questions) || [];
  const blockScoring = (template?.scoring?.blocks) || DEFAULT_PSS_WEIGHTS;

  // Bucket of (kpi_code → list of contributions {value, weight, source}).
  const buckets = new Map();

  for (const q of questions) {
    const ans = answers[q.id];
    if (!ans) continue;
    const codes = Array.isArray(q.kpi_codes) ? q.kpi_codes : [];
    for (const code of codes) {
      const contributions = buckets.get(code) || [];
      const c = contributionFor(code, q, ans, answers, photosByQuestion);
      if (c != null) contributions.push(c);
      buckets.set(code, contributions);
    }
  }

  // Reduce each KPI bucket to a single value.
  const kpis = [];
  for (const [code, contribs] of buckets) {
    if (contribs.length === 0) continue;
    const value = avg(contribs.map((c) => c.value));
    const status = classifyStatus(code, value);
    kpis.push({
      kpi_code: code,
      value,
      status,
      formula_version: KPI_FORMULA_VERSION,
      source: dominantSource(contribs),
      details_json: { contributions: contribs.length },
    });
  }

  // Block scores → PSS.
  const blockScores = computeBlockScores(questions, kpis);
  const pss = computePss(blockScores, blockScoring);
  if (pss != null) {
    kpis.push({
      kpi_code: KPI_CODES.PSS,
      value: pss,
      status: classifyStatus(KPI_CODES.PSS, pss),
      formula_version: KPI_FORMULA_VERSION,
      source: ANSWER_SOURCES.SURVEY,
      details_json: { blocks: blockScores },
    });
  }

  return { kpis, pss };
}

// Per-KPI rules for converting an answer into a percentage/score (0..100).
// Keep the rule set small and explicit — backoffice KPI Engine has the full library.
function contributionFor(code, q, ans, allAnswers, photosByQuestion) {
  const num = ans.value_number;
  const bool = ans.value_bool;
  const sel = ans.value_text;

  switch (code) {
    case KPI_CODES.OSA: {
      // Composite MML checklist: value_json = { items: [{sku_id, present:bool}] }
      const items = ans.value_json?.items;
      if (Array.isArray(items) && items.length > 0) {
        const present = items.filter((i) => i.present).length;
        return mk((present / items.length) * 100);
      }
      if (bool != null) return mk(bool ? 100 : 0);
      return null;
    }
    case KPI_CODES.OOS: {
      const items = ans.value_json?.items;
      if (Array.isArray(items) && items.length > 0) {
        const oos = items.filter((i) => i.present === false).length;
        return mk((oos / items.length) * 100);
      }
      return null;
    }
    case KPI_CODES.SOS:
    case KPI_CODES.SOC: {
      // facings_ours / facings_total. The "ours" question carries the KPI code and
      // an explicit q.sub.facings_total_qid pointer to its sibling — no regex scan,
      // no cross-block collisions when multiple shelves use the same naming.
      const totalQid = q.sub?.facings_total_qid;
      const ours = num;
      const total = totalQid ? allAnswers[totalQid]?.value_number : null;
      if (ours != null && total != null && total > 0) {
        return mk((ours / total) * 100);
      }
      return null;
    }
    case KPI_CODES.FILL_RATE:
      return num != null ? mk(clamp(num, 0, 100)) : null;
    case KPI_CODES.PURE_COOLER:
    case KPI_CODES.BRANDING_COOLER:
    case KPI_CODES.FIFO:
    case KPI_CODES.EYE_LEVEL:
    case KPI_CODES.BLOCKS:
    case KPI_CODES.FEATURED_POS:
      return bool != null ? mk(bool ? 100 : 0) : null;
    case KPI_CODES.PRICE_TAG_PRESENCE:
      return num != null ? mk(clamp(num, 0, 100)) : null;
    case KPI_CODES.PRICE_COMPLIANCE: {
      if (sel === 'within') return mk(100);
      if (sel === 'below') return mk(85);
      if (sel === 'above') return mk(0);
      return null;
    }
    case KPI_CODES.PLANO_COMPLIANCE: {
      if (sel === 'full') return mk(100);
      if (sel === 'partial') return mk(60);
      if (sel === 'none') return mk(0);
      if (sel === 'no_plano') return null; // skipped
      return null;
    }
    case KPI_CODES.POSM_PLACEMENT: {
      const arr = ans.value_json;
      if (Array.isArray(arr)) return mk(arr.length > 0 ? 100 : 0);
      return null;
    }
    case KPI_CODES.POSM_CONDITION: {
      const n = sel != null ? Number(sel) : null;
      if (n != null && Number.isFinite(n)) return mk(n); // 1..5 raw scale
      return null;
    }
    case KPI_CODES.MENU_LISTING: {
      const items = ans.value_json?.items;
      if (Array.isArray(items) && items.length > 0) {
        const present = items.filter((i) => i.present).length;
        return mk((present / items.length) * 100);
      }
      return null;
    }
    case KPI_CODES.RECIPE_COMPLIANCE: {
      if (sel === 'full') return mk(100);
      if (sel === 'partial') return mk(60);
      if (sel === 'no') return mk(0);
      return null;
    }
    case KPI_CODES.BRANDED_GLASSWARE: {
      if (bool != null) return mk(bool ? 100 : 0);
      const items = ans.value_json?.items;
      if (Array.isArray(items) && items.length > 0) {
        const ok = items.filter((i) => i.branded).length;
        return mk((ok / items.length) * 100);
      }
      return null;
    }
    case KPI_CODES.PHOTO_QA: {
      const photos = photosByQuestion[q.id] || [];
      if (photos.length === 0) return null;
      const ok = photos.filter((p) => p.qg_passed === 1).length;
      return mk((ok / photos.length) * 100);
    }
    default:
      return null;
  }

  function mk(value) {
    return { value, source: ans.source || ANSWER_SOURCES.SURVEY, weight: 1 };
  }
}


function computeBlockScores(questions, kpis) {
  // For each block, average the KPIs whose question's block matches.
  const blockToKpis = new Map();
  for (const q of questions) {
    if (!q.block) continue;
    const codes = Array.isArray(q.kpi_codes) ? q.kpi_codes : [];
    for (const code of codes) {
      const list = blockToKpis.get(q.block) || [];
      list.push(code);
      blockToKpis.set(q.block, list);
    }
  }
  const result = {};
  for (const [block, codes] of blockToKpis) {
    const values = kpis.filter((k) => codes.includes(k.kpi_code)).map((k) => k.value);
    if (values.length > 0) result[block] = avg(values);
  }
  return result;
}

function computePss(blockScores, weights) {
  const blocks = Object.keys(weights);
  let weightedSum = 0;
  let totalWeight = 0;
  for (const b of blocks) {
    const w = weights[b];
    const score = blockScores[b];
    if (w == null || score == null) continue;
    weightedSum += w * score;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

export function classifyStatus(code, value) {
  if (value == null) return null;
  const t = KPI_THRESHOLDS[code];
  if (!t) return null;
  if (t.lowerIsBetter) {
    if (value <= t.green) return 'green';
    if (value <= t.yellow) return 'yellow';
    return 'red';
  }
  if (value >= t.green) return 'green';
  if (value >= t.yellow) return 'yellow';
  return 'red';
}

function dominantSource(contribs) {
  // Pick the source most contributors used; if mixed, return 'mixed'.
  const counts = new Map();
  for (const c of contribs) counts.set(c.source, (counts.get(c.source) || 0) + 1);
  if (counts.size > 1) return ANSWER_SOURCES.MIXED;
  return [...counts.keys()][0] || ANSWER_SOURCES.SURVEY;
}

function avg(arr) {
  return arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
