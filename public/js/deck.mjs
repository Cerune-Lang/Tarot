/** Read the newline-only interchange format emitted by src/cards.ceru.
 * Source of truth is Cerune; this is NOT a hand-maintained data file.
 * Unicode lines are preserved. Only 
 * tags are separated by | and never contain newlines.
 */
export function parseDeck(source) {
  const lines = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  let index = 0;
  const next = () => {
    if (index >= lines.length) throw new Error(`データが途中で終わっています (${index})`);
    return lines[index++];
  };
  if (next() !== 'CERUNE_TAROT') throw new Error('カードデータの形式が違います');
  const cards = [];
  for (let i = 0; i < 78; i++) {
    const id = next();
    const name = next();
    const en = next();
    const arcana = next();
    const suit = next();
    const numberText = next();
    const symbol = next();
    const upright = next();
    const reversed = next();
    const uprightTags = next();
    const reversedTags = next();
    if (!/^\d+$/.test(numberText)) throw new Error(`不正なカード番号: ${numberText}`);
    if (!['major', 'minor'].includes(arcana) || !id || !name || !upright || !reversed) {
      throw new Error(`カード ${i + 1} の形式が不正です`);
    }
    cards.push({
      id, name, en, arcana, suit: suit || null, number: Number(numberText), symbol,
      upright: {text: upright, tags: uprightTags ? uprightTags.split('|') : []},
      reversed: {text: reversed, tags: reversedTags ? reversedTags.split('|') : []}
    });
  }
  if (new Set(cards.map(card => card.id)).size !== 78) throw new Error('カードIDが重複しています');
  if (next() !== 'ADVICE') throw new Error('アドバイスの開始位置が不正です');
  const advice = [];
  for (let i = 0; i < 12; i++) {
    const topic = next();
    const tags = next();
    const message = next();
    if (!['general', 'love', 'work', 'relations'].includes(topic) || !message) {
      throw new Error(`アドバイス ${i + 1} の形式が不正です`);
    }
    advice.push({topic, tags: tags ? tags.split('|') : [], text: message});
  }
  if (next() !== 'END' || index !== lines.length) throw new Error('カードデータに余分な行があります');
  return {cards, advice};
}
