import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,saveGame,loadGame,applyAction,MEMORIES,SHADOW_TARGETS} from '../public/engine.mjs';
import {doubleClickPickup,interactionHint,doubleClickAction} from '../public/controls.mjs';
import {inventoryEntries,compactInventory} from '../public/inventory.mjs';
import {createThumbnailCache} from '../public/rendering.mjs';

test('inventory view never invents items and dropping a held object does not consume collected items',()=>{
  const state=newGame();assert.deepEqual(inventoryEntries(state),[]);
  state.level=1;state.inventory=['letter','drawing','letter'];const before=JSON.stringify(state);
  assert.deepEqual(inventoryEntries(state,'moon').map(e=>e.id),['letter','drawing']);
  assert.deepEqual(inventoryEntries(state).map(e=>e.id),['letter','drawing']);
  assert.equal(JSON.stringify(state),before);
});
test('restored memories keep their actual model index and the cross-stage letter',()=>{
  const state=newGame();state.completed[0]=true;state.unlocked=1;state.level=1;state.memories=['記起'];state.inventory=['letter'];state.letter=true;
  let raw;saveGame({setItem(k,v){raw=v;}},state);const restored=loadGame({getItem:()=>raw}).state;
  assert.deepEqual(inventoryEntries(restored).map(e=>[e.kind,e.name]),[['letter','未寄出的信']]);
  restored.level=3;restored.levels[3].flashlight=true;assert.ok(inventoryEntries(restored).some(e=>e.id==='flashlight'));
});
test('used corridor items hide but the archived letter returns only when needed in stage five',()=>{
  const state=newGame();state.level=1;state.inventory=['key','drawing','letter'];state.letter=true;
  state.levels[1].slots={key:'key',letter:'letter'};assert.deepEqual(inventoryEntries(state).map(e=>e.id),['drawing']);
  const before=JSON.stringify(state.inventory);state.level=2;assert.deepEqual(inventoryEntries(state),[]);state.level=3;assert.deepEqual(inventoryEntries(state),[]);
  state.level=4;state.memories=MEMORIES.slice(0,4);state.levels[4].sequence=[0,1];assert.deepEqual(inventoryEntries(state).map(e=>e.id),['letter','memory2','memory3']);
  state.levels[4].mailed=true;state.levels[4].projectionDone=true;assert.deepEqual(inventoryEntries(state),[]);assert.equal(JSON.stringify(state.inventory),before);
});
test('placed photo pieces hide, but taking back a wrong placement makes them available again',()=>{
  let state=newGame();state.level=2;state.levels[2].triggered=true;state.inventory=['letter','p0','p1'];
  state=applyAction(state,{type:'PHOTO',id:'p0',slot:4,angle:90}).state;
  assert.deepEqual(inventoryEntries(state).map(e=>e.id),['p1']);
  state=applyAction(state,{type:'REMOVE_PHOTO',id:'p0'}).state;assert.deepEqual(inventoryEntries(state).map(e=>e.id),['p0','p1']);
});
test('picked shadow props survive dropping and reloading, then hide when aligned',()=>{
  let state=newGame();assert.equal(applyAction(state,{type:'TAKE_SHADOW',index:0}).ok,false);
  state=applyAction(state,{type:'TRIGGER'}).state;state=applyAction(state,{type:'TAKE_SHADOW',index:0}).state;
  assert.equal(applyAction(state,{type:'TAKE_SHADOW',index:0}).ok,false);assert.deepEqual(inventoryEntries(state).map(e=>e.id),['moon']);
  state=loadGame({getItem:()=>JSON.stringify(state)}).state;assert.deepEqual(inventoryEntries(state).map(e=>e.id),['moon']);
  state=applyAction(state,{type:'SHADOW',index:0,...SHADOW_TARGETS[0]}).state;assert.deepEqual(inventoryEntries(state,'moon'),[]);
});
test('flashlight and completed-stage inventory hide after their purpose is finished',()=>{
  const state=newGame();state.level=3;state.levels[3].flashlight=true;assert.equal(inventoryEntries(state).length,1);
  state.levels[3].opticsUnlocked=true;assert.equal(inventoryEntries(state).length,0);state.level=1;state.inventory=['key'];state.completed[1]=true;assert.deepEqual(inventoryEntries(state),[]);
});
test('double-click picks only a fresh ray hit in exploration, using the same reticle with or without Pointer Lock',()=>{
  const canvas={getBoundingClientRect:()=>({left:20,top:30,width:200,height:100})};let calls=0,ray;
  const world={target(x,y){ray=[x,y];return {pickupAction(){calls++;}};}};
  const event={target:canvas,button:0,clientX:170,clientY:55};
  assert.equal(doubleClickPickup(event,{mode:'explore',canvas,world,locked:false}),true);assert.deepEqual(ray,[0,0]);
  doubleClickPickup(event,{mode:'explore',canvas,world,locked:true});assert.deepEqual(ray,[0,0]);
  for(const mode of ['panel','modal','title','projection','recovering'])assert.equal(doubleClickPickup(event,{mode,canvas,world}),false);
  assert.equal(doubleClickPickup({...event,target:{}},{mode:'explore',canvas,world}),false);
  assert.equal(doubleClickPickup({...event,button:2},{mode:'explore',canvas,world}),false);assert.equal(calls,2);
  world.target=()=>null;assert.equal(doubleClickPickup(event,{mode:'explore',canvas,world}),false);
  world.target=()=>({action(){calls++;}});assert.equal(doubleClickPickup(event,{mode:'explore',canvas,world}),true);assert.equal(calls,3);
});
test('hidden mouse clicks use the visible center reticle even when the cursor is off-center',()=>{
  const canvas={getBoundingClientRect:()=>({left:0,top:0,width:1366,height:768})};let opened=0;
  const world={target:(x,y)=>x===0&&y===0?{action(){opened++;}}:null};
  assert.equal(doubleClickPickup({target:canvas,button:0,clientX:150,clientY:600},{mode:'explore',canvas,world,locked:false}),true);
  assert.equal(opened,1);
});

