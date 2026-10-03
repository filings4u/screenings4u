document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-faq-toggle]').forEach(button=>{
    button.addEventListener('click',()=>{
      const item=button.closest('.faq-item');
      if(!item)return;
      const open=item.classList.toggle('active');
      button.setAttribute('aria-expanded',String(open));
      const icon=button.querySelector('span');
      if(icon)icon.textContent=open?'−':'+';
    });
  });
  document.querySelectorAll('a[href^="#"]').forEach(anchor=>{
    anchor.addEventListener('click',event=>{
      const id=anchor.getAttribute('href');
      if(!id||id==='#')return;
      const target=document.querySelector(id);
      if(!target)return;
      event.preventDefault();
      target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
});
