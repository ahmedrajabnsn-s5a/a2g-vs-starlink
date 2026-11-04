/* SKYCSV: reads airline track CSVs into clean flights [{o,d,pts:[[lon,lat],...]}].
   Format A (Oman style): Timestamp, Callsign, Position "lat,lon" (or Latitude/Longitude), Terminal (origin), destination.
   Format B (flynas style): one route per "City most pair" code (e.g. CAI-JED), lat, long, no times; optional
   airline flag columns (e.g. "flynas" = FLYNAS / #N/A, "Aircairo" = Air Cairo). Rows with no flag belong to the
   airline named in the file name. Works in the browser (window.SKYCSV) and in Node (module.exports). */
(function(root){
const R=Math.PI/180;
const hav=(a,b)=>{const dl=(b[1]-a[1])*R,dn=(b[0]-a[0])*R,x=Math.sin(dl/2)**2+Math.cos(a[1]*R)*Math.cos(b[1]*R)*Math.sin(dn/2)**2;return 12742*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));};
function interp(a,b,t){ // great-circle point between a and b
  const p1=a[1]*R,l1=a[0]*R,p2=b[1]*R,l2=b[0]*R; const d=2*Math.asin(Math.sqrt(Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin((l2-l1)/2)**2)); if(!d) return a.slice();
  const A=Math.sin((1-t)*d)/Math.sin(d),B=Math.sin(t*d)/Math.sin(d); const x=A*Math.cos(p1)*Math.cos(l1)+B*Math.cos(p2)*Math.cos(l2),y=A*Math.cos(p1)*Math.sin(l1)+B*Math.cos(p2)*Math.sin(l2),z=A*Math.sin(p1)+B*Math.sin(p2);
  return [Math.atan2(y,x)/R,Math.atan2(z,Math.sqrt(x*x+y*y))/R]; }
function densify(P,step){ const o=[P[0]]; for(let i=1;i<P.length;i++){ const L=hav(P[i-1],P[i]); if(L>step*1.5){ const n=Math.ceil(L/step); for(let k=1;k<n;k++) o.push(interp(P[i-1],P[i],k/n)); } o.push(P[i]); } return o; }
function splitCSV(line){ const o=[];let cur='',q=false; for(let i=0;i<line.length;i++){const ch=line[i]; if(ch==='"'){q=!q;continue;} if(ch===','&&!q){o.push(cur);cur='';continue;} cur+=ch;} o.push(cur); return o.map(v=>v.replace(/[\u00a0\u00ca\u00c2\ufffd]/g,' ').trim()); }
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
// keep the part of a track between the points nearest each airport; patch the ends with great-circle legs
function trimTo(P,A,B){ if(!A&&!B) return P; let ia=0,ib=P.length-1;
  if(A){ let m=1e9; P.forEach((p,i)=>{const d=hav(p,A); if(d<m){m=d;ia=i;}}); }
  if(B){ let m=1e9; P.forEach((p,i)=>{const d=hav(p,B); if(d<m){m=d;ib=i;}}); }
  let Q=ia<=ib?P.slice(ia,ib+1):P.slice(ib,ia+1).reverse();
  if(A&&hav(Q[0],A)>5) Q=[A,...Q]; if(B&&hav(Q[Q.length-1],B)>5) Q=[...Q,B]; return Q; }
