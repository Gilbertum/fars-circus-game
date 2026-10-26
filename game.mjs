/** FARS — игровая логика без доступа к DOM и Firebase. */
export const CELLS = Object.freeze({
  0:'start',1:'event',2:'bonus',3:'mandatory',4:'event',5:'choice',
  6:'auction',7:'event',8:'mandatory',9:'bonus',10:'auction',11:'choice',
  12:'mandatory',13:'event',14:'bonus',15:'auction',16:'event',17:'mandatory',18:'finish'
});
export const CELL_TITLES = {start:'Открытие представления',event:'Фокус распорядителя',bonus:'Аплодисменты',mandatory:'Главный номер',choice:'Развилка судьбы',auction:'Золотой билет',finish:'Последний занавес'};
export const THEMES = {arena:'Манеж',carpet:'Ковровая дорожка',backstage:'Закулисье'};
export const SAMPLE_GAMES = {
  3:{title:'Pikuniku',goal:'Пройти основную историю',time:'≈ 3 ч'},
  8:{title:'Donut County',goal:'Пройти основную историю',time:'≈ 2 ч'},
  12:{title:'Little Nightmares',goal:'Пройти основную историю',time:'≈ 4 ч'},
  17:{title:'Turnip Boy Commits Tax Evasion',goal:'Пройти основную историю',time:'≈ 2 ч'}
};
export const SAMPLE_AUCTIONS = {
  6:[{title:'Unpacking',goal:'Пройти игру',time:'≈ 3–4 ч'},{title:'Minami Lane',goal:'Пройти игру',time:'≈ 2–4 ч'},{title:'Backpack Hero',goal:'Один успешный забег',time:'≈ 1–2 ч'}],
  10:[{title:'Duck Detective: The Secret Salami',goal:'Раскрыть дело',time:'≈ 2–3 ч'},{title:'Pikuniku',goal:'Пройти игру',time:'≈ 3 ч'},{title:'Minami Lane',goal:'Пройти игру',time:'≈ 2–4 ч'}],
  15:[{title:'Donut County',goal:'Пройти игру',time:'≈ 2 ч'},{title:'Unpacking',goal:'Пройти игру',time:'≈ 3–4 ч'},{title:'Backpack Hero',goal:'Один успешный забег',time:'≈ 1–2 ч'}]
};
const EVENTS = [
  {text:'Котик-конферансье бросает тебе золотой билет. +1 жетон удачи.',tickets:1},
  {text:'Оркестр фальшивит так убедительно, что публика требует бис. +1 жетон удачи.',tickets:1},
  {text:'Из цилиндра вместо кролика вылезло подозрение. На этот раз обошлось без штрафов.',tickets:0},
  {text:'Распорядитель поправил занавес. Пока ты под его защитой, всё спокойно.',tickets:0},
  {text:'В проходе промелькнул хвостатый артист. Удивительно, но он ничего не украл.',tickets:0}
];
const copy = x => JSON.parse(JSON.stringify(x));
const choose = (arr,rng) => arr[Math.min(arr.length-1,Math.floor(Math.max(0,Math.min(.999999,rng()))*arr.length))];
const d3 = rng => 1 + Math.floor(Math.max(0,Math.min(.999999,rng()))*3);
const cap = (s,n=120) => String(s ?? '').trim().slice(0,n);
export const makeId = () => (globalThis.crypto?.randomUUID?.() || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
export function makeSeason(name='Первые гастроли',theme='arena') {
  return {id:makeId(),name:cap(name,72)||'Новый сезон',theme:THEMES[theme]?theme:'arena',position:0,phase:'ready',tickets:0,completed:[],games:copy(SAMPLE_GAMES),auctions:copy(SAMPLE_AUCTIONS),currentTask:null,lastRoll:null,lastEvent:'Манеж ждёт первого броска.',logs:[{at:Date.now(),text:'Открытие сезона'}],undo:null,createdAt:Date.now(),updatedAt:Date.now()};
}
function begin(prev) {const next=copy(prev);next.undo=copy({...prev,undo:null});return next;}
function record(s,text) {s.updatedAt=Date.now();s.logs=[{at:Date.now(),text},...(s.logs||[])].slice(0,50);return s;}
function stopAt(s,pos,logSuffix='') {
  s.position=pos;
  const type=CELLS[pos];
  if(type==='mandatory') {
    s.phase='playing';s.currentTask=copy(s.games[pos]||{title:'Игра не назначена',goal:'Назначить в настройках',time:'—'});
    s.lastEvent=`Обязательная игра: ${s.currentTask.title}`;
  } else if(type==='auction') {
    s.phase='auction';s.currentTask=null;s.lastEvent='Начался аукцион: выбери победившую игру.';
  } else if(type==='finish') {
    s.phase='finished';s.currentTask=null;s.lastEvent='Занавес! Сезон завершён.';
  } else if(type==='bonus') {
    s.tickets+=1;s.phase='ready';s.lastEvent='Аплодисменты публики! +1 жетон удачи.';
  } else if(type==='choice') {
    s.phase='choice';s.lastEvent='Выбери награду: жетон удачи или шаг вперёд.';
  } else if(type==='event') {
    s.phase='ready';
  } else {s.phase='ready';s.lastEvent='Продолжаем представление.';}
  return record(s,`Клетка ${pos}: ${CELL_TITLES[type]}${logSuffix}`);
}
export function roll(season,{lucky=false,rng=Math.random}={}) {
  if(season.phase!=='ready')throw new Error('Сначала заверши текущий номер или событие.');
  if(lucky && season.tickets<1)throw new Error('Нет жетонов удачи.');
  const s=begin(season);
  const a=d3(rng),b=lucky?d3(rng):null,die=lucky?Math.max(a,b):a;
  if(lucky)s.tickets--;
  s.lastRoll={a,b,result:die};
  const end=Math.min(18,s.position+die);
  const checkpoints=[3,6,8,10,12,15,17];
  const required=checkpoints.find(n=>n>s.position&&n<=end&&!(s.completed||[]).includes(n));
  const destination=required ?? end;
  stopAt(s,destination);
  const originMessage=`Кубик: ${a}${b!==null?` и ${b}`:''} → ${die}.`;
  if(CELLS[destination]==='event') {
    const event=choose(EVENTS,rng);s.tickets+=event.tickets;s.lastEvent=event.text;
  }
  return record(s,`${originMessage} Переход ${season.position} → ${destination}${required!==undefined&&required<end?' (остановка на контрольной клетке)':''}.`);
}
export function finishGame(season) {
  if(season.phase!=='playing')throw new Error('Сейчас нет игры для завершения.');
  const s=begin(season);if(!s.completed.includes(s.position))s.completed.push(s.position);
  const task=s.currentTask?.title||'Игра';s.currentTask=null;s.phase='ready';s.lastEvent=`«${task}» завершена. Можно бросать кубик.`;
  return record(s,`Завершена игра: ${task} (клетка ${s.position}).`);
}
export function pickAuction(season,index) {
  if(season.phase!=='auction')throw new Error('Сейчас не проводится аукцион.');
  const options=season.auctions[season.position]||[];
  const game=options[index];if(!game?.title?.trim())throw new Error('Выбери игру из заполненных вариантов.');
  const s=begin(season);s.phase='playing';s.currentTask=copy(game);s.lastEvent=`Победа на аукционе: ${game.title}`;
  return record(s,`Аукцион ${s.position}: победила «${game.title}».`);
}
export function chooseReward(season,reward) {
  if(season.phase!=='choice')throw new Error('Сейчас нет развилки.');
  if(!['ticket','step'].includes(reward))throw new Error('Неизвестный выбор.');
  const s=begin(season);
  if(reward==='ticket'){s.tickets++;s.phase='ready';s.lastEvent='Ты выбрала золотой жетон удачи.';return record(s,'Развилка: +1 жетон удачи.');}
  // Даже бонусный шаг не перепрыгивает обязательные остановки.
  stopAt(s,Math.min(18,s.position+1));
  return record(s,'Развилка: шаг вперёд.');
}
export function undo(season){if(!season.undo)throw new Error('Нет действия для отмены.');return copy({...season.undo,undo:null,updatedAt:Date.now()});}
export function updateGame(season,cell,game){if(CELLS[cell]!=='mandatory')throw new Error('Не та клетка.');const s=begin(season);s.games[cell]={title:cap(game.title,100)||'Игра не назначена',goal:cap(game.goal,180),time:cap(game.time,32)};if(s.phase==='playing'&&s.position===Number(cell))s.currentTask=copy(s.games[cell]);return record(s,`Обновлена игра клетки ${cell}.`);}
export function updateAuction(season,cell,options){if(CELLS[cell]!=='auction')throw new Error('Не та клетка.');const s=begin(season);s.auctions[cell]=options.slice(0,3).map(g=>({title:cap(g.title,100),goal:cap(g.goal,180),time:cap(g.time,32)}));return record(s,`Обновлены варианты аукциона ${cell}.`);}
export function changeTheme(season,theme){if(!THEMES[theme])throw new Error('Нет такого оформления.');const s=begin(season);s.theme=theme;return record(s,`Оформление: ${THEMES[theme]}.`);}
export function renameSeason(season,name){const s=begin(season);s.name=cap(name,72)||s.name;return record(s,`Название сезона: ${s.name}.`);}
export function validateSeason(x){return x&&typeof x==='object'&&typeof x.id==='string'&&typeof x.name==='string'&&THEMES[x.theme]&&Number.isInteger(x.position)&&x.position>=0&&x.position<=18&&['ready','playing','auction','choice','finished'].includes(x.phase)&&Array.isArray(x.completed)&&typeof x.games==='object'&&typeof x.auctions==='object';}
