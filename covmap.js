/* SKYCOV: coverage figures + PPT kit shared by the coverage page and the cabin speed test.
   Uses window.COVDATA, SKYGLOBE (globe snapshots) and PptxGenJS. */
(function(){
const D=window.COVDATA;
// ---------- A2G basis: 'plan' (full roll-out plan) or 'now' (live today: KSA + 44 European countries)
window.SKYMODE=window.SKYMODE||'plan';
const SWAPS=[[/a country in the SKYFive A2G plan \(KSA, Europe, India, Oman, Turkey, Egypt, UAE, Qatar, Jordan, Iraq and the planned African and Asian markets\)/g,'a country where SKYFive A2G is live today (KSA and 44 European countries)'],
  [/the full roll-out plan with a 150 km reach around each plan country/g,'the live network today (KSA and 44 European countries) with a 150 km reach'],
  [/A2G FULL PLAN/g,'A2G TODAY'],[/A2G full plan/g,'A2G today'],[/A2G full-plan/g,'A2G today'],[/A2G plan/g,'A2G today'],[/the full A2G plan/g,'A2G today'],[/full plan/g,'today']];
function T(str){ if(window.SKYMODE!=='now'||typeof str!=='string') return str; for(const [a,b] of SWAPS) str=str.replace(a,b); return str; }
function deepT(v){ if(typeof v==='string') return T(v); if(Array.isArray(v)) return v.map(deepT); if(v&&typeof v==='object'&&!(v instanceof Uint8Array)){ const o={}; for(const k in v) o[k]=(k==='data'||k==='path')?v[k]:deepT(v[k]); return o; } return v; }
// ---------- live coverage engine: raw points [lon,lat,countryIdx,unitMask] -> coverage per airline
const RAWA=D.airlines, RAWC=D.countries; D.airlines={}; D.rawCountries=RAWC;
const ST={mode:'plan',off:new Set(),cs:new Set()}; // cs = Starlink future countries counted as available
const SLOK=new Set(['launched','available']), CS_OK=new Set(['coming_soon','pending_regulatory','unknown']);
const CS_NEVER=new Set(['India','Turkey','China','Egypt']);
function slOk(n,st){ if(st==='sea') return true; if(SLOK.has(st)) return true; return ST.cs.has(n); }
function activeMask(){ let m=0; D.units.forEach((u,i)=>{ if(ST.off.has(u.id)) return; if(ST.mode==='now'&&u.tier!==0) return; m|=(1<<i); }); return m>>>0; }
const hav=(a,b)=>{const r=Math.PI/180,dl=(b[1]-a[1])*r,dn=(b[0]-a[0])*r,x=Math.sin(dl/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dn/2)**2;return 12742*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));};
let OKC=[], ACT=0;
function evalPts(P){ let T=0,A=0,S=0; const ga={},gs={}; const fl=P.map(p=>[p[0],p[1],((p[3]&ACT)?1:0)|(OKC[p[2]]?2:0)]);
  for(let i=0;i<P.length-1;i++){ const L=hav(P[i],P[i+1]); T+=L; const ca=(fl[i][2]&1)&&(fl[i+1][2]&1), cs=(fl[i][2]&2)&&(fl[i+1][2]&2);
    if(ca) A+=L; else { const c=D.cnames[!(fl[i][2]&1)?P[i][2]:P[i+1][2]].n; ga[c]=(ga[c]||0)+L; }
    if(cs) S+=L; else { const c=D.cnames[!(fl[i][2]&2)?P[i][2]:P[i+1][2]].n; gs[c]=(gs[c]||0)+L; } }
  return {T,a:T?A/T:0,s:T?S/T:0,ga,gs,fl}; }
