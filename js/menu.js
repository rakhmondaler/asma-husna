const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ранжированный поиск: имя и номер, потом сеть ассоциаций, потом тексты толкований
const stem = s => s.toLowerCase().replace(/[аяыиеёоюуьй]+$/, '');
const kin = (a, b) => {
  const sa = stem(a), sb = stem(b);
  return sa.length > 2 && sb.length > 2 && (sa.startsWith(sb) || sb.startsWith(sa));
};

function search(names, q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const n of names) {
    let score = 0;
    if (String(n.id) === q) score = 100;
    else if (n.translit.toLowerCase().includes(q)) score = 90;
    else if (n.translations.some(t => t.text.toLowerCase().includes(q))) score = 80;
    else if (n.keywords.some(k => kin(k, q))) score = 60;
    else if (q.length >= 4 && (n.tafsir + ' ' + n.takhalluq).toLowerCase().includes(q)) score = 30;
    if (score) scored.push([score, n]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 12).map(([, n]) => n);
}

export function renderMenu(el, names, { onPick, onClose }) {
  el.innerHTML = `
    <button class="page-close" type="button" aria-label="Закрыть">✕</button>
    <div class="menu-inner">
      <input class="menu-search" type="search" placeholder="Имя, номер или тема: «тревога», «прощение», «деньги»…" autocomplete="off">
      <p class="menu-prompt">Поиск понимает не только имена, но и жизненные темы —
      попробуй написать, что сейчас болит или радует.</p>
      <ul class="menu-list"></ul>
    </div>`;

  const listEl = el.querySelector('.menu-list');
  const promptEl = el.querySelector('.menu-prompt');
  const searchEl = el.querySelector('.menu-search');

  searchEl.addEventListener('input', () => {
    const q = searchEl.value;
    const hits = search(names, q);
    promptEl.hidden = q.trim().length > 0;
    listEl.innerHTML = hits.map(n => `
      <li data-id="${n.id}">
        <span class="menu-num">${n.id}</span>
        <span class="menu-name">${esc(n.translit)}</span>
        <span class="menu-tr">${esc(n.translations[0].text)}</span>
      </li>`).join('') || (q.trim() ? '<li class="menu-empty">Ничего не нашлось — попробуй другое слово</li>' : '');
  });
  listEl.addEventListener('click', e => {
    const li = e.target.closest('li[data-id]');
    if (li) onPick(Number(li.dataset.id));
  });
  el.querySelector('.page-close').addEventListener('click', onClose);
  searchEl.focus();
}
