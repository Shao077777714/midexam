// Voice gender is not exposed by Web Speech. Prefer explicit male names only;
// never infer that a voice is male merely because its pitch has been lowered.
const maleName=/\b(David|Mark|Daniel|Paul|Alex|YunJhe|Yunxi|Yunyang|Kangkang|Zhiwei)\b|男聲|男性/i;
export const isMaleVoice=v=>Boolean(v&&maleName.test(v.name));
export function chooseVoice(voices,preferredURI=''){
  const preferred=voices.find(v=>v.voiceURI===preferredURI);if(preferred)return preferred;
  const chinese=voices.filter(v=>/^zh(?:-|_)/i.test(v.lang));
  const score=v=>(isMaleVoice(v)?200:0)+(/zh[-_]TW/i.test(v.lang)?60:30)+(v.localService?5:0);
  return chinese.sort((a,b)=>score(b)-score(a))[0]||null;
}
export function voiceDescription(voice){
  if(!voice)return '沒有可用的中文聲線。將保留完整字幕；可等待聲線載入或自行選擇。';
  return `${voice.name} · ${voice.lang}。${isMaleVoice(voice)?'優先採用名稱可辨識的男性聲線，低沉語速。':'未辨識到男性聲線標示；目前採用此聲線並降低音高，可自行更換或關閉。'}`;
}
