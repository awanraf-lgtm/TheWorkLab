import { prefersReducedMotion } from './env.js';

/**
 * Fades elements marked `data-reveal` into place as they enter the viewport.
 *
 * The hiding is done in CSS behind a `js-reveal` class that is only added when
 * this module runs and the effect is wanted. If scripts fail or the visitor
 * prefers reduced motion, nothing is ever hidden.
 *
 * @returns {() => void} cleanup function
 */
export function initReveal() {
  const noop = () => {};

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return noop;

  const elements = document.querySelectorAll('[data-reveal]');
  if (elements.length === 0) return noop;

  document.documentElement.classList.add('js-reveal');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((element) => observer.observe(element));

  return () => {
    observer.disconnect();
    document.documentElement.classList.remove('js-reveal');
  };
}
