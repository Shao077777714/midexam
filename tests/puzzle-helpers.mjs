import {applyAction} from '../public/engine.mjs';
import {BOARD_ITEMS,PARTS,SOCKETS,RECORDINGS,HIDES} from '../public/puzzles.mjs';
export function action(s,a){const r=applyAction(s,a);if(!r.ok)throw Error(r.message);return r.state;}
export function boardPrepared(s){s=action(s,{type:'TRIGGER'});for(const id of RECORDINGS.map(t=>HIDES[t.id]))s=action(s,{type:'SEARCH',id});for(const t of RECORDINGS)s=action(s,{type:'COLLECT',id:t.id});for(let index=0;index<RECORDINGS.length;index++)s=action(s,{type:'RECORD_ORDER',index});return s;}
export function repaired(s){if(!s.levels[4].triggered)s=action(s,{type:'TRIGGER'});for(const id of ['lamp-crate','linen-box','power-radio'])s=action(s,{type:'SEARCH',id});for(const [index,id]of PARTS.entries()){s=action(s,{type:'COLLECT',id});s=action(s,{type:'INSTALL',index,id});}
// Solve via actual moves / rotations, not setting connectivity flags.

for(let cell=0;cell<9;cell++){const source=s.levels[4].circuit.indexOf(cell);if(source!==cell)s=action(s,{type:'CIRCUIT_SWAP',index:source,slot:cell});}
for(let index=0;index<9;index++){const target=index===0?90:0;while(s.levels[4].circuitAngles[index]!==target)s=action(s,{type:'CIRCUIT_ROTATE',index});}
for(let index=0;index<3;index++)s=action(s,{type:'LAMP',index});return s;}

export function corridorPrepared(s){s=action(s,{type:'CLOCK_SET',hour:8,minute:10});s=action(s,{type:'SEARCH',id:'clock'});s=action(s,{type:'CHAIR'});for(const id of ['key','drawing'])s=action(s,{type:'COLLECT',id});for(const [index,value]of [1,0,2].entries())s=action(s,{type:'SEAL_SET',index,value});s=action(s,{type:'SEARCH',id:'letterbox'});return action(s,{type:'COLLECT',id:'letter'});}
