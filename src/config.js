/**
 * Site configuration — the values most likely to change, in one place.
 */

export const site = {
  name: 'The Work Lab',

  /**
   * Contact form delivery, via FormSubmit (formsubmit.co) — a free service that
   * emails form submissions to an address, with no account or server needed.
   *
   * The first submission triggers a one-time "Activate form" email to the
   * address; nothing is delivered until that link is clicked.
   *
   * After activation, FormSubmit offers a random alias to use instead of the
   * address (so it isn't visible in the page source). Swap it in here and in
   * the form's `action` in index.html.
   */
  contactEndpoint: 'https://formsubmit.co/ajax/awan.raf@gmail.com',

  /** Subject line of the email each submission sends. */
  contactSubject: 'New enquiry from The Work Lab website',
};
