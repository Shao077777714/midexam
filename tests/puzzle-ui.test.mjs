// DOM adapter integration tests; these do not replace real browser rendering checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPuzzleUI} from '../public/puzzle-ui.mjs';
import {newGame,applyAction,MEMORIES} from '../public/engine.mjs';
import {BOARD_ITEMS,PARTS} from '../public/puzzles.mjs';
import {action} from './puzzle-helpers.mjs';
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.textContent='';this.disabled=false;this.classList={add(){},toggle(){}};}
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
  return {ui,plays,results,get state(){return state;},get projection(){return projection;},prepare(hides,items){for(const id of hides)state=action(state,{type:'SEARCH',id});for(const id of items)state=action(state,{type:'COLLECT',id});},click(label){const matches=host.all().filter(e=>e.tag==='button'&&(e.textContent===label||e.attrs['aria-label']===label));assert.equal(matches.length,1,label);const b=matches[0];assert.equal(b.disabled,false,`disabled: ${label}`);b.onclick();},button(label){return host.all().find(e=>e.tag==='button'&&e.textContent===label);},copies(){return host.all().map(e=>e.textContent).join('\n');}};
}
test('switchboard DOM controls complete the new puzzle and identify the distorted recording',()=>{
  const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
  try{
    const f=fixture(3);f.prepare(['work-panel','family-phone','mirror-recess'],BOARD_ITEMS);f.ui.board();
    for(const name of ['磨損的錄音帶','纏著紅線的錄音帶','裂殼的錄音帶']){f.click('播放'+name);f.click('排列'+name);}assert.match(f.copies(),/三月十五日/);assert.match(f.copies(),/敲擊節奏/);
    f.click('線路圖');assert.equal(f.button('↶ 旋轉選取圖紙').disabled,true);
    for(const [name,turns,dir,slot]of [['D',1,'↶ 旋轉選取圖紙',1],['A',1,'旋轉選取圖紙 ↷',2],['C',2,'旋轉選取圖紙 ↷',3],['B',1,'↶ 旋轉選取圖紙',4]]){f.click('選取線路圖碎片 '+name);for(let n=0;n<turns;n++)f.click(dir);f.click('圖紙格 '+slot+' 空位');}
    f.click('接線面板');for(const label of ['工作線接到 ◇','家庭線接到 △','自己線接到 ○'])f.click(label);f.click('訊號旋鈕');
    f.click('接通記憶總機');assert.equal(f.results.at(-1).ok,false);assert.deepEqual(f.plays.at(-1),[0,true]);assert.equal(f.state.completed[3],false);
    for(const [name,count]of [['工作',1],['家庭',3],['自己',2]])for(let n=0;n<count;n++)f.click(name+'訊號 ＋');
    f.click('接通記憶總機');assert.equal(f.state.completed[3],true);assert.deepEqual(f.plays.at(-1),['all',false]);
  }finally{globalThis.document=old;}
});
test('lamp, circuit and projector DOM controls gate projection until the actual three branches are powered',()=>{
  const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
  try{
    const f=fixture(4);f.ui.projector();assert.equal(f.button('啟動記憶投影').disabled,true);f.prepare(['lamp-crate','linen-box','power-radio'],PARTS);
    for(const [i,name]of ['鎢絲燈泡','百褶燈罩','銅殼電池'].entries()){f.ui.lamp(i);f.click('裝上'+name);}
    f.ui.lamp(0);f.click('點亮過去的燈');assert.equal(f.results.at(-1).ok,false);
    f.ui.circuit();assert.equal(f.button('↻ 旋轉選取導電片').disabled,true);f.click('導電片 1');f.click('導電片 2');f.click('導電片 6');f.click('導電片 7');
    // After the two swaps, rotate all vertical straight tracks and the lower elbow.
    for(const [cell,count]of [[2,3],[3,3],[5,3],[7,3],[8,3],[9,3]]){f.click('導電片 '+cell);for(let n=0;n<count;n++)f.click('↻ 旋轉選取導電片');f.click('取消選取');}
    assert.match(f.copies(),/已通電接口 3 \/ 3/);
    for(const [i,name]of ['過去','現在','未來'].entries()){f.ui.lamp(i);f.click('點亮'+name+'的燈');}
    f.ui.projector();assert.equal(f.button('啟動記憶投影').disabled,false);f.click('啟動記憶投影');assert.equal(f.projection,1);assert.equal(f.state.levels[4].projecting,true);assert.equal(f.state.completed[4],false);assert.equal(applyAction(f.state,{type:'MAIL'}).ok,false);
  }finally{globalThis.document=old;}
});
