'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { sortedTiles } = require('../air-quality-card.js');

test('sortedTiles: empty config returns empty array', () => {
  assert.deepEqual(sortedTiles({}), []);
});

test('sortedTiles: tiles with no entity are excluded', () => {
  const result = sortedTiles({ tile_order: ['pm25', 'co2'] });
  assert.deepEqual(result, []);
});

test('sortedTiles: respects tile_order sequence', () => {
  const config = {
    tile_order: ['co2', 'pm25'],
    co2_entity: 'sensor.co2',
    pm25_entity: 'sensor.pm25',
  };
  const keys = sortedTiles(config).map(t => t.key);
  assert.deepEqual(keys, ['co2', 'pm25']);
});

test('sortedTiles: tile in tile_order with no entity is skipped', () => {
  const config = {
    tile_order: ['pm25', 'co2', 'voc'],
    pm25_entity: 'sensor.pm25',
    voc_entity:  'sensor.voc',
    // co2 has no entity
  };
  const keys = sortedTiles(config).map(t => t.key);
  assert.deepEqual(keys, ['pm25', 'voc']);
});

test('sortedTiles: configured tiles not in tile_order fall to end', () => {
  const config = {
    tile_order:   ['pm25'],
    pm25_entity:  'sensor.pm25',
    co2_entity:   'sensor.co2',
  };
  const keys = sortedTiles(config).map(t => t.key);
  assert.deepEqual(keys, ['pm25', 'co2']);
});

test('sortedTiles: custom tile with entity is included', () => {
  const config = {
    tile_order:       ['pm25', 'custom_1'],
    pm25_entity:      'sensor.pm25',
    custom_1_entity:  'sensor.my_sensor',
    custom_1_name:    'My Sensor',
    custom_1_unit:    'ppb',
  };
  const result = sortedTiles(config);
  assert.equal(result.length, 2);
  assert.equal(result[1].key, 'custom_1');
  assert.equal(result[1].label, 'My Sensor');
  assert.equal(result[1].unit, 'ppb');
});

test('sortedTiles: custom tile without entity is excluded', () => {
  const config = {
    tile_order:  ['pm25', 'custom_1'],
    pm25_entity: 'sensor.pm25',
    // custom_1 has no entity
  };
  const keys = sortedTiles(config).map(t => t.key);
  assert.deepEqual(keys, ['pm25']);
});

test('sortedTiles: custom tile with no name defaults label to Custom', () => {
  const config = {
    tile_order:      ['custom_1'],
    custom_1_entity: 'sensor.my_sensor',
  };
  const result = sortedTiles(config);
  assert.equal(result[0].label, 'Custom');
  assert.equal(result[0].unit, '');
});

test('sortedTiles: multiple custom tiles are all included', () => {
  const config = {
    tile_order:      ['custom_1', 'custom_2'],
    custom_1_entity: 'sensor.one',
    custom_2_entity: 'sensor.two',
  };
  const keys = sortedTiles(config).map(t => t.key);
  assert.deepEqual(keys, ['custom_1', 'custom_2']);
});