const GCC=new WeakMap();
function gcRaw(x){ if(GCC.has(x)) return GCC.get(x); const A=D.airports[x.o],B=D.airports[x.d], P=x.pts; let out=null;
  if(A&&B&&P&&P.length>1&&window.d3){ let Q=P; if(hav(Q[0],[A.lon,A.lat])>hav(Q[Q.length-1],[A.lon,A.lat])) Q=Q.slice().reverse();
    const cum=[0]; for(let i=1;i<Q.length;i++) cum.push(cum[i-1]+hav(Q[i-1],Q[i])); const TT=cum[cum.length-1]||1;
    const a=[A.lon,A.lat],b=[B.lon,B.lat],L=hav(a,b),n=Math.max(2,Math.ceil(L/30)),ip=d3.geoInterpolate(a,b); out=[]; let j=0;
    for(let k=0;k<=n;k++){ const p=ip(k/n), t=k/n*TT; while(j<Q.length-1&&cum[j+1]<t) j++; const q=Q[Math.min(j+(t-cum[j]>(cum[j+1]-cum[j])/2?1:0),Q.length-1)]; out.push([p[0],p[1],q[2],q[3]]); } }
  GCC.set(x,out); return out; }
function build(r){ const ev=r.routes.map(x=>evalPts(x.pts)); let W=0,A=0,S=0; const GA={},GS={};
  ev.forEach((e,i)=>{ const w=(r.routes[i].km||e.T)*(r.routes[i].flights||1); W+=w; A+=w*e.a; S+=w*e.s;
    const k=w/(e.T||1); for(const c in e.ga) GA[c]=(GA[c]||0)+e.ga[c]*k; for(const c in e.gs) GS[c]=(GS[c]||0)+e.gs[c]*k; });
  W=W||1; const top=o=>Object.entries(o).map(([k,v])=>[k,+(v/W*100).toFixed(1)]).filter(x=>x[1]>=0.1).sort((x,y)=>y[1]-x[1]).slice(0,6);
  let tw=null, markets=null;
  if(r.calcs&&r.markets){ const it=r.calcs.map(c=>{ const e=c.ri!=null?ev[c.ri]:evalPts(c.pts); return {m:c.m,w:c.w,a:e.a,s:e.s}; });
    markets=r.markets.map(m=>{ const L=it.filter(x=>x.m===m.k), w=L.reduce((t,x)=>t+x.w,0)||1; return {label:m.label,share:m.share,n:L.length,a:L.reduce((t,x)=>t+x.w*x.a,0)/w*100,s:L.reduce((t,x)=>t+x.w*x.s,0)/w*100}; }).filter(m=>m.n);
    const Sh=markets.reduce((t,m)=>t+m.share,0)||1; tw={a:markets.reduce((t,m)=>t+m.share*m.a,0)/Sh,s:markets.reduce((t,m)=>t+m.share*m.s,0)/Sh,flights:r.flights}; }
  return {name:r.name,iata:r.iata,icao:r.icao,cc:r.cc,hub:r.hub,hubs:r.hubs,fleet:r.fleet,uploaded:r.uploaded||null,csv:r.routes.some(x=>x.src==='csv'),
    net:{a:A/W*100,s:S/W*100,routes:r.routes.length},tw,markets,gapsA:top(GA),gapsS:top(GS),
    routes:r.routes.map((x,i)=>({o:x.o,d:x.d,km:x.km,src:x.src,seats:x.seats||null,flights:x.flights||null,a:Math.round(ev[i].a*100),s:Math.round(ev[i].s*100),pts:ev[i].fl,gc:(g=>g?evalPts(g).fl:null)(gcRaw(x))}))}; }
function recompute(){ window.SKYMODE=ST.mode; ACT=activeMask(); OKC=D.cnames.map(c=>slOk(c.n,c.st));
  const C={}; for(const n in RAWC){ const c=RAWC[n]; const pl=c.unit>=0&&(ACT&(1<<c.unit))?1:0; C[n]={sl:slOk(n,c.st)?'available':'no',plan:pl,planFut:pl&&D.units[c.unit].tier!==0?1:0,slFut:(!SLOK.has(c.st)&&slOk(n,c.st))?1:0}; } D.countries=C;
  for(const n in RAWA) D.airlines[n]=build(RAWA[n]);
  window.SKYSTATE=ST.mode+'|'+[...ST.off].sort().join(',')+'|'+[...ST.cs].sort().join(','); }
