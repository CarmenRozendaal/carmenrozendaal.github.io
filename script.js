// Mobile menu
const nav = document.querySelector('.nav');
const toggle = nav.querySelector('.nav__toggle');

toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', String(open));
});

nav.querySelectorAll('.nav__panel a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });
});

// Placeholder links (href="#") do nothing until a real URL is filled in
document.querySelectorAll('a[href="#"]').forEach((link) => {
  link.addEventListener('click', (event) => event.preventDefault());
});

// Compact sticky nav once the page scrolls
// On desktop, scrolling down hides logo + quick links (only the anchor menu stays).
// They only come back at the top of the page, so they never float over content.
const desktopNav = window.matchMedia('(min-width: 1081px)');
let lastScrollY = window.scrollY;
const onScroll = () => {
  const y = window.scrollY;
  nav.classList.toggle('is-scrolled', y > 8);
  if (!desktopNav.matches || y < 140) {
    nav.classList.remove('is-condensed', 'show-brand');
  } else if (y > lastScrollY + 4) {
    nav.classList.add('is-condensed');
  }
  if (Math.abs(y - lastScrollY) > 4) lastScrollY = y;
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Ervaring / Opleiding toggle: shows one table at a time (Ervaring by default)
const cvTitle = document.querySelector('[data-cv-title]');
const cvPanels = document.querySelectorAll('[data-cv-panel]');
const cvPills = document.querySelectorAll('[data-cv-toggle] .pill');
cvPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    cvPills.forEach((p) => {
      const current = p === pill;
      p.classList.toggle('pill--current', current);
      p.classList.toggle('pill--dim', !current);
      p.setAttribute('aria-pressed', String(current));
    });
    cvPanels.forEach((panel) => {
      panel.hidden = panel.dataset.cvPanel !== pill.dataset.value;
    });
    cvTitle.textContent = pill.textContent;
  });
});

// Remember whether the visitor last used the keyboard, so focus we move from
// script only shows the focus ring for keyboard users (not after a click or tap)
let usingKeyboard = false;
document.addEventListener('keydown', (event) => {
  usingKeyboard = true;
  if (event.key === 'Tab') document.documentElement.classList.add('kb-nav');
}, true);
document.addEventListener('pointerdown', () => {
  usingKeyboard = false;
  document.documentElement.classList.remove('kb-nav');
}, true);

function moveFocus(element) {
  element.classList.toggle('focus-quiet', !usingKeyboard);
  if (!usingKeyboard) {
    element.addEventListener('blur', () => element.classList.remove('focus-quiet'), { once: true });
  }
  element.focus({ preventScroll: true });
}

// Case overlays (modelled on the Paradiso event modal): "Bekijk proces" slides the
// case up from the bottom and puts its address in the URL, so the browser's back
// button, "Sluiten", the floating cross, Escape or a click on the dimmed page all
// slide it back down.
let openCase = null;
let caseTrigger = null;

function showCase(panel, trigger) {
  if (openCase === panel) return;
  openCase = panel;
  caseTrigger = trigger || null;
  panel.hidden = false;
  panel.querySelector('.case__scroller').scrollTop = 0;
  panel.classList.remove('is-scrolled');
  document.body.classList.add('has-case');
  panel.getBoundingClientRect(); // commit the start position before animating
  panel.classList.add('is-open');
  moveFocus(panel.querySelector('.case__close'));
}

function hideCase() {
  const panel = openCase;
  if (!panel) return;
  openCase = null;
  const drawer = panel.querySelector('.case__drawer');
  const scroller = panel.querySelector('.case__scroller');
  // Slide the sheet fully below the screen, also when it was scrolled up
  drawer.style.transform = `translateY(${scroller.scrollTop + window.innerHeight}px)`;
  panel.classList.remove('is-open');

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    panel.hidden = true;
    drawer.style.transform = '';
    document.body.classList.remove('has-case');
    if (caseTrigger) moveFocus(caseTrigger);
  };
  if (getComputedStyle(drawer).transitionDuration === '0s') return done();
  drawer.addEventListener('transitionend', (event) => {
    if (event.target === drawer && event.propertyName === 'transform') done();
  });
  setTimeout(done, 950); // fallback in case transitionend never fires
}

// URL handling: #case-<name> opens that case, so links can be shared and Back closes it
function openFromUrl(trigger) {
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target && target.classList.contains('case')) showCase(target, trigger);
  else hideCase();
}

