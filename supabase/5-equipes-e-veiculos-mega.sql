-- =====================================================================
-- Equipes (quem vê cada aba) + aba Veículos Mega (histórico de reparos)
-- Rode DEPOIS dos SQLs 1 a 4. Pode rodar mais de uma vez sem apagar dados.
-- =====================================================================

-- 1) Equipes e as abas que cada uma pode ver e lançar
--    Códigos das abas: mes (Avaliação), hist (Histórico), fin (Financeiro),
--    dev (Devedores), frota (Veículos Mega), crit (Critérios)
create table if not exists equipes (
  id    text primary key,
  nome  text not null,
  abas  text[] not null default '{}',
  ordem integer
);
insert into equipes (id, nome, abas, ordem) values
  ('notas',               'Notas',                  '{mes,hist,fin,dev,frota,crit}', 1),
  ('despachante',         'Despachante',            '{frota}',                       2),
  ('autorizacao-reparos', 'Autorização de reparos', '{}',                            3),
  ('vidro',               'Vidro',                  '{}',                            4),
  ('atendimento',         'Atendimento',            '{}',                            5)
on conflict (id) do nothing;

-- 2) Cada pessoa pode estar em uma ou mais equipes (soma as abas de todas)
alter table perfis add column if not exists equipes text[] not null default '{}';
-- Se já rodou a versão antiga deste SQL (uma equipe só), aproveita o que estava marcado
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'perfis' and column_name = 'equipe') then
    execute 'update perfis set equipes = array[equipe] where equipe is not null and cardinality(equipes) = 0';
  end if;
end $$;
-- Quem já tinha acesso continua vendo tudo (equipe Notas)
update perfis set equipes = array['notas'] where cardinality(equipes) = 0 and status = 'aprovado' and not admin;

-- 3) Checagem: a pessoa pode usar esta aba? (administradora pode tudo)
create or replace function public.pode(aba text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis p left join equipes e on e.id = any(p.equipes)
    where p.user_id = auth.uid() and p.status = 'aprovado'
      and (p.admin or aba = any(e.abas))
  )
$$;

-- 4) Equipes: todos logados leem; só administradora cria/edita/exclui
alter table equipes enable row level security;
drop policy if exists "ler equipes" on equipes;
drop policy if exists "admin equipes" on equipes;
create policy "ler equipes"   on equipes for select to authenticated using (true);
create policy "admin equipes" on equipes for all    to authenticated using (e_admin()) with check (e_admin());
revoke all on equipes from anon;
grant select, insert, update, delete on equipes to authenticated;

-- 5) Bloqueio no banco, aba por aba
-- Oficinas: leem as abas de oficina; só a Avaliação cadastra/edita
drop policy if exists "aprovados" on oficinas; drop policy if exists "equipe" on oficinas;
drop policy if exists "ler" on oficinas; drop policy if exists "gravar" on oficinas; drop policy if exists "alterar" on oficinas;
create policy "ler"     on oficinas for select to authenticated using (pode('mes') or pode('hist') or pode('fin') or pode('dev'));
create policy "gravar"  on oficinas for insert to authenticated with check (pode('mes'));
create policy "alterar" on oficinas for update to authenticated using (pode('mes')) with check (pode('mes'));

-- Avaliações: Avaliação e Histórico leem; só a Avaliação grava
drop policy if exists "aprovados" on avaliacoes; drop policy if exists "equipe" on avaliacoes;
drop policy if exists "ler" on avaliacoes; drop policy if exists "gravar" on avaliacoes; drop policy if exists "alterar" on avaliacoes;
create policy "ler"     on avaliacoes for select to authenticated using (pode('mes') or pode('hist'));
create policy "gravar"  on avaliacoes for insert to authenticated with check (pode('mes'));
create policy "alterar" on avaliacoes for update to authenticated using (pode('mes')) with check (pode('mes'));

-- Financeiro
drop policy if exists "aprovados" on veiculos; drop policy if exists "equipe" on veiculos;
drop policy if exists "aba" on veiculos;
create policy "aba" on veiculos for all to authenticated using (pode('fin')) with check (pode('fin'));

-- Devedores
drop policy if exists "aprovados" on dividas; drop policy if exists "aba" on dividas;
create policy "aba" on dividas for all to authenticated using (pode('dev')) with check (pode('dev'));

-- 6) Veículos Mega (histórico de reparos por placa)
create table if not exists frota_veiculos (
  id         text primary key,
  placa      text not null,
  veiculo    text,
  em_uso_com text,
  reparos    jsonb default '[]',   -- [{data, descricao, valor}]
  obs        text,
  criado_em  timestamptz default now()
);
alter table frota_veiculos enable row level security;
drop policy if exists "aba" on frota_veiculos;
create policy "aba" on frota_veiculos for all to authenticated using (pode('frota')) with check (pode('frota'));
revoke all on frota_veiculos from anon;
grant select, insert, update, delete on frota_veiculos to authenticated;

