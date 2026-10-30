import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {makeSeason,chooseReward} from '../game.mjs';
import {fateDestination,renderFateChoices} from '../fate-ui.mjs';

function onChoice(position,tickets=0) {
  const s=makeSeason('Тест');
  s.position=position;
  s.phase='choice';
  s.tickets=tickets;
  return s;
}

test('both fate options are readable buttons with existing action names',()=>{
  const html=renderFateChoices(onChoice(11,2));
  assert.match(html,/>Забрать жетон</);
  assert.match(html,/>Шаг вперёд</);
  assert.match(html,/data-action="reward-ticket"/);
  assert.match(html,/data-action="reward-step"/);
  assert.equal((html.match(/<button\b/g)||[]).length,2);
  assert.match(html,/Станет: 3/);
  assert.match(html,/Клетка 12/);
  assert.match(html,/Little Nightmares/);
  assert.match(html,/Шаг не позволяет пропустить обязательную игру/);
});

test('destination preview is consistent at both fate forks',()=>{
 const first=fateDestination(onChoice(5));
 assert.deepEqual({position:first.position,type:first.type},{position:6,type:'auction'});
 const second=fateDestination(onChoice(11));
 assert.deepEqual({position:second.position,type:second.type},{position:12,type:'mandatory'});
 assert.equal(second.gameTitle,'Little Nightmares');
});

test('preview does not mutate season or award anything before click',()=>{
 const season=onChoice(11,2);
 const before=JSON.stringify(season);
 renderFateChoices(season);
 assert.equal(JSON.stringify(season),before);
 const ticket=chooseReward(season,'ticket');
 assert.equal(ticket.tickets,3);
 assert.equal(ticket.position,11);
 const step=chooseReward(season,'step');
 assert.equal(step.position,12);
 assert.equal(step.phase,'playing');
 assert.equal(step.currentTask.title,'Little Nightmares');
 assert.equal(season.position,11);
 assert.equal(season.tickets,2);
});

test('fate descriptions escape game titles from saved seasons',()=>{
 const s=onChoice(11);
 s.games[12]={title:'<img src=x onerror=alert(1)>',goal:'',time:''};
 const html=renderFateChoices(s);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.ok(!html.includes('<img src=x'));
});

test('fate artwork and contrast patch are wired after prior themes',()=>{
 const html=readFileSync('index.html','utf8');
 const css=readFileSync('theme-fars-v10.css','utf8');
 const app=readFileSync('app.mjs','utf8');
 assert.ok(existsSync('theme-fars-v10.css'));
 assert.ok(html.indexOf('theme-fars-v09.css')<html.indexOf('theme-fars-v10.css'));
 assert.match(css,/\.control-panel \.btn\.outline/);
 assert.match(css,/color:#492017!important/);
 assert.match(css,/button\.fars-fate-step/);
 assert.match(css,/\.fars-fate-options/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:590px\)/);
 assert.match(app,/renderFateChoices\(s\)/);
 assert.ok(!css.includes('border-image-slice:'),'do not modify existing panel geometry');
});
