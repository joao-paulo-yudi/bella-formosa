/* Bella Formosa · painel da loja */
(function () {
  const S = window.BFStore;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'U'];
  let products = [], settings = null, editing = null, pendingImage = null;

  function toast(msg, err) {
    const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 3200);
  }
  function busy(btn, on, label) { if (!btn) return; btn.disabled = on; if (on) { btn._l = btn.textContent; btn.textContent = label || 'Salvando...'; } else if (btn._l) btn.textContent = btn._l; }

  /* ---------- auth ---------- */
  async function start() {
    if (!S.live) { $('#liveFields').hidden = true; $('#forgot').hidden = true; $('#demoNote').hidden = false; $('#lBtn').textContent = 'Entrar na demonstração'; }
    await S.init();
    if (S.live && /type=recovery/.test(location.hash)) { show('newPass'); return; }
    const s = await S.session();
    if (s && await S.isAdmin()) enter(s); else show('login');
  }
  function show(id) { ['login', 'newPass', 'app'].forEach(x => { $('#' + x).hidden = x !== id; }); }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); $('#lErr').textContent = '';
    const btn = $('#lBtn'); busy(btn, true, 'Entrando...');
    try { enter(await S.signIn($('#lEmail').value.trim(), $('#lPass').value)); }
    catch (err) { $('#lErr').textContent = err.message || 'Não foi possível entrar.'; }
    finally { busy(btn, false); }
  });
  $('#forgot').addEventListener('click', async () => {
    const em = $('#lEmail').value.trim();
    if (!em) { $('#lErr').textContent = 'Digite seu e-mail acima e toque de novo em "Esqueci minha senha".'; return; }
    try { await S.resetPassword(em); $('#lErr').textContent = ''; toast('Enviamos um link para redefinir a senha no seu e-mail.'); }
    catch (err) { $('#lErr').textContent = err.message; }
  });
  $('#newPassForm').addEventListener('submit', async e => {
    e.preventDefault();
    try { await S.updatePassword($('#np').value); history.replaceState(null, '', location.pathname); toast('Senha atualizada.'); start(); }
    catch (err) { $('#npErr').textContent = err.message; }
  });
  $('#logout').addEventListener('click', async () => { await S.signOut(); show('login'); });

  async function enter(sess) {
    show('app');
    $('#who').textContent = S.live ? sess.email : '';
    $('#demoBar').hidden = S.live;
    await reload();
  }
  async function reload() {
    try {
      [settings, products] = await Promise.all([S.getSettings(), S.listProducts({ all: true })]);
    } catch (err) { toast('Erro ao carregar: ' + (err.message || err), true); return; }
    fillCatSelects(); renderList(); fillSettings();
  }
  $('#resetDemo').addEventListener('click', async () => { S.resetDemo(); await reload(); toast('Peças de exemplo restauradas.'); });

  /* ---------- tabs ---------- */
  $$('.a-tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.a-tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $('#tab-pecas').hidden = b.dataset.tab !== 'pecas'; $('#tab-config').hidden = b.dataset.tab !== 'config';
  }));

  /* ---------- list ---------- */
  function fillCatSelects() {
    const cats = settings.categories;
    $('#fCat').innerHTML = '<option value="">Todas as categorias</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
    const extra = products.map(p => p.category).filter(c => !cats.includes(c));
    $('#eCat').innerHTML = [...cats, ...new Set(extra)].map(c => `<option>${esc(c)}</option>`).join('');
  }
  function renderList() {
    const cat = $('#fCat').value, q = $('#fQ').value.trim().toLowerCase();
    const list = products.filter(p => (!cat || p.category === cat) && (!q || p.name.toLowerCase().includes(q)));
    $('#count').textContent = `${products.filter(p => p.active).length} visíveis · ${products.length} no total`;
    if (!list.length) { $('#list').innerHTML = `<div class="empty-a">${products.length ? 'Nenhuma peça com esse filtro.' : 'Nenhuma peça ainda. Toque em "+ Nova peça" para começar.'}</div>`; return; }
    $('#list').innerHTML = `<div class="row head"><span></span><span>Peça</span><span class="c-cat">Categoria</span><span class="c-vis">Visível</span><span>Destaque</span><span></span></div>` +
      list.map(p => `<div class="row${p.active ? '' : ' off'}" data-id="${esc(p.id)}">
        <img src="${esc(S.img(p.image_url))}" alt="" loading="lazy" decoding="async">
        <div class="nm">${esc(p.name)}<small>${p.active ? '' : 'Oculta · '}${p.price != null ? esc(S.price(p.price)) : 'Consulte o valor'}${(p.sizes || []).length ? ' · ' + esc(p.sizes.join(' ')) : ''}</small></div>
        <span class="c-cat">${esc(p.category)}</span>
        <span class="c-vis"><button class="switch" role="switch" aria-checked="${!!p.active}" data-act="active" aria-label="Visível no site"></button></span>
        <span><button class="ib star" aria-pressed="${!!p.featured}" data-act="featured" aria-label="Destaque no topo" title="Destaque no topo do site"><svg><use href="#i-star"/></svg></button></span>
        <span class="acts c-act"><button class="ib" data-act="edit" aria-label="Editar ${esc(p.name)}"><svg><use href="#i-edit"/></svg></button><button class="ib" data-act="del" aria-label="Excluir ${esc(p.name)}"><svg><use href="#i-del"/></svg></button></span>
      </div>`).join('');
  }
  $('#fCat').addEventListener('change', renderList);
  $('#fQ').addEventListener('input', renderList);
  $('#list').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const p = products.find(x => x.id === b.closest('.row').dataset.id); if (!p) return;
    const act = b.dataset.act;
    if (act === 'edit') return openEditor(p);
    if (act === 'del') return askDelete(p);
    const val = act === 'active' ? !p.active : !p.featured;
    try { await S.setField(p.id, act, val); await reload(); toast(act === 'active' ? (val ? 'Peça visível no site.' : 'Peça oculta do site.') : (val ? 'Peça em destaque no topo do site.' : 'Destaque removido.')); }
    catch (err) { toast(err.message || 'Erro ao salvar.', true); }
  });

  /* ---------- delete ---------- */
  let toDelete = null;
  function askDelete(p) { toDelete = p; $('#cText').textContent = `"${p.name}" será removida do catálogo. Isso não pode ser desfeito.`; $('#confirm').classList.add('open'); $('#cNo').focus(); }
  $('#cNo').addEventListener('click', () => $('#confirm').classList.remove('open'));
  $('#cYes').addEventListener('click', async () => {
    const btn = $('#cYes'); busy(btn, true, 'Excluindo...');
    try { await S.deleteProduct(toDelete); $('#confirm').classList.remove('open'); await reload(); toast('Peça excluída.'); }
    catch (err) { toast(err.message || 'Erro ao excluir.', true); }
    finally { busy(btn, false); }
  });

  /* ---------- editor ---------- */
  function setSwitch(el, on) { el.setAttribute('aria-checked', String(!!on)); }
  $$('.ed .switch').forEach(s => s.addEventListener('click', () => setSwitch(s, s.getAttribute('aria-checked') !== 'true')));
  function renderSizes(sel) {
    const all = [...SIZES, ...sel.filter(s => !SIZES.includes(s))];
    $('#eSizes').innerHTML = all.map(s => `<button type="button" aria-pressed="${sel.includes(s)}">${esc(s)}</button>`).join('');
  }
  $('#eSizes').addEventListener('click', e => { const b = e.target.closest('button'); if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); });
  function setPreview(src) {
    $('#dropImg').hidden = !src; $('#dropOv').hidden = !src; $('#dropTxt').hidden = !!src;
    if (src) $('#dropImg').src = src;
  }
  function openEditor(p) {
    editing = p || null; pendingImage = null;
    $('#edTitle').textContent = p ? 'Editar peça' : 'Nova peça';
    $('#eName').value = p ? p.name : '';
    $('#eCat').value = p ? p.category : settings.categories[0];
    $('#ePrice').value = p && p.price != null ? p.price : '';
    $('#eDesc').value = p ? p.description || '' : '';
    $('#ePos').value = p ? p.position || 0 : (Math.max(0, ...products.map(x => x.position || 0)) + 1);
    setSwitch($('#eActive'), p ? p.active : true); setSwitch($('#eFeat'), p ? p.featured : false);
    renderSizes(p ? p.sizes || [] : ['P', 'M', 'G']);
    setPreview(p ? S.img(p.image_url) : '');
    $('#file').value = '';
    $('#ed').classList.add('open'); $('#edBg').classList.add('open'); $('#ed').setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#eName').focus(), 80);
  }
  function closeEditor() { $('#ed').classList.remove('open'); $('#edBg').classList.remove('open'); $('#ed').setAttribute('aria-hidden', 'true'); }
  $('#newBtn').addEventListener('click', () => openEditor(null));
  $('#edClose').addEventListener('click', closeEditor); $('#edCancel').addEventListener('click', closeEditor); $('#edBg').addEventListener('click', closeEditor);
  addEventListener('keydown', e => { if (e.key === 'Escape') { closeEditor(); $('#confirm').classList.remove('open'); } });
  function takeFile(f) {
    if (!f || !/^image\//.test(f.type)) { toast('Escolha um arquivo de imagem (JPG, PNG ou WEBP).', true); return; }
    pendingImage = f; setPreview(URL.createObjectURL(f));
  }
  $('#file').addEventListener('change', e => takeFile(e.target.files[0]));
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => takeFile(e.dataTransfer.files[0]));

  $('#edForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#eName').value.trim();
    if (!name) { toast('Dê um nome para a peça.', true); $('#eName').focus(); return; }
    if (!pendingImage && !(editing && editing.image_url)) { toast('Escolha uma foto para a peça.', true); return; }
    const btn = $('#edSave'); busy(btn, true, pendingImage ? 'Enviando foto...' : 'Salvando...');
    try {
      let image_url = editing ? editing.image_url : null;
      if (pendingImage) image_url = await S.uploadImage(pendingImage);
      await S.saveProduct({
        id: editing && editing.id, name, category: $('#eCat').value, price: $('#ePrice').value,
        sizes: $$('#eSizes button[aria-pressed=true]').map(b => b.textContent),
        description: $('#eDesc').value.trim(), image_url,
        active: $('#eActive').getAttribute('aria-checked') === 'true', featured: $('#eFeat').getAttribute('aria-checked') === 'true',
        position: $('#ePos').value
      });
      closeEditor(); await reload(); toast(editing ? 'Peça atualizada.' : 'Peça adicionada ao catálogo.');
    } catch (err) { toast(err.message || 'Erro ao salvar.', true); }
    finally { busy(btn, false); }
  });

  /* ---------- settings ---------- */
  function fillSettings() {
    const f = $('#cfg');
    ['whatsapp', 'instagram', 'announcement', 'address', 'city'].forEach(k => { f.elements[k].value = settings[k] || ''; });
    f.elements.categories.value = settings.categories.join(', ');
    const order = [1, 2, 3, 4, 5, 6, 0];
    $('#hrs').innerHTML = order.map(d => {
      const h = settings.hours[d] || {}, closed = !h.open || !h.close;
      return `<strong style="font-weight:500">${S.DAYS[d]}</strong>
        <input type="time" data-d="${d}" data-k="open" value="${esc(h.open || '')}" aria-label="${S.DAYS[d]}: abre" ${closed ? 'disabled' : ''}>
        <input type="time" data-d="${d}" data-k="close" value="${esc(h.close || '')}" aria-label="${S.DAYS[d]}: fecha" ${closed ? 'disabled' : ''}>
        <label class="closed sw-wrap"><input type="checkbox" data-d="${d}" ${closed ? 'checked' : ''}> Fechado</label>`;
    }).join('');
    $$('#hrs input[type=checkbox]').forEach(c => c.addEventListener('change', () => {
      $$(`#hrs input[type=time][data-d="${c.dataset.d}"]`).forEach(i => { i.disabled = c.checked; if (!c.checked && !i.value) i.value = i.dataset.k === 'open' ? '09:00' : '18:00'; });
    }));
  }
  $('#cfg').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('[type=submit]');
    const hours = Array.from({ length: 7 }, (_, d) => {
      const closed = $(`#hrs input[type=checkbox][data-d="${d}"]`).checked;
      return { d, open: closed ? '' : $(`#hrs input[data-d="${d}"][data-k=open]`).value, close: closed ? '' : $(`#hrs input[data-d="${d}"][data-k=close]`).value };
    });
    const wa = f.elements.whatsapp.value.replace(/\D/g, '');
    if (wa.length < 12) { toast('WhatsApp precisa ter DDI + DDD + número. Ex.: 5515998009042', true); return; }
    const next = {
      ...settings, whatsapp: wa, instagram: f.elements.instagram.value.trim().replace(/^@/, ''),
      announcement: f.elements.announcement.value.trim(), address: f.elements.address.value.trim(), city: f.elements.city.value.trim() || 'Sorocaba, SP',
      categories: f.elements.categories.value.split(',').map(s => s.trim()).filter(Boolean), hours
    };
    busy(btn, true);
    try { await S.saveSettings(next); await reload(); toast('Informações salvas.'); }
    catch (err) { toast(err.message || 'Erro ao salvar.', true); }
    finally { busy(btn, false); }
  });

  start().catch(err => { show('login'); $('#lErr').textContent = 'Não foi possível conectar: ' + (err.message || err); });
})();
