/* Bella Formosa · public site */
(function () {
  const S = window.BFStore;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const Q = new URLSearchParams(location.search);
  const JUMP = Q.get('jump');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = t => t * t * (3 - 2 * t);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if (JUMP !== null) history.scrollRestoration = 'manual';

  let settings = null, products = [], featured = null;
  const state = { cat: 'Todas', q: '' };

  /* ---------- one loop for the whole page ---------- */
  const tasks = new Set();
  const jank = [];
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    jank.push(dt * 1000); if (jank.length > 240) jank.shift();
    for (const t of tasks) { try { t(dt, now); } catch (e) { console.error(e); } }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.MotionEngine = { jank() { const d = [...jank].sort((a, b) => a - b); return { p95: d[Math.floor(d.length * .95)] | 0, max: d[d.length - 1] | 0 }; } };

  /* ---------- whatsapp ---------- */
  const waNum = () => (settings && settings.whatsapp) || '5515998009042';
  const pieceMsg = (p, size) => `Olá, Bella Formosa! Tenho interesse na peça "${p.name}"${size ? ` no tamanho ${size}` : ''}. Vi no site.`;
  const fmtPhone = n => { const d = String(n).replace(/\D/g, '').replace(/^55/, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d; };

  function applySettings() {
    const s = settings;
    $('#ann').textContent = s.announcement || 'Atendimento pelo WhatsApp · Sorocaba, SP';
    $$('[data-wa]').forEach(a => { a.href = S.waLink(s.whatsapp, 'Olá, Bella Formosa! Vim pelo site.'); });
    const ig = 'https://www.instagram.com/' + String(s.instagram || 'bellaformosa89').replace(/^@/, '') + '/';
    $$('[data-ig]').forEach(a => { a.href = ig; });
    $('#igHandle').textContent = $('#footIg').textContent = '@' + String(s.instagram || 'bellaformosa89').replace(/^@/, '');
    $('#footWa').textContent = 'WhatsApp ' + fmtPhone(s.whatsapp);
    const full = s.address ? `${s.address}, ${s.city}` : s.city;
    $('#addr').textContent = full;
    $('#footAddr').textContent = full;
    $('#addrNote').textContent = s.address ? 'Avise pelo WhatsApp que está a caminho e a gente separa as peças que você quer provar.' : 'Chame no WhatsApp para receber o endereço e combinar a sua visita.';
    $('#routeBtn').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(full);
    $('#footCats').innerHTML = s.categories.map(c => `<li><a href="#catalogo" data-cat="${esc(c)}">${esc(c)}</a></li>`).join('');
    $$('#footCats a').forEach(a => a.addEventListener('click', () => setCat(a.dataset.cat)));
    renderHours();
  }

  /* ---------- hours + live status ---------- */
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const hh = t => t ? t.replace(/^0/, '').replace(':00', 'h').replace(':', 'h') : '';
  function renderHours() {
    const H = settings.hours, any = H.some(h => toMin(h.open) != null && toMin(h.close) != null);
    const table = $('#hours'), st = $('#status'), txt = $('#statusTxt');
    if (!any) { table.hidden = true; st.classList.remove('open'); txt.textContent = 'Horários pelo WhatsApp'; return; }
    const now = new Date(), d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
    table.hidden = false;
    const order = [1, 2, 3, 4, 5, 6, 0];
    table.querySelector('tbody').innerHTML = order.map(i => {
      const h = H[i], o = toMin(h.open), c = toMin(h.close);
      return `<tr class="${i === d ? 'today' : ''}"><td>${S.DAYS[i]}</td><td>${o != null && c != null ? `${hh(h.open)} às ${hh(h.close)}` : 'Fechado'}</td></tr>`;
    }).join('');
    const o = toMin(H[d].open), c = toMin(H[d].close);
    if (o != null && c != null && m >= o && m < c) { st.classList.add('open'); txt.textContent = `Aberto agora · até ${hh(H[d].close)}`; return; }
    st.classList.remove('open');
    for (let k = 0; k < 7; k++) {
      const di = (d + k) % 7, oo = toMin(H[di].open), cc = toMin(H[di].close);
      if (oo == null || cc == null) continue;
      if (k === 0 && m < oo) { txt.textContent = `Fechado agora · abre hoje às ${hh(H[di].open)}`; return; }
      if (k > 0) { txt.textContent = `Fechado agora · abre ${k === 1 ? 'amanhã' : S.DAYS[di].toLowerCase()} às ${hh(H[di].open)}`; return; }
    }
    txt.textContent = 'Fechado agora';
  }

  /* ---------- catalog ---------- */
  const grid = $('#grid'), tabs = $('#tabs');
  const nodes = new Map();
  function renderTabs() {
    const cats = ['Todas', ...settings.categories];
    tabs.innerHTML = cats.map(c => `<button class="tab" role="tab" aria-selected="${c === state.cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    $$('.tab', tabs).forEach(b => b.addEventListener('click', () => setCat(b.dataset.cat)));
  }
  function setCat(c) {
    state.cat = c;
    $$('.tab', tabs).forEach(b => b.setAttribute('aria-selected', String(b.dataset.cat === c)));
    renderGrid(true);
  }
  function filtered() {
    const q = state.q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return products.filter(p => (state.cat === 'Todas' || p.category === state.cat) &&
      (!q || (p.name + ' ' + p.category + ' ' + (p.description || '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)));
  }
  function sizesText(p) { return (p.sizes || []).length ? p.sizes.join(' · ') : ''; }
  function makeCard(p) {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `
      <div class="ph"><img src="${esc(S.img(p.image_url))}" alt="${esc(p.name)}" loading="lazy" decoding="async"></div>
      <button class="open" aria-label="Ver detalhes: ${esc(p.name)}"></button>
      <div class="info">
        <div>${p.featured ? '<div class="feat">Destaque</div>' : ''}<h3>${esc(p.name)}</h3><div class="price${p.price != null ? '' : ' ask'}">${p.price != null ? esc(S.price(p.price)) : 'Consulte o valor'}</div>${sizesText(p) ? `<div class="sizes">${esc(sizesText(p))}</div>` : ''}</div>
        <a class="btn btn-fill btn-sm wa" href="${esc(S.waLink(waNum(), pieceMsg(p)))}" target="_blank" rel="noopener" aria-label="Pedir ${esc(p.name)} no WhatsApp"><svg><use href="#i-wa"/></svg>Pedir</a>
      </div>`;
    el.querySelector('.open').addEventListener('click', () => openSheet(p, el.querySelector('.open')));
    return el;
  }
  let tileEl = null;
  function endTile(n) {
    if (!tileEl) {
      tileEl = document.createElement('div'); tileEl.className = 'endtile';
      tileEl.innerHTML = `<div class="label">Procurando algo?</div><p>Conte para a gente a cor, o modelo ou o tamanho que você precisa.</p><a class="btn btn-ghost btn-sm" data-wa target="_blank" rel="noopener"><svg><use href="#i-wa"/></svg>Perguntar</a>`;
    }
    tileEl.querySelector('a').href = S.waLink(waNum(), 'Olá, Bella Formosa! Estou procurando uma peça e queria saber se vocês têm.');
    if (!n) { tileEl.remove(); return; }
    grid.appendChild(tileEl);
  }
  let cardIO;
  function revealCard(el, delay) {
    if (reduced) { el.classList.add('shown'); return; }
    setTimeout(() => el.classList.add('shown'), delay);
  }
  function renderGrid(animate) {
    const list = filtered();
    const first = new Map();
    if (animate) nodes.forEach((n, id) => { if (n.isConnected) first.set(id, n.getBoundingClientRect()); });
    grid.textContent = '';
    if (!list.length) {
      const e = document.createElement('div'); e.className = 'empty';
      e.innerHTML = `Nenhuma peça encontrada agora. <a href="${esc(S.waLink(waNum(), 'Olá! Estou procurando uma peça e não achei no site.'))}" target="_blank" rel="noopener">Chame no WhatsApp</a> que a gente ajuda você a encontrar.`;
      grid.appendChild(e);
    }
    let fresh = 0;
    list.forEach(p => {
      let n = nodes.get(p.id);
      if (!n) { n = makeCard(p); nodes.set(p.id, n); if (window.__fabWatch) window.__fabWatch(n.querySelector('.wa')); }
      grid.appendChild(n);
    });
    endTile(list.length);
    list.forEach(p => {
      const n = nodes.get(p.id), f = first.get(p.id);
      if (animate && f && !reduced) {
        const l = n.getBoundingClientRect();
        const dx = f.left - l.left, dy = f.top - l.top;
        if (dx || dy) n.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
      } else if (animate) {
        n.classList.remove('shown'); void n.offsetWidth; revealCard(n, 60 + fresh++ * 80);
      } else if (!n.classList.contains('shown')) cardIO.observe(n);
    });
  }
  function initCatalog() {
    cardIO = new IntersectionObserver(es => {
      let i = 0;
      es.forEach(e => { if (e.isIntersecting) { revealCard(e.target, i++ * 90); cardIO.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    renderTabs(); renderGrid(false);
    let tmr; $('#q').addEventListener('input', e => { clearTimeout(tmr); tmr = setTimeout(() => { state.q = e.target.value; renderGrid(true); }, 160); });
  }

  /* ---------- detail sheet ---------- */
  const sheet = $('#sheet'), sheetBg = $('#sheetBg');
  let sheetReturn = null, sheetP = null, sheetSize = '';
  function updateSheetWa() { $('#sWa').href = S.waLink(waNum(), pieceMsg(sheetP, sheetSize)); }
  function openSheet(p, from) {
    sheetP = p; sheetSize = ''; sheetReturn = from || document.activeElement;
    $('#sImg').src = S.img(p.image_url); $('#sImg').alt = p.name;
    $('#sCat').textContent = p.category; $('#sName').textContent = p.name;
    $('#sPrice').textContent = p.price != null ? S.price(p.price) : 'Consulte o valor pelo WhatsApp';
    $('#sDesc').textContent = p.description || '';
    const sz = p.sizes || [];
    $('#sSizesWrap').hidden = !sz.length;
    $('#sSizes').innerHTML = sz.map(s => `<button aria-pressed="false">${esc(s)}</button>`).join('');
    $$('#sSizes button').forEach(b => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      $$('#sSizes button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', String(on)); sheetSize = on ? b.textContent : ''; updateSheetWa();
    }));
    updateSheetWa();
    sheet.classList.add('open'); sheetBg.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => $('#sClose').focus(), 50);
  }
  function closeSheet() {
    if (!sheet.classList.contains('open')) return;
    sheet.classList.remove('open'); sheetBg.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    sheetReturn && sheetReturn.focus && sheetReturn.focus({ preventScroll: true });
  }
  $('#sClose').addEventListener('click', closeSheet);
  sheetBg.addEventListener('click', closeSheet);
  addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheet(); closeDrawer(); } });

  /* ---------- menu drawer ---------- */
  const drawer = $('#drawer');
  function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); $('#menuBtn').setAttribute('aria-expanded', 'false'); }
  $('#menuBtn').addEventListener('click', () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); $('#menuBtn').setAttribute('aria-expanded', 'true'); $('#drawerClose').focus(); });
  $('#drawerClose').addEventListener('click', closeDrawer);
  $$('#drawer a').forEach(a => a.addEventListener('click', closeDrawer));

  /* ---------- hero: the boutique window ---------- */
  const stage = $('#stage'), pano = $('#pano');
  const st1 = $('#st1'), st2 = $('#st2');
  const AR = 3168 / 1344;
  function heroLayout() { // static framing: fill the stage, left edge of the panorama
    const W = stage.clientWidth, H = stage.clientHeight;
    let h = H * 1.02, w = h * AR;
    if (w < W * 1.35) { w = W * 1.35; h = w / AR; }
    pano.style.height = h + 'px'; pano.style.width = w + 'px';
    pano.style.transform = `translate3d(0,${(H - h) * 0.55}px,0)`;
    st1.style.transform = `translate3d(${W * 0.42}px,0,0) skewX(-8deg)`;
    st2.style.transform = `translate3d(${W * 0.86}px,0,0) skewX(-8deg)`;
  }

  function applyFeatured() {
    featured = products.find(p => p.featured) || products[0];
    if (!featured) { $('#beatC').remove(); return; }
    $('#featImg').src = S.img(featured.image_url); $('#featImg').alt = featured.name;
    $('#featName').textContent = featured.name;
    const sz = featured.sizes || [];
    $('#featMeta').textContent = [featured.price != null ? S.price(featured.price) : '', sz.length ? (sz.length > 1 ? `Tamanhos ${sz[0]} ao ${sz[sz.length - 1]}` : `Tamanho ${sz[0]}`) : ''].filter(Boolean).join(' · ') || featured.category;
    $('#featWa').href = S.waLink(waNum(), pieceMsg(featured));
    $('#featOpen').onclick = () => openSheet(featured, $('#featOpen'));
    $('#chatImg').src = S.img(featured.image_url); $('#chatName').textContent = featured.name;
  }

  /* ---------- section reveals ---------- */
  const secIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); secIO.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  $$('main > section:not(.hero)').forEach(s => secIO.observe(s));

  /* ---------- sobre: photo depth + the hanger on its hook ---------- */
  const sobre = $('#sobre'), sobreImg = $('#sobreImg'), hanger = $('#hanger');
  let th = 0, om = 0, lastY = scrollY, tIdle = 0;
  tasks.add((dt) => {
    const r = sobre.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) { lastY = scrollY; return; }
    const p = clamp((innerHeight - r.top) / (innerHeight + r.height));
    sobreImg.style.transform = `translate3d(0,${(-0.14 + p * 0.14) * 100 / 1.18}%,0)`;
    if (reduced) { hanger.style.transform = 'none'; return; }
    const v = (scrollY - lastY) / Math.max(dt, 1 / 120); lastY = scrollY; tIdle += dt;
    const target = Math.sin(tIdle * 0.9) * 0.6;
    const k = 38, c = 3.2;
    om += (-k * (th - target) - c * om + clamp(v, -3000, 3000) * 0.045) * dt;
    th += om * dt; th = clamp(th, -8, 8);
    hanger.style.transform = `rotate(${th.toFixed(3)}deg)`;
  });

  /* ---------- como comprar: the order conversation ---------- */
  const stepsEl = $('#steps'), steps = $$('.step'), chat = $('#chat');
  const msgs = $$('.chat-body > *');
  const line = $('#howLine'), lbg = line.querySelector('.bg'), lfg = line.querySelector('.fg');
  let lineLen = 0, chatTimed = false, chatP = 0;
  function howLayout() {
    const h = stepsEl.clientHeight - 40;
    line.setAttribute('viewBox', `0 0 20 ${h}`); line.style.height = h + 'px';
    const d = `M10 0 V${h}`; lbg.setAttribute('d', d); lfg.setAttribute('d', d);
    lineLen = h; lfg.style.strokeDasharray = h; chatTimed = matchMedia('(max-width: 900px)').matches;
  }
  function chatShow(p) {
    msgs.forEach(m => {
      if (m.dataset.at) m.classList.toggle('show', p >= +m.dataset.at);
      else m.classList.toggle('show', p >= +m.dataset.from && p < +m.dataset.to);
      m.style.display = m.classList.contains('typing') && !m.classList.contains('show') ? 'none' : '';
    });
  }
  tasks.add((dt) => {
    const r = stepsEl.getBoundingClientRect();
    const p = clamp((innerHeight * 0.62 - r.top) / Math.max(1, r.height - innerHeight * 0.1));
    lfg.style.strokeDashoffset = lineLen * (1 - p);
    steps.forEach((s, i) => s.classList.toggle('on', p >= i / 3 - 0.02));
    if (!chatTimed) chatShow(reduced ? 1 : p * 1.05);
    else {
      const cr = chat.getBoundingClientRect();
      if (cr.top < innerHeight * 0.8 && cr.bottom > 0) { chatP = Math.min(1, chatP + dt / (reduced ? 0.01 : 5.5)); }
      chatShow(chatP);
    }
  });

  /* ---------- instagram strip ---------- */
  function renderStrip() {
    const ig = 'https://www.instagram.com/' + String(settings.instagram || 'bellaformosa89').replace(/^@/, '') + '/';
    const imgs = [['img/ig-rosas.jpg', 'Buquê de rosas e vestido ameixa'], ['img/ig-pregas.jpg', 'Pregas do vestido ameixa'], ['img/ig-tecidos.jpg', 'Tecidos e cabide rosé'], ['img/ig-laco.jpg', 'Blusa com laço champagne'], ['img/ig-flores.jpg', 'Rosas no ateliê'], ['img/ig-cetim.jpg', 'Cetim verde esmeralda'], ['img/ig-campo.jpg', 'Vestido sálvia no campo'], ['img/ig-maos.jpg', 'Ajuste de barra no ateliê']];
    const row = imgs.map(([src, alt]) => `<a href="${esc(ig)}" target="_blank" rel="noopener" tabindex="-1"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async"></a>`).join('');
    $('#strip').innerHTML = row + row.replace(/alt="[^"]*"/g, 'alt=""');
  }

  /* ---------- map: loads only near view ---------- */
  const mapIO = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return; mapIO.disconnect();
    const full = settings && settings.address ? `${settings.address}, ${settings.city}` : (settings ? settings.city : 'Sorocaba, SP');
    $('#map').innerHTML = `<iframe title="Mapa: ${esc(full)}" loading="lazy" decoding="async" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(full)}&z=15&output=embed"></iframe>`;
  }, { rootMargin: '400px' });

  /* ---------- looks: two frames, two depths ---------- */
  const edit = $('#looks'), eimgs = $$('#looks .eimg img');
  $$('#looks figcaption a').forEach(a => a.addEventListener('click', () => setCat(a.dataset.cat)));
  tasks.add(() => {
    const r = edit.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = clamp((innerHeight - r.top) / (innerHeight + r.height)) - 0.5;
    eimgs.forEach((im, i) => { im.style.transform = `translate3d(0,${(reduced ? 0 : p * (i ? -9 : -4))}%,0)`; });
  });

  /* ---------- final: the field settles ---------- */
  const fin = $('#cta'), finImg = $('#finalImg');
  tasks.add(() => {
    const r = fin.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    const p = reduced ? 1 : smooth(clamp((innerHeight - r.top) / (innerHeight + r.height * 0.4)));
    finImg.style.transform = `scale(${(1.14 - 0.14 * p).toFixed(4)})`;
  });

  /* ---------- floating whatsapp steps aside when another order button is on screen ---------- */
  const fab = $('.fab'), seen = new Set();
  const fabIO = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
    fab.classList.toggle('hide', seen.size > 0);
  }, { threshold: 0.6 });
  window.__fabWatch = el => fabIO.observe(el);
  function watchWa() { $$('main [data-wa], main .card .wa, #featWa, footer [data-wa], footer a[href="admin/"]').forEach(el => fabIO.observe(el)); }

  /* ---------- boot ---------- */
  function layout() { heroLayout(); howLayout(); }
  addEventListener('resize', layout);
  if (pano.complete) layout(); else pano.addEventListener('load', layout);
  layout();
  $('#yr').textContent = new Date().getFullYear();

  async function boot() {
    try {
      [settings, products] = await Promise.all([S.getSettings(), S.listProducts()]);
    } catch (e) {
      console.warn('catálogo indisponível', e);
      settings = settings || { whatsapp: '5515998009042', instagram: 'bellaformosa89', city: 'Sorocaba, SP', categories: ['Vestidos', 'Saias', 'Conjuntos', 'Blusas', 'Festa'], hours: Array.from({ length: 7 }, (_, d) => ({ d, open: '', close: '' })) };
      products = [];
    }
    applySettings(); applyFeatured(); initCatalog(); renderStrip(); watchWa();
    mapIO.observe($('#map'));
    layout();
    if (JUMP !== null) {
      scrollTo(0, +JUMP || 0);
      $$('main > section').forEach(s => { const r = s.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) s.classList.add('in'); });
      $$('.card').forEach(c => { const r = c.getBoundingClientRect(); if (r.top < innerHeight) c.classList.add('shown'); });    }
    await (document.fonts ? document.fonts.ready.catch(() => {}) : 0);
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; }));
  }
  boot();
})();
