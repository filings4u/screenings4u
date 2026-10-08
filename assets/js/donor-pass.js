/** screenings4u — Labcorp Donor Pass */
"use strict";
document.addEventListener("DOMContentLoaded", initDonorPass);

async function initDonorPass(){
  const params=new URLSearchParams(location.search);
  const orderId=String(params.get("order")||params.get("order_id")||"").trim();
  const tracking=String(params.get("tracking")||params.get("tracking_number")||"").trim();
  document.getElementById("printButton")?.addEventListener("click",()=>window.print());
  if(!orderId||!tracking){showMessage("This donor-pass link is incomplete. Use the link from your order confirmation or receipt email.","error");renderEmpty();return}
  try{
    const base=String(window.SCREENINGS4U_SUPABASE_URL||"").replace(/\/+$/,"");
    if(!base)throw new Error("The donor-pass service is not configured.");
    const r=await fetch(base+"/functions/v1/public-testing-donor-pass",{method:"POST",headers:{"Content-Type":"application/json","apikey":window.SCREENINGS4U_SUPABASE_ANON_KEY||""},body:JSON.stringify({order_id:orderId,tracking})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Unable to load your donor pass.");
    renderOrder(d.order||{},d.donor_passes||[],d.cases||[]);
    history.replaceState({},"",location.pathname+"?"+new URLSearchParams({order:orderId,tracking}).toString());
  }catch(e){console.error("donor pass",e);showMessage(e.message||"Unable to load your donor pass.","error");renderEmpty()}
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function fmt(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}).format(d)}
function label(v){return String(v||"pending").replaceAll("_"," ")}
function renderOrder(order,passes,cases){
  setText("trackingNumber",order.tracking_number||"—");setText("orderNumber",order.order_number||"—");
  const host=document.getElementById("donorPassList");if(!host)return;
  if(!passes.length){host.innerHTML=`<div class="status active"><div class="status-title">Donor pass is being prepared.</div><div class="status-copy">Your payment is confirmed. The Testing workflow is active, and your Labcorp donor pass will appear here as soon as the registration record is ready.</div></div>`;showMessage("Your order is paid and active. No Labcorp donor pass has been issued yet.","success");return}
  host.innerHTML=passes.map((p,i)=>{const l=p.labcorp||{};const registered=Boolean(l.registration_number);const site=p.collection_site_name||"Pending Labcorp site assignment";const address=p.collection_site_address||"Collection-site address will appear when assigned.";const note=registered?(p.status==="issued"?"Bring a government-issued photo ID and this donor pass to the assigned collection site.":"Your Labcorp registration exists. screenings4u is finalizing your donor-pass/site details."):"Your paid order created a Labcorp registration draft. The registration number will appear here once Labcorp setup is complete.";return `<article class="dp-item"><div class="dp-head"><div><h2>${esc(p.test_type||p.panel_name||`Drug Test ${i+1}`)}</h2><p>${esc(p.pass_number||"Donor pass pending")}</p></div><span class="dp-badge">${esc(label(p.status))}</span></div><div class="dp-grid"><div class="dp-cell"><span>Donor</span><strong>${esc(p.donor_name||order.customer_name||"—")}</strong></div><div class="dp-cell"><span>Specimen</span><strong>${esc(p.specimen_type||"—")}</strong></div><div class="dp-cell"><span>Reason</span><strong>${esc(p.test_reason||"—")}</strong></div><div class="dp-cell"><span>Labcorp Registration</span><strong>${esc(l.registration_number||"Pending")}</strong></div><div class="dp-cell"><span>Labcorp Status</span><strong>${esc(l.status_text||label(l.status)||"Pending")}</strong></div><div class="dp-cell"><span>Collection Deadline</span><strong>${esc(fmt(p.collection_deadline))}</strong></div></div><div class="dp-site"><h3>${esc(site)}</h3><p>${esc(address)}</p></div><div class="dp-note">${esc(note)}</div></article>`}).join("");
  showMessage("Your donor-pass workflow is linked to your paid screenings4u order and Labcorp registration.","success");
}
function renderEmpty(){const host=document.getElementById("donorPassList");if(host)host.innerHTML='<div class="status active"><div class="status-title">Donor pass unavailable.</div><div class="status-copy">Please verify the link or contact screenings4u for assistance.</div></div>'}
function showMessage(message,type){const el=document.getElementById("pageMessage");if(!el)return;el.className="notice "+type;el.textContent=message;el.style.display="block"}
function setText(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
