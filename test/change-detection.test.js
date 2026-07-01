'use strict';

// Unit tests for the hass change-detection helpers in air-quality-card.js.
// Run with `npm test` (uses Node's built-in test runner — zero dependencies).
//
// These guard the optimisation in `set hass`: the card only re-renders when an
// entity it actually displays changes, ignoring the dozens of unrelated state
// updates HA pushes every second. The bug these prevent is subtle — watching
// the wrong keys either wastes renders (too broad) or drops updates (too narrow).

const test = require('node:test');
const assert = require('node:assert/strict');

const { watchedEntityIds, hassStatesChanged } = require('../air-quality-card.js');

test('watchedEntityIds returns only *_entity values', () => {
  const config = {
    aqi_entity: 'sensor.aqi',
    pm25_entity: 'sensor.pm25',
    temperature_entity: 'sensor.temp',
    custom_1_entity: 'sensor.custom',
  };
  assert.deepEqual(
    watchedEntityIds(config).sort(),
    ['sensor.aqi', 'sensor.custom', 'sensor.pm25', 'sensor.temp'],
  );
});

test('watchedEntityIds ignores non-entity string config (the original over-broad bug)', () => {
  const config = {
    pm25_entity: 'sensor.pm25',
    name: 'Living Room',          // a string, but not an entity id
    pm25_name: 'Particulates',    // tile label override
    custom_1_unit: 'ppm',         // unit string
    device_id: 'abc123',          // device id, not an entity
  };
  assert.deepEqual(watchedEntityIds(config), ['sensor.pm25']);
});

test('watchedEntityIds skips empty strings and non-string values', () => {
  const config = {
    pm25_entity: 'sensor.pm25',
    co2_entity: '',               // cleared in the editor
    columns: 3,                   // number
    tile_order: ['pm25', 'co2'],  // array
  };
  assert.deepEqual(watchedEntityIds(config), ['sensor.pm25']);
});

test('hassStatesChanged is true on first paint (no previous hass)', () => {
  const newHass = { states: { 'sensor.pm25': { state: '5' } } };
  assert.equal(hassStatesChanged(['sensor.pm25'], newHass, undefined), true);
});

test('hassStatesChanged is true when a watched entity gets a new state object', () => {
  const oldHass = { states: { 'sensor.pm25': { state: '5' } } };
  const newHass = { states: { 'sensor.pm25': { state: '6' } } }; // HA replaces the object
  assert.equal(hassStatesChanged(['sensor.pm25'], newHass, oldHass), true);
});

test('hassStatesChanged is false when the watched entity object is unchanged', () => {
  const shared = { state: '5' };
  const oldHass = { states: { 'sensor.pm25': shared, 'sensor.other': { state: '1' } } };
  // Same reference for the watched entity; an unrelated entity changed.
  const newHass = { states: { 'sensor.pm25': shared, 'sensor.other': { state: '2' } } };
  assert.equal(hassStatesChanged(['sensor.pm25'], newHass, oldHass), false);
});

test('hassStatesChanged ignores churn in entities the card does not display', () => {
  // Regression for the fix: an unwatched entity changing must NOT trigger a render.
  const pm = { state: '5' };
  const oldHass = { states: { 'sensor.pm25': pm, 'sensor.noise': { state: '0' } } };
  const newHass = { states: { 'sensor.pm25': pm, 'sensor.noise': { state: '999' } } };
  assert.equal(hassStatesChanged(['sensor.pm25'], newHass, oldHass), false);
});