function requestOpen(panel, trigger) {
  history.pushState({ case: panel.id }, '', `#${panel.id}`);
  showCase(panel, trigger);
}

function requestClose() {
  if (history.state && history.state.case) history.back(); // popstate closes it
  else {
    history.replaceState(null, '', location.pathname + location.search);
    hideCase();
  }
}

window.addEventListener('popstate', () => openFromUrl(caseTrigger));

document.querySelectorAll('[data-case]').forEach((button) => {
  const panel = document.querySelector(`[data-case-panel="${button.dataset.case}"]`);
  if (!panel) return;
  button.addEventListener('click', () => requestOpen(panel, button));
  // The project image opens the case too (the button stays the keyboard route)
  const image = button.closest('.project')?.querySelector('.project__img');
  if (image) {
    image.classList.add('project__img--link');
    image.addEventListener('click', () => requestOpen(panel, button));
  }
});

document.querySelectorAll('[data-case-panel]').forEach((panel) => {
  panel.querySelectorAll('[data-case-close]').forEach((button) => {
    button.addEventListener('click', requestClose);
  });
  const scroller = panel.querySelector('.case__scroller');
  scroller.addEventListener('click', (event) => {
    if (event.target === scroller) requestClose();
  });
  // The floating cross takes over exactly when the close button reaches its spot
  const coverClose = panel.querySelector('.case__close');
  const floatCross = panel.querySelector('.case__float');
  scroller.addEventListener('scroll', () => {
    const spot = parseFloat(getComputedStyle(floatCross).top) || 16;
    panel.classList.toggle('is-scrolled', coverClose.offsetParent && coverClose.getBoundingClientRect().top <= spot);
  }, { passive: true });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && openCase) requestClose();
});

// A shared link straight to a case opens it on load
if (location.hash.startsWith('#case-')) {
  const trigger = document.querySelector(`[data-case="${location.hash.slice(6)}"]`);
  openFromUrl(trigger);
}

// Client logos: duplicate the list once so the small-screen marquee can loop
// seamlessly (the copies are hidden on desktop and from screen readers)
const clientList = document.querySelector('.clients');
if (clientList) {
  [...clientList.children].forEach((item) => {
    const copy = item.cloneNode(true);
    copy.classList.add('client--clone');
    copy.setAttribute('aria-hidden', 'true');
    clientList.appendChild(copy);
  });
  // Measure the real distance from the first logo to its copy, so the marquee
  // moves exactly one set per loop and restarts without a visible jump
  const firstClone = clientList.querySelector('.client--clone');
  const setShift = () => {
    const shift = firstClone.offsetLeft - clientList.firstElementChild.offsetLeft;
    if (shift > 0) clientList.style.setProperty('--clients-shift', `-${shift}px`);
  };
  setShift();
  window.addEventListener('resize', setShift);
  window.addEventListener('load', setShift);
}

// Homepage photos: subtle parallax while scrolling. Each photo slides vertically
// inside its (clipping) frame, up to 6% of the frame height; the photo is shown at
// 114% (CSS) so no edge ever shows.
const parallaxFrames = [...document.querySelectorAll('.hero__main, .hero__side .crop, .step__img')];
const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setParallaxOrigins() {
  // Zoom around the centre of the visible frame (cropped photos are larger than their frame)
  parallaxFrames.forEach((frame) => {
    const img = frame.querySelector('img');
    img.style.transformOrigin = `${frame.clientWidth / 2 - img.offsetLeft}px ${frame.clientHeight / 2 - img.offsetTop}px`;
  });
}

let parallaxQueued = false;
function updateParallax() {
  parallaxQueued = false;
  if (calmMotion.matches) return;
  const vh = window.innerHeight;
  parallaxFrames.forEach((frame) => {
    const r = frame.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    const d = Math.max(-0.75, Math.min(0.75, (r.top + r.height / 2) / vh - 0.5));
    const img = frame.querySelector('img');
    // d: +0.75 when the frame enters at the bottom, -0.75 when it leaves at the top
    let py = -d * r.height * 0.08;
    if (frame.classList.contains('parallax--natural')) {
      // Hero photos: exactly the Figma crop at the top of the page, then slide down
      // slower than the page, within the photo's own room above the frame
      const roomDown = -img.offsetTop;
      py = Math.min(roomDown, window.scrollY * 0.08);
    }
    img.style.setProperty('--py', `${py.toFixed(1)}px`);
  });
}
function queueParallax() {
  if (!parallaxQueued) { parallaxQueued = true; requestAnimationFrame(updateParallax); }
}

