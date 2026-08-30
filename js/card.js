const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function renderCard(el, rec, onMore) {
  el.innerHTML = `<article class="card">
    <div class="badge">${rec.id}</div>
    <h1>${esc(rec.translit)} <span class="ar">(${rec.arabic})</span></h1>
    <div class="translation">${esc(rec.translations[0].text)}</div>
    <p class="teaser">${esc(rec.ayah.text)} <span class="ref">(${rec.ayah.ref})</span></p>
    <button class="more" type="button">Узнать больше</button>
  </article>`;
  el.querySelector('.more').addEventListener('click', onMore);
}

export function renderPage(el, rec, pair, { onClose, onGoPair }) {
  const translations = rec.translations.map(t =>
    `<div class="tr">${esc(t.text)}${t.note ? `<small>${esc(t.note)}</small>` : '<small></small>'}</div>`
  ).join('');
  const pairText = rec.pairText ?? pair?.pairText ?? null;
  el.innerHTML = `
    <button class="page-close" type="button" aria-label="Закрыть">✕</button>
    <div class="page-inner">
      <div class="page-num">${rec.id} / 99</div>
      <div class="page-arabic">${rec.arabic}</div>
      <div class="page-translit">${esc(rec.translit)}</div>
      <div class="page-tr">${translations}</div>
      <div class="page-section">
        <h2>Аят</h2>
        <p>«${esc(rec.ayah.text)}» <span class="ref">(${rec.ayah.ref}, пер. И. Ю. Крачковского)</span></p>
      </div>
      <div class="page-section">
        <h2>Толкование</h2>
        <p>${esc(rec.tafsir)}</p>
      </div>
      <div class="page-section">
        <h2>Тахаллук (уподобление)</h2>
        <p>${esc(rec.takhalluq)}</p>
      </div>
      <div class="page-section">
        <h2>Тень эгоизма</h2>
        <p>${esc(rec.shadow)}</p>
      </div>
      <div class="page-section">
        <h2>Муракаба (созерцание)</h2>
        <ul class="muraqaba">${rec.muraqaba.map(q => `<li>${esc(q)}</li>`).join('')}</ul>
      </div>
      ${pair ? `<div class="page-section">
        <h2>Пара: ${esc(pair.translit)}</h2>
        ${pairText ? `<p>${esc(pairText)}</p>` : ''}
        <button class="pair-link" type="button">Перейти к имени ${esc(pair.translit)} →</button>
      </div>` : ''}
      ${rec.listNote ? `<p class="page-footnote">${esc(rec.listNote)}</p>` : ''}
    </div>`;
  el.querySelector('.page-close').addEventListener('click', onClose);
  el.querySelector('.pair-link')?.addEventListener('click', () => onGoPair(rec.pairId));
}
