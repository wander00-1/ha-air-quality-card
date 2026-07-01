'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { THRESHOLDS, TILE_DEFS, CHEMICAL_NAMES } = require('../air-quality-card.js');

// ── THRESHOLDS ────────────────────────────────────────────────────────────────

test('THRESHOLDS: every entry has exactly 3 values', () => {
  for (const [key, vals] of Object.entries(THRESHOLDS)) {
    assert.equal(vals.length, 3, `${key} should have 3 threshold values`);
  }
});

test('THRESHOLDS: all values are positive numbers', () => {
  for (const [key, [t1, t2, t3]] of Object.entries(THRESHOLDS)) {
    assert.ok(typeof t1 === 'number' && t1 > 0, `${key} t1 should be a positive number`);
    assert.ok(typeof t2 === 'number' && t2 > 0, `${key} t2 should be a positive number`);
    assert.ok(typeof t3 === 'number' && t3 > 0, `${key} t3 should be a positive number`);
  }
});

test('THRESHOLDS: values are strictly ascending (t1 < t2 < t3)', () => {
  for (const [key, [t1, t2, t3]] of Object.entries(THRESHOLDS)) {
    assert.ok(t1 < t2, `${key}: t1 (${t1}) should be less than t2 (${t2})`);
    assert.ok(t2 < t3, `${key}: t2 (${t2}) should be less than t3 (${t3})`);
  }
});

// ── TILE_DEFS ─────────────────────────────────────────────────────────────────

test('TILE_DEFS: every entry has required fields', () => {
  for (const t of TILE_DEFS) {
    assert.ok(t.key,    `entry missing key: ${JSON.stringify(t)}`);
    assert.ok(t.cfgKey, `${t.key} missing cfgKey`);
    assert.ok(t.label,  `${t.key} missing label`);
    assert.ok(t.unit !== undefined, `${t.key} missing unit`);
  }
});

test('TILE_DEFS: cfgKey matches key + _entity convention', () => {
  for (const t of TILE_DEFS) {
    assert.equal(t.cfgKey, `${t.key}_entity`, `${t.key}: cfgKey should be ${t.key}_entity`);
  }
});

test('TILE_DEFS: no duplicate keys', () => {
  const keys = TILE_DEFS.map(t => t.key);
  const unique = new Set(keys);
  assert.equal(unique.size, keys.length, 'TILE_DEFS contains duplicate keys');
});

test('TILE_DEFS: no duplicate cfgKeys', () => {
  const cfgKeys = TILE_DEFS.map(t => t.cfgKey);
  const unique = new Set(cfgKeys);
  assert.equal(unique.size, cfgKeys.length, 'TILE_DEFS contains duplicate cfgKeys');
});

// ── CHEMICAL_NAMES ────────────────────────────────────────────────────────────

test('CHEMICAL_NAMES: every TILE_DEFS key has a chemical name', () => {
  for (const t of TILE_DEFS) {
    assert.ok(CHEMICAL_NAMES[t.key], `${t.key} is missing from CHEMICAL_NAMES`);
  }
});

test('CHEMICAL_NAMES: every THRESHOLDS key has a chemical name', () => {
  for (const key of Object.keys(THRESHOLDS)) {
    assert.ok(CHEMICAL_NAMES[key], `${key} is in THRESHOLDS but missing from CHEMICAL_NAMES`);
  }
});

test('TILE_DEFS: every key with thresholds is in THRESHOLDS', () => {
  for (const t of TILE_DEFS) {
    assert.ok(THRESHOLDS[t.key], `${t.key} is in TILE_DEFS but missing from THRESHOLDS`);
  }
});
