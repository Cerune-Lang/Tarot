import {readFileSync} from 'node:fs';
import {parseDeck} from '../public/js/deck.mjs';
const path = process.argv[2] || new URL('../public/data/cards.txt', import.meta.url);
const {cards, advice} = parseDeck(readFileSync(path, 'utf8'));
const major = cards.filter(card => card.arcana === 'major');
const minor = cards.filter(card => card.arcana === 'minor');
const suits = ['ワンド', 'カップ', 'ソード', 'ペンタクル'];
if (major.length !== 22 || minor.length !== 56) throw new Error('Expected 22 major and 56 minor cards');
for (const suit of suits) {
  if (minor.filter(card => card.suit === suit).length !== 14) throw new Error(`Expected 14 cards in ${suit}`);
}
for (const topic of ['general', 'love', 'work', 'relations']) {
  if (advice.filter(item => item.topic === topic).length !== 3) throw new Error(`Expected 3 advices for ${topic}`);
}
console.log(`OK: ${cards.length} cards, ${major.length} major, ${minor.length} minor, ${advice.length} advices`);
