import { hasFinePointer, prefersReducedMotion } from './env.js';

/** How much of the gap the ring closes per frame — lower trails further. */
const RING_EASING = 0.18;
const SCALE_EASING = 0.14;

/** Ring size over a card, a link, and at rest. */
const SCALE_CARD = 2.2;
const SCALE_LINK = 1.6;
const SCALE_IDLE = 1;

/**
 * Replaces the pointer with a copper dot and a ring that lags behind it and
 * grows over interactive elements.
 *
 * Skipped entirely on touch devices and under reduced motion, so the native
 * cursor is only ever hidden once this has taken over.
 *
 * @returns {() => void} cleanup function
 */
export function initCursor() {
  const noop = () => {};

  if (!hasFinePointer() || prefersReducedMotion()) return noop;

  const dot = document.querySelector('[data-cursor-dot]');
  const ring = document.querySelector('[data-cursor-ring]');
  if (!dot || !ring) return noop;

  document.documentElement.setAttribute('data-cursor', 'on');

  let pointerX = 0;
  let pointerY = 0;
  let ringX = 0;
  let ringY = 0;
  let scale = SCALE_IDLE;
  let targetScale = SCALE_IDLE;
  let hasMoved = false;
  let frame = null;

  const place = (element, x, y, s) => {
    element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
  };

  const setLive = (live) => {
    dot.dataset.live = live ? '1' : '0';
    ring.dataset.live = live ? '1' : '0';
  };

  const onPointerMove = (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;

    // On the first move, drop the ring at the pointer instead of letting it
    // fly in from the top-left corner.
    if (!hasMoved) {
      hasMoved = true;
      ringX = pointerX;
      ringY = pointerY;
      setLive(true);
    }

    const target =
      event.target instanceof Element ? event.target.closest('a, button, [data-tilt]') : null;
    const kind = !target ? '' : target.hasAttribute('data-tilt') ? 'card' : 'link';

    if (ring.dataset.on !== kind) ring.dataset.on = kind;
    targetScale = kind === 'card' ? SCALE_CARD : kind === 'link' ? SCALE_LINK : SCALE_IDLE;
  };

  const onPointerDown = () => {
    targetScale *= 0.72;
  };

  const hide = () => setLive(false);
  const show = () => {
    if (hasMoved) setLive(true);
  };

  const loop = () => {
    ringX += (pointerX - ringX) * RING_EASING;
    ringY += (pointerY - ringY) * RING_EASING;
    scale += (targetScale - scale) * SCALE_EASING;

    place(dot, pointerX, pointerY, SCALE_IDLE);
    place(ring, ringX, ringY, scale);

    frame = requestAnimationFrame(loop);
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('mouseleave', hide);
  document.addEventListener('mouseenter', show);
  window.addEventListener('blur', hide);

  loop();

  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('mouseleave', hide);
    document.removeEventListener('mouseenter', show);
    window.removeEventListener('blur', hide);
    if (frame) cancelAnimationFrame(frame);
    document.documentElement.removeAttribute('data-cursor');
  };
}
