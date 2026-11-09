import * as T from 'three';
import {DecalGeometry} from './vendor/DecalGeometry.js';
// Original 2026-inspired educational geometry; metres, nose at negative X.
export function buildCar(){
const car=new T.Group(),groups={},pickables=[],activeFlaps=[];
const mat=(color,metalness=0,roughness=.4)=>new T.MeshPhysicalMaterial({color,metalness,roughness});
const paint=mat('#090b10',.28,.31);paint.clearcoat=.78;paint.clearcoatRoughness=.23;
const gold=mat('#c1a16c',.76,.28);gold.clearcoat=.8;gold.clearcoatRoughness=.23;
const satin=mat('#252a28',.78,.39),metal=mat('#909794',.95,.25),dark=mat('#090d0b',.0,.72),rubber=mat('#191c1b',.02,.82),red=mat('#a93220',.5,.33),ivory=mat('#deded0',.3,.37);
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t}
const weave=canvasTexture(256,256,c=>{c.fillStyle='#343936';c.fillRect(0,0,256,256);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const bright=((x+y)%4<2);c.fillStyle=bright?'#535a55':'#272d2a';c.fillRect(x*4,y*4,bright?3:4,bright?4:3)}});weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(10,6);const carbon=mat('#444b4c',.48,.42);carbon.map=weave;carbon.clearcoat=.45;carbon.clearcoatRoughness=.3;
// Low-contrast woven chevrons, mapped in car coordinates so panel seams do not reset the livery.
const cross=canvasTexture(1024,1024,c=>{c.fillStyle='#17191d';c.fillRect(0,0,1024,1024);c.lineJoin='miter';for(let row=-1;row<3;row++)for(let col=-1;col<4;col++){c.save();c.translate(col*410+(row%2)*205,row*510);c.strokeStyle='#34373c';c.lineWidth=42;c.beginPath();c.moveTo(0,25);c.lineTo(170,25);c.lineTo(275,225);c.lineTo(168,425);c.lineTo(0,425);c.lineTo(106,225);c.closePath();c.stroke();c.strokeStyle='#44474b';c.lineWidth=3;c.stroke();c.restore()}});cross.wrapS=cross.wrapT=T.RepeatWrapping;paint.color.set('#b8b8b8');paint.map=cross;
let seed=127;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const noise=canvasTexture(256,256,c=>{c.fillStyle='#888';c.fillRect(0,0,256,256);for(let i=0;i<18000;i++){let v=100+Math.floor(rand()*70);c.fillStyle=`rgb(${v},${v},${v})`;c.fillRect(rand()*256,rand()*256,1,1)}});noise.colorSpace=T.NoColorSpace;noise.wrapS=noise.wrapT=T.RepeatWrapping;noise.repeat.set(6,3);rubber.bumpMap=noise;rubber.bumpScale=.0008;rubber.roughnessMap=noise;
for(const id of ['front','nose','tyres','suspension','halo','cockpit','sidepods','airbox','engine','floor','diffuser','rear']){let g=new T.Group();g.userData.id=id;groups[id]=g;car.add(g)}
function mesh(id,geo,material,pos=[0,0,0],rotation){const m=new T.Mesh(geo,material);m.position.set(...pos);if(rotation)m.rotation.set(...rotation);m.castShadow=m.receiveShadow=true;m.userData.part=id;groups[id].add(m);pickables.push(m);return m}
function box(id,w,h,d,material,pos,rot){return mesh(id,new T.BoxGeometry(w,h,d),material,pos,rot)}
function tube(id,pts,r,material=carbon){return mesh(id,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),pts.length*12,r,10,false),material)}
function rod(id,a,b,r,material=carbon,flat=1){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);let m=mesh(id,new T.CylinderGeometry(r,r,v.length(),12),material,p.clone().add(q).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());m.scale.z=flat;return m}
function sheet(id,pts,thick,material){if(id==='rear'){const c=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(p[0],p[1],0)),true,'centripetal');pts=c.getPoints(120).map(p=>[p.x,p.y]);}let shape=new T.Shape();pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return mesh(id,new T.ExtrudeGeometry(shape,{depth:thick,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.004,bevelThickness:.003,curveSegments:32}),material,[0,0,-thick/2])}
function geo(verts,indices,uvs){let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));if(uvs)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g}
// Smooth Hermite interpolation removes visible segment changes in the body silhouette.
function interp(secs,t){let f=t*(secs.length-1),i=Math.min(secs.length-2,Math.floor(f)),u=f-i;return secs[0].map((_,k)=>{let p0=secs[Math.max(0,i-1)][k],p1=secs[i][k],p2=secs[i+1][k],p3=secs[Math.min(secs.length-1,i+2)][k];return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)})}
function loft(id,sections,material,side=0,squareness=1){const N=64,L=sections.length*8,verts=[],ind=[],uv=[];for(let i=0;i<=L;i++){let [x,y,w,h,offset=side]=interp(sections,i/L);for(let j=0;j<=N;j++){let a=j/N*Math.PI*2;let cz=Math.cos(a),sy=Math.sin(a);verts.push(x,y+Math.sign(sy)*Math.abs(sy)**squareness*Math.max(.001,h),offset+Math.sign(cz)*Math.abs(cz)**squareness*Math.max(.001,w));uv.push(i/L,j/N)}}for(let i=0;i<L;i++)for(let j=0;j<N;j++){let a=i*(N+1)+j,b=a+1,d=a+N+1,c=d+1;ind.push(a,d,b,b,d,c)}for(let j=1;j<N-1;j++){ind.push(0,j,j+1);let a=L*(N+1);ind.push(a,a+j+1,a+j)}return mesh(id,geo(verts,ind,uv),material)}
function wing(id,x,y,span,chord,material,sweep=.05,rise=.0){const verts=[],ind=[],uv=[],N=80,M=32;for(let j=0;j<=N;j++){let z=(j/N-.5)*span,e=Math.abs(z)/(span/2);for(let i=0;i<=M;i++){let a=i/M*Math.PI*2,f=(1-Math.cos(a))*.5,localChord=chord*(1-.14*e**3);verts.push(x+f*localChord+sweep*e**2,y+(id==='front'?.075*Math.sin(e*Math.PI*.94)**2-.018*(1-e)**2:0)+.11*chord*Math.sin(f*Math.PI)+.06*chord*Math.sin(a)+rise*e**4,z);uv.push(j/N,i/M)}}for(let j=0;j<N;j++)for(let i=0;i<M;i++){let a=j*(M+1)+i;ind.push(a,a+M+1,a+1,a+1,a+M+1,a+M+2)}return mesh(id,geo(verts,ind,uv),material)}
function addFlap(m,pivotPoint,angle){let pivot=new T.Group();pivot.position.set(...pivotPoint);groups[m.userData.part].add(pivot);pivot.attach(m);activeFlaps.push({pivot,angle});return pivot}
function textTexture(text,color='#d4b477'){return canvasTexture(2048,512,c=>{
 c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';
 if(text==='TOMMY HILFIGER'){c.strokeStyle=color;c.lineWidth=11;c.strokeRect(115,142,510,235);c.beginPath();c.moveTo(115,260);c.lineTo(625,260);c.moveTo(370,142);c.lineTo(370,377);c.stroke();c.textAlign='left';c.font='500 153px Arial';c.fillText('TOMMY',710,175,1180);c.fillText('HILFIGER',710,350,1180);return;}
 if(text==='EA SPORTS'){c.font='italic 800 250px Arial';c.fillText('EA',1024,202);c.font='700 95px Arial';c.fillText('SPORTS',1024,388);return;}
 if(text==='APXGP'){c.strokeStyle=color;c.lineWidth=15;c.lineJoin='round';const lines=[[[85,380],[85,192],[240,100],[395,192],[395,380]],[[440,380],[440,100],[700,100],[770,170],[700,245],[440,245]],[[800,100],[1010,255],[800,400]],[[1210,100],[1010,255],[1210,400]],[[1510,125],[1320,125],[1245,220],[1245,315],[1320,390],[1530,390],[1530,265],[1430,265]],[[1600,390],[1600,125],[1845,125],[1930,185],[1845,265],[1600,265]]];for(const pts of lines){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}return;}
 if(text==='MSC'){
   c.save();c.translate(390,256);c.strokeStyle=color;c.lineWidth=13;c.beginPath();c.arc(0,0,139,0,Math.PI*2);c.stroke();
   for(let k=0;k<8;k++){c.rotate(Math.PI/4);c.beginPath();c.moveTo(0,-205);c.lineTo(31,-70);c.lineTo(0,-102);c.lineTo(-31,-70);c.closePath();c.fill()}c.restore();
   c.font='600 310px Arial';c.fillText('MSC',1240,230,1140);c.font='500 82px Arial';c.fillText('CRUISES',1240,425,900);return;
 }
 if(text==='SharkNINJA'){c.font='700 290px Arial';c.textAlign='right';c.fillText('Shark',1000,270,940);c.textAlign='left';c.font='500 290px Arial';c.fillText('NINJA',1015,270,950);return;}
 if(text==='AMG'){c.fillStyle=color;for(let i=0;i<5;i++){let x=140+i*78;c.beginPath();c.moveTo(x,365);c.lineTo(x+135,120);c.lineTo(x+175,120);c.lineTo(x+40,365);c.fill()}c.font='italic 700 335px Arial';c.fillText('AMG',1275,275,1270);return;}
 c.font=text==='IWC'?'bold 350px Georgia':text==='SCHAFFHAUSEN'?'220px Georgia':text==='TOMMY HILFIGER'?'240px Arial':text==='Expensify'?'bold 310px Arial':text==='APXGP'?'italic 800 320px Arial':'700 310px Arial';
 c.fillText(text,1024,266,1830);
})}
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
// A single sampled body skin, from nose tip to tail. Material/part boundaries
// reuse identical vertices and normals: no overlapping nose and chassis shells.
const bodySections=[[-2.615,0,.268,.265,.077,.218],[-2.57,0,.310,.299,.137,.210],[-2.30,0,.420,.409,.145,.240],[-1.97,0,.507,.492,.145,.283],[-1.65,0,.580,.561,.151,.320],[-1.28,0,.626,.606,.184,.300],[-.92,0,.656,.638,.247,.210],[-.75,.005,.668,.655,.28,.117],[-.57,.08,.69,.680,.317,.117],[-.32,.194,.719,.710,.354,.117],[.06,.219,.738,.729,.367,.117],[.35,.196,.79,.775,.349,.117],[.52,.125,.800,.765,.308,.117],[.66,0,.936,.714,.286,.117],[.84,0,.906,.655,.257,.117],[1.10,0,.801,.552,.211,.117],[1.37,0,.669,.461,.168,.117],[1.62,0,.520,.365,.124,.117],[1.84,0,.395,.298,.068,.155],[2.02,0,.333,.289,.028,.234]];
const bodyFront=[],bodyRear=[],goldFront=[];
for(let side of [-1,1]){const N=96,L=(bodySections.length-1)*16,verts=[],indices=[],uv=[];let splitRow=0,goldRow=0;
for(let i=0;i<=L;i++){const[x,inner,top,shoulder,width,bottom]=interp(bodySections,i/L);if(x<=.52)splitRow=i;if(x<=-1.97)goldRow=i;const z0=Math.max(0,inner),h=(top-bottom)/2,mid=(top+bottom)/2;
const front=[[0,top],[width*.50,top-h*.07],[width*.85,top-h*.30],[width,mid],[width*.85,bottom+h*.30],[width*.50,bottom+h*.07],[0,bottom],[0,bottom+h*.30],[0,top-h*.30]];
const body=[[z0,top],[z0+(width-z0)*.26,top-.002],[z0+(width-z0)*.65,shoulder],[width,shoulder-.065],[width*.99,bottom+(shoulder-bottom)*.30],[width-.018,bottom+.046],[width+.016,bottom+.002],[z0,bottom-.002],[z0,top-(z0>.002?.15:.10)]];
const blend=T.MathUtils.smoothstep(x,-1.45,-.57);const points=front.map((p,k)=>p.map((v,j)=>T.MathUtils.lerp(v,body[k][j],blend)));
const curve=new T.CatmullRomCurve3(points.map(([z,y])=>new T.Vector3(x,y,side*z)),true,'centripetal');
for(let j=0;j<=N;j++){let v=curve.getPoint(j/N);verts.push(v.x,v.y,v.z);uv.push((v.x+2.615)/1.12,v.z/1.1+.5)}}
for(let i=0;i<L;i++)for(let j=0;j<N;j++){let a=i*(N+1)+j,b=a+1,c=a+N+1,d=c+1;if(side>0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d)}
const full=geo(verts,indices,uv);const normals=full.attributes.normal;
for(let i=0;i<=L;i++){const x=verts[i*(N+1)*3];if(x<-.75||x>.67)for(const j of [0,N]){const k=i*(N+1)+j,n=new T.Vector3(normals.getX(k),Math.abs(normals.getY(k)),0).normalize();normals.setXYZ(k,n.x,n.y,n.z)}}
for(const [start,end,id,material,name,collection] of [[0,goldRow,'nose',gold,'continuous-gold-nose',goldFront],[goldRow,splitRow,'nose',paint,'continuous-chassis-shell',bodyFront],[splitRow,L,'engine',paint,'continuous-engine-shell',bodyRear]]){const geometry=full.clone();geometry.setIndex(indices.slice(start*N*6,end*N*6));const m=mesh(id,geometry,material);m.name=name;m.userData.bodySeam={row:splitRow,stride:N+1,side};collection.push(m)}full.dispose();
tube('nose',[[-.56,.682,side*.10],[-.31,.719,side*.201],[.04,.741,side*.222],[.33,.791,side*.202],[.52,.825,side*.13]],.0025,satin)}
function projectionTarget(targets){const vs=[],ix=[];for(const m of targets){const offset=vs.length/3;vs.push(...m.geometry.attributes.position.array);for(const i of m.geometry.index.array)ix.push(i+offset)}const m=new T.Mesh(geo(vs,ix),paint);m.userData.part='nose';return m}
const nose=projectionTarget(bodyFront),goldNose=projectionTarget(goldFront);
// A curved central keel descends from the raised nose into the floor leading edge.
for(let side of [-1,1]){const keel=skin('nose',[[-1.31,.43,.324,.167],[-1.15,.46,.237,.185],[-1.02,.48,.142,.205],[-.88,.49,.116,.225],[-.70,.49,.116,.245]],paint,side,([x,top,bottom,width])=>[[0,top],[width*.7,top-.025],[width,top-.07],[width*.98,bottom+.065],[width*.88,bottom+.010],[0,bottom]]);keel.name='nose-floor-keel';}
// Surface-following top lettering: complete UV rectangles with no projector clipping.
function topMark(target,texture,x,z,length,width,name='top-mark'){
 const ray=new T.Raycaster(),vs=[],uv=[],ix=[],NX=40,NY=12;target.updateWorldMatrix(true,false);
 const source=target.geometry,p=source.attributes.position,ids=source.index.array,selected=[];
 for(let k=0;k<ids.length;k+=3){const a=[ids[k],ids[k+1],ids[k+2]];if(Math.max(...a.map(i=>p.getX(i)))>=x-length/2&&Math.min(...a.map(i=>p.getX(i)))<=x+length/2&&Math.max(...a.map(i=>p.getZ(i)))>=z-width/2&&Math.min(...a.map(i=>p.getZ(i)))<=z+width/2)selected.push(...a)}
 const patch=source.clone();patch.setIndex(selected);patch.computeBoundingBox();patch.computeBoundingSphere();const probe=new T.Mesh(patch,target.material);probe.matrixWorld.copy(target.matrixWorld);
 for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const u=i/NX,v=j/NY,px=x+(v-.5)*length,pz=z+(u-.5)*width;ray.set(new T.Vector3(px,1.6,pz),new T.Vector3(0,-1,0));const hit=ray.intersectObject(probe,false)[0];if(!hit)throw new Error('Incomplete livery patch: '+name);vs.push(px,hit.point.y+.0012,pz);uv.push(u,v)}
 for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const a=j*(NX+1)+i,b=a+1,c=a+NX+1;ix.push(a,b,c,b,c+1,c)}
 const material=new T.MeshPhysicalMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,roughness:.48,metalness:0,side:T.DoubleSide});const m=mesh(target.userData.part,geo(vs,ix,uv),material);m.castShadow=false;m.name=name;patch.dispose();return m;
}
const raceNumber=canvasTexture(512,512,c=>{c.fillStyle='#12171a';c.textAlign='center';c.textBaseline='middle';c.font='900 470px Arial';c.fillText('1',256,268)});
const numberDecal=topMark(goldNose,raceNumber,-2.22,0,.30,.22,'race-number-1');numberDecal.name='race-number-1';
topMark(nose,textTexture('IWC','#f4f3ed'),-1.84,0,0.12,0.23,'nose-IWC');
topMark(nose,textTexture('SCHAFFHAUSEN','#f4f3ed'),-1.73,0,0.034,0.25,'nose-SCHAFFHAUSEN');
topMark(nose,textTexture('TOMMY HILFIGER','#f4f3ed'),-1.44,0,0.055,0.3,'nose-TOMMY-HILFIGER');
topMark(nose,textTexture('GEICO','#f4f3ed'),-1.20,0,.05,.285,'nose-GEICO');
topMark(nose,textTexture('MSC','#f4f3ed'),-0.99,0,0.11,0.29,'nose-MSC');
const star=canvasTexture(512,512,c=>{c.translate(256,256);c.strokeStyle='#e6e7e5';c.lineWidth=13;c.beginPath();c.arc(0,0,212,0,Math.PI*2);c.stroke();c.fillStyle='#f0f0ed';for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI*2/3);c.beginPath();c.moveTo(0,-203);c.lineTo(20,11);c.lineTo(0,0);c.lineTo(-20,11);c.closePath();c.fill();c.restore()}});
topMark(goldNose,star,-2.48,0,.105,.105,'nose-star');
const flag=canvasTexture(512,256,c=>{c.fillStyle='#15243a';c.fillRect(0,0,512,256);c.fillStyle='#f8f8f3';c.fillRect(40,58,216,140);c.fillStyle='#af282a';c.fillRect(256,58,216,140)});
topMark(nose,flag,-1.54,0,.055,.16,'nose-flag');
// Three-element 2026-style front wing. The two rear elements articulate together.
const frontMain=wing('front',-2.75,.155,1.86,.34,carbon,.14,.035);
for(let side of [-1,1])topMark(frontMain,textTexture('Expensify','#f4f3eb'),-2.60,side*.56,.09,.44,'front-Expensify');
for(let k=0;k<2;k++){let x=-2.54+k*.16,y=.207+k*.055;let f=wing('front',x,y,1.79-k*.06,.235,k===0?paint:carbon,.15,.032);const pivot=addFlap(f,[x,y,0],-.27);if(k===1)for(const side of [-1,1]){const label=topMark(f,textTexture('SharkNINJA','#f6f3e9'),x+.16,side*.53,.07,.43,'front-SharkNINJA');pivot.attach(label)}}
for(let s of [-1,1]){let end=sheet('front',[[-2.70,.12],[-2.39,.12],[-2.10,.23],[-2.05,.51],[-2.20,.49],[-2.43,.31],[-2.70,.21]],.012,carbon);end.position.z=s*.93;wing('front',-2.64,.12,.23,.46,carbon,.02,0).position.z=s*.825;tube('front',[[-2.64,.274,s*.93],[-2.46,.29,s*.93],[-2.19,.413,s*.93]],.004,gold);for(let z of [.31,.60])rod('front',[-2.64,.2,z*s],[-2.20,.35,z*s],.0045,metal);decal(end,'IWC',[-2.25,.345,s*.946],[.27,.10,.055],[0,s===1?0:Math.PI,0],'#f2f0e7');}
// High, open sidepod mouths above pronounced undercuts and long descending flanks.
const podSections=[[-.438,.663,.563,.277,.655],[-.29,.666,.340,.285,.659],[-.13,.668,.250,.28,.665],[.18,.637,.220,.255,.691],[.54,.577,.174,.22,.674],[.98,.466,.155,.16,.548],[1.38,.315,.154,.10,.328],[1.64,.217,.151,.08,.182]];
for(let s of [-1,1]){
const inletProfile=[[.285,.636],[.445,.663],[.632,.641],[.655,.594],[.61,.568],[.48,.563],[.30,.574],[.277,.600]];
const podProfile=([x,t,b,inn,out])=>{const body=[[inn,t-.012],[(inn+out)*.5,t+.004],[out-.04,t-.009],[out,t-.055],[out-.102,b+(t-b)*.42],[Math.max(inn+.025,out-.135),b+.028],[inn+.02,b],[inn,t-.12]];const u=T.MathUtils.clamp((x+.438)/.308,0,1),blend=u*u*(3-2*u);return body.map((p,i)=>p.map((v,k)=>T.MathUtils.lerp(inletProfile[i][k],v,blend)))};
const sidepod=skin('sidepods',podSections,paint,s,podProfile,true);sidepod.name='sculpted-sidepod';
const lineV=[],lineI=[],sideRay=new T.Raycaster();sidepod.updateWorldMatrix(true,false);
for(let i=0;i<=100;i++){const q=interp(podSections, .20+i/100*.76),x=q[0],cy=q[2]+.065;for(const edge of [-1,1]){sideRay.set(new T.Vector3(x,cy+edge*.004,s*2),new T.Vector3(0,0,-s));const hit=sideRay.intersectObject(sidepod)[0];if(hit)lineV.push(hit.point.x,hit.point.y,hit.point.z+s*.0015);else lineV.push(x,cy+edge*.004,s*q[4]);}}
for(let i=0;i<100;i++){const a=i*2;if(s>0)lineI.push(a,a+2,a+1,a+1,a+2,a+3);else lineI.push(a,a+1,a+2,a+1,a+3,a+2)}const stripe=mesh('sidepods',geo(lineV,lineI),gold);stripe.material=gold.clone();stripe.material.side=T.DoubleSide;stripe.name='sidepod-gold-pinstripe';
const louvres=canvasTexture(512,2048,c=>{c.fillStyle='#111417';c.fillRect(0,0,512,2048);c.strokeStyle='#777a7b';c.lineWidth=6;c.strokeRect(8,8,496,2032);for(let i=0;i<12;i++){let y=60+i*160;c.fillStyle='#020405';c.fillRect(30,y,452,125);c.fillStyle='#555a5e';c.beginPath();c.moveTo(34,y+25);c.lineTo(475,y+4);c.lineTo(475,y+40);c.lineTo(34,y+66);c.fill();c.strokeStyle='#929796';c.lineWidth=3;c.beginPath();c.moveTo(34,y+25);c.lineTo(475,y+4);c.stroke()}});


// Continuous inlet rim and recessed duct, sharing the forebody's exact opening contour.
intake('sidepods',inletProfile.map(([z,y])=>[s*z,y]),-.438,-.205,.009,paint);
// A shallow shoulder fairing connects the inlet's inner edge to the monocoque.
const shoulderSections=[[-.68,.641,.260,.275],[-.55,.670,.280,.306],[-.438,.691,.306,.330],[-.29,.711,.327,.445],[-.08,.726,.345,.450],[.16,.744,.320,.475],[.34,.778,.308,.498],[.52,.800,.270,.510],[.68,.850,.226,.496],[.86,.840,.192,.442],[1.08,.760,.153,.343],[1.32,.645,.120,.254],[1.51,.520,.091,.185],[1.61,.470,.078,.143]];
const sv=[],si=[],su=[],SL=168,SW=20;
const shoulderRay=new T.Raycaster();const joinTargets=[...bodyFront,...bodyRear,sidepod];for(const m of joinTargets)m.updateWorldMatrix(true,false);
for(let i=0;i<=SL;i++){const[x,y,inner,outer]=interp(shoulderSections,i/SL);const samples=[inner,outer].map(z=>{shoulderRay.set(new T.Vector3(x,1.5,s*z),new T.Vector3(0,-1,0));return shoulderRay.intersectObjects(joinTargets,false)[0]});for(let j=0;j<=SW;j++){const t=j/SW,z=T.MathUtils.lerp(inner,outer,t),h0=samples[0]?.point.y??y,h1=samples[1]?.point.y??y-.025;const slopes=samples.map(h=>h?T.MathUtils.clamp(-s*h.face.normal.z/(h.face.normal.y||1),-1,1)*(outer-inner):0);const yy=(2*t**3-3*t*t+1)*h0+(t**3-2*t*t+t)*slopes[0]+(-2*t**3+3*t*t)*h1+(t**3-t*t)*slopes[1];sv.push(x,yy+.001,s*z);su.push(i/SL,t)}}
for(let i=0;i<SL;i++)for(let j=0;j<SW;j++){const a=i*(SW+1)+j,b=a+1,c=a+SW+1;if(s>0)si.push(a,b,c,b,c+1,c);else si.push(a,c,b,b,c,c+1)}const shoulder=mesh('sidepods',geo(sv,si,su),paint);shoulder.material=paint.clone();shoulder.material.side=T.DoubleSide;shoulder.name='sidepod-chassis-shoulder';const coolingTarget=projectionTarget([sidepod,shoulder]);coolingTarget.userData.part='sidepods';topMark(coolingTarget,louvres,.40,s*.535,.66,.13,'sidepod-cooling-louvres');
// Concave body-to-floor fillet: tangent to the floor at its outer edge.
const blendVertices=[],blendIndices=[],blendUV=[],NX=100,NC=20;for(let i=0;i<=NX;i++){const q=interp(podSections.slice(2),i/NX),[x,top,bottom,inn,out]=q,z0=Math.max(inn+.025,out-.135),y0=bottom+.028,z1=Math.min(.715,out+.075),curve=new T.CatmullRomCurve3(podProfile(q).map(([z,y])=>new T.Vector3(0,y,z)),true,'centripetal'),tangent=curve.getTangent(5/8);for(let j=0;j<=NC;j++){const t=j/NC,u=1-t;const z=u*u*u*z0+3*u*u*t*(z0+tangent.z*.075)+3*u*t*t*(z1-.055)+t*t*t*z1,y=u*u*u*y0+3*u*u*t*(y0+tangent.y*.075)+3*u*t*t*.118+t*t*t*.118;blendVertices.push(x,y,s*z);blendUV.push(i/NX,t)}}for(let i=0;i<NX;i++)for(let j=0;j<NC;j++){const a=i*(NC+1)+j,b=a+1,c=a+NC+1,d=c+1;if(s>0)blendIndices.push(a,b,c,b,d,c);else blendIndices.push(a,c,b,b,c,d)}const root=mesh('sidepods',geo(blendVertices,blendIndices,blendUV),paint);root.name='sidepod-floor-fillet';
tube('sidepods',[[-.44,.636,s*.285],[-.44,.663,s*.445],[-.44,.641,s*.632]],.003,gold);
rod('sidepods',[-.46,.66,s*.31],[-.44,.784,s*.58],.007);loft('sidepods',[[-.51,.784,.034,.017],[-.43,.785,.068,.027],[-.32,.776,.055,.021]],paint,s*.58);box('sidepods',.004,.027,.084,metal,[-.315,.777,s*.58]);
surfaceText(sidepod,'Expensify',.48,.345,.89,.149,s,'#f6f5ef');

// Hollow floor entrance: a rounded outer sill around an open notch beside the chassis.
const channelSections=[[-1.04,.125,.568,.708],[-.90,.163,.565,.723],[-.66,.182,.572,.732],[-.43,.194,.546,.730],[-.24,.150,.460,.724],[-.12,.121,.349,.719]];
const gv=[],gi=[],gu=[],GL=84,GC=24;for(let i=0;i<=GL;i++){const[x,height,inner,outer]=interp(channelSections,i/GL);for(let j=0;j<=GC;j++){const t=j/GC,z=T.MathUtils.lerp(inner,outer,t),y=.118+(height-.118)*Math.sin(Math.PI*t)**2;gv.push(x,y,s*z);gu.push(i/GL,t)}}for(let i=0;i<GL;i++)for(let j=0;j<GC;j++){const a=i*(GC+1)+j,b=a+1,c=a+GC+1;if(s>0)gi.push(a,b,c,b,c+1,c);else gi.push(a,c,b,b,c,c+1)}const guide=mesh('floor',geo(gv,gi,gu),carbon);guide.name='hollow-floor-channel-sill';


}
// Low tapered engine cover shares its front boundary and normals with the chassis.
const spineSections=[[.60,1.036,.795],[.80,1.02,.815],[1.04,.945,.675],[1.29,.855,.535],[1.52,.790,.425],[1.76,.755,.345],[1.86,.754,.320]];
for(const side of [-1,1]){const v=[],uv=[],black=[],cap=[],L=112,W=24;for(let i=0;i<=L;i++){const[x,top,bottom]=interp(spineSections,i/L);for(let j=0;j<=W;j++){const t=j/W;v.push(x,T.MathUtils.lerp(bottom,top,t),side*(.005+.007*Math.sin(t*Math.PI)));uv.push(x/1.12,.5+t*.3)}}for(let i=0;i<L;i++)for(let j=0;j<W;j++){const a=i*(W+1)+j,b=a+1,c=a+W+1,d=c+1,ix=j>=W-4?cap:black;if(side>0)ix.push(a,c,b,b,c,d);else ix.push(a,b,c,b,d,c)}mesh('engine',geo(v,black,uv),paint).name='sculpted-engine-spine';mesh('engine',geo(v,cap,uv),gold).name='gold-spine-edge';}
for(let i=0;i<2;i++){const side=i===0?-1:1,cover=bodyRear[i];surfaceText(cover,'SharkNINJA',.87,.730,.45,.094,side);surfaceText(cover,'AMG',1.07,.555,.41,.080,side);}
for(let i=0;i<2;i++){const side=i===0?-1:1;surfaceText(bodyFront[i],'HAYES',.16,.685,.18,.035,side,'#eeeae1');surfaceText(bodyFront[i],'TOMMY HILFIGER',-.82,.515,.30,.075,side);surfaceText(bodyRear[i],'MSC',1.28,.405,.25,.067,side);}
for(const cover of bodyRear){const g=cover.geometry,p=g.attributes.position,idx=g.index.array,chosen=[];for(let k=0;k<idx.length;k+=3){const ids=[idx[k],idx[k+1],idx[k+2]],x=ids.reduce((a,i)=>a+p.getX(i),0)/3,y=ids.reduce((a,i)=>a+p.getY(i),0)/3,z=ids.reduce((a,i)=>a+Math.abs(p.getZ(i)),0)/3;if(x>.72&&x<1.74&&z<.067&&y>.40)chosen.push(...ids)}const patch=g.clone();patch.setIndex(chosen);const material=gold.clone();material.polygonOffset=true;material.polygonOffsetFactor=-1;const accent=mesh('engine',patch,material);accent.name='flush-engine-gold-accent';}
// Rounded trapezoid inlet, thin gold leading edge and recessed duct. No closed bulb.
const airOutline=[[-.104,.946],[-.122,.953],[-.122,1.017],[-.111,1.10],[-.079,1.137],[-.04,1.146],[.04,1.146],[.079,1.137],[.111,1.10],[.122,1.017],[.122,.953],[.104,.946]];
intake('airbox',airOutline,.349,.405,.012,gold);
const intakeFairing=loft('airbox',[[.405,1.046,.126,.098],[.57,1.025,.126,.098],[.78,.987,.115,.084],[.98,.906,.083,.062],[1.12,.792,.047,.041],[1.26,.705,.020,.025]],gold,0,.72);

