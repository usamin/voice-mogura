// node test.js
// 判定と、誤判定表示・バージョンの回帰。ブラウザのサービスワーカー実機確認は別。
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=__dirname;
let ok=0,fail=0;
function check(name,cond){if(!cond){fail++;console.error('FAIL',name)}else ok++}
function levels(name,fn,want){for(const lv of [0,1,2]){const hit=!!fn(lv);const exp=Array.isArray(want)?!!want[lv]:!!want;check(name+' / '+(['やさしい','ふつう','きびしい'][lv]),hit===exp)}}

const matchSrc=fs.readFileSync(root+'/match.js','utf8');
vm.runInNewContext(fs.readFileSync(root+'/yomi.js','utf8'),{window:undefined,globalThis:globalThis});
vm.runInNewContext(matchSrc,{window:undefined,globalThis:globalThis});
const M=globalThis.Matcher;
assert(M&&M.matchJa&&M.setJaLexiconFromTable,'Matcher');
check('音読み表で乾燥はかんそう',M.yomiOf('乾燥')==='かんそう');
check('1字は音読み表だけでは読まない',M.yomiOf('曲')===''&&M.yomiOf('乾')==='');

// シートが無くても、常用漢字の音が読める字は同音にする
levels('語彙なしでも常用の曲は局',lv=>M.matchJa(['曲'],'局',['きょく'],lv),true);
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
check('熟語用の音読みは送りがなを変えない',M.yomiOf('話す')==='わす');

// はつおんチェックで外れていた例。読みへ直して、正解の読みと完全一致ならどの厳しさでも当たり
const has=rs=>rs.every(r=>M.jaReadings('9').includes(r));
check('9の読み',has(['きゅう','く','ここの','ここのつ'])&&!M.jaReadings('9').includes('たま'));
check('1の読み',['いち','ひとつ'].every(r=>M.jaReadings('1').includes(r)));
check('話すははなすで、わすではない',M.jaReadings('話す').join(',')==='はなす');
check('薬の読みにやくとくすり',['やく','くすり'].every(r=>M.jaReadings('薬').includes(r)));
check('複数読みの球は字のままでは読まない',M.jaReadings('球').length===0);
levels('球←9',lv=>M.matchJa(['9'],'球',['たま','きゅう'],lv),true);
levels('球←９',lv=>M.matchJa(['９'],'球',['たま','きゅう'],lv),true);
levels('球←９。',lv=>M.matchJa(['９。'],'球',['たま','きゅう'],lv),true);
levels('9はたまだけでは外れ',lv=>M.matchJa(['9'],'玉',['たま'],lv),false);
levels('19は球に当たらない',lv=>M.matchJa(['19'],'球',['たま','きゅう'],lv),false);
levels('08は球に当たらない',lv=>M.matchJa(['08'],'球',['たま','きゅう'],lv),false);
levels('役←薬',lv=>M.matchJa(['薬'],'役',['やく'],lv),true);
levels('役←くすりは外れ',lv=>M.matchJa(['くすり'],'役',['やく'],lv),false);
levels('薬は猫に当たらない',lv=>M.matchJa(['薬'],'猫',['ねこ'],lv),false);
levels('放す←話す',lv=>M.matchJa(['話す'],'放す',['はなす'],lv),true);
levels('放す←はなす',lv=>M.matchJa(['はなす'],'放す',['はなす'],lv),true);
levels('放す←話しますは外れ',lv=>M.matchJa(['話します'],'放す',['はなす'],lv),false);
levels('放す←話したは外れ',lv=>M.matchJa(['話した'],'放す',['はなす'],lv),false);
levels('放す←ほうは外れ',lv=>M.matchJa(['ほう'],'放す',['はなす'],lv),false);
levels('話は花に当たらない',lv=>M.matchJa(['話'],'花',['はな'],lv),false);
levels('1はいち',lv=>M.matchJa(['1'],'一',['いち'],lv),true);
levels('1はひとつ',lv=>M.matchJa(['1'],'一つ',['ひとつ'],lv),true);
levels('１はいち',lv=>M.matchJa(['１'],'一',['いち'],lv),true);
levels('10はじゅう',lv=>M.matchJa(['10'],'十',['じゅう'],lv),true);
levels('10はとお',lv=>M.matchJa(['１０'],'十',['とお'],lv),true);
levels('11はいちに当たらない',lv=>M.matchJa(['11'],'一',['いち'],lv),false);
levels('20はにじゅう',lv=>M.matchJa(['20'],'二十',['にじゅう'],lv),true);
levels('100はひゃく',lv=>M.matchJa(['100'],'百',['ひゃく'],lv),true);
levels('300はさんびゃく',lv=>M.matchJa(['300'],'三百',['さんびゃく'],lv),true);
levels('600はろっぴゃく',lv=>M.matchJa(['600'],'六百',['ろっぴゃく'],lv),true);
levels('800ははっぴゃく',lv=>M.matchJa(['800'],'八百',['はっぴゃく'],lv),true);
levels('3000はさんぜん',lv=>M.matchJa(['3000'],'三千',['さんぜん'],lv),true);
levels('8000ははっせん',lv=>M.matchJa(['8000'],'八千',['はっせん'],lv),true);
levels('700はしちひゃく',lv=>M.matchJa(['700'],'七百',['しちひゃく'],lv),true);
levels('4はし',lv=>M.matchJa(['4'],'四',['し'],lv),true);
levels('0はれい',lv=>M.matchJa(['0'],'零',['れい'],lv),true);
levels('きびしいでも球←9',lv=>M.matchJa(['9'],'球',['たま','きゅう'],lv),true);

