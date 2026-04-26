import { computeLocalKpis, classifyStatus } from '../kpiEngine';
import { KPI_CODES, ANSWER_SOURCES } from '../../../../constants/merchAudit';

const findKpi = (kpis, code) => kpis.find((k) => k.kpi_code === code);

const baseTemplate = (questions, scoring = {}) => ({
  id: 'tmpl-test',
  outlet_type: 'retail',
  version: 1,
  name: 'test',
  questions,
  scoring: { blocks: scoring },
});

describe('kpiEngine.classifyStatus', () => {
  test('OSA: 96 → green, 88 → yellow, 70 → red', () => {
    expect(classifyStatus(KPI_CODES.OSA, 96)).toBe('green');
    expect(classifyStatus(KPI_CODES.OSA, 88)).toBe('yellow');
    expect(classifyStatus(KPI_CODES.OSA, 70)).toBe('red');
  });

  test('OOS uses lower-is-better: 3 → green, 8 → yellow, 20 → red', () => {
    expect(classifyStatus(KPI_CODES.OOS, 3)).toBe('green');
    expect(classifyStatus(KPI_CODES.OOS, 8)).toBe('yellow');
    expect(classifyStatus(KPI_CODES.OOS, 20)).toBe('red');
  });

  test('Unknown KPI returns null', () => {
    expect(classifyStatus('UNKNOWN_KPI', 50)).toBeNull();
  });

  test('Null value returns null', () => {
    expect(classifyStatus(KPI_CODES.OSA, null)).toBeNull();
  });
});

describe('kpiEngine.computeLocalKpis — OSA from MML checklist', () => {
  test('3 of 5 SKU present → OSA = 60', () => {
    const tpl = baseTemplate([
      { id: 'q.osa', block: 'availability', type: 'composite', kpi_codes: [KPI_CODES.OSA] },
    ]);
    const answers = {
      'q.osa': {
        value_json: {
          items: [
            { sku_id: 'a', present: true },
            { sku_id: 'b', present: true },
            { sku_id: 'c', present: true },
            { sku_id: 'd', present: false },
            { sku_id: 'e', present: false },
          ],
        },
        source: ANSWER_SOURCES.SURVEY,
      },
    };
    const { kpis } = computeLocalKpis(tpl, answers, {});
    expect(findKpi(kpis, KPI_CODES.OSA).value).toBe(60);
    expect(findKpi(kpis, KPI_CODES.OSA).status).toBe('red');
  });

  test('All present → OSA = 100, status green', () => {
    const tpl = baseTemplate([
      { id: 'q.osa', block: 'availability', type: 'composite', kpi_codes: [KPI_CODES.OSA] },
    ]);
    const answers = {
      'q.osa': {
        value_json: { items: [{ present: true }, { present: true }] },
        source: ANSWER_SOURCES.SURVEY,
      },
    };
    const { kpis } = computeLocalKpis(tpl, answers, {});
    expect(findKpi(kpis, KPI_CODES.OSA).value).toBe(100);
    expect(findKpi(kpis, KPI_CODES.OSA).status).toBe('green');
  });
});

describe('kpiEngine.computeLocalKpis — SOS via explicit qid linkage', () => {
  test('5 ours / 20 total → SOS = 25 (status yellow)', () => {
    const tpl = baseTemplate([
      {
        id: 'retail.layout.facings_ours',
        block: 'layout',
        type: 'int',
        kpi_codes: [KPI_CODES.SOS],
        sub: { facings_total_qid: 'retail.layout.facings_total' },
      },
      { id: 'retail.layout.facings_total', block: 'layout', type: 'int' },
    ]);
    const answers = {
      'retail.layout.facings_ours': { value_number: 5, source: ANSWER_SOURCES.SURVEY },
      'retail.layout.facings_total': { value_number: 20, source: ANSWER_SOURCES.SURVEY },
    };
    const { kpis } = computeLocalKpis(tpl, answers, {});
    expect(findKpi(kpis, KPI_CODES.SOS).value).toBe(25);
    expect(findKpi(kpis, KPI_CODES.SOS).status).toBe('yellow');
  });

  test('SOS without total answer → no KPI emitted', () => {
    const tpl = baseTemplate([
      {
        id: 'retail.layout.facings_ours',
        block: 'layout',
        type: 'int',
        kpi_codes: [KPI_CODES.SOS],
        sub: { facings_total_qid: 'retail.layout.facings_total' },
      },
    ]);
    const answers = {
      'retail.layout.facings_ours': { value_number: 5, source: ANSWER_SOURCES.SURVEY },
    };
    const { kpis } = computeLocalKpis(tpl, answers, {});
    expect(findKpi(kpis, KPI_CODES.SOS)).toBeUndefined();
  });
});

