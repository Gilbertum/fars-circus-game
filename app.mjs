import {placeBoardToken} from './board-map.mjs';
import {CELLS,CELL_TITLES,THEMES,makeSeason,makeId,roll,finishGame,pickAuction,chooseReward,undo,updateGame,updateAuction,changeTheme,renameSeason,validateSeason} from './game.mjs';
import {configured,connectFirebase,localStorageApi} from './storage.mjs';

const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible=(id,v)=>{$(id).hidden=!v;};
let backend=null,store=null,seasons=[],selected=null,nickname='Стример',demo=false,authRegister=false,busy=false,toastTimeout=null;
function message(str){const el=$('toast');el.textContent=str;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),5200);}
function errorText(e){const c=e?.code;if(c==='auth/email-already-in-use')return 'Такая почта уже зарегистрирована.';if(c==='auth/invalid-email')return 'Проверь адрес электронной почты.';if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(c))return 'Неверная почта или пароль.';if(c==='auth/weak-password')return 'Пароль слишком слабый (нужно минимум 6 символов).';if(c==='auth/unauthorized-domain')return 'Добавь домен сайта в Authentication → Settings → Authorized domains.';if(c==='permission-denied')return 'Firestore запретил доступ. Проверь правила безопасности из firestore.rules.';return e?.message||'Неизвестная ошибка';}
function phaseName(p){return {ready:'Можно бросать',playing:'Игра в процессе',auction:'Идёт аукцион',choice:'Выбор события',finished:'Сезон завершён'}[p]||p;}
const selectedSeason=()=>seasons.find(s=>s.id===selected)||null;
function setAuthMode(register){authRegister=register;$('auth-headline').textContent=register?'Регистрация артиста':'Личный кабинет';$('auth-description').textContent=register?'Создай аккаунт стримера, чтобы хранить сезоны в облаке.':'Войди, чтобы открыть свои сезоны и продолжить представление.';visible('nickname-field',register);$('auth-nickname').required=register;$('auth-submit').innerHTML=register?'Создать аккаунт <span>→</span>':'Войти в цирк <span>→</span>';$('auth-toggle').textContent=register?'Уже есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться';$('auth-password').autocomplete=register?'new-password':'current-password';}
function showAuth(){visible('app-screen',false);visible('auth-screen',true);$('auth-email').value='';$('auth-password').value='';}
async function openApp(newStore,isDemo=false){store=newStore;demo=isDemo;nickname=(await store.profile()).nickname||'Стример';seasons=(await store.list()).filter(validateSeason).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));if(!seasons.length){const first=makeSeason();await store.save(first);seasons=[first];}if(!seasons.find(s=>s.id===selected))selected=seasons[0].id;visible('auth-screen',false);visible('app-screen',true);render();}
function render(){const s=selectedSeason();if(!s)return;
  $('streamer-name').textContent=nickname;$('top-streamer-name').textContent=nickname;$('mode-badge').textContent=demo?'Демо · этот браузер':'Firebase · облачный аккаунт';
  $('season-title').textContent=s.name;
  $('season-list').innerHTML=seasons.map(se=>`<button class="season-item ${se.id===selected?'active':''}" data-season="${esc(se.id)}" title="${esc(se.name)}">${se.id===selected?'✦':'◇'} ${esc(se.name)}</button>`).join('');
  
  $('stat-position').innerHTML=String(s.position).padStart(2,'0')+' <small>/ 18</small>';
  $('stat-completed').textContent=(s.completed||[]).length;
  $('stat-tickets').textContent=s.tickets+' ✦';$('stat-phase').textContent=phaseName(s.phase);
  $('board-title').textContent='Манеж испытаний';
  $('board-caption-position').textContent=s.phase==='finished'?'ЗАНАВЕС ОПУЩЕН':`КЛЕТКА ${String(s.position).padStart(2,'0')} · ${CELL_TITLES[CELLS[s.position]].toUpperCase()}`;
  
  drawBoard(s);drawActions(s);drawHistory(s);drawUpcoming(s);drawSeasonDetails(s);updateShareUI(s);
}
async function mutate(fn){if(busy)return;const before=selectedSeason();try{busy=true;const next=fn(before);if(!validateSeason(next))throw new Error('Некорректное состояние сезона.');$('save-status').textContent='◌ Сохранение…';await store.save(next);if(next.published&&store.publish)await store.publish(next,nickname);seasons=seasons.map(s=>s.id===next.id?next:s);$('save-status').textContent='● Сохранено';render();}catch(e){$('save-status').textContent='! Ошибка сохранения';message(errorText(e));}finally{busy=false;}}