// 学年をまたいでも表ぜんぶを見る。常用漢字の音・訓は、その字が表に無くても使う
M.setJaLexiconFromTable({1:[['花','はな'],['川','かわ']]});
levels('表に無い鼻も常用の訓では花',lv=>M.matchJa(['鼻'],'花',['はな'],lv),true);
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
check('表から曲を外しても常用の音は残る',M.matchJa(['曲'],'局',['きょく'],1)===true);
const prev={3:[['局',['きょく']],['曲',['きょく']]]};
M.setJaLexiconFromTable({3:[['黒猫','ねこ']]});
check('表の造語は同音',M.matchJa(['黒猫'],'犬',['ねこ'],2)===true);
M.setJaLexiconFromTable({});
check('空の表は造語の同音を消す',M.matchJa(['黒猫'],'犬',['ねこ'],2)===false);
check('空の表でも常用の曲は残る',M.matchJa(['曲'],'局',['きょく'],1)===true);
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
levels('無効行の鼻も常用の訓では花',lv=>M.matchJa(['鼻'],'花',['はな'],lv),true);
levels('シートCSV 川←河（別学年）',lv=>M.matchJa(['河'],'川',['かわ'],lv),true);
const tab=(text,fb)=>{const o=parsedBox.parseTab(text);return Object.keys(o).length?o:fb};
const fallback=tab('not,a,sheet\n',builtin);
check('読めないシートは同梱へ',fallback===builtin);
M.setJaLexiconFromTable(fallback);
levels('フォールバック後 局←曲',lv=>M.matchJa(['曲'],'局',['きょく'],lv),true);
check('空の結果は前の表',appSrc.includes('return Object.keys(o).length?o:fb'));
const loadBody=appSrc.slice(appSrc.indexOf('async function loadSheet'));
check('offlineのときは語彙を差し替えない',loadBody.indexOf("throw 'offline'")>=0&&loadBody.indexOf("throw 'offline'")<loadBody.indexOf('bindLex()'));
check('初期化とシート成功の両方で語彙を作る',appSrc.includes('function bindLex(){Matcher.setJaLexicon(Matcher.lexiconRows(S.mode,DATA.k,DATA.kt))}')&&appSrc.includes('DATA=d;bindLex();')&&appSrc.includes('bindLex();refreshHint();'));
const html=fs.readFileSync(root+'/index.html','utf8');
check('match.jsはapp.jsより先',html.indexOf('src="match.js"')>0&&html.indexOf('src="match.js"')<html.indexOf('src="app.js"'));
check('音読み表は判定より先',html.indexOf('src="yomi.js"')>0&&html.indexOf('src="yomi.js"')<html.indexOf('src="match.js"'));

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
check('照合は最終の不正解だけ',appSrc.includes("H.innerHTML=Matcher.renderMiss(alts,moles.filter(m=>m.q&&!m.hit).map(m=>({t:m.q.t,show:m.q.show,ans:m.q.ans})),esc)"));

