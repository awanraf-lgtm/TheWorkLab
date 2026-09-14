import { hasFinePointer, prefersReducedMotion } from './env.js';

/** Maximum rotation at the card's edge, in degrees. */
const MAX_TILT_DEG = 7;
/** How far the card lifts toward the viewer while hovered, in pixels. */
const LIFT_PX = 14;

/**
 * Tilts `[data-tilt]` cards toward the pointer and lifts them slightly.
 *
 * Each card keeps its own state in a closure and writes its transform at most
 * once per frame, so a pointer crossing several cards cannot queue up work.
 *
 * @returns {() => void} cleanup function
 */
export function initTilt() {
  const noop = () => {};

  if (!hasFinePointer() || prefersReducedMotion()) return noop;

  const cards = document.querySelectorAll('[data-tilt]');
  if (cards.length === 0) return noop;

  const teardowns = [];

  cards.forEach((card) => {
    let frame = null;
    let rotateX = 0;
    let rotateY = 0;
    let lift = 0;
    let settleTimer = null;

    const apply = () => {
      frame = null;
      card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(${lift.toFixed(1)}px)`;
    };

    const queue = () => {
      if (frame === null) frame = requestAnimationFrame(apply);
    };

    const onEnter = () => {
      // Ease in on entry, then drop the transform transition so the card
      // tracks the pointer without lag.
      card.style.transition =
        'transform .18s cubic-bezier(.2,.7,.2,1), box-shadow .3s ease, border-color .3s ease';
      lift = LIFT_PX;
      settleTimer = window.setTimeout(() => {
        card.style.transition = 'box-shadow .3s ease, border-color .3s ease';
      }, 190);
    };

    const onMove = (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      rotateY = px * MAX_TILT_DEG * 2;
      rotateX = -py * MAX_TILT_DEG * 2;
      lift = LIFT_PX;
      queue();
    };

    const onLeave = () => {
      card.style.transition =
        'transform .5s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease, border-color .3s ease';
      rotateX = 0;
      rotateY = 0;
      lift = 0;
      queue();
    };

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);

    teardowns.push(() => {
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
      if (frame !== null) cancelAnimationFrame(frame);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      card.style.transform = '';
      card.style.transition = '';
    });
  });

  return () => teardowns.forEach((teardown) => teardown());
}
