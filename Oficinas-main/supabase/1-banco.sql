-- =====================================================================
-- Ranking de Oficinas · Banco de dados completo (Supabase)
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Pode rodar mais de uma vez sem apagar dados.
-- =====================================================================

-- 1) Oficinas
create table if not exists oficinas (
  id    text primary key,
  nome  text not null,
  ativa boolean not null default true,
  ordem integer
);
alter table oficinas add column if not exists descredenciada    boolean default false;
alter table oficinas add column if not exists motivo            text;
alter table oficinas add column if not exists descredenciada_em date;

-- 2) Avaliações mensais (notas)
create table if not exists avaliacoes (
  key           text primary key,              -- mês + oficina, ex.: 2026-10__recami-autos
  mes           text not null,                 -- ex.: 2026-10
  oficina_id    text not null references oficinas(id),
  q numeric, p numeric, s numeric, o numeric, d numeric, e numeric,
  carros numeric, refeitos numeric, atrasos numeric, nota_cliente numeric, extras numeric,
  obs           text,
  atualizado_em timestamptz default now()
);

-- 3) Financeiro (veículos por oficina e mês)
create table if not exists veiculos (
  id          text primary key,
  mes         text not null,
  oficina_id  text not null references oficinas(id),
  placa       text,
  descricao   text,
  franquia    numeric,
  liquido     numeric,
  pecas       numeric,
  obs         text,
  criado_em   timestamptz default now()
);
alter table veiculos add column if not exists pago numeric;
alter table veiculos add column if not exists complemento numeric;

-- 4) Permissões: só usuários logados (login do site) acessam os dados
alter table oficinas   enable row level security;
alter table avaliacoes enable row level security;
alter table veiculos   enable row level security;
drop policy if exists "site" on oficinas;   drop policy if exists "equipe" on oficinas;
drop policy if exists "site" on avaliacoes; drop policy if exists "equipe" on avaliacoes;
drop policy if exists "site" on veiculos;   drop policy if exists "equipe" on veiculos;
create policy "equipe" on oficinas   for all to authenticated using (true) with check (true);
create policy "equipe" on avaliacoes for all to authenticated using (true) with check (true);
create policy "equipe" on veiculos   for all to authenticated using (true) with check (true);
revoke all on oficinas, avaliacoes, veiculos from anon;
grant select, insert, update         on oficinas, avaliacoes to authenticated;
grant select, insert, update, delete on veiculos             to authenticated;

-- 5) Oficinas iniciais
insert into oficinas (id, nome, ordem) values
  ('recami-autos','RECAMI AUTOS',1), ('tecauto-autos','TECAUTO AUTOS',2), ('dg-motocross','DG MOTOCROSS',3),
  ('ediglei-moto','EDIGLEI MOTO',4), ('rbp-autos','RBP AUTOS',5), ('f-guerreiro-autos','F. GUERREIRO AUTOS',6),
  ('rrx-reparadora','RRX REPARADORA',7), ('easy-math-autos','EASY MATH AUTOS',8), ('retocar-autos','RETOCAR AUTOS',9)
on conflict (id) do nothing;
