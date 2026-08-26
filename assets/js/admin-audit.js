/* screenings4u — Admin Audit Center */
(function(){
  "use strict";
  let db=null,events=[],profiles={}; const $=id=>document.getElementById(id);
  document.addEventListener("DOMContentLoaded",init,{once:true});
  async function init(){
    try{db=window.Screenings4uAdmin?.supabase||window.screenings4uSupabase;if(!db)throw new Error("Supabase configuration could not be loaded.");bind();await load();}
    catch(e){console.error(e);message(e.message||"Unable to initialize the audit center.");}
  }
  function bind(){ $("auditSearch")?.addEventListener("input",render); $("auditActionFilter")?.addEventListener("change",render); $("clearAuditFiltersButton")?.addEventListener("click",()=>{if($("auditSearch"))$("auditSearch").value="";if($("auditActionFilter"))$("auditActionFilter").value="all";render();}); $("refreshAuditButton")?.addEventListener("click",load); }
  async function load(){
    const table=$("auditTable");if(table)table.innerHTML='<div class="audit-loading">Loading audit activity...</div>';
    try{
      const {data,error}=await db.from("audit_log").select("id,actor_user_id,action,entity_type,entity_id,details,created_at").order("created_at",{ascending:false});
      if(error)throw error;events=data||[];await loadActors();metrics();render();
    }catch(e){console.error("Unable to load audit log:",e);events=[];profiles={};message("Unable to load the audit log. Check the browser console for the Supabase error.");}
  }
  async function loadActors(){
    profiles={};const ids=[...new Set(events.map(e=>e.actor_user_id).filter(Boolean))];if(!ids.length)return;
    const [a,c]=await Promise.all([db.from("admin_profiles").select("id,first_name,last_name,email,admin_level,is_active").in("id",ids),db.from("client_profiles").select("id,first_name,last_name,email,is_active").in("id",ids)]);
    (a.data||[]).forEach(x=>profiles[x.id]={...x,type:"Admin"});(c.data||[]).forEach(x=>{if(!profiles[x.id])profiles[x.id]={...x,type:"Customer"};});
  }
  function render(){
    const table=$("auditTable");if(!table)return;const q=String($("auditSearch")?.value||"").toLowerCase().trim(),f=$("auditActionFilter")?.value||"all";
    const rows=events.filter(e=>{const action=actionOf(e),u=user(e),text=JSON.stringify(e.details||{});return(!q||[action,e.action,e.entity_type,e.entity_id,u.name,u.email,text].join(" ").toLowerCase().includes(q))&&(f==="all"||action===f)});
    if($("auditResultCount"))$("auditResultCount").textContent=rows.length;
    table.innerHTML=rows.length?`<table class="admin-data-table"><thead><tr><th>Date & Time</th><th>Action</th><th>User</th><th>Event</th><th>Record</th></tr></thead><tbody>${rows.map(row).join("")}</tbody></table>`:'<div class="audit-empty">No audit events match the current filters.</div>';
  }
  function row(e){const u=user(e),a=actionOf(e),desc=e.details?.description||e.details?.message||`${fmtAction(a)} ${fmtEntity(e.entity_type)}`;return `<tr><td>${esc(date(e.created_at))}</td><td><span class="audit-action ${esc(a)}">${esc(fmtAction(a))}</span></td><td><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></td><td><strong>${esc(desc)}</strong><small>${esc(fmtEntity(e.entity_type))}</small></td><td>${esc(e.entity_id||e.entity_type||"—")}</td></tr>`;}
  function user(e){const p=profiles[e.actor_user_id];return p?{name:`${p.first_name||""} ${p.last_name||""}`.trim()||p.email||p.type,email:p.email||p.type}:{name:"System",email:"System activity"};}
  function actionOf(e){const v=String(e.action||"activity").toLowerCase();if(v.includes("login")||v.includes("sign in"))return"login";if(v.includes("logout")||v.includes("sign out"))return"logout";if(v.includes("create")||v.includes("insert"))return"create";if(v.includes("update")||v.includes("edit"))return"update";if(v.includes("delete")||v.includes("remove"))return"delete";if(v.includes("complete"))return"complete";return v.replace(/\s+/g,"-");}
  function metrics(){const today=new Date().toDateString();$("auditTotal")&&($("auditTotal").textContent=events.length);$("auditToday")&&($("auditToday").textContent=events.filter(e=>new Date(e.created_at).toDateString()===today).length);$("auditLogins")&&($("auditLogins").textContent=events.filter(e=>actionOf(e)==="login").length);$("auditChanges")&&($("auditChanges").textContent=events.filter(e=>["create","update","delete"].includes(actionOf(e))).length);}
  function message(v){const t=$("auditTable");if(t)t.innerHTML=`<div class="audit-empty">${esc(v)}</div>`;}
  function fmtAction(v){return String(v||"").replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());}function fmtEntity(v){return String(v||"System").replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());}function date(v){const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});}function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
})();
