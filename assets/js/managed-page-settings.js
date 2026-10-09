/* screenings4u — published managed page settings (public-only, no customer data) */
(()=>{'use strict';
 const site=location.hostname.startsWith('customers.')?'customers':'main';
 const url='https://elpbnytpciqnbexiaebp.supabase.co/rest/v1/testing_published_page_settings';
 const key=site==='customers'?window.PORTAL_CONFIG?.supabaseKey:window.SCREENINGS4U_SUPABASE_ANON_KEY;
 const route=location.pathname==='/'?'/':location.pathname;
 if(!key)return;
 const esc=s=>String(s||'');
 const meta=(selector,attr,value)=>{let e=document.head.querySelector(selector);if(!e){e=document.createElement('meta');e.setAttribute(attr==='property'?'property':'name',attr==='property'?selector.match(/\[property="([^"]+)"\]/)?.[1]:'description');document.head.append(e)}e.setAttribute('content',value)};
 const txt=e=>e&&e.textContent;
 const main=()=>{
  const selectors=site==='customers'?['main .portal-hero h1','main .page-hero h1','main h1']:['main .hero-content h1','main .page-hero h1','main .hero h1','main h1'];
  return selectors.map(x=>document.querySelector(x)).find(Boolean);
 };
 fetch(url+'?select=title,description,seo_title,seo_description,seo_index,canonical_url,hero&site_code=eq.'+site+'&route=eq.'+encodeURIComponent(route)+'&limit=1',{headers:{'apikey':key,'Accept':'application/json'},cache:'no-store'})
 .then(r=>{if(!r.ok)throw Error('Page settings unavailable');return r.json()}).then(rows=>{
   const p=rows&&rows[0];if(!p)return;
   if(p.seo_title)document.title=esc(p.seo_title);
   const desc=document.querySelector('meta[name="description"]');if(desc&&p.seo_description)desc.content=esc(p.seo_description);
   const robots=document.querySelector('meta[name="robots"]');if(p.seo_index===false){if(robots)robots.content='noindex,nofollow';else {const r=document.createElement('meta');r.name='robots';r.content='noindex,nofollow';document.head.append(r)}}
   const canonical=document.querySelector('link[rel="canonical"]');if(canonical&&p.canonical_url){try{const u=new URL(p.canonical_url);if(u.protocol==='https:'&&u.hostname===(site==='customers'?'customers.screenings4u.com':'screenings4u.com'))canonical.href=u.href}catch{}}
   const h=main();if(h&&p.hero&&p.hero.heading)h.textContent=esc(p.hero.heading);
   if(h&&p.hero&&p.hero.description){const container=h.closest('.hero-content,.page-hero,.hero,.portal-hero')||h.parentElement;const para=container?.querySelector('p');if(para)para.textContent=esc(p.hero.description)}
 }).catch(e=>console.warn('Managed page settings:',e.message));
})();
