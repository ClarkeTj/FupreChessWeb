/* Highlights Page Controller
   - Dynamic load from highlights.json
   - Filters (type/category/month/year)
   - Masonry render
   - Lightbox + slideshow
   - Lazy loading with IO
   - Accessible keyboard nav
*/
(() => {
  'use strict';

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

  let allItems = [];
  let viewItems = [];
  let currentIndex = 0;
  let slideshowTimer = null;
  const SLIDE_MS = 3500;

  const grid = $('#grid');
  const featured = $('#featured');
  const lightbox2 = $('#lightbox2');
  const lbStage = $('#lbStage');
  const lbClose = $('#lbClose');
  const lbPrev = $('#lbPrev');
  const lbNext = $('#lbNext');
  const slideshowBtn = $('#slideshowBtn');

  const activeFilters = new Set(['all']); // default

  document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    buildFeatured();
    applyFilters();
    wireFilters();
    wireLightbox2();
    wireSlideshow();
  });

  async function loadData(){
    try{
      const res = await fetch('data/highlights.json?nocache=' + Date.now());
      const data = await res.json();
      allItems = (data.highlights || []).map((it, i) => ({
        ...it,
        _id: i,
        // normalized helpers
        _type: (it.type || '').toLowerCase(),
        _cat: (it.category || '').toLowerCase(),
        _year: String(it.year || '').trim(),
        _month: String(it.Month || it.month || '').trim(), // keep original casing if provided
        _date: new Date(it.date)
      })).sort((a,b)=> b._date - a._date);
    } catch(e){
      console.error('Failed to load highlights.json', e);
      allItems = [];
    }
  }

  function buildFeatured(){
    if (!allItems.length) return;
    const top = allItems[0];
    featured.innerHTML = '';

    const wrapper = document.createElement('article');
    wrapper.className = 'hero';

    const isVideo = top._type === 'video';
    let mediaEl;

    if (isVideo) {
      // show a poster image for featured if youtube, else a muted preview
      const ytId = extractYouTubeId(top.src);
      if (ytId) {
        mediaEl = new Image();
        mediaEl.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        mediaEl.alt = `Preview: ${top.title}`;
        mediaEl.loading = 'eager';
        mediaEl.className = 'hero-media';
      } else {
        mediaEl = document.createElement('video');
        mediaEl.className = 'hero-media';
        mediaEl.src = top.src;
        mediaEl.muted = true;
        mediaEl.playsInline = true;
        mediaEl.preload = 'metadata';
      }
    } else {
      mediaEl = new Image();
      mediaEl.src = top.src;
      mediaEl.alt = top.title;
      mediaEl.loading = 'eager';
      mediaEl.className = 'hero-media';
    }

    const overlay = document.createElement('div');
    overlay.className = 'hero-overlay';
    overlay.innerHTML = `
      <div class="hero-title">${escapeHTML(top.title)}</div>
      <div class="hero-date">${formatDate(top.date)}</div>
    `;

    const clickOpen = () => openLightbox2ById(top._id);
    wrapper.appendChild(mediaEl);
    wrapper.appendChild(overlay);
    wrapper.classList.add('featured-card');
    wrapper.style.cursor = 'pointer';
    wrapper.addEventListener('click', clickOpen);
    featured.appendChild(wrapper);
  }

  function wireFilters(){
    $$('.filter-btn').forEach(btn => {
      on(btn, 'click', () => {
        $$('.filter-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        activeFilters.clear();

        const raw = btn.dataset.filter; // e.g., "photos", "videos", "year:2025", "month:July", "all"
        if (raw === 'all') {
          activeFilters.add('all');
        } else {
          activeFilters.add(raw);
        }
        applyFilters();
      });
    });
  }

  function applyFilters(){
    // Filter logic
    viewItems = allItems.filter(item => {
      if (activeFilters.has('all')) return true;

      let pass = true;
      activeFilters.forEach(f => {
        if (!pass) return;

        if (f === 'photos') pass = (item._cat === 'photos' || item._type === 'image');
        else if (f === 'videos') pass = (item._cat === 'videos' || item._type === 'video');
        else if (f.startsWith('year:')) {
          const y = f.split(':')[1];
          pass = (item._year === y);
        } else if (f.startsWith('month:')) {
          const m = f.split(':')[1];
          // normalize compare (keep user button label JULY matching item.Month "July")
          pass = (String(item._month).toLowerCase() === String(m).toLowerCase());
        }
      });

      return pass;
    });

    renderGrid(viewItems);
  }

  function renderGrid(items){
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();

    items.forEach((it, idx) => {
      const card = document.createElement('article');
      card.className = 'card lazy-fade';
      card.dataset.id = String(it._id);

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'thumb-wrap';

      // Media thumb
      if (it._type === 'video') {
        const ytId = extractYouTubeId(it.src);
        const img = new Image();
        img.className = 'thumb';
        img.loading = 'lazy';
        img.alt = `Video: ${it.title}`;
        img.decoding = 'async';
        if (ytId) img.dataset.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        else img.dataset.src = it.poster || it.src; // best effort

        const play = document.createElement('div');
        play.className = 'play-badge';
        play.innerHTML = '▶';

        const overlay = document.createElement('div');
        overlay.className = 'hover-overlay';
        overlay.innerHTML = `
          <div class="ov-title">${escapeHTML(it.title)}</div>
          <div class="ov-date">${formatDate(it.date)}</div>
        `;

        thumbWrap.append(img, play, overlay);
      } else {
        const img = new Image();
        img.className = 'thumb';
        img.loading = 'lazy';
        img.alt = it.title;
        img.decoding = 'async';
        img.dataset.src = it.src;

        const overlay = document.createElement('div');
        overlay.className = 'hover-overlay';
        overlay.innerHTML = `
          <div class="ov-title">${escapeHTML(it.title)}</div>
          <div class="ov-date">${formatDate(it.date)}</div>
        `;

        thumbWrap.append(img, overlay);
      }

      const caption = document.createElement('div');
      caption.className = 'caption';
      caption.innerHTML = `
        <span class="title">${escapeHTML(it.title)}</span>
        <time class="date" datetime="${it.date}">${formatDate(it.date)}</time>
      `;

      card.append(thumbWrap, caption);
      // open viewer
      on(card, 'click', () => openLightbox2ById(it._id));

      frag.appendChild(card);
    });

    grid.appendChild(frag);
    lazyLoadImages();
  }

  /* ---------- Lazy Loading (IO swap data-src -> src) ---------- */
  function lazyLoadImages(){
    const imgs = $$('img[data-src]', grid);
    if (!imgs.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.onload = () => {
            img.closest('.lazy-fade')?.classList.add('loaded');
          };
          io.unobserve(img);
        }
      });
    }, { rootMargin: '200px 0px' });

    imgs.forEach(img => io.observe(img));
  }

  /* ---------- Lightbox2 ---------- */
  function wireLightbox2(){
    on(lbClose, 'click', closeLightbox2);
    on(lbPrev, 'click', () => nav(-1));
    on(lbNext, 'click', () => nav(+1));
    on(lightbox2, 'click', (e) => { if (e.target === lightbox2) closeLightbox2(); });
    on(document, 'keydown', e => {
      if (lightbox2.hidden) return;
      if (e.key === 'Escape') closeLightbox2();
      if (e.key === 'ArrowLeft') nav(-1);
      if (e.key === 'ArrowRight') nav(+1);
    });
  }

  function openLightbox2ById(id){
    const idxInView = viewItems.findIndex(x => x._id === id);
    if (idxInView < 0) return;
    currentIndex = idxInView;
    renderLightbox2();
    lightbox2.hidden = false;
    lbStage.focus();
  }

  function renderLightbox2(){
    const it = viewItems[currentIndex];
    lbStage.innerHTML = '';

    if (it._type === 'video') {
      const ytId = extractYouTubeId(it.src);
      if (ytId) {
        const iframe = document.createElement('iframe');
        iframe.className = 'lb-media';
        iframe.width = '1280';
        iframe.height = '720';
        iframe.allow =
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
        lbStage.appendChild(iframe);
      } else {
        const video = document.createElement('video');
        video.className = 'lb-media';
        video.src = it.src;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        lbStage.appendChild(video);
      }
    } else {
      const img = new Image();
      img.className = 'lb-media';
      img.src = it.src;
      img.alt = it.title;
      img.loading = 'eager';
      lbStage.appendChild(img);
    }
  }

  function closeLightbox2(){
    lightbox2.hidden = true;
    lbStage.innerHTML = '';
    stopSlideshow();
  }

  function nav(delta){
    currentIndex = (currentIndex + delta + viewItems.length) % viewItems.length;
    renderLightbox2();
  }

  /* ---------- Slideshow ---------- */
  function wireSlideshow(){
    on(slideshowBtn, 'click', () => {
      if (slideshowTimer) {
        stopSlideshow();
      } else {
        // Start from first visible or keep current if LB is open
        if (lightbox2.hidden) openLightbox2ById(viewItems[0]?._id);
        startSlideshow();
      }
    });
  }

  function startSlideshow(){
    slideshowBtn.textContent = '⏸ Pause Slideshow';
    slideshowTimer = setInterval(() => {
      // If current is a YouTube/video, let it play for SLIDE_MS; advance regardless
      nav(+1);
    }, SLIDE_MS);
  }

  function stopSlideshow(){
    if (slideshowTimer){
      clearInterval(slideshowTimer);
      slideshowTimer = null;
    }
    slideshowBtn.textContent = '▶ Play Slideshow';
  }

  /* ---------- Utils ---------- */
  function extractYouTubeId(url){
    if (!url) return null;
    try{
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    }catch(e){ /* ignore */ }
    return null;
  }

  function formatDate(iso){
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }

  function escapeHTML(s=''){
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

})();
