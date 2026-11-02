/**
 * FARS v0.11 — archival chronicle, purely derived from an existing season.
 * Storage keeps only the last 50 log entries. Do not reconstruct missing
 * auction winners, lifetime roll counts or unrecorded events.
 */
import {CELLS,CELL_TITLES} from './game.mjs';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const MILESTONES=Object.freeze([0,3,6,8,10,12,15,17,18]);
export const CHRONICLE_FILTERS=Object.freeze([
  {id:'all',label:'Все записи'},
  {id:'games',label:'Игры'},
  {id:'auctions',label:'Аукционы'},
  {id:'rolls',label:'Кубик'},
  {id:'events',label:'События'}
]);

export function classifyChronicleEvent(text){
 const value=String(text??'');
 if(/^Завершена игра:/.test(value))return 'games';
 if(/^Аукцион \d+: победила/.test(value))return 'auctions';
 if(/^Кубик:/.test(value))return 'rolls';
 return 'events';
}
function formatLogDate(value){
 const n=Number(value);
 if(!Number.isFinite(n)||n<=0)return 'Дата не указана';
 const date=new Date(n);
 if(Number.isNaN(date.getTime()))return 'Дата не указана';
 return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date);
}
export function summarizeChronicle(season){
 const logs=Array.isArray(season?.logs)?season.logs.slice(0,50):[];
 const completed=new Set(Array.isArray(season?.completed)?season.completed.map(Number):[]);
 const winners={};
 // Logs are newest first, so preserve the most recent entry for a cell.
 for(const entry of logs){
  const match=String(entry?.text??'').match(/^Аукцион\s+(6|10|15):\s+победила\s+«(.+?)»\./);
  if(match && !winners[match[1]])winners[match[1]]=match[2];
 }
 const position=Math.max(0,Math.min(18,Number(season?.position)||0));
 const finished=season?.phase==='finished';
 const milestones=MILESTONES.map(cell=>{
  const type=CELLS[cell];
  const reached=cell===0||position>cell||position===cell;
  let status='upcoming';
  if(cell===18)status=finished?'done':(position===18?'current':'upcoming');
  else if(cell===0)status='done';
  else if((type==='mandatory'||type==='auction')&&completed.has(cell))status='done';
  else if(cell===position)status='current';
  else if(position>cell)status='passed';
  const title=type==='mandatory'?String(season?.games?.[cell]?.title||'Главный номер'):
     type==='auction'?'Золотой билет':cell===0?'Начало гастролей':'Последний занавес';
  let detail='';
  if(type==='auction'){
   const known=winners[String(cell)]||
     (cell===position&&season?.phase==='playing'?String(season?.currentTask?.title||''):'');
   if(known)detail='Победила: '+known;
   else if(completed.has(cell))detail='Игра пройдена; результат не сохранился в последних записях';
   else if(position>cell)detail='Победитель не указан в доступной истории';
   else detail='Ожидает зрительского выбора';
  }else if(type==='mandatory'){
   detail=completed.has(cell)?'Игра пройдена':(cell===position?'Текущее испытание':'Обязательное испытание');
  }else if(cell===18)detail=finished?'Сезон завершён':'Впереди финал';
  else detail='Представление начинается';
  return {cell,type,status,reached,title,detail};
 });
 const completedMandatory=[3,8,12,17].filter(n=>completed.has(n)).length;
 const completedAuctions=[6,10,15].filter(n=>completed.has(n)).length;
 const totalCompleted=completed.size;
 const rollEntries=logs.filter(entry=>classifyChronicleEvent(entry?.text)==='rolls').length;
 const achievements=[
  {name:'Первый номер',description:'Завершить первое игровое испытание',earned:totalCompleted>=1,icon:'✦'},
  {name:'Золотой билет',description:'Завершить игру, выбранную на аукционе',earned:completedAuctions>=1,icon:'🎟'},
  {name:'Экватор манежа',description:'Добраться до клетки 09',earned:position>=9,icon:'★'},
  {name:'Последний занавес',description:'Дойти до финала и завершить сезон',earned:finished,icon:'✧'}
 ];
 return {position,completedMandatory,completedAuctions,totalCompleted,rollEntries,logs,milestones,achievements,finished,logLimit:50};
}
export function renderChronicle(season,filter='all'){
 const data=summarizeChronicle(season);
 const active=CHRONICLE_FILTERS.some(f=>f.id===filter)?filter:'all';
 const milestoneHtml=data.milestones.map(item=>`<li class="chronicle-stop ${item.status}" title="${escapeHtml(CELL_TITLES[item.type])}">
  <span class="chronicle-stop-number">${pad(item.cell)}</span>
  <span class="chronicle-stop-body"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>
  <span class="chronicle-stop-state">${({done:'✓',passed:'·',current:'●',upcoming:'○'})[item.status]}</span>
 </li>`).join('');
 const achievementsHtml=data.achievements.map(a=>`<li class="chronicle-award ${a.earned?'earned':'locked'}">
   <span class="chronicle-award-icon" aria-hidden="true">${a.icon}</span>
   <span><strong>${escapeHtml(a.name)}</strong><small>${escapeHtml(a.description)}</small></span>
   <span class="chronicle-award-status">${a.earned?'Получено':'Не открыто'}</span>
 </li>`).join('');
 const filterHtml=CHRONICLE_FILTERS.map(f=>`<button type="button" class="chronicle-filter ${active===f.id?'is-selected':''}"
   data-chronicle-filter="${f.id}" aria-pressed="${active===f.id}">${f.label}</button>`).join('');
 const matching=data.logs.filter(x=>active==='all'||classifyChronicleEvent(x?.text)===active);
 const logHtml=matching.length?matching.map(entry=>{
  const category=classifyChronicleEvent(entry?.text);
  return `<li class="chronicle-log-entry ${category}">
   <time>${escapeHtml(formatLogDate(entry?.at))}</time>
   <span>${escapeHtml(entry?.text)}</span>
  </li>`;
 }).join(''):'<li class="chronicle-log-empty">В сохранённой истории пока нет записей этого типа.</li>';
 return `<div class="chronicle-stage">
   <div class="chronicle-intro">
    <div><div class="eyebrow">✦ АРХИВ ПРОКЛЯТОГО ЦИРКА</div>
    <h4>Летопись гастролей</h4>
    <p>Путь от первого звонка до последнего занавеса. Все отметки основаны на сохранённом сезоне.</p></div>
    <span class="chronicle-seal" aria-hidden="true">✦</span>
   </div>
   <div class="chronicle-highlights" aria-label="Итоги сезона">
    <div><span>Путь</span><strong>${pad(data.position)} / 18</strong></div>
    <div><span>Главные номера</span><strong>${data.completedMandatory} / 4</strong></div>
    <div><span>Аукционы пройдены</span><strong>${data.completedAuctions} / 3</strong></div>
    <div><span>Броски в истории</span><strong>${data.rollEntries}</strong></div>
   </div>
   <div class="chronicle-split">
    <section class="chronicle-paper" aria-labelledby="chronicle-route-heading">
      <h5 id="chronicle-route-heading">✦ Важные остановки</h5>
      <ol class="chronicle-route">${milestoneHtml}</ol>
    </section>
    <section class="chronicle-paper" aria-labelledby="chronicle-awards-heading">
      <h5 id="chronicle-awards-heading">✦ Награды сезона</h5>
      <ul class="chronicle-awards">${achievementsHtml}</ul>
      <p class="chronicle-awards-note">Награды — виртуальные отметки прогресса. Их получение не начисляет игровых жетонов.</p>
    </section>
   </div>
   <section class="chronicle-journal" aria-labelledby="chronicle-journal-heading">
    <div class="chronicle-journal-heading"><h5 id="chronicle-journal-heading">Лента событий</h5>
     <span>${data.logs.length} записей в архиве</span></div>
    <div class="chronicle-filters" role="group" aria-label="Фильтр летописи">${filterHtml}</div>
    <ol class="chronicle-log-list">${logHtml}</ol>
    <p class="chronicle-limit">Сохраняются только последние ${data.logLimit} событий. Старые записи и имена победителей аукционов могут быть недоступны; число бросков показано только для сохранённой истории.</p>
   </section>
 </div>`;
}
