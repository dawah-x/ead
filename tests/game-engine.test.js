const test = require('node:test');
const assert = require('node:assert/strict');
const { NoMercyEngine } = require('../game-engine.js');

const makeEngine = () => new NoMercyEngine({ random: () => 0.37 });
const card = (color, value, id = `${color}-${value}`) => ({ color, value, id });
function setTable(engine, { hands, top = card('red', '5'), deck = [], current = 0, pending = 0, pendingLast = 0, direction = 1 }) {
  engine.players.forEach((player, index) => {
    player.hand = hands[index] || [];
    player.eliminated = false;
  });
  engine.discard = [top];
  engine.deck = deck;
  engine.current = current;
  engine.pending = pending;
  engine.pendingLast = pendingLast;
  engine.direction = direction;
  engine.phase = 'turn';
  engine.mustPlayCardId = null;
  engine.unoPending = null;
  engine.winner = null;
}

test('builds and deals a complete 168-card No Mercy deck', () => {
  const engine = makeEngine();
  const total = engine.deck.length + engine.discard.length + engine.players.reduce((sum, player) => sum + player.hand.length, 0);
  assert.equal(total, 168);
  assert.equal(engine.players.every(player => player.hand.length === 7), true);
  assert.match(engine.topCard.value, /^\d$/);
  assert.equal(engine.deck.length, 139);
  const allCards = [...engine.deck, ...engine.discard, ...engine.players.flatMap(player => player.hand)];
  for (const value of ['skip', 'reverse', 'draw2', 'draw4', 'skipall', 'discardall']) {
    assert.equal(allCards.filter(item => item.value === value).length, 12);
  }
  for (const value of ['wild', 'draw6', 'draw10', 'wildreverse4', 'roulette']) {
    assert.equal(allCards.filter(item => item.value === value).length, 4);
  }
});

test('matches a card by color or number and advances the turn', () => {
  const engine = makeEngine();
  const redFive = card('red', '5');
  const blueTwo = card('blue', '2');
  setTable(engine, { hands: [[redFive, blueTwo], [card('green', '1')], [card('yellow', '2')], [card('blue', '9')]], top: card('green', '5') });
  assert.equal(engine.canPlay(redFive), true);
  assert.equal(engine.canPlay(blueTwo), false);
  assert.equal(engine.playCard(redFive.id).ok, true);
  assert.equal(engine.current, 1);
});

test('enforces equal-or-higher draw stacking and accumulates the penalty', () => {
  const engine = makeEngine();
  const drawSix = card('wild', 'draw6');
  setTable(engine, { hands: [[drawSix], [card('red', 'draw4')], [], []], top: card('red', 'draw2'), pending: 2, pendingLast: 2 });
  assert.equal(engine.canPlay(drawSix), true);
  assert.equal(engine.playCard(drawSix.id, { color: 'blue' }).ok, true);
  assert.equal(engine.pending, 8);
  assert.equal(engine.pendingLast, 6);
  assert.equal(engine.current, 1);
  assert.equal(engine.canPlay(engine.players[1].hand[0]), false);
});

test('the player who cannot stack draws the total and is eliminated immediately at 25', () => {
  const engine = makeEngine();
  const hand = Array.from({ length: 24 }, (_, index) => card('blue', String(index % 10), `h${index}`));
  const drawDeck = [card('green', '1'), card('yellow', '2'), card('blue', '3')];
  setTable(engine, { hands: [hand, [card('green', '3')], [card('yellow', '4')], [card('blue', '6')]], top: card('red', 'draw2'), deck: drawDeck, pending: 2, pendingLast: 2 });
  const result = engine.drawPenalty(0);
  assert.equal(result.drawn, 1);
  assert.equal(engine.players[0].eliminated, true);
  assert.equal(engine.current, 1);
});

test('eliminated hands are held aside and recycled only when the draw pile runs out', () => {
  const engine = makeEngine();
  const hand = Array.from({ length: 24 }, (_, index) => card('blue', String(index % 10), `recycle${index}`));
  setTable(engine, { hands: [hand, [card('green', '3')], [card('yellow', '4')], [card('blue', '6')]], deck: [card('blue', '0')], top: card('red', 'draw2'), pending: 2, pendingLast: 2 });
  engine.drawPenalty(0);
  assert.equal(engine.players[0].eliminated, true);
  assert.equal(engine.outOfGame.length, 25);
  assert.equal(engine.deck.length, 0);
  const recycled = engine.drawOne();
  assert.ok(recycled);
  assert.equal(engine.outOfGame.length + engine.deck.length, 24);
});

test('a 7 swaps remaining hands with the selected active player', () => {
  const engine = makeEngine();
  const seven = card('red', '7');
  const own = card('blue', '2');
  const theirs = [card('green', '3'), card('yellow', '4'), card('red', '8')];
  setTable(engine, { hands: [[seven, own], theirs, [card('blue', '6')], [card('green', '8')]] });
  const result = engine.playCard(seven.id, { swapWith: 1 });
  assert.equal(result.ok, true);
  assert.deepEqual(engine.players[0].hand, theirs);
  assert.deepEqual(engine.players[1].hand, [own]);
  assert.equal(engine.current, 1);
});

test('a 0 rotates hands in the current direction', () => {
  const engine = makeEngine();
  const zero = card('red', '0');
  const oldHands = [[zero, card('red', '2')], [card('blue', '1')], [card('green', '3')], [card('yellow', '4')]];
  setTable(engine, { hands: oldHands });
  assert.equal(engine.playCard(zero.id).ok, true);
  assert.equal(engine.players[1].hand[0].value, '2');
  assert.equal(engine.players[0].hand[0].value, '4');
  assert.equal(engine.players[2].hand[0].value, '1');
  assert.equal(engine.players[3].hand[0].value, '3');
});

