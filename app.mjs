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
  $('streamer-name').textContent=nickname;$('mode-badge').textContent=demo?'Демо · этот браузер':'Firebase · облачный аккаунт';
  $('season-title').textContent=s.name;
  $('season-list').innerHTML=seasons.map(se=>`<button class="season-item ${se.id===selected?'active':''}" data-season="${esc(se.id)}" title="${esc(se.name)}">${se.id===selected?'✦':'◇'} ${esc(se.name)}</button>`).join('');
  $('theme-list').innerHTML=Object.entries(THEMES).map(([key,title])=>`<button class="theme-choice ${s.theme===key?'active':''}" data-theme="${key}"><img src="./assets/${key}-thumb.webp" alt=""><span>${esc(title)}</span></button>`).join('');
  $('stat-position').innerHTML=String(s.position).padStart(2,'0')+' <small>/ 18</small>';
  $('stat-completed').textContent=(s.completed||[]).length;
  $('stat-tickets').textContent=s.tickets+' ✦';$('stat-phase').textContent=phaseName(s.phase);
  $('board-title').textContent=THEMES[s.theme]+' испытаний';$('board-backdrop').style.backgroundImage=`url('./assets/${s.theme}.webp')`;
  $('board-caption-position').textContent=s.phase==='finished'?'ЗАНАВЕС ОПУЩЕН':`КЛЕТКА ${String(s.position).padStart(2,'0')} · ${CELL_TITLES[CELLS[s.position]].toUpperCase()}`;
  $('undo').disabled=!s.undo;
  drawBoard(s);drawActions(s);drawEditor(s);drawHistory(s);
}
async function mutate(fn){if(busy)return;const before=selectedSeason();try{busy=true;const next=fn(before);if(!validateSeason(next))throw new Error('Некорректное состояние сезона.');$('save-status').textContent='◌ Сохранение…';await store.save(next);seasons=seasons.map(s=>s.id===next.id?next:s);$('save-status').textContent='● Сохранено';render();}catch(e){$('save-status').textContent='! Ошибка сохранения';message(errorText(e));}finally{busy=false;}}
function createBoardPoints(theme){const arr=[];
  if(theme==='arena'){for(let i=0;i<=18;i++){const t=(-Math.PI/2)+(i/19)*Math.PI*2;arr.push([480+340*Math.cos(t),245+166*Math.sin(t)]);}}
  else if(theme==='carpet'){for(let i=0;i<=18;i++){const row=Math.floor(i/4),col=i%4;arr.push([135+(row%2?3-col:col)*228,82+row*90]);}}
  else{const pts=[[104,418],[213,421],[325,419],[438,414],[550,416],[675,416],[820,412],[828,308],[700,306],[580,304],[458,306],[340,304],[190,303],[125,204],[258,198],[402,198],[548,196],[699,191],[828,92]];pts.forEach(p=>arr.push(p));}
  return arr;
}
function drawBoard(s){const pts=createBoardPoints(s.theme);
  const path=pts.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(1)).join(',')).join(' ');
  const curves=s.theme==='arena'?'<ellipse cx="480" cy="245" rx="340" ry="166" fill="none" stroke="#bc844a" stroke-width="2" opacity=".25"/>':'';
  let html=`<defs><filter id="glow"><feGaussianBlur stdDeviation="5" result="a"/><feMerge><feMergeNode in="a"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  html+=curves+`<path class="track-line" d="${path}"/><path class="track-gold" d="${path}"/><path class="track-center" d="${path}"/>`;
  if(s.theme==='arena')html+=`<text x="480" y="224" class="center-label">FARS</text><text x="480" y="248" class="center-sub">Г А С Т Р О Л И</text><text x="480" y="273" class="center-sub">П Р О К Л Я Т Ы Х</text><text x="480" y="304" fill="#d6a66e" font-size="23" text-anchor="middle">✦</text>`;
  else html+=`<text x="480" y="30" class="center-sub">FARS GRAND CIRCUS ✦ ${s.theme==='carpet'?'КОВРОВАЯ ДОРОЖКА':'ЗАКУЛИСЬЕ'}</text>`;
  html+=pts.map(([x,y],i)=>{
    const t=CELLS[i],active=s.position===i,done=s.completed.includes(i),dark=['mandatory','auction','bonus','choice'].includes(t);
    let symbol=(t==='mandatory'?'★':t==='auction'?'◈':t==='bonus'?'✦':t==='choice'?'?':t==='start'?'S':t==='finish'?'F':'');
    return `<g class="node" data-cell="${i}" role="button" tabindex="0" aria-label="Клетка ${i}, ${CELL_TITLES[t]}" transform="translate(${x},${y})">
      ${active?'<circle r="32" stroke="#fbe5a3" stroke-width="2" fill="none" stroke-dasharray="3 3" filter="url(#glow)"/>':''}
      <rect class="node-box ${t}" x="-21" y="-19" width="42" height="38" rx="9" />
      <text class="node-num ${dark?'dark':''}" y="${symbol?'6':'1'}">${i}</text>${symbol?`<text class="node-icon" y="-8">${symbol}</text>`:''}
      ${done?'<path d="M-13 12 l6 5 l8 -10" fill="none" stroke="#ffdf7e" stroke-width="2"/>':''}
    </g>`;
  }).join('');
  const [tx,ty]=pts[s.position];html+=`<g class="node-token" transform="translate(${tx},${ty-35})"><circle r="20"/><text y="1">♠</text></g>`;
  $('board-svg').innerHTML=html;
}
function drawActions(s){const action=$('action-controls'),desc=$('action-description');$('action-title').textContent=CELL_TITLES[CELLS[s.position]];desc.textContent=s.lastEvent||'Представление начинается.';
  if(s.phase==='ready'){
    $('action-title').textContent='Бросок судьбы';
    action.innerHTML=`<div class="big-roll"><div class="die-view">${s.lastRoll?.result??'?'}</div><div><div class="chip">КУБИК D3</div><div class="muted">${s.lastRoll?`Последний бросок: ${s.lastRoll.result}`:'Первый бросок ждёт тебя'}</div></div></div><label class="small-select"><input id="lucky-roll" type="checkbox" ${s.tickets?'':'disabled'}> Потратить жетон удачи: бросить дважды, взять большее (${s.tickets})</label><button class="btn primary" data-action="roll">✦ Бросить кубик</button><div class="event-notice">${esc(s.lastEvent)}</div>`;
  }else if(s.phase==='playing'){
    const g=s.currentTask||{};
    action.innerHTML=`<div class="action-card"><strong>${esc(g.title||'Игра не назначена')}</strong><p>${esc(g.goal||'Без задания')}</p><span class="chip">${esc(g.time||'Без лимита')}</span></div><button class="btn primary" data-action="game-done">✓ Игра пройдена</button><div class="event-notice">После завершения игры можно будет бросить кубик снова. Если нужно, отредактируй название игры справа.</div>`;
  }else if(s.phase==='auction'){
    const opt=s.auctions[s.position]||[];
    action.innerHTML=`<div class="chip">АУКЦИОН № ${[6,10,15].indexOf(s.position)+1} · РЕЗУЛЬТАТ ВВОДИТ ВЕДУЩАЯ</div><div class="auction-options">${opt.map((g,i)=>`<label class="auction-option"><input type="radio" name="auction-pick" value="${i}" ${i===0?'checked':''} ${g.title?'':'disabled'}><span><strong>${esc(g.title||'Пустой вариант')}</strong><small>${esc(g.goal)} ${g.time?'· '+esc(g.time):''}</small></span></label>`).join('')}</div><button class="btn primary" data-action="auction-pick">Подтвердить победителя</button><div class="event-notice">Ставки проводятся вне приложения или вручную. Автоподсчёта донатов здесь пока нет.</div>`;
  }else if(s.phase==='choice'){
    action.innerHTML=`<div class="action-card"><strong>Что выбирает распорядитель?</strong><p>Безопасный бонус или один шаг вперёд. Контрольные клетки не перепрыгиваются.</p></div><div class="action-buttons"><button class="btn primary" data-action="reward-ticket">✦ Забрать жетон</button><button class="btn outline" data-action="reward-step">➜ Шаг вперёд</button></div>`;
  }else{
    action.innerHTML=`<div class="action-card"><strong>Занавес!</strong><p>Твой сезон завершён. Пройдено ${s.completed.length} игровых этапов. Создай новый сезон, чтобы открыть следующее представление.</p></div><button class="btn outline" id="new-season-from-end">✦ Новый сезон</button>`;
  }
}
function drawEditor(s){const n=Number($('edit-cell').value),el=$('game-editor'),type=CELLS[n];
  if(type==='mandatory'){
    const g=s.games[n]||{};
    el.innerHTML=`<form id="game-form"><div class="editor-row"><div class="field"><label>Название игры</label><input name="title" required maxlength="100" value="${esc(g.title)}"></div><div class="field"><label>Цель</label><input name="goal" maxlength="180" value="${esc(g.goal)}"></div><div class="field"><label>Время</label><input name="time" maxlength="32" value="${esc(g.time)}"></div></div><button class="btn outline" type="submit">✓ Сохранить игру</button></form>`;
  }else{
    const games=s.auctions[n]||[];
    el.innerHTML=`<form id="auction-form"><div class="small muted">Три варианта для зрительского выбора</div>${[0,1,2].map(i=>{const g=games[i]||{};return `<div class="editor-row"><div class="field"><label>Игра ${i+1}</label><input name="title-${i}" maxlength="100" value="${esc(g.title)}"></div><div class="field"><label>Цель</label><input name="goal-${i}" maxlength="180" value="${esc(g.goal)}"></div><div class="field"><label>Время</label><input name="time-${i}" maxlength="32" value="${esc(g.time)}"></div></div>`;}).join('')}<button class="btn outline" type="submit">✓ Сохранить аукцион</button></form>`;
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
$('theme-list').addEventListener('click',e=>{const btn=e.target.closest('[data-theme]');if(btn)mutate(s=>changeTheme(s,btn.dataset.theme));});
async function newSeason(){const name=prompt('Название нового сезона:','Новые гастроли');if(name===null)return;const s=makeSeason(name);try{await store.save(s);seasons.unshift(s);selected=s.id;render();message('Новый сезон открыт!');}catch(e){message(errorText(e));}}
$('new-season').addEventListener('click',newSeason);
$('action-controls').addEventListener('click',e=>{if(e.target.closest('#new-season-from-end'))newSeason();const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action;if(action==='roll')mutate(s=>roll(s,{lucky:!!$('lucky-roll')?.checked}));if(action==='game-done')mutate(finishGame);if(action==='auction-pick')mutate(s=>pickAuction(s,Number(document.querySelector('input[name="auction-pick"]:checked')?.value??-1)));if(action==='reward-ticket')mutate(s=>chooseReward(s,'ticket'));if(action==='reward-step')mutate(s=>chooseReward(s,'step'));});
$('edit-cell').addEventListener('change',()=>drawEditor(selectedSeason()));
$('game-editor').addEventListener('submit',e=>{e.preventDefault();const form=e.target;const n=Number($('edit-cell').value),fd=new FormData(form);if(form.id==='game-form')mutate(s=>updateGame(s,n,Object.fromEntries(['title','goal','time'].map(k=>[k,fd.get(k)]))));if(form.id==='auction-form')mutate(s=>updateAuction(s,n,[0,1,2].map(i=>Object.fromEntries(['title','goal','time'].map(k=>[k,fd.get(`${k}-${i}`)])))));});
$('board-svg').addEventListener('click',e=>selectCell(e.target.closest('[data-cell]')));
$('board-svg').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();selectCell(e.target.closest('[data-cell]'));}});
function selectCell(node){if(!node)return;const cell=Number(node.dataset.cell);if(['mandatory','auction'].includes(CELLS[cell])){$('edit-cell').value=cell;drawEditor(selectedSeason());$('edit-cell').scrollIntoView({behavior:'smooth',block:'center'});}else message(`Клетка ${cell} · ${CELL_TITLES[CELLS[cell]]}`);}
$('undo').addEventListener('click',()=>{if(confirm('Отменить последнее действие в этом сезоне?'))mutate(undo);});
$('rename-season').addEventListener('click',()=>{const name=prompt('Название сезона:',selectedSeason().name);if(name!==null&&name.trim())mutate(s=>renameSeason(s,name));});
$('delete-season').addEventListener('click',async()=>{const s=selectedSeason();if(!confirm(`Удалить сезон «${s.name}»? Это нельзя отменить. Перед удалением можно скачать резервную копию.`))return;try{await store.remove(s.id);seasons=seasons.filter(x=>x.id!==s.id);if(!seasons.length){const first=makeSeason();await store.save(first);seasons=[first];}selected=seasons[0].id;render();message('Сезон удалён.');}catch(e){message(errorText(e));}});
$('edit-profile').addEventListener('click',async()=>{const name=prompt('Ник стримера:',nickname);if(name===null||!name.trim())return;try{await store.saveProfile(name.trim().slice(0,64));nickname=name.trim().slice(0,64);render();message('Ник изменён.');}catch(e){message(errorText(e));}});
$('export-season').addEventListener('click',()=>{const s=selectedSeason();const data=new Blob([JSON.stringify({...s,undo:null},null,2)],{type:'application/json'});const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=`fars-${s.name.replace(/[^a-zа-яё0-9-]/gi,'-').slice(0,38)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('import-season').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>500000){message('Файл слишком большой. Максимум 500 КБ.');return;}try{const raw=JSON.parse(await file.text());if(!validateSeason(raw))throw new Error('Файл не похож на сохранение сезона FARS.');const fresh=makeSeason(raw.name,raw.theme);const s={...fresh,...raw,id:makeId(),undo:null,logs:(raw.logs||[]).slice(0,50),updatedAt:Date.now()};if(!validateSeason(s))throw new Error('Неверный формат состояния.');await store.save(s);seasons.unshift(s);selected=s.id;render();message('Сезон импортирован как отдельная копия.');}catch(err){message(errorText(err));}});

async function init(){setAuthMode(false);if(!configured){$('auth-note').textContent='Firebase не настроен: доступен демо-режим с локальным сохранением. После подключения конфигурации появятся реальные кабинеты.';return;}try{backend=await connectFirebase();backend.observe(async user=>{if(user){try{await openApp(backend.getStore(),false);}catch(e){message(errorText(e));showAuth();}}else if(!demo)showAuth();});}catch(e){message(`Не удалось подключить Firebase: ${errorText(e)}. Демо по-прежнему доступно.`);}}
init();
