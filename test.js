// node test.js
// 判定と、誤判定表示・バージョンの回帰。ブラウザのサービスワーカー実機確認は別。
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=__dirname;
let ok=0,fail=0;
function check(name,cond){if(!cond){fail++;console.error('FAIL',name)}else ok++}
function levels(name,fn,want){for(const lv of [0,1,2]){const hit=!!fn(lv);const exp=Array.isArray(want)?!!want[lv]:!!want;check(name+' / '+(['やさしい','ふつう','きびしい'][lv]),hit===exp)}}

const matchSrc=fs.readFileSync(root+'/match.js','utf8');
vm.runInNewContext(matchSrc,{window:undefined,globalThis:globalThis});
const M=globalThis.Matcher;
assert(M&&M.matchJa&&M.setJaLexiconFromTable,'Matcher');

// 語彙を入れる前は、別漢字を読みに変えない
levels('語彙なし 局←曲',lv=>M.matchJa(['曲'],'局',['きょく'],lv),false);
levels('語彙なし 局←きょく',lv=>M.matchJa(['きょく'],'局',['きょく'],lv),true);

const wordSrc=fs.readFileSync(root+'/words.js','utf8')+'\nglobalThis.KANJI=KANJI;globalThis.ENG=ENG;globalThis.SENT=SENT;';
const words={};
vm.runInNewContext(wordSrc,words);
const builtin={};
for(const g of Object.keys(words.KANJI))builtin[g]=words.KANJI[g].map(([k,r])=>[k,String(r).split(',')]);
M.setJaLexiconFromTable(builtin);

function readingsOf(table,surface){const set=new Set();
 for(const g of Object.keys(table))for(const [w,rs] of table[g])if(w===surface)for(const r of rs)set.add(r);
 return [...set]}
check('同梱: 曲の読みはきょくだけ',readingsOf(builtin,'曲').join(',')==='きょく');
check('同梱: 球は複数読み',readingsOf(builtin,'球').length>1);
check('同梱: 花と鼻は別の学年',Object.entries(builtin).some(([g,rows])=>rows.some(([w])=>w==='花')&&g!==Object.keys(builtin).find(x=>builtin[x].some(([w])=>w==='鼻'))));

levels('局←曲',lv=>M.matchJa(['曲'],'局',['きょく'],lv),true);
levels('局←きょく',lv=>M.matchJa(['きょく'],'局',['きょく'],lv),true);
levels('局←キョク',lv=>M.matchJa(['キョク'],'局',['きょく'],lv),true);
levels('局←局',lv=>M.matchJa(['局'],'局',['きょく'],lv),true);
levels('局←つぼね',lv=>M.matchJa(['つぼね'],'局',['きょく'],lv),false);
levels('局←曲です',lv=>M.matchJa(['曲です'],'局',['きょく'],lv),false);
levels('きびしいは文の一部を拒む',lv=>M.matchJa(['きょくです'],'局',['きょく'],lv),[true,true,false]);
levels('やさしいの1文字ちがいはかなだけ',lv=>M.matchJa(['きよく'],'局',['きょく'],lv),[true,false,false]);
levels('究←球（球はたま/きゅう）',lv=>M.matchJa(['球'],'究',['きゅう'],lv),false);
levels('級←球',lv=>M.matchJa(['球'],'級',['きゅう'],lv),false);
levels('級←究',lv=>M.matchJa(['究'],'級',['きゅう'],lv),true);
levels('日←火',lv=>M.matchJa(['火'],'日',['ひ','にち'],lv),false);
levels('火←日',lv=>M.matchJa(['日'],'火',['ひ','か'],lv),false);
levels('等←父（父は複数読み）',lv=>M.matchJa(['父'],'等',['とう'],lv),false);
levels('父←等（等はとうだけ）',lv=>M.matchJa(['等'],'父',['ちち','とう'],lv),true);
levels('度←土（土は複数読み）',lv=>M.matchJa(['土'],'度',['ど'],lv),false);
levels('土←度（度はどだけ）',lv=>M.matchJa(['度'],'土',['つち','ど'],lv),true);
levels('悪←開く',lv=>M.matchJa(['開く'],'悪',['あく','わるい'],lv),false);
levels('花←鼻',lv=>M.matchJa(['鼻'],'花',['はな'],lv),true);
levels('目←芽',lv=>M.matchJa(['芽'],'目',['め'],lv),true);
levels('川←河',lv=>M.matchJa(['河'],'川',['かわ'],lv),true);
levels('山←やま',lv=>M.matchJa(['やま'],'山',['やま','さん'],lv),true);
levels('山←さん',lv=>M.matchJa(['さん'],'山',['やま','さん'],lv),true);
levels('山←山',lv=>M.matchJa(['山'],'山',['やま','さん'],lv),true);
check('句点つきの曲',M.matchJa(['曲。'],'局',['きょく'],2)===true);