parallaxFrames.forEach((frame) => {
  frame.classList.add('parallax');
  if (frame.matches('.hero__main, .hero__side .crop')) frame.classList.add('parallax--natural');
});
setParallaxOrigins();
updateParallax();
window.addEventListener('scroll', queueParallax, { passive: true });
window.addEventListener('resize', () => { setParallaxOrigins(); queueParallax(); });
window.addEventListener('load', () => { setParallaxOrigins(); updateParallax(); });

// Scroll reveal: blocks fade and slide in from below as they enter the screen.
// Blocks that appear together come in one after another (90ms apart).
const revealTargets = [...document.querySelectorAll([
  '.hero__content', '.hero__main', '.hero__side .crop', '.hero__cta', '.hero > .button',
  '.section-header', '.step', '.project', '.tiles-panel',
  '.cv .section-row', '.cv__panels .table__row',
  '.footer__main', '.footer__bottom',
].join(', '))].filter((el) => !el.closest('.case')); // not inside the case overlays

if (!calmMotion.matches) {
  document.documentElement.classList.add('js-reveal', 'reveal-ready');
  revealTargets.forEach((el) => el.classList.add('reveal'));

  const revealInView = () => {
    const limit = window.innerHeight * 0.92;
    // At the very bottom of the page, show whatever is left (e.g. the last footer line)
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    let order = 0;
    revealTargets.forEach((el) => {
      if (el.classList.contains('is-visible')) return;
      // The first screen (hero) always comes in when the site opens, also the floating CTA
      if (atBottom || el.closest('.hero') || el.getBoundingClientRect().top < limit) {
        el.style.setProperty('--reveal-delay', `${Math.min(order, 4) * 0.09}s`);
        el.classList.add('is-visible');
        order += 1;
      }
    });
  };
  // Wait one frame so the hidden start state is painted and the first blocks animate in
  requestAnimationFrame(() => requestAnimationFrame(revealInView));
  setTimeout(revealInView, 150); // fallback if animation frames are paused (background tab)
  window.addEventListener('scroll', revealInView, { passive: true });
  window.addEventListener('resize', revealInView);
}

// Anchor menu active state: the white indicator slides to the item of the section
// you are looking at (scroll spy), and straight to an item when it is clicked.
const menu = document.querySelector('.nav__menu');
const menuLinks = [...menu.querySelectorAll('.pill')];
const linkFor = (hash) => menuLinks.find((a) => a.getAttribute('href') === hash);
// Page sections in order, with their menu item (Intro = the top of the page).
// Klanten and toolbox stand on their own: no item is active there.
const spySections = [
  ['#werkwijze', '#werkwijze'], ['#projecten', '#projecten'], ['#klanten', null],
  ['#ervaring', '#ervaring'], ['#toolbox', null], ['#contact', '#contact'],
].map(([section, link]) => [document.querySelector(section), link && linkFor(link)]).filter(([s]) => s);

const indicator = document.createElement('span');
indicator.className = 'nav__indicator';
indicator.setAttribute('aria-hidden', 'true');
menu.prepend(indicator);
menu.classList.add('has-indicator');

