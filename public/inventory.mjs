import {RECORDINGS,PARTS} from './puzzles.mjs';
import {ITEMS,MEMORIES,SHADOW_TARGETS,shadowAligned,PHOTO_IDS} from './engine.mjs';

const HANDHELD={moon:'月亮燈',rabbit:'兔子玩偶',vase:'花瓶'};
// Derive the display from the saved game; never grant or consume quest items here.
export function inventoryEntries(state,held=null){
  const level=state.level,l=state.levels[level],entries=[];
  if(state.completed[level])return entries;
  const remaining=id=>level===1?['key','drawing','letter'].includes(id)&&l.slots[id]!==id:level===2?PHOTO_IDS.includes(id)&&!l.photos.some(p=>p?.id===id):level===3?RECORDINGS.some(t=>t.id===id)&&!l.switchboardOn:level===4?(id==='letter'&&!l.mailed||PARTS.includes(id)&&!l.installed[PARTS.indexOf(id)]):false;
  for(const id of new Set(state.inventory.filter(remaining)))entries.push({id,kind:id,name:ITEMS[id],category:'道具',note:id==='letter'?'本關仍需使用的信件':'本關待使用道具'});

  if(level===0)for(const [i,id] of Object.keys(HANDHELD).entries())if((l.collected.includes(id)||held===id)&&!shadowAligned(l.shadow[i],SHADOW_TARGETS[i]))entries.push({id,kind:id,name:HANDHELD[id],category:'道具',note:''});

  return entries;
}

export function compactInventory(entries,held,limit=6){
  const recent=[...entries].reverse(),active=entries.find(e=>e.id===held);
  return (active?[active,...recent.filter(e=>e.id!==held)]:recent).slice(0,limit);
}