function set(o){ if(o.mode) ST.mode=o.mode; if(o.off) ST.off=new Set(o.off); if(o.cs!=null) ST.cs=new Set(o.cs===true?csAdded():o.cs===false?[]:o.cs); recompute(); }
function setMode(m){ set({mode:m}); }
function setRaw(n,a){ RAWA[n]=a; D.airlines[n]=build(a); }
function getRaw(n){ return RAWA[n]; }
function csAdded(){ return Object.entries(RAWC).filter(([n,c])=>CS_OK.has(c.st)&&!CS_NEVER.has(n)).map(([n])=>n).sort(); }
function csGroups(){ const all=Object.entries(RAWC).filter(([n,c])=>CS_OK.has(c.st)&&!CS_NEVER.has(n)); const g={pending_regulatory:[],coming_soon:[],unknown:[]};
  all.forEach(([n,c])=>g[c.st].push(n)); for(const k in g) g[k].sort((a,b)=>a==='Saudi Arabia'?-1:b==='Saudi Arabia'?1:a.localeCompare(b)); return g; }
function note(){ const L=[]; if(ST.off.size) L.push('A2G excludes: '+D.units.filter(u=>ST.off.has(u.id)).map(u=>u.name).join(', '));
  if(ST.cs.size) L.push('Starlink future countries added: '+(ST.cs.size>8?ST.cs.size+' countries'+(ST.cs.has('Saudi Arabia')?' incl. Saudi Arabia':''):[...ST.cs].sort().join(', '))+([...CS_NEVER].some(n=>ST.cs.has(n))?' (includes normally excluded: '+[...CS_NEVER].filter(n=>ST.cs.has(n)).join(', ')+')':'')); return L; }
recompute();
// Headline basis: FR24 traffic weighting when the sample is big enough, else all routes by distance
function head(a){ if(a.uploaded) return {a:a.net.a,s:a.net.s,basis:'your uploaded tracks: '+a.uploaded.flights+' flights, by distance'};
  const useTw=a.tw&&a.tw.flights>=50; return useTw?{a:a.tw.a,s:a.tw.s,basis:'traffic-weighted (FR24, '+a.tw.flights+' flights)'+(a.csv?', actual tracks':'')}:{a:a.net.a,s:a.net.s,basis:'all '+a.net.routes+' routes, by distance'+(a.csv?' (actual tracks)':'')}; }
const pct=v=>Math.round(v)+'%';
const TIE=3; // points: within this, coverage counts as level
const WHY='A2G gives each aircraft a dedicated 108 Mbps site (no sharing), with better upload and lower latency';
function rec(a){ const h=head(a), d=h.a-h.s;
  if(d>TIE) return {pick:'A2G',kind:'coverage',short:'A2G · better coverage',text:`Recommend A2G: it covers ${Math.round(d)} points more of the flight time. ${WHY}.`};
  if(d>=-TIE) return {pick:'A2G',kind:'tie',short:'A2G · coverage level, better speed',text:`Coverage is level (${pct(h.a)} vs ${pct(h.s)}), so recommend A2G: ${WHY}.`};
  return {pick:'Starlink',kind:'coverage',short:'Starlink · covers more',text:`Starlink covers ${Math.round(-d)} points more of the flight time on ${ST.cs.size?'its map with future countries added':'today’s map'}. A2G still gives each aircraft dedicated capacity with better upload and latency where it covers.`}; }
