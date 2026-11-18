# Ranking de Oficinas · Mega Seguros

Site interno para avaliar as oficinas todo mês e controlar o financeiro dos veículos.
Funciona em qualquer computador com internet, com login e aprovação de acesso.

## Estrutura

```
index.html            estrutura das telas (sem CSS nem JS dentro)
css/style.css         visual (cores e fontes nas variáveis do :root)
assets/logo-mega.png  logo usado no login e no menu
js/config.js          ← ÚNICO arquivo de configuração (URL e chave do Supabase)
js/util.js            constantes, formatação de datas e dinheiro
js/estado.js          dados carregados e mês selecionado
js/dados.js           conexão com o Supabase (login e banco) e modo local
js/avaliacao.js       aba Avaliação do mês (critérios, veículos enviados, resumo, exportar)
js/oficinas.js        editar, excluir, descredenciar e recredenciar oficinas
js/historico.js       aba Histórico
js/financeiro.js      aba Financeiro (saldos e compensação)
js/devedores.js       aba Devedores (dívidas e descontos por placa)
js/frota.js           aba Veículos Mega (painel + histórico de reparos por placa)
js/login.js           login, criar conta e espera de aprovação
js/acessos.js         aba Acessos (só administradora)
js/main.js            inicialização (mês, abas, arranque)
supabase/1-banco.sql  cria as tabelas
supabase/2-acessos.sql cadastro com aprovação + veículos enviados
supabase/3-excluir-acessos.sql permite excluir contas pela aba Acessos
supabase/4-devedores.sql  aba Devedores + dados da planilha de devedores
supabase/5-equipes-e-veiculos-mega.sql  equipes/abas + aba Veículos Mega
```

Os scripts são carregados em ordem no fim do `index.html` (main.js por último).

## Banco de dados (Supabase) — uma vez

1. SQL Editor → rodar `supabase/1-banco.sql` e depois `supabase/2-acessos.sql`
   (no 2, trocar `SEU-EMAIL-AQUI` pelo e-mail da administradora).
2. Authentication → Sign In / Providers: **Allow new users to sign up** ligado;
   em Email, **Confirm email** desligado.
3. Project Settings → API Keys: copiar a **Publishable key** para `js/config.js`.

## Publicar / atualizar (GitHub Pages)

```bash
git add .
git commit -m "atualização"
git push
```
Esperar 1–2 min e abrir o site com **Ctrl+F5**.

## Observações

- Novos usuários criam conta na tela de login e aparecem na aba **Acessos** para aprovação.
- Ver ou corrigir dados direto: Supabase → Table Editor.
- Plano grátis: o projeto pausa após 7 dias sem uso → entrar no Supabase e clicar em **Restore**.

## Equipes e abas (SQL 5)

Rodar `supabase/5-equipes-e-veiculos-mega.sql` no SQL Editor (uma vez). Ele:
- cria as equipes (Notas, Despachante, Autorização de reparos, Vidro, Atendimento);
- coloca quem já tinha acesso na equipe **Notas** (continua vendo tudo);
- cria a aba **Veículos Mega** com os dados da planilha de histórico de reparos;
- bloqueia no banco cada aba conforme a equipe (não é só esconder na tela).

Na aba **Acessos**: escolher a equipe de cada pessoa e marcar as abas de cada equipe.
A administradora sempre vê tudo.
