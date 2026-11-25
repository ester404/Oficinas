-- =====================================================================
-- Veículos enviados + Cadastro com aprovação
-- ANTES de rodar: troque SEU-EMAIL-AQUI pelo e-mail que você usa para entrar no site.
-- =====================================================================

-- 1) Lista de veículos enviados na avaliação do mês
alter table avaliacoes add column if not exists enviados jsonb;

-- 2) Perfis de acesso (quem pode usar o site)
create table if not exists perfis (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text,
  nome      text,
  status    text not null default 'pendente',   -- pendente | aprovado | recusado
  admin     boolean not null default false,
  criado_em timestamptz default now()
);

-- Quem cria conta entra automaticamente como "pendente"
create or replace function public.novo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (user_id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', ''))
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_perfil();

-- Usuários que já existiam
insert into perfis (user_id, email) select id, email from auth.users on conflict (user_id) do nothing;

-- Você vira administradora (aprovada)
update perfis set status = 'aprovado', admin = true where lower(email) = lower('SEU-EMAIL-AQUI');

-- 3) Funções de checagem
create or replace function public.e_aprovado() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where user_id = auth.uid() and status = 'aprovado')
$$;
create or replace function public.e_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where user_id = auth.uid() and status = 'aprovado' and admin)
$$;

-- 4) Só aprovados veem e mexem nos dados
drop policy if exists "equipe" on oficinas;   drop policy if exists "aprovados" on oficinas;
drop policy if exists "equipe" on avaliacoes; drop policy if exists "aprovados" on avaliacoes;
drop policy if exists "equipe" on veiculos;   drop policy if exists "aprovados" on veiculos;
create policy "aprovados" on oficinas   for all to authenticated using (e_aprovado()) with check (e_aprovado());
create policy "aprovados" on avaliacoes for all to authenticated using (e_aprovado()) with check (e_aprovado());
create policy "aprovados" on veiculos   for all to authenticated using (e_aprovado()) with check (e_aprovado());

-- 5) Perfis: cada um vê o seu; a administradora vê e aprova todos
alter table perfis enable row level security;
drop policy if exists "ver perfis" on perfis;
drop policy if exists "admin altera" on perfis;
create policy "ver perfis"   on perfis for select to authenticated using (user_id = auth.uid() or e_admin());
create policy "admin altera" on perfis for update to authenticated using (e_admin()) with check (e_admin());
revoke all on perfis from anon;
grant select, update on perfis to authenticated;
