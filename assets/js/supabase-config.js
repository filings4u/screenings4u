/* SCREENINGS4U — SUPABASE CONFIG — SESSION STORAGE ONLY */
(() => {
  "use strict";
  const SUPABASE_URL = "https://rgsrubdtljyxmnihwlah.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnc3J1YmR0bGp5eG1uaWh3bGFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjYxODgsImV4cCI6MjEwMjI0MjE4OH0.al5nEbeGjGncHZ9cJjh1oN76XjfS4EfYj5fXyeD2CE0";
  window.SCREENINGS4U_SUPABASE_URL=SUPABASE_URL;
  window.SCREENINGS4U_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY;
  if(!window.screenings4uSupabase && window.supabase?.createClient){
    window.screenings4uSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.sessionStorage,storageKey:"s4u-auth-session"}});
  }
  window.supabaseClient=window.screenings4uSupabase;
  window.getScreenings4uSupabase=()=>{if(window.screenings4uSupabase)return window.screenings4uSupabase;throw new Error("Supabase client is not initialized.");};
})();
