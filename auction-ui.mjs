/** Presentation-only auction UI. The selected winner is confirmed by the streamer,
 * not calculated from votes, and never saved before the confirm action. */
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function activeAuctionIndex(options) {
  return Array.isArray(options) ? options.findIndex(option => typeof option?.title === 'string' && option.title.trim().length > 0) : -1;
}

export function selectedAuctionTitle(options, index) {
  const item=Array.isArray(options) ? options[index] : undefined;
  return item?.title?.trim() || 'Игра пока не выбрана';
}

export function renderAuctionControls(options, cell) {
  const games=Array.isArray(options)?options.slice(0,3):[];
  const first=activeAuctionIndex(games);
  const auctionNumber=[6,10,15].indexOf(Number(cell))+1;
  const cards=games.map((game,index)=>{
    const title=typeof game?.title==='string'?game.title.trim():'';
    const valid=Boolean(title);
    const checked=valid && index===first;
    const goal=String(game?.goal||'Задание определяет организатор').trim();
    const time=String(game?.time||'Время не указано').trim();
    return `<label class="fars-auction-card ${checked?'is-initial':''} ${valid?'':'is-unavailable'}">
       <input class="fars-auction-radio" type="radio" name="auction-pick" value="${index}" ${checked?'checked':''} ${valid?'':'disabled'}>
       <span class="fars-auction-poster scene-${index}" aria-hidden="true"><span>${['I','II','III'][index]}</span></span>
       <span class="fars-auction-copy"><span class="fars-auction-card-label">ПРЕТЕНДЕНТ ${index+1}</span>
        <strong>${escapeText(title||'Место свободно')}</strong>
        <small class="fars-auction-goal">${escapeText(goal)}</small>
        <small class="fars-auction-time">◷ ${escapeText(time)}</small>
       </span>
       <span class="fars-auction-check" aria-hidden="true">✦</span>
      </label>`;
  }).join('');
  const label = first>=0 ? `Выбрано: ${selectedAuctionTitle(games,first)}` : 'Нет доступных игр для выбора';
  return `<div class="fars-auction-kicker"><span aria-hidden="true">✦</span> ЗОЛОТОЙ БИЛЕТ <span aria-hidden="true">✦</span>
    <small>Аукцион № ${auctionNumber>0?auctionNumber:'—'}</small></div>
    <fieldset class="fars-auction-options"><legend class="sr-only">Победившая игра аукциона</legend>${cards}</fieldset>
    <p class="fars-auction-choice" id="auction-selection-hint" role="status" aria-live="polite">${escapeText(label)}</p>
    <button class="btn primary fars-auction-confirm" data-action="auction-pick" ${first<0?'disabled':''}>✦ Подтвердить победившую игру</button>
    <p class="fars-auction-disclaimer">Ставки принимаются вне сайта. Здесь ведущая только фиксирует победивший вариант.</p>`;
}
