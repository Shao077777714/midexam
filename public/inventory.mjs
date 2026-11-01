import {ITEMS,MEMORIES} from './engine.mjs';

const HANDHELD={moon:'月亮燈',rabbit:'兔子玩偶',vase:'花瓶'};
// Derive the display from the saved game; never grant or consume quest items here.
export function inventoryEntries(state,held=null){
  const entries=[...new Set(state.inventory)].map(id=>({id,kind:id,name:ITEMS[id],category:'道具',note:id==='letter'?'跨關道具 · 保留至最後':'靠近對應機關後按 E 使用'}));
  if(state.level===3&&state.levels[3].flashlight)entries.push({id:'flashlight',kind:'flashlight',name:'手電筒',category:'道具',note:'用來調整鏡房光線'});
  if(HANDHELD[held])entries.push({id:held,kind:held,name:HANDHELD[held],category:'道具',note:'目前操作中的場景物件'});
  for(const name of state.memories){const i=MEMORIES.indexOf(name);if(i>=0)entries.push({id:`memory${i}`,kind:`memory${i}`,name:`記憶 · ${name}`,category:'記憶',note:i===4?'你已踏出改變的第一步':'第五關的記憶投影碎片'});}
  return entries;
}

export function compactInventory(entries,held,limit=6){
  const recent=[...entries].reverse(),active=entries.find(e=>e.id===held);
  return (active?[active,...recent.filter(e=>e.id!==held)]:recent).slice(0,limit);
}