// 学年をまたいでも表ぜんぶを見る。今の学年だけだと鼻は入らない
M.setJaLexiconFromTable({1:[['花','はな'],['川','かわ']]});
levels('1年だけだと花←鼻は外れ',lv=>M.matchJa(['鼻'],'花',['はな'],lv),false);
M.setJaLexiconFromTable({1:[['花','はな'],['川','かわ']],3:[['鼻','はな']],5:[['河','かわ']]});
levels('全学年なら花←鼻',lv=>M.matchJa(['鼻'],'花',['はな'],lv),true);
levels('全学年なら川←河',lv=>M.matchJa(['河'],'川',['かわ'],lv),true);

// 同じ表記が学年をまたいで別読みなら、複数読みとして同音には使わない
M.setJaLexiconFromTable({1:[['生','なま']],3:[['生','せい']]});
levels('合体して複数読みの生',lv=>M.matchJa(['生'],'生物',['なま'],lv),false);
levels('合体して複数読みの生・せい',lv=>M.matchJa(['生'],'性',['せい'],lv),false);

// シートの入れ替えと、曲を外した表、空表へのフォールバック
M.setJaLexiconFromTable({3:[['局','きょく'],['曲','きょく']]});
check('シート前 局←曲',M.matchJa(['曲'],'局',['きょく'],1)===true);
M.setJaLexiconFromTable({3:[['局','きょく']]});
check('曲を無効化したシート',M.matchJa(['曲'],'局',['きょく'],1)===false);
const prev={3:[['局',['きょく']],['曲',['きょく']]]};
M.setJaLexiconFromTable({});
check('空の表は同音を消す',M.matchJa(['曲'],'局',['きょく'],1)===false);
M.setJaLexiconFromTable(prev);
check('前の表へ戻すと局←曲',M.matchJa(['曲'],'局',['きょく'],2)===true);

const appSrc=fs.readFileSync(root+'/app.js','utf8');
const parseStart=appSrc.indexOf('function csv('),parseEnd=appSrc.indexOf('return out}',parseStart);
if(parseStart<0||parseEnd<0)throw new Error('parseTab not found');
const prelude=appSrc.slice(parseStart,parseEnd+'return out}'.length)+'\nglobalThis.parseTab=parseTab;';
const parsedBox={};
vm.runInNewContext(prelude,parsedBox);
const csv=['3,局,きょく,TRUE','3,曲,きょく,TRUE','3,球,たま、きゅう,TRUE','3,究,きゅう,TRUE','1,花,はな,TRUE','3,鼻,はな,FALSE','1,川,かわ,TRUE','5,河,かわ,TRUE','grade,word,readings,enabled'].join('\n');
const sheetTable=parsedBox.parseTab(csv);
check('FALSEの鼻は入らない',!Object.values(sheetTable).flat().some(([w])=>w==='鼻'));
check('見出し行は入らない',!Object.values(sheetTable).flat().some(([w])=>w==='word'));
M.setJaLexiconFromTable(sheetTable);
levels('シートCSV 局←曲',lv=>M.matchJa(['曲'],'局',['きょく'],lv),true);
levels('シートCSV 究←球',lv=>M.matchJa(['球'],'究',['きゅう'],lv),false);
levels('シートCSV 花←鼻（無効）',lv=>M.matchJa(['鼻'],'花',['はな'],lv),false);
levels('シートCSV 川←河（別学年）',lv=>M.matchJa(['河'],'川',['かわ'],lv),true);
const tab=(text,fb)=>{const o=parsedBox.parseTab(text);return Object.keys(o).length?o:fb};
const fallback=tab('not,a,sheet\n',builtin);
check('読めないシートは同梱へ',fallback===builtin);
M.setJaLexiconFromTable(fallback);
levels('フォールバック後 局←曲',lv=>M.matchJa(['曲'],'局',['きょく'],lv),true);
check('空の結果は前の表',appSrc.includes('return Object.keys(o).length?o:fb'));
const loadBody=appSrc.slice(appSrc.indexOf('async function loadSheet'));
check('offlineのときは語彙を差し替えない',loadBody.indexOf("throw 'offline'")>=0&&loadBody.indexOf("throw 'offline'")<loadBody.indexOf('bindLex()'));
check('初期化とシート成功の両方で語彙を作る',appSrc.includes('function bindLex(){Matcher.setJaLexiconFromTable(DATA.k)}')&&appSrc.includes('DATA=d;bindLex();'));
const html=fs.readFileSync(root+'/index.html','utf8');
check('match.jsはapp.jsより先',html.indexOf('src="match.js"')>0&&html.indexOf('src="match.js"')<html.indexOf('src="app.js"'));

