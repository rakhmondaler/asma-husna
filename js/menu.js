const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function renderMenu(el, names, { onPick, onClose }) {
  el.innerHTML = `
    <button class="page-close" type="button" aria-label="Закрыть">✕</button>
    <div class="menu-inner">
      <input class="menu-search" type="search" placeholder="Поиск: имя, перевод или номер" autocomplete="off">
      <ul class="menu-list"></ul>
      <div class="menu-about">
        <h2>О проекте</h2>
        <p>Интерактивные чётки: 99 имён Аллаха, имя за именем. Толкования опираются
        на трактат аль-Газали «аль-Максад аль-асна»; кажущиеся противоречия парных
        имён — главный сюжет, расхождения канонических списков — честные сноски.</p>
        <p class="menu-credits">Аяты — в переводе И. Ю. Крачковского (корпус Tanzil).
        Структура толкований вдохновлена umma.ru. Каллиграфия — шрифт Amiri.
        Замысел и дизайн — Далер Рахмонов.</p>
      </div>
    </div>`;

  const listEl = el.querySelector('.menu-list');
  const searchEl = el.querySelector('.menu-search');

  function rows(filter) {
    const q = filter.trim().toLowerCase();
    const hits = q
      ? names.filter(n =>
          String(n.id) === q ||
          n.translit.toLowerCase().includes(q) ||
          n.translations.some(t => t.text.toLowerCase().includes(q)))
      : names;
    listEl.innerHTML = hits.map(n => `
      <li data-id="${n.id}">
        <span class="menu-num">${n.id}</span>
        <span class="menu-name">${esc(n.translit)}</span>
        <span class="menu-tr">${esc(n.translations[0].text)}</span>
      </li>`).join('') || '<li class="menu-empty">Ничего не нашлось</li>';
  }
  rows('');

  searchEl.addEventListener('input', () => rows(searchEl.value));
  listEl.addEventListener('click', e => {
    const li = e.target.closest('li[data-id]');
    if (li) onPick(Number(li.dataset.id));
  });
  el.querySelector('.page-close').addEventListener('click', onClose);
}
