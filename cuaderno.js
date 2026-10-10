(() => {
  'use strict';
  const records = window.DARWIN_REGISTROS;
  const stops = window.DARWIN_STOPS || [];
  const grid = document.querySelector('#registros');
  const filters = document.querySelector('#filters');
  const dialog = document.querySelector('#record-dialog');
  const title = document.querySelector('#record-title');
  const mapLink = document.querySelector('#record-map-link');
  const categories = [...new Set(records.flatMap(r => r.categoria.split(' / ')))];
  let opener = null;
  const element = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  // zoomable: en el panel de lectura la ilustración se puede ampliar a pantalla completa.
  function illustration(record, zoomable = false) {
    const frame = element('div', 'record-visual');
    if (record.imagen) {
      const image = element('img');
      image.src = record.imagen;
      image.alt = 'Ilustración en cianotipo de ' + record.nombre;
      image.width = 440; image.height = 330;
      image.loading = 'lazy';
      image.addEventListener('error', () => frame.replaceChildren(placeholder()), {once:true});
      if (zoomable) {
        const button = element('button', 'zoomable');
        button.type = 'button'; button.dataset.lightbox = '';
        button.dataset.caption = 'REG. ' + record.id + ' · ' + record.nombre;
        button.setAttribute('aria-label', 'Ampliar la ilustración');
        const hint = element('span', 'zoom-hint', 'Ampliar ⤢'); hint.setAttribute('aria-hidden', 'true');
        button.append(image, hint); frame.append(button);
      } else frame.append(image);
    } else frame.append(placeholder());
    return frame;
  }
  function placeholder() {
    const box = element('div', 'record-placeholder');
    box.append(element('span', 'placeholder-cross', '+'), element('span', '', 'Ilustración pendiente'));
    box.firstChild.setAttribute('aria-hidden', 'true');
    return box;
  }
  function open(record, button) {
    opener = button;
    document.querySelector('#record-number').textContent = 'REG. ' + record.id;
    title.textContent = record.nombre;
    document.querySelector('#record-category').textContent = record.categoria;
    document.querySelector('#record-location').textContent = record.ubicacion;
    document.querySelector('#record-figure').replaceChildren(illustration(record, true));
    document.querySelector('#record-quote').textContent = '“' + record.cita + '”';
    document.querySelector('#record-observation').textContent = record.observacion;
    document.querySelector('#record-reference').textContent = record.referencia;
    const stop = stops.find(s => s.id === record.parada);
    mapLink.hidden = !record.parada;
    if (record.parada) {
      mapLink.href = 'index.html#' + record.parada;
      document.querySelector('#record-map-text').textContent = stop ? 'Ver en el mapa: ' + stop.label : 'Ver en el mapa';
    }
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('record-open');
    dialog.scrollTop = 0;
    history.replaceState(null, '', '#reg-' + record.id);
    title.focus({preventScroll:true});
  }
  function render(category) {
    grid.replaceChildren();
    const visible = records.filter(r => category === 'TODOS' || r.categoria.split(' / ').includes(category));
    for (const record of visible) {
      const item = element('li');
      const button = element('button', 'record-card');
      button.type = 'button';
      button.dataset.record = record.id;
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', 'record-dialog');
      button.setAttribute('aria-label', 'Abrir REG. ' + record.id + ' · ' + record.nombre);
      // La primera ficha visible va destacada, a doble ancho, con la cita de Darwin.
      const featured = record === visible[0];
      if (featured) item.className = 'featured';
      const media = element('div', 'record-media');
      media.append(illustration(record), element('span', 'record-tag', record.categoria), element('span', 'record-num', 'REG. ' + record.id));
      const copy = element('div', 'record-card-copy');
      copy.append(element('h2', '', record.nombre), element('p', 'record-location', record.ubicacion), element('p', 'record-summary', record.resumen));
      if (featured) copy.append(element('p', 'record-card-quote', '“' + record.cita + '”'));
      copy.append(element('span', 'record-read', 'Leer ficha ↗'));
      button.append(media, copy);
      button.addEventListener('click', () => open(record, button));
      item.append(button); grid.append(item);
    }
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.category === category));
    document.querySelector('#result-count').textContent = visible.length + ' de ' + records.length + ' registros';
    if (window.darwinReveal) window.darwinReveal(grid.children);
  }
  for (const category of ['TODOS', ...categories]) {
    const button = element('button', 'filter', category);
    button.type = 'button'; button.dataset.category = category;
    button.addEventListener('click', () => render(category));
    filters.append(button);
  }
  document.querySelector('#record-close').addEventListener('click', () => dialog.close());
  // Require both press and release outside, so dragging text does not close the panel.
  let outsidePress = false;
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener('pointerdown', event => { outsidePress = outside(event); });
  dialog.addEventListener('click', event => { if (outsidePress && outside(event)) dialog.close(); outsidePress = false; });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('record-open');
    history.replaceState(null, '', location.pathname + location.search);
    opener?.focus({preventScroll:true});
  });
  render('TODOS');

  // Llegada desde el mapa: #reg-06 abre una ficha; #cat-FAUNA aplica un filtro.
  const readHash = () => {
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash.startsWith('reg-')) {
      const record = records.find(r => r.id === hash.slice(4));
      if (!record) return;
      const button = grid.querySelector('[data-record="' + record.id + '"]');
      button?.scrollIntoView({block: 'center'});
      open(record, button);
    } else if (hash.startsWith('cat-') && categories.includes(hash.slice(4))) {
      render(hash.slice(4));
      document.querySelector('.notebook-controls').scrollIntoView({block: 'start'});
    }
  };
  window.addEventListener('hashchange', readHash); readHash();
})();
