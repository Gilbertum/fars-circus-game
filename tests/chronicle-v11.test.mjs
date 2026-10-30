import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {makeSeason,finishGame,pickAuction} from '../game.mjs';
import {summarizeChronicle,renderChronicle,classifyChronicleEvent,CHRONICLE_FILTERS} from '../chronicle-ui.mjs';

test('new season creates accurate empty milestones and locked awards',()=>{
 const season=makeSeason('Новое представление');
 const snapshot=JSON.stringify(season);
 const summary=summarizeChronicle(season);
 assert.equal(summary.position,0);
 assert.equal(summary.completedMandatory,0);
 assert.equal(summary.completedAuctions,0);
 assert.equal(summary.achievements.filter(a=>a.earned).length,0);
 assert.equal(summary.milestones.length,9);
 assert.equal(summary.milestones[0].status,'done');
 assert.equal(summary.milestones[1].status,'upcoming');
 assert.equal(JSON.stringify(season),snapshot,'never mutate game state');
 const html=renderChronicle(season);
 assert.match(html,/Летопись гастролей/);
 assert.match(html,/Награды сезона/);
 assert.match(html,/последние 50 событий/);
});

test('mandatory and auction progress are based on completed game cells',()=>{
 let s=makeSeason();
 s.position=3;s.phase='playing';s.currentTask=s.games[3];
 s=finishGame(s);
 s.position=6;s.phase='auction';
 s=pickAuction(s,1);
 s=finishGame(s);
 s.position=9;
 const summary=summarizeChronicle(s);
 assert.equal(summary.totalCompleted,2);
 assert.equal(summary.completedMandatory,1);
 assert.equal(summary.completedAuctions,1);
 assert.equal(summary.milestones.find(m=>m.cell===3).status,'done');
 const auction=summary.milestones.find(m=>m.cell===6);
 assert.equal(auction.status,'done');
 assert.match(auction.detail,/Minami Lane/);
 assert.equal(summary.achievements.filter(a=>a.earned).length,3);
});

test('unknown auction winners are never invented when log records were trimmed',()=>{
 const s=makeSeason();
 s.position=11;s.phase='ready';s.completed=[3,6,8,10];
 s.logs=[{at:12345,text:'Кубик: 1 → 1. Переход 10 → 11.'}];
 const summary=summarizeChronicle(s);
 const auction=summary.milestones.find(m=>m.cell===6);
 assert.equal(auction.status,'done');
 assert.match(auction.detail,/не сохранился/);
 assert.ok(!auction.detail.includes('Unpacking'));
 const html=renderChronicle(s);
 assert.match(html,/последние 50 событий/);
 assert.match(html,/Броски в истории/);
 assert.equal(summary.rollEntries,1);
});

test('filters use only the limited real logs and escape HTML safely',()=>{
 const s=makeSeason();
 s.logs=[
  {at:Date.now(),text:'Аукцион 6: победила «<img src=x onerror=alert(1)>».'},
  {at:Date.now(),text:'Завершена игра: Pikuniku (клетка 3).'},
  {at:Date.now(),text:'Кубик: 2 → 2. Переход 1 → 3.'},
  {at:Date.now(),text:'Выбрала жетон удачи.'}
 ];
 assert.equal(classifyChronicleEvent(s.logs[0].text),'auctions');
 assert.equal(classifyChronicleEvent(s.logs[1].text),'games');
 assert.equal(classifyChronicleEvent(s.logs[2].text),'rolls');
 assert.equal(classifyChronicleEvent(s.logs[3].text),'events');
 const all=renderChronicle(s);
 const onlyAuctions=renderChronicle(s,'auctions');
 assert.equal((all.match(/class="chronicle-log-entry/g)||[]).length,4);
 assert.equal((onlyAuctions.match(/class="chronicle-log-entry/g)||[]).length,1);
 assert.match(onlyAuctions,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.ok(!onlyAuctions.includes('<img src=x'));
 assert.equal(CHRONICLE_FILTERS.length,5);
 assert.match(onlyAuctions,/aria-pressed="true"/);
});

test('log limit is explicitly bounded and no lifetime totals are claimed',()=>{
 const s=makeSeason();
 s.logs=Array.from({length:80},(_,i)=>({at:Date.now()-i*1000,text:'Кубик: 1 → 1.'}));
 const summary=summarizeChronicle(s);
 assert.equal(summary.logs.length,50);
 assert.equal(summary.rollEntries,50);
 assert.match(renderChronicle(s),/Сохраняются только последние 50 событий/);
});

test('chronicle is integrated as a read-only full-width statistics view',()=>{
 const html=readFileSync('index.html','utf8');
 const app=readFileSync('app.mjs','utf8');
 const css=readFileSync('theme-fars-v11.css','utf8');
 assert.ok(existsSync('theme-fars-v11.css'));
 assert.ok(html.includes('id="chronicle-root"'));
 assert.ok(html.indexOf('theme-fars-v10.css')<html.indexOf('theme-fars-v11.css'));
 assert.ok(app.includes('drawChronicle(s)'));
 assert.ok(app.includes('data-chronicle-filter'));
 assert.ok(css.includes('body[data-view="statistics"] .main-content'));
 assert.ok(css.includes('grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)'));
 const view=readFileSync('viewer.mjs','utf8');
 assert.ok(!view.includes('chronicle-root'),'spectators do not gain streamer controls');
});