let activeLink = null;
function setActive(link, instant = false) {
  if (link && link.offsetWidth === 0) link = null; // item hidden on this screen size (Contact on phones)
  // Coming back from "no item": place the indicator directly, then fade it in
  if (link && indicator.classList.contains('is-hidden')) instant = true;
  indicator.classList.toggle('is-hidden', !link);
  if (!link) {
    menuLinks.forEach((a) => { a.classList.remove('pill--active'); a.removeAttribute('aria-current'); });
    activeLink = null;
    return;
  }
  if (link !== activeLink) {
    menuLinks.forEach((a) => {
      const on = a === link;
      a.classList.toggle('pill--active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    activeLink = link;
  }
  if (instant) indicator.style.transition = 'opacity .3s ease';
  indicator.style.width = `${link.offsetWidth}px`;
  indicator.style.height = `${link.offsetHeight}px`;
  indicator.style.top = `${link.offsetTop}px`;
  indicator.style.transform = `translateX(${link.offsetLeft}px)`;
  if (instant) { indicator.getBoundingClientRect(); indicator.style.transition = ''; }
}

let spyPausedUntil = 0;
function spy() {
  if (performance.now() < spyPausedUntil) return;
  const line = window.innerHeight * 0.35;
  const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  let link = linkFor('#top');
  if (window.scrollY > 80) {
    spySections.forEach(([section, l]) => { if (section.getBoundingClientRect().top <= line) link = l; });
  }
  if (atBottom) link = linkFor('#contact');
  setActive(link);
}

window.addEventListener('scroll', spy, { passive: true });
window.addEventListener('resize', () => { if (activeLink) setActive(activeLink, true); else spy(); });
setActive(linkFor('#top'), true);
spy();
document.fonts && document.fonts.ready.then(() => activeLink && setActive(activeLink, true));

// Scroll animation for in-page links (anchor menu, logo, "Bekijk projecten",
// "Kennismaken?", "Back to top"): ease in, speed up, ease out. Longer distances
// take a little longer. Scrolling yourself (wheel, touch, keys) stops the animation.
document.documentElement.style.scrollBehavior = 'auto'; // the animation below replaces CSS smooth scrolling
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let scrollAnimation = null;

function stopScrollAnimation() {
  if (scrollAnimation) cancelAnimationFrame(scrollAnimation);
  scrollAnimation = null;
}
['wheel', 'touchstart', 'keydown'].forEach((type) => {
  window.addEventListener(type, stopScrollAnimation, { passive: true });
});

// getTarget() is asked again every frame, so the animation still lands exactly
// when the layout shifts while scrolling (e.g. the header getting more compact)
function animateScrollTo(getTarget, onDone) {
  stopScrollAnimation();
  const clampY = (y) => Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, y));
  const startY = window.scrollY;
  const distance = clampY(getTarget()) - startY;
  if (calmMotion.matches || Math.abs(distance) < 2) {
    window.scrollTo(0, clampY(getTarget()));
    if (onDone) onDone();
    return 0;
  }
  const duration = Math.min(1200, Math.max(600, 450 + Math.abs(distance) * 0.12));
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, startY + (clampY(getTarget()) - startY) * easeInOutCubic(t));
    if (t < 1) scrollAnimation = requestAnimationFrame(step);
    else { scrollAnimation = null; if (onDone) onDone(); }
  };
  scrollAnimation = requestAnimationFrame(step);
  return duration;
}

document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((link) => {
  if (link.closest('.case')) return; // case overlays have their own scrolling
  link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href');
    const target = hash === '#top' ? null : document.querySelector(hash);
    if (hash !== '#top' && !target) return;
    event.preventDefault();
    const margin = target ? parseFloat(getComputedStyle(target).scrollMarginTop) || 0 : 0;
    const targetY = () => (target ? target.getBoundingClientRect().top + window.scrollY - margin : 0);
    const menuLink = menuLinks.includes(link) ? link : linkFor(hash);
    if (menuLink) setActive(menuLink);
    const duration = animateScrollTo(targetY, () => { spyPausedUntil = 0; spy(); });
    spyPausedUntil = performance.now() + duration + 100; // indicator stays on the clicked item
    history.replaceState(null, '', hash === '#top' ? location.pathname + location.search : hash);
  });
});

// "Kennismaken?": floats at the bottom of the screen until its own spot in the photo
// scrolls into view, then lands there and scrolls along with the photo
const heroCta = document.querySelector('.hero__cta');
if (heroCta) {
  const heroSide = heroCta.parentElement;
  const phoneMenu = window.matchMedia('(max-width: 600px)');
  let ctaOffset = { left: 14, bottom: 12 };

  const readOffset = () => {
    heroCta.classList.remove('is-floating');
    heroCta.style.left = '';
    heroCta.style.bottom = '';
    const cs = getComputedStyle(heroCta);
    ctaOffset = { left: parseFloat(cs.left) || 0, bottom: parseFloat(cs.bottom) || 0 };
  };

  const placeCta = () => {
    // keep clear of the floating anchor menu at the bottom on phones
    const gap = phoneMenu.matches ? 80 : 24;
    const side = heroSide.getBoundingClientRect();
    const restingBottom = side.bottom - ctaOffset.bottom; // where it sits in the photo
    const floatLine = window.innerHeight - gap;
    if (restingBottom > floatLine) {
      heroCta.classList.add('is-floating');
      heroCta.style.left = `${side.left + ctaOffset.left}px`;
      heroCta.style.bottom = `${gap}px`;
    } else if (heroCta.classList.contains('is-floating')) {
      heroCta.classList.remove('is-floating');
      heroCta.style.left = '';
      heroCta.style.bottom = '';
    }
  };

  readOffset();
  placeCta();
  window.addEventListener('scroll', placeCta, { passive: true });
  window.addEventListener('resize', () => { readOffset(); placeCta(); });
}

