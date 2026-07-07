'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { scoreInfo, computeScore, tileStatus, THRESHOLDS, SCORE_BANDS, AQI_BANDS } = require('../air-quality-card.js');

// ── scoreInfo ─────────────────────────────────────────────────────────────────

test('scoreInfo: returns Good band for score at lower boundary', () => {
  assert.equal(scoreInfo(0, SCORE_BANDS).label, 'Good');
});

test('scoreInfo: returns Good band at exact boundary (25)', () => {
  assert.equal(scoreInfo(25, SCORE_BANDS).label, 'Good');
});

test('scoreInfo: returns Moderate band just above Good boundary (26)', () => {
  assert.equal(scoreInfo(26, SCORE_BANDS).label, 'Moderate');
});

test('scoreInfo: returns Poor band (51–75)', () => {
  assert.equal(scoreInfo(60, SCORE_BANDS).label, 'Poor');
});

test('scoreInfo: returns Bad band at 100', () => {
  assert.equal(scoreInfo(100, SCORE_BANDS).label, 'Bad');
});

test('scoreInfo: returns last band when score exceeds all maxes (AQI > 500)', () => {
  assert.equal(scoreInfo(999, AQI_BANDS).label, 'Bad');
});

test('scoreInfo: AQI bands — Good at 50, Moderate at 51', () => {
  assert.equal(scoreInfo(50,  AQI_BANDS).label, 'Good');
  assert.equal(scoreInfo(51,  AQI_BANDS).label, 'Moderate');
});

test('scoreInfo: AQI bands — Poor at 101', () => {
  assert.equal(scoreInfo(101, AQI_BANDS).label, 'Poor');
});

// ── computeScore ──────────────────────────────────────────────────────────────

test('computeScore: all null returns 0', () => {
  assert.equal(computeScore(null, null, null), 0);
});

test('computeScore: PM2.5 at WHO guideline (35 µg/m³) contributes full 40 pts', () => {
  assert.equal(computeScore(35, null, null), 40);
});

test('computeScore: PM2.5 above guideline is capped at 40 pts', () => {
  assert.equal(computeScore(100, null, null), 40);
});

test('computeScore: VOC at reference (300) contributes full 25 pts', () => {
  assert.equal(computeScore(null, 300, null), 25);
});

test('computeScore: VOC above reference is capped at 25 pts', () => {
  assert.equal(computeScore(null, 999, null), 25);
});

test('computeScore: CO₂ at baseline (400 ppm) contributes 0 pts', () => {
  assert.equal(computeScore(null, null, 400), 0);
});

test('computeScore: CO₂ at ceiling (2000 ppm) contributes full 35 pts', () => {
  assert.equal(computeScore(null, null, 2000), 35);
});

test('computeScore: CO₂ above ceiling is capped at 35 pts', () => {
  assert.equal(computeScore(null, null, 9999), 35);
});

test('computeScore: total is capped at 100', () => {
  assert.equal(computeScore(100, 999, 9999), 100);
});

test('computeScore: null sensors are skipped rather than assumed clean', () => {
  const withPm25 = computeScore(35, null, null);
  const withAll  = computeScore(35, 300, 2000);
  assert.ok(withAll > withPm25);
});

// ── tileStatus ────────────────────────────────────────────────────────────────

test('tileStatus: value at 0 returns idx 0, pct 0', () => {
  const s = tileStatus('pm25', 0, {});
  assert.equal(s.idx, 0);
  assert.equal(s.pct, 0);
});

test('tileStatus: value exactly at t1 is Good (idx 0)', () => {
  const [t1] = THRESHOLDS.pm25;
  assert.equal(tileStatus('pm25', t1, {}).idx, 0);
});

test('tileStatus: value just above t1 is Moderate (idx 1)', () => {
  const [t1] = THRESHOLDS.pm25;
  assert.equal(tileStatus('pm25', t1 + 0.1, {}).idx, 1);
});

test('tileStatus: value exactly at t2 is Moderate (idx 1)', () => {
  const [, t2] = THRESHOLDS.pm25;
  assert.equal(tileStatus('pm25', t2, {}).idx, 1);
});

test('tileStatus: value exactly at t3 is High (idx 2)', () => {
  const [,, t3] = THRESHOLDS.pm25;
  assert.equal(tileStatus('pm25', t3, {}).idx, 2);
});

test('tileStatus: value above t3 is Very High (idx 3, pct 100)', () => {
  const s = tileStatus('pm25', 999, {});
  assert.equal(s.idx, 3);
  assert.equal(s.pct, 100);
});

test('tileStatus: cfg overrides default thresholds', () => {
  const s = tileStatus('pm25', 5, { pm25_t1: 10, pm25_t2: 20, pm25_t3: 30 });
  assert.equal(s.idx, 0);
});

test('tileStatus: custom tile with cfg thresholds works', () => {
  const s = tileStatus('custom_1', 150, { custom_1_t1: 100, custom_1_t2: 200, custom_1_t3: 300 });
  assert.equal(s.idx, 1);
});

test('tileStatus: custom tile with no thresholds returns idx 0, pct 0', () => {
  const s = tileStatus('custom_1', 999, {});
  assert.equal(s.idx, 0);
  assert.equal(s.pct, 0);
});

test('tileStatus: pct increases monotonically across bands', () => {
  const vals = [0, 6, 12, 35, 55, 100];
  const pcts = vals.map(v => tileStatus('pm25', v, {}).pct);
  for (let i = 1; i < pcts.length; i++) {
    assert.ok(pcts[i] >= pcts[i - 1], `pct should not decrease at value ${vals[i]}`);
  }
});
