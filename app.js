const $=id=>document.getElementById(id),show=s=>document.querySelectorAll('.scr').forEach(e=>e.classList.toggle('on',e.id==s));
const DEF={grade:3,eLv:'same',mode:'kanji',time:60,speed:5000,lower:false,judge:1};
let S=Object.assign({},DEF,JSON.parse(localStorage.getItem('moguraSet')||'{}'));
for(let g=1;g<=6;g++)$('sGrade').innerHTML+=`<option value="${g}">${g}ねんせい</option>`;
function syncKtestNote(){const n=$('ktestNote');if(n)n.style.display=$('sMode').value==='ktest'?'block':'none'}
function loadSet(){$('sELv').value=S.eLv;$('sJudge').value=S.judge;$('sGrade').value=S.grade;$('sMode').value=S.mode;$('sTime').value=S.time;$('sSpeed').value=S.speed;$('sLower').checked=S.lower;syncKtestNote()}
$('toSet').onclick=()=>{loadSet();show('set')};
$('sMode').onchange=syncKtestNote;
$('save').onclick=()=>{S={eLv:$('sELv').value,judge:+$('sJudge').value,grade:+$('sGrade').value,mode:$('sMode').value,time:+$('sTime').value,speed:+$('sSpeed').value,lower:$('sLower').checked};localStorage.setItem('moguraSet',JSON.stringify(S));bindLex();refreshHint();show('home')};
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
// grade: 1〜6=小学校, 7(または「中学」)=中学, 8(または「高校」)=高校
const gradeOf=g=>{g=String(g||'').trim();if(/^中/.test(g))return 7;if(/^高/.test(g))return 8;if(/^小/.test(g))return 1;return parseInt(g)};
function parseTab(text){const out={};csv(text).forEach(([g,w,r,en])=>{g=gradeOf(g);w=(w||'').trim();if(!(g>=1&&g<=8)||!w)return;
 if(String(en||'').trim().toUpperCase()=='FALSE')return;(out[g]=out[g]||[]).push([w,splitR(r)])});return out}