const self={};
vm.runInNewContext(fs.readFileSync(root+'/version.js','utf8'),{self});
check('版はv7.0.1',self.APP_VER==='v7.0.1');
check('更新日',self.APP_DATE==='2026/11/08');
const sw=fs.readFileSync(root+'/sw.js','utf8');
check('キャッシュ名はversion.js由来',sw.includes("importScripts('version.js')")&&sw.includes("const C='mogura-'+self.APP_VER"));
check('古いキャッシュを消す',sw.includes('ks.filter(k=>k!=C)'));
check('v5を直書きしていない',!sw.includes('mogura-v5'));
const precache=sw.slice(sw.indexOf('F=['),sw.indexOf('];')+1);
for(const f of ['version.js','index.html','app.js','match.js','yomi.js','words.js'])check('事前キャッシュ '+f,precache.includes(f));
check('テストは事前キャッシュしない',!precache.includes('test.js'));
const C='mogura-'+self.APP_VER;
check('小数の版もキャッシュ名にそのまま入る',C==='mogura-v7.0.1'&&C!=='mogura-v7'&&C!=='mogura-v7.0.0'&&C!=='mogura-v6.1.2'&&C!=='mogura-v6.1.1');
const kept=['mogura-v5','mogura-v6','mogura-v6.1','mogura-v6.1.1','mogura-v6.1.2','mogura-v7','mogura-v7.0.0',C,'other-cache'].filter(k=>k===C);
check('v7.0.1以外のキャッシュ名は破棄される',kept.length===1&&kept[0]==='mogura-v7.0.1');
check('画面の折り返し',html.includes('#heard .missd')&&html.includes('overflow-wrap:anywhere'));
check('設定に漢字テスト用がある',html.includes('value="ktest">漢字テスト用</option>')&&html.includes('id="ktestNote"'));

// 漢字テスト用。公開シートには書かず、ここだけの文字列で確かめる
const testStart=appSrc.indexOf('function normHead');
const testEnd=appSrc.indexOf('return out}',testStart);
if(testStart<0||testEnd<0)throw new Error('parseTestSheet not found');
const testBox={};
vm.runInNewContext(prelude+'\n'+appSrc.slice(testStart,testEnd+'return out}'.length)+'\nglobalThis.parseTestSheet=parseTestSheet;',testBox);
const parseTest=testBox.parseTestSheet;
const headerOnly='"漢字","読み"\n';
check('見出しだけは0件',parseTest(headerOnly).length===0);
check('空文字は0件',parseTest('').length===0&&parseTest('\n\n').length===0);
const sample=['漢字,読み','','木,"き、もく"',',よみなし','花,','漢字,読み','水,"みず、すい"','語,ことば,余分','word,readings','猫,ねこ'].join('\n');
const sampleRows=parseTest(sample);
check('空行と読み欠落を捨てる',sampleRows.length===4);
check('読点とカンマの複数読み',sampleRows[0][0]==='木'&&sampleRows[0][1].join(',')==='き,もく');
check('水は二つの読み',sampleRows[1][0]==='水'&&sampleRows[1][1].join(',')==='みず,すい');
check('余分な列は読みにしない',sampleRows[2][0]==='語'&&sampleRows[2][1].join()==='ことば');
check('word/readings見出し',sampleRows.some(([w,r])=>w==='猫'&&r.join()==='ねこ'));
const swapped=parseTest('読み,漢字\nはな,花\n');
check('列が逆でも読む',swapped.length===1&&swapped[0][0]==='花'&&swapped[0][1].join()==='はな');
check('見出し語そのものは問題にしない',!sampleRows.some(([w])=>w==='漢字'||w==='word'||w==='読み'));
const paren=parseTest('漢字,読み（ひらがな）\n日,ひ、にち\n');
check('括弧つき見出し',paren.length===1&&paren[0][0]==='日'&&paren[0][1].join(',')==='ひ,にち');
const noHead=parseTest('漢字,かんじ\n');
check('見出しが無ければ1行目も問題',noHead.length===1&&noHead[0][1].join()==='かんじ');

