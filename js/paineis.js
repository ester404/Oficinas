/* Painéis de topo (cartões, gráficos e rankings) das abas Avaliação, Histórico, Financeiro e Acessos,
   no mesmo estilo do Painel de Veículos. Usam só os dados que já existem no sistema. */

const NIV_COR = { Diamante: "#2a9bb0", Ouro: "#e3a72f", Prata: "#9aa5a2", Bronze: "#d27a45" };
const qtd = (v) => String(Math.round(v));

// Média das notas do mês (só oficinas com nota).
function mediaMes(m) {
  const ns = oficinas.map((o) => total(rec(m, o.id))).filter((t) => t != null);
  return ns.length ? Math.round((ns.reduce((s, t) => s + t, 0) / ns.length) * 10) / 10 : null;
}
function rankingMes(m) {
  return oficinas
    .map((o) => ({ o, t: total(rec(m, o.id)) }))
    .filter((x) => x.t != null)
    .sort((a, b) => b.t - a.t);
}
function meses12(m) {
  const L = [];
  for (let i = 11; i >= 0; i--) L.push(addMonth(m, -i));
  return L;
}
const mesCurto = (k) => MESES[Number(k.slice(5)) - 1].slice(0, 3);
function nivelLista(m) {
  const c = { Diamante: 0, Ouro: 0, Prata: 0, Bronze: 0, "Sem nota": 0 };
  for (const o of oficinas) c[nivel(total(rec(m, o.id))) || "Sem nota"]++;
  return Object.entries(c).filter((x) => x[1]);
}
function roscaNiveis(m) {
  const L = nivelLista(m);
  const cores = L.map(([k]) => NIV_COR[k] || "#d5dcda");
  const h = gRosca(L, qtd(oficinas.length), "oficinas", (v) => qtd(v) + (v === 1 ? " oficina" : " oficinas"));
  // aplica as cores dos níveis
  let i = 0;
  return h.replace(/stroke="#[0-9a-f]{6}"/gi, () => 'stroke="' + cores[i++] + '"').replace(/background:#[0-9a-f]{6}/gi, (() => {
    let j = 0;
    return () => "background:" + cores[j++];
  })());
}
function caixa(ic, titulo, corpo, extra) {
  return (
    '<div class="pv-box"><h3 class="bx-t"><span class="bx-ic" aria-hidden="true">' + gSvg(ic) + "</span>" + titulo +
    (extra || "") + "</h3>" + corpo + "</div>"
  );
}
// Barras horizontais do ranking.
function barrasRanking(L, fmt, max) {
  if (!L.length) return '<p class="pv-vazio">Nenhuma nota lançada neste mês.</p>';
  max = max || Math.max(...L.map((x) => x.v), 1);
  return (
    '<div class="hb">' +
    L.map(
      (x, i) =>
        '<div class="hb-i"><span class="hb-n p' + (i + 1) + '">' + (i + 1) + '</span><b title="' + esc(x.nome) + '">' + esc(x.nome) +
        '</b><span class="hb-t"><i class="' + (x.cls || "") + '" style="width:' + Math.max(2, Math.round((x.v / max) * 100)) + '%"></i></span><em>' +
        fmt(x.v) + "</em></div>",
    ).join("") +
    "</div>"
  );
}

