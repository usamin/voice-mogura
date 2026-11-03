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
const enTokens=s=>String(s).toLowerCase().normalize('NFKC').replace(/[^a-z0-9' ]+/g,' ').replace(/'/g,'').split(/\s+/).filter(Boolean).map(t=>DIG[t]||t);
function closeWord(t,w){ // t: 聞こえた単語, w: 正解
 if(t==w)return true;const ts=stem(t),ws=stem(w);if(ts==ws)return true;
 const L=w.length,d=lev(ts,ws),f0=ts[0]==ws[0]||sk(ts)[0]==sk(ws)[0];if(!f0)return false;
 if(L<=3){if(d<=1&&ts[0]==ws[0]&&Math.abs(ts.length-ws.length)<=1&&ts.length>=2)return true}
 else if(L<=5){if(d<=1&&(ts.length>=L||ts[ts.length-1]==ws[ws.length-1]||L>=5))return true;if(d<=2&&ts[0]==ws[0]&&sk(ts)==sk(ws))return true}
 else{if(d<=2&&L>=6)return true;if(d<=Math.ceil(L*.34)&&ts[0]==ws[0])return true}
 const a=sk(ts),b=sk(ws);return L>=4&&a==b&&ts[0]==ws[0];}
// en: word=正解, extra=シートで追加した別解, alts=認識候補（最大10）
function matchEn(alts,word,extra=[]){
 const targets=[word,...extra].map(x=>String(x).toLowerCase().trim()).filter(Boolean);
 for(const alt of alts){const toks=enTokens(alt).filter(t=>!STOP.has(t));if(!toks.length)continue;const joined=toks.join('');
  for(const tg of targets){const tw=enTokens(tg).filter(t=>!STOP.has(t)).join('');if(!tw)continue;
   if(joined==tw)return true;
   const sounds=SOUND[tw]||[];
   for(const t of toks){if(sounds.includes(t))return true;if(closeWord(t,tw))return true}
   if(tw.length>=5&&closeWord(joined,tw))return true;
   if(/[ぁ-んァ-ヶ]/.test(alt)&&extra.some(e=>normJa(e)==normJa(alt)))return true;}}
 return false}
function matchJa(alts,show,readings){const ans=readings.map(normJa).filter(Boolean),sh=normJa(show);
 return alts.some(a=>{const n=normJa(a);return n&&(n.includes(sh)||ans.some(r=>n.includes(r)))})}
G.Matcher={matchEn,matchJa,normJa,lev};
})(typeof window!='undefined'?window:globalThis);
