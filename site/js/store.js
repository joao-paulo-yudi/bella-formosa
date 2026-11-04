/* Bella Formosa · data layer
   Supabase when /config.js has a URL and a publishable key; otherwise a demo store
   (seed data + this browser's localStorage) so the site and the panel work out of the box. */
(function () {
  const CFG = window.BF_CONFIG || {};
  const LIVE = !!(CFG.supabaseUrl && CFG.supabaseKey);
  const DEMO_KEY = 'bf-demo-v1';
  const BUCKET = 'produtos';
  let sb = null, seedCache = null;

  const DEFAULT_SETTINGS = {
    whatsapp: '5515998009042',
    instagram: 'bellaformosa89',
    announcement: 'Atendimento pelo WhatsApp · Sorocaba, SP',
    address: '',
    city: 'Sorocaba, SP',
    categories: ['Vestidos', 'Saias', 'Conjuntos', 'Blusas', 'Festa'],
    hours: [
      { d: 0, open: '', close: '' }, { d: 1, open: '', close: '' }, { d: 2, open: '', close: '' },
      { d: 3, open: '', close: '' }, { d: 4, open: '', close: '' }, { d: 5, open: '', close: '' },
      { d: 6, open: '', close: '' }
    ]
  };

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function rootPath() { return (window.BF_ROOT || '/'); }
  async function seed() {
    if (seedCache) return seedCache;
    const r = await fetch(rootPath() + 'data/seed.json', { cache: 'no-cache' });
    seedCache = await r.json();
    return seedCache;
  }
  function readDemo() { try { return JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch (e) { return null; } }
  function writeDemo(d) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(d)); } catch (e) { throw new Error('Sem espaço no navegador para salvar. Use imagens menores.'); } }
  async function demoData() {
    const d = readDemo();
    if (d) return d;
    const s = await seed();
    return { products: s.products.map(p => ({ ...p })), settings: { ...DEFAULT_SETTINGS, ...s.settings } };
  }
  function sortProducts(list) {
    return list.slice().sort((a, b) => (b.featured - a.featured) || ((a.position || 0) - (b.position || 0)) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }
  function mergeSettings(s) {
    const out = { ...DEFAULT_SETTINGS, ...(s || {}) };
    if (!Array.isArray(out.categories) || !out.categories.length) out.categories = DEFAULT_SETTINGS.categories.slice();
    if (!Array.isArray(out.hours) || out.hours.length !== 7) out.hours = DEFAULT_SETTINGS.hours.map(h => ({ ...h }));
    return out;
  }
  function uuid() { return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2)); }

  /* resize an image File to a JPEG Blob (max side px) */
  function resizeImage(file, max = 1400, q = 0.85) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? res(b) : rej(new Error('Não foi possível ler a imagem.')), 'image/jpeg', q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Arquivo de imagem inválido.')); };
      img.src = url;
    });
  }
  const blobToDataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });

  const Store = {
    live: LIVE,
    async init() {
      if (!LIVE || sb) return;
      if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
    },

    /* ---------- public ---------- */
    async listProducts(opts = {}) {
      if (!LIVE) {
        const d = await demoData();
        return sortProducts(d.products.filter(p => opts.all || p.active));
      }
      await this.init();
      let q = sb.from('products').select('*');
      if (!opts.all) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return sortProducts(data || []);
    },
    async getSettings() {
      if (!LIVE) return mergeSettings((await demoData()).settings);
      await this.init();
      const { data, error } = await sb.from('settings').select('data').eq('id', 1).maybeSingle();
      if (error) throw error;
      return mergeSettings(data && data.data);
    },

    /* ---------- admin ---------- */
    async session() {
      if (!LIVE) return sessionStorage.getItem('bf-demo-auth') ? { email: 'demonstracao' } : null;
      await this.init();
      const { data } = await sb.auth.getSession();
      return data.session ? { email: data.session.user.email } : null;
    },
    async signIn(email, password) {
      if (!LIVE) { sessionStorage.setItem('bf-demo-auth', '1'); return { email: 'demonstracao' }; }
      await this.init();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
      const ok = await this.isAdmin();
      if (!ok) { await sb.auth.signOut(); throw new Error('Este e-mail não tem acesso ao painel. Veja o README para liberar.'); }
      return { email: data.user.email };
    },
    async isAdmin() {
      if (!LIVE) return true;
      const { data, error } = await sb.rpc('is_admin');
      return !error && data === true;
    },
    async resetPassword(email) {
      if (!LIVE) return;
      await this.init();
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + rootPath() + 'admin/' });
      if (error) throw error;
    },
    async updatePassword(pw) {
      await this.init();
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;
    },
    onAuth(fn) { if (LIVE && sb) sb.auth.onAuthStateChange((ev, s) => fn(ev, s)); },
    async signOut() {
      if (!LIVE) { sessionStorage.removeItem('bf-demo-auth'); return; }
      await sb.auth.signOut();
    },
    async uploadImage(file) {
      if (!LIVE) return blobToDataURL(await resizeImage(file, 900, 0.8));
      const blob = await resizeImage(file);
      const path = uuid() + '.jpg';
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (error) throw error;
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
    async saveProduct(p) {
      const row = {
        name: String(p.name || '').trim(), category: p.category, price: p.price === '' || p.price == null ? null : Number(p.price),
        sizes: p.sizes || [], description: p.description || '', image_url: p.image_url || null,
        active: !!p.active, featured: !!p.featured, position: Number(p.position) || 0
      };
      if (!row.name) throw new Error('Dê um nome para a peça.');
      if (!LIVE) {
        const d = await demoData();
        if (row.featured) d.products.forEach(x => { x.featured = false; });
        if (p.id) { const i = d.products.findIndex(x => x.id === p.id); d.products[i] = { ...d.products[i], ...row }; }
        else d.products.push({ id: uuid(), created_at: new Date().toISOString(), ...row });
        writeDemo(d); return;
      }
      if (row.featured) await sb.from('products').update({ featured: false }).neq('id', p.id || '00000000-0000-0000-0000-000000000000');
      row.updated_at = new Date().toISOString();
      const { error } = p.id ? await sb.from('products').update(row).eq('id', p.id) : await sb.from('products').insert(row);
      if (error) throw error;
    },
    async setField(id, field, value) {
      if (!LIVE) {
        const d = await demoData();
        if (field === 'featured' && value) d.products.forEach(x => { x.featured = false; });
        const it = d.products.find(x => x.id === id); if (it) it[field] = value; writeDemo(d); return;
      }
      if (field === 'featured' && value) await sb.from('products').update({ featured: false }).neq('id', id);
      const { error } = await sb.from('products').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    async deleteProduct(p) {
      if (!LIVE) { const d = await demoData(); d.products = d.products.filter(x => x.id !== p.id); writeDemo(d); return; }
      const { error } = await sb.from('products').delete().eq('id', p.id);
      if (error) throw error;
      const m = /\/storage\/v1\/object\/public\/produtos\/(.+)$/.exec(p.image_url || '');
      if (m) await sb.storage.from(BUCKET).remove([decodeURIComponent(m[1])]).catch(() => {});
    },
    async saveSettings(s) {
      const clean = mergeSettings(s);
      if (!LIVE) { const d = await demoData(); d.settings = clean; writeDemo(d); return; }
      const { error } = await sb.from('settings').upsert({ id: 1, data: clean, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    resetDemo() { localStorage.removeItem(DEMO_KEY); },

    /* ---------- helpers shared by site and panel ---------- */
    waLink(number, text) { return 'https://wa.me/' + String(number || '').replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : ''); },
    price(v) { return v == null || v === '' ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); },
    img(u) { if (!u) return ''; return /^(https?:|data:)/.test(u) ? u : rootPath() + u.replace(/^\//, ''); },
    DAYS: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  };
  window.BFStore = Store;
})();