function drawUpcoming(s){
 const list=$('next-stop-list');
 if(!list)return;
 if(s.position>=18){list.innerHTML='<p class="muted">Представление завершено. Занавес!</p>';return;}
 const indexes=Array.from({length:Math.min(4,18-s.position)},(_,i)=>s.position+i+1);
 list.innerHTML=indexes.map(i=>{
  const kind=CELLS[i];
  const value=kind==='mandatory'?(s.games?.[i]?.title||CELL_TITLES[kind]):kind==='auction'?'Золотой билет':CELL_TITLES[kind];
  return '<div class="next-stop '+kind+'" title="'+esc(CELL_TITLES[kind])+'"><strong>'+String(i).padStart(2,'0')+'</strong><div><small>'+esc(CELL_TITLES[kind])+'</small><span>'+esc(value)+'</span></div></div>';
 }).join('');
}


/** Read-only listings and derived statistics; never mutates a season. */
function drawSeasonDetails(s){
 const games=$('season-game-list'),metrics=$('season-metrics');
 const mandatories=[3,8,12,17],auctions=[6,10,15],completed=s.completed||[];
 games.innerHTML='<h4>Обязательные игры</h4>'+
 mandatories.map(pos=>{
   const g=s.games?.[pos]||{},done=completed.includes(pos);
   return '<div class="game-item"><span class="game-stage">'+String(pos).padStart(2,'0')+
      '</span><div><strong>'+esc(g.title||'Игра не назначена')+'</strong><small>'+
      esc(g.goal||'')+' · '+esc(g.time||'—')+'</small></div><span class="game-state">'+
      (done?'✓ Пройдено':'Ожидает')+'</span></div>';
 }).join('')+'<h4>Зрительские аукционы</h4>'+
 auctions.map(pos=>{
   const options=s.auctions?.[pos]||[];
   const desc=options.filter(x=>x.title).map(x=>x.title).join(' · ');
   return '<div class="game-item auction-item"><span class="game-stage">'+String(pos).padStart(2,'0')+
   '</span><div><strong>Золотой билет</strong><small>'+esc(desc||'Варианты не назначены')+
   '</small></div></div>';
 }).join('');
 const fraction=Math.min(1,Math.max(0,s.position/18));
 $('season-progress-bar').style.width=(fraction*100).toFixed(1)+'%';
 $('season-progress-text').textContent='Пройдено '+s.position+' из 18 клеток · '+Math.round(fraction*100)+'%';
 const logs=Array.isArray(s.logs)?s.logs:[];
 const numberOfRolls=logs.filter(x=>/^Кубик:/.test(x.text||'')).length;
 const completeMandatory=mandatories.filter(x=>completed.includes(x)).length;
 const numbers=[
   ['Завершено испытаний',completed.length],
   ['Обязательные номера',completeMandatory+' / 4'],
   ['Броски в истории',numberOfRolls],
   ['Жетоны удачи',s.tickets||0]
 ];
 metrics.innerHTML=numbers.map(([k,v])=>'<div class="metric"><span>'+esc(k)+
 '</span><strong>'+esc(v)+'</strong></div>').join('');
}

