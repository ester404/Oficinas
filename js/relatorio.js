/* Relatório de reparos dos Veículos Mega, impresso no papel timbrado da Mega.
   Usa o mês escolhido no filtro da aba (ou todos os meses). */

function frRelatorioHTML() {
  const per = frPer();
  const periodo = per ? nomeMes(per) : "Todos os meses";
  // Reparos do período, com o veículo de cada um
  const linhas = [];
  for (const v of frota) for (const x of frReps(v)) linhas.push({ v, r: x.r });
  linhas.sort((a, b) => (a.r.data || "").localeCompare(b.r.data || "") || a.v.placa.localeCompare(b.v.placa));
  const total = linhas.reduce((s, x) => s + (num(x.r.valor) || 0), 0);

  // Por veículo
  const porV = {};
  for (const x of linhas) {
    const k = x.v.id;
    porV[k] = porV[k] || { v: x.v, n: 0, t: 0 };
    porV[k].n++;
    porV[k].t += num(x.r.valor) || 0;
  }
  const veics = Object.values(porV).sort((a, b) => b.t - a.t);

  // Por local
  const porL = {};
  for (const x of linhas) {
    const o = frOnde(x.r.descricao);
    porL[o] = porL[o] || { n: 0, t: 0 };
    porL[o].n++;
    porL[o].t += num(x.r.valor) || 0;
  }
  const locais = Object.entries(porL).sort((a, b) => b[1].t - a[1].t);
  const pct = (t) => (total ? Math.round((t / total) * 100) : 0) + "%";

  const kpi = (l, v, c) => '<div class="rp-kpi' + (c ? " " + c : "") + '"><small>' + l + "</small><b>" + v + "</b></div>";
  const agora = new Date();
  const emitido = fdate(hojeISO()) + " às " + String(agora.getHours()).padStart(2, "0") + ":" + String(agora.getMinutes()).padStart(2, "0");
  const quem = (perfil && perfil.nome) || (sess && sess.email) || "";

  const corpo =
    '<header class="rp-head"><div><div class="rp-k">Setor de Sinistros · Veículos Mega</div>' +
    "<h1>Relatório de reparos</h1>" +
    '<p class="rp-per">' +
    esc(periodo) +
    '</p></div><div class="rp-meta">Emitido em ' +
    emitido +
    (quem ? "<br>por " + esc(quem) : "") +
    "</div></header>" +
    '<section class="rp-kpis">' +
    kpi("Veículos atendidos", veics.length) +
    kpi("Reparos", linhas.length) +
    kpi("Média por reparo", money(linhas.length ? total / linhas.length : 0)) +
    kpi("Gasto total", money(total), "tot") +
    "</section>" +
    (linhas.length
      ? '<section><h2>Onde foi feito</h2><div class="rp-locs">' +
        locais
          .map(
            ([k, x]) =>
              '<div class="rp-loc"><b>' +
              esc(k) +
              "</b><strong>" +
              money(x.t) +
              '</strong><span class="rp-bar"><i style="width:' +
              pct(x.t) +
              '"></i></span><small>' +
              x.n +
              (x.n === 1 ? " reparo" : " reparos") +
              " · " +
              pct(x.t) +
              "</small></div>",
          )
          .join("") +
        "</div></section>" +
        '<section><h2>Gasto por veículo</h2><table class="rp-t"><thead><tr><th>Placa</th><th>Veículo</th><th>Em uso com</th><th class="c">Reparos</th><th class="r">Total</th></tr></thead><tbody>' +
        veics
          .map(
            (x) =>
              '<tr><td class="nw"><b>' +
              esc(x.v.placa) +
              "</b></td><td>" +
              esc(x.v.veiculo || "—") +
              "</td><td>" +
              esc(x.v.em_uso_com || "—") +
              '</td><td class="c">' +
              x.n +
              '</td><td class="r nw">' +
              money(x.t) +
              "</td></tr>",
          )
          .join("") +
        "</tbody></table></section>" +
        '<section><table class="rp-t rp-det"><thead><tr class="rp-cap"><td colspan="4"><h2>Detalhamento dos reparos</h2></td></tr><tr><th>Data</th><th>Placa</th><th>Reparo / peças / onde foi feito</th><th class="r">Valor</th></tr></thead><tbody>' +
        linhas
          .map(
            (x) =>
              '<tr><td class="nw">' +
              (x.r.data ? fdate(x.r.data) : "—") +
              '</td><td class="nw"><b>' +
              esc(x.v.placa) +
              "</b><small>" +
              esc(x.v.veiculo || "") +
              "</small></td><td>" +
              esc(x.r.descricao || "") +
              '</td><td class="r nw">' +
              money(num(x.r.valor) || 0) +
              "</td></tr>",
          )
          .join("") +
        '</tbody><tfoot class="rp-sum"><tr><td colspan="3">Total do período</td><td class="r nw">' +
        money(total) +
        "</td></tr></tfoot></table></section>"
      : '<p class="rp-vazio">Nenhum reparo lançado em ' + esc(periodo) + ".</p>") +
    '<section class="rp-ass"><div><span></span>Responsável</div><div><span></span>Aprovação</div></section>';

  // A tabela "moldura" repete o espaço do cabeçalho e do rodapé do timbrado em todas as páginas.
  return (
    '<img class="rp-bg" src="assets/timbrado.jpg" alt="">' +
    '<table class="rp-frame"><thead><tr><td><div class="rp-top"></div></td></tr></thead>' +
    "<tbody><tr><td>" +
    corpo +
    '</td></tr></tbody><tfoot><tr><td><div class="rp-bot"></div></td></tr></tfoot></table>'
  );
}

function imprimirRelatorio() {
  const area = $("printArea");
  area.innerHTML = frRelatorioHTML();
  const titulo = document.title;
  const per = frPer();
  document.title = "Relatorio Veiculos Mega - " + (per ? nomeMes(per).replace("/", "-") : "todos os meses");
  const img = area.querySelector(".rp-bg");
  const go = () => {
    window.print();
    document.title = titulo;
  };
  if (img.complete) go();
  else {
    img.onload = go;
    img.onerror = go;
  }
}

$("frPrint").onclick = imprimirRelatorio;
