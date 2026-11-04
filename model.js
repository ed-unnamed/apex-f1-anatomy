import * as T from 'three';
import {DecalGeometry} from './vendor/DecalGeometry.js';
// Original 2026-inspired educational geometry; metres, nose at negative X.
export function buildCar(){
const car=new T.Group(),groups={},pickables=[],activeFlaps=[];
const mat=(color,metalness=0,roughness=.4)=>new T.MeshPhysicalMaterial({color,metalness,roughness});
const paint=mat('#101419',.68,.23);paint.clearcoat=1;paint.clearcoatRoughness=.10;
const gold=mat('#b99755',.82,.25);gold.clearcoat=.8;gold.clearcoatRoughness=.17;
const satin=mat('#252a28',.78,.39),metal=mat('#909794',.95,.25),dark=mat('#090d0b',.0,.72),rubber=mat('#191c1b',.02,.82),red=mat('#a93220',.5,.33),ivory=mat('#deded0',.3,.37);
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t}
const weave=canvasTexture(256,256,c=>{c.fillStyle='#343936';c.fillRect(0,0,256,256);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const bright=((x+y)%4<2);c.fillStyle=bright?'#535a55':'#272d2a';c.fillRect(x*4,y*4,bright?3:4,bright?4:3)}});weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(10,6);const carbon=mat('#444b4c',.48,.42);carbon.map=weave;carbon.clearcoat=.45;carbon.clearcoatRoughness=.3;
const cross=canvasTexture(256,256,c=>{c.fillStyle='#a8adb1';c.fillRect(0,0,256,256);for(const sign of [-1,1])for(let i=-512;i<640;i+=64){c.strokeStyle=sign>0?'#e3e5e6':'#bfc4c8';c.lineWidth=9;c.beginPath();c.moveTo(i,0);c.lineTo(i+sign*256,256);c.stroke()}});cross.wrapS=cross.wrapT=T.RepeatWrapping;cross.repeat.set(3,2);paint.color.set('#252b31');paint.map=cross;gold.map=cross;
let seed=127;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const noise=canvasTexture(256,256,c=>{c.fillStyle='#888';c.fillRect(0,0,256,256);for(let i=0;i<18000;i++){let v=100+Math.floor(rand()*70);c.fillStyle=`rgb(${v},${v},${v})`;c.fillRect(rand()*256,rand()*256,1,1)}});noise.colorSpace=T.NoColorSpace;noise.wrapS=noise.wrapT=T.RepeatWrapping;noise.repeat.set(6,3);rubber.bumpMap=noise;rubber.bumpScale=.0008;rubber.roughnessMap=noise;
for(const id of ['front','nose','tyres','suspension','halo','cockpit','sidepods','airbox','engine','floor','diffuser','rear']){let g=new T.Group();g.userData.id=id;groups[id]=g;car.add(g)}
function mesh(id,geo,material,pos=[0,0,0],rotation){const m=new T.Mesh(geo,material);m.position.set(...pos);if(rotation)m.rotation.set(...rotation);m.castShadow=m.receiveShadow=true;m.userData.part=id;groups[id].add(m);pickables.push(m);return m}
function box(id,w,h,d,material,pos,rot){return mesh(id,new T.BoxGeometry(w,h,d),material,pos,rot)}
function tube(id,pts,r,material=carbon){return mesh(id,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),pts.length*12,r,10,false),material)}
function rod(id,a,b,r,material=carbon,flat=1){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);let m=mesh(id,new T.CylinderGeometry(r,r,v.length(),12),material,p.clone().add(q).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());m.scale.z=flat;return m}
function sheet(id,pts,thick,material){let shape=new T.Shape();pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return mesh(id,new T.ExtrudeGeometry(shape,{depth:thick,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.004,bevelThickness:.003,curveSegments:32}),material,[0,0,-thick/2])}
function geo(verts,indices,uvs){let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));if(uvs)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g}
// Smooth Hermite interpolation removes visible segment changes in the body silhouette.
function interp(secs,t){let f=t*(secs.length-1),i=Math.min(secs.length-2,Math.floor(f)),u=f-i;return secs[0].map((_,k)=>{let p0=secs[Math.max(0,i-1)][k],p1=secs[i][k],p2=secs[i+1][k],p3=secs[Math.min(secs.length-1,i+2)][k];return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)})}
function loft(id,sections,material,side=0,squareness=1){const N=64,L=sections.length*8,verts=[],ind=[],uv=[];for(let i=0;i<=L;i++){let [x,y,w,h,offset=side]=interp(sections,i/L);for(let j=0;j<=N;j++){let a=j/N*Math.PI*2;let cz=Math.cos(a),sy=Math.sin(a);verts.push(x,y+Math.sign(sy)*Math.abs(sy)**squareness*Math.max(.001,h),offset+Math.sign(cz)*Math.abs(cz)**squareness*Math.max(.001,w));uv.push(i/L,j/N)}}for(let i=0;i<L;i++)for(let j=0;j<N;j++){let a=i*(N+1)+j,b=a+1,d=a+N+1,c=d+1;ind.push(a,d,b,b,d,c)}for(let j=1;j<N-1;j++){ind.push(0,j,j+1);let a=L*(N+1);ind.push(a,a+j+1,a+j)}return mesh(id,geo(verts,ind,uv),material)}
function wing(id,x,y,span,chord,material,sweep=.05,rise=.0){const verts=[],ind=[],uv=[],N=80,M=32;for(let j=0;j<=N;j++){let z=(j/N-.5)*span,e=Math.abs(z)/(span/2);for(let i=0;i<=M;i++){let a=i/M*Math.PI*2,f=(1-Math.cos(a))*.5,localChord=chord*(1-.14*e**3);verts.push(x+f*localChord+sweep*e**2,y+(id==='front'?.075*Math.sin(e*Math.PI*.94)**2-.018*(1-e)**2:0)+.11*chord*Math.sin(f*Math.PI)+.06*chord*Math.sin(a)+rise*e**4,z);uv.push(j/N,i/M)}}for(let j=0;j<N;j++)for(let i=0;i<M;i++){let a=j*(M+1)+i;ind.push(a,a+M+1,a+1,a+1,a+M+1,a+M+2)}return mesh(id,geo(verts,ind,uv),material)}
function addFlap(m,pivotPoint,angle){let pivot=new T.Group();pivot.position.set(...pivotPoint);groups[m.userData.part].add(pivot);pivot.attach(m);activeFlaps.push({pivot,angle});return pivot}
function textTexture(text,color='#d4b477'){return canvasTexture(2048,512,c=>{c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=text==='IWC'?'bold 350px Georgia':text==='SCHAFFHAUSEN'?'240px Georgia':text==='TOMMY HILFIGER'?'260px Arial':text==='Expensify'?'bold 310px Arial':text==='SharkNINJA'?'bold 300px Arial':text==='AMG'?'italic 700 310px Arial':'700 310px Arial';c.translate(1024,266);c.scale(1.10,1.16);c.fillText(text,0,0,1830)})}
function decal(target,text,pos,size,rotation,color){const texture=textTexture(text,color);return projectDecal(target,texture,pos,size,rotation)}
function projectDecal(target,texture,pos,size,rotation){target.updateWorldMatrix(true,false);let d=new T.Mesh(new DecalGeometry(target,new T.Vector3(...pos),new T.Euler(...rotation),new T.Vector3(...size)),new T.MeshPhysicalMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,roughness:.38,metalness:.25}));d.userData.part=target.userData.part;d.userData.decal={position:pos,rotation,size};groups[target.userData.part].add(d);pickables.push(d);return d}
// A full rectangular UV patch follows the body; unlike a clipped projector it retains every letter.
function surfaceText(target,text,cx,cy,width,height,side,color='#f5f4ed'){
 target.updateWorldMatrix(true,false);let source=target.geometry;if(target.userData.part==='engine'){const positions=[],indices=[];for(const m of [target,...groups.sidepods.children.filter(o=>o.name==='sidepod-chassis-shoulder')]){const offset=positions.length/3;for(const v of m.geometry.attributes.position.array)positions.push(v);for(const k of m.geometry.index.array)indices.push(offset+k)}source=geo(positions,indices)}const pa=source.attributes.position,selected=[];const ids=source.index.array;for(let i=0;i<ids.length;i+=3){const tri=[ids[i],ids[i+1],ids[i+2]];if(Math.max(...tri.map(k=>pa.getX(k)))>=cx-width/2&&Math.min(...tri.map(k=>pa.getX(k)))<=cx+width/2&&Math.max(...tri.map(k=>pa.getY(k)))>=cy-height/2&&Math.min(...tri.map(k=>pa.getY(k)))<=cy+height/2)selected.push(...tri)}
 const patch=source.clone();patch.setIndex(selected);const probe=new T.Mesh(patch,target.material);probe.matrixWorld.copy(target.matrixWorld);const ray=new T.Raycaster(),NX=40,NY=10;let verts,uv,scale=1,complete=false;
 for(let attempt=0;attempt<6;attempt++){verts=[];uv=[];complete=true;for(let j=0;j<=NY&&complete;j++)for(let i=0;i<=NX;i++){const u=i/NX,v=j/NY,x=cx+side*(u-.5)*width*scale,y=cy+(v-.5)*height*scale;ray.set(new T.Vector3(x,y,side*2),new T.Vector3(0,0,-side));const hit=ray.intersectObject(probe,false)[0];if(!hit){complete=false;break}verts.push(hit.point.x,hit.point.y,hit.point.z+side*.0018);uv.push(u,v)}if(complete)break;scale*=.94}
 patch.dispose();if(!complete)return decal(target,text,[cx,cy,side*.22],[width,height,.5],[0,side===1?0:Math.PI,0],color);
 const index=[];for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const a=j*(NX+1)+i,b=a+1,c=a+NX+1;index.push(a,b,c,b,c+1,c)}
 const material=new T.MeshPhysicalMaterial({map:textTexture(text,color),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,roughness:.48,metalness:.08});const label=mesh(target.userData.part,geo(verts,index,uv),material);label.castShadow=false;label.name='surface-label-'+text;label.userData.surfaceLabel={text,complete:true,scale,width:width*scale,height:height*scale};return label;
}
// Each skin is a continuous curved surface, with an inset inner edge and a full flank.
function skin(id,sections,material,side,shape,openFront=false){const N=48,L=sections.length*10,verts=[],indices=[],uv=[];for(let i=0;i<=L;i++){const q=interp(sections,i/L),x=q[0];const contour=new T.CatmullRomCurve3(shape(q).map(([z,y])=>new T.Vector3(x,y,z)),true,'centripetal');for(let j=0;j<=N;j++){let v=contour.getPoint(j/N);verts.push(x,v.y,side*v.z);uv.push(i/L,j/N)}}for(let i=0;i<L;i++)for(let j=0;j<N;j++){let a=i*(N+1)+j,b=a+1,c=a+N+1,d=c+1;if(side>0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d)}for(let j=1;j<N-1;j++){let a=L*(N+1);if(side>0){if(!openFront)indices.push(0,j+1,j);indices.push(a,a+j,a+j+1)}else{if(!openFront)indices.push(0,j,j+1);indices.push(a,a+j+1,a+j)}}return mesh(id,geo(verts,indices,uv),material)}
function intake(id,outline,front,back,thickness,material){const N=96,verts=[],ind=[],uv=[];const curve=new T.CatmullRomCurve3(outline.map(([z,y])=>new T.Vector3(0,y,z)),true,'centripetal');const center=outline.reduce((v,p)=>v.add(new T.Vector2(...p)),new T.Vector2()).multiplyScalar(1/outline.length);for(let r=0;r<4;r++)for(let j=0;j<=N;j++){let v=curve.getPoint(j/N),inner=r===1||r===2;let dir=new T.Vector2(v.z-center.x,v.y-center.y).normalize();verts.push(r<2?front:back,v.y-(inner?dir.y*thickness:0),v.z-(inner?dir.x*thickness:0));uv.push(j/N,r/3)}for(let r=0;r<3;r++)for(let j=0;j<N;j++){let a=r*(N+1)+j,b=a+1,c=a+N+1,d=c+1;ind.push(a,c,b,b,c,d)}const m=material.clone();m.side=T.DoubleSide;mesh(id,geo(verts,ind,uv),m);const iv=[],ii=[];for(let j=0;j<N;j++){let v=curve.getPoint(j/N);iv.push(back+.004,v.y,v.z)}for(let j=1;j<N-1;j++)ii.push(0,j,j+1);let dm=dark.clone();dm.side=T.DoubleSide;mesh(id,geo(iv,ii),dm);return curve}
function spineStripe(target,sections){const N=sections.length*10,vs=[],ix=[];for(let i=0;i<=N;i++){const[x,y,w,h]=interp(sections,i/N);for(let side of [-1,1]){const z=side*Math.min(.035,w*.45),ny=Math.max(0,1-Math.abs(z/w)**(2/.82))**(.82/2);vs.push(x,y+h*ny+.0016,z)}}for(let i=0;i<N;i++){let a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}let g=gold.clone();g.side=T.DoubleSide;return mesh(target,geo(vs,ix),g)}
// One flowing monocoque: slender front, broad cockpit shoulders and a recessed survival cell.
const noseSections=[[-1.97,.395,.145,.112],[-1.65,.45,.151,.13],[-1.28,.474,.170,.158],[-.92,.482,.26,.174],[-.62,.477,.306,.195],[-.47,.44,.305,.155]];
const nose=loft('nose',noseSections,paint,0,.78);
// Gold upper tip stops at the suspension mounts, like the film car.
const goldNose=loft('nose',[[-2.615,.243,.077,.025],[-2.595,.247,.124,.043],[-2.54,.271,.140,.065],[-2.30,.33,.145,.09],[-1.97,.395,.145,.112]],gold,0,.78);
// Shared shell from cockpit to tail. One vertex/normal field crosses the ownership seam.
// x, cockpit opening half-width, ridge height, shoulder height, outer width, floor height.
const bodySections=[[-.75,.005,.655,.646,.28,.117],[-.57,.08,.69,.680,.317,.117],[-.32,.194,.719,.710,.354,.117],[.06,.219,.738,.729,.367,.117],[.35,.196,.79,.775,.349,.117],[.52,.125,.800,.765,.308,.117],[.66,0,.936,.714,.286,.117],[.84,0,.906,.655,.257,.117],[1.10,0,.801,.552,.211,.117],[1.37,0,.647,.441,.157,.117],[1.62,0,.485,.338,.110,.117],[1.84,0,.395,.298,.068,.155],[2.02,0,.333,.289,.028,.234]];
const bodyFront=[],bodyRear=[];
for(let side of [-1,1]){const N=72,L=bodySections.length*12,verts=[],indices=[],uv=[];let splitRow=0;for(let i=0;i<=L;i++){const[x,inner,top,shoulder,width,bottom]=interp(bodySections,i/L);if(x<=.52)splitRow=i;const z0=Math.max(0,inner),rim=z0>0.002;const points=[[z0,top-.012],[z0+(width-z0)*.26,top],[z0+(width-z0)*.65,shoulder],[width,shoulder-.065],[width*.99,bottom+(shoulder-bottom)*.30],[width-.018,bottom+.046],[width+.016,bottom+.002],[z0,bottom-.002],[z0,top-(rim?.15:.10)]];
const curve=new T.CatmullRomCurve3(points.map(([z,y])=>new T.Vector3(x,y,side*z)),true,'centripetal');for(let j=0;j<=N;j++){let v=curve.getPoint(j/N);verts.push(v.x,v.y,v.z);uv.push(i/L,j/N)}}for(let i=0;i<L;i++)for(let j=0;j<N;j++){let a=i*(N+1)+j,b=a+1,c=a+N+1,d=c+1;if(side>0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d)}const full=geo(verts,indices,uv),boundary=splitRow*N*6;for(let rear of [false,true]){const geometry=full.clone();geometry.setIndex(indices.slice(rear?boundary:0,rear?undefined:boundary));const m=mesh(rear?'engine':'nose',geometry,paint);m.name=rear?'continuous-engine-shell':'continuous-chassis-shell';m.userData.bodySeam={row:splitRow,stride:N+1,side};(rear?bodyRear:bodyFront).push(m)}full.dispose();
tube('nose',[[-.56,.682,side*.10],[-.31,.719,side*.201],[.04,.741,side*.222],[.33,.791,side*.202],[.52,.825,side*.13]],.0025,satin)}
// A curved central keel descends from the raised nose into the floor leading edge.
for(let side of [-1,1]){const keel=skin('nose',[[-1.31,.47,.324,.185],[-1.15,.51,.237,.218],[-1.02,.55,.142,.242],[-.88,.59,.116,.268],[-.70,.62,.116,.281]],paint,side,([x,top,bottom,width])=>[[0,top],[width*.7,top-.025],[width,top-.07],[width*.98,bottom+.065],[width*.88,bottom+.010],[0,bottom]]);keel.name='nose-floor-keel';}
// Subtle diagonal lacquer motif and nose sponsors, projected onto the curved shell.
const motif=canvasTexture(1024,1024,c=>{c.fillStyle='#53606c';c.globalAlpha=.38;for(let x=-1100;x<1800;x+=330){c.beginPath();c.moveTo(x,0);c.lineTo(x+100,0);c.lineTo(x+410,512);c.lineTo(x+100,1024);c.lineTo(x,1024);c.lineTo(x+285,512);c.closePath();c.fill()}});
const pattern=new T.Mesh(new DecalGeometry(nose,new T.Vector3(-1.2,.61,0),new T.Euler(-Math.PI/2,0,0),new T.Vector3(1.25,.52,.14)),new T.MeshPhysicalMaterial({map:motif,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,roughness:.3,metalness:.5}));pattern.userData.part='nose';groups.nose.add(pattern);pickables.push(pattern);
const raceNumber=canvasTexture(512,512,c=>{c.fillStyle='#12171a';c.textAlign='center';c.textBaseline='middle';c.font='900 470px Arial';c.fillText('1',256,268)});
const numberDecal=projectDecal(goldNose,raceNumber,[-2.22,.435,0],[.34,.25,.18],[-Math.PI/2,0,-Math.PI/2]);numberDecal.name='race-number-1';
decal(nose,'IWC',[-1.82,.547,0],[.22,.16,.13],[-Math.PI/2,0,-Math.PI/2],'#f4f3ed');
decal(nose,'SCHAFFHAUSEN',[-1.68,.583,0],[.28,.05,.1],[-Math.PI/2,0,-Math.PI/2],'#f4f3ed');
decal(nose,'TOMMY HILFIGER',[-1.42,.618,0],[.34,.075,.13],[-Math.PI/2,0,-Math.PI/2],'#f4f3ed');
decal(nose,'MSC',[-1.04,.658,0],[.27,.12,.10],[-Math.PI/2,0,-Math.PI/2],'#f4f3ed');
const star=canvasTexture(512,512,c=>{c.translate(256,256);c.strokeStyle='#e6e7e5';c.lineWidth=13;c.beginPath();c.arc(0,0,212,0,Math.PI*2);c.stroke();c.fillStyle='#f0f0ed';for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI*2/3);c.beginPath();c.moveTo(0,-203);c.lineTo(20,11);c.lineTo(0,0);c.lineTo(-20,11);c.closePath();c.fill();c.restore()}});
projectDecal(goldNose,star,[-2.48,.345,0],[.11,.11,.13],[-Math.PI/2,0,-Math.PI/2]);
const flag=canvasTexture(512,256,c=>{c.fillStyle='#15243a';c.fillRect(0,0,512,256);c.fillStyle='#f8f8f3';c.fillRect(40,58,216,140);c.fillStyle='#af282a';c.fillRect(256,58,216,140)});
projectDecal(nose,flag,[-1.54,.608,0],[.16,.062,.10],[-Math.PI/2,0,-Math.PI/2]);
// Three-element 2026-style front wing. The two rear elements articulate together.
const frontMain=wing('front',-2.75,.155,1.86,.34,carbon,.14,.035);
for(let side of [-1,1])decal(frontMain,'Expensify',[-2.53,.225,side*.56],[.5,.12,.10],[-Math.PI/2,0,-Math.PI/2],'#f4f3eb');
for(let k=0;k<2;k++){let x=-2.54+k*.16,y=.207+k*.055;let f=wing('front',x,y,1.79-k*.06,.235,k===0?paint:carbon,.15,.032);addFlap(f,[x,y,0],-.27)}
for(let s of [-1,1]){let end=sheet('front',[[-2.61,.15],[-2.46,.17],[-2.22,.25],[-2.04,.42],[-2.16,.39],[-2.45,.28],[-2.65,.26]],.015,paint);end.position.z=s*.93;wing('front',-2.64,.12,.23,.46,carbon,.02,0).position.z=s*.825;tube('front',[[-2.64,.274,s*.93],[-2.46,.29,s*.93],[-2.19,.413,s*.93]],.004,gold);for(let z of [.31,.60])rod('front',[-2.64,.2,z*s],[-2.20,.35,z*s],.0045,metal);decal(end,'IWC',[-2.39,.255,s*.946],[.27,.085,.055],[0,s===1?0:Math.PI,0],'#f2f0e7');}
// High, open sidepod mouths above pronounced undercuts and long descending flanks.
const podSections=[[-.438,.663,.563,.277,.655],[-.29,.666,.340,.285,.659],[-.13,.668,.250,.28,.665],[.18,.574,.206,.255,.681],[.54,.471,.153,.22,.659],[.98,.394,.137,.16,.515],[1.38,.284,.144,.10,.305],[1.64,.217,.151,.08,.182]];
for(let s of [-1,1]){
const inletProfile=[[.285,.636],[.445,.663],[.632,.641],[.655,.594],[.61,.568],[.48,.563],[.30,.574],[.277,.600]];
const podProfile=([x,t,b,inn,out])=>{const body=[[inn,t-.012],[(inn+out)*.5,t+.004],[out-.04,t-.009],[out,t-.055],[out-.102,b+(t-b)*.42],[Math.max(inn+.025,out-.135),b+.028],[inn+.02,b],[inn,t-.12]];const u=T.MathUtils.clamp((x+.438)/.308,0,1),blend=u*u*(3-2*u);return body.map((p,i)=>p.map((v,k)=>T.MathUtils.lerp(inletProfile[i][k],v,blend)))};
const sidepod=skin('sidepods',podSections,paint,s,podProfile,true);sidepod.name='sculpted-sidepod';
// Continuous inlet rim and recessed duct, sharing the forebody's exact opening contour.
intake('sidepods',inletProfile.map(([z,y])=>[s*z,y]),-.438,-.205,.009,paint);
// A shallow shoulder fairing connects the inlet's inner edge to the monocoque.
const shoulderSections=[[-.68,.641,.260,.275],[-.55,.670,.280,.306],[-.438,.691,.306,.330],[-.29,.711,.327,.445],[-.08,.726,.345,.450],[.16,.744,.320,.475],[.34,.778,.308,.498],[.52,.800,.270,.510],[.68,.850,.226,.496],[.86,.840,.192,.442],[1.08,.760,.153,.343],[1.32,.645,.120,.254],[1.51,.520,.091,.185],[1.61,.470,.078,.143]];
const sv=[],si=[],su=[],SL=168,SW=20;
const shoulderRay=new T.Raycaster();const joinTargets=[...bodyFront,...bodyRear,sidepod];for(const m of joinTargets)m.updateWorldMatrix(true,false);
for(let i=0;i<=SL;i++){const[x,y,inner,outer]=interp(shoulderSections,i/SL);const samples=[inner,outer].map(z=>{shoulderRay.set(new T.Vector3(x,1.5,s*z),new T.Vector3(0,-1,0));return shoulderRay.intersectObjects(joinTargets,false)[0]});for(let j=0;j<=SW;j++){const t=j/SW,z=T.MathUtils.lerp(inner,outer,t),h0=samples[0]?.point.y??y,h1=samples[1]?.point.y??y-.025;const slopes=samples.map(h=>h?T.MathUtils.clamp(-s*h.face.normal.z/(h.face.normal.y||1),-1,1)*(outer-inner):0);const yy=(2*t**3-3*t*t+1)*h0+(t**3-2*t*t+t)*slopes[0]+(-2*t**3+3*t*t)*h1+(t**3-t*t)*slopes[1];sv.push(x,yy+.001,s*z);su.push(i/SL,t)}}
for(let i=0;i<SL;i++)for(let j=0;j<SW;j++){const a=i*(SW+1)+j,b=a+1,c=a+SW+1;if(s>0)si.push(a,b,c,b,c+1,c);else si.push(a,c,b,b,c,c+1)}const shoulder=mesh('sidepods',geo(sv,si,su),paint);shoulder.material=paint.clone();shoulder.material.side=T.DoubleSide;shoulder.name='sidepod-chassis-shoulder';
// Concave body-to-floor fillet: tangent to the floor at its outer edge.
const blendVertices=[],blendIndices=[],blendUV=[],NX=100,NC=20;for(let i=0;i<=NX;i++){const q=interp(podSections.slice(2),i/NX),[x,top,bottom,inn,out]=q,z0=Math.max(inn+.025,out-.135),y0=bottom+.028,z1=Math.min(.715,out+.075),curve=new T.CatmullRomCurve3(podProfile(q).map(([z,y])=>new T.Vector3(0,y,z)),true,'centripetal'),tangent=curve.getTangent(5/8);for(let j=0;j<=NC;j++){const t=j/NC,u=1-t;const z=u*u*u*z0+3*u*u*t*(z0+tangent.z*.075)+3*u*t*t*(z1-.055)+t*t*t*z1,y=u*u*u*y0+3*u*u*t*(y0+tangent.y*.075)+3*u*t*t*.118+t*t*t*.118;blendVertices.push(x,y,s*z);blendUV.push(i/NX,t)}}for(let i=0;i<NX;i++)for(let j=0;j<NC;j++){const a=i*(NC+1)+j,b=a+1,c=a+NC+1,d=c+1;if(s>0)blendIndices.push(a,b,c,b,d,c);else blendIndices.push(a,c,b,b,c,d)}const root=mesh('sidepods',geo(blendVertices,blendIndices,blendUV),paint);root.name='sidepod-floor-fillet';
tube('sidepods',[[-.44,.636,s*.285],[-.44,.663,s*.445],[-.44,.641,s*.632]],.003,gold);
rod('sidepods',[-.46,.66,s*.31],[-.44,.77,s*.52],.007);loft('sidepods',[[-.51,.784,.034,.017],[-.43,.785,.068,.027],[-.32,.776,.055,.021]],paint,s*.58);box('sidepods',.004,.027,.084,metal,[-.315,.777,s*.58]);
surfaceText(sidepod,'Expensify',.24,.353,.76,.128,s,'#f6f5ef');
surfaceText(sidepod,'APXGP',.98,.288,.27,.070,s,'#c7a663');
// Hollow floor entrance: a rounded outer sill around an open notch beside the chassis.
const channelSections=[[-1.04,.125,.568,.708],[-.90,.163,.565,.723],[-.66,.182,.572,.732],[-.43,.194,.546,.730],[-.24,.150,.460,.724],[-.12,.121,.349,.719]];
const gv=[],gi=[],gu=[],GL=84,GC=24;for(let i=0;i<=GL;i++){const[x,height,inner,outer]=interp(channelSections,i/GL);for(let j=0;j<=GC;j++){const t=j/GC,z=T.MathUtils.lerp(inner,outer,t),y=.118+(height-.118)*Math.sin(Math.PI*t)**2;gv.push(x,y,s*z);gu.push(i/GL,t)}}for(let i=0;i<GL;i++)for(let j=0;j<GC;j++){const a=i*(GC+1)+j,b=a+1,c=a+GC+1;if(s>0)gi.push(a,b,c,b,c+1,c);else gi.push(a,c,b,b,c,c+1)}const guide=mesh('floor',geo(gv,gi,gu),carbon);guide.name='hollow-floor-channel-sill';


}
// Low tapered engine cover shares its front boundary and normals with the chassis.
const fin=sheet('engine',[[.60,1.036],[.78,.992],[.99,.879],[1.24,.721],[1.49,.552],[1.72,.408],[1.80,.355],[1.57,.32],[1.20,.48],[.87,.74]],.008,paint);
tube('engine',[[.61,1.039,0],[.78,.995,0],[.99,.882,0],[1.24,.724,0],[1.49,.555,0],[1.72,.411,0]],.003,gold);
for(let i=0;i<2;i++){const side=i===0?-1:1,cover=bodyRear[i];surfaceText(cover,'SharkNINJA',.91,.663,.46,.082,side);surfaceText(cover,'AMG',1.0,.550,.26,.065,side);}
const rearGold=canvasTexture(1024,512,c=>{c.fillStyle='#b99755';c.beginPath();c.moveTo(0,0);c.lineTo(1024,0);c.lineTo(1024,512);c.lineTo(350,512);c.lineTo(350,140);c.lineTo(0,140);c.closePath();c.fill()});
for(const cover of bodyRear)projectDecal(cover,rearGold,[1.58,.51,0],[.36,.42,.31],[-Math.PI/2,0,-Math.PI/2]);
// Rounded trapezoid inlet, thin gold leading edge and recessed duct. No closed bulb.
const airOutline=[[-.104,.946],[-.122,.953],[-.122,1.017],[-.111,1.10],[-.079,1.137],[-.04,1.146],[.04,1.146],[.079,1.137],[.111,1.10],[.122,1.017],[.122,.953],[.104,.946]];
intake('airbox',airOutline,.349,.632,.012,gold);
const intakeFairing=loft('airbox',[[.405,1.046,.126,.098],[.57,1.025,.126,.098],[.78,.987,.115,.084],[.98,.906,.083,.062],[1.12,.792,.047,.041],[1.26,.705,.020,.025]],paint,0,.72);

