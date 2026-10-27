import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const source = path => readFileSync(join(process.cwd(),path),'utf8');

test('v0.7 artwork is connected to the live page',()=>{
 const index=source('index.html');
 const css=source('theme-fars-v07.css');
 const app=source('app.mjs');
 assert.ok(index.includes('theme-fars-v07.css'));
 assert.ok(css.includes('panel-main.png'));
 assert.ok(css.includes('auction-blank.png'));
 assert.ok(css.includes('profile-crest.png'));
 assert.ok(css.includes('dice-luck.png'));
 assert.ok(app.includes('fars-dice-image'));
 assert.ok(app.includes("dataset.phase=s.phase"));
});

test('approved transparent PNG assets have been uploaded to this branch',()=>{
 for(const name of ['panel-main.png','auction-blank.png','profile-crest.png','dice-luck.png']){
   assert.ok(existsSync(join(process.cwd(),'assets','ui-v07',name)),
    'Upload missing assets/ui-v07/'+name+' before merging this pull request.');
 }
});

test('result values stay dynamic and user roles remain unchanged',()=>{
 const app=source('app.mjs');
 assert.ok(app.includes('s.lastRoll?.result'));
 assert.ok(app.includes('esc(g.title'));
 const firestore=source('firestore.rules');
 assert.ok(firestore.includes('request.auth'));
});