const P={navy:'0B1B2E',ink:'0B1B2E',mute:'5B6B80',light:'F3F6FA',a2g:'1C8FD6',leo:'E07B24',line:'D5DEE8',white:'FFFFFF'};
const today=()=>new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
function base(){ const p=new PptxGenJS(); const add=p.addSlide.bind(p);
  p.addSlide=(o)=>{ const sl=add(o); for(const f of ['addText','addTable','addChart']){ const g=sl[f].bind(sl); sl[f]=(...a)=>g(...a.map(deepT)); } return sl; }; p.layout='LAYOUT_WIDE'; p.author='SKYFive Arabia'; p.company='SKYFive Arabia'; p.theme={headFontFace:'Arial',bodyFontFace:'Calibri'};
  p.defineSlideMaster({title:'DARK',background:{color:'030916'},slideNumber:{x:12.4,y:7.0,w:0.6,h:0.3,color:'8FA3BA',fontSize:10}});
  p.defineSlideMaster({title:'LIGHT',background:{color:P.white},objects:[{text:{text:'SKYFive Arabia · A2G full plan ('+D.buffer_km+' km) vs Starlink · '+today(),options:{x:0.6,y:7.0,w:9,h:0.3,fontSize:10,color:P.mute}}}],slideNumber:{x:12.4,y:7.0,w:0.6,h:0.3,color:P.mute,fontSize:10}});
  return p; }
function title(s,t,sub){ s.addText(t,{x:0.6,y:0.35,w:12.1,h:0.75,fontSize:28,bold:true,color:P.ink,fontFace:'Arial',margin:0,valign:'top'});
  if(sub) s.addText(sub,{x:0.6,y:1.1,w:12.1,h:0.4,fontSize:14,color:P.mute,margin:0}); }
function cover(p,names,kicker,headTxt,sub){ const s=p.addSlide({masterName:'DARK'});
  s.addImage({data:SKYGLOBE.snapshot(names,{w:1920,h:1422,legend:false}),x:3.2,y:0,w:10.133,h:7.5});
  s.addShape(p.shapes.RECTANGLE,{x:0,y:0,w:6.4,h:7.5,fill:{color:'030916',transparency:8},line:{type:'none'}});
  s.addText(kicker,{x:0.8,y:1.5,w:5.4,h:0.4,fontSize:14,bold:true,color:'4FB3F0',charSpacing:4,margin:0});
  s.addText(headTxt,{x:0.8,y:2.0,w:5.4,h:2.4,fontSize:36,bold:true,color:'FFFFFF',fontFace:'Arial',margin:0,valign:'top'});
  s.addText(sub,{x:0.8,y:4.5,w:5.2,h:1.4,fontSize:15,color:'C9D6E4',margin:0,valign:'top'});
  s.addText('SKYFive Arabia · Commercial · '+today(),{x:0.8,y:6.4,w:5.4,h:0.4,fontSize:12,color:'8FA3BA',margin:0}); return s; }
function summary(p,names){ const s=p.addSlide({masterName:'LIGHT'});
  const rows=names.map(n=>{const a=D.airlines[n],h=head(a);return {n,a,h};});
  const lead=rows.filter(r=>r.h.a>r.h.s).length;
  const recs=rows.map(r=>rec(r.a)); const nA=recs.filter(x=>x.pick==='A2G').length;
  title(s,nA===rows.length?'Recommend A2G for every airline selected':lead===rows.length?'The A2G full plan out-covers Starlink for every airline selected':lead+' of '+rows.length+' airlines are better covered by the A2G full plan','Share of flight time covered · A2G full plan with '+D.buffer_km+' km reach vs Starlink’s own availability map'+(note().length?' · '+note().join(' · '):''));
  s.addChart(p.charts.BAR,[{name:'A2G full plan',labels:rows.map(r=>r.n),values:rows.map(r=>Math.round(r.h.a))},{name:'Starlink',labels:rows.map(r=>r.n),values:rows.map(r=>Math.round(r.h.s))}],
    {x:0.6,y:1.6,w:7.2,h:5.2,barDir:'col',barGrouping:'clustered',chartColors:[P.a2g,P.leo],showValue:true,dataLabelPosition:'outEnd',dataLabelFormatCode:'0"%"',dataLabelFontSize:11,valAxisMaxVal:100,valAxisMinVal:0,valAxisLabelFormatCode:'0"%"',valAxisLabelFontSize:10,catAxisLabelFontSize:11,valGridLine:{color:'E3E9F0',size:0.5},catGridLine:{style:'none'},showLegend:true,legendPos:'b',legendFontSize:11});
  const hd=['Airline','A2G','Starlink','Recommend'].map((t,i)=>({text:t,options:{bold:true,color:'FFFFFF',fill:{color:P.navy},align:i&&i<3?'right':'left'}}));
  s.addTable([hd,...rows.slice(0,10).map((r,i)=>[{text:r.n,options:{bold:true}},{text:pct(r.h.a),options:{align:'right',color:P.a2g,bold:r.h.a>=r.h.s}},{text:pct(r.h.s),options:{align:'right',color:P.leo,bold:r.h.s>r.h.a}},{text:recs[i].short,options:{fontSize:10,bold:true,color:recs[i].pick==='A2G'?P.a2g:P.leo}}])],
    {x:8.1,y:1.7,w:4.6,colW:[1.3,0.75,0.85,1.7],fontSize:12,color:P.ink,rowH:0.38,border:{type:'solid',pt:0.5,color:P.line},margin:[0.03,0.07,0.03,0.07]});
  s.addText('Rule: when coverage is within '+TIE+' points, recommend A2G, because '+WHY.charAt(0).toLowerCase()+WHY.slice(1)+'.',{x:8.1,y:6.05,w:4.6,h:0.8,fontSize:11,italic:true,color:P.mute,margin:0,valign:'top'});
  return s; }