function clean(P){ const Q=[P[0]]; for(const p of P){ if(hav(Q[Q.length-1],p)>=3) Q.push(p); } return Q; }
function parse(text,opt){ opt=opt||{}; const air=opt.airline||{}, hubs=air.hubs||[], hub=air.hub||hubs[0], AP=opt.airports||{}, fname=norm(opt.filename);
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>l.trim()); if(lines.length<3) throw new Error('The file has no track rows.');
  const Hraw=splitCSV(lines[0]), H=Hraw.map(h=>h.toLowerCase().trim());
  const col=(...ks)=>H.findIndex(h=>ks.some(k=>h===k)), colIn=(...ks)=>H.findIndex(h=>ks.some(k=>h.includes(k)));
  const iP=colIn('position'), iLa=col('lat','latitude')>=0?col('lat','latitude'):colIn('latitude'), iLo=col('long','lon','lng','longitude')>=0?col('long','lon','lng','longitude'):colIn('longitude');
  const iT=col('timestamp','time','utc')>=0?col('timestamp','time','utc'):colIn('timestamp');
  const iPair=colIn('city most pair','route','iata pair','od pair'), iC=colIn('callsign','flight no'), iO=colIn('terminal','terimnal','origin','dep'), iD=colIn('destination','dest','arr');
  if(iP<0&&(iLa<0||iLo<0)) throw new Error('No position column found. Use Position "lat,lon", or lat and long columns.');
  const rows=lines.slice(1).map(splitCSV);
  const pos=v=>{ let lat,lon; if(iP>=0){ const m=(v[iP]||'').split(/[ ,;]+/).map(Number); lat=m[0]; lon=m[1]; } else { lat=parseFloat(v[iLa]); lon=parseFloat(v[iLo]); } return isFinite(lat)&&isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?[lon,lat]:null; };
  const hasTime=iT>=0&&rows.some(v=>(v[iT]||'').trim()!=='');
  const ap=c=>{ const a=AP[String(c||'').toUpperCase()]; return a?[a.lon,a.lat]:null; };
  let flights=[], info={format:'',dropped:0,otherAirline:0};
  if(iPair>=0&&!hasTime){
    // ---- Format B: route codes, ordered points
    info.format='route points';
    const flagCols=H.map((h,i)=>i).filter(i=>i!==iPair&&rows.some(v=>/^(#n\/a|[a-z ]{3,})$/i.test(v[i]||''))&&rows.filter(v=>(v[i]||'')&&!/^#n\/a$/i.test(v[i])).length>0&&H[i]&&!/city|pair|carrier|lat|lon|time|alt|cov|dep|arr/.test(H[i]));
    const me=norm(air.name), myCol=flagCols.find(i=>me&&(norm(H[i])===me||norm(H[i]).includes(me)||me.includes(norm(H[i]))));
    const named=fname&&me&&fname.includes(me);
    const mine=v=>{ if(myCol!=null){ const x=(v[myCol]||'').trim(); if(x&&!/^#n\/a$/i.test(x)) return true; }
      const anyFlag=flagCols.some(i=>(v[i]||'').trim()); return !anyFlag&&(named||myCol==null); };
    const groups=new Map();
    for(const v of rows){ const code=(v[iPair]||'').toUpperCase().replace(/\s+/g,''); const p=pos(v); if(!code||!p) continue; if(!mine(v)){ info.otherAirline++; continue; }
      (groups.get(code)||groups.set(code,[]).get(code)).push(p); }
    for(const [code,P0] of groups){ let [a,b]=code.split(/[-–>\/]/); if(!a||!b) continue; let P=clean(P0); if(P.length<3){ info.dropped++; continue; }
      const A=ap(a), B=ap(b); P=trimTo(P,A,B);
      // the two ends without known airports: orient so the hub comes first
      let o=a,d=b; if(hubs.includes(b)&&!hubs.includes(a)){ o=b; d=a; P=P.slice().reverse(); }
      flights.push({o,d,pts:densify(P,10)}); }
  } else {
    // ---- Format A: timed positions per flight
    info.format='timed tracks'; if(iD<0&&iPair<0) throw new Error('No destination or route column found.');
    const fl=new Map();
    rows.forEach((v,k)=>{ const p=pos(v); if(!p) return; let o,d; if(iPair>=0&&!(iD>=0&&v[iD])){ [o,d]=(v[iPair]||'').toUpperCase().split('-'); } else { o=(iO>=0?v[iO]:hub)||hub; d=v[iD]; }
      if(!d) return; const t=iT>=0?(isNaN(+v[iT])?Date.parse(v[iT])/1000:+v[iT]):k; const key=(iC>=0?v[iC]:'')+'|'+String(o).toUpperCase()+'|'+String(d).toUpperCase(); (fl.get(key)||fl.set(key,[]).get(key)).push([t,p]); });
    for(const [key,arr] of fl){ arr.sort((x,y)=>x[0]-y[0]); let cur=[arr[0]]; const parts=[];
      for(let i=1;i<arr.length;i++){ if(arr[i][0]-arr[i-1][0]>10800){ parts.push(cur); cur=[]; } cur.push(arr[i]); } parts.push(cur);
      const [,o,d]=key.split('|');
      for(const part of parts){ if(part.length<5) continue; let P=clean(part.map(x=>x[1])); if(P.length<3) continue;
        const A=ap(o),B=ap(d); if(A&&B&&hav(P[0],A)>hav(P[P.length-1],A)) P=P.reverse();
        const Bend=B&&hav(P[P.length-1],B); if(B&&Bend>300){ info.dropped++; continue; } // track never reaches its destination
        flights.push({o,d,pts:densify(P,10)}); } }
  }
  if(!flights.length) throw new Error(info.otherAirline?'No rows for '+(air.name||'this airline')+' in the file (the rows are tagged for another airline).':'No complete flights found in the file.');
  return {flights,info};
}
const api={parse,hav,densify}; if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.SKYCSV=api;
})(typeof window!=='undefined'?window:globalThis);