describe('kpiEngine.computeLocalKpis — bool KPIs', () => {
  test('PURE_COOLER true → 100 green', () => {
    const tpl = baseTemplate([
      { id: 'q.pure', block: 'cooler', type: 'bool', kpi_codes: [KPI_CODES.PURE_COOLER] },
    ]);
    const answers = { 'q.pure': { value_bool: true, source: ANSWER_SOURCES.SURVEY } };
    const { kpis } = computeLocalKpis(tpl, answers, {});
    expect(findKpi(kpis, KPI_CODES.PURE_COOLER).value).toBe(100);
  });

  test('FIFO false → 0', () => {
    const tpl = baseTemplate([
      { id: 'q.fifo', block: 'availability', type: 'bool', kpi_codes: [KPI_CODES.FIFO] },
    ]);
    const answers = { 'q.fifo': { value_bool: false, source: ANSWER_SOURCES.SURVEY } };
    const { kpis } = computeLocalKpis(tpl, answers, {});
    expect(findKpi(kpis, KPI_CODES.FIFO).value).toBe(0);
  });
});

describe('kpiEngine.computeLocalKpis — PRICE_COMPLIANCE select map', () => {
  test('within → 100, below → 85, above → 0', () => {
    const tpl = baseTemplate([
      { id: 'q.price', block: 'price', type: 'select', kpi_codes: [KPI_CODES.PRICE_COMPLIANCE] },
    ]);
    const within = computeLocalKpis(tpl,
      { 'q.price': { value_text: 'within', source: ANSWER_SOURCES.SURVEY } }, {});
    const below = computeLocalKpis(tpl,
      { 'q.price': { value_text: 'below', source: ANSWER_SOURCES.SURVEY } }, {});
    const above = computeLocalKpis(tpl,
      { 'q.price': { value_text: 'above', source: ANSWER_SOURCES.SURVEY } }, {});
    expect(findKpi(within.kpis, KPI_CODES.PRICE_COMPLIANCE).value).toBe(100);
    expect(findKpi(below.kpis, KPI_CODES.PRICE_COMPLIANCE).value).toBe(85);
    expect(findKpi(above.kpis, KPI_CODES.PRICE_COMPLIANCE).value).toBe(0);
  });
});

describe('kpiEngine.computeLocalKpis — PSS', () => {
  test('PSS is weighted average of block scores', () => {
    const tpl = baseTemplate(
      [
        { id: 'q.osa', block: 'availability', type: 'composite', kpi_codes: [KPI_CODES.OSA] },
        { id: 'q.price', block: 'price', type: 'select', kpi_codes: [KPI_CODES.PRICE_COMPLIANCE] },
      ],
      { availability: 25, price: 75 },
    );
    const answers = {
      'q.osa': { value_json: { items: [{ present: true }] }, source: ANSWER_SOURCES.SURVEY },
      'q.price': { value_text: 'within', source: ANSWER_SOURCES.SURVEY },
    };
    const { kpis, pss } = computeLocalKpis(tpl, answers, {});
    // availability=100, price=100 → weighted = (25*100 + 75*100) / 100 = 100
    expect(pss).toBe(100);
    expect(findKpi(kpis, KPI_CODES.PSS).status).toBe('green');
  });

  test('Empty answers → no PSS', () => {
    const tpl = baseTemplate([
      { id: 'q.osa', block: 'availability', type: 'composite', kpi_codes: [KPI_CODES.OSA] },
    ], { availability: 100 });
    const { pss } = computeLocalKpis(tpl, {}, {});
    expect(pss).toBeNull();
  });
});

describe('kpiEngine.computeLocalKpis — formula version stamping', () => {
  test('Each KPI carries formula_version', () => {
    const tpl = baseTemplate([
      { id: 'q.fifo', block: 'availability', type: 'bool', kpi_codes: [KPI_CODES.FIFO] },
    ]);
    const answers = { 'q.fifo': { value_bool: true, source: ANSWER_SOURCES.SURVEY } };
    const { kpis } = computeLocalKpis(tpl, answers, {});
    expect(findKpi(kpis, KPI_CODES.FIFO).formula_version).toBeTruthy();
    expect(findKpi(kpis, KPI_CODES.FIFO).formula_version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
