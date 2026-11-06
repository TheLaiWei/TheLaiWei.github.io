// Bags use a fixed order so they serialize directly in game checkpoints.
export const VALUES = [1, 5, 25, 100];
export const empty = () => [0,0,0,0];
export const valueOf = bag => bag.reduce((total,count,k) => total + count * VALUES[k], 0);
export const combine = (a,b) => a.map((n,k) => n + b[k]);
export const validBag = (bag, value) => Array.isArray(bag) && bag.length === 4 &&
  bag.every(n => Number.isSafeInteger(n) && n >= 0) && valueOf(bag) === value;

function compact(amount) {
  const bag = empty();
  for (let k = 3; k >= 0; k--) {
    bag[k] = Math.floor(amount / VALUES[k]);
    amount %= VALUES[k];
  }
  return bag;
}

// Seed a playable rack with low denominations before allocating larger chips.
export function startingBag(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw Error('Invalid stack value');
  const bag = empty();
  for (const [k,limit] of [[0,10],[1,8],[2,10]]) {
    bag[k] = Math.min(limit,Math.floor(amount / VALUES[k]));
    amount -= bag[k] * VALUES[k];
  }
  return combine(bag,compact(amount));
}

export function take(bag, amount) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > valueOf(bag)) throw Error('Invalid chip transfer');
  const remaining = [...bag], paid = empty();
  for (let k = 3; k >= 0; k--) {
    paid[k] = Math.min(remaining[k], Math.floor(amount / VALUES[k]));
    remaining[k] -= paid[k];
    amount -= paid[k] * VALUES[k];
  }
  if (!amount) return {remaining,paid};
  // Use exact chips first, then exchange one smallest oversized chip at the bank.
  const k = remaining.findIndex((count,i) => count && VALUES[i] > amount);
  remaining[k]--;
  return {remaining:combine(remaining,compact(VALUES[k]-amount)), paid:combine(paid,compact(amount))};
}

// A staged transfer describes both sides of any change-making. It never edits
// the underlying inventory until the rules engine accepts the wager.
export function stageChip(plan, denomination) {
  const k = VALUES.indexOf(denomination);
  if (k < 0 || !plan.remaining[k]) throw Error('Chip unavailable');
  const remaining = [...plan.remaining], paid = [...plan.paid];
  remaining[k]--; paid[k]++;
  return {remaining,paid};
}

export function restoreBags(state) {
  for (const player of state.players) {
    player.wallet = startingBag(player.stack);
    player.wager = startingBag(player.committed);
  }
  return state;
}

// Preserve staged denominations even when Call or Min Raise needs a different amount.
export function resizePlan(plan, target) {
  const staged=valueOf(plan.paid);
  if (target===staged) return plan;
  if (target>staged) {
    const extra=take(plan.remaining,target-staged);
    return {remaining:extra.remaining,paid:combine(plan.paid,extra.paid)};
  }
  const subset=take(plan.paid,target);
  return {remaining:combine(plan.remaining,subset.remaining),paid:subset.paid};
}
