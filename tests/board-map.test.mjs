import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_SIZE,BOARD_COORDS,tokenCoordinates,placeBoardToken} from '../board-map.mjs';
test('19 distinct cells lie within image bounds',()=>{
  assert.equal(BOARD_COORDS.length,19);
  assert.equal(new Set(BOARD_COORDS.map(x=>x.join(','))).size,19);
  for(let i=0;i<19;i++){
    const [x,y]=BOARD_COORDS[i];
    assert.ok(x>=0&&x<=BOARD_SIZE.width&&y>=0&&y<=BOARD_SIZE.height);
    const p=tokenCoordinates(i);
    assert.ok(p.left>0&&p.left<100&&p.top>0&&p.top<100);
  }
});
test('position outside 00–18 is rejected',()=>{
  for(const x of [-1,19,1.2,NaN,null,'2'])
    assert.throws(()=>tokenCoordinates(x),RangeError);
});
test('token positioning does not modify artwork',()=>{
  const attrs={};
  const element={style:{},setAttribute:(k,v)=>{attrs[k]=v;},title:''};
  placeBoardToken(element,18);
  assert.match(element.style.left,/^\d+(\.\d+)?%$/);
  assert.match(element.style.top,/^\d+(\.\d+)?%$/);
  assert.match(attrs['aria-label'],/18/);
});
