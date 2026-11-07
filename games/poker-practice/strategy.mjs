import {compare, evaluate, legal, rank, suit} from '../../poker/engine.mjs';

// Only the acting player's cards and public table information cross this boundary.
export function perspective(state, seat, history = []) {
  const player = state.players[seat], other = state.players[1-seat];
  const streetActions = history.filter(action => action.street === state.street);
  const lastAggressor = history.findLast(action => action.street !== state.street && action.type === 'raise');
  const lastAction = streetActions.at(-1);
  return {
    initiative: lastAggressor?.seat === seat,
    checkedTo: lastAction?.type === 'check' && lastAction.seat !== seat,
    raises: streetActions.filter(action => action.type === 'raise').length,
    hole: [...player.hole], board: [...state.board], street: state.street,
    pot: player.committed + other.committed, committed: player.street,
    opponentTotal: other.street + other.stack, button: state.button === seat,
    bigBlind: state.settings.bigBlind, currentBet: state.currentBet, ...legal(state,seat)
  };
}

export function equity(view, random = Math.random, trials = 128) {
  const known = new Set([...view.hole,...view.board]);
  const unseen = Array.from({length:52}, (_,i)=>i).filter(c=>!known.has(c));
  const needed = 7-view.board.length;
  let wins = 0;
  for (let n=0; n<trials; n++) {
    const pool = [...unseen];
    for (let i=0; i<needed; i++) {
      const j=i+Math.floor(random()*(pool.length-i));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    const board=[...view.board,...pool.slice(2,needed)];
    const result=compare(evaluate([...view.hole,...board]).score,
                         evaluate([...pool.slice(0,2),...board]).score);
    wins += result>0 ? 1 : result===0 ? 0.5 : 0;
  }
  return wins/trials;
}

// Remove any uncallable excess before computing the effective price.
export function callPrice(view) {
  const unmatched = Math.max(0,view.owed-view.call);
  return view.call ? view.call/(view.pot-unmatched+view.call) : 0;
}

function drawPotential(view) {
  if (view.board.length !== 3 && view.board.length !== 4) return false;
  const cards = [...view.hole, ...view.board];
  const fourFlush = view.hole.some(c => cards.filter(x => suit(x) === suit(c)).length === 4);
  const ranks = new Set(cards.map(rank));
  const publicRanks = new Set(view.board.map(rank));
  if (ranks.has(14)) ranks.add(1);
  if (publicRanks.has(14)) publicRanks.add(1);
  let oneAway = false;
  for (let low = 1; low <= 10; low++) {
    const run = Array.from({length:5}, (_,i) => low + i);
    const present = run.filter(r => ranks.has(r));
    if (present.length === 5) return false; // A completed straight plays for value.
    if (present.length === 4 && present.some(r => !publicRanks.has(r))) oneAway = true;
  }
  return fourFlush || oneAway;
}

function preflopFrequency(view, strength) {
  const [a,b] = view.hole;
  const playable = strength + (suit(a) === suit(b) ? 0.035 : 0)
    + (Math.abs(rank(a)-rank(b)) === 1 ? 0.02 : 0);
  if (!view.raises && view.currentBet <= view.bigBlind) {
    if (view.button) return playable > 0.52 ? 0.94 : playable > 0.41 ? 0.74 : 0.32;
    return playable > 0.57 ? 0.83 : playable > 0.45 ? 0.49 : 0.18;
  }
  const threshold = view.raises > 1 ? 0.73 : 0.63;
  return playable > threshold ? 0.80 : playable > 0.52 && view.raises < 2 ? 0.12 : 0.025;
}

function postflopFrequency(view, strength) {
  const drawing = drawPotential(view);
  if (view.owed) {
    if (strength > 0.77) return 0.76;
    return drawing && view.raises < 2 ? 0.22 : 0.035;
  }
  if (strength > 0.68) return 0.89;
  if (drawing) return view.initiative || view.checkedTo ? 0.66 : 0.43;
  if (view.street === 'flop' && view.initiative) {
    const suits = view.board.map(suit);
    const dry = new Set(suits).size === 3 && !view.board.some((a,i) =>
      view.board.slice(i+1).some(b => Math.abs(rank(a)-rank(b)) <= 2));
    return dry ? 0.71 : 0.51;
  }
  if (strength >= 0.50) return view.checkedTo ? 0.54 : 0.34;
  if (view.street === 'river') return view.checkedTo && strength < 0.35 ? 0.24 : 0.085;
  return view.checkedTo ? 0.31 : 0.17;
}

function raiseTarget(view, random) {
  let target;
  if (view.street === 'preflop') {
    target = view.currentBet <= view.bigBlind
      ? view.bigBlind * (view.button ? 2.5 : 3.5)
      : view.currentBet * (view.button ? 2.7 : 3.2);
  } else {
    const smallFlopBet = view.street === 'flop' && view.initiative && !view.owed;
    const fraction = smallFlopBet ? 0.35 : random() < 0.5 ? 0.55 : 0.80;
    target = view.currentBet + (view.pot + view.call) * fraction;
  }
  return Math.min(view.maxTo,Math.max(view.minTo,Math.min(Math.round(target),view.opponentTotal)));
}

export function chooseAction(view, random = Math.random) {
  const strength = equity(view,random);
  const frequency = view.street === 'preflop'
    ? preflopFrequency(view,strength) : postflopFrequency(view,strength);
  if (view.canRaise && random() < frequency) return {type:'raise',to:raiseTarget(view,random)};
  if (!view.owed) return {type:'check'};
  const pressure = view.owed / Math.max(view.pot,1);
  const margin = Math.min(0.20, pressure*0.24) + (view.raises > 1 ? 0.06 : 0);
  const call = strength + (view.button ? 0.035 : 0) + (random()-0.5)*0.08 >= callPrice(view) + margin;
  return {type:call ? 'call' : 'fold'};
}

export function describeAction(type,to,view) {
  if (type==='raise') return (view.currentBet?'Raise to ':'Bet ')+to;
  if (type==='call') return 'Call '+view.call;
  return type[0].toUpperCase()+type.slice(1);
}

const percent = value => Math.round(value * 100) + '%';

export function gradeDecision({type,to,view}, strength) {
  const price = callPrice(view);
  if (type === 'fold' && !view.call)
    return {verdict:'Bad', reason:'Checking was free and kept you in the hand.'};

  if (type === 'call' || type === 'fold') {
    const margin = strength - price;
    const favorable = type === 'call' ? margin : -margin;
    const verdict = favorable > 0.12 ? 'Good' : favorable < -0.12 ? 'Bad' : 'Close';
    return {verdict, reason:`Estimated equity was ${percent(strength)}, and calling ${view.call} needed ${percent(price)} if betting ended here.`};
  }

  if (type === 'check') {
    if (strength >= 0.84 && view.street === 'river' && view.checkedTo)
      return {verdict:'Bad', reason:'Checking back ended the betting with a strong hand that could earn a value bet.'};
    if (strength >= 0.68)
      return {verdict:'Close', reason:'Checking can disguise your strong hand, but a bet could earn chips from a weaker one.'};
    return {verdict:'Good', reason:view.street === 'river' ? 'Checking kept the pot small with limited value from a bet.' : 'Checking let you continue without paying more chips.'};
  }

  const risk = to-view.committed;
  if (strength >= 0.68)
    return {verdict:'Good',reason:`With ${percent(strength)} estimated equity, your wager gave weaker hands a chance to pay you.`};
  if (drawPotential(view) && risk <= view.pot + view.call)
    return {verdict:'Good',reason:'Your draw can improve if called, and the raise can win the pot immediately.'};
  if (strength < 0.30 && risk >= view.pot && view.owed)
    return {verdict:'Bad',reason:`You risked ${risk} into ${view.pot} with only ${percent(strength)} estimated equity.`};
  return {verdict:'Close',reason:`Risking ${risk} into ${view.pot} depends on how often the computer folds or calls with worse.`};
}

export function reviewDecision(entry) {
  const v=entry.view;
  let seed=[...v.hole,...v.board,v.pot,v.call].reduce((s,n)=>(Math.imul(s,31)+n)>>>0,17);
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  return gradeDecision(entry,equity(v,random,256));
}
