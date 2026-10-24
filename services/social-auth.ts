import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';

import { supabase } from '@/services/supabase';

/**
 * Native Sign in with Apple → Supabase session (Sprint 54).
 *
 * Returns { isNewUser } on success, or null when the user cancelled the
 * Apple sheet (not an error — callers should just do nothing).
 *
 * Apple quirk worth knowing: the user's name is ONLY provided on the very
 * first authorization for this app, so we persist it immediately or lose
 * it forever (profiles row is created by the handle_new_user trigger with
 * no name for token sign-ins).
 */
export async function signInWithApple(): Promise<{ isNewUser: boolean } | null> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token — try again');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw new Error(error.message);

  const isNewUser =
    !!data.user && Date.now() - new Date(data.user.created_at).getTime() < 60_000;

  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');
  if (isNewUser && fullName && data.user) {
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', data.user.id);
  }

  return { isNewUser };
}

const GOOGLE_WEB_CLIENT_ID =
  '966214438385-b7s1f2d9fqaga8ihjr11d3aqij7et52l.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '966214438385-mp4cghtsh01ei22sou256s623ap0l0g6.apps.googleusercontent.com';

/**
 * Native Google sign-in → Supabase session (Sprint 54).
 *
 * The google-signin module is NOT in Expo Go, so it's require()d lazily
 * and callers must gate on isGoogleSignInAvailable() — static import
 * would crash dev sessions at bundle evaluation.
 */
export function isGoogleSignInAvailable(): boolean {
  // In Expo Go the module can't exist — short-circuit BEFORE require():
  // the failed lookup itself trips RN's global error handler and painted
  // a scary [FATAL] toast over dev sessions (sim test, 24 Oct).
  if (Constants.appOwnership === 'expo') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@react-native-google-signin/google-signin');
    return true;
  } catch {
    return false;
  }
}

export async function signInWithGoogle(): Promise<{ isNewUser: boolean } | null> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });

  let idToken: string | null = null;
  try {
    const res = await GoogleSignin.signIn();
    idToken = res?.data?.idToken ?? res?.idToken ?? null;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw e;
  }
  if (!idToken) throw new Error('Google did not return an identity token — try again');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw new Error(error.message);

  const isNewUser =
    !!data.user && Date.now() - new Date(data.user.created_at).getTime() < 60_000;
  return { isNewUser };
}
