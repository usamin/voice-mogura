// こえでモグラ: 判定ロジック（ブラウザとnodeの両方で使える）
(function(G){
const kata2hira=s=>s.replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const normJa=s=>kata2hira(String(s).toLowerCase().normalize('NFKC')).replace(/[\s、。・!！?？ー\-.,'"「」]/g,'');
const NUM={zero:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',eleven:'11',twelve:'12'};
const DIG=Object.fromEntries(Object.entries(NUM).map(([k,v])=>[v,k]));
// よくある聞き間違い（短い単語・同音語）
const SOUND={no:['know','now','nope','noh','know'],two:['to','too','tu'],four:['for','fore','fur'],eight:['ate','eat'],one:['won','wan'],sun:['son','sunny'],red:['read','rad','rid'],bear:['bare','bar','beer'],eat:['it','eats','heat'],hi:['high'],yes:['yeah','yea','yep','yas'],ten:['tan','tin','then'],pen:['pan','pin','ben'],cat:['cut','cap','kat','kit'],dog:['doug','dug','dock'],cup:['cop','cap','cub'],bag:['back','big','bug','beg'],egg:['ag','ack','ech'],hat:['hot','heart','had'],car:['card','cart','ka','kar'],ball:['bowl','bull','paul'],star:['stop','store'],six:['sex','sics','sick','sicks'],nine:['nein','night'],rice:['lice','rise','ryce'],run:['ran','rum','lun'],sing:['sink','thing','sign'],swim:['swing'],hot:['hut','what'],sad:['said','set','sat'],big:['bick','pig'],pig:['peg','pick','big'],cow:['caw','cal','kow'],lion:['ryan','line','lyon'],juice:['use','juices','juice'],water:['waiter','wata','wader'],snow:['snore','slow'],rain:['lane','rein','reign'],tree:['three','tea'],three:['tree','free'],blue:['blew','brew'],milk:['mill','mic'],book:['look','buck'],fish:['fresh','fist'],moon:['moan','mun'],cake:['kick','cave'],desk:['disk','task'],white:['wait','wide','why'],black:['block','brack'],pink:['pin','ping'],peach:['pitch','beach','piece'],grape:['great','grip'],lemon:['lemmon','lemons'],melon:['mellon','melons'],bread:['bred','brad','bed'],sleep:['slip','sheep'],jump:['champ','dump'],dance:['dense','dunce'],cold:['called','code','coal'],small:['smaller'],happy:['happi','happen'],friend:['friends','fred'],school:['skool','cool'],flower:['flour','flowers'],monkey:['monkeys','money'],tiger:['tigger'],rabbit:['rabbits','rabid'],orange:['oranges'],hello:['hallo','hullo','halo'],morning:['moaning'],night:['knight','nite'],ruler:['rula','roller']};
function lev(a,b){if(a==b)return 0;const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=[...Array(n+1).keys()];
 for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]==b[j-1]?0:1));p=c}return p[n]}
// 発音が近いものを同じキーにするかんたんな変換
const sk=w=>w.replace(/ph/g,'f').replace(/ck/g,'k').replace(/c(?=[eiy])/g,'s').replace(/c/g,'k').replace(/q/g,'k').replace(/x/g,'ks').replace(/z/g,'s').replace(/wh/g,'w').replace(/th/g,'t').replace(/gh/g,'').replace(/kn/g,'n').replace(/wr/g,'r').replace(/l/g,'r').replace(/v/g,'b').replace(/y$/,'i').replace(/e$/,'').replace(/[aeiouy]+/g,'a').replace(/(.)\1+/g,'$1');
const stem=w=>w.length>3?w.replace(/(ies)$/,'y').replace(/(ches|shes|xes|ses)$/,m=>m.slice(0,-2)).replace(/([^s])s$/,'$1'):w;
const STOP=new Set(['a','an','the','i','it','its','is','say','said','um','uh','oh','my','this','that','please','ok','okay']);
function looseWord(ts,ws){const L=ws.length,d=lev(ts,ws),a=sk(ts),b=sk(ws);if(!a||!b||a[0]!=b[0])return false;
 if(a==b)return true;if(L<=3)return d<=1&&ts.length>=2;return d<=Math.ceil(L*.4)||lev(a,b)<=1}
const enTokens=s=>String(s).toLowerCase().normalize('NFKC').replace(/[^a-z0-9' ]+/g,' ').replace(/'/g,'').split(/\s+/).filter(Boolean).map(t=>DIG[t]||t);
// lv: 0=やさしい 1=ふつう 2=きびしい
function closeWord(t,w,lv=1){ // t: 聞こえた単語, w: 正解
 if(t==w)return true;const ts=stem(t),ws=stem(w);if(ts==ws)return true;if(lv>=2)return false;
 if(lv<=0&&looseWord(ts,ws))return true;
 const L=w.length,d=lev(ts,ws),f0=ts[0]==ws[0]||sk(ts)[0]==sk(ws)[0];if(!f0)return false;
 if(L<=3){if(d<=1&&ts[0]==ws[0]&&Math.abs(ts.length-ws.length)<=1&&ts.length>=2)return true}
 else if(L<=5){if(d<=1&&(ts.length>=L||ts[ts.length-1]==ws[ws.length-1]||L>=5))return true;if(d<=2&&ts[0]==ws[0]&&sk(ts)==sk(ws))return true}
 else{if(d<=2&&L>=6)return true;if(d<=Math.ceil(L*.34)&&ts[0]==ws[0])return true}
 const a=sk(ts),b=sk(ws);return L>=4&&a==b&&ts[0]==ws[0];}
// en: word=正解, extra=シートで追加した別解, alts=認識候補（最大10）
function matchEn(alts,word,extra=[],lv=1){
 const targets=[word,...extra].map(x=>String(x).toLowerCase().trim()).filter(Boolean);
 for(const alt of alts){const toks=enTokens(alt).filter(t=>!STOP.has(t));if(!toks.length)continue;const joined=toks.join('');
  for(const tg of targets){const tw=enTokens(tg).filter(t=>!STOP.has(t)).join('');if(!tw)continue;
   if(joined==tw)return true;
   const sounds=lv>=2?[]:SOUND[tw]||[];
   for(const t of toks){if(sounds.includes(t))return true;if(closeWord(t,tw,lv))return true}
   if(tw.length>=5&&closeWord(joined,tw,lv))return true;
   if(/[ぁ-んァ-ヶ]/.test(alt)&&extra.some(e=>normJa(e)==normJa(alt)))return true;}}
 return false}
// 英文: 正解の単語のうち、聞こえた単語と合っている割合で判定（やさしい60%・ふつう80%・きびしい100%）
const CONTR={its:'it is',im:'i am',dont:'do not',doesnt:'does not',cant:'can not',cannot:'can not',lets:'let us',isnt:'is not',arent:'are not',youre:'you are',hes:'he is',shes:'she is',thats:'that is',whats:'what is',wheres:'where is',theyre:'they are',were:'we are'};
const sTok=s=>enTokens(s).flatMap(t=>(CONTR[t]||t).split(' '));
const RATE=[.6,.8,1];
function sentScore(heard,target,lv=1){const tw=sTok(target),used=new Set();if(!tw.length)return 0;const ht=sTok(heard);let ok=0;
 tw.forEach(w=>{const i=ht.findIndex((t,k)=>!used.has(k)&&(t==w||(lv<2&&(SOUND[w]||[]).includes(t))||closeWord(t,w,lv)));if(i>=0){used.add(i);ok++}});return ok/tw.length}
function matchSent(alts,sent,extra=[],lv=1){const need=RATE[lv]??.8;
 return alts.some(a=>[sent,...extra].some(t=>sentScore(a,t,lv)>=need-1e-9))}
// 読みがちょうど一つの表記だけを、その読みへ対応づける。複数読みの字は入れない
let jaOne=new Map(),jaAmb=new Set();
// 常用漢字の音読み先頭一つ。シートに無い漢字を、2字以上の熟語で連結する。1字には使わない
const onYomi=new Map();
for(const part of String(G.YO_ON||'').split('|')){if(!part)continue;const y=normJa(part.slice(1));if(part[0]&&y)onYomi.set(part[0],y)}
// 常用漢字の音を全部と、点つきの訓。1字の同音と送りがなに使う。熟語の連結は音の先頭のまま
const kanjiOn=new Map(),kanjiKun=new Map();
for(const part of String(G.YO_DICT||'').split('|')){if(!part)continue;const bits=part.split('/');const ch=bits[0];if(!ch)continue;
 kanjiOn.set(ch,(bits[1]||'').split(',').map(normJa).filter(Boolean));
 kanjiKun.set(ch,(bits[2]||'').split(',').map(s=>s.trim()).filter(Boolean))}
const readParts=raw=>Array.isArray(raw)?raw:String(raw??'').split(/[、,，\/／]/);
function setJaLexicon(rows){const acc=new Map();
 for(const row of rows||[]){if(!row)continue;const surface=normJa(row[0]);if(!surface)continue;
  let set=acc.get(surface);if(!set){set=new Set();acc.set(surface,set)}
  for(const item of readParts(row[1]))for(const part of String(item??'').split(/[、,，\/／]/)){const n=normJa(part);if(n)set.add(n)}}
 jaOne=new Map();jaAmb=new Set();
 for(const [surface,set] of acc){if(set.size===1)jaOne.set(surface,[...set][0]);else jaAmb.add(surface)}}
const isKana=c=>/[\u3041-\u3096]/.test(c);
// 表記そのものの読みが一つならそれを使う。漢字だけの熟語は、2字以上のシート語を優先し、残りの字は音読みの先頭をつなぐ。
// 1字のシート読み（炭=すみ など）は熟語の中では使わない。複数読みの字が残ったら、その熟語は同音にしない。
function yomiOf(n){if(!n)return '';if(jaOne.has(n))return jaOne.get(n);if(n.length<2||jaAmb.has(n))return '';
 const kanjiOnly=[...n].every(ch=>!isKana(ch));let i=0,out='';
 while(i<n.length){let best=0;for(let j=n.length;j>i+(kanjiOnly?1:0);j--)if(jaOne.has(n.slice(i,j))){best=j;break}
  if(best){out+=jaOne.get(n.slice(i,best));i=best;continue}
  const ch=n[i];if(isKana(ch)){out+=ch;i++;continue}
  if(jaAmb.has(ch)||!onYomi.get(ch))return '';out+=onYomi.get(ch);i++}
 return out}
// 0〜99999。1桁と10は和語の数えも入れる。三百・六百・八千のような音の変化も入れる
function digitName(d,alt){return (alt?['','いち','に','さん','し','ご','ろく','しち','はち','く']:['','いち','に','さん','よん','ご','ろく','なな','はち','きゅう'])[d]||''}
function senPart(d,alt){if(!d)return '';if(d===1)return 'せん';if(d===3)return 'さんぜん';if(d===8)return 'はっせん';return digitName(d,alt)+'せん'}
function hyakuPart(d,alt){if(!d)return '';if(d===1)return 'ひゃく';if(d===3)return 'さんびゃく';if(d===6)return 'ろっぴゃく';if(d===8)return 'はっぴゃく';return digitName(d,alt)+'ひゃく'}
function juPart(d,alt){if(!d)return '';if(d===1)return 'じゅう';return digitName(d,alt)+'じゅう'}
function read4(n,alt){return senPart(Math.floor(n/1000),alt)+hyakuPart(Math.floor(n%1000/100),alt)+juPart(Math.floor(n%100/10),alt)+(n%10?digitName(n%10,alt):'')}
function readNum(n,alt){if(n<10000)return read4(n,alt);const man=Math.floor(n/10000),rest=n%10000;return (man===1?'いち':read4(man,alt))+'まん'+(rest?read4(rest,alt):'')}
function numberReadings(s){if(!/^[0-9]+$/.test(s)||s.length>5||(s.length>1&&s[0]==='0'))return [];const n=+s,out=new Set();
 if(n===0){['れい','ゼロ','まる'].forEach(r=>out.add(r));return [...out]}
 const c={1:['いち','ひと','ひとつ'],2:['に','ふた','ふたつ'],3:['さん','みっ','みっつ'],4:['よん','し','よ','よっ','よっつ'],5:['ご','いつ','いつつ'],6:['ろく','むっ','むっつ'],7:['なな','しち','ななつ'],8:['はち','やっ','やっつ'],9:['きゅう','く','ここの','ここのつ'],10:['じゅう','とお']};
 if(c[n])c[n].forEach(r=>out.add(r));
 const a=readNum(n,false),b=readNum(n,true);if(a)out.add(a);if(b)out.add(b);if(n===10000)out.add('まん');return [...out]}
function addBare(ch,out){for(const r of kanjiOn.get(ch)||[])out.add(r);
 for(const k of kanjiKun.get(ch)||[]){if(!k||k.includes('-')||k.includes('.'))continue;const y=normJa(k);if(y)out.add(y)}}
function addOkuri(ch,suffix,out){let hit=false;
 for(const k of kanjiKun.get(ch)||[]){if(!k||k.startsWith('-'))continue;const dot=k.indexOf('.');if(dot<0)continue;
  const stem=normJa(k.slice(0,dot)),ok=normJa(k.slice(dot+1));if(!stem||!ok||ok!==suffix)continue;out.add(stem+ok);hit=true}
 if(!hit)for(const r of kanjiOn.get(ch)||[])if(r)out.add(r+suffix)}
// 熟語の中の1字。音を全部と、点の前の訓（悪+者 → わる+もの）。送りの仮名自体は足さない
function pieceReadings(ch){if(isKana(ch))return [ch];const out=[],seen=new Set();
 const add=r=>{if(r&&!seen.has(r)){seen.add(r);out.push(r)}};
 for(const r of kanjiOn.get(ch)||[])add(r);
 for(const k of kanjiKun.get(ch)||[]){if(!k||k.startsWith('-'))continue;const dot=k.indexOf('.');
  const raw=(dot>=0?k.slice(0,dot):k).replace(/-+$/,'');if(!raw||raw.includes('-'))continue;add(normJa(raw))}
 return out}
// 各字の音・訓を連結して、正解の読みと完全一致するか。表記が混ぜ書きでも、聞いた熟語の読みで当たる
function compoundMatches(n,ans){if(!n||[...n].length<2||jaAmb.has(n))return false;const chars=[...n];
 if(chars.length>8||!chars.some(ch=>!isKana(ch)))return false;
 const pieces=chars.map(pieceReadings);if(pieces.some(p=>!p.length))return false;
 const targets=(ans||[]).filter(Boolean);if(!targets.length)return false;const maxLen=Math.max(...targets.map(t=>t.length));
 function walk(i,acc){if(acc.length>maxLen)return false;if(i===chars.length)return targets.includes(acc);
  if(!targets.some(t=>t.startsWith(acc)))return false;
  for(const p of pieces[i])if(walk(i+1,acc+p))return true;return false}
 return walk(0,'')}
// きこえた表記の読み。数字、1字の音と点のない訓、送りが点が一致する訓、漢字だけの熟語。
// シートで複数読みの表記は空（球のたま/きゅうは、字を言っただけでは決めない）。
function jaReadings(n){if(!n)return [];if(/^[0-9]+$/.test(n))return numberReadings(n);if(jaAmb.has(n))return [];
 const out=new Set();if(jaOne.has(n))out.add(jaOne.get(n));
 if(n.length===1){if(!isKana(n))addBare(n,out);return [...out]}
 const m=/^([^\u3041-\u3096]+)([\u3041-\u3096]+)$/.exec(n);
 if(m){if([...m[1]].length===1)addOkuri(m[1],m[2],out);return [...out]}
 if([...n].every(ch=>!isKana(ch))){const y=yomiOf(n);if(y)out.add(y)}
 return [...out]}
function setJaLexiconFromTable(table){setJaLexicon(lexiconRows('kanji',table,[]))}
// 通常モードは漢字表だけ。漢字テスト用のときだけ、そのタブの表記も同音の辞書に足す
function lexiconRows(mode,kTable,ktRows){const rows=[];
 if(kTable)for(const g of Object.keys(kTable))for(const row of kTable[g]||[])rows.push(row);
 if(mode==='ktest')for(const row of ktRows||[])rows.push(row);return rows}
// 取得成功の空配列は前回を消す。失敗のときは前回を残す
function nextKt(ok,rows,prev){return ok?(Array.isArray(rows)?rows:[]):(Array.isArray(prev)?prev:[])}
function kanjiQuestions(rows){const out=[];for(const row of rows||[]){if(!row||!row[0]||!row[1]||!row[1].length)continue;out.push({t:'k',show:row[0],ans:row[1]})}return out}
// 正解直後は q を残して穴を塞ぐ。非表示のまま別問題がタイムアウトで復習に入るのを防ぐ
function moleOpen(m){return !!(m&&!m.q)}
function countsAsMiss(m){return !!(m&&m.q&&!m.hit)}
function reviewMisses(missed){const out=[];const seen=new Set();
 for(const q of missed||[]){if(!q||q.show==null||q.show==='')continue;const k=String(q.show);if(seen.has(k))continue;seen.add(k);out.push(q)}
 return out}
// はつおんチェック。ゲームと同じ学年・英語レベル・下の学年・判定を使い、得点や復習には入れない
function gradesUpTo(n,lower){n=+n||0;if(!(n>=1))return [];return lower?[...Array(n).keys()].map(i=>i+1):[n]}
function checkList(source,data,set){const S=set||{},d=data||{};
 if(source==='ktest')return kanjiQuestions(d.kt);
 if(source==='sent'){const out=[];Object.values(d.s||{}).flat().forEach(row=>{const w=row&&row[0];if(w)out.push({t:'s',show:w,ans:row[1]||[]})});return out}
 if(source==='kanji'){const out=[];gradesUpTo(Math.min(+S.grade||0,6),!!S.lower).forEach(g=>((d.k||{})[g]||[]).forEach(([k,r])=>{if(k)out.push({t:'k',show:k,ans:r||[]})}));return out}
 if(source==='eng'){const eg=S.eLv==='same'||S.eLv==null||S.eLv===''?+S.grade:+S.eLv;const out=[];
  gradesUpTo(eg,!!S.lower).forEach(g=>((d.e||{})[g]||[]).forEach(([w,r])=>{if(w)out.push({t:'e',show:w,ans:r||[]})}));return out}
 return []}
function checkNote(source,set){const S=set||{};
 if(source==='ktest')return '学年は使いません';
 if(source==='sent')return 'ぜんぶの文';
 if(source==='eng'){const eg=S.eLv==='same'||S.eLv==null||S.eLv===''?+S.grade:+S.eLv;const name=eg>=8?'高校':eg>=7?'中学':eg+'ねん';return (S.lower&&eg>1?'1〜':'')+name}
 const g=Math.min(+S.grade||0,6);return (S.lower&&g>1?'1〜':'')+g+'ねんせい'}
function filterCheckItems(items,query){const q=normJa(query||'');const list=items||[];if(!q)return list.slice();
 return list.filter(it=>!!it&&(normJa(it.show).includes(q)||(it.ans||[]).some(a=>normJa(a).includes(q))))}
function judgeItem(item,alts,lv){if(!item)return false;const J=lv??1,a=alts||[],ans=item.ans||[];
 if(item.t==='s')return matchSent(a,item.show,ans,J);if(item.t==='e')return matchEn(a,item.show,ans,J);return matchJa(a,item.show,ans,J)}
function renderCheck(alts,ok,escFn){const esc=escFn||(s=>String(s)),heard=[];
 for(const a of alts||[]){const s=String(a??'').trim();if(s&&!heard.includes(s))heard.push(s)}
 return 'きこえた「'+esc(heard[0]||'')+'」'
  +(heard.length>1?'<br><span class="missd">ほか: '+esc(heard.slice(1).join(' / '))+'</span>':'')
  +(ok?'<br><b class="okc">○ せいかい</b>':'<br><b class="ngc">× ちがう</b>')}
// 読みが正解のどれかと完全に同じなら、やさしさに関係なく当たり。きびしいが拒むのは文の途中と1文字ちがいだけ。
// 読みの完全一致（音・訓の組み合わせを含む）は、やさしさに関係なく当たり。
// きびしいが拒むのは文の途中と1文字ちがいだけ。混ぜ書き（悪もの）も、聞いた熟語の読みがシートの読みと一致すれば当たり。
function safeHomophone(n,ans){return jaReadings(n).some(r=>ans.includes(r))||compoundMatches(n,ans)}
function matchJa(alts,show,readings,lv=1){const ans=readings.map(normJa).filter(Boolean),sh=normJa(show);
 return alts.some(a=>{const n=normJa(a);if(!n)return false;
  if(safeHomophone(n,ans))return true;
  if(lv>=2)return n==sh||ans.includes(n); // きびしい: その言葉だけを よむ
  if(n.includes(sh)||ans.some(r=>n.includes(r)))return true;
  // やさしい: 読みの一部（2文字以上）や1文字ちがいもOK
  return lv<=0&&ans.some(r=>(n.length>=2&&r.includes(n)&&n.length>=r.length/2)||(r.length>=3&&lev(n,r)<=1))})}
function missDetail(alts,prompts){const heard=[];
 for(const a of alts||[]){const s=String(a??'').trim();if(s&&!heard.includes(s))heard.push(s)}
 const targets=(prompts||[]).map(p=>{const show=String(p.show??'');const ans=(p.ans||[]).map(x=>String(x).trim()).filter(Boolean);
  return p.t==='k'&&ans.length?show+'（'+ans.join('・')+'）':show}).filter(Boolean);
 return {heard,targets}}
function renderMiss(alts,prompts,escFn){const esc=escFn||(s=>String(s)),d=missDetail(alts,prompts);
 return 'きこえた「'+esc(d.heard[0]||'')+'」'
  +(d.heard.length>1?'<br><span class="missd">ほか: '+esc(d.heard.slice(1).join(' / '))+'</span>':'')
  +'<br><b class="ngc">❌ どのモグラとも ちがうよ</b>'
  +'<br><span class="missd">照合: '+esc(d.targets.join(' / '))+'</span>'}
G.Matcher={matchEn,matchJa,matchSent,sentScore,normJa,lev,yomiOf,jaReadings,setJaLexicon,setJaLexiconFromTable,lexiconRows,nextKt,kanjiQuestions,moleOpen,countsAsMiss,reviewMisses,missDetail,renderMiss,checkList,checkNote,filterCheckItems,judgeItem,renderCheck};
})(typeof window!='undefined'?window:globalThis);