// Mask only the cavity's back: the forward section remains genuinely open.
const innerOutline=airOutline.map(([z,y])=>[z*.89,1.047+(y-1.047)*.87]);intake('airbox',innerOutline,.344,.426,.004,carbon);
rod('airbox',[.341,.964,0],[.341,1.138,0],.005,carbon);
loft('airbox',[[.29,.847,.055,.015],[.40,.891,.092,.075],[.54,.937,.112,.078]],paint,0,.75);
box('airbox',.094,.026,.25,paint,[.499,1.224,0]);box('airbox',.034,.017,.026,dark,[.449,1.225,0]);rod('airbox',[.5,1.135,0],[.5,1.21,0],.009,carbon);
groups.airbox.position.y=-.075;
// Halo, cockpit rim, seat harness and curved multifunction steering wheel.
tube('halo',[[.39,.813,-.29],[.13,.875,-.332],[-.14,.888,-.258],[-.34,.858,0],[-.14,.888,.258],[.13,.875,.332],[.39,.813,.29]],.024,paint);
const haloPillar=tube('halo',[[-.53,.639,0],[-.447,.742,0],[-.34,.858,0]],.018,paint);haloPillar.name='raked-halo-front-support';
tube('halo',[[.38,.832,-.29],[.13,.898,-.332],[-.14,.911,-.258],[-.34,.881,0],[-.14,.911,.258],[.13,.898,.332],[.38,.832,.29]],.0032,satin);
for(let side of [-1,1])loft('cockpit',[[.18,.743,.027,.017,side*.199],[.33,.786,.036,.025,side*.182],[.47,.809,.043,.033,side*.133],[.52,.811,.07,.034,side*.065]],dark);
mesh('nose',new T.TorusGeometry(.028,.003,8,40),satin,[.47,.687,.316],[0,.12,0]);
const seat=loft('cockpit',[[-.45,.37,.12,.025],[-.05,.38,.18,.045],[.27,.53,.19,.17],[.4,.60,.18,.23]],dark,0,.6);
for(let s of [-1,1]){tube('cockpit',[[.32,.70,s*.07],[.17,.51,s*.09],[-.07,.42,s*.12]],.017,red);rod('cockpit',[-.1,.4,s*.08],[.12,.46,s*.07],.009,metal)}
const wheel=sheet('cockpit',[[-.12,-.03],[-.135,.025],[-.10,.075],[-.065,.08],[-.06,.045],[.06,.045],[.065,.08],[.10,.075],[.135,.025],[.12,-.03],[.063,-.057],[-.063,-.057]],.018,carbon);wheel.rotation.y=Math.PI/2;wheel.rotation.z=-.25;wheel.position.set(-.31,.66,0);
const screenMat=mat('#5e9d8e',.1,.3);box('cockpit',.017,.041,.073,screenMat,[-.322,.695,0]);for(let s of [-1,1])for(let i=0;i<4;i++)mesh('cockpit',new T.SphereGeometry(.008,10,10),i===0?red:i===1?gold:ivory,[-.328,.649+i*.017,s*.095]);
for(let i=0;i<5;i++)mesh('cockpit',new T.SphereGeometry(.003,6,6),gold,[-.326,.724,-.02+i*.01]);
// Flatter 2026 floor: no 2022-style Venturi tunnels or rear beam wing.
// The front edge returns around two open notches; no hidden solid plate fills them.
const edge=[[-1.04,.708],[-.74,.735],[.2,.735],[.98,.64],[1.48,.545],[1.67,.400],[1.81,.238],[1.90,.090],[1.922,.035]];
const notch=[[-1.04,.568],[-.90,.565],[-.66,.572],[-.43,.546],[-.24,.460],[-.12,.349],[-.24,.326],[-.45,.307],[-.72,.284],[-1.04,.250]];
const outline=[...edge.map(([x,z])=>[x,-z]),...edge.slice().reverse(),...notch,...notch.slice().reverse().map(([x,z])=>[x,-z])];
const floorShape=new T.Shape();outline.forEach(([x,z],i)=>i?floorShape.lineTo(x,z):floorShape.moveTo(x,z));floorShape.closePath();const floorG=new T.ExtrudeGeometry(floorShape,{depth:.023,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:3});floorG.rotateX(Math.PI/2);const floorPlate=mesh('floor',floorG,carbon,[0,.117,0]);floorPlate.name='notched-floor-platform';
for(let s of [-1,1]){tube('floor',[[-1.03,.122,s*.706],[-.74,.123,s*.733],[.23,.125,s*.735],[.98,.122,s*.645],[1.50,.124,s*.576]],.003,satin);rod('floor',[.45,.16,s*.32],[.52,.127,s*.70],.003,metal)}
box('floor',2.65,.017,.145,mat('#8a7452',.03,.8),[.35,.085,0]);for(let x of [-.69,.05,.65,1.25])mesh('floor',new T.CylinderGeometry(.04,.04,.02,20),metal,[x,.083,0]);
// Three rear wing elements; two moving flaps, no lower beam wing.
const main=wing('rear',1.78,.99,1.47,.34,carbon,-.04,.014);
for(let k=0;k<2;k++){let x=2.00+k*.13,y=1.08+k*.095;let f=wing('rear',x,y,1.42,.23,k===1?paint:gold,-.04,.01);addFlap(f,[x,y,0],-.48)}
for(let s of [-1,1]){let end=sheet('rear',[[1.78,.87],[1.80,1.075],[2.09,1.245],[2.35,1.225],[2.37,.895],[2.14,.84]],.013,paint);end.position.z=s*.746;decal(end,'APXGP',[2.10,1.04,s*.76],[.42,.13,.09],[0,s===1?0:Math.PI,0],'#f5f1e7');tube('rear',[[1.49,.33,s*.16],[1.61,.72,s*.16],[1.84,1.0,s*.16]],.018,carbon);tube('rear',[[1.79,1.083,s*.746],[2.10,1.253,s*.746],[2.35,1.232,s*.746]],.004,gold)}
rod('rear',[1.84,1.03,0],[2.15,1.19,0],.009,metal);decal(main,'Expensify',[1.96,1.055,0],[1.02,.21,.2],[-Math.PI/2,0,-Math.PI/2],'#f5f4ec');
// Sculpted slick tyre profile and exposed deep-dish spoke rims.
const sidewall=canvasTexture(1024,1024,c=>{c.translate(512,512);c.fillStyle='#d9be63';c.textAlign='center';c.font='bold 73px Arial';const arc=(word,r,step,offset)=>{for(let i=0;i<word.length;i++){c.save();c.rotate(offset+(i-(word.length-1)/2)*step);c.translate(0,-r);c.fillText(word[i],0,0);c.restore()}};arc('PIRELLI',382,.137,0);arc('P ZERO',382,.15,Math.PI);c.strokeStyle='#b59b48';c.lineWidth=1.5;for(let r of [350,444]){c.beginPath();c.arc(0,0,r,.45,2.5);c.stroke();c.beginPath();c.arc(0,0,r,3.6,5.65);c.stroke()}c.fillStyle='#8e938a';c.font='22px Arial';c.fillText('2026 · R18',0,302)});const sideMat=new T.MeshPhysicalMaterial({map:sidewall,transparent:true,depthWrite:false,roughness:.86,metalness:0,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
for(let x of [-1.7,1.7])for(let s of [-1,1]){let front=x<0,w=front?.28:.375,r=front?.3525:.355,z=s*(.938-w/2),yc=r+.015;
let raw=[[.223,-w/2],[.26,-w*.507],[.309,-w*.501],[.337,-w*.446],[r,-w*.35],[r,w*.35],[.337,w*.446],[.309,w*.501],[.26,w*.507],[.223,w/2]];let profile=new T.SplineCurve(raw.map(a=>new T.Vector2(...a))).getPoints(48);mesh('tyres',new T.LatheGeometry(profile,128),rubber,[x,yc,z],[Math.PI/2,0,0]);
// The hollow barrel and paired spokes allow the brakes to be glimpsed inside.
mesh('tyres',new T.CylinderGeometry(.226,.226,w*.85,80,1,true),satin,[x,yc,z],[Math.PI/2,0,0]);
for(let face of [-1,1]){let fz=z+face*w*.51;let ring=mesh('tyres',new T.RingGeometry(.247,r*.994,128),sideMat,[x,yc,fz]);if(face<0)ring.rotation.y=Math.PI;
mesh('tyres',new T.TorusGeometry(.227,.007,10,96),metal,[x,yc,fz]);mesh('tyres',new T.TorusGeometry(.217,.008,8,96),satin,[x,yc,fz-face*.022]);mesh('tyres',new T.CylinderGeometry(.052,.055,.032,12),satin,[x,yc,fz-face*.06],[Math.PI/2,0,0]);
for(let i=0;i<10;i++){let a=i/10*Math.PI*2;for(let offset of [-.017,.017]){let a2=a+offset;rod('tyres',[x+Math.cos(a2)*.05,yc+Math.sin(a2)*.05,fz-face*.07],[x+Math.cos(a2+.08)*.22,yc+Math.sin(a2+.08)*.22,fz-face*.024],.007,satin)}mesh('tyres',new T.SphereGeometry(.004,6,6),metal,[x+Math.cos(a)*.188,yc+Math.sin(a)*.188,fz-face*.016])}
mesh('tyres',new T.TorusGeometry(.14,.025,8,64),carbon,[x,yc,fz-face*.094]);}
let inner=z-s*w*.35;mesh('suspension',new T.CylinderGeometry(.14,.14,.035,60),satin,[x,yc,inner],[Math.PI/2,0,0]);box('suspension',.07,.16,.045,metal,[x-.11,yc,inner-s*.03]);
for(let i=0;i<18;i++){let a=i/18*Math.PI*2;mesh('suspension',new T.SphereGeometry(.006,6,6),dark,[x+Math.cos(a)*.11,yc+Math.sin(a)*.11,inner+s*.020])}
// Streamlined suspension blades with a rounded leading edge and thin trailing edge.
function blade(a,b,chord){const vs=[],ix=[],uv=[];for(let i=0;i<=12;i++){const t=i/12;for(let j=0;j<=24;j++){const th=j*Math.PI/12,f=(1-Math.cos(th))*.5;vs.push(T.MathUtils.lerp(a[0],b[0],t)+(f-.32)*chord*(.76+.24*Math.sin(Math.PI*t)),T.MathUtils.lerp(a[1],b[1],t)+.011*Math.sin(th)*(1-.52*f),T.MathUtils.lerp(a[2],b[2],t));uv.push(t,j/24)}}for(let i=0;i<12;i++)for(let j=0;j<24;j++){const n=i*25+j;if(s>0)ix.push(n,n+1,n+25,n+1,n+26,n+25);else ix.push(n,n+25,n+1,n+1,n+25,n+26)}const m=carbon.clone();m.side=T.DoubleSide;mesh('suspension',geo(vs,ix,uv),m)}
let attach=front?-1.0:1.14,outer=z-s*w*.57;for(let y of [.25,.48]){blade([attach-.29,y,s*.21],[x,y,outer],.052);blade([attach+.26,y,s*.22],[x,y,outer],.045)}rod('suspension',[attach,.61,s*.19],[x,.23,outer],.012);rod('suspension',[attach-.18,.32,s*.24],[x-.07,.36,outer],.007,metal);mesh('suspension',new T.SphereGeometry(.024,16,12),satin,[x,.48,outer]);
}
// Thermal and fabrication detail: exhaust, rear rain light, fasteners, body seams.
mesh('engine',new T.CylinderGeometry(.038,.042,.23,32,true),metal,[1.95,.46,0],[0,0,Math.PI/2]);mesh('engine',new T.CircleGeometry(.033,32),dark,[2.067,.46,0],[0,Math.PI/2,0]);
const lightmat=mat('#991c0a',.1,.3);lightmat.emissive.set('#ff2305');lightmat.emissiveIntensity=.6;box('diffuser',.014,.05,.065,lightmat,[2.02,.294,0]);for(let s of [-1,1])box('rear',.025,.05,.014,lightmat,[2.34,.90,s*.758]);
for(let s of [-1,1]){for(let i=0;i<6;i++)mesh('nose',new T.SphereGeometry(.005,6,6),metal,[-1.55+i*.15,.54,s*(.13+i*.024)]);tube('engine',[[.51,.55,s*.155],[.82,.49,s*.158],[1.08,.41,s*.128],[1.49,.34,s*.078]],.0018,satin)}
// Sweep the inlet, duct, fillet and attached lettering in the same coordinate field.
for(const m of groups.sidepods.children){if(!m.isMesh)continue;m.updateMatrix();const inv=m.matrix.clone().invert(),g=m.geometry,p=g.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrix);const lateral=T.MathUtils.smoothstep(Math.abs(v.z),.33,.70),front=1-T.MathUtils.smoothstep(v.x,-.33,.45);v.x+=front*lateral*(.14+.27*(1-T.MathUtils.smoothstep(v.y,.20,.66)));v.applyMatrix4(inv);p.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox()}
// Reduce the complete wing assembly around its own centre, independently of the nose.
groups.front.scale.set(.85,1,.90);groups.front.position.x=-.36;
car.updateMatrixWorld(true);
return {car,groups,pickables,activeFlaps,materials:{paint,gold,carbon,rubber},meshCount:pickables.length,dimensions:{wheelbase:3.4,width:1.9},setAero(t){activeFlaps.forEach(({pivot,angle})=>pivot.rotation.z=angle*t)}};
}
