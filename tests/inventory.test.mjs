import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,saveGame,loadGame} from '../public/engine.mjs';
import {inventoryEntries,compactInventory} from '../public/inventory.mjs';
import {createThumbnailCache} from '../public/rendering.mjs';

test('inventory view never invents items and dropping a held object does not consume collected items',()=>{
  const state=newGame();assert.deepEqual(inventoryEntries(state),[]);
  state.inventory=['letter','drawing','letter'];const before=JSON.stringify(state);
  assert.deepEqual(inventoryEntries(state,'moon').map(e=>e.id),['letter','drawing','moon']);
  assert.deepEqual(inventoryEntries(state).map(e=>e.id),['letter','drawing']);
  assert.equal(JSON.stringify(state),before);
});
test('restored memories keep their actual model index and the cross-stage letter',()=>{
  const state=newGame();state.completed[0]=true;state.unlocked=1;state.level=1;state.memories=['記起'];state.inventory=['letter'];state.letter=true;
  let raw;saveGame({setItem(k,v){raw=v;}},state);const restored=loadGame({getItem:()=>raw}).state;
  assert.deepEqual(inventoryEntries(restored).map(e=>[e.kind,e.name]),[['letter','未寄出的信'],['memory0','記憶 · 記起']]);
  restored.level=3;restored.levels[3].flashlight=true;assert.ok(inventoryEntries(restored).some(e=>e.id==='flashlight'));
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
