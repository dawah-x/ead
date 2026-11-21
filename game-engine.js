(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NoMercyEngine = api.NoMercyEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const COLORS = ['red', 'blue', 'green', 'yellow'];
  const DRAW_VALUES = new Set(['draw2', 'draw4', 'draw6', 'draw10', 'wildreverse4']);
  const WILD_VALUES = new Set(['wild', 'draw6', 'draw10', 'wildreverse4', 'roulette']);
  const COLORED_ACTIONS = ['skip', 'reverse', 'draw2', 'draw4', 'skipall', 'discardall'];
  const DEFAULT_PLAYERS = [
    { name: 'তুমি', short: 'YOU', bot: false },
    { name: 'রাফি', short: 'RF', bot: true },
    { name: 'মায়া', short: 'MY', bot: true },
    { name: 'নীল', short: 'NL', bot: true }
  ];

  class NoMercyEngine {
    constructor(options = {}) {
      this.random = options.random || Math.random;
      this.playerConfig = options.players || DEFAULT_PLAYERS;
      this.newGame();
    }

    makeCard(color, value) {
      this.cardSequence += 1;
      return { id: `c${this.cardSequence}`, color, value };
    }

    createDeck() {
      const deck = [];
      for (const color of COLORS) {
        deck.push(this.makeCard(color, '0'));
        for (let value = 1; value <= 9; value += 1) {
          deck.push(this.makeCard(color, String(value)), this.makeCard(color, String(value)));
        }
        for (const value of COLORED_ACTIONS) {
          for (let copy = 0; copy < 3; copy += 1) deck.push(this.makeCard(color, value));
        }
      }
      for (const value of ['wild', 'draw6', 'draw10', 'wildreverse4', 'roulette']) {
        for (let copy = 0; copy < 4; copy += 1) deck.push(this.makeCard('wild', value));
      }
      return this.shuffle(deck);
    }

    shuffle(cards) {
      for (let index = cards.length - 1; index > 0; index -= 1) {
        const other = Math.floor(this.random() * (index + 1));
        [cards[index], cards[other]] = [cards[other], cards[index]];
      }
      return cards;
    }

    newGame() {
      this.cardSequence = 0;
      this.players = this.playerConfig.map((player, id) => ({
        id,
        name: player.name,
        short: player.short,
        bot: Boolean(player.bot),
        hand: [],
        eliminated: false
      }));
      this.deck = this.createDeck();
      this.discard = [];
      this.outOfGame = [];
      this.current = 0;
      this.direction = 1;
      this.pending = 0;
      this.pendingLast = 0;
      this.mustPlayCardId = null;
      this.phase = 'turn';
      this.rouletteColor = null;
      this.unoPending = null;
      this.winner = null;
      this.lastEvent = { type: 'start' };
      for (let card = 0; card < 7; card += 1) {
        for (const player of this.players) player.hand.push(this.deck.pop());
      }
      let first = this.deck.pop();
      while (first && (first.color === 'wild' || !/^\d$/.test(first.value))) {
        this.deck.unshift(first);
        first = this.deck.pop();
      }
      this.discard.push(first);
      return this;
    }

    get topCard() {
      return this.discard[this.discard.length - 1] || null;
    }

    get activePlayers() {
      return this.players.filter(player => !player.eliminated);
    }

    drawPower(card) {
      const match = String(card.value).match(/\d+/);
      return match ? Number(match[0]) : 0;
    }

    isDrawCard(card) {
      return Boolean(card && DRAW_VALUES.has(card.value));
    }

    canPlay(card, playerId = this.current) {
      if (!card || this.phase !== 'turn' || this.winner || playerId !== this.current) return false;
      const player = this.players[playerId];
      if (!player || player.eliminated || !player.hand.some(item => item.id === card.id)) return false;
      if (this.mustPlayCardId && this.mustPlayCardId !== card.id) return false;
      if (this.pending > 0) return this.isDrawCard(card) && this.drawPower(card) >= this.pendingLast;
      if (WILD_VALUES.has(card.value)) return true;
      const activeColor = this.topCard && this.topCard.color === 'wild'
        ? this.topCard.chosenColor
        : this.topCard && this.topCard.color;
      return card.color === activeColor || card.value === (this.topCard && this.topCard.value);
    }

    legalCards(playerId = this.current) {
      const player = this.players[playerId];
      return player ? player.hand.filter(card => this.canPlay(card, playerId)) : [];
    }

    result(ok, extra = {}) {
      return { ok, ...extra };
    }

    playCard(cardId, options = {}) {
      if (this.phase !== 'turn' || this.winner) return this.result(false, { error: 'not-your-turn' });
      const player = this.players[this.current];
      if (!player || player.eliminated) return this.result(false, { error: 'player-eliminated' });
      if (this.unoPending === player.id) return this.result(false, { error: 'must-call-uno' });
      const handIndex = player.hand.findIndex(card => card.id === cardId);
      const card = player.hand[handIndex];
      if (!card || !this.canPlay(card)) return this.result(false, { error: 'illegal-card' });

      if (WILD_VALUES.has(card.value) && card.value !== 'roulette') {
        if (!COLORS.includes(options.color)) return this.result(false, { needs: 'color' });
      }
      if (card.value === '7') {
        const target = this.players[options.swapWith];
        if (!target || target.id === player.id || target.eliminated) return this.result(false, { needs: 'swap' });
      }
      if (card.value === 'discardall') {
        const possibleTops = [card, ...player.hand.filter(item => item.id !== card.id && item.color === card.color)];
        if (options.topCardId && !possibleTops.some(item => item.id === options.topCardId)) {
          return this.result(false, { error: 'invalid-discard-all-top' });
        }
      }

      const previousCount = player.hand.length;
      player.hand.splice(handIndex, 1);
      this.discard.push(card);
      this.mustPlayCardId = null;
      if (WILD_VALUES.has(card.value) && card.value !== 'roulette') card.chosenColor = options.color;

      let nextSteps = 1;
      let event = { type: 'play', playerId: player.id, card, drawn: 0, discarded: 0 };

      if (card.value === 'discardall') {
        const matches = player.hand.filter(item => item.color === card.color);
        player.hand = player.hand.filter(item => item.color !== card.color);
        const topId = options.topCardId || card.id;
        const pileCards = [card, ...matches];
        const selectedTop = pileCards.find(item => item.id === topId) || card;
        this.discard.pop();
        this.discard.push(...pileCards.filter(item => item.id !== selectedTop.id), selectedTop);
        event.discarded = matches.length;
        event.topCard = selectedTop;
      }

      if (card.value === '7') {
        const target = this.players[options.swapWith];
        [player.hand, target.hand] = [target.hand, player.hand];
        event.swappedWith = target.id;
      } else if (card.value === '0') {
        this.rotateHands();
        event.type = 'rotate';
      }

      if (this.isDrawCard(card)) {
        this.pending += this.drawPower(card);
        this.pendingLast = this.drawPower(card);
      }
      if (card.value === 'reverse' || card.value === 'wildreverse4') {
        this.direction *= -1;
        if (this.activePlayers.length === 2 && card.value === 'reverse') nextSteps = 2;
      }
      if (card.value === 'skip') nextSteps = 2;
      if (card.value === 'skipall') nextSteps = 0;

      if (card.value === 'roulette') {
        this.moveCurrent(1);
        this.phase = 'roulette-color';
      } else if (this.pending > 0) {
        this.moveCurrent(1);
      } else {
        this.moveCurrent(nextSteps);
      }

      if (player.hand.length === 1 && previousCount !== 1 && !player.bot) {
        this.unoPending = player.id;
      } else if (player.hand.length === 1 && player.bot) {
        this.unoPending = null;
        event.unoCalled = true;
      } else if (player.hand.length !== 1 && this.unoPending === player.id) {
        this.unoPending = null;
      }

      this.applyMercyRule();
      this.checkWinner();
      if (this.winner) this.phase = 'over';
      this.lastEvent = event;
      return this.result(true, { event });
    }

    rotateHands() {
      const active = this.activePlayers;
      const hands = active.map(player => player.hand);
      active.forEach((player, index) => {
        const recipient = active[(index + this.direction + active.length) % active.length];
        recipient.hand = hands[index];
      });
    }

    moveCurrent(steps = 1) {
      const active = this.activePlayers;
      if (!active.length) return;
      let index = this.current;
      for (let step = 0; step < steps; step += 1) {
        let attempts = 0;
        do {
          index = (index + this.direction + this.players.length) % this.players.length;
          attempts += 1;
        } while (this.players[index].eliminated && attempts <= this.players.length);
      }
      this.current = index;
      this.mustPlayCardId = null;
    }

    reshuffleIfNeeded() {
      if (this.deck.length) return;
      if (this.discard.length <= 1 && this.outOfGame.length === 0) return;
      const top = this.discard.length ? this.discard.pop() : null;
      const recycled = this.discard.splice(0).concat(this.outOfGame.splice(0));
      this.deck = this.shuffle(recycled);
      this.discard = top ? [top] : [];
    }

    drawOne() {
      this.reshuffleIfNeeded();
      return this.deck.pop() || null;
    }

    eliminate(player, reason = 'mercy') {
      if (!player || player.eliminated) return;
      player.eliminated = true;
      this.outOfGame.push(...player.hand);
      player.hand = [];
      if (this.unoPending === player.id) this.unoPending = null;
      if (this.current === player.id) this.moveCurrent(1);
      this.lastEvent = { type: 'elimination', playerId: player.id, reason };
    }

    applyMercyRule() {
      for (const player of this.players) {
        if (!player.eliminated && player.hand.length >= 25) this.eliminate(player);
      }
      this.checkWinner();
    }

    checkWinner() {
      const active = this.activePlayers;
      if (!active.length) {
        this.winner = null;
        this.phase = 'over';
        return null;
      }
      const emptied = active.find(player => player.hand.length === 0);
      if (emptied) this.winner = emptied.id;
      else if (active.length === 1) this.winner = active[0].id;
      if (this.winner !== null) this.phase = 'over';
      return this.winner;
    }

    takeCards(player, amount) {
      let drawn = 0;
      while (drawn < amount && !player.eliminated && !this.winner) {
        const card = this.drawOne();
        if (!card) break;
        player.hand.push(card);
        drawn += 1;
        if (player.hand.length >= 25) this.eliminate(player);
      }
      this.checkWinner();
      return drawn;
    }

    drawUntilPlayable(playerId = this.current) {
      const player = this.players[playerId];
      if (this.phase !== 'turn' || this.pending || this.winner || playerId !== this.current) {
        return this.result(false, { error: 'cannot-draw' });
      }
      if (this.unoPending === playerId) return this.result(false, { error: 'must-call-uno' });
      if (this.legalCards(playerId).length) return this.result(false, { error: 'playable-card-in-hand' });
      let drawn = 0;
      while (!player.eliminated && !this.winner) {
        const card = this.drawOne();
        if (!card) break;
        player.hand.push(card);
        drawn += 1;
        if (player.hand.length >= 25) {
          this.eliminate(player);
          break;
        }
        if (this.canPlay(card, playerId)) {
          this.mustPlayCardId = card.id;
          this.lastEvent = { type: 'draw-playable', playerId, card, drawn };
          return this.result(true, { drawn, playableCard: card });
        }
      }
      this.checkWinner();
      if (!this.winner && !player.eliminated) this.moveCurrent(1);
      this.lastEvent = { type: 'draw', playerId, drawn };
      return this.result(true, { drawn, playableCard: null });
    }

    drawPenalty(playerId = this.current) {
      if (this.phase !== 'turn' || !this.pending || playerId !== this.current || this.winner) {
        return this.result(false, { error: 'no-pending-draw' });
      }
      const amount = this.pending;
      this.pending = 0;
      this.pendingLast = 0;
      const drawn = this.takeCards(this.players[playerId], amount);
      if (!this.winner && !this.players[playerId].eliminated) this.moveCurrent(1);
      this.lastEvent = { type: 'penalty-draw', playerId, amount, drawn };
      return this.result(true, { amount, drawn });
    }

    callUno(playerId) {
      if (this.unoPending !== playerId) return false;
      this.unoPending = null;
      this.lastEvent = { type: 'uno', playerId };
      return true;
    }

    catchUno(callerId = this.current) {
      if (this.unoPending === null || this.unoPending === callerId || callerId !== this.current || this.winner) {
        return this.result(false, { error: 'no-uno-to-catch' });
      }
      const targetId = this.unoPending;
      this.unoPending = null;
      const drawn = this.takeCards(this.players[targetId], 2);
      this.lastEvent = { type: 'uno-caught', playerId: targetId, callerId, drawn };
      return this.result(true, { playerId: targetId, drawn });
    }

    chooseRouletteColor(color, playerId = this.current) {
      if (this.phase !== 'roulette-color' || playerId !== this.current || !COLORS.includes(color) || this.winner) {
        return this.result(false, { error: 'invalid-roulette-choice' });
      }
      this.rouletteColor = color;
      let drawn = 0;
      let found = false;
      const player = this.players[playerId];
      while (!player.eliminated && !this.winner) {
        const card = this.drawOne();
        if (!card) break;
        player.hand.push(card);
        drawn += 1;
        if (player.hand.length >= 25) {
          this.eliminate(player);
          break;
        }
        if (card.color === color) {
          found = true;
          break;
        }
      }
      this.rouletteColor = null;
      this.phase = 'turn';
      this.checkWinner();
      if (!this.winner && !player.eliminated) this.moveCurrent(1);
      this.lastEvent = { type: 'roulette', playerId, color, drawn, found };
      return this.result(true, { color, drawn, found });
    }
  }

  return { NoMercyEngine, COLORS, DRAW_VALUES, WILD_VALUES };
});
