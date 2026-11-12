import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDeck} from '../public/js/deck.mjs';
const snapshot = readFileSync(new URL('../public/data/cards.txt', import.meta.url), 'utf8');
const deck = parseDeck(snapshot);
test('78 cards / 156 orientations / 12 pieces of advice', () => {
  assert.equal(deck.cards.length, 78);
  assert.equal(deck.cards.flatMap(card => [card.upright, card.reversed]).length, 156);
  assert.equal(deck.advice.length, 12);
  assert.equal(deck.cards.filter(card => card.arcana === 'major').length, 22);
});
test('all IDs are unique and card text is available', () => {
  assert.equal(new Set(deck.cards.map(card => card.id)).size, 78);
  assert.ok(deck.cards.every(card => card.upright.text && card.reversed.text));
  assert.equal(deck.cards.find(card => card.id === 'major-17').name, '星');
});
test('export format rejects incomplete data', () => {
  assert.throws(() => parseDeck(snapshot.replace(/END\n?$/, '')), /終わり|余分な行|途中/);
  assert.throws(() => parseDeck(snapshot.slice(0, 100)), /途中/);
});
test('Cerune source has exactly 78 card declarations', () => {
  const source = readFileSync(new URL('../src/cards.ceru', import.meta.url), 'utf8');
  assert.equal((source.match(/\bCard \{ id:/g) || []).length, 78);
  assert.equal((source.match(/\bAdvice \{ topic:/g) || []).length, 12);
});
test('Cerune data module publishes structured compile-time constants, not executable output', () => {
  const source = readFileSync(new URL('../src/cards.ceru', import.meta.url), 'utf8');
  assert.match(source, /^pub type Card \{/m);
  assert.match(source, /^pub type Advice \{/m);
  assert.match(source, /^pub const CARDS: \[Card; 78\] = \[/m);
  assert.match(source, /^pub const ADVICES: \[Advice; 12\] = \[/m);
  assert.doesNotMatch(source, /\bfn main\(/);
  assert.doesNotMatch(source, /^print\(/m);
});
test('Cerune main calls the exported data module', () => {
  const main = readFileSync(new URL('../src/main.ceru', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../src/export.ceru', import.meta.url), 'utf8');
  assert.match(main, /^import "export.ceru" as export;/m);
  assert.match(main, /^fn main\(\) -> void \{/m);
  assert.match(main, /export::export\(\)/);
  assert.match(source, /^import "cards.ceru" as deck;/m);
  assert.match(source, /^pub fn export\(\) -> void \{/m);
  assert.match(source, /for \(card: deck::Card in deck::CARDS\)/);
  assert.match(source, /for \(item: deck::Advice in deck::ADVICES\)/);
  assert.doesNotMatch(source, /\bfn main\(/);
});
test('Wasm library is a separate module without a main entry point', () => {
  const source = readFileSync(new URL('../src/tarot.ceru', import.meta.url), 'utf8');
  for (const name of ['draw_index', 'is_reversed', 'rank_fragment']) {
    assert.match(source, new RegExp(`pub fn ${name}\\(`));
  }
  assert.doesNotMatch(source, /\bfn main\(/);
});