function normHead(s){return String(s||'').replace(/^\ufeff/,'').trim().toLowerCase().replace(/[（(].*$/,'').trim()}
const TEST_K=['漢字','かんじ','kanji','word','words'];
const TEST_R=['読み','よみ','readings','reading','yomi'];
function parseTestSheet(text){const rows=csv(String(text||'').replace(/^\ufeff/,''));const out=[];
 let i0=0;while(i0<rows.length&&rows[i0].every(c=>!String(c||'').trim()))i0++;if(i0>=rows.length)return out;
 const head=rows[i0].map(normHead);const ki=head.findIndex(h=>TEST_K.includes(h)),ri=head.findIndex(h=>TEST_R.includes(h));
 let colK=0,colR=1,start=i0;if(ki>=0&&ri>=0&&ki!==ri){colK=ki;colR=ri;start=i0+1}
 for(let i=start;i<rows.length;i++){const row=rows[i]||[];const kanji=String(row[colK]||'').trim();const reading=String(row[colR]||'').trim();
  if(!kanji||!reading)continue;const hk=normHead(kanji),hr=normHead(reading);
  if(TEST_K.includes(hk)&&TEST_R.includes(hr)||TEST_R.includes(hk)&&TEST_K.includes(hr))continue;
  const rs=splitR(reading);if(!rs.length)continue;out.push([kanji,rs])}
 return out}
let DATA={k:{},e:{},kt:[]};for(const g in KANJI)DATA.k[g]=KANJI[g].map(([k,r])=>[k,r.split(',')]);for(const g in ENG)DATA.e[g]=ENG[g].map(w=>[w,[]]);DATA.s={1:SENT.map(w=>[w,[]])};const BUILTIN_S=DATA.s;
try{const c=JSON.parse(localStorage.getItem('moguraSheet')||'null');if(c&&c.k&&c.e){DATA=Object.assign({s:BUILTIN_S,kt:[]},c);if(!Array.isArray(DATA.kt))DATA.kt=[]}}catch(e){}
// 同音の別表記は、いまの学年だけでなく読み込まれた漢字表ぜんぶ。漢字テスト用の表記は、そのモードのときだけ足す
function bindLex(){Matcher.setJaLexicon(Matcher.lexiconRows(S.mode,DATA.k,DATA.kt))}
const KTEST_HINT='「漢字テスト用」のシートに、A列へ漢字、B列へ読みを入れてね（1行目は見出しです）';
function refreshHint(){if(!SR)return;$('warn').textContent=(S.mode==='ktest'&&!(DATA.kt&&DATA.kt.length))?KTEST_HINT:''}
bindLex();refreshHint();
async function loadSheet(){try{const ctl=new AbortController();setTimeout(()=>ctl.abort(),6000);
 const [k,e,st,kt]=await Promise.allSettled(['漢字','英語','ショートセンテンス','漢字テスト用'].map(t=>fetch(sheetURL(t),{cache:'no-store',signal:ctl.signal}).then(r=>{if(!r.ok)throw r.status;return r.text()})));
 const tab=(x,fb)=>{if(x.status!='fulfilled')return fb;const o=parseTab(x.value);return Object.keys(o).length?o:fb};
 const ktOk=kt.status==='fulfilled',ktRows=Matcher.nextKt(ktOk,ktOk?parseTestSheet(kt.value):[],DATA.kt);
 if(k.status!='fulfilled'&&e.status!='fulfilled'&&!ktOk)throw 'offline';
 const mainOff=k.status!='fulfilled'&&e.status!='fulfilled';
 const d={k:tab(k,DATA.k),e:tab(e,DATA.e),s:tab(st,DATA.s),kt:ktRows};
 if(mainOff){d.k=DATA.k;d.e=DATA.e;d.s=DATA.s}
 DATA=d;bindLex();localStorage.setItem('moguraSheet',JSON.stringify(d));refreshHint()}catch(err){console.warn('sheet',err)}}
const sheetReady=loadSheet();
const upTo=n=>S.lower?[...Array(n).keys()].map(i=>i+1):[n];
// モード: kanji=漢字 / eng=英単語 / sent=英文 / emix=英単語+英文 / mix=漢字+英単語
function pool(){if(S.mode==='ktest')return Matcher.kanjiQuestions(DATA.kt);
 const eg=S.eLv=='same'?S.grade:+S.eLv;let p=[];
 if(S.mode=='kanji'||S.mode=='mix')upTo(Math.min(S.grade,6)).forEach(g=>(DATA.k[g]||[]).forEach(([k,r])=>p.push({t:'k',show:k,ans:r})));
 if(S.mode=='eng'||S.mode=='emix'||S.mode=='mix')upTo(eg).forEach(g=>(DATA.e[g]||[]).forEach(([w,r])=>p.push({t:'e',show:w,ans:r})));
 if(S.mode=='sent'||S.mode=='emix')Object.values(DATA.s||{}).flat().forEach(([w,r])=>p.push({t:'s',show:w,ans:r}));return p}
const LG=q=>q.t=='k'?'k':'e';

// ===== ドラゴン（金=+20てん / 闇=+2びょう）=====
const DRG={g:{id:'g',b1:'#ffca28',b2:'#c62828',wing:'#d32f2f',edge:'#7a3b00',mem:'#ffd54f',horn:'#fff8e1',crest:'#ffd600',belly:'#fff176',eye:'#fff',aura:1,extra:'<circle class="glow" cx="120" cy="46" r="4" fill="#fff"/>'},
 d:{id:'d',b1:'#4a148c',b2:'#0d1b3e',wing:'#1a1446',edge:'#000',mem:'#7c4dff',horn:'#b0bec5',crest:'#00e5ff',belly:'#283593',eye:'#00e5ff',aura:0,extra:'<path class="glow" d="M30 20 L44 40 L36 42 L50 64 L28 38 L36 36Z M210 20 L196 40 L204 42 L190 64 L212 38 L204 36Z" fill="#ffff00"/>'}};
const dsvg=c=>`<svg class="ds ds${c.id}" viewBox="0 0 240 125">
${c.aura?`<ellipse class="glow" cx="120" cy="70" rx="115" ry="70" fill="url(#a${c.id})"/>`:''}<g fill="${c.wing}" stroke="${c.edge}" stroke-width="2"><path d="M78 60 L5 8 L18 40 L0 45 L22 70 L8 82 L60 95 Z"/><path d="M162 60 L235 8 L222 40 L240 45 L218 70 L232 82 L180 95 Z"/></g>
<g stroke="${c.mem}" stroke-width="1.5" fill="none"><path d="M75 65 L12 18 M70 75 L8 50 M65 85 L20 78"/><path d="M165 65 L228 18 M170 75 L232 50 M175 85 L220 78"/></g>
<path d="M97 32 Q88 20 76 14 Q94 16 105 30Z M143 32 Q152 20 164 14 Q146 16 135 30Z" fill="${c.horn}" stroke="${c.edge}" stroke-width="1.5"/>
<path class="bd" d="M120 22 Q170 22 172 72 L176 125 L64 125 L68 72 Q70 22 120 22Z" fill="url(#b${c.id})" stroke="${c.edge}" stroke-width="2"/><path d="M110 26 L114 16 L120 24 L126 16 L130 26" fill="${c.crest}"/>
<path d="M100 100 L120 92 L140 100 L140 125 L100 125Z" fill="${c.belly}" opacity=".8"/><path d="M104 106 H136 M102 114 H138" stroke="${c.edge}" stroke-width="1.5"/>
<g class="eye"><path d="M90 58 L112 64 L108 72 L90 68Z M150 58 L128 64 L132 72 L150 68Z" fill="${c.eye}"/><path d="M100 62 v8 M140 62 v8" stroke="#000" stroke-width="2.5"/></g>
<text class="x" x="120" y="72" text-anchor="middle" font-size="20" font-weight="bold" fill="#000">✕ ✕</text>
<path d="M108 88 Q120 94 132 88" stroke="#000" stroke-width="2" fill="none"/><path d="M111 89 l2 6 l2 -5 M129 89 l-2 6 l-2 -5" fill="#fff"/><circle cx="113" cy="80" r="1.8"/><circle cx="127" cy="80" r="1.8"/>${c.extra}</svg>`;
const DEFS='<svg width="0" height="0" style="position:absolute">'+[DRG.g,DRG.d].map(c=>`<defs><radialGradient id="a${c.id}"><stop offset="0" stop-color="#ffd600" stop-opacity=".8"/><stop offset="1" stop-color="#ffd600" stop-opacity="0"/></radialGradient><linearGradient id="b${c.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.b1}"/><stop offset="1" stop-color="${c.b2}"/></linearGradient></defs>`).join('')+'</svg>';
let moles=[],score,left,timer,spawnT,P,running=false,rec,lang,missed,due=[];
function readMissStore(){try{const o=JSON.parse(localStorage.getItem('moguraMiss')||'{}');return o&&typeof o==='object'?o:{}}catch(e){return {}}}
function writeMissStore(o){try{localStorage.setItem('moguraMiss',JSON.stringify(o||{}))}catch(e){}}
function clearSavedMiss(q){if(!q)return;for(let i=missed.length-1;i>=0;i--)if(missed[i]&&missed[i].t===q.t&&String(missed[i].show)===String(q.show))missed.splice(i,1);
 due=due.filter(x=>!(x.t===q.t&&String(x.show)===String(q.show)));const store=readMissStore();Matcher.forgetMiss(store,Matcher.missBucket(S),q);writeMissStore(store)}
function build(){$('field').innerHTML=DEFS;moles=[];for(let i=0;i<9;i++){const h=document.createElement('div');h.className='hole';h.innerHTML='<div class="mole"><div class="tg">👇 よんで！</div><div class="bub"></div><div class="w"></div><div class="f">• ᴥ •</div>'+dsvg(DRG.g)+dsvg(DRG.d)+'<span class="pts"></span><div class="fx"></div></div>';$('field').appendChild(h);moles.push({el:h.firstChild,q:null,to:0})}}
function spawn(){if(!running)return;const free=moles.filter(Matcher.moleOpen);const active=moles.filter(m=>m.q).length;
 if(free.length&&active<(S.mode=='mix'?1:2)){const m=free[Math.random()*free.length|0];let q;
  const cur=moles.find(x=>x.q&&!x.hit);const picked=Matcher.takeDue(due,P,moles.filter(x=>x.q).map(x=>x.q),cur);due=picked.due;q=picked.q;
  if(!q)do q=P[Math.random()*P.length|0];while(cur&&(LG(q)!=LG(cur.q)||q.show==cur.q.show)&&P.some(x=>LG(x)==LG(cur.q)&&x.show!=cur.q.show));
  m.kind=(r=>r<.09?'g':r<.18?'d':'')(Math.random());m.el.classList.remove('dg','dd');if(m.kind)m.el.classList.add('d'+m.kind);m.el.querySelector('.pts').textContent=m.kind=='g'?'20':m.kind=='d'?'+2秒':'';
  m.hit=false;m.q=q;const W=m.el.querySelector('.w');W.textContent=q.show;W.classList.toggle('sent',q.t=='s');W.style.fontSize=q.t=='s'?(q.show.length>16?'11px':'13px'):q.show.length>9?'13px':q.show.length>6?'16px':'22px';m.el.classList.remove('hit');m.born=Date.now();m.el.classList.add('up');mark();sPop();
  m.born=Date.now();m.to=setTimeout(()=>{if(Matcher.countsAsMiss(m)){missed.push(m.q);sMiss();down(m)}},q.t=='s'?S.speed*1.6:S.speed);setLang();}
 spawnT=setTimeout(spawn,900)}
function down(m){m.q=null;m.hit=false;m.el.classList.remove('up','target');clearTimeout(m.to);m.to=0;mark()}
// いちばん先に出たモグラを「ねらい」として光らせる（ほかのモグラも よめば たたける）
function mark(){const up=moles.filter(x=>x.q&&!x.hit).sort((a,b)=>a.born-b.born);moles.forEach(x=>x.el.classList.toggle('target',x==up[0]));const l=up[0]?LG(up[0].q):(lang=='en-US'?'e':'k');$('lang').textContent=l=='e'?'🔤 えいごで よんでね':'あ にほんごで よんでね';$('lang').className=l=='e'?'en':'ja'}
function setLang(){const m=moles.find(x=>x.q&&!x.hit);const want=m?(m.q.t!='k'?'en-US':'ja-JP'):lang;if(want!=lang){lang=want;if(rec)try{rec.abort()}catch(e){}}}
// alts: 認識候補ぜんぶ。見えているモグラ全員と照らし合わせて、当たったモグラを返す
function check(alts){const hits=[];moles.forEach(m=>{if(!m.q||m.hit)return;
 const J=S.judge??1,ok=m.q.t=='s'?Matcher.matchSent(alts,m.q.show,m.q.ans,J):m.q.t=='e'?Matcher.matchEn(alts,m.q.show,m.q.ans,J):Matcher.matchJa(alts,m.q.show,m.q.ans,J);
 if(ok){hits.push(m.q.show);clearSavedMiss(m.q);score+=m.kind=='g'?20:10;if(m.kind=='d'){left+=2;$('time').textContent=left;const fx=m.el.querySelector('.fx');fx.textContent='+2びょう！';fx.classList.remove('on');void fx.offsetWidth;fx.classList.add('on')}$('score').textContent=score;m.el.classList.add('hit');m.el.classList.remove('target');sHit();
  const b=m.el.querySelector('.bub');b.textContent='⭕ '+alts[0];b.classList.add('on');setTimeout(()=>b.classList.remove('on'),900);
  // 正解しても消えるまで q を残す。すぐ空けると、隠れた穴に別の問題が入って復習に紛れ込む
  clearTimeout(m.to);m.to=0;m.hit=true;const mm=m;setTimeout(()=>down(mm),400)}});return hits}
function listen(){if(!running||!SR)return;rec=new SR();rec.lang=lang;rec.interimResults=true;rec.continuous=!/iPhone|iPad/.test(navigator.userAgent);rec.maxAlternatives=10;
 rec.onstart=()=>$('mic').textContent='🎤 きいてるよ（'+(lang=='ja-JP'?'にほんご':'えいご')+'）';
 rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i],alts=[];for(let j=0;j<r.length;j++)alts.push(r[j].transcript);
  const hits=check(alts),H=$('heard');
  if(hits.length){H.innerHTML='きこえた「'+esc(alts[0])+'」<br><b class="okc">⭕ '+hits.map(esc).join('・')+' に あたり！</b>';try{rec.abort()}catch(x){}}
  else if(r.isFinal&&moles.some(m=>m.q&&!m.hit)){H.innerHTML=Matcher.renderMiss(alts,moles.filter(m=>m.q&&!m.hit).map(m=>({t:m.q.t,show:m.q.show,ans:m.q.ans})),esc);sMiss()}
  else H.innerHTML='きこえた「'+esc(alts[0])+'」…'}};
 rec.onerror=e=>{if(e.error=='not-allowed'||e.error=='service-not-allowed'){$('mic').textContent='⚠️ マイクがきょかされていません';running&&end()}};
 rec.onend=()=>{if(running)setTimeout(listen,150)};try{rec.start()}catch(e){setTimeout(listen,500)}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
