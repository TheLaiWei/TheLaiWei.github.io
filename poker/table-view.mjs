import {VALUES as values} from './chips.mjs';
import {cardLabel, suit} from './engine.mjs';

export const fmt = value => value.toLocaleString('en-US');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export function card(c, hidden = false, shared = false) {
  if (hidden || c == null) return '<span class="card back" aria-label="Face-down card"></span>';
  const label = cardLabel(c), rank = label.slice(0,-1), pip = label.slice(-1);
  const mark = `<span class="mark"><strong>${rank}</strong><span>${pip}</span></span>`;
  return `<span class="card face ${[1,3].includes(suit(c))?'red':''}" role="img" aria-label="${label}">${mark}${shared ? mark : ''}</span>`;
}

// Side inserts continue down the barrel. Alternating positions separate adjacent chips.
function chipLayer(index) {
  const inserts = index % 2
    ? 'M9 6q5 3 11 4v6q-6-1-11-4z M44 11q7 0 14-1v6q-7 1-14 1z M72 6q5-2 8-5v6q-3 3-8 5z'
    : 'M3 1q3 4 9 6v6q-6-2-9-6z M25 10q7 1 14 1v6q-7 0-14-1z M62 9q6-1 12-4v6q-6 3-12 4z';
  return `<g transform="translate(0 ${15 + index * 6})">
    <path class="barrel" d="M2 0a40 12 0 0 1 80 0v6a40 12 0 0 1-80 0z"/>
    <path class="inserts" d="${inserts}"/>
  </g>`;
}

export function pile(value, count) {
  const visible = Math.max(1, Math.min(8,count));
  const layers = [];
  for (let i = visible - 1; i >= 0; i--) layers.push(chipLayer(i));
  return `<svg class="stack d${value}" viewBox="0 0 84 ${35 + (visible-1)*6}" aria-hidden="true" focusable="false">
    <g opacity="${count ? 1 : 0.3}">${layers.join('')}
      <ellipse class="rim" cx="42" cy="15" rx="40" ry="12"/>
      <ellipse class="edge-spots" cx="42" cy="15" rx="35" ry="9.5" pathLength="100"/>
      <ellipse class="inlay" cx="42" cy="15" rx="26" ry="8"/>
    </g><text x="42" y="19">${value}</text>
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
    '<div class="quick-actions">' + btn('min',minTo,!active || !canFullRaise) + btn('allin','All-in',!active) + btn('clear','Clear',!active || !staged) + '</div>' +
    '<div class="pending-row"><div class="pending">' + (amount ? piles(pending) + '<strong>+' + fmt(amount) + '</strong>' : '<span>In round · ' + fmt(street) + '</span>') + '</div>' + btn('fold','Fold',!active) + '</div>';
  return '<div class="seat-hand"><div class="seat-name">' + (button?'<span class="dealer">D</span>':'') + escape(name) + '</div><div class="hole-cards">' + hand + '</div><small class="seat-status">' + (complete?'Hand complete':active?'Your turn':'Waiting') + '</small></div>' +
    '<div class="seat-right"><div class="controls">' + actions + '</div><div class="bank"><div class="chip-tray">' + tray + '</div><div class="balance"><span>Stack</span><strong>' + fmt(balance) + '</strong></div></div></div>';
}
