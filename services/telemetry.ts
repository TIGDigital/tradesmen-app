import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

/**
 * Crash + usage telemetry (pre-launch instrumentation, 18 Oct).
 *
 * Both services are OPTIONAL at runtime: with no key configured the app
 * runs exactly as before (every helper no-ops), so dev sessions and
 * builds cut before the keys exist stay clean. Keys ship as
 * EXPO_PUBLIC_* env vars via EAS — public-by-design identifiers, same
 * category as the Supabase anon key.
 *
 * Privacy posture: no PII beyond the user id (needed to count users and
 * tie crashes to accounts), no session replay, no autocapture of text.
 */

const SENTRY_DSN =
  process.env.EXPO_PUBLIC_SENTRY_DSN ??
  'https://c93f341bc255b05a28328fb8d6006ece@o4512279077781504.ingest.de.sentry.io/4512279088660560';
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let posthog: PostHog | null = null;

/** Call once at app start (root layout), before anything can crash. */
export function initTelemetry(): void {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      enabled: !__DEV__,
      tracesSampleRate: 0.2,
    });
  }
  if (POSTHOG_KEY && !__DEV__) {
    posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
  }
}

/** Tie events + crashes to the signed-in account (and clear on sign-out). */
export function identifyUser(userId: string | null, role?: string | null): void {
  if (SENTRY_DSN) {
    Sentry.setUser(userId ? { id: userId } : null);
  }
  if (!posthog) return;
  if (userId) {
    posthog.identify(userId, role ? { role } : undefined);
  } else {
    void posthog.reset();
  }
}

/** Product event — name things plainly: 'quote_sent', 'update_posted'. */
export function track(event: string, properties?: Record<string, string | number | boolean>): void {
  posthog?.capture(event, properties);
}

/** Non-fatal error worth knowing about (fatal crashes report themselves). */
export function reportError(e: unknown, context?: string): void {
  if (!SENTRY_DSN) return;
  Sentry.captureException(e, context ? { extra: { context } } : undefined);
}
