import {CIRCUIT_PORTS} from './puzzles.mjs';
import * as T from './vendor/three.module.js';
const brass='#b99c64',dark='#283d3a',ivory='#d8c9aa';
export function createPuzzleModel(kind){
  if(!/^(tape-|map[0-3]$|plug[0-2]$|bulb$|shade$|battery$|switchboard$|circuitbox$|time-lamp[0-2]$)/.test(kind))return null;
  const g=new T.Group();g.userData.kind=kind;
  const part=(geo,color,pos,opts={})=>{const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.6,...opts}));m.position.set(...pos);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
  const box=(size,pos,c=dark,opts)=>part(new T.BoxGeometry(...size),c,pos,opts);
  const ball=(r,pos,c,opts)=>part(new T.SphereGeometry(r,20,12),c,pos,opts);
  const cyl=(r,h,pos,c=brass)=>part(new T.CylinderGeometry(r,r,h,24),c,pos);
  const wire=(points,color,r=.018)=>part(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),20,r,6,false),color,[0,0,0]);
  if(kind.startsWith('tape-')){
    box([.65,.1,.42],[0,.05,0],'#443f3a');box([.59,.02,.3],[0,.11,0],ivory);box([.35,.025,.12],[0,.125,0],'#302e2e');
    for(const x of [-.15,.15]){cyl(.075,.025,[x,.14,0],brass);cyl(.025,.03,[x,.16,0],dark);}
    for(const x of [-.26,.26])for(const z of [-.15,.15])cyl(.014,.025,[x,.125,z],brass);
    if(kind==='tape-family')wire([[-.3,.13,-.16],[0,.15,-.12],[.3,.13,-.16]],'#aa4d53',.012);
  }else if(kind.startsWith('map')){
    box([.45,.012,.36],[0,.006,0],ivory);const n=Number(kind.slice(-1));
    wire([[-.21,.018,-.12],[.04,.018,-.12],[.04,.018,.16]],'#617f72',.008);
    if(n%2)wire([[-.2,.018,.08],[.18,.018,.08]],brass,.008);else cyl(.04,.008,[-.1,.019,.07],dark);
  }else if(kind.startsWith('plug')){
    const n=Number(kind.slice(-1));cyl(.085,.18,[0,.14,0],['#c49d70','#87ac9e','#ac96c1'][n]);cyl(.032,.12,[0,.29,0],brass);
    wire([[0,.05,0],[.14,.02,.05],[.28,.02,0]],dark,.025);
  }else if(kind==='bulb'){
    cyl(.095,.18,[0,.09,0]);ball(.17,[0,.32,0],'#e7d9b2',{transparent:true,opacity:.7});wire([[-.04,.18,0],[-.04,.35,0],[.04,.35,0],[.04,.18,0]],brass,.007);
  }else if(kind==='shade'){
    const shade=part(new T.CylinderGeometry(.17,.34,.4,48,1,true),'#d9b9b3',[0,.23,0],{side:T.DoubleSide});
    for(let n=0;n<16;n++){const a=n*Math.PI/8;wire([[Math.sin(a)*.17,.43,Math.cos(a)*.17],[Math.sin(a)*.34,.03,Math.cos(a)*.34]],ivory,.006);}
    cyl(.17,.025,[0,.43,0]);
  }else if(kind==='battery'){
    box([.28,.46,.2],[0,.23,0],'#a88f65');box([.29,.09,.21],[0,.415,0],dark);cyl(.035,.04,[-.07,.48,0]);cyl(.025,.04,[.07,.48,0]);
  }else if(kind.startsWith('time-lamp')){
    const n=Number(kind.slice(-1));cyl(.32,.09,[0,.045,0]);cyl(.045,1.08,[0,.63,0]);cyl(.13,.14,[0,1.21,0],dark);
    const lamp=ball(.19,[0,1.48,0],'#eed5a6',{emissive:'#f5c56d',emissiveIntensity:0});lamp.name='lamp-glow';
    const shade=part(new T.CylinderGeometry(.23,.44,.42,32,1,true),['#e5bfbd','#bdcfbc','#b7c4dc'][n],[0,1.51,0],{side:T.DoubleSide});shade.name='lamp-shade';
    for(let j=0;j<n+1;j++)cyl(.04,.015,[(j-n/2)*.12,.1,.17],dark);if(n===2){box([.19,.06,.19],[.2,.12,0],dark);const battery=box([.12,.23,.12],[.2,.205,0],brass);battery.name='lamp-battery';}
  }else if(kind==='switchboard'){
    box([2,.12,.9],[0,.06,0],brass);box([1.94,.55,.38],[0,.37,-.24],dark);box([1.82,.45,.035],[0,.4,-.035],ivory);
    for(let n=0;n<3;n++){
      const x=(n-1)*.56,socket=part(new T.TorusGeometry(.07,.024,8,20),brass,[x,.44,0]);ball(.047,[x,.44,-.008],'#192c2a');
      const knob=cyl(.1,.07,[x,.16,.22],dark);const marker=box([.018,.025,.07],[x,.205,.24],ivory);marker.name=`signal-marker${n}`;knob.name=`signal-knob${n}`;
      const cable=wire([[x,.12,.35],[x-.1,.13,.03],[x,.44,.03]],['#c49d70','#87ac9e','#ac96c1'][n]);cable.name=`board-wire${n}`;
      const lamp=ball(.035,[x,.6,.005],'#c3ad7b',{emissive:'#e3b96c',emissiveIntensity:0});lamp.name=`board-light${n}`;
    }
    wire([[-.8,.15,.3],[-.9,.3,.2],[-.5,.23,.3],[.5,.23,.3],[.8,.15,.3]],'#373331',.055);
  }else if(kind==='circuitbox'){
    box([1.35,1.4,.2],[0,.7,0],dark);box([1.2,1.22,.04],[0,.7,.12],'#b6af96');
    for(let id=0;id<9;id++){
      const tile=new T.Group();tile.name=`circuit-tile${id}`;tile.position.set((id%3-1)*.35,1.05-Math.floor(id/3)*.35,.16);g.add(tile);
      const plate=new T.Mesh(new T.BoxGeometry(.29,.29,.04),new T.MeshStandardMaterial({color:'#697e73'}));tile.add(plate);plate.castShadow=plate.receiveShadow=true;
      for(const port of CIRCUIT_PORTS[id]){const bar=new T.Mesh(new T.BoxGeometry(.04,.2,.025),new T.MeshStandardMaterial({color:brass,emissive:'#000'}));bar.name='copper';bar.position.set([0,.075,0,-.075][port],[.075,0,-.075,0][port],.035);bar.rotation.z=port*Math.PI/2;tile.add(bar);bar.castShadow=bar.receiveShadow=true;}
    }
    for(const x of [-.6,.6])for(const y of [.09,1.31])ball(.022,[x,y,.15],brass);
  }
  return g;
}