function drawBoard(s){
  // Art and all nineteen cells live in one static image.
  // Only the marker is positioned dynamically; no SVG route is generated.
  placeBoardToken($('board-token'),s.position);
  placeBoardToken($('board-zoom-token'),s.position);
  $('board-big-position').innerHTML=String(s.position).padStart(2,'0')+' <span>из 18</span>';
  $('board-current-event').textContent=s.lastEvent || '';
  $('board-stops').innerHTML=Array.from({length:19},(_,i)=>{
    const type=CELLS[i], current=i===s.position, completed=(s.completed||[]).includes(i);
    return '<div class="stop '+(current?'current ':'')+(completed?'done ':'')+type+'" title="'+esc(CELL_TITLES[type])+'">'
      +'<span>'+String(i).padStart(2,'0')+'</span><small>'+esc(CELL_TITLES[type])+'</small></div>';
  }).join('');
}
function drawActions(s){const action=$('action-controls'),desc=$('action-description');$('action-title').textContent=CELL_TITLES[CELLS[s.position]];desc.textContent=s.lastEvent||'Представление начинается.';
  if(s.phase==='ready'){
    $('action-title').textContent='Бросок судьбы';
    action.innerHTML=`<div class="big-roll fars-dice-roll"><span class="fars-dice-image" role="img" aria-label="Алый цирковой кубик с золотыми звёздами"></span><div class="fars-dice-info"><div class="chip">КУБИК D3</div><div class="fars-roll-result"><strong>${s.lastRoll?.result??'?'}</strong><span>${s.lastRoll?'Последний бросок':'Бросок судьбы'} · 1–3</span></div></div></div><label class="small-select"><input id="lucky-roll" type="checkbox" ${s.tickets?'':'disabled'}> Потратить жетон удачи: бросить дважды, взять большее (${s.tickets})</label><button class="btn primary" data-action="roll">✦ Бросить кубик</button><div class="event-notice">${esc(s.lastEvent)}</div>`;
  }else if(s.phase==='playing'){
    const g=s.currentTask||{};
    action.innerHTML=`<div class="action-card"><strong>${esc(g.title||'Игра не назначена')}</strong><p>${esc(g.goal||'Без задания')}</p><span class="chip">${esc(g.time||'Без лимита')}</span></div><button class="btn primary" data-action="game-done">✓ Игра пройдена</button><div class="event-notice">После завершения игры можно будет бросить кубик снова. Задание определяется организатором сезона.</div>`;
  }else if(s.phase==='auction'){
    const opt=s.auctions[s.position]||[];
    action.innerHTML=`<div class="chip">АУКЦИОН № ${[6,10,15].indexOf(s.position)+1} · РЕЗУЛЬТАТ ВВОДИТ ВЕДУЩАЯ</div><div class="auction-options">${opt.map((g,i)=>`<label class="auction-option"><input type="radio" name="auction-pick" value="${i}" ${i===0?'checked':''} ${g.title?'':'disabled'}><span><strong>${esc(g.title||'Пустой вариант')}</strong><small>${esc(g.goal)} ${g.time?'· '+esc(g.time):''}</small></span></label>`).join('')}</div><button class="btn primary" data-action="auction-pick">Подтвердить победителя</button><div class="event-notice">Ставки проводятся вне приложения или вручную. Автоподсчёта донатов здесь пока нет.</div>`;
  }else if(s.phase==='choice'){
    action.innerHTML=`<div class="action-card"><strong>Что выбирает распорядитель?</strong><p>Безопасный бонус или один шаг вперёд. Контрольные клетки не перепрыгиваются.</p></div><div class="action-buttons"><button class="btn primary" data-action="reward-ticket">✦ Забрать жетон</button><button class="btn outline" data-action="reward-step">➜ Шаг вперёд</button></div>`;
  }else{
    action.innerHTML=`<div class="action-card"><strong>Занавес!</strong><p>Твой сезон завершён. Пройдено ${s.completed.length} игровых этапов. Создай новый сезон, чтобы открыть следующее представление.</p></div><button class="btn outline" id="new-season-from-end">✦ Новый сезон</button>`;
  }
}
function drawHistory(s){$('history-list').innerHTML=(s.logs||[]).map(l=>`<div class="history-item"><time>${new Date(l.at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</time><span>${esc(l.text)}</span></div>`).join('')||'<p class="muted">Здесь появятся записи о ходах.</p>';}

