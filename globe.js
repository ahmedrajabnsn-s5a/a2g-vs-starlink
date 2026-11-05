/* SKYGLOBE: holographic 3D coverage globe (same look as the A2G Coverage Globe).
   Layers: A2G full-plan countries + 150 km reach (cyan), Starlink-available land (amber),
   routes split by who covers each stretch. Needs THREE r147 + examples, d3, topojson,
   window.__J['countries-50m.json'] and window.COVDATA. */
(function(){
const R=100, CD=window.COVDATA;
const COL={both:[238,246,255],a2g:[63,216,255],leo:[255,157,69],none:[255,90,110]};
const HEX={both:'#eef6ff',a2g:'#3fd8ff',leo:'#ff9d45',none:'#ff5a6e'};
let FEATS=null;
function feats(){ if(FEATS) return FEATS; const t=window.__J['countries-50m.json']; FEATS=topojson.feature(t,t.objects.countries).features; return FEATS; }
function ll2v(lon,lat,r){ r=r||R; const phi=(lon+180)/360*Math.PI*2, la=lat*Math.PI/180;
  return new THREE.Vector3(-Math.cos(phi)*Math.cos(la)*r, Math.sin(la)*r, Math.sin(phi)*Math.cos(la)*r); }
function cls(f1,f2,L){const A=(f1&1)&&(f2&1),S=(f1&2)&&(f2&2); if(L==='a2g') return A?'a2g':'none'; if(L==='leo') return S?'leo':'none'; return A&&S?'both':A?'a2g':S?'leo':'none';}
const OKS=new Set(['launched','available']);
function texture(w,L){ L=L||'both'; const SHOW_A=L!=='leo', SHOW_S=L!=='a2g';
  const cv=document.createElement('canvas'); cv.width=w; cv.height=w/2; const c=cv.getContext('2d');
  const proj=d3.geoEquirectangular().scale(w/(2*Math.PI)).translate([w/2,w/4]).precision(0.1); const path=d3.geoPath(proj,c);
  const g=c.createLinearGradient(0,0,0,w/2); g.addColorStop(0,'rgba(4,12,30,.7)'); g.addColorStop(.5,'rgba(6,18,42,.62)'); g.addColorStop(1,'rgba(4,12,30,.7)');
  c.fillStyle=g; c.fillRect(0,0,w,w/2);
  c.beginPath(); path(d3.geoGraticule10()); c.strokeStyle='rgba(170,225,255,.09)'; c.lineWidth=w/4096; c.stroke();
  const F=feats(), info=n=>CD.countries[n]||{};
  for(const f of F){ c.beginPath(); path(f); c.fillStyle='rgba(18,34,72,.62)'; c.fill(); }
  // Starlink-available land (amber)
  if(SHOW_S) for(const f of F){ const i=info(f.properties.name); if(!OKS.has(i.sl)) continue; c.beginPath(); path(f); c.fillStyle=i.slFut?(L==='leo'?'rgba(240,190,140,.34)':'rgba(232,180,128,.26)'):(L==='leo'?'rgba(214,132,52,.6)':'rgba(190,118,48,.42)'); c.fill(); }
  // A2G 150 km reach: a band around each plan country, 2 x 150 km wide
  const band=w/360*(2*CD.buffer_km/111);
  c.lineJoin='round'; c.lineCap='round';
  if(SHOW_A) for(const f of F){ if(!info(f.properties.name).plan) continue; c.beginPath(); path(f); c.lineWidth=band; c.strokeStyle=info(f.properties.name).planFut?'rgba(150,230,255,.09)':'rgba(63,216,255,.16)'; c.stroke(); }
  if(SHOW_A) for(const f of F){ if(!info(f.properties.name).plan) continue; c.beginPath(); path(f); c.fillStyle=info(f.properties.name).planFut?'rgba(140,215,245,.22)':'rgba(38,150,205,.5)'; c.fill(); }
  c.beginPath(); for(const f of F) path(f); c.strokeStyle='rgba(110,150,220,.4)'; c.lineWidth=w/2600; c.stroke();
  if(SHOW_A) for(const f of F){ const i=info(f.properties.name); if(!i.plan) continue; c.beginPath(); path(f); c.shadowColor='rgb(70,222,255)'; c.shadowBlur=i.planFut?0:w/900; c.strokeStyle=i.planFut?'rgba(170,235,255,.45)':'rgba(150,240,255,.9)'; c.lineWidth=w/1500; c.stroke(); c.shadowBlur=0; }
  if(SHOW_S) for(const f of F){ const i=info(f.properties.name); if(!OKS.has(i.sl)||(i.plan&&SHOW_A)) continue; c.beginPath(); path(f); c.strokeStyle='rgba(255,190,120,.75)'; c.lineWidth=w/1800; c.stroke(); }
  const t=new THREE.CanvasTexture(cv); t.anisotropy=8; return t;
}
const TEX={}; function tex(L){ L=L||'both'; const k=L+'|'+(window.SKYSTATE||window.SKYMODE||'plan'); return TEX[k]||(TEX[k]=texture(4096,L)); }

function create(canvas,opt){
  opt=opt||{}; const W=()=>opt.width||canvas.clientWidth||800, H=()=>opt.height||canvas.clientHeight||600;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,failIfMajorPerformanceCaveat:false});
  if(!renderer.getContext()) throw new Error('WebGL unavailable');
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault(); if(opt.onLost) opt.onLost();},false);
  renderer.setPixelRatio(opt.pixelRatio||Math.min(2,devicePixelRatio)); renderer.setSize(W(),H(),false);
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x030916);
  const camera=new THREE.PerspectiveCamera(40,W()/H(),1,5000); camera.position.set(0,60,330);
  let controls=null; if(opt.interactive){ controls=new THREE.OrbitControls(camera,canvas); controls.enableDamping=true; controls.enablePan=false; controls.minDistance=130; controls.maxDistance=700; controls.rotateSpeed=.5; }
  const globe=new THREE.Group(); scene.add(globe);
  let layer=opt.layer||'both'; const T=tex(layer);
  const backM=new THREE.MeshBasicMaterial({map:T,transparent:true,opacity:.2,side:THREE.BackSide,depthWrite:false}), frontM=new THREE.MeshBasicMaterial({map:T,transparent:true,opacity:.95});
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R*.998,96,72),backM));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R,160,120),frontM));
  { const pos=[]; for(const l of d3.geoGraticule().step([10,10]).lines()){ const q=l.coordinates; for(let i=0;i<q.length-1;i++){ const a=ll2v(q[i][0],q[i][1],R*1.003), b=ll2v(q[i+1][0],q[i+1][1],R*1.003); pos.push(a.x,a.y,a.z,b.x,b.y,b.z);} }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); globe.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xbfe6ff,transparent:true,opacity:.22,depthWrite:false}))); }
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R*1.12,64,48),new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
    vertexShader:'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 vN; void main(){ float i=pow(0.72-dot(vN,vec3(0.,0.,1.)),3.0); gl_FragColor=vec4(0.45,0.72,1.0,1.0)*i*0.55; }'})));
  const holo=new THREE.ShaderMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,uniforms:{uT:{value:0}},
    vertexShader:'varying vec3 vN; varying float vY; void main(){ vN=normalize(normalMatrix*normal); vY=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform float uT; varying vec3 vN; varying float vY; void main(){ float fr=pow(1.0-abs(dot(vN,vec3(0.,0.,1.))),3.0); float sweep=mod(uT*14.0,260.0)-130.0; float band=exp(-pow((vY-sweep)/3.5,2.0)); vec3 c=vec3(0.30,0.78,1.0)*(fr*0.2+band*0.05)+vec3(0.3,0.75,1.0)*(fr*0.06+0.012); gl_FragColor=vec4(c,1.0);}'});
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R*1.012,96,72),holo));
  { const n=2200,p=new Float32Array(n*3); for(let i=0;i<n;i++){ const v=new THREE.Vector3().randomDirection().multiplyScalar(1400+Math.random()*1200); p.set([v.x,v.y,v.z],i*3);} const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3)); scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xbfffe6,size:1.5,sizeAttenuation:false,transparent:true,opacity:.5}))); }
  const composer=new THREE.EffectComposer(renderer); composer.addPass(new THREE.RenderPass(scene,camera));
  const bloom=new THREE.UnrealBloomPass(new THREE.Vector2(W(),H()),.22,.4,.8); composer.addPass(bloom);
  composer.setSize(W(),H());
  const routes=new THREE.Group(); globe.add(routes); let mats=[], comet=null, cometData=[], apList=[];
  function clear(){ for(const o of routes.children.slice()){ routes.remove(o); o.geometry.dispose(); o.material.dispose(); } mats=[]; comet=null; cometData=[]; apList=[]; }
  function mat(width,color,opacity,dashed){ const m=new THREE.LineMaterial({color:new THREE.Color(`rgb(${color.join(',')})`),linewidth:width,transparent:true,opacity,depthWrite:false,dashed:!!dashed,dashSize:.9,gapSize:1.3});
    if(dashed) m.defines.USE_DASH=''; m.resolution.set(W(),H()); mats.push(m); return m; }
  let lastNames=[];
  function setLayer(L){ layer=L||'both'; const t=tex(layer); backM.map=t; frontM.map=t; backM.needsUpdate=frontM.needsUpdate=true; show(lastNames); }
  function show(names){
    lastNames=names; clear(); const ap=new Map(), hubs=new Set(), seen=new Set(), deg=new Map();
    for(const n of names){ const a=CD.airlines[n]; if(!a) continue; a.hubs.forEach(h=>hubs.add(h));
      for(const r of a.routes){ const key=[r.o,r.d].sort().join('-'); [r.o,r.d].forEach(c=>deg.set(c,(deg.get(c)||0)+1)); if(seen.has(key)) continue; seen.add(key); const P=r.pts, nP=P.length; const h=Math.min(12,1.2+r.km/700); const vs=P.map((p,i)=>ll2v(p[0],p[1],R+0.5+h*Math.sin(Math.PI*i/(nP-1))));
        // runs of the same class
        let i=0; while(i<nP-1){ const k=cls(P[i][2],P[i+1][2],layer); let j=i+1; while(j<nP-1&&cls(P[j][2],P[j+1][2],layer)===k) j++;
          const pos=[]; for(let q=i;q<=j;q++) pos.push(vs[q].x,vs[q].y,vs[q].z);
          const g=new THREE.LineGeometry(); g.setPositions(pos);
          const halo=new THREE.Line2(g,mat(k==='none'?2.5:4,COL[k],k==='none'?.05:.1)); halo.computeLineDistances(); routes.add(halo);
          const g2=new THREE.LineGeometry(); g2.setPositions(pos);
          const line=new THREE.Line2(g2,mat(k==='none'?1.2:1.8,COL[k],k==='none'?.7:.92,k==='none')); line.computeLineDistances(); routes.add(line);
          i=j; }
        cometData.push({vs,ph:Math.random(),sp:.04+.25/Math.max(1,r.km/1000)});
        [r.o,r.d].forEach(c=>{ const p=CD.airports[c]; if(p) ap.set(c,p); }); } }
    const mk=(list,lift)=>{ const a=new Float32Array(list.length*3); list.forEach((c,i)=>{ const p=ap.get(c), v=ll2v(p.lon,p.lat,R+lift); a.set([v.x,v.y,v.z],i*3); }); const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(a,3)); return g; };
    const codes=[...ap.keys()]; apList=codes.map(c=>({c,hub:hubs.has(c),p:ap.get(c),w:(hubs.has(c)?1e6:0)+(deg.get(c)||0)})).sort((x,y)=>y.w-x.w);
    routes.add(new THREE.Points(mk(codes.filter(c=>!hubs.has(c)),.6),new THREE.PointsMaterial({color:0xe9f6ff,size:3.5,sizeAttenuation:false,transparent:true,depthWrite:false})));
    routes.add(new THREE.Points(mk(codes.filter(c=>hubs.has(c)),.7),new THREE.PointsMaterial({color:0xffffff,size:8,sizeAttenuation:false,transparent:true,depthWrite:false})));
    const cg=new THREE.BufferGeometry(); cg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(cometData.length*3),3));
    comet=new THREE.Points(cg,new THREE.PointsMaterial({color:0xffffff,size:3,sizeAttenuation:false,transparent:true,depthWrite:false})); routes.add(comet);
  }
  // camera framing for a set of airlines
  function frame(names){
    const v=new THREE.Vector3(), pts=[]; for(const n of names){ const a=CD.airlines[n]; if(!a) continue; for(const r of a.routes) for(const p of r.pts){ const u=ll2v(p[0],p[1],1); pts.push(u); v.add(u);} }
    if(!pts.length) return {dir:new THREE.Vector3(0,.4,1).normalize(),dist:330};
    v.normalize(); let th=0; for(const u of pts) th=Math.max(th,Math.acos(Math.min(1,u.dot(v))));
    const aspect=W()/H(), half=Math.min(20*Math.PI/180*Math.min(1,aspect),20*Math.PI/180);
    const s=R*Math.sin(th), back=R*Math.cos(th); let dist=s/Math.tan(half)*1.12+back; dist=Math.max(170,Math.min(620,dist));
    // tilt slightly so the arcs read
    return {dir:v,dist};
  }
  let flight=null;
  function focus(names,instant){ const f=frame(names); const to=f.dir.clone().multiplyScalar(f.dist);
    if(instant||!opt.interactive){ camera.position.copy(to); camera.lookAt(0,0,0); if(controls) controls.update(); return; }
    flight={t0:performance.now(),from:camera.position.clone(),to}; }
  function resize(){ const w=W(),h=H(); camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); composer.setSize(w,h); mats.forEach(m=>m.resolution.set(w,h)); }
  let last=performance.now(), raf=0, run=!!(opt.interactive||opt.loop);
  function step(now,dt){ holo.uniforms.uT.value=now/1000;
    if(flight){ const k=Math.min(1,(now-flight.t0)/1300), e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2; const a=flight.from.clone().normalize(), b=flight.to.clone().normalize();
      const d=flight.from.length()+(flight.to.length()-flight.from.length())*e; const dir=a.lerp(b,e).normalize(); camera.position.copy(dir.multiplyScalar(d)); camera.lookAt(0,0,0); if(k>=1) flight=null; }
    if(comet){ const pos=comet.geometry.attributes.position; cometData.forEach((o,i)=>{ o.ph=(((o.ph+dt*o.sp)%1)+1)%1; const f=o.ph*(o.vs.length-1), j=Math.floor(f), t=f-j, a=o.vs[j], b=o.vs[Math.min(j+1,o.vs.length-1)]; pos.setXYZ(i,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t); }); pos.needsUpdate=true; }
    if(controls) controls.update(); composer.render(); }
  function loop(now){ const dt=Math.max(0,Math.min(.05,(now-last)/1000)); last=now; step(now,dt); if(opt.onFrame) opt.onFrame(); raf=requestAnimationFrame(loop); }
  if(run) raf=requestAnimationFrame(loop);
  function project(lon,lat){ const v=ll2v(lon,lat,R+0.8); const facing=v.clone().normalize().dot(camera.position.clone().normalize()); const p=v.project(camera); return {x:(p.x+1)/2*W(),y:(1-p.y)/2*H(),vis:facing>0.15}; }
  function renderOnce(){ if(comet) comet.visible=false; step(performance.now(),0); if(comet) comet.visible=true; }
  return {show,focus,resize,project,renderOnce,setLayer,canvas,camera,airports:()=>apList,stop:()=>cancelAnimationFrame(raf)};
}
// ---------- snapshot for PPT: an offscreen globe, labels and legend drawn on top
let OFF=null;
function snapshot(names,o){ o=o||{}; if((o.style||window.SKYPPTMAP)==='flat'&&window.SKYFLAT) return SKYFLAT.snapshot(names,o); try{ const url=snap3d(names,o); if(url) return url; }catch(e){ console.warn('3D snapshot failed, using flat map',e); OFF=null; }
  return window.SKYFLAT?SKYFLAT.snapshot(names,o):''; }
