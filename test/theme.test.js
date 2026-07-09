'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { palette, SCORE_BANDS, AQI_BANDS } = require('../air-quality-card.js');

test('palette: light and dark modes define all band keys', () => {
  for (const dark of [true, false]) {
    const p = palette(dark);
    for (const band of [...SCORE_BANDS, ...AQI_BANDS]) {
      assert.ok(p[band.key], `missing color for key "${band.key}" (dark=${dark})`);
    }
    assert.ok(p.temperature);
    assert.ok(p.humidity);
  }
});

test('palette: light and dark modes are distinct', () => {
  const light = palette(false);
  const dark = palette(true);
  for (const key of Object.keys(dark)) {
    assert.notEqual(light[key], dark[key], `expected "${key}" to differ between light and dark palettes`);
  }
});
