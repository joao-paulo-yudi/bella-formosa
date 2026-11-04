-- Bella Formosa · banco de dados do catálogo (Supabase)
-- Cole este arquivo inteiro em Supabase > SQL Editor > New query e clique em Run.
-- Pode rodar de novo sem problema: ele não apaga nada que já exista.

-- 1) Quem pode entrar no painel ---------------------------------------------
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;
drop policy if exists "admin le o proprio registro" on public.admins;
create policy "admin le o proprio registro" on public.admins
  for select to authenticated using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Peças do catálogo -------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  category    text not null default 'Vestidos',
  price       numeric(10,2) check (price is null or price >= 0),
  sizes       text[] not null default '{}',
  description text not null default '' check (char_length(description) <= 600),
  image_url   text,
  active      boolean not null default true,
  featured    boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists "todos veem pecas visiveis" on public.products;
create policy "todos veem pecas visiveis" on public.products for select using (active or public.is_admin());
drop policy if exists "admin cria pecas" on public.products;
create policy "admin cria pecas" on public.products for insert to authenticated with check (public.is_admin());
drop policy if exists "admin edita pecas" on public.products;
create policy "admin edita pecas" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin exclui pecas" on public.products;
create policy "admin exclui pecas" on public.products for delete to authenticated using (public.is_admin());

-- 3) Informações da loja (WhatsApp, endereço, horários, categorias) --------
create table if not exists public.settings (
  id         integer primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
drop policy if exists "todos leem configuracoes" on public.settings;
create policy "todos leem configuracoes" on public.settings for select using (true);
drop policy if exists "admin cria configuracoes" on public.settings;
create policy "admin cria configuracoes" on public.settings for insert to authenticated with check (public.is_admin());
drop policy if exists "admin edita configuracoes" on public.settings;
create policy "admin edita configuracoes" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4) Fotos das peças (Storage) -----------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "fotos publicas" on storage.objects;
create policy "fotos publicas" on storage.objects for select using (bucket_id = 'produtos');
drop policy if exists "admin envia fotos" on storage.objects;
create policy "admin envia fotos" on storage.objects for insert to authenticated with check (bucket_id = 'produtos' and public.is_admin());
drop policy if exists "admin troca fotos" on storage.objects;
create policy "admin troca fotos" on storage.objects for update to authenticated using (bucket_id = 'produtos' and public.is_admin());
drop policy if exists "admin apaga fotos" on storage.objects;
create policy "admin apaga fotos" on storage.objects for delete to authenticated using (bucket_id = 'produtos' and public.is_admin());

-- 5) Dados iniciais (só entram se as tabelas estiverem vazias) --------------
insert into public.settings (id, data) values (1, '{
  "whatsapp": "5515998009042", "instagram": "bellaformosa89",
  "announcement": "Atendimento pelo WhatsApp · Sorocaba, SP",
  "address": "", "city": "Sorocaba, SP",
  "categories": ["Vestidos","Saias","Conjuntos","Blusas","Festa"],
  "hours": [{"d":0,"open":"","close":""},{"d":1,"open":"","close":""},{"d":2,"open":"","close":""},{"d":3,"open":"","close":""},{"d":4,"open":"","close":""},{"d":5,"open":"","close":""},{"d":6,"open":"","close":""}]
}'::jsonb) on conflict (id) do nothing;

insert into public.products (name, category, sizes, description, image_url, featured, position)
select * from (values
  ('Vestido Ameixa Plissado','Vestidos',array['P','M','G','GG'],'Vestido longo em crepe fluido, manga longa, gola redonda e saia plissada até o tornozelo. Acompanha cinto fino do mesmo tecido.','img/seed/p1-vestido.jpg',true,1),
  ('Saia Midi Plissada Rosé','Saias',array['P','M','G'],'Saia midi em cetim plissado rosé, cintura alta, comprimento abaixo do joelho. Combina com camisas e blusas claras.','img/seed/p2-saia.jpg',false,2),
  ('Conjunto Linho Marfim','Conjuntos',array['P','M','G','GG'],'Túnica longa com faixa e saia evasê midi em linho texturizado marfim. Leve para o dia a dia e elegante para o culto.','img/seed/p3-conjunto.jpg',false,3),
  ('Blusa Laço Champagne','Blusas',array['P','M','G'],'Blusa em cetim champagne com laço na gola e mangas bufantes. Mostrada com saia lápis marinho.','img/seed/p4-blusa.jpg',false,4),
  ('Vestido Longo Esmeralda','Festa',array['P','M','G'],'Vestido de festa em cetim verde esmeralda, mangas longas em chiffon e saia fluida até o chão. Para casamentos e ocasiões especiais.','img/seed/p5-festa.jpg',false,5)
) as v(name, category, sizes, description, image_url, featured, position)
where not exists (select 1 from public.products);

-- 6) LIBERE O SEU E-MAIL NO PAINEL ------------------------------------------
-- Troque pelo e-mail da loja e rode só esta linha (depois de criar o usuário em Authentication > Users):
-- insert into public.admins (email) values ('email-da-loja@exemplo.com');
