/**
 * Shared environment checks.
 *
 * Every visual enhancement on this site is opt-in on capability, so these two
 * queries are asked for in one place rather than re-written in each module.
 */

/** Visitor has asked the OS to minimise animation. */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Device has a precise pointer (mouse/trackpad) that can hover. */
export const hasFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
