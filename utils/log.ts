/**
 * Dev-only logger. Silenced in production builds because `__DEV__` is replaced
 * with `false` by Metro's minifier, which then tree-shakes the call.
 *
 * Use for verbose diagnostic logs (`[notifications] got token: …`).
 * Real errors should still go through `console.warn` so they reach Sentry/etc.
 */
export function devLog(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