function stopClocks(){clearInterval(timer);timer=0;clearTimeout(spawnT);spawnT=0}
async function start(){if(!SR){alert('おんせいにんしきが つかえません');return}
 AC=AC||new (window.AudioContext||window.webkitAudioContext)();AC.resume();$('heard').textContent='じゅんびちゅう…';await Promise.race([sheetReady,new Promise(r=>setTimeout(r,2500))]);P=pool();if(S.mode==='ktest'&&!P.length){$('warn').textContent=KTEST_HINT;show('home');return}if(!P.length){alert('もんだいが ありません（せっていかシートを見てね）');return}
 stopClocks();if(running){moles.forEach(m=>{if(Matcher.countsAsMiss(m))missed.push(m.q)});const store=readMissStore();Matcher.rememberMisses(store,Matcher.missBucket(S),Matcher.reviewMisses(missed));writeMissStore(store);running=false;moles.forEach(down);try{rec&&rec.abort()}catch(e){}}
 score=0;left=S.time;missed=[];due=Matcher.dueMisses(readMissStore(),Matcher.missBucket(S),P);$('score').textContent=0;$('time').textContent=left;$('heard').textContent='…';
 build();show('game');running=true;lang=/eng|sent|emix/.test(S.mode)?'en-US':'ja-JP';mark();listen();spawn();
 timer=setInterval(()=>{$('time').textContent=--left;if(left<=0)end()},1000)}
