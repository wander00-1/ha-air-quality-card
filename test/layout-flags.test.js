'use strict';

// Unit tests for layoutFlags(), which decides which optional sections the card
// and editor show. Covers the `show_gauge` option (issue #13): the gauge must
// stay on by default for existing configs, hide only on an explicit false, and
// take the now-pointless AQI scale controls and empty top row with it.

const test   = require('node:test');
const assert = require('node:assert/strict');

const { layoutFlags } = require('../air-quality-card.js');

// ── showGauge ─────────────────────────────────────────────────────────────────

test('showGauge defaults to true when show_gauge is not set (existing configs unchanged)', () => {
  assert.equal(layoutFlags({}).showGauge, true);
  assert.equal(layoutFlags({ pm25_entity: 'sensor.pm25' }).showGauge, true);
});

test('showGauge is true when show_gauge is explicitly true', () => {
  assert.equal(layoutFlags({ show_gauge: true }).showGauge, true);
});

test('showGauge is false only when show_gauge is explicitly false', () => {
  assert.equal(layoutFlags({ show_gauge: false }).showGauge, false);
});

test('showGauge treats non-false values (null, undefined) as on', () => {
  assert.equal(layoutFlags({ show_gauge: null }).showGauge, true);
  assert.equal(layoutFlags({ show_gauge: undefined }).showGauge, true);
});

test('layoutFlags tolerates a missing config', () => {
  assert.equal(layoutFlags(undefined).showGauge, true);
  assert.equal(layoutFlags(null).showTop, true);
});

// ── showTop ───────────────────────────────────────────────────────────────────

test('showTop is true when the gauge is shown, even with no climate entities', () => {
  assert.equal(layoutFlags({}).showTop, true);
});

test('showTop stays true with gauge hidden but a temperature entity configured', () => {
  const f = layoutFlags({ show_gauge: false, temperature_entity: 'sensor.temp' });
  assert.equal(f.showTop, true);
  assert.equal(f.hasClimate, true);
});

test('showTop stays true with gauge hidden but a humidity entity configured', () => {
  assert.equal(layoutFlags({ show_gauge: false, humidity_entity: 'sensor.hum' }).showTop, true);
});

test('showTop is false with gauge hidden and no climate entities (tiles only, no empty gap)', () => {
  const f = layoutFlags({ show_gauge: false, pm25_entity: 'sensor.pm25' });
  assert.equal(f.showTop, false);
  assert.equal(f.hasClimate, false);
});

test('empty-string climate entities do not count as configured', () => {
  assert.equal(layoutFlags({ show_gauge: false, temperature_entity: '', humidity_entity: '' }).showTop, false);
});

// ── showAqiScale (editor) ─────────────────────────────────────────────────────

test('showAqiScale is false when no AQI entity is configured', () => {
  assert.equal(layoutFlags({}).showAqiScale, false);
});

test('showAqiScale is true when an AQI entity is configured and the gauge is shown', () => {
  assert.equal(layoutFlags({ aqi_entity: 'sensor.aqi' }).showAqiScale, true);
});

test('showAqiScale is false when the gauge is hidden, even with an AQI entity', () => {
  assert.equal(layoutFlags({ aqi_entity: 'sensor.aqi', show_gauge: false }).showAqiScale, false);
});