-- Dados importados da planilha "VEÍCULOS MEGA - HISTÓRICO DE REPAROS"
insert into frota_veiculos (id, placa, veiculo, em_uso_com, reparos) values
  ('rnz0h40', 'RNZ0H40', 'VOYAGE (REM + LEILAO)', 'ANA KARLA', '[{"data": "2026-09-18", "descricao": "REPAROS REALIZADOS NA PGS2 - 2 un NAKATA AMORTECEDOR DIANTEIRO, 1 un NGK CABO VELA, 4 un NGK VELA IGNICAO, 4 un OLEO MOTOR IPIRANGA, 1 un FILTRO DE ÓLEO, 2 un AXIOS KIT AMORTECEDOR DIANTEIRO, 1 un MAGNETI MARELLI BIELETA, 1 un SKF ARTICULACAO", "valor": 1685.77}]'::jsonb),
  ('srr3i31', 'SRR3I31', 'FIAT FIORINO ENURANCE', 'DIEGO ROCHA', '[{"data": "2026-09-25", "descricao": "REPAROS REALIZADOS NA PGS2 - 4 un LITROS DE OLEO MOTOR, 1 un FILTRO DE ÓLEO", "valor": 200.0}]'::jsonb),
  ('qny6d10', 'QNY6D10', 'FORD/KA SE 1.0 HA B (REMARCADA CHASSI)', 'DIEGO ROCHA', '[{"data": "2026-09-28", "descricao": "REPAROS REALIZADOS NA PGS2 - MACARRÃO", "valor": 20.0}, {"data": "2026-10-27", "descricao": "COMPRA NA RRON - OLEO/FILTRO DE OLEO/ FILTRO DE AR MOTOR/ FILTRO DE CABINE/FILTRO DE COMBUSTIVEL/PASTILHA DE FREIO/ VELA", "valor": 453.86}, {"data": "2026-10-28", "descricao": "REPAROS REALIZADOS NA PGS - 1 un PASTILHA DE FREIO, 1 un TROCA DE ÓLEO, 1 un FILTRO DE ÓLEO, 1 un FILTRO DE COMBUSTÍVEL, 1 un FILTRO AR DO MOTOR, 1 un FILTRO AR CONDICIONADO, 1un VELA", "valor": 250.0}, {"data": "2026-11-06", "descricao": "REPAROS REALIZADO NA PGS - 1 un BOBINA DE IGNIÇÃO", "valor": 468.63}]'::jsonb),
  ('qqs0e34', 'QQS0E34', 'RENAULT LOGAN', 'RODRIGO', '[{"data": "2026-09-29", "descricao": "REPAROS REALIZADOS NA PGS2 - CORREIA POLI V, CORREIA DO ALTERNADOR", "valor": 120.0}, {"data": "2026-10-01", "descricao": "REPAROS REALIZADOS NA PGS2 - 1 un POLIA DO VIRABREQUIM, 1 SERVIÇO, 1 un MANGUEIRA INFERIOR DO RADIADOR, 2un ADITIVO PARAFLU, 1 SERVIÇO, 1 un EMBREAGEM AR CONDICIONADO", "valor": 1724.0}, {"data": "2026-10-06", "descricao": "REPAROS REALIZADOS NA PGS2 - 1 un BICO INJETOR, SERVIÇO", "valor": 260.0}, {"data": "2026-10-27", "descricao": "REPAROS REALIZADOS NA PGS - REPARO NO AR CONDICIONADO", "valor": 80.0}]'::jsonb),
  ('qpl8f21', 'QPL8F21', 'FORD KÁ SE 1.5 SD C', 'VEICULO PARA VENDA', '[{"data": "2026-10-02", "descricao": "REPAROS REALIZADOS NA PGS2 - HIGENIZAÇÃO", "valor": 150.0}, {"data": "2026-10-07", "descricao": "REPAROS REALIZADOS NA PGS2 - 2 un BIELETA, 1 un PASTILHA DE FREIO, 1 un DISCO DE FREIO, 1un SERVIÇO BIELETA, 1 un SERVIÇO DISCO E PASTILHA", "valor": 848.95}]'::jsonb),
  ('nmc5a12', 'NMC5A12', 'LAND ROVER - LR DISCOVERY 4 2.7 S', 'VEICULO PARA VENDA', '[{"data": "2026-10-22", "descricao": "REPAROS REALIZADOS NA PGS2 - HIGENIZAÇÃO", "valor": 180.0}]'::jsonb),
  ('kwg8h49', 'KWG8H49', 'CITROEN C3 AIRCROSS EXCA', 'FLAVIO RRON XERÉM', '[{"data": "2026-10-27", "descricao": "REPAROS REALIZADOS NA PGS2 - 1 un CORREIA DENTADA, 1 un CORREIA POLY V, 1 un TROCA DE ÓLEO, 1 un FILTRO DE ÓLEO, 1un FILTRO DE CAMBUSTÍVEL, 1un FILTRO DE AR MOTOR, 1 un FILTRO AR CONDICIONADO, 1 un TRIZETA", "valor": 590.0}]'::jsonb),
  ('kxy9g12', 'KXY9G12', 'I/KIA CERATO FF SX3 ATNB', 'ANDRÉ SANTANA DEVOLVEU O VEÍCULO, DESISTIU DA COMPRA', '[{"data": "2026-10-09", "descricao": "REPAROS REALIZADOS NA PGS - 1 un PORTA ESCOVA DO MOTOR DE ARRANQUE, 1un TAMPA DA BUCHA DO MOTOR DE ARRANQUE, 1un CARGA DE GÁS AR CONDICIONADO, 1 un LAVAGEM", "valor": 620.0}]'::jsonb),
  ('rje7e92', 'RJE7E92', 'NIVUS', null, '[{"data": "2026-11-04", "descricao": "COMPRA NA RRON - OLEO MOTOR/ CORREIA POLY V/ FILTRO DE OLEO/ TENSOR POLI V 6PK1000/ CORREIA 6PK 1500 DO FORD KA", "valor": 984.4}, {"data": "2026-11-06", "descricao": "REPAROS REALIZADOS PELA PGS - 1 un TROCA DA CORREIA POLY V E ESTICADOR, 1 un TROCA DE ÓLEO, 1un FILTRO DE ÓLEO", "valor": 190.0}]'::jsonb),
  ('luc3g57', 'LUC3G57', 'PRISMA (REMARCADO)', 'RENATA ADOLFO', '[{"data": "2026-11-16", "descricao": "REPAROS REALIZADO NA PGS - 1 un CORREIA DENTADA, 1 un CORREIA POLY V, 1un LAVAGEM, 1un LAVAGEM", "valor": 500.0}]'::jsonb),
  ('kye9h66', 'KYE9H66', 'FIAT/MOBI LIKE', 'JOAO VITOR GHS2  - BRANCA', '[{"data": "2026-11-16", "descricao": "REPARO REALIZADO NA PGS - SENSOR NIVEL R$ 105,00 COMPRADO PELO SANDRINHO - AGUARDANDO VALOR MÃO DE OBRA PGS (BOIA DE COMBUSTÍVEL)", "valor": 120.0}]'::jsonb),
  ('kxu9h86', 'KXU9H86', 'HONDA CG 160 TITAN (REMARCADA)', 'THIAGO - POSTO WEB', '[{"data": "2026-10-29", "descricao": "REPAROS REALIZADO NO CASTOR - TROCA DO MANICOTO DA EMBREAGEM R$50,00 ; 06/11/2026 SERVIÇO DE TROCA DO KIT DE RELAÇÃOR$ R$70,00;", "valor": 120.0}]'::jsonb),
  ('rjj8j00', 'RJJ8J00', 'HONDA CG 160 FAN', 'GERSON - POSTO WEB', '[{"data": "2026-10-29", "descricao": "REPARO REALIZADO NO CASTOR - 1 JOGO DE PATILHA DIANTEIRA R$ 40,00 e MÃO DE OBRA R$ 30,00, TROCA DO COXIM DA COROA R$ 70,00 ; 07/11/2026 SERVIÇO DE TROCA DO KIT DE RELAÇÃO;", "valor": 210.0}]'::jsonb),
  ('rji1f62', 'RJI1F62', 'YAMAHA YBR 150 FACTOR', 'JOÃO PABLO - POSTO WEB', '[{"data": "2026-10-29", "descricao": "REPARO REALIZADO NO CASTOR - 1 KIT DA RELAÇÃO R$ 120,00, 1 COXIN DA COROA R$ 25,00 e MÃO DE OBRA R$ 100,00 ;", "valor": 245.0}]'::jsonb),
  ('rit7e22', 'RIT7E22', 'HONDA NXR 160 BROS', 'MAICON', '[{"data": "2026-10-14", "descricao": "1 PASTILHA DIANTEIRA R$ 40,00, MÃO DE OBRA R$ 30,00", "valor": 70.0}]'::jsonb),
  ('rjm6b32', 'RJM6B32', 'HONDA/NXR 160 BROS ESDD', 'ANDRE - POSTO WEB', '[{"data": "2026-11-04", "descricao": "REPARO REALIZADO NO CASTOR - KIT RELAÇÃO R$ 70,00", "valor": 70.0}]'::jsonb),
  ('rjf1d54', 'RJF1D54', 'HONDA/CG 160 TITAN', 'VENDIDA - CINTHIA POSTO WEB', '[{"data": "2026-10-20", "descricao": "PEÇA RETIRADA NA RRON - BATERIA AM5-G", "valor": 190.0}]'::jsonb)
on conflict (id) do nothing;