test('visible-cursor double-click uses the item under the cursor and still rejects UI or off-canvas hits',()=>{
  const canvas={getBoundingClientRect:()=>({left:20,top:30,width:200,height:100})};let ray,calls=0;
  const world={target(x,y){ray=[x,y];return {action(){calls++;}};}};
  const context={mode:'explore',canvas,world,aim:'cursor'},event={target:canvas,button:0,clientX:170,clientY:55};
  assert.equal(doubleClickPickup(event,context),true);assert.deepEqual(ray,[.5,.5]);assert.equal(calls,1);
  assert.equal(doubleClickPickup({...event,clientX:500},context),false);assert.equal(doubleClickPickup({...event,target:{}},context),false);assert.equal(calls,1);
});

test('double-click hints distinguish triggers, reading, and eligible pickups',()=>{
  const action=()=>{};
  for(const [key,guard,ready,done] of [['triggerAction','canTrigger','','已觸發'],['readAction','canRead','雙擊閱讀','已閱讀'],['pickupAction','canPickup','雙擊拿取','']]){
    let eligible=true;const target={[key]:action,[guard]:()=>eligible};
    assert.equal(interactionHint(target),ready);assert.equal(doubleClickAction(target),action);
    eligible=false;assert.equal(interactionHint(target),done);assert.equal(doubleClickAction(target),null);
  }
  assert.equal(interactionHint({action}), '');assert.equal(doubleClickAction({action}),action);
  assert.equal(doubleClickAction({action,pickupAction:action,canPickup:()=>false}),null);
  assert.equal(doubleClickAction({action,triggerAction:action,canTrigger:()=>false}),null);
  assert.equal(interactionHint(null),'');assert.equal(doubleClickAction(null),null);
});

test('compact shelf keeps the selected old item visible without hiding it behind newer memories',()=>{
  const entries=Array.from({length:16},(_,i)=>({id:String(i)}));
  const shown=compactInventory(entries,'0');assert.equal(shown.length,6);assert.equal(shown[0].id,'0');assert.equal(new Set(shown.map(e=>e.id)).size,6);
  assert.deepEqual(compactInventory(entries,null).map(e=>e.id),['15','14','13','12','11','10']);
});
test('thumbnail snapshots cache once per kind and always release temporary models even on failure',()=>{
  let opens=0,renders=0,disposals=0,fail=false;
  const pool={open(){opens++;return {render(){renders++;if(fail)throw Error('lost');},canvas:{toDataURL:()=> 'data:image/png;base64,card'},dispose(){disposals++;}};},dispose(){}};
  const cache=createThumbnailCache(pool,{});for(let i=0;i<50;i++)cache.get('letter');
  assert.deepEqual([opens,renders,disposals],[1,1,1]);fail=true;assert.throws(()=>cache.get('key'));assert.equal(disposals,2);
  fail=false;cache.get('key');assert.equal(opens,3);assert.equal(disposals,3);
});
