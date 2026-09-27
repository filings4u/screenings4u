/* SCREENINGS4U — SUPABASE CONFIG — SESSION STORAGE ONLY */
(() => {
  "use strict";
  const SUPABASE_URL = "https://elpbnytpciqnbexiaebp.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_xVI6Mjkk1bNVMGHZCPuK6w_8FSHKdkC";
  window.SCREENINGS4U_SUPABASE_URL=SUPABASE_URL;
  window.SCREENINGS4U_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY;
  if(!window.screenings4uSupabase && window.supabase?.createClient){
    window.screenings4uSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.sessionStorage,storageKey:"s4u-auth-session"}});
  }
  window.supabaseClient=window.screenings4uSupabase;
  window.getScreenings4uSupabase=()=>{if(window.screenings4uSupabase)return window.screenings4uSupabase;throw new Error("Supabase client is not initialized.");};
})();