// ---------- Avaliação do mês ----------
function dashMes() {
  if (!$("mesDash")) return;
  const rk = rankingMes(mes),
    top = rk[0],
    med = mediaMes(mes),
    medAnt = mediaMes(addMonth(mes, -1));
  const avaliadas = rk.length,
    veics = oficinas.reduce((s, o) => s + envList(mes, o.id).length, 0),
    atr = oficinas.reduce((s, o) => s + atrasados(o.id), 0);
  const ms = meses12(mes);
  $("mesDash").innerHTML =
    '<div class="kcs k5">' +
    gKpi({
      ic: "trofeu",
      rotulo: "Classificação do mês",
      valor: top ? "1º lugar" : "—",
      sub: '<em class="kc-var">' + (top ? esc(top.o.nome) + " · " + nivel(top.t) : "Nenhuma nota ainda") + "</em>",
      tom: "dark",
    }) +
    gKpi({ ic: "check", rotulo: "Oficinas avaliadas", valor: avaliadas + " de " + oficinas.length, sub: '<em class="kc-var">' + veics + " veículo(s) no mês</em>" }) +
    gKpi({
      ic: "estrela",
      rotulo: "Pontuação média",
      valor: med == null ? "—" : fmtNota(med),
      sub: med != null && medAnt != null ? gVar(med, medAnt, "vs. mês anterior") : '<em class="kc-var">de 100 pontos</em>',
    }) +
    gKpi({ ic: "relogio", rotulo: "Veículos atrasados", valor: atr, sub: '<em class="kc-var">mais de ' + PRAZO_DIAS + " dias na oficina</em>", tom: atr ? "red" : "" }) +
    gKpi({ ic: "alerta", rotulo: "Descredenciadas", valor: descreds.length, sub: '<em class="kc-var">fora do ranking</em>' }) +
    "</div>" +
    '<div class="dsh-row">' +
    caixa(
      "grafico",
      "Evolução da pontuação média",
      gLinha(ms.map((k) => mediaMes(k) || 0), ms.map(mesCurto), 11, (v) => qtd(v) + " pts").replace(/R\$ ([\d.,]+)<\/text><\/g>$/, "$1</text></g>"),
      " <small>últimos 12 meses</small>",
    ) +
    caixa("check", "Distribuição por nível", roscaNiveis(mes), " <small>" + label(mes) + "</small>") +
    "</div>";
  // na dica do gráfico, mostra a nota (não reais)
  const tip = document.querySelector("#mesDash .pl-tip .b");
  if (tip) tip.textContent = med == null ? "Sem nota" : fmtNota(med) + " pontos";
}

// ---------- Histórico ----------
function dashHist() {
  if (!$("histDash")) return;
  const rk = rankingMes(mes),
    top = rk[0];
  const veics = oficinas.reduce((s, o) => s + envList(mes, o.id).length, 0),
    veicsAnt = oficinas.reduce((s, o) => s + envList(addMonth(mes, -1), o.id).length, 0);
  const med = mediaMes(mes),
    medAnt = mediaMes(addMonth(mes, -1));
  const porOf = oficinas
    .map((o) => [o.nome, envList(mes, o.id).length])
    .filter((x) => x[1])
    .sort((a, b) => b[1] - a[1]);
  const topo = porOf.slice(0, 5);
  if (porOf.length > 5) topo.push(["Outras", porOf.slice(5).reduce((s, x) => s + x[1], 0)]);
  $("histDash").innerHTML =
    '<div class="kcs">' +
    gKpi({
      ic: "trofeu",
      rotulo: "Melhor oficina do mês",
      valor: top ? esc(top.o.nome) : "—",
      sub: top ? '<span class="chip green">★ 1º lugar · ' + fmtNota(top.t) + " pts</span>" : '<em class="kc-var">Nenhuma nota ainda</em>',
    }) +
    gKpi({ ic: "chave", rotulo: "Oficinas no ranking", valor: rk.length + " de " + oficinas.length, sub: '<em class="kc-var">com nota em ' + label(mes) + "</em>" }) +
    gKpi({ ic: "carro", rotulo: "Veículos avaliados", valor: veics, sub: gVar(veics, veicsAnt, "vs. mês anterior") }) +
    gKpi({
      ic: "estrela",
      rotulo: "Média geral",
      valor: med == null ? "—" : fmtNota(med) + " pts",
      sub: med != null && medAnt != null ? gVar(med, medAnt, "vs. mês anterior") : '<em class="kc-var">de 100 pontos</em>',
    }) +
    "</div>" +
    '<div class="dsh-row">' +
    caixa(
      "grafico",
      "Desempenho das oficinas",
      barrasRanking(
        rk.slice(0, 6).map((x) => ({ nome: x.o.nome, v: x.t, cls: nivel(x.t) })),
        (v) => fmtNota(v) + " pts",
        100,
      ),
      " <small>" + label(mes) + "</small>",
    ) +
    caixa("carro", "Veículos avaliados por oficina", gRosca(topo, qtd(veics), "veículos", (v) => qtd(v) + (v === 1 ? " veículo" : " veículos"))) +
    "</div>";
}

