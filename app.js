/* VieroAI City Edition — local/static site, no secrets or server APIs. */
(() => {
  'use strict';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const botUrl = 'https://t.me/VieroAIbot';
  const ideas = Array.isArray(window.VIERO_IDEAS) ? window.VIERO_IDEAS : [];
  const byId = new Map(ideas.map(item => [Number(item.id), item]));
  const rain = document.getElementById('rain');
  // CSS drop animation. Lightweight: fewer DOM nodes on mobile and none in reduced-motion mode.
  if (rain && !reduced) {
    const dropCount = window.innerWidth < 600 ? 35 : 68;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < dropCount; i++) {
      const drop = document.createElement('i');
      const pos = (i * 33.73 + 17.9) % 100;
      drop.style.setProperty('--left', pos + '%');
      drop.style.setProperty('--speed', (1.0 + (i % 11) * 0.13) + 's');
      drop.style.setProperty('--delay', (-(i * .24)) + 's');
      drop.style.setProperty('--length', (31 + (i % 7) * 10) + 'px');
      drop.style.setProperty('--alpha', String(.27 + (i % 6) * .105));
      fragment.appendChild(drop);
    }
    rain.appendChild(fragment);
  }

  // Observe once: content remains visible in older browsers.
  let revealObserver = null;
  if (!reduced && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {rootMargin: '0px 0px 35px 0px', threshold: 0.05});
    document.querySelectorAll('.revealable').forEach(element => {
      element.classList.add('pending');
      revealObserver.observe(element);
    });
  }

  const showcase = document.getElementById('showcaseScroller');
  const carouselStep = () => Math.min(550, (showcase.querySelector('.show-card')?.getBoundingClientRect().width || 240) * 2 + 28);
  document.getElementById('leftShow')?.addEventListener('click', () => showcase.scrollBy({left: -carouselStep(), behavior: reduced ? 'auto':'smooth'}));
  document.getElementById('rightShow')?.addEventListener('click', () => showcase.scrollBy({left: carouselStep(), behavior: reduced ? 'auto':'smooth'}));

  const categoryFilters = document.getElementById('categoryFilters');
  const ideaSearch = document.getElementById('ideaSearch');
  const grid = document.getElementById('ideaGrid');
  const more = document.getElementById('loadMore');
  const empty = document.getElementById('emptyIdeas');
  const count = document.getElementById('countIdeas');
  const categories = ['Все', ...new Set(ideas.map(item => item.category))];
  let currentCategory = 'Все';
  let page = 1;
  const perPage = 12;
  const modal = document.getElementById('ideaModal');
  const modalImage = document.getElementById('modalImage');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalTag = document.getElementById('modalTag');
  const modalSend = document.getElementById('modalSend');
  const copy = document.getElementById('copyPrompt');
  const modalClose = document.getElementById('modalClose');
  let activeIdea = null, lastFocus = null;

  function openIdea(item) {
    if (!item) return;
    activeIdea = item;
    lastFocus = document.activeElement;
    modalImage.src = String(item.asset || '');
    modalImage.alt = 'Пример стиля «' + item.title + '»';
    modalTitle.textContent = item.title;
    modalTag.textContent = item.category + ' / ' + (item.tag || 'CREATIVE');
    modalDesc.textContent = item.mood || 'Авторский стиль для фотографии товара.';
    modalSend.href = botUrl + '?start=idea_' + String(item.id).padStart(3, '0');
    copy.textContent = 'Скопировать промпт';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    modalClose.focus({preventScroll:true});
  }
  function closeIdea() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    modalImage.removeAttribute('src');
    activeIdea = null;
    if (lastFocus && typeof lastFocus.focus === 'function' && document.contains(lastFocus)) lastFocus.focus({preventScroll:true});
  }
  modalClose?.addEventListener('click',closeIdea);
  modal?.addEventListener('click',event => {if(event.target.dataset.close === 'true')closeIdea();});
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeIdea();
    if (event.key === 'Tab' && modal.classList.contains('open')) {
      const focusable = [...modal.querySelectorAll('a[href],button:not([disabled])')];
      if (!focusable.length)return;
      if (event.shiftKey && document.activeElement === focusable[0]) {event.preventDefault();focusable.at(-1).focus();}
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {event.preventDefault();focusable[0].focus();}
    }
  });
  copy?.addEventListener('click',async()=>{
    if (!activeIdea)return;
    try {await navigator.clipboard.writeText(activeIdea.prompt);copy.textContent='Промпт скопирован ✓';}
    catch(e){copy.textContent='Копирование недоступно';}
  });
  document.querySelectorAll('[data-idea]').forEach(card=>card.addEventListener('click',()=>openIdea(byId.get(Number(card.dataset.idea)))));

  function makeIdeaCard(item) {
    const card = document.createElement('article');card.className='idea-item';
    const picture=document.createElement('div');picture.className='idea-image';
    const image=document.createElement('img');image.src=item.asset;image.alt='Идея оформления товара: '+item.title;image.loading='lazy';
    const badge=document.createElement('span');badge.className='idea-tag';badge.textContent=item.tag || item.category;
    picture.append(image,badge);
    const body=document.createElement('div');body.className='idea-item-body';
    const title=document.createElement('h3');title.textContent=item.title;
    const mood=document.createElement('p');mood.textContent=item.category+' · '+item.mood;
    const action=document.createElement('button');action.type='button';action.textContent='Открыть идею';
    const arrow=document.createElement('span');arrow.textContent='↗';action.append(arrow);
    action.addEventListener('click',()=>openIdea(item));
    picture.addEventListener('click',()=>openIdea(item));
    card.append(picture,body);body.append(title,mood,action);
    return card;
  }
  function filtered() {
    const query=ideaSearch.value.trim().toLocaleLowerCase('ru');
    return ideas.filter(item =>
      (currentCategory==='Все'||item.category===currentCategory) &&
      (!query || [item.title,item.category,item.mood,item.tag].join(' ').toLocaleLowerCase('ru').includes(query))
    );
  }
  function render() {
    const selected=filtered();
    const visible=selected.slice(0,page*perPage);
    grid.replaceChildren(...visible.map(makeIdeaCard));
    empty.hidden = selected.length > 0;
    count.textContent = String(selected.length);
    more.hidden = selected.length <= visible.length;
  }
  for (const category of categories) {
    const button=document.createElement('button');button.type='button';button.textContent=category;
    button.classList.toggle('active',category==='Все');button.setAttribute('aria-pressed',category==='Все'?'true':'false');
    button.addEventListener('click',()=>{
      currentCategory=category;page=1;
      [...categoryFilters.children].forEach(el=>{const active=el===button;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
      render();
    });categoryFilters.appendChild(button);
  }
  ideaSearch?.addEventListener('input',()=>{page=1;render();});
  more?.addEventListener('click',()=>{page++;render();});
  render();
})();
