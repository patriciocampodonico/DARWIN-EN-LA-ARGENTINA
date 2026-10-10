(() => {
  'use strict';
  const stops = window.DARWIN_STOPS;
  const records = window.DARWIN_REGISTROS || [];
  const scene = document.querySelector('#mapa');
  const zoom = document.querySelector('.scene-zoom');
  const route = document.querySelector('#route');
  const markers = document.querySelector('#markers');
  const timeline = document.querySelector('#timeline');
  const card = document.querySelector('#card');
  const title = document.querySelector('#card-title');
  const body = document.querySelector('#card-body');
  const image = document.querySelector('#card-image');
  const prev = document.querySelector('#card-prev');
  const next = document.querySelector('#card-next');
  const mobile = matchMedia('(max-width:899px)');
  const SVG = 'http://www.w3.org/2000/svg';
  let active = null;

  // Fecha breve de cada parada para la línea de tiempo (la fecha completa está en stops.js).
  const WHEN = {
    'tierra-del-fuego': 'Dic. 1832', 'rio-negro': 'Ago. 1833', 'rio-colorado': 'Ago. 1833',
    'bahia-blanca': '1832 · 1833', 'sierra-de-la-ventana': 'Sep. 1833', 'buenos-aires': 'Sep. 1833',
    'santa-fe': 'Sep.–Oct. 1833', 'puerto-deseado': 'Dic. 1833', 'san-julian': 'Ene.–Abr. 1834'
  };
  // Etiquetas de «Qué observó» que tienen ficha propia en el Cuaderno de campo.
  const TAG_LINKS = {
    'rio-negro': {'Salinas': 'reg-11', 'Flamencos': 'reg-06', 'Cristales de yeso': 'reg-11'},
    'bahia-blanca': {'Fósiles': 'cat-FÓSILES', 'Mamíferos gigantes': 'reg-01'},
    'sierra-de-la-ventana': {'Sierra de la Ventana': 'reg-13'},
    'puerto-deseado': {'Guanacos': 'reg-09'}
  };
  // Tramos de la ruta, en el orden de las fichas. Los de mar se curvan hacia el Atlántico.
  // Trazado esquemático: une las paradas, no reproduce la derrota real.
  const LEGS = [
    {from: 0, to: 1, sea: true, bend: [870, 705]},
    {from: 1, to: 2}, {from: 2, to: 3}, {from: 3, to: 4}, {from: 4, to: 5}, {from: 5, to: 6},
    {from: 5, to: 7, sea: true, bend: [930, 560]},
    {from: 7, to: 8, sea: true, bend: [742, 716]}
  ];

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svg = (tag, attrs) => {
    const node = document.createElementNS(SVG, tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    return node;
  };

  // Marcadores del mapa.
  for (const stop of stops) {
    const button = el('button', 'marker');
    button.type = 'button'; button.id = 'point-' + stop.id;
    button.dataset.stop = stop.id;
    button.setAttribute('aria-label', 'Explorar ' + stop.label);
    button.setAttribute('aria-controls', 'card'); button.setAttribute('aria-expanded', 'false');
    for (const key of ['x','y','lx','ly']) button.style.setProperty('--'+key, stop[key]);
    button.style.setProperty('--order', stops.indexOf(stop));
    const icon = el('span', 'marker-icon'); icon.setAttribute('aria-hidden', 'true');
    button.append(icon, el('span', 'marker-label', stop.label));
    button.addEventListener('click', () => open(stop.id));
    markers.append(button);
  }

  // Ruta sobre el mapa: cada tramo se revela con una máscara que se dibuja.
  const defs = svg('defs', {});
  route.append(defs);
  LEGS.forEach((leg, i) => {
    const a = stops[leg.from], b = stops[leg.to];
    const bend = leg.bend || [(a.x + b.x) / 2 + (b.y - a.y) * 0.08, (a.y + b.y) / 2 - (b.x - a.x) * 0.08];
    const d = `M${a.x} ${a.y} Q${bend[0]} ${bend[1]} ${b.x} ${b.y}`;
    const mask = svg('mask', {id: 'leg-mask-' + i, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1440, height: 888});
    const draw = svg('path', {d, pathLength: 1, class: 'route-draw'});
    draw.style.setProperty('--i', i);
    mask.append(draw); defs.append(mask);
    const group = svg('g', {mask: `url(#leg-mask-${i})`, class: 'route-leg' + (leg.sea ? ' sea' : ''), 'data-to': leg.to});
    group.append(svg('path', {d, class: 'route-halo'}), svg('path', {d, class: 'route-line'}));
    route.append(group);
  });
  const fitRoute = () => route.setAttribute('viewBox', mobile.matches ? '430 94 700 794' : '0 0 1440 888');
  mobile.addEventListener('change', fitRoute); fitRoute();
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      scene.classList.add('in-view'); seen.disconnect();
    }, {threshold: 0.35});
    seen.observe(scene);
  } else scene.classList.add('in-view');

  // Línea de recorrido de la portada, como en la tapa del libro: una marca por parada.
  const coverRoute = document.querySelector('#cover-route');
  if (coverRoute) {
    const ys = [6, 5.1, 3.4, 3, 4.6, 5.5, 3.6, 2.4, 4.4];
    const pts = ys.map((y, i) => [2 + i * 23, y]);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
    }
    coverRoute.append(svg('path', {d}));
    for (const [cx, cy] of pts) coverRoute.append(svg('ellipse', {cx, cy, rx: 0.42, ry: 0.55}));
  }

  // Línea de tiempo.
  stops.forEach((stop, i) => {
    const item = el('li');
    const button = el('button', 'timeline-stop');
    button.type = 'button'; button.dataset.stop = stop.id;
    button.setAttribute('aria-controls', 'card');
    button.append(el('span', 'timeline-number', String(i + 1).padStart(2, '0')), el('span', 'timeline-dot'), el('span', 'timeline-when', WHEN[stop.id] || ''), el('span', 'timeline-name', stop.label));
    button.addEventListener('click', () => { open(stop.id); if (!mobile.matches) scene.scrollIntoView({block: 'start', behavior: 'smooth'}); });
    item.append(button); timeline.append(item);
  });

  function focusMap(stop) {
    if (!stop) { zoom.classList.remove('zoomed'); return; }
    const x = mobile.matches ? (stop.x - 430) / 700 : stop.x / 1440;
    const y = mobile.matches ? (stop.y - 94) / 794 : stop.y / 888;
    zoom.style.transformOrigin = `${x * 100}% ${y * 100}%`;
    zoom.classList.add('zoomed');
  }

  function open(id, updateHash = true) {
    const stop = stops.find(s => s.id === id); if (!stop) return;
    const index = stops.indexOf(stop);
    active = stop.id;
    for (const button of markers.children) button.setAttribute('aria-expanded', String(button.dataset.stop === id));
    for (const button of timeline.querySelectorAll('button')) {
      const current = button.dataset.stop === id;
      button.classList.toggle('current', current);
      if (current) { button.setAttribute('aria-current', 'step'); timeline.scrollTo({left: button.offsetLeft - timeline.clientWidth / 2 + button.offsetWidth / 2, behavior: 'smooth'}); }
      else button.removeAttribute('aria-current');
    }
    for (const leg of route.querySelectorAll('.route-leg')) leg.classList.toggle('done', Number(leg.dataset.to) <= index);
    title.textContent = stop.title;
    document.querySelector('#card-date').textContent = stop.date;
    document.querySelector('#card-location').textContent = stop.location;
    document.querySelector('#card-index').textContent = 'FICHA ' + String(index+1).padStart(2,'0') + ' / ' + String(stops.length).padStart(2,'0');
    body.replaceChildren();
    const section = (name) => body.append(el('h3', '', name));
    section('Relato');
    for (const paragraph of stop.story) body.append(el('p', '', paragraph));
    section('Qué observó');
    const tags = el('ul', 'observation-tags');
    const links = TAG_LINKS[stop.id] || {};
    for (const observation of stop.observations) {
      const li = el('li');
      if (links[observation]) {
        const link = el('a', '', observation + ' ↗');
        link.href = 'cuaderno.html#' + links[observation];
        link.title = 'Abrir en el Cuaderno de campo';
        li.append(link);
      } else li.textContent = observation;
      tags.append(li);
    }
    body.append(tags);
    section('Dato destacado');
    body.append(el('p', 'highlight', stop.fact));
    const related = records.filter(record => record.parada === stop.id);
    if (related.length) {
      section('En el Cuaderno de campo');
      const list = el('ul', 'related-records');
      for (const record of related) {
        const link = el('a');
        link.href = 'cuaderno.html#reg-' + record.id;
        if (record.imagen) { const thumb = el('img'); thumb.src = record.imagen; thumb.alt = ''; thumb.loading = 'lazy'; thumb.width = 56; thumb.height = 42; link.append(thumb); }
        const text = el('span');
        text.append(el('small', '', 'REG. ' + record.id + ' · ' + record.categoria), el('b', '', record.nombre));
        link.append(text, el('i', '', '↗'));
        const li = el('li'); li.append(link); list.append(li);
      }
      body.append(list);
    }
    document.querySelector('#card-source').textContent = stop.source + '.';
    document.querySelector('#card-map-note').textContent = stop.mapNote;
    card.querySelector('details').open = false;
    image.src = 'assets/' + stop.image; image.alt = 'Ilustración en cianotipo de ' + stop.label;
    const before = stops[index - 1], after = stops[index + 1];
    prev.disabled = !before; next.disabled = !after;
    prev.querySelector('b').textContent = before ? before.label : 'Inicio del recorrido';
    next.querySelector('b').textContent = after ? after.label : 'Fin del recorrido';
    const wasHidden = card.hidden;
    card.hidden = false; card.querySelector('.card-scroll').scrollTop = 0;
    if (!wasHidden) { card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap'); }
    document.body.classList.add('card-open');
    focusMap(stop);
    if (updateHash) history.replaceState(null, '', '#' + stop.id);
    document.querySelector('#announcement').textContent = 'Tarjeta abierta: ' + stop.label;
    title.focus({preventScroll:true});
  }
  function close(restoreFocus = true) {
    const last = active; active = null; card.hidden = true; card.classList.remove('swap');
    document.body.classList.remove('card-open');
    for (const button of markers.children) button.setAttribute('aria-expanded','false');
    for (const button of timeline.querySelectorAll('button')) { button.classList.remove('current'); button.removeAttribute('aria-current'); }
    for (const leg of route.querySelectorAll('.route-leg')) leg.classList.remove('done');
    focusMap(null);
    history.replaceState(null, '', location.pathname + location.search);
    document.querySelector('#announcement').textContent = 'Tarjeta cerrada';
    if (restoreFocus && last) document.querySelector('#point-' + last).focus({preventScroll: true});
  }
  const step = delta => { const target = stops[stops.findIndex(s => s.id === active) + delta]; if (target) open(target.id); };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  document.querySelector('#close-card').addEventListener('click', () => close());
  document.addEventListener('click', event => {
    if (!active || card.contains(event.target) || event.target.closest('.marker, .timeline, dialog')) return;
    close(false);
  });
  document.addEventListener('keydown', event => {
    if (!active || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'ArrowLeft') step(-1);
  });

  // En pantallas angostas la tarjeta es un panel inferior: se cierra arrastrándola hacia abajo.
  const toolbar = card.querySelector('.card-toolbar');
  let dragStart = null;
  toolbar.addEventListener('touchstart', event => { if (mobile.matches) dragStart = event.touches[0].clientY; }, {passive: true});
  toolbar.addEventListener('touchmove', event => {
    if (dragStart === null) return;
    card.style.transform = `translateY(${Math.max(0, event.touches[0].clientY - dragStart)}px)`;
  }, {passive: true});
  toolbar.addEventListener('touchend', event => {
    if (dragStart === null) return;
    const moved = event.changedTouches[0].clientY - dragStart;
    dragStart = null; card.style.transform = '';
    if (moved > 90) close(false);
  });

  const toMap = () => scene.scrollIntoView({block:'start'});
  document.querySelector('.explore').addEventListener('click', event => { event.stopPropagation(); toMap(); open(stops[0].id); });
  document.querySelector('.cover-start').addEventListener('click', event => { event.preventDefault(); scene.scrollIntoView({block:'start', behavior:'smooth'}); scene.focus({preventScroll:true}); });
  document.querySelector('.brand').addEventListener('click', event => {event.preventDefault();close(false);window.scrollTo({top:0});});
  const resize = new ResizeObserver(([entry]) => document.querySelector('.site').style.setProperty('--marker-scale', entry.contentRect.width/1440));
  resize.observe(document.querySelector('.site'));
  const readHash = () => {
    const id = location.hash.slice(1);
    if (stops.some(s => s.id === id)) { open(id, false); toMap(); }
    else if (id === 'mapa') toMap();
    else if (active) close(false);
  };
  window.addEventListener('hashchange',readHash);readHash();
})();
