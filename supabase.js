/* Supabase client for POPI Rangpur Inventory */
const SUPABASE_URL = 'https://xrzhtwjdnxvwvzhmhgjs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iO3Uc0PSlRBN5ab_Ms4hfQ_acyQQkZK';
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
window.sbClient = sbClient;