function looksBlank(cv){ try{ const c=document.createElement('canvas'); c.width=64; c.height=50; const g=c.getContext('2d'); g.drawImage(cv,0,0,64,50); const d=g.getImageData(0,0,64,50).data; let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2]; return s/(d.length/4)<40; }catch(e){ return false; } }
function snap3d(names,o){ const w=o.w||1920,h=o.h||1500;
  if(!OFF||OFF.w!==w||OFF.h!==h){ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; OFF={w,h,g:create(cv,{width:w,height:h,pixelRatio:1})}; }
  const G=OFF.g; G.setLayer(o.layer||'both'); G.show(names); G.focus(names,true); G.renderOnce();
  if(looksBlank(G.canvas)){ OFF=null; return null; }
  const out=document.createElement('canvas'); out.width=w; out.height=h; const c=out.getContext('2d'); c.drawImage(G.canvas,0,0);
  c.textBaseline='middle'; const fs=Math.round(w/88);
  const taken=[]; for(const a of G.airports()){ const p=G.project(a.p.lon,a.p.lat); if(!p.vis) continue;
    const bw=(a.hub?fs*1.3:fs)*0.62*a.c.length+6, bh=(a.hub?fs*1.3:fs)+4, bx=p.x+10, by=p.y-12-bh/2; if(taken.some(t=>bx<t[0]+t[2]&&bx+bw>t[0]&&by<t[1]+t[3]&&by+bh>t[1])) continue; taken.push([bx,by,bw,bh]);
    c.font=`${a.hub?700:600} ${a.hub?fs*1.3:fs}px "IBM Plex Mono", monospace`; c.lineWidth=5; c.strokeStyle='rgba(3,9,22,.9)'; c.strokeText(a.c,p.x+10,p.y-12); c.fillStyle=a.hub?'#ffffff':'#d7e8f7'; c.fillText(a.c,p.x+10,p.y-12); }
  if(o.legend!==false){ const L=o.layer||'both'; const items=L==='a2g'?[['a2g',(window.SKYCOV?SKYCOV.T('A2G full plan covers'):'A2G full plan covers')],['none','No A2G']]:L==='leo'?[['leo','Starlink covers'],['none','No Starlink']]:[['both','Both networks'],['a2g',(window.SKYCOV?SKYCOV.T('A2G full plan only'):'A2G full plan only')],['leo','Starlink only'],['none','Neither']]; const y=h-fs*2.6;
    c.fillStyle='rgba(3,9,22,.72)'; c.fillRect(0,y-fs*1.8,w,fs*3.6);
    c.font=`500 ${fs}px "IBM Plex Sans", sans-serif`; let x=w*0.03;
    for(const [k,t] of items){ c.strokeStyle=HEX[k]; c.lineWidth=fs*.35; c.setLineDash(k==='none'?[fs*.5,fs*.45]:[]); c.beginPath(); c.moveTo(x,y); c.lineTo(x+fs*2.6,y); c.stroke(); c.setLineDash([]); c.fillStyle='#e9f2fb'; c.fillText(t,x+fs*3.2,y); x+=fs*3.2+c.measureText(t).width+fs*1.8; }
    if(L!=='leo'){ c.fillStyle='rgba(38,150,205,.7)'; c.fillRect(x,y-fs*.55,fs*2,fs*1.1); c.fillStyle='#e9f2fb'; c.fillText((window.SKYMODE==='now'?'A2G today + ':'A2G plan + ')+CD.buffer_km+' km',x+fs*2.6,y); x+=fs*2.6+c.measureText((window.SKYMODE==='now'?'A2G today + ':'A2G plan + ')+CD.buffer_km+' km').width+fs*1.8; }
    if(L!=='leo'&&window.SKYMODE!=='now'){ c.fillStyle='rgba(140,215,245,.5)'; c.fillRect(x,y-fs*.55,fs*2,fs*1.1); c.fillStyle='#e9f2fb'; c.fillText('A2G future',x+fs*2.6,y); x+=fs*2.6+c.measureText('A2G future').width+fs*1.8; }
    if(L!=='a2g'){ c.fillStyle='rgba(190,118,48,.85)'; c.fillRect(x,y-fs*.55,fs*2,fs*1.1); c.fillStyle='#e9f2fb'; c.fillText('Starlink available',x+fs*2.6,y); x+=fs*2.6+c.measureText('Starlink available').width+fs*1.8;
      if(Object.values(CD.countries).some(q=>q.slFut)){ c.fillStyle='rgba(240,190,140,.55)'; c.fillRect(x,y-fs*.55,fs*2,fs*1.1); c.fillStyle='#e9f2fb'; c.fillText('Starlink future',x+fs*2.6,y); } } }
  if(o.title){ c.font=`700 ${Math.round(fs*1.9)}px "Chakra Petch", sans-serif`; c.fillStyle='#ffffff'; c.textBaseline='top'; c.fillText(o.title,w*0.03,h*0.03); }
  return out.toDataURL('image/png');
}
function supported(){ try{ const c=document.createElement('canvas'); return !!(c.getContext('webgl2')||c.getContext('webgl')); }catch(e){ return false; } }
window.SKYGLOBE={create,snapshot,supported,looksBlank,cls,HEX};
})();
