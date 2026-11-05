import {createFinaleLayouts} from './finale-layout.mjs';
export const FAMILY_PHOTOS={birthday:{url:'assets/dreamcore/family-birthday-v4.png',caption:'生日那天，我答應會一直陪著她。'},park:{url:'assets/dreamcore/family-park-v4.png',caption:'放學之後，我曾經牽著她一起回家。'},bedtime:{url:'assets/dreamcore/family-bedtime-v4.png',caption:'睡前的故事，曾經是我們每天的約定。'}};
// Distance checkpoints are shared by the hall, save migration and presentation.
export const FINAL_HALL={startZ:7,mailboxZ:-45,minZ:-48,maxZ:9,halfWidth:2.4};
export const FINAL_ECHOES=[
  {distance:7,copy:'爸爸，我好想你。',detail:'放學的路上，我一直留著你的位子。',eyes:true,photo:'park'},
  {distance:17,copy:'你說好，今天會回家的。',detail:'生日的蠟燭熄了，門還是沒有打開。',eyes:false,photo:'birthday'},
  {distance:27,copy:'那天的合照，少了一個人。',detail:'不是照片少了你，是你一次次缺席。',eyes:true,photo:'birthday'},
  {distance:37,copy:'我還在等你的電話。',detail:'那些沒接起的聲音，原來從來沒有離開。',eyes:true,photo:'bedtime'},
  {distance:46,copy:'這次，別再把信收起來。',detail:'我是爸爸。我願意面對，也願意接受幫助。',eyes:false,photo:'bedtime'}
];
export const echoCheckpoint=seen=>seen.length?FINAL_ECHOES[seen.at(-1)].distance:0;
export const nextEcho=(distance,seen)=>seen.length<FINAL_ECHOES.length&&distance>=FINAL_ECHOES[seen.length].distance?seen.length:null;
export function createFinalePlayback({random=Math.random}={}){
  let active=null,remaining=0,layouts=createFinaleLayouts(random);
  return {arrangement(index){return layouts[index];},reset(){active=null;remaining=0;layouts=createFinaleLayouts(random,layouts[0].id);},step({distance,seen,dt,running}){
    if(!running)return {active,remaining,trigger:null};
    remaining=Math.max(0,remaining-Math.max(0,Math.min(dt,1)));if(!remaining)active=null;
    const trigger=active===null?nextEcho(distance,seen):null;
    if(trigger!==null){active=trigger;remaining=3;}
    return {active,remaining,trigger};
  }};
}
