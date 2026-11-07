import {compare, evaluate, legal} from '../../poker/engine.mjs';

// Only the acting player's cards and public table information cross this boundary.
export function perspective(state, seat) {
  const player = state.players[seat], other = state.players[1-seat];
  return {
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

export function chooseAction(view, random = Math.random) {
  const strength = equity(view,random);
  const price = callPrice(view);
  const positionalBonus = view.button ? 0.04 : 0;
  const pressure = view.owed / Math.max(view.pot,1);
  const valueBet = strength + positionalBonus > 0.64 + 0.10 * pressure;
  const bluffChance = (view.button ? 0.13 : 0.07) * (view.owed ? 0.35 : 1);
  if (view.canRaise && (valueBet || random()<bluffChance)) {
    const scale = random()<0.5 ? 0.5 : 0.8;
    const target = view.currentBet + Math.round((view.pot+view.call)*scale);
    const to = Math.min(view.maxTo,Math.max(view.minTo,Math.min(target,view.opponentTotal)));
    return {type:'raise',to};
  }
  if (!view.owed) return {type:'check'};
  // A large bet generally represents a stronger range than a random hand.
  const margin = Math.min(0.18,pressure*0.21);
  return {type:strength + positionalBonus + (random()-0.5)*0.08 >= price + margin ? 'call' : 'fold'};
}

export function describeAction(type,to,view) {
  if (type==='raise') return (view.currentBet?'Raise to ':'Bet ')+to;
  if (type==='call') return 'Call '+view.call;
  return type[0].toUpperCase()+type.slice(1);
}

export function reviewDecision(entry) {
  const v=entry.view, price=callPrice(v);
  // Stable replay of the estimate when a review is reopened.
  let seed=[...v.hole,...v.board,v.pot,v.call].reduce((s,n)=>(Math.imul(s,31)+n)>>>0,17);
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const strength=equity(v,random,256), percent=n=>Math.round(n*100)+'%';
  const estimate='Estimated showdown equity '+percent(strength)+' against a random hand.';
  if(v.call) {
    const total=v.pot-Math.max(0,v.owed-v.call)+v.call;
    const odds='Calling '+v.call+' for a final pot of '+total+' needs '+percent(price)+' equity if betting ends here.';
    const comparison = strength<price ? 'Your estimate fell below that price.' : 'Your estimate cleared that price.';
    let question;
    if(entry.type==='fold') question='A fold gives up your claim to the pot. Consider whether the bet suggests a stronger opponent than a random hand.';
    else if(entry.type==='raise') question='You raised to '+entry.to+'. Consider which hands would call the extra chips.';
    else question=v.street==='river'?'On the river, compare that price with how often you expect the computer to bluff.':'For the call, consider how much another bet on a later street could cost.';
    return odds+' '+estimate+' '+comparison+' '+question;
  }
  const note=entry.type==='raise'
    ? 'You bet '+(entry.to-v.committed)+' into '+v.pot+'. Consider which weaker hands could call and which stronger hands could fold.'
    : 'Checking cost no chips. Consider whether a bet would earn a call from a weaker hand.';
  return note+' '+estimate;
}