const prevKt=[['旧',['ふるい']]];
check('失敗は前回のテストを残す',M.nextKt(false,[],prevKt)===prevKt);
const cleared=M.nextKt(true,[],prevKt);
check('成功した空表は前回を消す',Array.isArray(cleared)&&cleared.length===0&&cleared!==prevKt);
const replaced=M.nextKt(true,[['木',['き']]],prevKt);
check('成功した表は入れ替える',replaced.length===1&&replaced[0][0]==='木');
check('テスト取得は空でもフォールバックしない',appSrc.includes('Matcher.nextKt(ktOk,ktOk?parseTestSheet(kt.value):[],DATA.kt)')&&appSrc.includes("['漢字','英語','ショートセンテンス','漢字テスト用']"));
check('通常3タブの空結果は従来どおり残す',appSrc.includes('return Object.keys(o).length?o:fb'));
check('通信失敗かつテストも失敗なら保存しない',loadBody.includes("if(k.status!='fulfilled'&&e.status!='fulfilled'&&!ktOk)throw 'offline'"));
check('メインが落ちても漢字・英語の表は維持',loadBody.includes('if(mainOff){d.k=DATA.k;d.e=DATA.e;d.s=DATA.s}'));
check('古い保存にktが無くても配列にする',appSrc.includes('if(!Array.isArray(DATA.kt))DATA.kt=[]'));
check('テストモードはテストの問題だけ',appSrc.includes("if(S.mode==='ktest')return Matcher.kanjiQuestions(DATA.kt);"));
const qs=M.kanjiQuestions([['木',['き','もく']],['',[]],null,['花',['はな']]]);
check('問題化で空行を捨てる',qs.length===2&&qs[0].show==='木'&&qs[0].t==='k'&&qs[0].ans.join()==='き,もく'&&qs[1].show==='花');
check('0件の案内を出して通常漢字では始めない',appSrc.includes(KTEST_HINT_SRC())&&appSrc.includes("if(S.mode==='ktest'&&!P.length){$('warn').textContent=KTEST_HINT;show('home');return}"));

function KTEST_HINT_SRC(){return '「漢字テスト用」のシートに、A列へ漢字、B列へ読みを入れてね（1行目は見出しです）'}

M.setJaLexicon(M.lexiconRows('kanji',builtin,[['箸',['はし']],[ '曲',['きょく','くせ'] ]]));
levels('常用の箸はテスト用の行が無くても橋',lv=>M.matchJa(['箸'],'橋',['はし'],lv),true);
levels('通常モードはテスト用の造語を使わない',lv=>M.matchJa(['猫猫'],'犬',['いぬ'],lv),false);
levels('通常モードはテスト用の読み追加で曲を壊さない',lv=>M.matchJa(['曲'],'局',['きょく'],lv),true);
M.setJaLexicon(M.lexiconRows('ktest',builtin,[['箸',['はし']]]));
levels('テストモードでは箸←はしの橋',lv=>M.matchJa(['箸'],'橋',['はし'],lv),true);
levels('テストモードでも標準の局←曲',lv=>M.matchJa(['曲'],'局',['きょく'],lv),true);
M.setJaLexicon(M.lexiconRows('ktest',builtin,[['曲',['きょく','くせ']]]));
levels('テストで曲に別読みを足すと複数読みで除外',lv=>M.matchJa(['曲'],'局',['きょく'],lv),false);
M.setJaLexicon(M.lexiconRows('ktest',builtin,[['球',['きゅう']]]));
levels('標準の複数読みはテストの一つ読みと合流しても除外',lv=>M.matchJa(['球'],'究',['きゅう'],lv),false);
const onlyTest={};
M.setJaLexicon(M.lexiconRows('ktest',onlyTest,[['局',['きょく']],['曲',['きょく']],['球',['たま','きゅう']],['父',['ちち','とう']],['等',['とう']]]));
levels('テスト表だけの局←曲',lv=>M.matchJa(['曲'],'局',['きょく'],lv),true);
levels('テスト表だけの局←きょく',lv=>M.matchJa(['きょく'],'局',['きょく'],lv),true);
levels('テスト表だけの球はきゅうの別表記にならない',lv=>M.matchJa(['球'],'究',['きゅう'],lv),false);
levels('テスト表の父は等に当たらない',lv=>M.matchJa(['父'],'等',['とう'],lv),false);
levels('テスト表の等は父のとうに当たる',lv=>M.matchJa(['等'],'父',['ちち','とう'],lv),true);

