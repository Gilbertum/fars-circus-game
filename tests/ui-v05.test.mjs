import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v0.5 shows the illustrated dashboard without removing existing controls',()=>{
 const html=read('index.html');
 for(const id of ['auth-screen','app-screen','season-list','new-season','season-title',
 'streamer-name','top-streamer-name','stat-position','stat-completed','stat-tickets',
 'stat-phase','board-frame','board-token','board-zoom-token','board-zoom-dialog',
 'action-title','action-description','action-controls','history-list','next-stop-list',
 'publish-season','copy-view-link','unpublish-season','share-hint','save-status','logout'])
 assert.ok(html.includes('id="'+id+'"'),'missing: '+id);
 assert.ok(html.includes('theme-fars.css'));
 assert.ok(html.includes('class="fars-global"'));
});
test('interactive labels and game content remain dynamic rather than baked into images',()=>{
 const app=read('app.mjs');
 const html=read('index.html');
 assert.match(app,/drawUpcoming\(s\)/);
 assert.match(app,/store\.save\(next\)/);
 assert.match(app,/placeBoardToken\(/);
 assert.ok(html.includes('data-action')===false,'actions are rendered by app.mjs');
 assert.ok(!html.includes('id="game-editor"'),'players should not have editor');
});
test('spectator remains a standalone, read-only page with the new skin',()=>{
 assert.ok(read('view.html').includes('theme-fars.css'));
 const viewer=read('viewer.mjs');
 assert.ok(!viewer.includes('setDoc('));
 assert.ok(!viewer.includes('updateDoc('));
});
