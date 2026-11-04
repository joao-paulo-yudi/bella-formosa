// Vercel build: fills the production URL into the page and writes /config.js from env vars.
// Env vars (Vercel > Settings > Environment Variables):
//   SUPABASE_URL               https://xxxx.supabase.co
//   SUPABASE_PUBLISHABLE_KEY   the publishable / anon key (never the secret / service_role key)
//   SITE_URL (optional)        https://www.seudominio.com.br  (default: the Vercel production URL)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site');
const env = process.env;
let site = (env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_URL ? 'https://' + env.VERCEL_URL : 'http://localhost:3000')).replace(/\/+$/, '');
const url = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const key = (env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '').trim();
function isSecret(k) {
  if (/^sb_secret_/.test(k)) return true;
  const p = k.split('.');
  if (p.length === 3) { try { return JSON.parse(Buffer.from(p[1], 'base64').toString()).role === 'service_role'; } catch (e) {} }
  return false;
}
if (key && isSecret(key)) { console.error('ERRO: SUPABASE_PUBLISHABLE_KEY é a chave SECRETA. Use a chave publishable/anon.'); process.exit(1); }
for (const f of ['index.html', 'robots.txt', 'sitemap.xml']) {
  const p = path.join(root, f);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split('__SITE_URL__').join(site));
}
fs.writeFileSync(path.join(root, 'config.js'),
  '/* gerado por build.js */\nwindow.BF_CONFIG = ' + JSON.stringify({ supabaseUrl: url, supabaseKey: key }) + ';\n');
console.log('site:', site, '| supabase:', url ? 'conectado' : 'modo demonstração');