function end(){if(!running&&!moles.some(m=>m.q)){show('end');return}running=false;stopClocks();
 moles.forEach(m=>{if(Matcher.countsAsMiss(m))missed.push(m.q);down(m)});try{rec&&rec.abort()}catch(e){}
 $('final').textContent='⭐ '+score;const u=Matcher.reviewMisses(missed);const store=readMissStore();Matcher.rememberMisses(store,Matcher.missBucket(S),u);writeMissStore(store);
 $('miss').innerHTML=u.length?'<b>れんしゅうしよう</b><br>'+u.map(q=>esc(q.show)+(q.t=='k'?'（'+esc(q.ans.join('・'))+'）':'')).join('<br>'):'ぜんぶ たたけたね！すごい！';show('end');tone(660,.2);setTimeout(()=>tone(990,.4),200)}
$('ver').textContent=APP_VER+'・'+APP_DATE;
$('go').onclick=start;$('again').onclick=start;$('quit').onclick=end;$('home2').onclick=()=>show('home');
// はつおんチェック。マイクと一覧だけで、モグラ・得点・タイマー・復習は触らない
let prec=null,pItem=null;
function stopPrec(){try{prec&&prec.abort()}catch(e){}prec=null}
function pronData(){return {k:DATA.k,e:DATA.e,s:DATA.s,kt:DATA.kt}}
function renderPronList(){const src=$('pSrc').value,items=Matcher.filterCheckItems(Matcher.checkList(src,pronData(),S),$('pFind').value);
 $('pNote').textContent=Matcher.checkNote(src,S)+(src==='ktest'&&!Matcher.checkList(src,pronData(),S).length?'。'+KTEST_HINT:'');
 const box=$('pList');box.innerHTML='';if(!items.length){box.textContent='ないよ';return}
 const frag=document.createDocumentFragment();items.forEach(it=>{const b=document.createElement('button');b.type='button';b.textContent=it.show;b.onclick=()=>openPron(it);frag.appendChild(b)});box.appendChild(frag)}
