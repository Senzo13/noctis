/* Materials and horizontal chapters driven by vertical scroll on desktop. */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion = () => reduced.matches ? 'instant' : 'smooth';
  const materialSection = document.querySelector('.materials');
  if (materialSection) {
    const picker = materialSection.querySelector('.material-picker');
    const tabs = [...picker.querySelectorAll('[role="tab"]')];
    const panels = [...materialSection.querySelectorAll('.material')];
    const list = materialSection.querySelector('.materials__list');
    list.setAttribute('role', 'presentation');
    const select = (index, focus) => {
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
        panels[i].classList.toggle('is-entering', i === index);
      });
      if (focus) tabs[index].focus({ preventScroll: true });
      const tab = tabs[index];
      const left = tab.offsetLeft - picker.offsetLeft;
      if (left < picker.scrollLeft || left + tab.offsetWidth > picker.scrollLeft + picker.clientWidth) {
        picker.scrollTo({ left: left - 10, behavior: motion() });
      }
    };
    panels.forEach((panel, i) => {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabs[i].id);
      tabs[i].addEventListener('click', () => select(i, false));
      tabs[i].addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); select(next, true); }
      });
    });
    materialSection.classList.add('is-enhanced');
    picker.hidden = false;
    select(0, false);
  }

  document.querySelectorAll('[data-carousel]').forEach(section => {
    const rail = section.querySelector('[data-carousel-rail], .rail');
    const cards = [...rail.children];
    const previous = section.querySelector('[data-carousel-prev]');
    const next = section.querySelector('[data-carousel-next]');
    const counter = section.querySelector('[data-carousel-count]');
    let index = 0;
    let scheduled = false;
    let pinned = null;
    const positions = () => cards.map(card => card.offsetLeft - cards[0].offsetLeft);
    const update = () => {
      scheduled = false;
      if (pinned) {
        const offset = -Number(window.gsap.getProperty(rail, 'x'));
        index = cards.reduce((best, card, i) => Math.abs(card.offsetLeft - offset) < Math.abs(cards[best].offsetLeft - offset) ? i : best, 0);
        previous.disabled = pinned.progress <= .001;
        next.disabled = pinned.progress >= .999;
        if (next.disabled) index = cards.length - 1;
        counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
        return;
      }
      const points = positions();
      index = points.reduce((best, point, i) => Math.abs(point - rail.scrollLeft) < Math.abs(points[best] - rail.scrollLeft) ? i : best, 0);
      const atEnd = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 3;
      if (atEnd) index = cards.length - 1;
      previous.disabled = rail.scrollLeft <= 3;
      next.disabled = atEnd;
      counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    };
    const move = delta => {
      if (!pinned) {
        rail.scrollTo({ left: rail.scrollLeft + delta * (positions()[1] || rail.clientWidth), behavior: motion() });
        return;
      }
      const offset = -Number(window.gsap.getProperty(rail, 'x'));
      const max = rail.scrollWidth - rail.parentElement.clientWidth;
      const stops = [0, ...cards.map(card => Math.min(max, card.offsetLeft)), max];
      const target = delta > 0 ? stops.find(x => x > offset + 8) ?? max : stops.findLast(x => x < offset - 8) ?? 0;
      const y = pinned.start + target / max * (pinned.end - pinned.start);
      if (window.__noctisLenis) window.__noctisLenis.scrollTo(y, { duration: .8 });
      else window.scrollTo({ top: y, behavior: motion() });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    rail.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
    });
    rail.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }, { passive: true });
    new ResizeObserver(update).observe(rail);
    update();

    if (window.gsap && window.ScrollTrigger) {
      window.gsap.matchMedia().add('(min-width: 1001px) and (min-height: 601px) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        if (document.documentElement.classList.contains('is-simple')) return;
        const heading = section.querySelector('.section-heading, .ordinary__head');
        const controls = section.querySelector('.craft-controls, .collection-controls');
        const moved = [heading, rail, controls].map(element => {
          const marker = document.createComment('Horizontal chapter: original position');
          element.before(marker);
          return { element, marker };
        });
        const stage = document.createElement('div');
        stage.className = 'horizontal-stage';
        const viewport = document.createElement('div');
        viewport.className = 'horizontal-viewport';
        stage.append(viewport, controls);
        viewport.append(rail);
        rail.prepend(heading);
        rail.scrollLeft = 0;
        section.prepend(stage);
        section.classList.add('is-scroll-pinned');
        const distance = () => Math.max(1, rail.scrollWidth - viewport.clientWidth);
        const tween = window.gsap.to(rail, {
          x: () => -distance(), ease: 'none',
          scrollTrigger: {
            id: `horizontal-${section.id}`, trigger: section, pin: true,
            start: 'top top', end: () => `+=${Math.round(distance() * 1.15)}`,
            scrub: .45, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: update, onRefresh: update
          }
        });
        pinned = tween.scrollTrigger;
        update();
        return () => {
          pinned = null;
          tween.scrollTrigger?.kill(true);
          tween.kill();
          window.gsap.set(rail, { clearProps: 'transform' });
          moved.forEach(({ element, marker }) => marker.replaceWith(element));
          stage.remove();
          section.classList.remove('is-scroll-pinned');
          rail.scrollLeft = 0;
          update();
        };
      });
    }
  });

  if (window.ScrollTrigger) {
    document.fonts.ready.then(() => window.ScrollTrigger.refresh());
    window.addEventListener('load', () => window.ScrollTrigger.refresh(), { once: true });
  }

  // Same-page anchors retain native URLs while cooperating with desktop Lenis.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    link.addEventListener('click', event => {
      const target = document.getElementById(href.slice(1));
      if (!target || !window.__noctisLenis) return;
      event.preventDefault();
      history.pushState(null, '', href);
      window.__noctisLenis.scrollTo(target, { offset: -72, duration: 1.1 });
    });
  });
})();
