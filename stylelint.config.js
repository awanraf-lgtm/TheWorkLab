/**
 * Stylelint configuration.
 *
 * Deviations from stylelint-config-standard are listed with the reason they
 * were made, so a future reader can tell a deliberate choice from an oversight.
 */

export default {
  extends: 'stylelint-config-standard',
  ignoreFiles: ['dist/**/*.css', 'design-source/**'],
  rules: {
    // Enforce kebab-case naming for tokens and BEM-ish class names.
    'custom-property-pattern': '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
    'selector-class-pattern':
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',

    // Vite resolves bare-string @imports; url() would be needless indirection.
    'import-notation': 'string',

    // Tokens are grouped into labelled blocks — the blank lines are deliberate.
    'custom-property-empty-line-before': null,

    // -webkit-text-size-adjust and -webkit-backdrop-filter are still required
    // on iOS Safari.
    'property-no-vendor-prefix': null,

    // Several sizes are exact px-to-rem conversions (15.5px = 0.96875rem).
    'number-max-precision': 5,

    // Longhand borders and transitions read more clearly here than shorthand.
    'declaration-block-no-redundant-longhand-properties': null,

    // Section overrides intentionally follow their base rules.
    'no-descending-specificity': null,
  },
};