function mapSlide(p,n,extra){ const a=D.airlines[n],h=head(a); const s=p.addSlide({masterName:'DARK'});
  s.addImage({data:SKYGLOBE.snapshot([n],{w:1920,h:1500}),x:0,y:0,w:9.6,h:7.5});
  s.addText(a.name,{x:9.85,y:0.5,w:3.2,h:0.6,fontSize:26,bold:true,color:'FFFFFF',fontFace:'Arial',margin:0});
  s.addText(h.basis,{x:9.85,y:1.1,w:3.2,h:0.5,fontSize:11,color:'8FA3BA',margin:0,valign:'top'});
  [['A2G full plan',h.a,'4FB3F0'],['Starlink',h.s,'F0923A']].forEach(([l,v,c],i)=>{ s.addText(pct(v),{x:9.85,y:1.7+i*1.2,w:3.2,h:0.75,fontSize:42,bold:true,color:c,fontFace:'Arial',margin:0}); s.addText(l,{x:9.85,y:2.42+i*1.2,w:3.2,h:0.3,fontSize:12,color:'C9D6E4',margin:0}); });
  const other=a.tw&&a.tw.flights>=50?['All '+a.net.routes+' routes',a.net]:a.tw?['FR24 sample ('+a.tw.flights+' flights)',a.tw]:null;
  if(other) s.addText([{text:other[0],options:{bold:true,color:'FFFFFF',breakLine:true}},{text:'A2G '+pct(other[1].a)+' · Starlink '+pct(other[1].s),options:{color:'C9D6E4'}}],{x:9.85,y:4.15,w:3.2,h:0.7,fontSize:12,margin:0});
  s.addText([{text:'A2G misses: ',options:{bold:true,color:'4FB3F0'}},{text:a.gapsA.slice(0,3).map(g=>g[0]+' '+g[1]+'%').join(', ')||'nothing material',options:{color:'C9D6E4',breakLine:true}},
    {text:'Starlink misses: ',options:{bold:true,color:'F0923A'}},{text:a.gapsS.slice(0,3).map(g=>g[0]+' '+g[1]+'%').join(', ')||'nothing material',options:{color:'C9D6E4'}}],{x:9.85,y:5.0,w:3.2,h:1.8,fontSize:12,margin:0,valign:'top',paraSpaceAfter:6});
  const rc=rec(a); s.addText([{text:'Recommend '+rc.pick+': ',options:{bold:true,color:rc.pick==='A2G'?'4FB3F0':'F0923A'}},{text:rc.kind==='tie'?'coverage level, A2G faster':'better coverage',options:{color:'FFFFFF'}}],{x:9.85,y:6.6,w:3.2,h:0.4,fontSize:12,margin:0});
  if(extra) extra(s); return s; }
