/**
 * Site configuration — the values most likely to change, in one place.
 */

export const site = {
  name: 'TheWorkLab',
  /**
   * Scheduling link behind every "book a call" action.
   *
   * PLACEHOLDER — replace with the real Calendly (or other scheduler) URL.
   * It is applied to every `[data-booking-link]` element at runtime, so this
   * is the only line that needs to change.
   */
  bookingUrl: 'https://calendly.com',
  email: 'hello@theworklab.example',
};

/**
 * Points every booking call-to-action at `site.bookingUrl` and marks the links
 * as opening a new tab, with the rel hardening that implies.
 */
export function applyBookingLinks(root = document) {
  const links = root.querySelectorAll('[data-booking-link]');

  links.forEach((link) => {
    link.href = site.bookingUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  return links.length;
}
