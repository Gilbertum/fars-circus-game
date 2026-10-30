import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const file=path=>readFileSync(path,'utf8');
test('v0.8 overrides old stretched panel art without changing game logic',()=>{
 const html=file('index.html'),css=file('theme-fars-v08.css');
 assert.match(html,/theme-fars-v07\.css[\s\S]*theme-fars-v08\.css/);
 assert.ok(css.includes('border-image-slice:300 78 180 78 fill'));
 assert.ok(css.includes('border-image-slice:190 88 115 88 fill'));
 assert.ok(css.includes('100cqw'));
 assert.ok(css.includes('panel-main.png'));
 assert.ok(css.includes('auction-blank.png'));
 assert.ok(css.includes('background:transparent!important'));
 assert.ok(css.includes('.sidebar .avatar'));
 for(const asset of ['panel-main.png','auction-blank.png']){
  assert.ok(existsSync('assets/ui-v07/'+asset));
 }
});
test('panel state and visible result stay driven by saved season',()=>{
 const app=file('app.mjs');
 assert.ok(app.includes('dataset.phase=s.phase'));
 assert.ok(app.includes('s.lastRoll?.result'));
 assert.ok(app.includes('pickAuction(s,Number('));
});