function compareSlide(p,n){ const a=D.airlines[n],h=head(a),rc=rec(a); const s=p.addSlide({masterName:'DARK'});
  s.addText(a.name+': A2G full plan map vs Starlink map',{x:0.5,y:0.3,w:12.3,h:0.6,fontSize:24,bold:true,color:'FFFFFF',fontFace:'Arial',margin:0});
  s.addText('Same routes, each network on its own · '+h.basis,{x:0.5,y:0.88,w:12.3,h:0.35,fontSize:12,color:'8FA3BA',margin:0});
  [['a2g','A2G full plan',h.a,'4FB3F0'],['leo','Starlink',h.s,'F0923A']].forEach(([L,lab,v,c],i)=>{ const x=0.5+i*6.25;
    s.addImage({data:SKYGLOBE.snapshot([n],{w:1600,h:1300,layer:L}),x,y:1.4,w:6.05,h:4.92});
    s.addText([{text:pct(v)+'  ',options:{fontSize:30,bold:true,color:c}},{text:lab+' covers this share of flight time',options:{fontSize:13,color:'C9D6E4'}}],{x,y:6.38,w:6.05,h:0.55,margin:0,valign:'middle'}); });
  s.addText([{text:'Recommend '+rc.pick+': ',options:{bold:true,color:rc.pick==='A2G'?'4FB3F0':'F0923A'}},{text:rc.kind==='tie'?'coverage level, A2G has the better upload and latency':'covers more of the flight time',options:{color:'FFFFFF'}}],{x:0.5,y:6.95,w:11.6,h:0.35,fontSize:12,margin:0});
  return s; }
function detailSlide(p,n){ const a=D.airlines[n],h=head(a); const s=p.addSlide({masterName:'LIGHT'});
  const rc=rec(a); title(s,rc.kind==='tie'?`${a.name}: coverage level at ${pct(h.a)} vs ${pct(h.s)}, recommend A2G`:h.a>=h.s?`${a.name}: A2G full plan leads Starlink ${pct(h.a)} to ${pct(h.s)}`:`${a.name}: Starlink leads the A2G full plan ${pct(h.s)} to ${pct(h.a)}`,'Where each network misses, by markets and routes');
  let y=1.7;
  if(a.markets&&a.markets.length){ const hd=['Market','Traffic','A2G plan','Starlink'].map((t,i)=>({text:t,options:{bold:true,color:'FFFFFF',fill:{color:P.navy},align:i?'right':'left'}}));
    s.addTable([hd,...a.markets.map(m=>[{text:m.label},{text:pct(m.share),options:{align:'right'}},{text:pct(m.a),options:{align:'right',color:P.a2g,bold:m.a>=m.s}},{text:pct(m.s),options:{align:'right',color:P.leo,bold:m.s>m.a}}])],{x:0.6,y,w:5.6,colW:[2.3,1.1,1.1,1.1],fontSize:12,color:P.ink,rowH:0.34,border:{type:'solid',pt:0.5,color:P.line},margin:[0.03,0.08,0.03,0.08]});
    y+=0.34*(a.markets.length+1)+0.3; }
  const top=[...a.routes].sort((x,y)=>(y.seats||0)-(x.seats||0)||y.km-x.km).slice(0,Math.max(4,Math.floor((6.7-y)/0.31)-1));
  const h2=['Route','Km','A2G plan','Starlink'].map((t,i)=>({text:t,options:{bold:true,color:'FFFFFF',fill:{color:P.navy},align:i?'right':'left'}}));
  s.addTable([h2,...top.map(r=>[{text:r.o+'–'+r.d},{text:r.km.toLocaleString('en-US'),options:{align:'right'}},{text:r.a+'%',options:{align:'right',color:P.a2g,bold:r.a>=r.s}},{text:r.s+'%',options:{align:'right',color:P.leo,bold:r.s>r.a}}])],{x:0.6,y,w:5.6,colW:[2.3,1.1,1.1,1.1],fontSize:11,color:P.ink,rowH:0.31,border:{type:'solid',pt:0.5,color:P.line},margin:[0.02,0.08,0.02,0.08]});
  const gl=[...new Set([...a.gapsA.slice(0,5).map(g=>g[0]),...a.gapsS.slice(0,5).map(g=>g[0])])].slice(0,7), val=(arr,k)=>{const f=arr.find(g=>g[0]===k);return f?f[1]:0;};
  if(gl.length) s.addChart(p.charts.BAR,[{name:'A2G full plan misses',labels:gl,values:gl.map(k=>val(a.gapsA,k))},{name:'Starlink misses',labels:gl,values:gl.map(k=>val(a.gapsS,k))}],
    {x:6.6,y:1.6,w:6.1,h:3.6,barDir:'bar',barGrouping:'clustered',chartColors:[P.a2g,P.leo],showValue:true,dataLabelFormatCode:'0.0"%";;;',dataLabelFontSize:10,valAxisHidden:true,valGridLine:{style:'none'},catGridLine:{style:'none'},catAxisOrientation:'maxMin',catAxisLabelFontSize:11,showLegend:true,legendPos:'b',legendFontSize:11,showTitle:true,title:'Share of route distance each network misses',titleFontSize:12,titleColor:P.mute});
  const ga=a.gapsA[0],gs=a.gapsS[0];
  s.addText([{text:'Read: ',options:{bold:true}},{text:(ga?`A2G’s biggest gap is ${ga[0].toLowerCase()==='open sea'?'open sea':ga[0]} (${ga[1]}% of route distance). `:'')+(gs?`Starlink’s is ${gs[0]} (${gs[1]}%), which is not Available on its map today.`:'')}],{x:6.6,y:5.35,w:6.1,h:0.8,fontSize:13,color:P.ink,margin:0,valign:'top'});
  s.addText([{text:'Recommendation: ',options:{bold:true,color:rc.pick==='A2G'?P.a2g:P.leo}},{text:rc.text}],{x:6.6,y:6.1,w:6.1,h:0.8,fontSize:12,color:P.ink,margin:0,valign:'top'});
  return s; }
