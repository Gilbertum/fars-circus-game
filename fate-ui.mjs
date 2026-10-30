import {CELLS, CELL_TITLES} from './game.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

export function fateDestination(season) {
  const position = Math.min(18, Math.max(0, Number(season.position) + 1));
  const type = CELLS[position] || 'finish';
  const title = CELL_TITLES[type] || 'Последний занавес';
  const gameTitle = type === 'mandatory' ? (season.games?.[position]?.title || 'Игра не назначена') : null;
  return {position,type,title,gameTitle};
}

/** Read-only visual preview; actions are handled by the existing game engine.
 * No Firebase calls, no random rolls and no game-state writes. */
export function renderFateChoices(season) {
  const next=fateDestination(season);
  const ticketCount=Number(season.tickets)||0;
  const nextLabel='Клетка '+String(next.position).padStart(2,'0')+' · '+next.title;
  const nextDetail=next.gameTitle ? 'Предстоит: '+next.gameTitle : (
    next.type==='auction' ? 'Впереди зрительский аукцион' :
    next.type==='finish' ? 'Последний занавес представления' :
    'Событие будет разыграно по правилам цирка'
  );
  return `<div class="fars-fate">
    <p class="fars-fate-intro">Выбери одну награду. После выбора ход сразу завершится.</p>
    <div class="fars-fate-options" role="group" aria-label="Выбор награды распорядителя">
      <button type="button" class="fars-fate-card fars-fate-ticket" data-action="reward-ticket" aria-label="Забрать жетон удачи">
        <span class="fars-fate-icon" aria-hidden="true">✦</span>
        <span class="fars-fate-card-body">
          <strong>Забрать жетон</strong>
          <small>+1 жетон удачи</small>
          <small>Станет: ${esc(ticketCount+1)}</small>
        </span>
      </button>
      <button type="button" class="fars-fate-card fars-fate-step" data-action="reward-step" aria-label="Шаг вперёд">
        <span class="fars-fate-icon" aria-hidden="true">➜</span>
        <span class="fars-fate-card-body">
          <strong>Шаг вперёд</strong>
          <small>${esc(nextLabel)}</small>
          <small>${esc(nextDetail)}</small>
        </span>
      </button>
    </div>
    <p class="fars-fate-notice">Шаг не позволяет пропустить обязательную игру или аукцион. Награда применяется сразу.</p>
  </div>`;
}
