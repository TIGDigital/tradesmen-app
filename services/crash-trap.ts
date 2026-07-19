/**
 * Beta crash trap.
 *
 * Release builds die with an opaque native SIGABRT when a fatal JS
 * error occurs (RN's ExceptionsManager escalates it to RCTFatal). On
 * TestFlight that leaves us blind — the .ips crash log shows the
 * escalation machinery, not the JS error that caused it.
 *
 * This hooks RN's global error handler, persists the error message +
 * top of the stack to AsyncStorage (best-effort — it races the abort,
 * but usually wins), and re-throws to the previous handler so normal
 * crash behaviour is unchanged. On the next launch, RootLayout calls
 * readLastFatalError() and surfaces the message in an alert.
 *
 * Remove (or gate behind a debug flag) once the beta stabilises.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'phase.lastFatalError.v1';

/** Read-and-clear the last recorded fatal error, if any. */
export async function readLastFatalError(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (value) await AsyncStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}

/** Install the global handler. Call once, at module scope, as early as
 *  possible in the root layout. */
export function installCrashTrap(): void {
  // ErrorUtils is React Native's built-in global error hook. It isn't
  // in the TS lib types, hence the cast (globalThis works in both the
  // Hermes runtime and the TS 'dom'-less lib config).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorUtils = (globalThis as any).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  const previousHandler = errorUtils.getGlobalHandler?.();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    let message = 'unknown error';
    try {
      const stack = String(error?.stack ?? '')
        .split('\n')
        .slice(0, 12)
        .join('\n');
      message =
        `[${isFatal ? 'FATAL' : 'non-fatal'}] ` +
        `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}\n` +
        stack;
      // Also emit to console so Metro / Expo Go sessions see it inline.
      console.error('[crash-trap]', message);
      void AsyncStorage.setItem(KEY, message);
    } catch {
      // Never let the trap itself throw.
    }

    if (isFatal) {
      // v2: do NOT forward fatal errors to RN's native handler. In
      // release builds that handler raises RCTFatalException and
      // aborts the process in the SAME synchronous call stack — the
      // AsyncStorage write above never gets a chance to land (v1's
      // flaw), and the tester just sees "Phase crashed". Instead,
      // surface the error on screen so it can be screenshotted. The
      // app may be in a degraded state afterwards (force-close to
      // recover) — acceptable for beta diagnosis.
      // Lazy import to avoid a require cycle at module init.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Alert } = require('react-native');
      Alert.alert(
        'Phase hit an error',
        `Please screenshot this and send it to Todd:\n\n${message.slice(0, 900)}`,
      );
      return;
    }
    previousHandler?.(error, isFatal);
  });
}