function methodSlide(p,extra){ const s=p.addSlide({masterName:'LIGHT'}); title(s,'Method and sources');
  const items=['A2G full plan: a stretch of route is covered when it is over, or within '+D.buffer_km+' km of, a country in the SKYFive A2G plan (KSA, Europe, India, Oman, Turkey, Egypt, UAE, Qatar, Jordan, Iraq and the planned African and Asian markets).',
    'Starlink: a stretch is covered when it is over a country marked Available on starlink.com/map (feed read 3 Nov 2026) or over open sea. Pending regulatory, coming soon and unknown count as not covered. This is Starlink’s best case: airlines also need each overflown state’s authorisation.',
    'Routes: Oman Air uses the attached FR24 track file (44 actual flights from Muscat; the COK track ended at Hyderabad and was left out). Other airlines use the routes in the SKYFive A2G Coverage Globe. Traffic weights come from its FR24 sample, 21 Sep – 6 Oct 2026.'].concat(note()).concat(extra||[]);
  s.addText(items.map((t,i)=>({text:t,options:{bullet:true,breakLine:i<items.length-1}})),{x:0.6,y:1.4,w:12.1,h:5.3,fontSize:15,color:P.ink,margin:0,valign:'top',paraSpaceAfter:12}); return s; }
async function getDL(){ for(let i=0;i<40&&!(window.claude&&window.claude.use);i++) await new Promise(r=>setTimeout(r,250));
  try{ return window.claude&&window.claude.use ? await window.claude.use('downloads') : null; }catch(e){ return null; } }
