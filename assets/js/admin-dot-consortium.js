(function(){
  "use strict";
  const $=id=>document.getElementById(id); const db=()=>window.Screenings4uAdmin?.supabase||window.screenings4uSupabase;
  let rows=[];
  document.addEventListener("DOMContentLoaded",()=>{bind();load();});
  function bind(){ $("refreshConsortium")?.addEventListener("click",load); $("newConsortiumButton")?.addEventListener("click",()=>openModal()); $("closeConsortiumModal")?.addEventListener("click",closeModal); $("cancelConsortium")?.addEventListener("click",closeModal); $("consortiumModal")?.addEventListener("click",e=>{if(e.target.id==="consortiumModal")closeModal();}); $("consortiumForm")?.addEventListener("submit",save); }
  async function load(){
    const d=db(); if(!d)return fail("Supabase client could not be initialized.");
    setTable('<div class="dot-loading"><span class="dot-spinner"></span>Loading consortium programs...</div>');
    try{
      const [c,e,dr,t]=await Promise.all([
        d.from("dot_consortiums").select("*").order("program_year",{ascending:false}),
        d.from("dot_consortium_employers").select("id,consortium_id,status"),
        d.from("dot_consortium_drivers").select("id,employer_id,active"),
        d.from("dot_tests").select("id,status")
      ]); [c,e,dr,t].forEach(x=>{if(x.error)throw x.error;}); rows=c.data||[];
      $("metricConsortiums").textContent=rows.length; $("metricEmployers").textContent=(e.data||[]).filter(x=>x.status==="active").length; $("metricDrivers").textContent=(dr.data||[]).filter(x=>x.active).length; $("metricPendingTests").textContent=(t.data||[]).filter(x=>!["completed","cancelled"].includes(x.status)).length;
      setTable(rows.length?`<table class="dot-table"><thead><tr><th>Program</th><th>Year</th><th>Drug</th><th>Alcohol</th><th>Status</th><th>DER</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.name)}</strong></td><td>${r.program_year}</td><td>${r.random_drug_rate}%</td><td>${r.random_alcohol_rate}%</td><td>${badge(r.status)}</td><td>${esc(r.der_name||"—")}<small>${esc(r.der_email||"")}</small></td><td><button class="dot-btn dot-btn-muted edit-consortium" data-id="${r.id}">Edit</button></td></tr>`).join("")}</tbody></table>`:'<div class="dot-empty">No consortium programs configured.</div>');
      document.querySelectorAll(".edit-consortium").forEach(b=>b.addEventListener("click",()=>openModal(rows.find(x=>x.id===b.dataset.id))));
    }catch(e){console.error(e);fail(e.message||"Unable to load consortium data.");}
  }
  function openModal(row=null){
    $("consortiumModal").classList.add("open"); $("consortiumModal").setAttribute("aria-hidden","false"); $("consortiumModalTitle").textContent=row?"Edit Program":"New Program";
    $("consortiumForm").dataset.id=row?.id||""; $("consortiumName").value=row?.name||""; $("consortiumYear").value=row?.program_year||new Date().getFullYear(); $("consortiumStatus").value=row?.status||"active"; $("consortiumDrugRate").value=row?.random_drug_rate??25; $("consortiumAlcoholRate").value=row?.random_alcohol_rate??10; $("consortiumDerName").value=row?.der_name||""; $("consortiumDerEmail").value=row?.der_email||""; $("consortiumDerPhone").value=row?.der_phone||""; $("consortiumNotes").value=row?.notes||"";
  }
  function closeModal(){$("consortiumModal")?.classList.remove("open");}
  async function save(e){e.preventDefault();const d=db(),id=$("consortiumForm").dataset.id||null;const payload={name:$('consortiumName').value.trim(),program_year:Number($('consortiumYear').value),status:$('consortiumStatus').value,random_drug_rate:Number($('consortiumDrugRate').value||25),random_alcohol_rate:Number($('consortiumAlcoholRate').value||10),der_name:$('consortiumDerName').value.trim()||null,der_email:$('consortiumDerEmail').value.trim()||null,der_phone:$('consortiumDerPhone').value.trim()||null,notes:$('consortiumNotes').value.trim()||null};try{const r=id?await d.from("dot_consortiums").update(payload).eq("id",id):await d.from("dot_consortiums").insert(payload);if(r.error)throw r.error;closeModal();toast("Consortium program saved.","success");load();}catch(err){console.error(err);toast(err.message||"Unable to save consortium program.","error");}}
  function setTable(v){if($("consortiumTable"))$("consortiumTable").innerHTML=v;} function fail(v){setTable(`<div class="dot-empty">${esc(v)}</div>`);toast(v,"error");} function toast(v,t){const x=$("dotToast");if(!x)return;x.textContent=v;x.className="admin-toast "+(t||"");x.classList.add("show");setTimeout(()=>x.classList.remove("show"),3500);} function badge(v){const c=v==="active"?"good":v==="inactive"?"warn":"bad";return `<span class="dot-badge ${c}">${esc(v||"—")}</span>`;} function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
})();
