'use strict';

// Regression tests for the card's stylesheet (issue #15).
//
// CARD_CSS lives inside the browser-only bootstrap, so it isn't exported to
// Node. These tests read it from the source text instead. The bug: the outer
// ha-card used a bare var(--ha-card-background). Themes that only define
// --card-background-color (including HA's default theme) left that variable
// unset, so the card rendered with a transparent background.

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'air-quality-card.js'), 'utf8');

function cardCss() {
  const m = src.match(/const CARD_CSS = `([\s\S]*?)`;/);
  assert.ok(m, 'CARD_CSS template literal not found in air-quality-card.js');
  return m[1];
}

function haCardRule() {
  // The top-level `ha-card { ... }` rule, not nested selectors like `.x ha-card`.
  const m = cardCss().match(/^\s*ha-card\s*\{([^}]*)\}/m);
  assert.ok(m, 'top-level ha-card rule not found in CARD_CSS');
  return m[1].replace(/\/\*[\s\S]*?\*\//g, '');
}

function backgroundValue() {
  const m = haCardRule().match(/(?:^|[\s;])background\s*:\s*([^;]+);/);
  assert.ok(m, 'ha-card rule has no background declaration');
  return m[1].trim();
}

test('ha-card background still honours --ha-card-background first', () => {
  assert.match(backgroundValue(), /^var\(\s*--ha-card-background\s*,/);
});

test('ha-card background falls back to --card-background-color (HA default theme)', () => {
  assert.match(backgroundValue(), /var\(\s*--card-background-color\s*,/);
});

test('ha-card background ends in a concrete colour, never a bare variable', () => {
  const v = backgroundValue();
  assert.ok(v.includes(','), `background has no fallback at all: ${v}`);
  // Innermost fallback = whatever follows the last comma, minus closing parens.
  const innermost = v.slice(v.lastIndexOf(',') + 1).replace(/\)+\s*$/, '').trim();
  assert.ok(innermost.length > 0, `empty innermost fallback in: ${v}`);
  assert.doesNotMatch(innermost, /var\(|--/);
});

test('ha-card background is not transparent', () => {
  assert.doesNotMatch(backgroundValue(), /transparent/);
});
