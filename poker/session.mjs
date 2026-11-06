import {restoreBags} from './chips.mjs';
import {validateState} from './engine.mjs';
export const SAVE_KEY='lai-poker:save:v1';
export function loadGame(storage) {
  try {
    const raw=storage.getItem(SAVE_KEY);
    if(!raw) return {state:null};
    const saved=JSON.parse(raw);
    if(saved.schema===1 && Array.isArray(saved.state?.players)) restoreBags(saved.state);
    if(![1,2].includes(saved.schema) || !validateState(saved.state)) return {state:null,error:'The saved game is incompatible or damaged. Start a new match.'};
    return {state:saved.state};
  } catch {return {state:null,error:'Saved games are unavailable. You can still play in this tab.'};}
}
export function saveGame(storage,state) {
  if(!validateState(state)) throw new Error('Invalid game state; save cancelled');
  try {storage.setItem(SAVE_KEY,JSON.stringify({schema:2,state}));return true;} catch{return false;}
}
// A single gate controls all public actions and private peeks, independently of DOM events.
export class InteractionGate {
  constructor(){this.peek=null;this.blocked=false;this.until=0;}
  beginPeek(player,source){if(this.blocked||this.peek!==null)return false;this.peek={player,source};return true;}
  endPeek(source){if(this.peek && (source===undefined||this.peek.source===source)){this.peek=null;return true;}return false;}
  canAct(now=performance.now()){return !this.blocked&&!this.peek&&now>=this.until;}
  committed(now=performance.now()){this.until=now+400;this.peek=null;}
  pause(){this.blocked=true;this.peek=null;}
  resume(){this.blocked=false;this.peek=null;}
}
