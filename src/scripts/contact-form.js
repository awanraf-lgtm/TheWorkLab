import { site } from '../config.js';

/**
 * Contact form → FormSubmit → email.
 *
 * Submits in the background as JSON and reports the outcome in place. Field
 * names in the email are the visible labels, and dropdowns send the option
 * text the visitor chose. Without JavaScript the form still posts to
 * FormSubmit directly (see the form's `action`), which shows its own
 * confirmation page.
 *
 * @returns {() => void} cleanup function
 */

const MESSAGES = {
  sending: 'Sending your message…',
  sent: 'Thanks — your message has been sent. We’ll be in touch soon.',
  error: 'Sorry, your message couldn’t be sent. Please try again in a moment.',
};

/** Spam trap. FormSubmit discards any submission that fills it. */
const HONEYPOT = '_honey';

export function initContactForm() {
  const noop = () => {};

  const form = document.querySelector('[data-contact-form]');
  if (!form) return noop;

  const status = form.querySelector('[data-contact-status]');
  const button = form.querySelector('[type="submit"]');
  const buttonLabel = button?.textContent;

  const setStatus = (message, tone) => {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  };

  const setBusy = (busy) => {
    form.setAttribute('aria-busy', String(busy));
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? 'Sending…' : buttonLabel;
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    // Browser validation first: shows its own messages, focuses the field.
    if (!form.reportValidity()) return;

    // A bot filled the hidden field: act as if it worked, send nothing.
    if (String(new FormData(form).get(HONEYPOT) || '').trim()) {
      form.reset();
      setStatus(MESSAGES.sent, 'success');
      return;
    }

    setBusy(true);
    setStatus(MESSAGES.sending, 'info');

    try {
      const response = await fetch(site.contactEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(buildPayload(form)),
      });
      const result = await response.json().catch(() => ({}));

      // FormSubmit reports success as the string "true".
      if (response.ok && String(result.success) === 'true') {
        form.reset();
        setStatus(MESSAGES.sent, 'success');
      } else {
        // Most likely cause before launch: the form hasn't been activated yet.
        console.warn('Contact form was not delivered:', result.message || response.status);
        setStatus(MESSAGES.error, 'error');
      }
    } catch (error) {
      console.warn('Contact form request failed:', error);
      setStatus(MESSAGES.error, 'error');
    } finally {
      setBusy(false);
    }
  };

  form.addEventListener('submit', onSubmit);
  return () => form.removeEventListener('submit', onSubmit);
}

/**
 * The email FormSubmit sends lists each key as a row, so keys are the visible
 * field labels rather than internal names, and dropdowns send their option text.
 */
function buildPayload(form) {
  const payload = {
    _subject: site.contactSubject,
    _template: 'table',
  };

  for (const control of form.elements) {
    if (!control.name || control.name.startsWith('_') || control.type === 'submit') continue;

    const value =
      control instanceof HTMLSelectElement
        ? control.selectedOptions[0]?.textContent.trim()
        : String(control.value).trim();
    if (!value) continue;

    payload[labelFor(control) || control.name] = value;

    // Replying to the notification email goes straight to the visitor.
    if (control.type === 'email') payload._replyto = value;
  }

  return payload;
}

/** The label text for a control, without the decorative required asterisk. */
function labelFor(control) {
  const label = control.labels?.[0];
  if (!label) return '';

  const clone = label.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
  return clone.textContent.trim();
}