// Mask only the cavity's back: the forward section remains genuinely open.
const innerOutline=airOutline.map(([z,y])=>[z*.89,1.047+(y-1.047)*.87]);intake('airbox',innerOutline,.365,.402,.004,carbon);
rod('airbox',[.341,.964,0],[.341,1.138,0],.005,carbon);
loft('airbox',[[.29,.847,.055,.015],[.40,.891,.092,.075],[.54,.937,.112,.078]],paint,0,.75);
box('airbox',.094,.026,.25,paint,[.499,1.224,0]);box('airbox',.034,.017,.026,dark,[.449,1.225,0]);rod('airbox',[.5,1.095,0],[.5,1.224,0],.009,carbon);
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
rod('cockpit',[-.31,.66,0],[-.60,.565,0],.016,metal);
loft('cockpit',[[-.64,.548,.060,.050],[-.55,.578,.045,.036]],dark);
for(const side of [-1,1]){tube('halo',[[.39,.813,side*.29],[.43,.777,side*.286],[.48,.734,side*.267]],.028,paint);loft('halo',[[.41,.766,.037,.030,side*.282],[.50,.728,.048,.035,side*.255]],paint);}
// Flatter 2026 floor: no 2022-style Venturi tunnels or rear beam wing.
// The front edge returns around two open notches; no hidden solid plate fills them.
const edge=[[-1.04,.708],[-.74,.735],[.2,.735],[.98,.64],[1.48,.545],[1.67,.400],[1.81,.238],[1.90,.090],[1.922,.035]];
const notch=[[-1.04,.568],[-.90,.565],[-.66,.572],[-.43,.546],[-.24,.460],[-.12,.349],[-.24,.326],[-.45,.307],[-.72,.284],[-1.04,.250]];
const outline=[...edge.map(([x,z])=>[x,-z]),...edge.slice().reverse(),...notch,...notch.slice().reverse().map(([x,z])=>[x,-z])];
const floorShape=new T.Shape();outline.forEach(([x,z],i)=>i?floorShape.lineTo(x,z):floorShape.moveTo(x,z));floorShape.closePath();const floorG=new T.ExtrudeGeometry(floorShape,{depth:.023,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:3});floorG.rotateX(Math.PI/2);const floorPlate=mesh('floor',floorG,carbon,[0,.117,0]);floorPlate.name='notched-floor-platform';
for(let s of [-1,1]){tube('floor',[[-1.03,.122,s*.706],[-.74,.123,s*.733],[.23,.125,s*.735],[.98,.122,s*.645],[1.50,.124,s*.576]],.003,satin);rod('floor',[.45,.16,s*.32],[.52,.127,s*.70],.003,metal)}
for(const side of [-1,1]){const fence=sheet('floor',[[-1.02,.12],[-.64,.12],[-.48,.25],[-.63,.34],[-1.02,.22]],.007,carbon);fence.position.z=side*.65;fence.name='floor-leading-fence';decal(fence,'EA SPORTS',[-.74,.215,side*.659],[.16,.085,.025],[0,side>0?0:Math.PI,0],'#f3f2eb');}
box('floor',2.65,.017,.145,mat('#8a7452',.03,.8),[.35,.085,0]);for(let x of [-.69,.05,.65,1.25])mesh('floor',new T.CylinderGeometry(.04,.04,.02,20),metal,[x,.083,0]);
// Three rear wing elements; two moving flaps, no lower beam wing.
const main=wing('rear',1.78,.99,1.47,.34,carbon,-.04,.014);
for(let k=0;k<2;k++){let x=2.00+k*.13,y=1.08+k*.095;let f=wing('rear',x,y,1.42,.23,k===1?paint:gold,-.04,.01);const pivot=addFlap(f,[x,y,0],-.48);if(k===1){
// Curved upright trailing lip, carrying complete front and rear wordmarks.
const v=[],ix=[],N=80;for(let j=0;j<=N;j++){const z=(j/N-.5)*1.40,e=Math.abs(z)/.70;for(const [xx,yy] of [[2.275,1.12],[2.350,1.255],[2.369,1.255],[2.294,1.12]])v.push(xx,yy-.026*e**6,z)}for(let j=0;j<N;j++)for(let q=0;q<4;q++){const a=j*4+q,b=j*4+(q+1)%4;ix.push(a,a+4,b,b,a+4,b+4)}const lip=mesh('rear',geo(v,ix),paint);lip.name='curved-rear-wing-lip';pivot.attach(lip);
for(const face of [-1,1]){const vv=[],uv=[],ii=[],N=48;for(let j=0;j<=N;j++){const u=j/N,z=face*(.5-u)*1.29,e=Math.abs(z)/.70;for(let row=0;row<2;row++){const t=row? .94:.10;vv.push((face>0?2.294:2.275)+t*.075+face*.0008,1.12+t*.135-.026*e**6,z);uv.push(u,row)}}for(let j=0;j<N;j++){const a=j*2;ii.push(a,a+1,a+2,a+1,a+3,a+2)}const material=new T.MeshPhysicalMaterial({map:textTexture(face>0?'APXGP':'Expensify','#f6f3e9'),transparent:true,depthWrite:false,roughness:.45,metalness:0,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});const label=mesh('rear',geo(vv,ii,uv),material);label.name=face>0?'rear-APXGP-wordmark':'rear-Expensify-wordmark';label.castShadow=false;pivot.attach(label);}
}}
for(let s of [-1,1]){let end=sheet('rear',[[1.78,.87],[1.80,1.075],[2.09,1.245],[2.35,1.225],[2.37,.895],[2.14,.84]],.013,gold);end.position.z=s*.746;decal(end,'GEICO',[2.10,1.04,s*.76],[.30,.055,.09],[0,s===1?0:Math.PI,0],'#f5f1e7');tube('rear',[[1.49,.33,s*.16],[1.61,.72,s*.16],[1.84,1.0,s*.16]],.018,carbon);tube('rear',[[1.79,1.083,s*.746],[2.10,1.253,s*.746],[2.35,1.232,s*.746]],.004,gold)}
rod('rear',[1.84,1.03,0],[2.15,1.19,0],.009,metal);topMark(main,textTexture('Expensify','#f5f4ec'),1.87,0,.16,1.04,'rear-Expensify');
// Sculpted slick tyre profile and exposed deep-dish spoke rims.
const sidewall=canvasTexture(1024,1024,c=>{c.translate(512,512);c.fillStyle='#e4d82a';c.textAlign='center';c.font='bold 73px Arial';const arc=(word,r,step,offset)=>{for(let i=0;i<word.length;i++){c.save();c.rotate(offset+(i-(word.length-1)/2)*step);c.translate(0,-r);c.fillText(word[i],0,0);c.restore()}};arc('PIRELLI',382,.137,0);arc('P ZERO',382,.15,Math.PI);c.strokeStyle='#e4d82a';c.lineWidth=10;for(let r of [350,444]){c.beginPath();c.arc(0,0,r,.45,2.5);c.stroke();c.beginPath();c.arc(0,0,r,3.6,5.65);c.stroke()}c.fillStyle='#8e938a';c.font='22px Arial';c.fillText('2026 · R18',0,302)});const sideMat=new T.MeshPhysicalMaterial({map:sidewall,transparent:true,depthWrite:false,roughness:.86,metalness:0,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
for(let x of [-1.7,1.7])for(let s of [-1,1]){let front=x<0,w=front?.28:.375,r=front?.3525:.355,z=s*(.938-w/2),yc=r+.015;
let raw=[[.223,-w/2],[.26,-w*.507],[.309,-w*.501],[.337,-w*.446],[r,-w*.35],[r,w*.35],[.337,w*.446],[.309,w*.501],[.26,w*.507],[.223,w/2]];let profile=new T.SplineCurve(raw.map(a=>new T.Vector2(...a))).getPoints(48);mesh('tyres',new T.LatheGeometry(profile,128),rubber,[x,yc,z],[Math.PI/2,0,0]);
// Shallow dished aerodynamic cover on the outer face, matching the reference wheels.
const coverProfile=[[.040,0],[.058,.008],[.105,.014],[.16,.008],[.212,-.002],[.225,-.009]];
const cover=mesh('tyres',new T.LatheGeometry(coverProfile.map(([rr,d])=>new T.Vector2(rr,d)),96),carbon,[x,yc,z+s*w*.505],[s*Math.PI/2,0,0]);cover.name='aerodynamic-wheel-cover';
mesh('tyres',new T.CylinderGeometry(.033,.033,.035,12),gold,[x,yc,z+s*w*.515],[Math.PI/2,0,0]);
// The hollow barrel and paired spokes remain behind the fitted cover.

mesh('tyres',new T.CylinderGeometry(.226,.226,w*.85,80,1,true),satin,[x,yc,z],[Math.PI/2,0,0]);
for(let face of [-1,1]){let fz=z+face*w*.51;let ring=mesh('tyres',new T.RingGeometry(.247,r*.994,128),sideMat,[x,yc,fz]);if(face<0)ring.rotation.y=Math.PI;
mesh('tyres',new T.TorusGeometry(.227,.004,10,96),satin,[x,yc,fz]);mesh('tyres',new T.TorusGeometry(.217,.008,8,96),satin,[x,yc,fz-face*.022]);mesh('tyres',new T.CylinderGeometry(.052,.055,.032,12),satin,[x,yc,fz-face*.06],[Math.PI/2,0,0]);
for(let i=0;i<10;i++){let a=i/10*Math.PI*2;for(let offset of [-.017,.017]){let a2=a+offset;rod('tyres',[x+Math.cos(a2)*.05,yc+Math.sin(a2)*.05,fz-face*.07],[x+Math.cos(a2+.08)*.22,yc+Math.sin(a2+.08)*.22,fz-face*.024],.007,satin)}mesh('tyres',new T.SphereGeometry(.004,6,6),metal,[x+Math.cos(a)*.188,yc+Math.sin(a)*.188,fz-face*.016])}
mesh('tyres',new T.TorusGeometry(.14,.025,8,64),carbon,[x,yc,fz-face*.094]);}
let inner=z-s*w*.35;rod('suspension',[x,.23,inner],[x,.48,inner],.030,satin);mesh('suspension',new T.CylinderGeometry(.14,.14,.035,60),satin,[x,yc,inner],[Math.PI/2,0,0]);box('suspension',.07,.16,.045,metal,[x-.11,yc,inner-s*.03]);
for(let i=0;i<18;i++){let a=i/18*Math.PI*2;mesh('suspension',new T.SphereGeometry(.006,6,6),dark,[x+Math.cos(a)*.11,yc+Math.sin(a)*.11,inner+s*.020])}
// Streamlined suspension blades with a rounded leading edge and thin trailing edge.
function blade(a,b,chord){const vs=[],ix=[],uv=[];for(let i=0;i<=12;i++){const t=i/12;for(let j=0;j<=24;j++){const th=j*Math.PI/12,f=(1-Math.cos(th))*.5;vs.push(T.MathUtils.lerp(a[0],b[0],t)+(f-.32)*chord*(.76+.24*Math.sin(Math.PI*t)),T.MathUtils.lerp(a[1],b[1],t)+.011*Math.sin(th)*(1-.52*f),T.MathUtils.lerp(a[2],b[2],t));uv.push(t,j/24)}}for(let i=0;i<12;i++)for(let j=0;j<24;j++){const n=i*25+j;if(s>0)ix.push(n,n+1,n+25,n+1,n+26,n+25);else ix.push(n,n+25,n+1,n+1,n+25,n+26)}const m=carbon.clone();m.side=T.DoubleSide;mesh('suspension',geo(vs,ix,uv),m)}
let attach=front?-1.0:1.14,outer=z-s*w*.35;for(let y of [.25,.48]){blade([attach-.29,front&&y<.3?.34:y,s*(front?(y<.3?.095:.15):.16)],[x,y,outer],.052);blade([attach+.26,y,s*(front?.25:.10)],[x,y,outer],.045)}rod('suspension',[attach,front?.61:.47,s*(front?.18:.13)],[x,.23,outer],.012);rod('suspension',[attach-.18,.32,s*(front?.20:.14)],[x-.07,.36,outer],.007,metal);mesh('suspension',new T.SphereGeometry(.024,16,12),satin,[x,.48,outer]);
}
// Front tyre wake deflectors, mounted to the inboard upright rather than floating over the tyre.
for(const side of [-1,1]){const v=[],ix=[],uv=[],N=48;for(let i=0;i<=N;i++){const a=.38+i/N*1.43;for(let j=0;j<=8;j++){const z=side*(.662+j/8*.110),rr=.373+.009*Math.sin(j/8*Math.PI);v.push(-1.7+Math.cos(a)*rr,.3675+Math.sin(a)*rr,z);uv.push(i/N,j/8)}}for(let i=0;i<N;i++)for(let j=0;j<8;j++){const a=i*9+j;ix.push(a,a+1,a+9,a+1,a+10,a+9)}const m=carbon.clone();m.side=T.DoubleSide;mesh('suspension',geo(v,ix,uv),m).name='front-tyre-deflector';rod('suspension',[-1.7,.48,side*.70],[-1.60,.731,side*.67],.009,carbon);}
// Thermal and fabrication detail: exhaust, rear rain light, fasteners, body seams.
mesh('engine',new T.CylinderGeometry(.038,.042,.50,32,true),metal,[1.86,.335,0],[0,0,Math.PI/2]);mesh('engine',new T.CircleGeometry(.033,32),dark,[2.112,.335,0],[0,Math.PI/2,0]);
const lightmat=mat('#991c0a',.1,.3);lightmat.emissive.set('#ff2305');lightmat.emissiveIntensity=.6;box('diffuser',.014,.05,.065,lightmat,[2.02,.294,0]);for(let s of [-1,1])box('rear',.025,.05,.014,lightmat,[2.34,.90,s*.758]);
for(const side of [-1,1])for(let i=0;i<5;i++){const x=-1.55+i*.17,z=side*(.10+i*.018),ray=new T.Raycaster(new T.Vector3(x,1.5,z),new T.Vector3(0,-1,0)),hit=ray.intersectObject(nose)[0];if(hit)mesh('nose',new T.SphereGeometry(.0025,8,6),metal,[x,hit.point.y+.0007,z]);}
// Sweep the inlet, duct, fillet and attached lettering in the same coordinate field.
for(const m of groups.sidepods.children){if(!m.isMesh)continue;m.updateMatrix();const inv=m.matrix.clone().invert(),g=m.geometry,p=g.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrix);const lateral=T.MathUtils.smoothstep(Math.abs(v.z),.33,.70),front=1-T.MathUtils.smoothstep(v.x,-.33,.45);v.x+=front*lateral*(.14+.27*(1-T.MathUtils.smoothstep(v.y,.20,.66)));v.applyMatrix4(inv);p.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox()}
// Consistent metre-scaled lacquer mapping across every painted panel.
for(const group of Object.values(groups))for(const m of group.children){if(!m.isMesh||!m.material.map||m.material.map!==cross)continue;const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv;if(!uv)continue;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);uv.setXY(i,(x+2.615)/1.12,(z*.7+y*.3)/1.1+.5)}uv.needsUpdate=true;}
// Reduce the complete wing assembly around its own centre, independently of the nose.
groups.front.scale.set(1,1,1);groups.front.position.x=0;
// Reference rear-wing height; deform attached geometry together in car coordinates.
car.updateMatrixWorld(true);
groups.rear.traverse(m=>{if(!m.isMesh)return;const inv=m.matrixWorld.clone().invert(),v=new T.Vector3(),p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);if(v.y>.4)v.y=.4+(v.y-.4)*.84;v.applyMatrix4(inv);p.setXYZ(i,v.x,v.y,v.z)}m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();});
for(const {pivot} of activeFlaps.filter(f=>f.pivot.parent===groups.rear)){const old=pivot.position.y;pivot.position.y=.4+(old-.4)*.84;for(const m of pivot.children)m.position.y+=old-pivot.position.y;}
car.updateMatrixWorld(true);
return {car,groups,pickables,activeFlaps,materials:{paint,gold,carbon,rubber},meshCount:pickables.length,dimensions:{wheelbase:3.4,width:1.9},setAero(t){activeFlaps.forEach(({pivot,angle})=>pivot.rotation.z=angle*t)}};
}
