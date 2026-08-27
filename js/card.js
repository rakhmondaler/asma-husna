const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function nameBlock(rec) {
  const translations = rec.translations.map(t =>
    `<div class="tr"><span>${esc(t.text)}</span>${t.note ? `<small>${esc(t.note)}</small>` : ''}</div>`
  ).join('');
  return `<article class="name">
    <div class="num">${rec.id}</div>
    <div class="arabic">${rec.arabic}</div>
    <div class="translit">${esc(rec.translit)}</div>
    ${translations}
    <p class="tafsir">${esc(rec.tafsir)}</p>
    <p class="fact">${esc(rec.fact)}</p>
    ${rec.listNote ? `<p class="footnote">${esc(rec.listNote)}</p>` : ''}
  </article>`;
}

export function renderCard(el, rec, pair, id) {
  if (!rec) {
    el.innerHTML = `<article class="name empty">
      <div class="num">${id}</div>
      <p>Текст этого имени ещё в работе — в текущей версии заполнены девять.</p>
    </article>`;
    return;
  }
  if (pair) {
    const pairText = rec.pairText ?? pair.pairText ?? '';
    el.innerHTML = `<div class="diptych">${nameBlock(rec)}${nameBlock(pair)}</div>
      <p class="reconcile">${esc(pairText)}</p>`;
    return;
  }
  el.innerHTML = nameBlock(rec);
}
