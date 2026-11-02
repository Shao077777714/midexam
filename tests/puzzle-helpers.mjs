import {applyAction} from '../public/engine.mjs';
import {BOARD_ITEMS,PARTS,SOCKETS,RECORDINGS} from '../public/puzzles.mjs';
export function action(s,a){const r=applyAction(s,a);if(!r.ok)throw Error(r.message);return r.state;}
export function boardPrepared(s){s=action(s,{type:'TRIGGER'});for(const id of ['work-panel','family-phone','mirror-recess'])s=action(s,{type:'SEARCH',id});for(const id of BOARD_ITEMS)s=action(s,{type:'COLLECT',id});for(let index=0;index<3;index++){s=action(s,{type:'RECORD_ORDER',index});}for(let index=0;index<4;index++){while(s.levels[3].diagramAngles[index]!==0)s=action(s,{type:'DIAGRAM_ROTATE',index,delta:90});s=action(s,{type:'DIAGRAM',index,slot:index});}for(let index=0;index<3;index++){s=action(s,{type:'CONNECT',index,socket:SOCKETS[index]});s=action(s,{type:'SIGNAL',index,value:RECORDINGS[index].beats});}return s;}
export function repaired(s){if(!s.levels[4].triggered)s=action(s,{type:'TRIGGER'});for(const id of ['lamp-crate','linen-box','power-radio'])s=action(s,{type:'SEARCH',id});for(const [index,id]of PARTS.entries()){s=action(s,{type:'COLLECT',id});s=action(s,{type:'INSTALL',index,id});}
// Solve via actual moves / rotations, not setting connectivity flags.
s=action(s,{type:'CIRCUIT_SWAP',index:0,slot:1});s=action(s,{type:'CIRCUIT_SWAP',index:5,slot:6});
for(let index=0;index<9;index++){const target=index===0?90:0;while(s.levels[4].circuitAngles[index]!==target)s=action(s,{type:'CIRCUIT_ROTATE',index});}
for(let index=0;index<3;index++)s=action(s,{type:'LAMP',index});return s;}