// 熟語の同音。認識が別の漢字でも、連結した読みが出題の読みと一致すれば当たり
M.setJaLexicon(M.lexiconRows('ktest',builtin,[['感想',['かんそう']],['農作業',['のうさぎょう']],['負ける',['まける']]]));
levels('感想←乾燥',lv=>M.matchJa(['乾燥'],'感想',['かんそう'],lv),true);
levels('感想←乾燥と他候補',lv=>M.matchJa(['乾燥','乾燥乾燥','炭素乾燥','酸素乾燥'],'感想',['かんそう'],lv),true);
levels('感想←乾燥乾燥だけでは外れ',lv=>M.matchJa(['乾燥乾燥'],'感想',['かんそう'],lv),false);
levels('感想←炭素乾燥',lv=>M.matchJa(['炭素乾燥'],'感想',['かんそう'],lv),false);
levels('感想←酸素乾燥',lv=>M.matchJa(['酸素乾燥'],'感想',['かんそう'],lv),false);
levels('乾燥は関係ない語に当たらない',lv=>M.matchJa(['乾燥'],'猫',['ねこ'],lv),false);
levels('乾燥は花に当たらない',lv=>M.matchJa(['乾燥'],'花',['はな'],lv),false);
levels('農作業←読み',lv=>M.matchJa(['のうさぎょう'],'農作業',['のうさぎょう'],lv),true);
levels('農作業←乾燥',lv=>M.matchJa(['乾燥'],'農作業',['のうさぎょう'],lv),false);
levels('負ける←読み',lv=>M.matchJa(['まける'],'負ける',['まける'],lv),true);
levels('負ける←乾燥',lv=>M.matchJa(['乾燥'],'負ける',['まける'],lv),false);
check('シートの負けるは訓のまま',M.yomiOf('負ける')==='まける');
check('シートの農作業はシートの読み',M.yomiOf('農作業')==='のうさぎょう');
check('漢字だけの学校はシートの読み',M.yomiOf('学校')==='がっこう');
check('熟語の中の炭はすみにしない',M.yomiOf('炭素')==='たんそ');
check('乾の音かんは館に当たる',M.matchJa(['乾'],'館',['かん'],1)===true);
check('乾の訓は館に当たらない',M.matchJa(['かわく'],'館',['かん'],1)===false);
// 漢字タブ（学年を問わず）でも同じ連結。テスト用の語は通常モードの辞書に入れない
M.setJaLexicon(M.lexiconRows('kanji',builtin,[['感想',['かんそう']]]));
levels('通常の漢字タブ 先生←専制',lv=>M.matchJa(['専制'],'先生',['せんせい'],lv),true);
levels('専制は花に当たらない',lv=>M.matchJa(['専制'],'花',['はな'],lv),false);
check('漢字だけの生物はせいぶつ',M.yomiOf('生物')==='せいぶつ');
M.setJaLexicon(M.lexiconRows('kanji',{8:[['感想',['かんそう']]]},[]));
levels('高校タブの感想←乾燥',lv=>M.matchJa(['乾燥'],'感想',['かんそう'],lv),true);
M.setJaLexicon(M.lexiconRows('ktest',{},[['感想',['かんそう']]]));
levels('テストタブだけの感想←乾燥',lv=>M.matchJa(['乾燥'],'感想',['かんそう'],lv),true);
M.setJaLexiconFromTable({1:[['生','なま']],3:[['生','せい'],['物','もの']]});
check('複数読みの生を含む熟語は読まない',M.yomiOf('生物')==='');
levels('複数読みの生は熟語でも性に当たらない',lv=>M.matchJa(['生物'],'性',['せい'],lv),false);