// DOM controls
$('demo-start').addEventListener('click',async()=>{try{await openApp(localStorageApi(),true);}catch(e){message(errorText(e));}});
$('auth-toggle').addEventListener('click',()=>setAuthMode(!authRegister));
$('auth-form').addEventListener('submit',async e=>{e.preventDefault();if(!backend){message('Firebase ещё не подключён. Используй демо или настрой firebase-config.js.');return;}const email=$('auth-email').value.trim(),pass=$('auth-password').value,nick=$('auth-nickname').value.trim();if(authRegister&&!nick){message('Укажи ник стримера.');return;}try{$('auth-submit').disabled=true;if(authRegister)await backend.register(email,pass,nick);else await backend.login(email,pass);}catch(err){message(errorText(err));}finally{$('auth-submit').disabled=false;}});
$('password-reset').addEventListener('click',async()=>{if(!backend){message('Сначала настрой Firebase.');return;}const email=$('auth-email').value.trim();if(!email){message('Введи почту в поле выше.');return;}try{await backend.reset(email);message('Если адрес зарегистрирован, письмо для сброса пароля будет отправлено.');}catch(e){message(errorText(e));}});
$('logout').addEventListener('click',async()=>{if(!demo&&backend){try{await backend.logout();}catch(e){message(errorText(e));return;}}store=null;selected=null;showAuth();});
$('season-list').addEventListener('click',e=>{const btn=e.target.closest('[data-season]');if(!btn)return;selected=btn.dataset.season;render();});
async function newSeason(){const name=prompt('Название нового сезона:','Новые гастроли');if(name===null)return;const s=makeSeason(name);try{await store.save(s);seasons.unshift(s);selected=s.id;render();message('Новый сезон открыт!');}catch(e){message(errorText(e));}}
$('new-season').addEventListener('click',newSeason);
$('action-controls').addEventListener('click',e=>{if(e.target.closest('#new-season-from-end'))newSeason();const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action;if(action==='roll')mutate(s=>roll(s,{lucky:!!$('lucky-roll')?.checked}));if(action==='game-done')mutate(finishGame);if(action==='auction-pick')mutate(s=>pickAuction(s,Number(document.querySelector('input[name="auction-pick"]:checked')?.value??-1)));if(action==='reward-ticket')mutate(s=>chooseReward(s,'ticket'));if(action==='reward-step')mutate(s=>chooseReward(s,'step'));});

function updateShareUI(s){
 const on=Boolean(s.published && !demo);
 $('publish-season').hidden=on || demo;
 $('copy-view-link').hidden=!on;
 $('unpublish-season').hidden=!on;
 $('share-hint').textContent=demo?'Для ссылки войди в Firebase-аккаунт.':on?'Сезон опубликован. По ссылке доступен только просмотр.':'Публичная афиша выключена. Доступ к кабинету есть только у владельца.';
}
function publicUrl(s){return new URL('./view.html?uid='+encodeURIComponent(store.uid)+'&season='+encodeURIComponent(s.id),location.href).href;}
$('publish-season').addEventListener('click',async()=>{
 if(demo||!store.publish)return message('Войди через Firebase.');
 const s=selectedSeason();
 try{await store.publish(s,nickname);await mutate(x=>({...x,published:true,updatedAt:Date.now()}));message('Публичная афиша включена.');}
 catch(e){message(errorText(e));}
});
$('copy-view-link').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(publicUrl(selectedSeason()));message('Ссылка скопирована.');}catch(e){message('Не удалось скопировать ссылку: '+errorText(e));}
});
$('unpublish-season').addEventListener('click',async()=>{
 if(!confirm('Закрыть доступ к публичной афише этого сезона?'))return;
 try{await store.unpublish(selectedSeason());await mutate(x=>({...x,published:false,updatedAt:Date.now()}));message('Публичная афиша закрыта.');}
 catch(e){message(errorText(e));}
});

$('open-map-zoom').addEventListener('click',()=> $('board-zoom-dialog').showModal());
$('close-map-zoom').addEventListener('click',()=> $('board-zoom-dialog').close());
async function init(){setAuthMode(false);if(!configured){$('auth-note').textContent='Firebase не настроен: доступен демо-режим с локальным сохранением. После подключения конфигурации появятся реальные кабинеты.';return;}try{backend=await connectFirebase();backend.observe(async user=>{if(user){try{await openApp(backend.getStore(),false);}catch(e){message(errorText(e));showAuth();}}else if(!demo)showAuth();});}catch(e){message(`Не удалось подключить Firebase: ${errorText(e)}. Демо по-прежнему доступно.`);}}
init();