function openPron(it){pItem=it;$('pPick').style.display='none';$('pSay').style.display='block';$('pWord').textContent=it.show;$('pWord').classList.toggle('sent',it.t==='s');$('pRead').textContent=it.t==='k'&&it.ans&&it.ans.length?it.ans.join('・'):'';$('pHeard').textContent='…';listenPron()}
function listenPron(){stopPrec();if(!pItem)return;if(!SR){$('pMic').textContent='このブラウザは おんせいにんしきに たいおうしていません（iPhoneはSafari、AndroidはChromeでひらいてね）';return}
 const item=pItem,lang=item.t==='k'?'ja-JP':'en-US';prec=new SR();prec.lang=lang;prec.interimResults=true;prec.continuous=!/iPhone|iPad/.test(navigator.userAgent);prec.maxAlternatives=10;
 prec.onstart=()=>$('pMic').textContent='🎤 きいてるよ（'+(lang=='ja-JP'?'にほんご':'えいご')+'）';
 prec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i],alts=[];for(let j=0;j<r.length;j++)alts.push(r[j].transcript);
  const ok=Matcher.judgeItem(item,alts,S.judge??1);
  $('pHeard').innerHTML=r.isFinal||ok?Matcher.renderCheck(alts,ok,esc):'きこえた「'+esc(alts[0]||'')+'」…';
  if(r.isFinal){$('pMic').textContent='もういちど で ききなおせるよ';try{prec.abort()}catch(e){}}}};
 prec.onerror=ev=>{if(ev.error=='not-allowed'||ev.error=='service-not-allowed')$('pMic').textContent='⚠️ マイクがきょかされていません'};
 prec.onend=()=>{};try{prec.start()}catch(e){$('pMic').textContent='マイクを ひらけませんでした'}}