// 復習欄: その回で出題され、正解できなかったものだけ
check('正解直後は穴を塞いだまま',M.moleOpen({q:{show:'発見'},hit:true})===false);
check('空の穴だけが空き',M.moleOpen({q:null,hit:false})===true&&M.moleOpen(null)===false);
check('未回答だけがミス',M.countsAsMiss({q:{show:'式'},hit:false})===true);
check('正解済みはミスにしない',M.countsAsMiss({q:{show:'式'},hit:true})===false);
check('空はミスにしない',M.countsAsMiss({q:null})===false);
const shown=[{t:'k',show:'式',ans:['しき']},{t:'k',show:'丁寧',ans:['ていねい']},{t:'k',show:'式',ans:['しき']},{t:'e',show:'ten',ans:[]}];
const rev=M.reviewMisses(shown);
check('復習は出題済みの重複なし',rev.map(q=>q.show).join(',')==='式,丁寧,ten');
check('未出題の発見を足さない',!rev.some(q=>q.show==='発見'));
check('空の復習',M.reviewMisses([]).length===0&&M.reviewMisses(null).length===0);
check('英単語と文もそのまま',M.reviewMisses([{t:'s',show:'I am ten.',ans:[]}])[0].show==='I am ten.');

function makeRace(){
 const missed=[];const moles=[{q:null,hit:false,up:false,to:null}];
 const timers=[];let now=0;
 const schedule=(ms,fn)=>{const t={at:now+ms,fn,dead:false};timers.push(t);return t};
 const clear=t=>{if(t)t.dead=true};
 function down(m){m.q=null;m.hit=false;m.up=false;clear(m.to);m.to=null}
 function spawn(word){
  const free=moles.filter(M.moleOpen);if(!free.length)return false;
  const m=free[0];m.hit=false;m.q={t:'k',show:word,ans:[word]};m.up=true;clear(m.to);
  m.to=schedule(5000,()=>{if(M.countsAsMiss(m)){missed.push(m.q);down(m)}});return true}
 function hit(){const m=moles[0];clear(m.to);m.to=null;m.hit=true;schedule(400,()=>down(m))}
 function endGame(){moles.forEach(m=>{if(M.countsAsMiss(m))missed.push(m.q);down(m)})}
 function tick(ms){now+=ms;for(const t of timers){if(!t.dead&&t.at<=now){t.dead=true;t.fn()}}}
 function reset(){missed.length=0;moles[0]={q:null,hit:false,up:false,to:null};timers.length=0;now=0}
 return {missed,moles,spawn,hit,endGame,tick,reset,shows:()=>M.reviewMisses(missed).map(q=>q.show)};
}
const raceHit=makeRace();
raceHit.spawn('式');raceHit.hit();
check('修正後は正解直後に発見を入れない',raceHit.spawn('発見')===false);
raceHit.tick(400);raceHit.tick(5000);
check('修正後のタイムアウト復習に発見が無い',raceHit.shows().join()===''&&!raceHit.moles[0].up&&!raceHit.moles[0].q);
const raceFlow=makeRace();
raceFlow.spawn('丁寧');raceFlow.tick(5000);raceFlow.spawn('速い');raceFlow.endGame();
check('タイムアウトと終了時の未回答だけ復習',raceFlow.shows().join()==='丁寧,速い');
raceFlow.reset();raceFlow.spawn('発見');raceFlow.hit();raceFlow.tick(400);raceFlow.endGame();
check('連続プレイで前の発見を持ち越さない',raceFlow.shows().join()==='');
const raceQuit=makeRace();
raceQuit.spawn('式');raceQuit.endGame();
check('やめる時も見えていた式は復習へ',raceQuit.shows().join()==='式');
const raceAll=makeRace();
raceAll.spawn('丁寧');raceAll.hit();raceAll.tick(400);raceAll.endGame();
check('全問正解なら復習は空',raceAll.shows().join()==='');
const raceEng=makeRace();
raceEng.moles[0].q={t:'e',show:'ten',ans:[]};raceEng.moles[0].hit=false;raceEng.endGame();
check('英語モードの未回答も復習',raceEng.shows().join()==='ten');
const raceSent=makeRace();
raceSent.moles[0].q={t:'s',show:'I am ten.',ans:[]};raceSent.moles[0].hit=false;raceSent.endGame();
check('文モードの未回答も復習',raceSent.shows().join()==='I am ten.');
const raceKt=makeRace();
raceKt.moles[0].q={t:'k',show:'木',ans:['き','もく']};raceKt.moles[0].hit=false;raceKt.endGame();
check('漢字テスト用の未回答も復習',raceKt.shows().join()==='木');
const raceNone=makeRace();
raceNone.endGame();
check('無出題なら復習は空',raceNone.shows().join()==='');

