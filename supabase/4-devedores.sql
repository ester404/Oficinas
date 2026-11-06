-- =====================================================================
-- Devedores: tabela de dívidas das oficinas + dados da planilha
-- "Controle de Devedores - Oficina". Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists dividas (
  id          text primary key,
  devedor     text not null,          -- oficina ou pessoa que deve
  referente   text,                   -- veículo, placa ou motivo
  valor_total numeric,
  descontos   jsonb default '[]',     -- [{data, placa, valor, obs}]
  obs         text,
  criado_em   timestamptz default now()
);

alter table dividas enable row level security;
drop policy if exists "aprovados" on dividas;
create policy "aprovados" on dividas for all to authenticated using (e_aprovado()) with check (e_aprovado());
revoke all on dividas from anon;
grant select, insert, update, delete on dividas to authenticated;

-- Dados importados da planilha
insert into dividas (id, devedor, referente, valor_total, descontos, obs) values
  ('castor-motos', 'Castor - Motos', 'Honda PCX150 (LMD0G98)', 8000.0, '[{"data": "2023-12-08", "placa": "RKV0D23", "valor": 500.0, "obs": ""}, {"data": "2024-01-10", "placa": "KZR5F03", "valor": 500.0, "obs": ""}, {"data": "2024-02-26", "placa": "RIR5J39", "valor": 500.0, "obs": ""}, {"data": "2024-04-24", "placa": "RIX4J04", "valor": 500.0, "obs": ""}, {"data": "2024-05-10", "placa": "RJX7H08", "valor": 500.0, "obs": ""}, {"data": "2024-06-10", "placa": "SQU6E94", "valor": 500.0, "obs": ""}, {"data": "2024-07-17", "placa": "RIZ5A72", "valor": 500.0, "obs": ""}, {"data": "2024-09-10", "placa": "RKC5D39", "valor": 500.0, "obs": ""}, {"data": "2024-10-10", "placa": "KYE7A54", "valor": 500.0, "obs": ""}, {"data": "2024-11-08", "placa": "LUC8A57", "valor": 500.0, "obs": ""}, {"data": "2025-01-15", "placa": "KZI6E26", "valor": 500.0, "obs": ""}, {"data": "2025-03-24", "placa": "RKH9J74", "valor": 0.0, "obs": "Cancelado no caderno original (não descontado)"}, {"data": "2025-05-08", "placa": "SRX1H39", "valor": 500.0, "obs": ""}, {"data": "2025-07-25", "placa": "RIT6E23", "valor": 500.0, "obs": ""}, {"data": "2026-08-15", "placa": "SQY5H02", "valor": 500.0, "obs": ""}, {"data": "2026-09-14", "placa": "RJZ3J33", "valor": 500.0, "obs": ""}]'::jsonb, 'Nota: caderno menciona renegociação (fechado em R$8.000) e Yamaha quitada por R$3.000 via troca - confirme o valor total da seção Motos.'),
  ('castor-sonata', 'Castor - Sonata', 'Hyundai Sonata 2012/2013 (KXF5271/KXF5C71)', 80000.0, '[{"data": "2025-03-24", "placa": "SRD8H60", "valor": 1000.0, "obs": ""}, {"data": "2025-04-28", "placa": "LLB1616", "valor": 1000.0, "obs": ""}, {"data": "2026-02-23", "placa": "SRP9G58", "valor": 1000.0, "obs": ""}, {"data": "2026-03-17", "placa": "SRG2B52", "valor": 1000.0, "obs": ""}, {"data": "2026-05-10", "placa": "SRE8G64", "valor": 1000.0, "obs": ""}, {"data": null, "placa": "", "valor": 2000.0, "obs": "abatido do outro veículo"}]'::jsonb, null),
  ('souza-motos', 'Souza Motos (Renan)', 'Honda NXR150 Bros (PFX6H92)', 8000.0, '[{"data": "2024-04-29", "placa": "RKF9F87", "valor": 500.0, "obs": ""}, {"data": "2024-06-10", "placa": "RJ03G83", "valor": 500.0, "obs": ""}, {"data": "2024-07-15", "placa": "LUH9E44", "valor": 500.0, "obs": ""}, {"data": "2024-08-12", "placa": "SQW7H74", "valor": 500.0, "obs": ""}, {"data": "2024-09-27", "placa": "RKP7F65", "valor": 500.0, "obs": ""}, {"data": "2025-07-10", "placa": "SQX1145", "valor": 500.0, "obs": ""}, {"data": "2025-07-10", "placa": "KYV9H07", "valor": 500.0, "obs": ""}]'::jsonb, null),
  ('alvaro', 'Álvaro', 'Vários veículos', 106411.36, '[{"data": "2026-07-10", "placa": "PZI8D73", "valor": 2000.0, "obs": ""}]'::jsonb, null),
  ('luiz-tecauto-3x', 'Luiz - Tecauto', 'Dívida a descontar em 3x', 3979.59, '[{"data": "2025-09-29", "placa": "", "valor": 1326.53, "obs": "Pagamento via PIX (WhatsApp) - valor estimado como 1/3 do total, confirme valor exato"}, {"data": "2026-08-03", "placa": "KWJ5B71", "valor": 1326.53, "obs": "deduzido duas vezes do mesmo veículo, divida quitada"}, {"data": "2026-08-03", "placa": "KWJ5B71", "valor": 1326.53, "obs": ""}]'::jsonb, null),
  ('luiz-tecauto-varias', 'Luiz - Tecauto', 'Várias dívidas', 7585.34, '[{"data": "2026-11-04", "placa": "RDP7D12", "valor": 1000.0, "obs": ""}, {"data": "2026-11-04", "placa": "RKB4A28", "valor": 1000.0, "obs": ""}]'::jsonb, null),
  ('vitor-alex', 'Vitor Alex (Fuscauto)', 'Montana - KWD7H71', 41971.0, '[]'::jsonb, null)
on conflict (id) do nothing;
