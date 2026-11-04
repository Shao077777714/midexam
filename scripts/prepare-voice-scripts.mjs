import {writeFile,mkdir} from 'node:fs/promises';
import {LEVELS,PROJECTION} from '../public/content.mjs';
import {RECORDINGS} from '../public/puzzles.mjs';
const endings=['你在現實中醒來。窗外，不再是停留不動的黃昏。手機裡有幾封未讀訊息。這一次，你沒有再把它翻面。','你決定聯絡可信任的人，尋求專業協助。家人不會因此立刻回到身邊。過去造成的傷害，也不會瞬間消失。但你終於願意，為自己的生活踏出第一步。','醒來，不代表一切都能立刻回到從前；而是你終於願意面對明天。'];
const records=RECORDINGS.map(t=>t.date.replace(' · ','，')+'。'+t.copy.replace(/^(主管|家人|孩子|我（爸爸）)：/,''));
const clips=[...records.map((text,i)=>({id:`record-${i}`,text})),{id:'record-all',text:records.join('　')},{id:'projection',text:PROJECTION.join('　')},...endings.map((text,i)=>({id:`ending-${i}`,text})),...LEVELS.map((v,i)=>({id:`memory-${i}`,text:v.story})),...PROJECTION.map((text,i)=>({id:`projection-${i}`,text}))];
await mkdir('public/assets/audio/voice-v2',{recursive:true});
await writeFile('public/assets/audio/voice-v2/scripts.json',JSON.stringify({generator:'edge-tts',voice:'zh-TW-YunJheNeural',rate:'-7%',pitch:'+0Hz',language:'zh-TW',identity:'虛構爸爸／回憶旁白，非真人錄音，非ChatGPT聲音複製',clips},null,2)+'\n');
