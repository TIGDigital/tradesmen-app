import * as AppleAuthentication from 'expo-apple-authentication';

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
