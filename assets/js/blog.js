/* screenings4u public blog: static editorial articles + optional published Supabase articles. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', init);
  let posts = [];
  let category = 'All';
  let term = '';
  const el = id => document.getElementById(id);

  function init() {
    try { posts = JSON.parse(el('blogSeed')?.textContent || '[]'); }
    catch (err) { console.warn('Blog starter articles unavailable', err); }
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (slug) {
      el('blogListView').hidden = true;
      el('blogArticleView').hidden = false;
      const local = posts.find(p => p.slug === slug);
      if (local) { renderArticle(local); return; }
      loadPublishedArticle(slug);
      return;
    }
    el('blogSearch')?.addEventListener('input', e => { term = e.target.value.trim().toLowerCase(); render(); });
    render();
    loadPublishedPosts();
  }

  function createClient() {
    if (!window.supabase?.createClient || !window.SCREENINGS4U_SUPABASE_URL || !window.SCREENINGS4U_SUPABASE_ANON_KEY) return null;
    return window.supabase.createClient(window.SCREENINGS4U_SUPABASE_URL, window.SCREENINGS4U_SUPABASE_ANON_KEY, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  }
  const columns = 'id,title,slug,excerpt,content_html,featured_image_url,metadata,seo_title,seo_description,author_name,published_at,created_at';
  const normalize = p => ({...p,category:p.metadata?.category || 'Insights',tags:p.metadata?.tags || [],featured:p.metadata?.featured===true,content:p.metadata?.legacy_content || ''});
  async function loadPublishedPosts() {
    const client = createClient(); if (!client) return;
    try {
      const {data,error} = await client.from('screenings4u_blog').select(columns).eq('status','published').order('published_at',{ascending:false});
      if (error) throw error;
      const remote = (data || []).filter(p => p.title && (p.slug || p.id)).map(p => ({...normalize(p),url:'blog.html?slug='+encodeURIComponent(p.slug || p.id),image:p.featured_image_url || '',read:'Article'}));
      const slugs = new Set(remote.map(p => p.slug));
      posts = [...remote,...posts.filter(p => !slugs.has(p.slug))];
      render();
    } catch (e) { console.info('Blog CMS not available; showing editorial articles.',e.message); }
  }
  async function loadPublishedArticle(slug) {
    const client = createClient();
    if (!client) return showNotFound();
    try {
      const uuid = /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(slug);
      const {data,error} = await client.from('screenings4u_blog').select(columns).eq('status','published').eq(uuid?'id':'slug',slug).maybeSingle();
      if (error || !data) throw (error || new Error('Not found'));
      renderArticle(normalize(data));
    } catch {showNotFound();}
  }
  function showNotFound(){
    el('articleTitle').textContent='Article not found';
    el('articleExcerpt').textContent='The article may have moved or is not available. Browse the latest resources instead.';
    document.title='Article not found | screenings4u';
  }
  function render() {
    const cats=['All',...new Set(posts.map(p => (p.category || '').trim()).filter(Boolean))];
    const holder=el('blogCategories'); holder.replaceChildren();
    cats.forEach(cat => {
      const b=document.createElement('button'); b.type='button'; b.className='blog-category-btn';
      b.textContent=cat==='All'?'All articles':cat; b.setAttribute('aria-pressed',String(cat===category));
      b.addEventListener('click',()=>{category=cat;render();}); holder.appendChild(b);
    });
    const filtered=posts.filter(p => (category==='All' || p.category===category) && (!term || [p.title,p.excerpt,p.category,...(Array.isArray(p.tags)?p.tags:[])].join(' ').toLowerCase().includes(term)));
    const featured=!term && category==='All' ? filtered.find(p => p.featured) : null;
    const box=el('blogFeatured'); box.hidden=!featured;
    if (featured) {
      box.replaceChildren();
      const img=document.createElement('img');img.alt='';img.src=safeImage(featured.image)||'images/testing-hero.webp';
      const copy=document.createElement('div');copy.className='blog-featured-copy';
      const label=document.createElement('span');label.className='blog-eyebrow';label.textContent='Featured · '+(featured.category||'Resources');
      const title=document.createElement('h2');title.textContent=featured.title;
      const desc=document.createElement('p');desc.textContent=featured.excerpt||'';
      const a=document.createElement('a');a.href=postUrl(featured);a.textContent='Read featured article →';
      copy.append(label,title,desc,a); box.append(img,copy);
    }
    const grid=el('blogGrid');grid.replaceChildren(...filtered.filter(p=>p!==featured).map(createCard));
    el('blogEmpty').hidden=filtered.length>0;
    el('blogStatus').textContent=filtered.length+' article'+(filtered.length===1?'':'s')+' found';
  }
  function createCard(p){
    const card=document.createElement('article');card.className='blog-card';
    const photo=document.createElement('a');photo.href=postUrl(p);photo.setAttribute('aria-label','Read '+p.title);
    const img=document.createElement('img');img.loading='lazy';img.alt='';img.src=safeImage(p.image)||'images/testing-hero.webp';photo.appendChild(img);
    const body=document.createElement('div');body.className='blog-card-body';
    const cat=document.createElement('span');cat.className='blog-cat';cat.textContent=p.category||'Resources';
    const heading=document.createElement('h3');const hlink=document.createElement('a');hlink.href=postUrl(p);hlink.textContent=p.title;heading.appendChild(hlink);
    const excerpt=document.createElement('p');excerpt.textContent=p.excerpt||'';
    const meta=document.createElement('span');meta.className='blog-card-meta';meta.textContent=(p.read||'Article')+' · '+(p.author_name||'screenings4u');
    const read=document.createElement('a');read.className='blog-read';read.href=postUrl(p);read.textContent='Read article →';
    body.append(cat,heading,excerpt,meta,read);card.append(photo,body);return card;
  }
  function postUrl(p){return p.url && /^(blog-[a-z0-9-]+\.html|blog\.html\?slug=)/.test(p.url)?p.url:'blog.html?slug='+encodeURIComponent(p.slug||p.id);}
  function safeImage(src){
    if (typeof src!=='string') return '';
    if (/^images\/[a-z0-9 ._/-]+\.webp$/i.test(src) && !src.includes('..')) return src;
    try {const u=new URL(src,location.href);return ['http:','https:'].includes(u.protocol)?u.href:'';} catch{return '';}
  }
  function renderArticle(p){
    el('articleCategory').textContent=p.category||'Resources';
    el('articleTitle').textContent=p.title;
    el('articleExcerpt').textContent=p.excerpt||'';
    el('articleMeta').textContent=(p.author_name||'screenings4u Editorial Team')+(p.published_at?' · '+new Date(p.published_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}):'');
    const pic=el('articleImage');const src=safeImage(p.image||p.featured_image_url);if(src){pic.src=src;pic.hidden=false;}
    const content=p.content_html || p.content || '';
    const parsed=sanitizeHtml(content);
    const first=parsed.firstElementChild;
    const norm=x=>String(x||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(first&&/^H[1-6]$/.test(first.tagName)&&norm(first.textContent)===norm(p.title))first.remove();
    el('articleContent').replaceChildren(parsed);
    document.title=(p.seo_title||p.title)+' | screenings4u';
    const meta=document.querySelector('meta[name=description]');if(meta)meta.content=p.seo_description||p.excerpt||'';
  }
  function sanitizeHtml(source){
    const fragment=document.createDocumentFragment(), doc=new DOMParser().parseFromString('<div>'+source+'</div>','text/html');
    const allowed=new Set(['P','H2','H3','H4','UL','OL','LI','STRONG','EM','B','I','A','BLOCKQUOTE','BR']);
    function clean(node,parent){
      if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent));return;}
      if(node.nodeType!==Node.ELEMENT_NODE)return;
      if(!allowed.has(node.tagName)){for(const child of Array.from(node.childNodes))clean(child,parent);return;}
      const elem=document.createElement(node.tagName.toLowerCase());
      if(node.tagName==='A'){
        const href=node.getAttribute('href')||'';
        try {const url=new URL(href,location.href);if(['https:','http:'].includes(url.protocol))elem.href=url.href;}catch{}
        elem.rel='noopener noreferrer';
      }
      for(const child of Array.from(node.childNodes))clean(child,elem);
      parent.appendChild(elem);
    }
    for(const child of Array.from(doc.body.firstElementChild?.childNodes||[]))clean(child,fragment);
    return fragment;
  }
})();