function showPron(){stopPrec();pItem=null;$('pSay').style.display='none';$('pPick').style.display='block';$('pFind').value='';renderPronList();show('pron')}
$('toCheck').onclick=showPron;$('pSrc').onchange=renderPronList;$('pFind').oninput=renderPronList;
$('pRetry').onclick=()=>{if(!pItem)return;$('pHeard').textContent='…';listenPron()};
$('pBackList').onclick=()=>{stopPrec();pItem=null;$('pSay').style.display='none';$('pPick').style.display='block'};
$('pHome').onclick=()=>{stopPrec();pItem=null;show('home')};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
// ホーム画面に追加したPWAには再読み込みが無い。ここから最新の版を取り直す
async function forceUpdate(){const b=$('upd');if(b)b.disabled=true;try{
 if(window.caches){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('mogura-')&&k!=='mogura-'+APP_VER).map(k=>caches.delete(k)))}
 if(navigator.serviceWorker){const reg=await navigator.serviceWorker.getRegistration();
  if(reg){const tell=w=>{try{w&&w.postMessage({type:'SKIP_WAITING'})}catch(e){}};tell(reg.waiting);
   try{await Promise.race([reg.update(),new Promise(r=>setTimeout(r,4000))])}catch(e){}
   tell(reg.waiting);tell(reg.installing);const w=reg.installing||reg.waiting;
   if(w&&w.state!=='activated')await new Promise(res=>{const t=setTimeout(res,2500);w.addEventListener('statechange',()=>{if(w.state==='activated'||w.state==='redundant'){clearTimeout(t);res()}})})}}
}catch(e){}const u=new URL(location.href);u.searchParams.set('upd',String(Date.now()));location.replace(u.href)}
$('upd').onclick=forceUpdate;
