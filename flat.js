/* SKYFLAT: flat 2D coverage map (fallback when WebGL is unavailable, and the "Flat" view).
   Same colours as SKYGLOBE. Needs d3, topojson, window.__J['countries-50m.json'], COVDATA. */
(function(){
const CD=window.COVDATA, HEX={both:'#eef6ff',a2g:'#3fd8ff',leo:'#ff9d45',none:'#ff5a6e'}, OKS=new Set(['launched','available']);
let F=null; const feats=()=>F||(F=(t=>topojson.feature(t,t.objects.countries).features)(window.__J['countries-50m.json']).filter(f=>f.properties.name!=='Antarctica'));
const cls=(a,b,L)=>{const A=(a&1)&&(b&1),S=(a&2)&&(b&2); if(L==='a2g') return A?'a2g':'none'; if(L==='leo') return S?'leo':'none'; return A&&S?'both':A?'a2g':S?'leo':'none';};
function draw(cv,names,o){ o=o||{}; const L=o.layer||'both', SA=L!=='leo', SS=L!=='a2g'; const c=cv.getContext('2d'), W=cv.width, H=cv.height, legendH=o.legend===false?0:Math.round(H*0.09);
  let routes=[]; const hubs=new Set(); for(const n of names){const a=CD.airlines[n]; if(!a) continue; a.hubs.forEach(h=>hubs.add(h)); routes.push(...a.routes);}
  const fc={type:'FeatureCollection',features:routes.map(r=>({type:'Feature',geometry:{type:'LineString',coordinates:r.pts.map(p=>[p[0],p[1]])}}))};
  const proj=d3.geoMercator(); if(routes.length) proj.fitExtent([[W*.05,H*.06],[W*.95,H-legendH-H*.05]],fc); else proj.fitSize([W,H-legendH],{type:'Sphere'});
  const path=d3.geoPath(proj,c);
  c.fillStyle='#061226'; c.fillRect(0,0,W,H);
  c.beginPath(); path(d3.geoGraticule().step([10,10])()); c.strokeStyle='rgba(140,190,240,.07)'; c.lineWidth=1; c.stroke();
  const info=n=>CD.countries[n]||{}, FS=feats();
  for(const f of FS){ c.beginPath(); path(f); c.fillStyle='#13233b'; c.fill(); }
  if(SS) for(const f of FS){ const i=info(f.properties.name); if(!OKS.has(i.sl)) continue; c.beginPath(); path(f); c.fillStyle=i.slFut?'rgba(226,176,128,.3)':'rgba(190,118,48,.6)'; c.fill(); }
  // 150 km reach band: pixels per km at the map centre
  const ctr=proj.invert([W/2,(H-legendH)/2])||[50,25], p0=proj(ctr), p1=proj([ctr[0],ctr[1]+1]), pxKm=Math.abs(p1[1]-p0[1])/111;
  c.lineJoin='round';
  if(SA) for(const f of FS){ if(!info(f.properties.name).plan) continue; c.beginPath(); path(f); c.lineWidth=Math.max(2,2*CD.buffer_km*pxKm); c.strokeStyle=info(f.properties.name).planFut?'rgba(150,230,255,.08)':'rgba(63,216,255,.15)'; c.stroke(); }
  if(SA) for(const f of FS){ if(!info(f.properties.name).plan) continue; c.beginPath(); path(f); c.fillStyle=info(f.properties.name).planFut?'rgba(140,215,245,.24)':'rgba(38,150,205,.55)'; c.fill(); }
  c.beginPath(); for(const f of FS) path(f); c.strokeStyle='rgba(110,150,220,.45)'; c.lineWidth=Math.max(1,W/2400); c.stroke();
  if(SA) for(const f of FS){ if(!info(f.properties.name).plan) continue; c.beginPath(); path(f); c.strokeStyle=info(f.properties.name).planFut?'rgba(170,235,255,.4)':'rgba(150,240,255,.85)'; c.lineWidth=Math.max(1,W/1600); c.stroke(); }
  const lw=Math.max(1.1,W/1150); c.lineCap='round'; const seen=new Set(); routes=routes.filter(r=>{const k=[r.o,r.d].sort().join('-'); if(seen.has(k)) return false; seen.add(k); return true;});
  const sel=window.SKYSEL||null, gcOn=(window.SKYSHAPE||'gc')==='gc';
  const drawRun=(P,i,j,k,dim,hi)=>{ c.beginPath(); path({type:'LineString',coordinates:P.slice(i,j+1).map(p=>[p[0],p[1]])});
    c.strokeStyle=HEX[k]; c.globalAlpha=dim?.18:(k==='none'?.7:.92); c.lineWidth=hi?lw*2.2:lw; if(k==='none') c.setLineDash([lw*1.6,lw*2.4]);
    if(hi&&k!=='none'){ c.shadowColor=HEX[k]; c.shadowBlur=lw*6; } c.stroke(); c.shadowBlur=0; c.setLineDash([]); c.globalAlpha=1; };
  const order=routes.map(r=>{ const key=[r.o,r.d].sort().join('-'); return {r,hi:sel===key}; }).sort((x,y)=>x.hi-y.hi);
  for(const {r,hi} of order){ const P=hi||!gcOn||!r.gc||r.gc.length<2?r.pts:r.gc, dim=!!sel&&!hi; let i=0;
    while(i<P.length-1){ const k=cls(P[i][2],P[i+1][2],L); let j=i+1; while(j<P.length-1&&cls(P[j][2],P[j+1][2],L)===k) j++; drawRun(P,i,j,k,dim,hi); i=j; } }
  const codes=new Set(); routes.forEach(r=>{codes.add(r.o);codes.add(r.d);}); const fs=Math.round(W/90);
  c.textBaseline='middle';
  const deg={}; routes.forEach(r=>{deg[r.o]=(deg[r.o]||0)+1;deg[r.d]=(deg[r.d]||0)+1;}); const taken=[];
  for(const code of [...codes].sort((a,b)=>((hubs.has(b)?1e6:0)+(deg[b]||0))-((hubs.has(a)?1e6:0)+(deg[a]||0)))){ const ap=CD.airports[code]; if(!ap) continue; const q=proj([ap.lon,ap.lat]); if(!q) continue; const hub=hubs.has(code);
    c.beginPath(); c.arc(q[0],q[1],hub?W/260:W/700,0,7); c.fillStyle='#ffffff'; c.fill();
    const f1=hub?fs*1.25:fs, bw=f1*0.62*code.length+6, bh=f1+4, bx=q[0]+8, by=q[1]-10-bh/2; if(taken.some(t=>bx<t[0]+t[2]&&bx+bw>t[0]&&by<t[1]+t[3]&&by+bh>t[1])) continue; taken.push([bx,by,bw,bh]);
    c.font=`${hub?700:600} ${hub?fs*1.25:fs}px "IBM Plex Mono", monospace`; c.lineWidth=4; c.strokeStyle='rgba(3,9,22,.85)'; c.strokeText(code,q[0]+8,q[1]-10); c.fillStyle=hub?'#fff':'#d7e8f7'; c.fillText(code,q[0]+8,q[1]-10); }
  if(legendH){ const y=H-legendH*.5, f2=Math.round(W/85); c.fillStyle='rgba(3,9,22,.75)'; c.fillRect(0,H-legendH,W,legendH); c.font=`500 ${f2}px "IBM Plex Sans", sans-serif`; let x=W*.03;
    for(const [k,t] of (L==='a2g'?[['a2g',(window.SKYCOV?SKYCOV.T('A2G full plan covers'):'A2G full plan covers')],['none','No A2G']]:L==='leo'?[['leo','Starlink covers'],['none','No Starlink']]:[['both','Both networks'],['a2g',(window.SKYCOV?SKYCOV.T('A2G full plan only'):'A2G full plan only')],['leo','Starlink only'],['none','Neither']])){ c.strokeStyle=HEX[k]; c.lineWidth=f2*.35; c.setLineDash(k==='none'?[f2*.5,f2*.45]:[]); c.beginPath(); c.moveTo(x,y); c.lineTo(x+f2*2.6,y); c.stroke(); c.setLineDash([]); c.fillStyle='#e9f2fb'; c.fillText(t,x+f2*3.2,y); x+=f2*3.2+c.measureText(t).width+f2*1.6; }
    if(SA){ c.fillStyle='rgba(38,150,205,.8)'; c.fillRect(x,y-f2*.55,f2*2,f2*1.1); c.fillStyle='#e9f2fb'; const t1=(window.SKYMODE==='now'?'A2G today + ':'A2G plan + ')+CD.buffer_km+' km'; c.fillText(t1,x+f2*2.6,y); x+=f2*2.6+c.measureText(t1).width+f2*1.6; }
    if(SA&&window.SKYMODE!=='now'){ c.fillStyle='rgba(140,215,245,.5)'; c.fillRect(x,y-f2*.55,f2*2,f2*1.1); c.fillStyle='#e9f2fb'; c.fillText('A2G future',x+f2*2.6,y); x+=f2*2.6+c.measureText('A2G future').width+f2*1.6; }
    if(SS){ c.fillStyle='rgba(190,118,48,.9)'; c.fillRect(x,y-f2*.55,f2*2,f2*1.1); c.fillStyle='#e9f2fb'; c.fillText('Starlink available',x+f2*2.6,y); x+=f2*2.6+c.measureText('Starlink available').width+f2*1.6;
      if(Object.values(CD.countries).some(q=>q.slFut)){ c.fillStyle='rgba(240,190,140,.55)'; c.fillRect(x,y-f2*.55,f2*2,f2*1.1); c.fillStyle='#e9f2fb'; c.fillText('Starlink future',x+f2*2.6,y); } } }
}
function snapshot(names,o){ o=o||{}; const cv=document.createElement('canvas'); cv.width=o.w||1920; cv.height=o.h||1500; draw(cv,names,o); return cv.toDataURL('image/png'); }
window.SKYFLAT={draw,snapshot};
})();
