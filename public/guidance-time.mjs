export const initialGuidance=()=>({goalId:'',seconds:0,tier:0,bestProgress:0});
export const hintTier=seconds=>seconds<60?0:Math.min(5,1+Math.floor((seconds-60)/30));
export function tickGuidance(previous,goal,dt,running){
 const progress=goal.progress||0,advanced=progress>previous.bestProgress;
 const g={...previous,goalId:goal.id,bestProgress:Math.max(previous.bestProgress,progress)};
 if(advanced){g.seconds=0;g.tier=0;}
 if(running)g.seconds+=Math.max(0,Math.min(dt,1));g.tier=hintTier(g.seconds);return g;
}
