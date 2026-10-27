import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const load=p=>readFileSync(join(root,p),'utf8');
test('every linked static image and stylesheet exists',()=>{
  for(const name of ['index.html','view.html','style.css','theme-fars.css']){
    const text=load(name);
    const links=[...text.matchAll(/(?:src=["']|url\(["']?)(\.\/assets\/[^"')]+\.(?:png|webp|svg))/g)];
    for(const m of links)assert.ok(existsSync(join(root,m[1])),name+' missing '+m[1]);
  }
});
test('five pages are accessible through working navigation',()=>{
  const html=load('index.html'),router=load('ui-pages.mjs');
  for(const page of ['season','map','games','statistics','settings']){
    assert.ok(html.includes('data-view="'+page+'"'),'missing '+page);
    assert.ok(router.includes("'"+page+"'"));
  }
  for(const id of ['season-game-list','season-metrics','season-progress-bar','board-token','board-zoom-token','history-list']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
});
test('visitors remain read-only and Firebase model unchanged',()=>{
  const viewer=load('viewer.mjs');
  assert.ok(!viewer.includes('setDoc('));
  assert.ok(!viewer.includes('updateDoc('));
  assert.ok(!viewer.includes('deleteDoc('));
});