// 英語。ten←10 は元から通る。ここは回帰であり、新規の修正ではない
M.setJaLexiconFromTable(builtin);
for(const heard of ['10','１０','10.','Ten','  10  '])levels('ten←'+heard,lv=>M.matchEn([heard],'ten',[],lv),true);
levels('ten←ten',lv=>M.matchEn(['ten'],'ten',[],lv),true);
levels('thirteen←13は未対応のまま',lv=>M.matchEn(['13'],'thirteen',[],lv),false);
levels('文 I am ten.←I am 10.',lv=>M.matchSent(['I am 10.'],'I am ten.',[],lv),true);
levels('文 I am ten.←10だけ',lv=>M.matchSent(['10'],'I am ten.',[],lv),false);
levels('文 I have two cats.←I have 2 cats.',lv=>M.matchSent(['I have 2 cats.'],'I have two cats.',[],lv),true);
levels('文 I have two cats.←I have to cats.',lv=>M.matchSent(['I have to cats.'],'I have two cats.',[],lv),[true,true,false]);
levels('英単語 cat',lv=>M.matchEn(['cat'],'cat',[],lv),true);
levels('文 What time is it?',lv=>M.matchSent(['What time is it?'],'What time is it?',[],lv),true);
levels('既存のあいまい一致 10→tennisは変えない',lv=>M.matchEn(['10'],'tennis',[],lv),[true,true,false]);

// 誤判定の表示。音声や認識結果は画面だけ
const kanjiMiss=M.missDetail(['曲',' きょく ','曲'],[{t:'k',show:'局',ans:['きょく']}]);
check('表示: 認識の先頭',kanjiMiss.heard[0]==='曲'&&kanjiMiss.heard[1]==='きょく');
check('表示: 漢字の照合先',kanjiMiss.targets.join()==='局（きょく）');
const tenMiss=M.missDetail(['10'],[{t:'e',show:'ten',ans:[]},{t:'s',show:'I am ten.',ans:[]}]);
check('表示: tenと10',tenMiss.heard.join()==='10'&&tenMiss.targets.join(' / ')==='ten / I am ten.');
const esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
const rendered=M.renderMiss(['<曲>','きょく'],[{t:'k',show:'局',ans:['きょく']}],esc);
check('表示HTMLに認識と照合',rendered.includes('きこえた「'+esc('<曲>')+'」'));
check('表示HTMLの照合',rendered.includes('照合: '+esc('局（きょく）')));
check('ほかの候補',rendered.includes('ほか: '+esc('きょく')));
check('単一候補にはほかを出さない',!M.renderMiss(['10'],[{t:'e',show:'ten',ans:[]}],esc).includes('ほか:'));
check('認識結果を保存しない',(appSrc.match(/localStorage\.setItem\('([^']+)'/g)||[]).join()==="localStorage.setItem('moguraSet',localStorage.setItem('moguraSheet'");
check('照合は最終の不正解だけ',appSrc.includes("H.innerHTML=Matcher.renderMiss(alts,moles.filter(m=>m.q).map(m=>({t:m.q.t,show:m.q.show,ans:m.q.ans})),esc)"));

const self={};
vm.runInNewContext(fs.readFileSync(root+'/version.js','utf8'),{self});
check('版はv6',self.APP_VER==='v6');
check('更新日',self.APP_DATE==='2026/11/06');
const sw=fs.readFileSync(root+'/sw.js','utf8');
check('キャッシュ名はversion.js由来',sw.includes("importScripts('version.js')")&&sw.includes("const C='mogura-'+self.APP_VER"));
check('古いキャッシュを消す',sw.includes('ks.filter(k=>k!=C)'));
check('v5を直書きしていない',!sw.includes('mogura-v5'));
const precache=sw.slice(sw.indexOf('F=['),sw.indexOf('];')+1);
for(const f of ['version.js','index.html','app.js','match.js','words.js'])check('事前キャッシュ '+f,precache.includes(f));
check('テストは事前キャッシュしない',!precache.includes('test.js'));
const C='mogura-'+self.APP_VER;
const kept=['mogura-v4','mogura-v5',C,'other-cache'].filter(k=>k===C);
check('v6以外のキャッシュ名は破棄される',kept.length===1&&kept[0]==='mogura-v6');
check('画面の折り返し',html.includes('#heard .missd')&&html.includes('overflow-wrap:anywhere'));

if(fail){console.error(ok+' ok, '+fail+' failed');process.exit(1)}
console.log(ok+' ok');
