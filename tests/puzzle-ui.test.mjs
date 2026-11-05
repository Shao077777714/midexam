// DOM adapter integration tests; these do not replace real browser rendering checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPuzzleUI} from '../public/puzzle-ui.mjs';
import {newGame,applyAction,MEMORIES} from '../public/engine.mjs';
import {RECORDINGS,PARTS,HIDES} from '../public/puzzles.mjs';
import {action} from './puzzle-helpers.mjs';
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.textContent='';this.disabled=false;this.classList={add(){},remove(){},toggle(){}};}
  closest(){return this;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(key,value){this.attrs[key]=value;}
  all(){return [this,...this.children.flatMap(e=>e.all())];}
  querySelectorAll(selector){assert.equal(selector,'[data-order]');return this.all().filter(e=>e.dataset.order!==undefined);}
}
function fixture(level){
  let state=newGame();state.level=state.unlocked=level;state.completed=state.completed.map((_,i)=>i<level);state.memories=MEMORIES.slice(0,level);state.letter=true;state.inventory=['letter'];state=action(state,{type:'TRIGGER'});
  let host,projection=0;const plays=[],results=[];
  const ui=createPuzzleUI({openPanel(){host=new Element('div');return host;},closePanel(){},getState:()=>state,toast(){},play(...args){plays.push(args);},projectionStart(){projection++;},dispatch(a){const r=applyAction(state,a);state=r.state;results.push(r);return r;}});
  return {ui,plays,results,get state(){return state;},get projection(){return projection;},prepare(hides,items){for(const id of hides)state=action(state,{type:'SEARCH',id});for(const id of items)state=action(state,{type:'COLLECT',id});},click(label){const matches=host.all().filter(e=>e.tag==='button'&&(e.textContent===label||e.attrs['aria-label']===label));assert.equal(matches.length,1,label);const b=matches[0];assert.equal(b.disabled,false,`disabled: ${label}`);b.onclick();},cell(index){return host.all().filter(e=>e.tag==='button'&&e.attrs['aria-label']===`導電片 ${index+1}`)[0];},drag(index,slot){const source=this.cell(index),target=this.cell(slot),event={button:0,pointerId:1,clientX:0,clientY:0,preventDefault(){}};document.elementFromPoint=()=>target;source.onpointerdown(event);source.onpointermove({...event,clientX:20});source.onpointerup({...event,clientX:20});},button(label){return host.all().find(e=>e.tag==='button'&&e.textContent===label);},copies(){return host.all().map(e=>e.textContent).join('\n');}};
}
test('simplified board DOM keeps dates/transcripts visible without playing and supports wrong-order recovery',()=>{
  const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
  try{
    const f=fixture(3);f.ui.board();assert.equal(f.button('接通記憶總機').disabled,true);
    f.prepare(RECORDINGS.map(t=>HIDES[t.id]),RECORDINGS.map(t=>t.id));f.ui.board();
    for(const t of RECORDINGS){assert.ok(f.copies().includes(t.date));f.click('查看'+t.name);assert.ok(f.copies().includes(t.copy));}
    assert.equal(f.button('線路圖'),undefined);assert.equal(f.button('訊號旋鈕'),undefined);
    for(const i of [2,0,1,4,3]){f.click('查看'+RECORDINGS[i].name);f.click('排列'+RECORDINGS[i].name);}
    f.click('接通記憶總機');assert.equal(f.results.at(-1).ok,false);assert.match(f.copies(),/日期還沒有/);assert.equal(f.state.completed[3],false);
    for(const i of [2,0,1,4,3,0,1,2,3,4]){f.click('查看'+RECORDINGS[i].name);f.click('排列'+RECORDINGS[i].name);}
    f.click('接通記憶總機');assert.equal(f.state.completed[3],true);assert.deepEqual(f.plays,[]);for(const t of RECORDINGS)assert.equal(f.button('播放'+t.name),undefined);
  }finally{globalThis.document=old;}
});
test('lamp, circuit and projector DOM controls gate projection until the actual three branches are powered',()=>{
  const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
  try{
    const f=fixture(4);f.ui.projector();assert.equal(f.button('啟動記憶投影').disabled,true);f.prepare(['lamp-crate','linen-box','power-radio'],PARTS);
    for(const [i,name]of ['鎢絲燈泡','百褶燈罩','銅殼電池'].entries()){f.ui.lamp(i);f.click('裝上'+name);}
    f.ui.lamp(0);f.click('點亮過去的燈');assert.equal(f.results.at(-1).ok,false);
    f.ui.circuit();assert.equal(f.button('取消選取'),undefined);
    f.drag(0,1);f.drag(5,6);f.ui.circuit();const before=[...f.state.levels[4].circuit];
    for(const [cell,count]of [[3,3],[5,3],[7,3],[8,3],[9,3]])for(let n=0;n<count;n++)f.click('導電片 '+cell);
    assert.deepEqual(f.state.levels[4].circuit,before);
    assert.match(f.copies(),/已通電接口 3 \/ 3/);
    for(const [i,name]of ['過去','現在','未來'].entries()){f.ui.lamp(i);f.click('點亮'+name+'的燈');}
    f.ui.projector();assert.equal(f.button('啟動記憶投影').disabled,false);f.click('啟動記憶投影');assert.equal(f.projection,1);assert.equal(f.state.levels[4].projecting,true);assert.equal(f.state.completed[4],false);assert.equal(applyAction(f.state,{type:'MAIL'}).ok,false);
  }finally{globalThis.document=old;}
});

test('circuit DOM swaps only on a valid player drag, carries angles, and cancels outside or on itself',()=>{
 const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const f=fixture(4);f.ui.circuit();const initial=structuredClone(f.state.levels[4]);
  f.click('導電片 1');f.click('導電片 2');assert.deepEqual(f.state.levels[4].circuit,initial.circuit);
  const before=structuredClone(f.state.levels[4]);f.drag(0,1);assert.deepEqual(f.state.levels[4].circuit.slice(0,2),[0,1]);assert.deepEqual(f.state.levels[4].circuitAngles.slice(0,2),[before.circuitAngles[1],before.circuitAngles[0]]);
  f.ui.circuit();const stable=JSON.stringify(f.state);f.drag(2,2);assert.equal(JSON.stringify(f.state),stable);
  const cell=f.cell(4),event={button:0,clientX:0,clientY:0,preventDefault(){}};cell.onpointerdown(event);cell.onpointermove({...event,clientX:20});cell.onpointercancel();cell.onclick();assert.equal(JSON.stringify(f.state),stable);
 }finally{globalThis.document=old;}
});
