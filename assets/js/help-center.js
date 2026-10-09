/* searchable, linkable Help Center FAQ: no backend required */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const search = document.getElementById('helpSearch');
    const rows = [...document.querySelectorAll('.help-answer')];
    const categoryButtons = [...document.querySelectorAll('.help-category')];
    const reset = document.getElementById('helpShowAll');
    let category = '';
    function update() {
      const query=search.value.trim().toLowerCase(); let visible=0;
      for(const row of rows) {
        const matches=(!category || row.dataset.category===category) && (!query || row.dataset.search.includes(query));
        row.hidden=!matches; if(matches) visible++;
      }
      categoryButtons.forEach(btn=>btn.setAttribute('aria-pressed',String(category===btn.dataset.filter)));
      document.getElementById('helpResultHeading').textContent=category || (query?'Search results':'Frequently asked questions');
      document.getElementById('helpResultCount').textContent=visible+' '+(visible===1?'answer':'answers')+' found';
      document.getElementById('helpEmpty').hidden=visible>0;
      reset.hidden=!category && !query;
    }
    function clear(){category='';search.value='';update();document.getElementById('helpAnswers').scrollIntoView({behavior:'smooth',block:'start'});}
    search.addEventListener('input',update);
    search.addEventListener('keydown',ev=>{if(ev.key==='Escape'){search.value='';update();}});
    categoryButtons.forEach(btn=>btn.addEventListener('click',()=>{category=category===btn.dataset.filter?'':btn.dataset.filter;update();document.getElementById('helpAnswers').scrollIntoView({behavior:'smooth',block:'start'});}));
    reset.addEventListener('click',clear);
    document.querySelectorAll('.help-quick a').forEach(link=>link.addEventListener('click',()=>{category='';search.value='';update();const detail=document.getElementById(link.hash.slice(1));if(detail)detail.open=true;}));
    function followHash(){const id=decodeURIComponent(location.hash.slice(1));const detail=document.getElementById(id);if(detail && detail.classList.contains('help-answer')){category='';search.value='';update();detail.open=true;}}
    window.addEventListener('hashchange',followHash);followHash();
  });
})();
