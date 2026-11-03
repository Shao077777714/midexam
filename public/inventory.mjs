import {RECORDINGS,PARTS} from './puzzles.mjs';
import {ITEMS,MEMORIES,SHADOW_TARGETS,shadowAligned,PHOTO_IDS} from './engine.mjs';

const HANDHELD={moon:'月亮燈',rabbit:'兔子玩偶',vase:'花瓶'};
// Derive the display from the saved game; never grant or consume quest items here.
export function inventoryEntries(state,held=null){
  const level=state.level,l=state.levels[level],entries=[];
  const remaining=id=>level===1?['key','drawing','letter'].includes(id):level===2?PHOTO_IDS.includes(id):level===3?RECORDINGS.some(t=>t.id===id):level===4?(id==='letter'||PARTS.includes(id)):level===5?id==='letter':false;
  for(const id of new Set(state.inventory.filter(remaining))){
    const used=level===1?l.slots[id]===id:level===2?l.photos.some(p=>p?.id===id):level===3?l.switchboardOn:level===4?id!=='letter'&&l.installed[PARTS.indexOf(id)]:level===5&&l.mailed;
    entries.push({id,kind:id,name:ITEMS[id],category:'道具',used,note:used?(level===3?'已聽見':level===4?'已安裝':level===5?'已寄出':'已放置'):'可使用／檢視'});
  }

  if(level===0)for(const [i,id] of Object.keys(HANDHELD).entries())if((l.collected.includes(id)||held===id)&&!shadowAligned(l.shadow[i],SHADOW_TARGETS[i]))entries.push({id,kind:id,name:HANDHELD[id],category:'道具',note:''});

  return entries;
}

export function compactInventory(entries,held,limit=6){
  const recent=[...entries].reverse(),active=entries.find(e=>e.id===held);
  return (active?[active,...recent.filter(e=>e.id!==held)]:recent).slice(0,limit);
}
