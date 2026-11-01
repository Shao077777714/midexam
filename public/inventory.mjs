import {ITEMS,MEMORIES,SHADOW_TARGETS,shadowAligned,PHOTO_IDS} from './engine.mjs';

const HANDHELD={moon:'月亮燈',rabbit:'兔子玩偶',vase:'花瓶'};
// Derive the display from the saved game; never grant or consume quest items here.
export function inventoryEntries(state,held=null){
  const level=state.level,l=state.levels[level],entries=[];
  if(state.completed[level])return entries;
  const remaining=id=>level===1?['key','drawing','letter'].includes(id)&&l.slots[id]!==id:level===2?PHOTO_IDS.includes(id)&&!l.photos.some(p=>p?.id===id):level===4?id==='letter'&&!l.mailed:false;
  for(const id of new Set(state.inventory.filter(remaining)))entries.push({id,kind:id,name:ITEMS[id],category:'道具',note:id==='letter'?'本關仍需使用的信件':'本關待使用道具'});
  if(level===3&&l.flashlight&&!l.opticsUnlocked)entries.push({id:'flashlight',kind:'flashlight',name:'手電筒',category:'道具',note:'用來調整鏡房光線'});
  if(level===0)for(const [i,id] of Object.keys(HANDHELD).entries())if((l.collected.includes(id)||held===id)&&!shadowAligned(l.shadow[i],SHADOW_TARGETS[i]))entries.push({id,kind:id,name:HANDHELD[id],category:'道具',note:'按 R 調整位置與影子'});
  if(level===4&&!l.projectionDone)for(const name of state.memories){const i=MEMORIES.indexOf(name);if(i>=0&&i<4&&!l.sequence.includes(i))entries.push({id:`memory${i}`,kind:`memory${i}`,name:`記憶 · ${name}`,category:'記憶',note:'本關尚未放入裝置的碎片'});}
  return entries;
}

export function compactInventory(entries,held,limit=6){
  const recent=[...entries].reverse(),active=entries.find(e=>e.id===held);
  return (active?[active,...recent.filter(e=>e.id!==held)]:recent).slice(0,limit);
}
