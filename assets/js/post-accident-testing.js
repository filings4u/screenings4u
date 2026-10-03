document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-faq-toggle]').forEach(button=>{
    button.addEventListener('click',()=>{
      const item=button.closest('.faq-item');
      if(!item)return;
      const open=item.classList.toggle('active');
      button.setAttribute('aria-expanded',String(open));
      const icon=button.querySelector('.faq-plus');
      if(icon)icon.textContent=open?'−':'+';
    });
  });
  document.querySelectorAll('a[href^="#"]').forEach(anchor=>{
    anchor.addEventListener('click',event=>{
      const href=anchor.getAttribute('href');
      if(!href||href==='#')return;
      const target=document.querySelector(href);
      if(!target)return;
      event.preventDefault();
      target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
});
