/**
 * Application entry point.
 *
 * Everything below is a progressive enhancement: the page is complete and
 * readable with this file absent or failing. Each module decides for itself
 * whether it should run and returns a cleanup function.
 */

import './styles/main.css';

import { applyBookingLinks } from './config.js';
import { initReveal } from './scripts/reveal.js';
import { initCursor } from './scripts/cursor.js';
import { initTilt } from './scripts/tilt.js';
import { defineWorklabKnot3D } from './scripts/worklab-knot-3d.js';

function start() {
  applyBookingLinks();
  defineWorklabKnot3D();

  const teardowns = [initReveal(), initCursor(), initTilt()];

  // Vite replaces modules in place during development; drop listeners and
  // animation frames first so they do not accumulate across reloads.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => teardowns.forEach((teardown) => teardown?.()));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