check('終了時は未回答の出題だけ復習へ',appSrc.includes('if(Matcher.countsAsMiss(m))missed.push(m.q)'));
check('正解後はqを残してからdown',appSrc.includes('m.hit=true;const mm=m;setTimeout(()=>down(mm),400)'));
check('空き穴判定はmoleOpen',appSrc.includes('moles.filter(Matcher.moleOpen)'));
check('開始時に時計と前回を止める',appSrc.includes('function stopClocks()')&&appSrc.includes('stopClocks();if(running)'));
check('復習表示はreviewMisses',appSrc.includes('const u=Matcher.reviewMisses(missed)'));
check('認識の照合もhitを除く',appSrc.includes('moles.some(m=>m.q&&!m.hit)')&&appSrc.includes('moles.filter(m=>m.q&&!m.hit)'));

for(const mode of ['kanji','eng','sent','emix','mix','ktest']){
 check('モード記号 '+mode,appSrc.includes("'"+mode+"'")||html.includes('value="'+mode+'"'));
}

// はつおんチェック。一覧と判定のつなぎだけ。ゲームの得点・復習は変えない
const pdata={k:{1:[['山',['やま','さん']]],3:[['駅',['えき']],['感想',['かんそう']]]},e:{1:[['cat',[]]],3:[['ten',[]]],8:[['ability',[]]]},s:{1:[['I like dogs.',[]]]},kt:[['感想',['かんそう']],['農作業',['のうさぎょう']]]};
const only3=M.checkList('kanji',pdata,{grade:3,lower:false,eLv:'same'});
check('漢字は今の学年だけ',only3.map(x=>x.show).join()==='駅,感想');
check('漢字リストにテスト用だけは入らない',!only3.some(x=>x.show==='農作業'));
const lowK=M.checkList('kanji',pdata,{grade:3,lower:true});
check('漢字は下の学年も',lowK.map(x=>x.show).join()==='山,駅,感想');
check('1年に駅は入らない',!M.checkList('kanji',pdata,{grade:1,lower:false}).some(x=>x.show==='駅'));
check('学年8で下の学年なしなら6年だけ',M.checkList('kanji',{k:{6:[['雪',['ゆき']]],3:[['駅',['えき']]]}},{grade:8,lower:false}).map(x=>x.show).join()==='雪');
const g8k=M.checkList('kanji',pdata,{grade:8,lower:true});
check('高校の設定でも漢字は6年まで',g8k.some(x=>x.show==='駅')&&g8k.some(x=>x.show==='山')&&!g8k.some(x=>x.show==='ability'));
const ktList=M.checkList('ktest',pdata,{grade:1,lower:true});
check('テスト用は学年を見ない',ktList.map(x=>x.show).join()==='感想,農作業'&&ktList.every(x=>x.t==='k'));
check('空のテスト用は0件',M.checkList('ktest',{kt:[]},{grade:3}).length===0);
check('英語は学年と同じ',M.checkList('eng',pdata,{grade:1,eLv:'same',lower:false}).map(x=>x.show).join()==='cat');
check('英語レベルは高校だけ',M.checkList('eng',pdata,{grade:1,eLv:'8',lower:false}).map(x=>x.show).join()==='ability');
check('英語は下の学年も',M.checkList('eng',pdata,{grade:3,eLv:'same',lower:true}).map(x=>x.show).join()==='cat,ten');
const sentList=M.checkList('sent',pdata,{grade:1});
check('文は学年を見ない',sentList.length===1&&sentList[0].t==='s'&&sentList[0].show==='I like dogs.');
check('未知の出題元は空',M.checkList('mix',pdata,{grade:3}).length===0);
check('漢字の表示範囲',M.checkNote('kanji',{grade:3,lower:false})==='3ねんせい'&&M.checkNote('kanji',{grade:3,lower:true})==='1〜3ねんせい');
check('英語と文とテスト用の表示範囲',M.checkNote('eng',{grade:1,eLv:'7'})==='中学'&&M.checkNote('eng',{grade:2,eLv:'same',lower:true})==='1〜2ねん'&&M.checkNote('sent',{})==='ぜんぶの文'&&M.checkNote('ktest',{grade:6})==='学年は使いません');
check('読みでさがせる',M.filterCheckItems(ktList,'かんそう').map(x=>x.show).join()==='感想');
check('表記でさがせる',M.filterCheckItems(lowK,'駅').length===1);
check('空の検索はそのまま',M.filterCheckItems(ktList,'  ').length===2&&M.filterCheckItems(ktList,'').length===2);
check('英語の検索',M.filterCheckItems(M.checkList('eng',pdata,{grade:3,eLv:'same',lower:true}),'Ten').map(x=>x.show).join()==='ten');
check('文の検索は空白を無視',M.filterCheckItems(sentList,'likedogs').length===1);
M.setJaLexicon(M.lexiconRows('ktest',builtin,[['感想',['かんそう']]]));
const kanItem={t:'k',show:'感想',ans:['かんそう']};
levels('チェック 感想←乾燥',lv=>M.judgeItem(kanItem,['乾燥','乾燥乾燥','炭素乾燥','酸素乾燥'],lv),true);
levels('チェック 乾燥は猫に当たらない',lv=>M.judgeItem({t:'k',show:'猫',ans:['ねこ']},['乾燥'],lv),false);
levels('チェックの厳しさはゲームと同じ',lv=>M.judgeItem({t:'k',show:'局',ans:['きょく']},['きょくです'],lv),[true,true,false]);
levels('チェック 球←9',lv=>M.judgeItem({t:'k',show:'球',ans:['たま','きゅう']},['9'],lv),true);
levels('チェック 役←薬',lv=>M.judgeItem({t:'k',show:'役',ans:['やく']},['薬'],lv),true);
levels('チェック 放す←話す',lv=>M.judgeItem({t:'k',show:'放す',ans:['はなす']},['話す'],lv),true);
levels('チェック きびしいでも放す←話す',lv=>M.judgeItem({t:'k',show:'放す',ans:['はなす']},['話す'],lv),true);
levels('チェック ten←10',lv=>M.judgeItem({t:'e',show:'ten',ans:[]},['10'],lv),true);
levels('チェック 文 I am ten.←I am 10.',lv=>M.judgeItem({t:'s',show:'I am ten.',ans:[]},['I am 10.'],lv),true);
levels('チェック 関係ない英語',lv=>M.judgeItem({t:'e',show:'cat',ans:[]},['dog'],lv),false);
const okHtml=M.renderCheck(['乾燥',' 乾燥乾燥 ','乾燥'],true,esc);
check('せいかい表示',okHtml.includes('きこえた「乾燥」')&&okHtml.includes('○ せいかい')&&okHtml.includes('ほか: '+esc('乾燥乾燥')));
const ngHtml=M.renderCheck(['ねこ'],false,esc);
check('ちがう表示',ngHtml.includes('きこえた「ねこ」')&&ngHtml.includes('× ちがう')&&!ngHtml.includes('せいかい'));
check('候補が無ければ空のきこえた',M.renderCheck([],false,esc).includes('きこえた「」')&&M.renderCheck([],false,esc).includes('× ちがう'));
check('タイトルにボタンがある',html.includes('id="toCheck">はつおんチェック</button>')&&html.includes('id="pron"')&&html.includes('value="sent">ショートセンテンス</option>'));
const pronSrc=appSrc.slice(appSrc.indexOf('function stopPrec'),appSrc.indexOf("$('toCheck')"));
check('はつおんの処理がある',pronSrc.includes('function stopPrec')&&pronSrc.includes('Matcher.judgeItem')&&pronSrc.includes('Matcher.checkList')&&pronSrc.includes('Matcher.renderCheck')&&pronSrc.includes('ja-JP')&&pronSrc.includes('en-US'));
check('はつおんは復習に足さない',!pronSrc.includes('missed')&&!pronSrc.includes('reviewMisses'));
check('はつおんは得点とタイマーを変えない',!pronSrc.includes('score')&&!pronSrc.includes('spawn')&&!pronSrc.includes('moles')&&!pronSrc.includes('stopClocks'));
check('厳しさは設定のまま',pronSrc.includes('S.judge??1'));
check('ゲームの開始はそのまま',appSrc.includes("P=pool();if(S.mode==='ktest'&&!P.length)")&&appSrc.includes('const u=Matcher.reviewMisses(missed)'));

if(fail){console.error(ok+' ok, '+fail+' failed');process.exit(1)}
console.log(ok+' ok');