// ---------- Financeiro ----------
function finTotMes(m) {
  const t = { rep: 0, pg: 0, pagar: 0, fr: 0, pc: 0 },
    por = [];
  for (const o of oficinas.concat(descreds)) {
    const f = fin(m, o.id);
    t.rep += f.lq + f.cp;
    t.pg += f.pg;
    t.pagar += f.pagar;
    t.fr += f.fr;
    t.pc += f.pc;
    if (f.lq + f.cp) por.push([o.nome, f.lq + f.cp]);
  }
  t.por = por.sort((a, b) => b[1] - a[1]);
  return t;
}
function dashFin() {
  if (!$("finDash")) return;
  const t = finTotMes(mes),
    ant = finTotMes(addMonth(mes, -1));
  const ano = mes.slice(0, 4),
    nm = Number(mes.slice(5));
  let gAno = 0,
    gAnoAnt = 0;
  for (let i = 1; i <= nm; i++) {
    gAno += finTotMes(ano + "-" + String(i).padStart(2, "0")).rep;
    gAnoAnt += finTotMes(Number(ano) - 1 + "-" + String(i).padStart(2, "0")).rep;
  }
  const ms = meses12(mes);
  const vals = ms.map((k) => finTotMes(k).rep);
  const topo = t.por.slice(0, 5);
  if (t.por.length > 5) topo.push(["Outras", t.por.slice(5).reduce((s, x) => s + x[1], 0)]);
  $("finDash").innerHTML =
    '<div class="kcs">' +
    gKpi({ ic: "saco", rotulo: "Reparos do mês", valor: money(t.rep), sub: gVar(t.rep, ant.rep, "vs. mês anterior", true) }) +
    gKpi({ ic: "check", rotulo: "Já pago", valor: money(t.pg), sub: '<em class="kc-var">no mês de ' + label(mes) + "</em>" }) +
    gKpi({ ic: "carteira", rotulo: "Total a pagar", valor: money(t.pagar), sub: '<em class="kc-var">peças: ' + money(t.pc) + "</em>", tom: t.pagar ? "amber" : "" }) +
    gKpi({ ic: "calendario", rotulo: "Gasto no ano", valor: money(gAno), sub: gVar(gAno, gAnoAnt, "vs. " + (Number(ano) - 1), true) }) +
    "</div>" +
    '<div class="dsh-row">' +
    caixa("grafico", "Evolução das despesas", gLinha(vals, ms.map(mesCurto), 11), " <small>reparos (líquido + complemento)</small>") +
    caixa("carteira", "Distribuição por oficina", gRosca(topo, money(t.rep), "no mês")) +
    "</div>";
}

// ---------- Acessos ----------
function dashAcc() {
  if (!$("accDash")) return;
  const pend = accRows.filter((x) => x.status === "pendente").length,
    ok = accRows.filter((x) => x.status === "aprovado"),
    adm = ok.filter((x) => x.admin).length;
  const L = equipes
    .map((e) => [e.nome, ok.filter((u) => !u.admin && (u.equipes || []).includes(e.id)).length])
    .filter((x) => x[1]);
  $("accDash").innerHTML =
    '<div class="kcs">' +
    gKpi({ ic: "pessoas", rotulo: "Pessoas com acesso", valor: ok.length, sub: '<em class="kc-var">' + adm + " administradora(s)</em>" }) +
    gKpi({ ic: "relogio", rotulo: "Aguardando aprovação", valor: pend, sub: '<em class="kc-var">' + (pend ? "aprove abaixo" : "nenhum pedido") + "</em>", tom: pend ? "amber" : "" }) +
    gKpi({ ic: "chave", rotulo: "Equipes", valor: equipes.length, sub: '<em class="kc-var">cada uma com suas abas</em>' }) +
    gKpi({
      ic: "check",
      rotulo: "Sem equipe",
      valor: ok.filter((u) => !u.admin && !(u.equipes || []).length).length,
      sub: '<em class="kc-var">aprovadas sem aba liberada</em>',
    }) +
    "</div>" +
    '<div class="dsh-row">' +
    caixa("pessoas", "Pessoas por equipe", gRosca(L, qtd(ok.length - adm), "pessoas", (v) => qtd(v) + (v === 1 ? " pessoa" : " pessoas"))) +
    '<div class="pv-box como"><h3 class="bx-t"><span class="bx-ic" aria-hidden="true">' + gSvg("estrela") +
    "</span>Como funciona?</h3><ul><li>Quem cria conta aparece aqui como pendente até ser aprovado.</li><li>Cada pessoa vê só as abas das equipes marcadas para ela.</li><li>A administradora vê tudo e pode mudar as abas de cada equipe.</li></ul></div>" +
    "</div>";
}

