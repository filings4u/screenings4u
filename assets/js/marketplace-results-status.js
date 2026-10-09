(()=>{
const form=document.getElementById('specimenStatusForm');if(!form)return;const personal=document.getElementById('personalFields'),cdl=document.getElementById('cdlFields'),response=document.getElementById('statusResponse'),submit=document.getElementById('statusSubmit');
const fields=()=>{const useCdl=form.elements.method.value==='cdl';personal.hidden=useCdl;cdl.hidden=!useCdl;document.getElementById('fullName').required=!useCdl;document.getElementById('dateOfBirth').required=!useCdl;document.getElementById('cdlNumber').required=useCdl;response.hidden=true};
form.querySelectorAll('[name=method]').forEach(x=>x.addEventListener('change',fields));fields();
form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;response.hidden=false;response.textContent='Checking specimen status…';response.className='status-response';submit.disabled=true;
try{const isCdl=form.elements.method.value==='cdl';const payload={specimen_id:document.getElementById('specimenId').value.trim(),...(isCdl?{cdl_number:document.getElementById('cdlNumber').value.trim()}:{full_name:document.getElementById('fullName').value.trim(),date_of_birth:document.getElementById('dateOfBirth').value})};
const r=await fetch('https://elpbnytpciqnbexiaebp.supabase.co/functions/v1/marketplace-results-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Status lookup unavailable');
if(!data.found){response.textContent=data.message||'No verified matching specimen found.';return;}
const title=document.createElement('strong'),note=document.createElement('p'),time=document.createElement('small');title.textContent=data.status;note.textContent=data.description;time.textContent='Checked '+new Date(data.checked_at).toLocaleString();response.replaceChildren(title,note,time);response.classList.add('found');
}catch(err){response.textContent=err.message||'Could not check status right now.';response.classList.add('error')}finally{submit.disabled=false}
});})();