// "Terug naar boven" in the case footers scrolls the case itself back to the top
document.querySelectorAll('[data-case-top]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const scroller = link.closest('.case__scroller');
    const startY = scroller.scrollTop;
    if (calmMotion.matches || startY < 2) { scroller.scrollTop = 0; return; }
    const duration = Math.min(1200, Math.max(600, 450 + startY * 0.12));
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      scroller.scrollTop = startY * (1 - easeInOutCubic(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
});

// Hero title: when the site opens, the words appear one by one from left to right,
// as if the sentence is being read out. Skipped when reduced motion is preferred.
const heroHeading = document.querySelector('.hero__title');
if (heroHeading && !calmMotion.matches) {
  const words = heroHeading.textContent.trim().split(/\s+/);
  heroHeading.setAttribute('aria-label', words.join(' '));
  heroHeading.textContent = '';
  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'hero__word';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', index);
    span.textContent = word;
    heroHeading.append(span, index < words.length - 1 ? ' ' : '');
  });
}

// Hero on larger screens: line up the intro text with the big title next to it by the
// letters themselves rather than their boxes: the tops of the capitals on the first
// lines and the baselines of the last lines. The intro column is narrowed to a fitting
// number of lines, its line height is nudged (1.35–1.7) to close the gap, and it is
// shifted down so the capitals start level. Of the widths that need the least
// nudging, the widest one wins.
const heroContent = document.querySelector('.hero__content');
const heroText = document.querySelector('.hero__text');
const heroTitle = document.querySelector('.hero__title');
const heroSideBySide = window.matchMedia('(min-width: 861px)');
const glyphCanvas = document.createElement('canvas').getContext('2d');
const glyphMetrics = (el) => {
  const cs = getComputedStyle(el);
  glyphCanvas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = glyphCanvas.measureText('H');
  return { ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent, cap: m.actualBoundingBoxAscent };
};
// Distance from the top of a line box to the top of its capitals
const capTop = (m, lineHeight) => (lineHeight - m.ascent - m.descent) / 2 + m.ascent - m.cap;
const fitHeroIntro = () => {
  heroText.style.removeProperty('line-height');
  heroText.style.removeProperty('margin-top');
  if (!heroSideBySide.matches) {
    heroContent.style.removeProperty('--hero-intro-w');
    return;
  }
  const fontSize = parseFloat(getComputedStyle(heroText).fontSize);
  const lineHeight = parseFloat(getComputedStyle(heroText).lineHeight);
  const titleLineHeight = parseFloat(getComputedStyle(heroTitle).lineHeight);
  const textGlyphs = glyphMetrics(heroText);
  const titleGlyphs = glyphMetrics(heroTitle);
  let best = null;
  for (let width = 380; width >= 220; width -= 5) {
    heroContent.style.setProperty('--hero-intro-w', `${width}px`);
    const lines = Math.round(heroText.offsetHeight / lineHeight);
    const titleLines = Math.round(heroTitle.offsetHeight / titleLineHeight);
    if (lines < 2) continue;
    // first capital top to last baseline must span the same distance on both sides
    const needed = ((titleLines - 1) * titleLineHeight + titleGlyphs.cap - textGlyphs.cap) / (lines - 1);
    const nudge = Math.abs(needed - lineHeight);
    if (!best || nudge < best.nudge - 0.25) best = { width, needed, nudge };
  }
  if (!best) return;
  heroContent.style.setProperty('--hero-intro-w', `${best.width}px`);
  const fitted = Math.min(fontSize * 1.7, Math.max(fontSize * 1.35, best.needed));
  heroText.style.lineHeight = `${fitted.toFixed(2)}px`;
  heroText.style.marginTop = `${(capTop(titleGlyphs, titleLineHeight) - capTop(textGlyphs, fitted)).toFixed(2)}px`;
};
let heroFitQueued = false;
const queueHeroFit = () => {
  if (heroFitQueued) return;
  heroFitQueued = true;
  setTimeout(() => { heroFitQueued = false; fitHeroIntro(); }, 100);
};
fitHeroIntro();
if (document.fonts) document.fonts.ready.then(fitHeroIntro);
window.addEventListener('resize', queueHeroFit);
