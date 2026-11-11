// Comportamientos compartidos por las tres páginas: menú en pantallas angostas,
// ampliación de ilustraciones y aparición de elementos al hacer scroll.
(() => {
  'use strict';

  // Menú desplegable (solo visible en pantallas angostas).
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#site-nav');
  if (toggle && nav) {
    const set = open => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      nav.classList.toggle('open', open);
    };
    toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', event => { if (event.target.closest('a')) set(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') set(false); });
  }

  // Ampliación de ilustraciones a pantalla completa.
  const lightbox = document.createElement('dialog');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('aria-label', 'Ilustración ampliada');
  const figure = document.createElement('figure');
  const picture = document.createElement('img');
  const caption = document.createElement('figcaption');
  const shut = document.createElement('button');
  shut.type = 'button'; shut.className = 'lightbox-close'; shut.textContent = '×';
  shut.setAttribute('aria-label', 'Cerrar ilustración ampliada');
  figure.append(picture, caption); lightbox.append(shut, figure); document.body.append(lightbox);
  shut.addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => { if (event.target !== picture) lightbox.close(); });
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-lightbox]');
    if (!trigger) return;
    const source = trigger.querySelector('img');
    if (!source || !source.getAttribute('src')) return;
    picture.src = source.src; picture.alt = source.alt;
    caption.textContent = trigger.dataset.caption || source.alt;
    lightbox.showModal();
  });

  // Aparición al hacer scroll. Sin soporte o con movimiento reducido, todo queda visible.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = !still && 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, {rootMargin: '0px 0px -8% 0px', threshold: 0.08}) : null;
  window.darwinReveal = (elements, step = 70) => {
    let order = 0;
    for (const el of elements) {
      if (!observer) continue;
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', (order++ % 6) * step + 'ms');
      observer.observe(el);
    }
  };
  window.darwinReveal(document.querySelectorAll('.timeline, .map-legend, .footer > section, .about-row, .editorial-piece, .about-opening'), 0);

  // Aviso breve al pie de la pantalla (por ejemplo, «Link copiado»).
  const toast = document.createElement('p');
  toast.className = 'toast'; toast.setAttribute('role', 'status');
  document.body.append(toast);
  let toastTimer = null;
  const notify = text => {
    toast.textContent = text; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  };

  // Compartir: el menú del sistema en el celular; en la computadora, copia el link.
  window.darwinShare = async ({title, text, url}) => {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({title, text, url}); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); notify('Link copiado'); }
    catch { window.prompt('Copiá este link:', url); }
  };

  // Buscador de paradas y fichas, en las tres páginas.
  const searchButton = document.querySelector('.header .search');
  const stops = window.DARWIN_STOPS || [];
  const records = window.DARWIN_REGISTROS || [];
  if (!searchButton || !(stops.length || records.length)) return;
  const fold = value => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const page = document.querySelector('#mapa') ? 'index.html' : document.querySelector('#registros') ? 'cuaderno.html' : '';
  const entries = [
    ...stops.map((stop, i) => ({
      group: 'Paradas del mapa', page: 'index.html', hash: stop.id,
      kicker: 'PARADA ' + String(i + 1).padStart(2, '0') + ' · ' + stop.date, name: stop.label, image: 'assets/' + stop.image,
      title: fold(stop.label + ' ' + stop.title), body: [stop.location + '.', ...stop.story, stop.observations.join(', ') + '.', stop.fact].join(' ')
    })),
    ...records.map(record => ({
      group: 'Cuaderno de campo', page: 'cuaderno.html', hash: 'reg-' + record.id,
      kicker: 'REG. ' + record.id + ' · ' + record.categoria, name: record.nombre, image: record.imagen,
      title: fold(record.nombre + ' ' + record.categoria), body: [record.ubicacion + '.', record.resumen, record.cita, record.observacion].join(' ')
    }))
  ].map(entry => ({...entry, folded: fold(entry.body)}));

  const panel = document.createElement('dialog');
  panel.className = 'search-dialog'; panel.setAttribute('aria-label', 'Buscar');
  panel.innerHTML = '<form method="dialog" class="search-box" role="search"><img src="assets/icono-buscar.png" alt="" width="20" height="20">' +
    '<input type="search" placeholder="Buscar paradas, animales, fósiles…" aria-label="Buscar paradas y fichas" autocomplete="off" spellcheck="false">' +
    '<button type="button" class="search-close" aria-label="Cerrar búsqueda">×</button></form>' +
    '<p class="search-count" aria-live="polite"></p><div class="search-results"></div>';
  document.body.append(panel);
  const input = panel.querySelector('input');
  const results = panel.querySelector('.search-results');
  const count = panel.querySelector('.search-count');

  // Fragmento del texto alrededor de la primera coincidencia, con la palabra resaltada.
  // Quitar los acentos no cambia el largo del texto, así que las posiciones coinciden.
  const snippet = (entry, words) => {
    const line = document.createElement('span'); line.className = 'search-snippet';
    const word = words.find(w => entry.folded.includes(w));
    if (!word) { line.textContent = entry.body.slice(0, 110) + '…'; return line; }
    const at = entry.folded.indexOf(word);
    const from = at > 50 ? entry.body.lastIndexOf(' ', at - 50) + 1 : 0;
    const to = Math.min(entry.body.length, at + word.length + 70);
    const mark = document.createElement('mark'); mark.textContent = entry.body.slice(at, at + word.length);
    line.append((from > 0 ? '…' : '') + entry.body.slice(from, at), mark, entry.body.slice(at + word.length, to) + (to < entry.body.length ? '…' : ''));
    return line;
  };
  const render = () => {
    const words = fold(input.value).split(/\s+/).filter(w => w.length > 1);
    const found = !words.length ? entries : entries
      .filter(entry => words.every(w => entry.title.includes(w) || entry.folded.includes(w)))
      .sort((a, b) => words.filter(w => b.title.includes(w)).length - words.filter(w => a.title.includes(w)).length);
    results.replaceChildren();
    count.textContent = !words.length ? 'Todas las paradas y fichas' : found.length ? found.length + (found.length === 1 ? ' resultado' : ' resultados') : 'Sin resultados para «' + input.value.trim() + '»';
    for (const group of ['Paradas del mapa', 'Cuaderno de campo']) {
      const items = found.filter(entry => entry.group === group);
      if (!items.length) continue;
      const heading = document.createElement('h2'); heading.textContent = group;
      const list = document.createElement('ul');
      for (const entry of items) {
        const link = document.createElement('a');
        link.href = entry.page + '#' + entry.hash; link.dataset.page = entry.page; link.dataset.hash = entry.hash;
        const thumb = document.createElement('img'); thumb.src = entry.image; thumb.alt = ''; thumb.loading = 'lazy'; thumb.width = 64; thumb.height = 48;
        const text = document.createElement('span');
        const kicker = document.createElement('small'); kicker.textContent = entry.kicker;
        const name = document.createElement('b'); name.textContent = entry.name;
        text.append(kicker, name);
        if (words.length) text.append(snippet(entry, words));
        link.append(thumb, text);
        const item = document.createElement('li'); item.append(link); list.append(item);
      }
      results.append(heading, list);
    }
  };
  // En la misma página no se recarga: se cambia el ancla y cada página abre su tarjeta o ficha.
  results.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || link.dataset.page !== page) return;
    event.preventDefault(); panel.close();
    if (location.hash === '#' + link.dataset.hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
    else location.hash = link.dataset.hash;
  });
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); results.querySelector('a')?.click(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); results.querySelector('a')?.focus(); }
  });
  results.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const links = [...results.querySelectorAll('a')], at = links.indexOf(document.activeElement);
    event.preventDefault();
    if (event.key === 'ArrowUp' && at <= 0) input.focus();
    else links[Math.min(links.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1))]?.focus();
  });
  panel.querySelector('.search-close').addEventListener('click', () => panel.close());
  panel.addEventListener('click', event => { if (event.target === panel) panel.close(); });
  panel.addEventListener('close', () => document.body.classList.remove('search-open'));
  const openSearch = () => {
    if (panel.open) return;
    if (toggle?.getAttribute('aria-expanded') === 'true') toggle.click();
    render(); panel.showModal(); document.body.classList.add('search-open');
    input.focus(); input.select();
  };
  searchButton.addEventListener('click', openSearch);
  document.addEventListener('keydown', event => {
    const typing = event.target.closest?.('input, textarea, [contenteditable]');
    if ((event.key === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !typing)) {
      if (document.querySelector('dialog[open]:not(.search-dialog)')) return;
      event.preventDefault(); openSearch();
    }
  });
})();