test('Discard All removes the matching color but leaves its played card on top', () => {
  const engine = makeEngine();
  const discardAll = card('red', 'discardall');
  setTable(engine, { hands: [[discardAll, card('red', '1'), card('red', 'skip'), card('blue', '2')], [card('green', '3')], [card('yellow', '4')], [card('blue', '6')]] });
  const result = engine.playCard(discardAll.id);
  assert.equal(result.ok, true);
  assert.equal(result.event.discarded, 2);
  assert.deepEqual(engine.players[0].hand.map(item => item.value), ['2']);
  assert.equal(engine.topCard.id, discardAll.id);
});

test('Discard All lets the player select another same-color card for the top', () => {
  const engine = makeEngine();
  const discardAll = card('green', 'discardall');
  const selected = card('green', '7');
  setTable(engine, { hands: [[discardAll, selected, card('green', '1'), card('red', '2')], [card('blue', '3')], [card('yellow', '4')], [card('blue', '6')]], top: card('green', '5') });
  const result = engine.playCard(discardAll.id, { topCardId: selected.id });
  assert.equal(result.ok, true);
  assert.equal(engine.topCard.id, selected.id);
  assert.equal(engine.discard.some(item => item.id === discardAll.id), true);
  assert.deepEqual(engine.players[0].hand.map(item => item.value), ['2']);
});

test('Color Roulette makes the next player choose a color and draw through wilds', () => {
  const engine = makeEngine();
  const roulette = card('wild', 'roulette');
  setTable(engine, { hands: [[roulette, card('blue', '2')], [card('green', '5')], [card('green', '3')], [card('yellow', '4')]], deck: [card('red', '1'), card('blue', '4'), card('wild', 'wild')] });
  assert.equal(engine.playCard(roulette.id).ok, true);
  assert.equal(engine.current, 1);
  assert.equal(engine.phase, 'roulette-color');
  const result = engine.chooseRouletteColor('blue', 1);
  assert.equal(result.drawn, 2);
  assert.equal(result.found, true);
  assert.equal(engine.current, 2);
  assert.equal(engine.phase, 'turn');
  assert.deepEqual(engine.players[1].hand.map(item => item.value), ['5', 'wild', '4']);
});

test('Skip Everyone returns the next turn to the player who used it', () => {
  const engine = makeEngine();
  const skipAll = card('red', 'skipall');
  setTable(engine, { hands: [[skipAll, card('blue', '2')], [card('green', '3')], [card('yellow', '4')], [card('blue', '6')]] });
  assert.equal(engine.playCard(skipAll.id).ok, true);
  assert.equal(engine.current, 0);
});

test('Reverse changes direction and the next player follows the reversed order', () => {
  const engine = makeEngine();
  const reverse = card('red', 'reverse');
  setTable(engine, { hands: [[reverse, card('blue', '2')], [card('green', '3')], [card('yellow', '4')], [card('blue', '6')]] });
  assert.equal(engine.playCard(reverse.id).ok, true);
  assert.equal(engine.direction, -1);
  assert.equal(engine.current, 3);
});

test('a player who gets an immediate extra turn must call UNO before acting again', () => {
  const engine = makeEngine();
  const skipAll = card('red', 'skipall');
  const remaining = card('red', '2');
  setTable(engine, { hands: [[skipAll, remaining], [card('green', '3')], [card('yellow', '4')], [card('blue', '6')]] });
  assert.equal(engine.playCard(skipAll.id).ok, true);
  assert.equal(engine.current, 0);
  assert.equal(engine.unoPending, 0);
  assert.equal(engine.playCard(remaining.id).error, 'must-call-uno');
  assert.equal(engine.callUno(0), true);
  assert.equal(engine.playCard(remaining.id).ok, true);
});

test('drawing until playable forces the newly drawn matching card to be played', () => {
  const engine = makeEngine();
  const drawnPlayable = card('red', '4');
  setTable(engine, { hands: [[card('blue', '2')], [card('green', '3')], [card('yellow', '4')], [card('blue', '6')]], deck: [card('yellow', '8'), drawnPlayable] });
  const result = engine.drawUntilPlayable(0);
  assert.equal(result.playableCard.id, drawnPlayable.id);
  assert.deepEqual(engine.legalCards(0).map(item => item.id), [drawnPlayable.id]);
  assert.equal(engine.canPlay(engine.players[0].hand[0]), false);
});

test('UNO can be called and a bot may catch an uncalled UNO', () => {
  const engine = makeEngine();
  const playable = card('red', '4');
  setTable(engine, { hands: [[playable, card('blue', '2')], [card('green', '3')], [card('yellow', '4')], [card('blue', '6')]] });
  engine.playCard(playable.id);
  assert.equal(engine.unoPending, 0);
  assert.equal(engine.callUno(0), true);
  assert.equal(engine.unoPending, null);
  const second = card('red', '6');
  setTable(engine, { hands: [[second, card('blue', '2')], [card('green', '3')], [card('yellow', '4')], [card('blue', '6')]], deck: [card('red', '8'), card('green', '9')] });
  engine.playCard(second.id);
  const caught = engine.catchUno(1);
  assert.equal(caught.ok, true);
  assert.equal(caught.drawn, 2);
  assert.equal(engine.unoPending, null);
});
