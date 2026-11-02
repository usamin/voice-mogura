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
function pool(){const gs=S.lower?[...Array(S.grade).keys()].map(i=>i+1):[S.grade];let p=[];
 if(S.mode!='eng')gs.forEach(g=>KANJI[g].forEach(([k,r])=>p.push({t:'k',show:k,ans:r.split(',')})));
 if(S.mode!='kanji')gs.forEach(g=>ENG[g].forEach(w=>p.push({t:'e',show:w,ans:[w]})));return p}
let moles=[],score,left,timer,spawnT,P,running=false,rec,lang,missed;
function build(){$('field').innerHTML='';moles=[];for(let i=0;i<9;i++){const h=document.createElement('div');h.className='hole';h.innerHTML='<div class="mole"><div class="w"></div><div class="f">• ᴥ •</div></div>';$('field').appendChild(h);moles.push({el:h.firstChild,q:null,to:0})}}
function spawn(){if(!running)return;const free=moles.filter(m=>!m.q);const active=moles.filter(m=>m.q).length;
 if(free.length&&active<(S.mode=='mix'?1:2)){const m=free[Math.random()*free.length|0];let q;
  const cur=moles.find(x=>x.q);do q=P[Math.random()*P.length|0];while(cur&&(q.t!=cur.q.t||q.show==cur.q.show)&&P.some(x=>x.t==cur.q.t&&x.show!=cur.q.show));
  m.q=q;m.el.querySelector('.w').textContent=q.show;m.el.querySelector('.w').style.fontSize=q.show.length>6?'16px':'22px';m.el.classList.remove('hit');m.el.classList.add('up');sPop();
  m.to=setTimeout(()=>{if(m.q){missed.push(m.q);sMiss();down(m)}},S.speed);setLang();}
 spawnT=setTimeout(spawn,900)}
function down(m){m.q=null;m.el.classList.remove('up');clearTimeout(m.to)}
function setLang(){const m=moles.find(x=>x.q);const want=m?(m.q.t=='e'?'en-US':'ja-JP'):lang;if(want!=lang){lang=want;if(rec)try{rec.abort()}catch(e){}}}
function check(txt){const n=norm(txt);let hit=false;moles.forEach(m=>{if(!m.q)return;
 const ok=m.q.ans.some(a=>{a=norm(a);return n.includes(a)||n.includes(norm(m.q.show))});
 if(ok){hit=true;score+=10;$('score').textContent=score;m.el.classList.add('hit');sHit();const mm=m;mm.q=null;clearTimeout(mm.to);setTimeout(()=>mm.el.classList.remove('up'),400)}});return hit}
function listen(){if(!running||!SR)return;rec=new SR();rec.lang=lang;rec.interimResults=true;rec.continuous=!/iPhone|iPad/.test(navigator.userAgent);rec.maxAlternatives=5;
 rec.onstart=()=>$('mic').textContent='🎤 きいてるよ（'+(lang=='ja-JP'?'にほんご':'えいご')+'）';
 rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];let shown=r[0].transcript;
  for(let j=0;j<r.length;j++)if(check(r[j].transcript)){shown=r[j].transcript+' ⭕';try{rec.abort()}catch(x){}break}
  $('heard').textContent='「'+shown+'」'}};
 rec.onerror=e=>{if(e.error=='not-allowed'||e.error=='service-not-allowed'){$('mic').textContent='⚠️ マイクがきょかされていません';running&&end()}};
 rec.onend=()=>{if(running)setTimeout(listen,150)};try{rec.start()}catch(e){setTimeout(listen,500)}}
function start(){if(!SR){alert('おんせいにんしきが つかえません');return}
 AC=AC||new (window.AudioContext||window.webkitAudioContext)();AC.resume();P=pool();score=0;left=S.time;missed=[];$('score').textContent=0;$('time').textContent=left;$('heard').textContent='…';
 build();show('game');running=true;lang=S.mode=='eng'?'en-US':'ja-JP';listen();spawn();
 timer=setInterval(()=>{$('time').textContent=--left;if(left<=0)end()},1000)}
function end(){running=false;clearInterval(timer);clearTimeout(spawnT);moles.forEach(down);try{rec&&rec.abort()}catch(e){}
 $('final').textContent='⭐ '+score;const u=[...new Map(missed.map(q=>[q.show,q])).values()];
 $('miss').innerHTML=u.length?'<b>れんしゅうしよう</b><br>'+u.map(q=>q.show+(q.t=='k'?'（'+q.ans.join('・')+'）':'')).join('<br>'):'ぜんぶ たたけたね！すごい！';show('end');tone(660,.2);setTimeout(()=>tone(990,.4),200)}
$('go').onclick=start;$('again').onclick=start;$('quit').onclick=end;$('home2').onclick=()=>show('home');
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
