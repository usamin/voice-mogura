const $=id=>document.getElementById(id),show=s=>document.querySelectorAll('.scr').forEach(e=>e.classList.toggle('on',e.id==s));
const DEF={grade:3,mode:'kanji',time:60,speed:5000,lower:false};
let S=Object.assign({},DEF,JSON.parse(localStorage.getItem('moguraSet')||'{}'));
for(let g=1;g<=6;g++)$('sGrade').innerHTML+=`<option value="${g}">${g}ねんせい</option>`;
function loadSet(){$('sGrade').value=S.grade;$('sMode').value=S.mode;$('sTime').value=S.time;$('sSpeed').value=S.speed;$('sLower').checked=S.lower}
$('toSet').onclick=()=>{loadSet();show('set')};
$('save').onclick=()=>{S={grade:+$('sGrade').value,mode:$('sMode').value,time:+$('sTime').value,speed:+$('sSpeed').value,lower:$('sLower').checked};localStorage.setItem('moguraSet',JSON.stringify(S));show('home')};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SR)$('warn').textContent='このブラウザは おんせいにんしきに たいおうしていません（iPhoneはSafari、AndroidはChromeでひらいてね）';
// audio
let AC;function tone(f,d,t='sine',v=.2){if(!AC)return;const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+d)}
const sHit=()=>{tone(200,.15,'square',.3);setTimeout(()=>tone(880,.2),80);setTimeout(()=>tone(1320,.25),180)},sPop=()=>tone(500,.08,'triangle',.1),sMiss=()=>tone(150,.3,'sawtooth',.1);
// kana helpers
const kata2hira=s=>s.replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const norm=s=>kata2hira(s.toLowerCase()).replace(/[\s、。・!！?？ー\-.,'"]/g,'');
// 正解リスト: Googleスプレッドシート → 前回のコピー → words.js の順に使う
const SHEET_ID='1rRNSq7t_2uJOgzH1ucAcICx-d8_7ZntQQe-QrW9sDqE';
const sheetURL=t=>'https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?tqx=out:csv&headers=0&sheet='+encodeURIComponent(t);
function csv(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
 if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}
 else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;r.push(f);rows.push(r);r=[];f=''}else f+=c}
 if(f||r.length){r.push(f);rows.push(r)}return rows}
const splitR=s=>String(s||'').split(/[、,，\/／]/).map(x=>x.trim()).filter(Boolean);
function parseTab(text){const out={};csv(text).forEach(([g,w,r,en])=>{g=parseInt(g);w=(w||'').trim();if(!(g>=1&&g<=6)||!w)return;
 if(String(en||'').trim().toUpperCase()=='FALSE')return;(out[g]=out[g]||[]).push([w,splitR(r)])});return out}
let DATA={k:{},e:{}};for(const g in KANJI)DATA.k[g]=KANJI[g].map(([k,r])=>[k,r.split(',')]);for(const g in ENG)DATA.e[g]=ENG[g].map(w=>[w,[]]);
try{const c=JSON.parse(localStorage.getItem('moguraSheet')||'null');if(c&&c.k&&c.e)DATA=c}catch(e){}
async function loadSheet(){try{const ctl=new AbortController();setTimeout(()=>ctl.abort(),6000);
 const [k,e]=await Promise.all(['漢字','英語'].map(t=>fetch(sheetURL(t),{cache:'no-store',signal:ctl.signal}).then(r=>{if(!r.ok)throw r.status;return r.text()})));
 const d={k:parseTab(k),e:parseTab(e)};if(!Object.keys(d.k).length&&!Object.keys(d.e).length)throw 'empty';
 DATA=d;localStorage.setItem('moguraSheet',JSON.stringify(d));$('warn').textContent=''}catch(err){console.warn('sheet',err)}}
const sheetReady=loadSheet();
function pool(){const gs=S.lower?[...Array(S.grade).keys()].map(i=>i+1):[S.grade];let p=[];
 if(S.mode!='eng')gs.forEach(g=>(DATA.k[g]||[]).forEach(([k,r])=>p.push({t:'k',show:k,ans:r})));
 if(S.mode!='kanji')gs.forEach(g=>(DATA.e[g]||[]).forEach(([w,r])=>p.push({t:'e',show:w,ans:r})));return p}
let moles=[],score,left,timer,spawnT,P,running=false,rec,lang,missed;
function build(){$('field').innerHTML='';moles=[];for(let i=0;i<9;i++){const h=document.createElement('div');h.className='hole';h.innerHTML='<div class="mole"><div class="tg">👇 よんで！</div><div class="bub"></div><div class="w"></div><div class="f">• ᴥ •</div></div>';$('field').appendChild(h);moles.push({el:h.firstChild,q:null,to:0})}}
function spawn(){if(!running)return;const free=moles.filter(m=>!m.q);const active=moles.filter(m=>m.q).length;
 if(free.length&&active<(S.mode=='mix'?1:2)){const m=free[Math.random()*free.length|0];let q;
  const cur=moles.find(x=>x.q);do q=P[Math.random()*P.length|0];while(cur&&(q.t!=cur.q.t||q.show==cur.q.show)&&P.some(x=>x.t==cur.q.t&&x.show!=cur.q.show));
  m.q=q;m.el.querySelector('.w').textContent=q.show;m.el.querySelector('.w').style.fontSize=q.show.length>6?'16px':'22px';m.el.classList.remove('hit');m.born=Date.now();m.el.classList.add('up');mark();sPop();
  m.born=Date.now();m.to=setTimeout(()=>{if(m.q){missed.push(m.q);sMiss();down(m)}},S.speed);setLang();}
 spawnT=setTimeout(spawn,900)}
