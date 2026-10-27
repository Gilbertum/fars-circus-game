/** View-only router. It changes layout, never writes to Firebase. */
const allowed = new Set(['season','map','games','statistics','settings']);
function currentView(){
  const token=decodeURIComponent(location.hash.slice(1));
  return allowed.has(token)?token:'season';
}
function switchView(){
  const view=currentView();
  document.body.dataset.view=view;
  document.querySelectorAll('.global-nav [data-view],.global-home[data-view]').forEach(link=>{
    const selected=link.dataset.view===view;
    link.classList.toggle('active',selected);
    if(selected) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  const captions={season:'Мой сезон',map:'Карта представления',games:'Игры и испытания',statistics:'Статистика',settings:'Настройки'};
  const pageTitle=document.getElementById('page-section-title');
  if(pageTitle)pageTitle.textContent=captions[view];
}
window.addEventListener('hashchange',switchView);
switchView();
