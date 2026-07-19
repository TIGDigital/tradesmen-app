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
    try {
      const stack = String(error?.stack ?? '')
        .split('\n')
        .slice(0, 12)
        .join('\n');
      const message =
        `[${isFatal ? 'FATAL' : 'non-fatal'}] ` +
        `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}\n` +
        stack;
      // Also emit to console so Metro / Expo Go sessions see it inline.
      console.error('[crash-trap]', message);
      // Fire-and-forget persist. May lose the race against the native
      // abort on some devices, but empirically usually lands.
      void AsyncStorage.setItem(KEY, message);
    } catch {
      // Never let the trap itself throw.
    }
    previousHandler?.(error, isFatal);
  });
}
