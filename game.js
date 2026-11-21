(() => {
  const COLORS = ['red', 'blue', 'green', 'yellow'];
  const COLOR_NAMES = { red: 'লাল', blue: 'নীল', green: 'সবুজ', yellow: 'হলুদ' };
  const COLOR_VARS = { red: '--red', blue: '--blue', green: '--green', yellow: '--yellow' };
  const CARD_LABELS = {
    skip: '⊘', reverse: '↻', draw2: '+2', draw4: '+4', draw6: '+6', draw10: '+10',
    skipall: 'ALL', discardall: 'ALL', wildreverse4: '+4', wild: 'WILD', roulette: 'CLR'
  };
  const CARD_NAMES = {
    skip: 'স্কিপ', reverse: 'দিক বদল', draw2: '২টি টানো', draw4: '৪টি টানো', draw6: '৬টি টানো', draw10: '১০টি টানো',
    skipall: 'সবাই স্কিপ', discardall: 'সব ফেলে দাও', wildreverse4: 'দিক বদল +৪', wild: 'ওয়াইল্ড', roulette: 'কালার রুলেট'
  };
  const $ = id => document.getElementById(id);
  const engine = new NoMercyEngine();
  const el = {
    hand: $('playerHand'), discard: $('discardStack'), deck: $('drawPile'), drawBtn: $('drawBtn'), drawText: $('drawButtonText'),
    status: $('statusText'), sub: $('subStatus'), count: $('handCount'), playerCount: $('playerCardCount'), deckCount: $('deckCount'),
    toast: $('challengeToast'), modal: $('modal'), content: $('modalContent'), message: $('liveMessage'), turn: $('turnText'),
    direction: document.querySelector('.direction'), indicator: $('turnIndicator'), youTurn: $('youTurn'), hint: $('handHint'),
    unoBtn: $('unoBtn'), sortBtn: $('sortBtn'), modalClose: $('modalClose')
  };
  let botTimer = 0;
  let toastTimer = 0;
  let soundOn = false;
  let audioContext = null;
  let modalLocked = false;

  function showToast(text, duration = 2200) {
    el.message.textContent = text;
    el.message.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.message.classList.remove('show'), duration);
  }

  function beep(frequency = 420, duration = 0.07) {
    if (!soundOn) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioContext ||= new AudioContext();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.035, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Sound is optional; game play must never depend on it. */ }
  }

  function cardText(card) {
    return CARD_LABELS[card.value] || card.value;
  }

  function iconMarkup(value) {
    const icons = {
      skip: '<svg class="action-symbol" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22"/><path d="M17 47 47 17"/></svg>',
      reverse: '<svg class="action-symbol reverse-symbol" viewBox="0 0 64 64" aria-hidden="true"><path d="M15 27a19 19 0 0 1 33-8l3 4M49 17v8h-8M49 37a19 19 0 0 1-33 8l-3-4m2 6v-8h8"/></svg>',
      skipall: '<svg class="action-symbol" viewBox="0 0 64 64" aria-hidden="true"><circle cx="20" cy="23" r="7"/><circle cx="43" cy="23" r="7"/><path d="M8 48c1-9 5-14 12-14s11 5 12 14M32 48c1-9 5-14 11-14 7 0 11 5 12 14M12 51 52 13"/></svg>',
      discardall: '<svg class="action-symbol bin-symbol" viewBox="0 0 64 64" aria-hidden="true"><path d="M13 18h38M24 18v-6h16v6m8 0-3 34H19l-3-34m13 8v18m10-18v18"/></svg>'
    };
    if (value === '7') return '<span class="special-number seven-swap"><b>7</b><i>⇄</i></span>';
    if (value === '0') return '<span class="special-number zero-pass"><b>0</b><i>↻</i></span>';
    if (/^[0-9]$/.test(String(value))) return `<span class="card-value">${value}</span>`;
    const amounts = { draw2: 2, draw4: 4, draw6: 6, draw10: 10 };
    if (amounts[value]) return `<span class="face-draw">+${amounts[value]}</span>`;
    if (icons[value]) return icons[value];
    if (value === 'wildreverse4') return `<span class="face-combo">${icons.reverse}<b>+4</b></span>`;
    if (value === 'wild') return '<span class="wild-face">WILD</span>';
    if (value === 'roulette') return '<span class="roulette-face"><i></i><b>COLOR<br>ROULETTE</b></span>';
    return `<span class="card-value">${value}</span>`;
  }


  function cardAccessibleName(card) {
    const color = card.color === 'wild' ? 'ওয়াইল্ড' : COLOR_NAMES[card.color];
    return `${color} ${CARD_NAMES[card.value] || card.value}`;
  }

  function createCardElement(card, small = false) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `card playing-card ${card.color}${!small && engine.canPlay(card) ? ' playable' : ''}`;
    node.dataset.id = card.id;
    node.setAttribute('aria-label', cardAccessibleName(card));
    if (small) {
      node.tabIndex = -1;
      node.setAttribute('aria-hidden', 'true');
    }
    const label = cardText(card);
    const inner = document.createElement('span');
    inner.className = 'card-inner';
    const main = document.createElement('span');
    main.className = `card-face${card.color === 'wild' ? ' wild-label' : ''}`;
    main.innerHTML = iconMarkup(card.value);
    inner.append(main);
    node.append(inner);
    const topLeft = document.createElement('span');
    topLeft.className = 'card-corner tl';
    topLeft.textContent = label.replace('\n', ' ');
    const bottomRight = document.createElement('span');
    bottomRight.className = 'card-corner br';
    bottomRight.textContent = label.replace('\n', ' ');
    node.append(topLeft, bottomRight);
    if (card.color === 'wild' && card.chosenColor) {
      const chip = document.createElement('span');
      chip.className = 'wild-color-chip';
      chip.style.background = `var(${COLOR_VARS[card.chosenColor]})`;
      chip.setAttribute('aria-label', `নির্বাচিত রং ${COLOR_NAMES[card.chosenColor]}`);
      node.append(chip);
    }
    if (!small) {
      node.addEventListener('click', () => playHumanCard(card.id));
    }
    return node;
  }

  function renderOpponents() {
    for (let index = 1; index < engine.players.length; index += 1) {
      const player = engine.players[index];
      const box = $(`opp-${index}`);
      box.replaceChildren();
      const seat = document.createElement('div');
      const isCurrent = engine.current === player.id && engine.phase !== 'over';
      seat.className = `opponent-card${player.eliminated ? ' opponent-eliminated' : ''}${isCurrent ? ' opponent-current' : ''}`;
      const avatar = document.createElement('span');
      avatar.className = `avatar bot-${index}`;
      avatar.textContent = player.eliminated ? 'OUT' : player.short;
      const meta = document.createElement('span');
      meta.className = 'player-meta';
      const name = document.createElement('b');
      name.textContent = player.name;
      const count = document.createElement('small');
      count.textContent = player.eliminated ? 'বাদ পড়েছে' : `${player.hand.length}টি কার্ড`;
      meta.append(name, count);
      seat.append(avatar, meta);
      if (!player.eliminated && player.hand.length <= 5) {
        const backs = document.createElement('span');
        backs.className = 'mini-card-row';
        for (let card = 0; card < player.hand.length; card += 1) {
          const back = document.createElement('i');
          back.className = 'mini-back';
          backs.append(back);
        }
        seat.append(backs);
      }
      box.append(seat);
    }
  }

  function renderDiscard() {
    el.discard.replaceChildren();
    engine.discard.slice(-3).forEach(card => el.discard.append(createCardElement(card, true)));
  }

  function renderHand() {
    el.hand.replaceChildren();
    const hand = engine.players[0].hand;
    const center = (hand.length - 1) / 2;
    const spread = Math.min(8, Math.max(3, hand.length * 0.55));
    hand.forEach((card, index) => {
      const face = createCardElement(card);
      const tilt = center === 0 ? 0 : ((index - center) / center) * spread;
      face.style.setProperty('--tilt', `${tilt.toFixed(1)}deg`);
      el.hand.append(face);
    });
    const firstCard = el.hand.firstElementChild;
    if (hand.length > 7 && firstCard) {
      const cardWidth = firstCard.getBoundingClientRect().width || 84;
      const available = Math.max(240, el.hand.clientWidth - 20);
      const spacing = Math.max(cardWidth * 0.42, Math.min(cardWidth - 14, (available - cardWidth) / (hand.length - 1)));
      el.hand.style.setProperty('--card-overlap', `${Math.max(0, cardWidth - spacing)}px`);
    } else {
      el.hand.style.removeProperty('--card-overlap');
    }
  }

  function isHumanTurn() {
    return !engine.winner && engine.phase !== 'over' && engine.current === 0;
  }

  function captureCardFlight(card, playerId = 0) {
    let source;
    if (playerId === 0) {
      source = [...el.hand.querySelectorAll('.card')].find(node => node.dataset.id === card.id);
    } else {
      source = $(`opp-${playerId}`)?.querySelector('.avatar');
    }
    if (!source) return null;
    const rect = source.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const node = playerId === 0 ? source.cloneNode(true) : createCardElement(card, true);
    node.removeAttribute('id');
    node.removeAttribute('data-id');
    node.setAttribute('aria-hidden', 'true');
    node.tabIndex = -1;
    node.disabled = true;
    return { node, from: rect };
  }

  function animateCardFlight(flight) {
    if (!flight || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    const target = el.discard.querySelector('.card:last-child');
    if (!target) return false;
    const from = flight.from;
    const to = target.getBoundingClientRect();
    if (!to.width || !to.height) return false;
    const node = flight.node;
    node.classList.remove('playable');
    node.classList.add('card-flight');
    Object.assign(node.style, {
      position: 'fixed', left: `${from.left}px`, top: `${from.top}px`,
      width: `${from.width}px`, height: `${from.height}px`, margin: '0',
      transform: 'none', transformOrigin: 'top left', transition: 'none',
      zIndex: '10000', pointerEvents: 'none'
    });
    document.body.append(node);
    target.style.visibility = 'hidden';
    void node.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dx = to.left - from.left;
      const dy = to.top - from.top;
      const sx = to.width / from.width;
      const sy = to.height / from.height;
      node.style.transition = 'transform 560ms cubic-bezier(.18,.72,.22,1), opacity 560ms ease';
      node.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotate(1deg)`;
      node.style.opacity = '.96';
    }));
    window.setTimeout(() => {
      target.style.visibility = '';
      node.remove();
    }, 610);
    return true;
  }

  function render() {
    renderOpponents();
    renderDiscard();
    renderHand();
    const human = engine.players[0];
    const humanTurn = isHumanTurn() && engine.phase === 'turn';
    const playable = engine.legalCards(0).length > 0;
    el.deckCount.textContent = engine.deck.length.toLocaleString('bn-BD');
    el.count.textContent = human.hand.length.toLocaleString('bn-BD');
    el.playerCount.textContent = `${human.hand.length.toLocaleString('bn-BD')}টি কার্ড`;
    el.direction.textContent = engine.direction === 1 ? '↻' : '↺';
    el.turn.textContent = engine.phase === 'roulette-color' ? `${engine.players[engine.current].name}-এর কালার রুলেট` : `${engine.players[engine.current].name}-এর পালা`;
    el.youTurn.textContent = humanTurn ? 'তোমার পালা' : (engine.current === 0 ? 'রং বেছে নাও' : 'অপেক্ষা');
    el.indicator.classList.toggle('active', engine.current === 0 && engine.phase !== 'over');
    document.querySelector('.player-badge').classList.toggle('player-current', engine.current === 0 && engine.phase !== 'over');
    el.drawText.textContent = engine.pending ? `${engine.pending.toLocaleString('bn-BD')}টি তুলো` : 'কার্ড তুলো';
    el.drawBtn.disabled = !humanTurn || (engine.pending === 0 && playable);
    el.deck.disabled = el.drawBtn.disabled;
    el.sortBtn.disabled = engine.phase === 'over';
    el.unoBtn.disabled = engine.unoPending !== 0;
    el.unoBtn.setAttribute('aria-label', engine.unoPending === 0 ? 'UNO বলো' : 'UNO এখন বলা যাবে না');
    el.hint.textContent = engine.phase === 'roulette-color'
      ? 'প্রতিপক্ষ রং বেছে ড্র করছে'
      : engine.pending
        ? `ড্র জমেছে +${engine.pending} — সমান বা বড় ড্র কার্ড খেলো, অথবা তুলে নাও`
        : engine.mustPlayCardId
          ? 'তোলা কার্ডটি এখন খেলতেই হবে'
          : humanTurn
            ? (playable ? 'খেলার মতো কার্ড বেছে নাও' : 'কোনো কার্ড মেলেনি — ড্র পাইল চাপো')
            : 'প্রতিপক্ষ খেলছে…';
    if (human.hand.length > 8) el.hint.textContent = 'কার্ড দেখতে পাশে টেনে নাও →';
    if (engine.pending) {
      el.toast.hidden = false;
      el.toast.textContent = `ড্র পেনাল্টি +${engine.pending}`;
    } else {
      el.toast.hidden = true;
    }
    if (engine.phase === 'roulette-color') {
      setStatus('কালার রুলেট!', 'পরের খেলোয়াড় একটি রং বলবে এবং সেই রং না পাওয়া পর্যন্ত তুলবে');
    } else if (engine.pending) {
      setStatus(humanTurn ? `${engine.pending}টি ড্র জমেছে` : 'ড্র কার্ড জমছে…', 'সমান বা বেশি মানের ড্র কার্ড দিয়ে ঠেকাও');
    } else if (humanTurn) {
      setStatus(engine.mustPlayCardId ? 'তোলা কার্ডটি খেলো' : playable ? 'একটি কার্ড বেছে নাও' : 'কার্ড তুলতে হবে', 'রং, সংখ্যা বা চিহ্ন মিলিয়ে খেলো');
    } else if (engine.phase !== 'over') {
      setStatus(`${engine.players[engine.current].name} ভাবছে…`, '');
    }
  }

  function setStatus(main, sub) {
    el.status.textContent = main;
    el.sub.textContent = sub;
  }

  function showModal(content, { locked = false } = {}) {
    modalLocked = locked;
    el.content.innerHTML = content;
    el.modal.hidden = false;
    el.modalClose.hidden = locked;
    el.modal.dataset.locked = locked ? 'true' : 'false';
  }

  function hideModal(force = false) {
    if (modalLocked && !force) return;
    modalLocked = false;
    el.modal.hidden = true;
    el.modalClose.hidden = false;
    el.modal.dataset.locked = 'false';
  }

  function openColorChoice(cardId, roulette = false) {
    const title = roulette ? 'রং বলো' : 'পরের রং বেছে নাও';
    const description = roulette
      ? 'এই রং না পাওয়া পর্যন্ত তোমাকে ড্র করতে হবে।'
      : 'ওয়াইল্ড কার্ডের জন্য রং ঘোষণা করো।';
    showModal(`<h2>${title}</h2><p>${description}</p><div class="choice-row">${COLORS.map(color =>
      `<button class="choice-button" data-color="${color}"><span class="choice-avatar" style="background:var(${COLOR_VARS[color]})"></span>${COLOR_NAMES[color]}</button>`
    ).join('')}</div>`, { locked: true });
    el.content.querySelectorAll('[data-color]').forEach(button => {
      button.addEventListener('click', () => {
        const flight = roulette ? null : captureCardFlight(engine.players[0].hand.find(card => card.id === cardId), 0);
        const result = roulette
          ? engine.chooseRouletteColor(button.dataset.color, 0)
          : engine.playCard(cardId, { color: button.dataset.color });
        if (!result.ok) {
          showToast('এই চালটি এখন দেওয়া যাচ্ছে না');
          return;
        }
        hideModal(true);
        beep(610);
        afterAction(roulette ? `কালার রুলেটে ${result.drawn}টি কার্ড তুলেছো` : 'কার্ড খেলেছো', flight);
      });
    });
  }

  function openSwapChoice(cardId) {
    const choices = engine.players.filter(player => player.id !== 0 && !player.eliminated);
    showModal(`<h2>কার সঙ্গে হাত বদলাবে?</h2><p>৭ খেলেছো—একজন প্রতিদ্বন্দ্বীকে বেছে নাও।</p><div class="choice-row">${choices.map(player =>
      `<button class="choice-button" data-player="${player.id}"><span class="choice-avatar bot-${player.id}">${player.short}</span>${player.name} · ${player.hand.length}টি</button>`
    ).join('')}</div>`, { locked: true });
    el.content.querySelectorAll('[data-player]').forEach(button => {
      button.addEventListener('click', () => {
        const flight = captureCardFlight(engine.players[0].hand.find(card => card.id === cardId), 0);
        const result = engine.playCard(cardId, { swapWith: Number(button.dataset.player) });
        if (!result.ok) {
          showToast('এই খেলোয়াড়ের সঙ্গে হাত বদলানো যাচ্ছে না');
          return;
        }
        hideModal(true);
        beep(530);
        afterAction(`${engine.players[0].name} ${engine.players[Number(button.dataset.player)].name}-এর সঙ্গে হাত বদলেছে`, flight);
      });
    });
  }

  function playHumanCard(cardId) {
    if (!isHumanTurn() || engine.phase !== 'turn') return;
    if (engine.unoPending === 0) {
      showToast('আগে UNO বলো!');
      return;
    }
    const card = engine.players[0].hand.find(item => item.id === cardId);
    if (!card || !engine.canPlay(card, 0)) {
      showToast('এই কার্ডটি এখন খেলা যাবে না');
      return;
    }
    if (card.value === '7') {
      openSwapChoice(cardId);
      return;
    }
    if (['wild', 'draw6', 'draw10', 'wildreverse4'].includes(card.value)) {
      openColorChoice(cardId);
      return;
    }
    const flight = captureCardFlight(card, 0);
    const result = engine.playCard(cardId);
    if (!result.ok) {
      showToast(result.error === 'must-call-uno' ? 'আগে UNO বলো!' : 'এই কার্ডটি এখন খেলা যাবে না');
      return;
    }
    beep(490);
    afterAction(eventMessage(result.event), flight);
  }

  function eventMessage(event) {
    if (!event) return 'চাল দেওয়া হয়েছে';
    if (event.type === 'rotate') return 'সবাই হাত ঘোরাও!';
    if (event.card && event.card.value === 'discardall') return `${event.discarded}টি কার্ড ফেলে দিয়েছো`;
    if (event.swappedWith !== undefined) return `${engine.players[event.swappedWith].name}-এর সঙ্গে হাত বদল!`;
    if (event.unoCalled) return 'UNO!';
    return 'কার্ড খেলেছো';
  }

  function drawAction() {
    if (!isHumanTurn() || engine.phase !== 'turn') return;
    let result;
    if (engine.pending) {
      result = engine.drawPenalty(0);
      if (result.ok) {
        beep(280, 0.12);
        afterAction(`${result.drawn}টি কার্ড তুলেছো`);
      } else if (result.error === 'must-call-uno') {
        showToast('আগে UNO বলো!');
      }
      return;
    }
    result = engine.drawUntilPlayable(0);
    if (!result.ok) {
      showToast(result.error === 'must-call-uno' ? 'আগে UNO বলো!' : result.error === 'playable-card-in-hand' ? 'তোমার হাতে খেলার মতো কার্ড আছে' : 'এখন কার্ড তোলা যাচ্ছে না');
      return;
    }
    beep(300, 0.09);
    if (result.playableCard) {
      afterAction('খেলার কার্ড পেয়েছো—এখন সেটি দাও');
    } else {
      afterAction(result.drawn ? `${result.drawn}টি কার্ড তুলেছো` : 'ড্র পাইল শেষ');
    }
  }

  function chooseBotColor(player) {
    const counts = Object.fromEntries(COLORS.map(color => [color, 0]));
    player.hand.forEach(card => { if (counts[card.color] !== undefined) counts[card.color] += 1; });
    return COLORS.reduce((best, color) => counts[color] > counts[best] ? color : best, COLORS[0]);
  }

  function chooseBotCard(cards, player) {
    const score = card => {
      let value = ({ draw10: 10, draw6: 9, wildreverse4: 8, draw4: 7, draw2: 6, skipall: 5, skip: 4, reverse: 3, discardall: 2, '7': 1, '0': 0 })[card.value] ?? 0;
      if (card.value === 'discardall') value += player.hand.filter(item => item.color === card.color).length;
      return value;
    };
    return [...cards].sort((a, b) => score(b) - score(a))[0];
  }

  function botPlay(card, player) {
    const options = {};
    if (['wild', 'draw6', 'draw10', 'wildreverse4'].includes(card.value)) options.color = chooseBotColor(player);
    if (card.value === '7') {
      const target = engine.players
        .filter(item => item.id !== player.id && !item.eliminated)
        .sort((a, b) => b.hand.length - a.hand.length)[0];
      if (!target) return;
      options.swapWith = target.id;
    }
    const flight = captureCardFlight(card, player.id);
    const result = engine.playCard(card.id, options);
    if (result.ok) afterAction(`${player.name} চাল দিয়েছে`, flight);
  }

  function scheduleTurn(delay = 750) {
    window.clearTimeout(botTimer);
    if (engine.winner || engine.phase === 'over') {
      showEndGame();
      return;
    }
    if (engine.current === 0 && engine.phase === 'roulette-color') {
      openColorChoice(null, true);
      return;
    }
    if (engine.current === 0 && engine.unoPending === 0) {
      const catcher = engine.activePlayers.find(player => player.bot);
      if (catcher) {
        botTimer = window.setTimeout(() => catchHumanUno(catcher), 1900);
      }
      return;
    }
    if (engine.players[engine.current].bot) {
      const grace = engine.unoPending === 0 ? 1900 : delay;
      botTimer = window.setTimeout(runBotTurn, grace);
    }
  }

  function catchHumanUno(catcher) {
    if (engine.unoPending !== 0 || engine.winner) return;
    const result = engine.catchUno(catcher.id);
    if (!result.ok) return;
    render();
    showToast('UNO বলতে ভুলেছো — প্রতিপক্ষ +২ দিল!');
    if (engine.winner) showEndGame();
    else scheduleTurn(650);
  }

  function runBotTurn() {
    if (engine.winner || engine.phase === 'over') return;
    const player = engine.players[engine.current];
    if (!player || !player.bot || player.eliminated) return;
    if (engine.unoPending !== null && engine.unoPending !== player.id) {
      const caught = engine.catchUno(player.id);
      if (caught.ok) {
        showToast(`${engine.players[caught.playerId].name} UNO বলতে ভুলেছে — +২!`);
        if (engine.winner) { render(); showEndGame(); return; }
      }
    }
    if (engine.phase === 'roulette-color') {
      const color = chooseBotColor(player);
      const result = engine.chooseRouletteColor(color, player.id);
      if (result.ok) afterAction(`${player.name} কালার রুলেটে ${result.drawn}টি তুলেছে`);
      return;
    }
    if (engine.pending) {
      const stack = engine.legalCards(player.id);
      if (stack.length) {
        botPlay(chooseBotCard(stack, player), player);
      } else {
        const result = engine.drawPenalty(player.id);
        if (result.ok) afterAction(`${player.name} ${result.drawn}টি তুলেছে`);
      }
      return;
    }
    let playable = engine.legalCards(player.id);
    if (!playable.length) {
      const drawn = engine.drawUntilPlayable(player.id);
      if (!drawn.ok || !drawn.playableCard) {
        afterAction(`${player.name} কার্ড তুলেছে`);
        return;
      }
      playable = [drawn.playableCard];
    }
    botPlay(chooseBotCard(playable, player), player);
  }

  function afterAction(message, flight = null) {
    window.clearTimeout(botTimer);
    render();
    const animating = animateCardFlight(flight);
    if (engine.winner !== null || engine.phase === 'over') {
      if (animating) window.setTimeout(showEndGame, 620);
      else showEndGame();
      return;
    }
    if (engine.unoPending === 0) showToast('একটি কার্ড বাকি — UNO বলো!', 3200);
    else if (message) showToast(message);
    scheduleTurn(engine.unoPending === 0 ? 1900 : (animating ? 850 : 750));
  }

  function showEndGame() {
    const winner = engine.winner === null ? null : engine.players[engine.winner];
    const didWin = winner && winner.id === 0;
    showModal(`<h2 class="end-title">${didWin ? 'তুমি জিতেছো!' : winner ? `${winner.name} জিতেছে!` : 'গেম শেষ'}</h2><p>${didWin ? 'দারুণ চাল! প্রতিপক্ষদের হারিয়ে দিয়েছো।' : winner ? `${winner.name} সবার শেষে টিকে গেছে।` : 'সব খেলোয়াড় বাদ পড়েছে।'}<br><span class="muted">আরেক রাউন্ড খেলবে?</span></p><button class="modal-action" id="againBtn">আবার খেলি</button>`, { locked: false });
    $('againBtn').addEventListener('click', startGame);
  }

  function startGame() {
    window.clearTimeout(botTimer);
    hideModal(true);
    engine.newGame();
    render();
    setStatus('একটি কার্ড বেছে নাও', 'রং, সংখ্যা বা চিহ্ন মিলিয়ে খেলো');
    showToast('গেম শুরু! তোমার চাল—');
  }

  function sortHand() {
    const order = { red: 0, blue: 1, green: 2, yellow: 3, wild: 4 };
    engine.players[0].hand.sort((a, b) => order[a.color] - order[b.color] || (Number(a.value) - Number(b.value)) || a.value.localeCompare(b.value));
    renderHand();
    showToast('কার্ডগুলো রং অনুযায়ী সাজানো হয়েছে');
  }

  function showRules() {
    showModal(`<h2>খেলার নিয়ম</h2><p><b>লক্ষ্য:</b> আগে হাতের কার্ড শেষ করো, অথবা শেষ জীবিত খেলোয়াড় থাকো। রং, সংখ্যা বা চিহ্ন মিলিয়ে একটি কার্ড খেলো। হাতে এক কার্ড হলে UNO বলো—পরের খেলোয়াড় শুরু করার আগে ধরা পড়লে +২ তুলবে।</p><p><b>ড্র:</b> কার্ড না মিললে খেলতে পারা কার্ড না পাওয়া পর্যন্ত তুলো; পেলে সেটি খেলতেই হবে। ড্র-কার্ডে সমান বা বেশি মানের ড্র কার্ড চাপাও; কেউ না পারলে পুরো জমা তুলে পালা হারায়।</p><p><b>বিশেষ চাল:</b> ৭ = একজনের সঙ্গে হাত বদল; ০ = সবাই দিক অনুযায়ী হাত ঘোরাও; Skip Everyone = আবার তোমার চাল; Discard All = একই রঙের সব কার্ড ফেলে দাও, বাড়তি কার্ডগুলো এর নিচে যাবে। দুই খেলোয়াড়ে Reverse, Skip-এর মতো কাজ করে।</p><p><b>Wild Color Roulette:</b> পরের খেলোয়াড় রং বেছে ড্র পাইল থেকে একে একে কার্ড তোলে; Wild কার্ড গোনা হয় না। ঘোষিত রং পেলে সব তোলা কার্ড হাতে রেখে পালা হারায়। দুই খেলোয়াড় বাকি থাকলে Wild Reverse +4 খেলোয়াড়কে নিজের দিকে +৪ টানে; stack করে বিপক্ষকে ফেরত পাঠানো যায়। হাতে ২৫ কার্ড হলেই বাদ।</p><button class="modal-action" id="gotIt">বুঝেছি</button>`);
    $('gotIt').addEventListener('click', () => hideModal());
  }

  $('drawBtn').addEventListener('click', drawAction);
  el.deck.addEventListener('click', drawAction);
  el.sortBtn.addEventListener('click', sortHand);
  $('newGameBtn').addEventListener('click', () => {
    if (window.confirm('নতুন গেম শুরু করবে? বর্তমান গেম হারিয়ে যাবে।')) startGame();
  });
  $('rulesBtn').addEventListener('click', showRules);
  $('soundBtn').addEventListener('click', () => {
    soundOn = !soundOn;
    $('soundBtn').textContent = soundOn ? '♫' : '♪';
    $('soundBtn').setAttribute('aria-pressed', String(soundOn));
    showToast(soundOn ? 'সাউন্ড চালু' : 'সাউন্ড বন্ধ');
    beep(600);
  });
  el.unoBtn.addEventListener('click', () => {
    if (engine.callUno(0)) {
      window.clearTimeout(botTimer);
      render();
      showToast('UNO! ঠিক সময়ে বলেছো');
    }
  });
  el.modalClose.addEventListener('click', () => hideModal());
  el.modal.addEventListener('click', event => {
    if (event.target === el.modal) hideModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hideModal();
  });

  startGame();
})();