function down(m){m.q=null;m.el.classList.remove('up','target');clearTimeout(m.to);mark()}
// いちばん先に出たモグラを「ねらい」として光らせる（ほかのモグラも よめば たたける）
function mark(){const up=moles.filter(x=>x.q).sort((a,b)=>a.born-b.born);moles.forEach(x=>x.el.classList.toggle('target',x==up[0]));const l=up[0]?up[0].q.t:(lang=='en-US'?'e':'k');$('lang').textContent=l=='e'?'🔤 えいごで よんでね':'あ にほんごで よんでね';$('lang').className=l=='e'?'en':'ja'}
function setLang(){const m=moles.find(x=>x.q);const want=m?(m.q.t=='e'?'en-US':'ja-JP'):lang;if(want!=lang){lang=want;if(rec)try{rec.abort()}catch(e){}}}
// alts: 認識候補ぜんぶ。見えているモグラ全員と照らし合わせて、当たったモグラを返す
function check(alts){const hits=[];moles.forEach(m=>{if(!m.q)return;
 const ok=m.q.t=='e'?Matcher.matchEn(alts,m.q.show,m.q.ans):Matcher.matchJa(alts,m.q.show,m.q.ans);
 if(ok){hits.push(m.q.show);score+=10;$('score').textContent=score;m.el.classList.add('hit');m.el.classList.remove('target');sHit();
  const b=m.el.querySelector('.bub');b.textContent='⭕ '+alts[0];b.classList.add('on');setTimeout(()=>b.classList.remove('on'),900);
  const mm=m;mm.q=null;clearTimeout(mm.to);setTimeout(()=>{mm.el.classList.remove('up');mark()},400)}});return hits}
function listen(){if(!running||!SR)return;rec=new SR();rec.lang=lang;rec.interimResults=true;rec.continuous=!/iPhone|iPad/.test(navigator.userAgent);rec.maxAlternatives=10;
 rec.onstart=()=>$('mic').textContent='🎤 きいてるよ（'+(lang=='ja-JP'?'にほんご':'えいご')+'）';
 rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i],alts=[];for(let j=0;j<r.length;j++)alts.push(r[j].transcript);
  const hits=check(alts),H=$('heard');
  if(hits.length){H.innerHTML='きこえた「'+esc(alts[0])+'」<br><b class="okc">⭕ '+hits.map(esc).join('・')+' に あたり！</b>';try{rec.abort()}catch(x){}}
  else if(r.isFinal&&moles.some(m=>m.q)){H.innerHTML='きこえた「'+esc(alts[0])+'」<br><b class="ngc">❌ どのモグラとも ちがうよ</b>';sMiss()}
  else H.innerHTML='きこえた「'+esc(alts[0])+'」…'}};
 rec.onerror=e=>{if(e.error=='not-allowed'||e.error=='service-not-allowed'){$('mic').textContent='⚠️ マイクがきょかされていません';running&&end()}};
 rec.onend=()=>{if(running)setTimeout(listen,150)};try{rec.start()}catch(e){setTimeout(listen,500)}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
async function start(){if(!SR){alert('おんせいにんしきが つかえません');return}
 AC=AC||new (window.AudioContext||window.webkitAudioContext)();AC.resume();$('heard').textContent='じゅんびちゅう…';await Promise.race([sheetReady,new Promise(r=>setTimeout(r,2500))]);P=pool();if(!P.length){alert('もんだいが ありません（せっていかシートを見てね）');return}score=0;left=S.time;missed=[];$('score').textContent=0;$('time').textContent=left;$('heard').textContent='…';
 build();show('game');running=true;lang=S.mode=='eng'?'en-US':'ja-JP';mark();listen();spawn();
 timer=setInterval(()=>{$('time').textContent=--left;if(left<=0)end()},1000)}
function end(){running=false;clearInterval(timer);clearTimeout(spawnT);moles.forEach(down);try{rec&&rec.abort()}catch(e){}
 $('final').textContent='⭐ '+score;const u=[...new Map(missed.map(q=>[q.show,q])).values()];
 $('miss').innerHTML=u.length?'<b>れんしゅうしよう</b><br>'+u.map(q=>esc(q.show)+(q.t=='k'?'（'+esc(q.ans.join('・'))+'）':'')).join('<br>'):'ぜんぶ たたけたね！すごい！';show('end');tone(660,.2);setTimeout(()=>tone(990,.4),200)}
$('go').onclick=start;$('again').onclick=start;$('quit').onclick=end;$('home2').onclick=()=>show('home');
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
