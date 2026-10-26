/**
 * FARS map v0.3.
 * Fixed artwork positions (1600×900 pixels). The route and all numbered cells
 * are baked into assets/fars-board.svg. Only the player token moves in the UI.
 */
export const BOARD_SIZE=Object.freeze({width:1600,height:900});
export const BOARD_COORDS=Object.freeze([
  [160,724],[360,724],[560,724],[760,724],[960,724],[1160,724],[1360,724],
  [1350,531],[1126,531],[902,531],[678,531],[454,531],[230,531],
  [230,307],[454,307],[678,307],[902,307],[1126,307],[1350,307]
].map(point=>Object.freeze(point)));
export function tokenCoordinates(position){
  if(!Number.isInteger(position)||position<0||position>=BOARD_COORDS.length)
    throw new RangeError('Клетка отсутствует на карте');
  const [x,y]=BOARD_COORDS[position];
  // Anchor the marker at the upper-right corner, leaving the cell number visible.
  return {left:(x+67)/BOARD_SIZE.width*100,top:(y-41)/BOARD_SIZE.height*100};
}
export function placeBoardToken(element,position){
  const coords=tokenCoordinates(position);
  element.style.left=coords.left+'%';
  element.style.top=coords.top+'%';
  element.setAttribute('aria-label','Фишка на клетке '+String(position).padStart(2,'0'));
  element.title='Текущая клетка: '+String(position).padStart(2,'0');
}
