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
})();
