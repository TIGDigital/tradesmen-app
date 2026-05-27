// Shared CORS headers for edge functions invoked from the app.
// `supabase.functions.invoke()` from the client uses fetch under the hood.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