// Liga os painéis às telas que já existem.
(function () {
  const liga = (nome, fn) => {
    const orig = window[nome];
    if (typeof orig !== "function") return;
    window[nome] = function () {
      const r = orig.apply(this, arguments);
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
      return r;
    };
  };
  liga("renderComputed", dashMes);
  liga("renderHist", dashHist);
  liga("renderFin", dashFin);
  liga("renderAcc", dashAcc);
})();

// ---------- Critérios (conteúdo fixo, montado a partir dos pesos do sistema) ----------
function dashCrit() {
  if (!$("critDash")) return;
  const L = PTS.map(([k, p]) => [CRIT_TXT[k][0], p, CRIT_TXT[k][1]]);
  const soma = L.reduce((s, x) => s + x[1], 0);
  const pts = (v) => qtd(v) + " pts";
  $("critDash").innerHTML =
    '<div class="kcs">' +
    gKpi({ ic: "estrela", rotulo: "Total de critérios", valor: L.length, sub: '<em class="kc-var">todos ativos</em>' }) +
    gKpi({ ic: "check", rotulo: "Peso total", valor: soma + " pts", sub: '<em class="kc-var">nota máxima por veículo</em>' }) +
    gKpi({ ic: "grafico", rotulo: "Maior peso", valor: L[0][1] + " pts", sub: '<em class="kc-var">' + L[0][0] + "</em>" }) +
    gKpi({ ic: "trofeu", rotulo: "Níveis", valor: "4", sub: '<em class="kc-var">Bronze, Prata, Ouro e Diamante</em>' }) +
    "</div>" +
    '<div class="dsh-row">' +
    caixa("grafico", "Distribuição dos pesos", gRosca(L.map((x) => [x[0], x[1]]), soma + " pts", "peso total", pts)) +
    '<div class="pv-box como"><h3 class="bx-t"><span class="bx-ic" aria-hidden="true">' + gSvg("estrela") +
    "</span>Como funciona?</h3><p>Os critérios avaliam o serviço de cada veículo enviado para a oficina.</p><ul>" +
    "<li>Cada critério tem um peso; a soma dá 100 pontos por veículo.</li>" +
    "<li>A nota da oficina no mês é a média dos veículos avaliados.</li>" +
    "<li>A nota define o nível: Bronze, Prata, Ouro ou Diamante.</li></ul></div>" +
    "</div>" +
    '<div class="pv-box"><h3 class="bx-t"><span class="bx-ic" aria-hidden="true">' + gSvg("check") +
    '</span>Lista de critérios</h3><div class="scroll"><table class="pv-t"><thead><tr><th>#</th><th>Critério</th><th>Peso</th><th>Como é avaliado</th><th>Status</th></tr></thead><tbody>' +
    L.map(
      (x, i) =>
        "<tr><td>" + (i + 1) + "</td><td><b>" + x[0] + '</b></td><td><div class="wt"><span><i style="width:' + (x[1] / L[0][1]) * 100 + '%"></i></span><b>' +
        x[1] + " pts</b></div></td><td>" + x[2] + '</td><td><span class="chip green">Ativo</span></td></tr>',
    ).join("") +
    "</tbody></table></div></div>";
}
dashCrit();