async function save(p,filename){ const dl=await getDL(); const blob=await p.write({outputType:'blob'});
  if(dl) return dl.save({filename,data:blob});
  // No Claude download service in this view: fall back to a plain browser download, and offer a new tab if the view blocks it.
  try{ const u=URL.createObjectURL(blob),a=document.createElement('a'); a.href=u; a.download=filename; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000); }catch(e){}
  const framed=(()=>{ try{ return window.top!==window; }catch(e){ return true; } })();
  setTimeout(()=>{ const m=document.getElementById('msg'); if(!m) return;
    if(!framed){ m.textContent='Deck downloaded: check your Downloads folder.'; return; }
    const href=location.href.split('#')[0]+'#autoexport='+(window.SKYPPTMAP||'flat');
    m.innerHTML='Deck sent to your browser’s Downloads. Nothing there? This view blocks downloads: <a href="'+href.replace(/"/g,'&quot;')+'" target="_blank" rel="noopener" style="color:#3fd8ff;font-weight:600">open the app in a new tab ↗</a> (it exports the deck automatically), or use the full-screen icon at the top right.'; },0);
  return {fallback:true}; }
// ---------- Export PPT chooser: flat map or 3D globe for the map images (both pages)
(function(){ const btn=document.getElementById('ppt'); if(!btn) return; let go=false; let pref='flat'; try{ pref=localStorage.getItem('skyfive-ppt-map')||'flat'; }catch(e){}
  const m=document.createElement('div'); m.id='pptMenu'; m.hidden=true; m.setAttribute('role','dialog'); m.setAttribute('aria-label','Choose the map style for the PPT');
  m.style.cssText='position:absolute;z-index:40;padding:12px 14px;border-radius:14px;background:#0b1d36;border:1px solid #1f3758;box-shadow:0 20px 50px rgba(0,0,0,.5);color:#e9f2fb;font:14px "IBM Plex Sans",system-ui,sans-serif;display:grid;gap:8px;min-width:230px';
  const bs='all:unset;cursor:pointer;display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;border:1px solid #1f3758;font-weight:600';
  m.innerHTML=`<div style="font:600 11px 'Chakra Petch',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#8ea6c2">Map style in the PPT</div>
    <button type="button" data-s="flat" style="${bs}">▭ Flat map</button><button type="button" data-s="globe" style="${bs}">◍ 3D globe</button>
    <div style="font-size:12px;color:#8ea6c2;max-width:240px">3D globe falls back to the flat map if this device can’t draw 3D.</div>`;
  document.body.appendChild(m);
  const mark=()=>m.querySelectorAll('button').forEach(b=>{ b.style.borderColor=b.dataset.s===pref?'#3fd8ff':'#1f3758'; b.style.background=b.dataset.s===pref?'rgba(63,216,255,.1)':'transparent'; });
  const place=()=>{ const r=btn.getBoundingClientRect(); m.style.top=(r.bottom+window.scrollY+8)+'px'; m.style.left=Math.max(16,Math.min(r.left+window.scrollX,window.scrollX+document.documentElement.clientWidth-260))+'px'; };
  document.addEventListener('click',e=>{ if(go) return; const t=e.target.closest&&e.target.closest('#ppt'); if(t){ e.preventDefault(); e.stopImmediatePropagation(); mark(); place(); m.hidden=!m.hidden; if(!m.hidden) m.querySelector(`[data-s="${pref}"]`).focus(); return; }
    if(!m.hidden&&!m.contains(e.target)) m.hidden=true; },true);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!m.hidden){ m.hidden=true; btn.focus(); } });
  const am=/autoexport=(flat|globe)/.exec(location.hash||''); if(am){ try{ history.replaceState(null,'',location.href.split('#')[0]); }catch(e){}
    const fire=()=>setTimeout(()=>{ pref=am[1]; window.SKYPPTMAP=pref; go=true; btn.click(); go=false; },3500);
    if(document.readyState==='complete') fire(); else window.addEventListener('load',fire); }
  m.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ pref=b.dataset.s; try{ localStorage.setItem('skyfive-ppt-map',pref); }catch(e){} window.SKYPPTMAP=pref; m.hidden=true; go=true; btn.click(); go=false; }));
})();
window.SKYCOV={head,rec,TIE,pct,T,setMode,set,state:()=>({mode:ST.mode,off:[...ST.off],cs:[...ST.cs]}),csAdded,csGroups,note,CS_NEVER,setRaw,getRaw,ppt:{base,title,cover,summary,mapSlide,compareSlide,detailSlide,methodSlide,save,P,pct}};
})();
