import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BOARD_COORDS,BOARD_SIZE,tokenCoordinates} from '../board-map.mjs';
const asset=readFileSync(new URL('../assets/fars-board-v04.svg',import.meta.url),'utf8');
const cat=readFileSync(new URL('../assets/fars-cat-token.svg',import.meta.url),'utf8');
const streamer=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const viewer=readFileSync(new URL('../view.html',import.meta.url),'utf8');
test('illustrated static map retains exactly 19 numbered cells',()=>{
 const labels=[...asset.matchAll(/<text y="-6"[^>]*>(\d{2})<\/text>/g)].map(m=>m[1]);
 assert.deepEqual(labels,Array.from({length:19},(_,i)=>String(i).padStart(2,'0')));
 assert.equal(BOARD_COORDS.length,19);
 assert.equal(BOARD_SIZE.width,1600);
 assert.equal(BOARD_SIZE.height,900);
});
test('illustration adds atmosphere without altering map positions',()=>{
 assert.match(asset,/v4Tent/);
 assert.match(asset,/v4Lamp/);
 for(let i=0;i<19;i++){
  const {left,top}=tokenCoordinates(i);
  assert.ok(left>0&&left<100&&top>0&&top<100);
 }
});
test('streamer and read-only viewer both use same new picture',()=>{
 for(const page of [streamer,viewer]){
  assert.equal(page.split('assets/fars-board-v04.svg').length-1,2);
  assert.match(page,/id="board-zoom-token"/);
 }
 assert.match(cat,/Фишка FARS/);
 assert.doesNotMatch(viewer,/id="game-editor"/);
});
