import {VALUES as values} from './chips.mjs';
import {cardLabel, suit} from './engine.mjs';

export const fmt = value => value.toLocaleString('en-US');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export function card(c, hidden = false, slot = false) {
  if (hidden || slot) return '<span class="card back" aria-label="Face-down card"></span>';
  const label = cardLabel(c), rank = label.slice(0,-1), pip = label.slice(-1);
  const corner = '<span>' + rank + '<small>' + pip + '</small></span>';
  return '<span class="card face ' + ([1,3].includes(suit(c)) ? 'red' : '') + '" role="img" aria-label="' + label + '"><i>' + corner + '</i><b>' + pip + '</b><i>' + corner + '</i></span>';
}

// Paint at most eight discs, keeping the precise count visible independently.
export function pile(value, count) {
  const visible = Math.min(8, count);
  const depth = Math.max(0, visible - 1);
  const faceY = 14;
  const step = 2;
  const height = 28 + step * depth;
  // Draw back to front in one bounded image. No disc participates in flex layout.
  const discs = [];
  for (let i = depth; i >= 0; i--) {
    discs.push(`<ellipse cx="42" cy="${faceY + step * i}" rx="40" ry="12"/>`);
  }
  return `<svg class="stack d${value}" viewBox="0 0 84 ${height}" aria-hidden="true" focusable="false">
    <g opacity="${visible ? 1 : 0.25}">${discs.join('')}</g>
    <text x="42" y="19">${value}</text>
  </svg>`;
}
export function piles(bag) {
  return values.map((v,k) => bag[k] ? '<span class="bundle" aria-label="' + bag[k] + ' chips of ' + v + '">' + pile(v,bag[k]) + '<small>×' + bag[k] + '</small></span>' : '').join('');
}

export function playerView({i,name,button,cards,visible,complete,active,available,pending,staged,balance,street,call,raiseTo,minTo,canFullRaise,valid,locked,result,nextLabel}) {
  const btn = (key,label,disabled=false) => '<button data-action="' + key + '" data-player="' + i + '" ' + (disabled || locked ? 'disabled' : '') + '>' + label + '</button>';
  const amount = pending.reduce((sum,n,k) => sum+n*values[k],0);
  const hand = cards.map((c,n) => '<button type="button" class="private-card" data-peek="' + i + '" data-index="' + n + '" aria-label="Hold card ' + (n+1) + ' to see hand" ' + (complete?'disabled':'') + '>' + card(c,!visible) + '</button>').join('');
  const tray = values.map((v,k) => '<button class="chip-button" data-action="chip" data-player="' + i + '" data-value="' + v + '" aria-label="Add ' + v + ' chips" ' + (locked || !active || !available[k]?'disabled':'') + '>' + pile(v,available[k]) + '<small>×' + fmt(available[k]) + '</small></button>').join('');
  const actions = complete ? '<div class="result-copy">' + escape(result) + '</div>' + btn(nextLabel==='New match'?'new':'next',nextLabel) :
    '<div class="main-actions">' + btn('call',call?'Call '+fmt(call):'Check',!active) + btn('commit',raiseTo, !active || !valid) + '</div>' +
    '<div class="quick-actions">' + btn('min',minTo,!active || !canFullRaise) + btn('allin','All-in',!active) + btn('undo','Undo',!active || !staged) + btn('clear','Clear',!active || !staged) + '</div>' +
    '<div class="pending-row"><div class="pending">' + (amount ? piles(pending) + '<strong>+' + fmt(amount) + '</strong>' : '<span>In round · ' + fmt(street) + '</span>') + '</div>' + btn('fold','Fold',!active) + '</div>';
  return '<div class="seat-hand"><div class="seat-name">' + (button?'<span class="dealer">D</span>':'') + escape(name) + '</div><div class="hole-cards">' + hand + '</div><small class="seat-status">' + (complete?'Hand complete':active?'Your turn':'Waiting') + '</small></div>' +
    '<div class="seat-right"><div class="controls">' + actions + '</div><div class="bank"><div class="chip-tray">' + tray + '</div><div class="balance"><span>Stack</span><strong>' + fmt(balance) + '</strong></div></div></div>';
}
