import {placeBoardToken} from './board-map.mjs';
import {firebaseConfig} from './firebase-config.js';
import {CELLS,CELL_TITLES,THEMES} from './game.mjs';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),uid=params.get('uid'),season=params.get('season');
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draw(s){
 $('viewer-title').textContent=s.name||'Гастроли проклятых';
 $('viewer-owner').textContent='Ведущая: '+(s.nickname||'Стример')+' · Только просмотр';
 placeBoardToken($('viewer-token'),s.position);
 $('viewer-position').innerHTML=String(s.position).padStart(2,'0')+' <span>из 18</span>';
 $('viewer-phase').textContent=({ready:'Ожидание броска',playing:'Идёт испытание',auction:'Золотой аукцион',choice:'Развилка',finished:'Занавес!'})[s.phase]||'Представление';
 $('viewer-event').textContent=s.lastEvent||'';
 $('viewer-game').textContent=s.currentTask?.title?('Игра: '+s.currentTask.title+' · '+(s.currentTask.goal||'')):'';
 $('viewer-stops').innerHTML=Array.from({length:19},(_,i)=>'<div title="'+safe(CELL_TITLES[CELLS[i]])+'" class="stop '+CELLS[i]+(i===s.position?' current':'')+((s.completed||[]).includes(i)?' done':'')+'"><span>'+String(i).padStart(2,'0')+'</span></div>').join('');
 $('viewer-status').textContent='Обновляется автоматически · Последнее обновление: '+new Date(s.updatedAt||Date.now()).toLocaleString('ru-RU');
}
async function start(){
 if(!uid||!season||!/^[\w-]{4,100}$/.test(uid)||!/^[\w-]{4,100}$/.test(season)){throw Error('Ссылка неверна. Запроси ссылку у ведущей.');}
 const root='https://www.gstatic.com/firebasejs/13.1.0/';
 const [{initializeApp},{getFirestore,doc,onSnapshot}]=await Promise.all([import(root+'firebase-app.js'),import(root+'firebase-firestore.js')]);
 const db=getFirestore(initializeApp(firebaseConfig));
 onSnapshot(doc(db,'publicSeasons',uid+'_'+season),snap=>{
  if(!snap.exists()){$('viewer-status').textContent='Сезон не опубликован или доступ закрыт.';return;}
  draw(snap.data());
 },()=>{$('viewer-status').textContent='Не удалось загрузить афишу. Проверь опубликованные правила Firestore.';});
}
start().catch(e=>$('viewer-status').textContent=e.message);
