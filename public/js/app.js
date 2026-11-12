import {parseDeck} from './deck.mjs';

const $ = (selector) => document.querySelector(selector);
const TOPICS = {
  general: {label: '今日のこと'},
  love: {label: '恋愛'},
  work: {label: '仕事・将来'},
  relations: {label: '人間関係'}
};
let cards = [];
let advice = [];
let topic = 'general';
let count = 1;

// Crypto-generated randomness stays in the browser; no request contains user questions.
function rand31() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] & 0x7fffffff;
}

// Fallback only for local previews without a compiled Cerune library.
const fallback = {
  draw_index: (seed, remaining) => seed % remaining,
  is_reversed: (seed) => seed % 2,
  rank_fragment: (hits, theme, position) => hits * 10 + theme * 4 + position * 2
};
let engine = fallback;

async function loadCerune() {
  try {
    const modulePath = new URL('../wasm/library.mjs', import.meta.url);
    const wasmPath = new URL('../wasm/library.wasm', import.meta.url);
    const {createLibrary} = await import(modulePath.href);
    const response = await fetch(wasmPath);
    if (!response.ok) throw new Error(`Wasm HTTP ${response.status}`);
    const library = await createLibrary(new Uint8Array(await response.arrayBuffer()));
    return library.functions;
  } catch (error) {
    console.info('Cerune Wasm is not built yet. Local preview uses JS fallback:', error.message);
    return fallback;
  }
}

function getAdvice(selectedTopic, question, positionIndex) {
  const options = advice.filter(item => item.topic === selectedTopic);
  if (!options.length) return '';
  let best = options[0];
  let bestScore = -1;
  for (const [i, item] of options.entries()) {
    const hits = item.tags.filter(tag => question.includes(tag.normalize('NFKC').toLowerCase())).length;
    // Topic-filtering happens first; the numerical ranking itself runs in Cerune Wasm.
    const score = engine.rank_fragment(hits, selectedTopic === 'general' ? 0 : 1, i === positionIndex % options.length ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best.text;
}

function chooseCards(amount) {
  const pool = [...cards];
  const chosen = [];
  for (let i = 0; i < amount; i++) {
    const idx = engine.draw_index(rand31(), pool.length);
    const card = pool.splice(idx, 1)[0];
    const reversed = engine.is_reversed(rand31()) === 1;
    chosen.push({card, reversed});
  }
  return chosen;
}

function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function makeCard({card, reversed}, position, question, positionIndex) {
  const wrapper = el('article', 'reading-card');
  const meta = el('div', 'reading-meta');
  meta.append(el('span', '', position), el('span', '', reversed ? '逆位置' : '正位置'));
  wrapper.append(meta, el('h3', '', card.name));
  wrapper.append(el('p', 'interpretation', card[reversed ? 'reversed' : 'upright'].text));
  wrapper.append(el('p', 'advice', getAdvice(topic, question, positionIndex)));
  return wrapper;
}
function showResults() {
  const question = ($('#question').value || '').normalize('NFKC').toLowerCase().trim();
  const selected = chooseCards(count);
  const grid = $('#card-grid');
  grid.replaceChildren();
  grid.classList.toggle('single', count === 1);
  const positions = count === 1 ? ['あなたへのメッセージ'] : ['過去', '現在', '未来'];
  selected.forEach((draw, i) => grid.append(makeCard(draw, positions[i], question, i)));
  $('#result-subtitle').textContent = `${TOPICS[topic].label} · ${count}枚引き`;
  $('#reading-setup').hidden = true;
  $('#result').hidden = false;
  $('#library').hidden = true;
  $('#result').scrollIntoView({behavior: 'smooth', block: 'start'});
}
function showLibrary() {
  $('#reading-setup').hidden = true;
  $('#result').hidden = true;
  $('#library').hidden = false;
  const grid = $('#library-grid');
  grid.replaceChildren();
  $('#library-detail').replaceChildren();
  for (const card of cards) {
    const b = el('button');
    b.type = 'button';
    b.textContent = card.name;
    b.addEventListener('click', () => {
      const detail = $('#library-detail');
      detail.replaceChildren();
      detail.append(el('strong', '', `${card.name} / ${card.en}`), el('p', '', `正位置：${card.upright.text}`), el('p', '', `逆位置：${card.reversed.text}`));
      detail.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    });
    grid.append(b);
  }
  $('#library').scrollIntoView({behavior: 'smooth', block: 'start'});
}
function showSetup() {
  $('#reading-setup').hidden = false;
  $('#result').hidden = true;
  $('#library').hidden = true;
  $('#reading-setup').scrollIntoView({behavior: 'smooth', block: 'start'});
}
async function init() {
  const response = await fetch(new URL('../data/cards.txt', import.meta.url));
  if (!response.ok) throw new Error('カードデータの読込みに失敗しました');
  ({cards, advice} = parseDeck(await response.text()));
  engine = await loadCerune();
  document.querySelectorAll('[data-topic]').forEach(button => button.addEventListener('click', () => {
    topic = button.dataset.topic;
    document.querySelectorAll('[data-topic]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
  }));
  document.querySelectorAll('[data-count]').forEach(button => button.addEventListener('click', () => {
    count = Number(button.dataset.count);
    document.querySelectorAll('[data-count]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
  }));
  $('#draw').addEventListener('click', showResults);
  $('#again').addEventListener('click', showSetup);
  $('#open-library').addEventListener('click', showLibrary);
  $('#close-library').addEventListener('click', showSetup);
}
init().catch(error => {
  console.error(error);
  $('#draw').disabled = true;
  $('#draw').textContent = '読込みに失敗しました。再読み込みしてください。';
});
