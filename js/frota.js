/* Aba "Veículos Mega": painel por placa (gastos, gráfico, distribuição e histórico de reparos). */

let frota = []; // veículos da Mega (cada um com a lista de reparos)
let frotaOk = true; // false se a tabela ainda não existir no Supabase
let frSel = ""; // veículo consultado (id) — "" = todos os veículos
let frMesSel = Number(CUR.slice(5)); // mês do período (1–12)
let frAnoSel = Number(CUR.slice(0, 4)); // ano do período
let frEdit = null; // cadastro de veículo aberto: "novo" ou id
let frRepEd = null; // reparo sendo editado: { id do veículo, i posição }
const FR_LOCAIS = ["PGS2", "PGS", "RRON", "Castor"];
const FR_CORES = ["#0f3b36", "#2f9e8f", "#e6a23c", "#d9634c", "#7a6fd0", "#5b8bd9", "#9aa5a2"];

// ---------- contas ----------

const pad2 = (n) => String(n).padStart(2, "0");
function nomeMes(k) {
  return MESES[Number(k.slice(5)) - 1] + "/" + k.slice(0, 4);
}
function frMesKey() {
  return frAnoSel + "-" + pad2(frMesSel);
}
function frEscopo() {
  return ($("pvEscopo") && $("pvEscopo").value) || "ano";
}
// Prefixo de data do período do histórico/relatório ("2026-11", "2026" ou "" = tudo).
function frPer() {
  const e = frEscopo();
  return e === "mes" ? frMesKey() : e === "ano" ? String(frAnoSel) : "";
}
function frPerNome() {
  const e = frEscopo();
  return e === "mes" ? nomeMes(frMesKey()) : e === "ano" ? "Ano de " + frAnoSel : "Todo o histórico";
}
function frPlaca() {
  return frSel;
}
function frVeics() {
  return frSel ? frota.filter((v) => v.id === frSel) : frota;
}
function frTotal(v) {
  return Math.round((v.reparos || []).reduce((s, r) => s + (num(r.valor) || 0), 0) * 100) / 100;
}
// Soma do veículo nas datas que começam com o prefixo (mês "2026-11" ou ano "2026").
function frSoma(v, pref) {
  return (v.reparos || []).filter((r) => (r.data || "").startsWith(pref)).reduce((s, r) => s + (num(r.valor) || 0), 0);
}
const frSomaVS = (pref) => frVeics().reduce((s, v) => s + frSoma(v, pref), 0);
// Reparos do veículo no período do histórico (guarda a posição original para editar/excluir).
function frReps(v) {
  const per = frPer();
  return (v.reparos || []).map((r, i) => ({ r, i })).filter((x) => (x.r.data || "").startsWith(per));
}
function frTotalP(v) {
  return frReps(v).reduce((s, x) => s + (num(x.r.valor) || 0), 0);
}
function frUltimo(v) {
  return (v.reparos || []).reduce((m, r) => (r.data && r.data > m ? r.data : m), "");
}
// Onde o reparo foi feito: o campo Local, ou lido da descrição.
function frOnde(r) {
  if (r && r.local) return r.local;
  const d = ((r && r.descricao) || "").toUpperCase();
  if (/PGS\s*2/.test(d)) return "PGS2";
  if (/PGS/.test(d)) return "PGS";
  if (/RRON/.test(d)) return "RRON";
  if (/CASTOR/.test(d)) return "Castor";
  return "Outros";
}
function frLocaisLista() {
  const s = new Set(FR_LOCAIS);
  for (const v of frota) for (const r of v.reparos || []) if (r.local) s.add(r.local);
  return [...s];
}
const limpaPlaca = (t) => (t || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
function frAchar(t) {
  const p = limpaPlaca(t);
  return p ? frota.find((v) => v.placa === p) : null;
}

// Variação em % contra o período anterior.
function frVar(atual, antes, rotulo, semAntes) {
  if (!antes) return '<em class="pv-var">' + (atual ? semAntes : "—") + "</em>";
  const p = Math.round(((atual - antes) / antes) * 1000) / 10;
  const sobe = p > 0;
  return (
    '<em class="pv-var ' +
    (sobe ? "up" : p < 0 ? "down" : "") +
    '">' +
    (sobe ? "↑ +" : p < 0 ? "↓ " : "") +
    String(p).replace(".", ",") +
    "% <span>" +
    rotulo +
    "</span></em>"
  );
}

// ---------- desenho ----------

function renderFrota() {
  if (!$("frList")) return;
  if (frSel && !frota.some((v) => v.id === frSel)) frSel = "";
  const V = frSel ? frVeics()[0] : null;
  $("frBanner").hidden = frotaOk;
  $("pvLimpar").hidden = !frSel;
  if (V && document.activeElement !== $("pvPlaca")) $("pvPlaca").value = V.placa;
  $("pvPlacas").innerHTML = frota
    .slice()
    .sort((a, b) => a.placa.localeCompare(b.placa))
    .map((v) => '<option value="' + esc(v.placa) + '">' + esc(v.veiculo || "") + "</option>")
    .join("");

  // Período (mês + ano)
  $("pvMes").innerHTML = MESES.map(
    (m, i) => '<option value="' + (i + 1) + '"' + (i + 1 === frMesSel ? " selected" : "") + ">" + m + "</option>",
  ).join("");
  const anos = new Set([Number(CUR.slice(0, 4)), frAnoSel]);
  for (const v of frota) for (const r of v.reparos || []) if (r.data) anos.add(Number(r.data.slice(0, 4)));
  $("pvAno").innerHTML = [...anos]
    .sort((a, b) => b - a)
    .map((a) => '<option value="' + a + '"' + (a === frAnoSel ? " selected" : "") + ">" + a + "</option>")
    .join("");
  $("pvHoje").hidden = frMesKey() === CUR;

  // Faixa do veículo
  const CARRO =
    '<span class="pv-carro" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 13l2-5h14l2 5v5H3z"/><path d="M3 13h18"/><circle cx="7.5" cy="16" r="1.3"/><circle cx="16.5" cy="16" r="1.3"/></svg></span>';
  const info = (l, v) => '<div class="pv-vn"><small>' + l + "</small><b>" + v + "</b></div>";
  if (V) {
    const uso = V.em_uso_com || "",
      venda = /venda/i.test(uso);
    $("pvVeic").innerHTML =
      CARRO +
      '<div class="pv-vid"><b>' + esc(V.placa) + "</b><span>" + esc(V.veiculo || "Modelo não informado") + "</span></div>" +
      '<span class="pv-chip ' + (venda ? "venda" : uso ? "uso" : "livre") + '"><i></i>' +
      (venda ? "Para venda" : uso ? "Em uso · " + esc(uso) : "Sem responsável") + "</span>" +
      '<span class="pv-div"></span>' +
      info("Total de reparos", (V.reparos || []).length) +
      info("Total já gasto", money(frTotal(V))) +
      '<div class="pv-va"><button type="button" class="ico" data-fred="' + esc(V.id) + '" title="Editar veículo" aria-label="Editar veículo">' + ICO_ED +
      '</button><button type="button" class="ico red" data-frdel="' + esc(V.id) + '" title="Excluir veículo" aria-label="Excluir veículo">' + ICO_TR + "</button></div>";
  } else {
    const nr = frota.reduce((s, v) => s + (v.reparos || []).length, 0);
    $("pvVeic").innerHTML =
      CARRO +
      '<div class="pv-vid"><b>Todos os veículos</b><span>Digite uma placa acima para ver um veículo só.</span></div>' +
      '<span class="pv-div"></span>' +
      info("Veículos", frota.length) +
      info("Total de reparos", nr) +
      info("Total já gasto", money(frota.reduce((s, v) => s + frTotal(v), 0)));
  }

  // Indicadores
  const mk = frMesKey(),
    ant = frMesSel === 1 ? frAnoSel - 1 + "-12" : frAnoSel + "-" + pad2(frMesSel - 1);
  const gMes = frSomaVS(mk),
    gAno = frSomaVS(String(frAnoSel));
  const IC = (d) => '<span class="pv-ki" aria-hidden="true"><svg viewBox="0 0 24 24">' + d + "</svg></span>";
  $("pvKMes").innerHTML =
    IC('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>') +
    "<small>Gasto em " + esc(nomeMes(mk)) + "</small><b>" + money(gMes) + "</b>" + frVar(gMes, frSomaVS(ant), "vs. mês anterior", "Sem gasto no mês anterior");
  $("pvKAno").innerHTML =
    IC('<path d="M5 20V10M12 20V4M19 20v-7"/>') +
    "<small>Gasto em " +
    frAnoSel +
    "</small><b>" +
    money(gAno) +
    "</b>" +
    frVar(gAno, frSomaVS(String(frAnoSel - 1)), "vs. " + (frAnoSel - 1), "Sem gasto em " + (frAnoSel - 1));
  let ult = null;
  for (const v of frVeics())
    for (const r of v.reparos || []) if (r.data && (!ult || r.data > ult.r.data)) ult = { v, r };
  const icU = IC('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
  $("pvKUlt").innerHTML = ult
    ? icU + "<small>Último gasto</small><b>" +
      money(num(ult.r.valor) || 0) +
      "</b><em class=\"pv-var\">" +
      fdate(ult.r.data) +
      (V ? "" : " · " + esc(ult.v.placa)) +
      " · " +
      esc(frOnde(ult.r)) +
      "</em>"
    : icU + "<small>Último gasto</small><b>R$ 0,00</b><em class=\"pv-var\">Nenhum lançamento</em>";

  renderFrLinha();
  renderFrDonut();
  renderFrCad();
  renderFrHist();
}

// Gráfico de barras: gasto por mês do ano selecionado.
function renderFrLinha() {
  $("pvGrafAno").textContent = "· " + frAnoSel;
  const vals = MESES.map((_, i) => frSomaVS(frAnoSel + "-" + pad2(i + 1)));
  const W = 660,
    H = 230,
    L = 62,
    R = 8,
    T = 46,
    B = 26;
  const max = Math.max(...vals, 0);
  const passo = max <= 0 ? 1000 : Math.pow(10, Math.floor(Math.log10(max))) / 2;
  const topo = max <= 0 ? 1000 : Math.ceil(max / passo) * passo;
  const cw = (W - L - R) / 12,
    bw = Math.min(34, cw * 0.56);
  const xc = (i) => L + cw * i + cw / 2,
    y = (v) => T + (1 - v / topo) * (H - T - B);
  let g = "";
  for (let k = 0; k <= 4; k++) {
    const v = (topo * k) / 4,
      yy = y(v);
    g +=
      '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" class="pl-grid"/>' +
      '<text x="' + (L - 8) + '" y="' + (yy + 4) + '" class="pl-y">' + money(v).replace(",00", "") + "</text>";
  }
  const sel = frMesSel - 1;
  vals.forEach((v, i) => {
    const hh = Math.max(v > 0 ? 3 : 2, y(0) - y(v));
    g +=
      '<g class="pl-pt' + (i === sel ? " on" : "") + '" data-plm="' + (i + 1) + '"><title>' + MESES[i] + ": " + money(v) +
      '</title><rect x="' + (xc(i) - cw / 2) + '" y="' + T + '" width="' + cw + '" height="' + (H - T) + '" fill="transparent"/>' +
      '<rect class="bar" x="' + (xc(i) - bw / 2) + '" y="' + (y(0) - hh) + '" width="' + bw + '" height="' + hh + '" rx="4"/>' +
      '<text x="' + xc(i) + '" y="' + (H - 7) + '" class="pl-x">' + MESES[i].slice(0, 3) + "</text></g>";
  });
  const tx = Math.min(Math.max(xc(sel), L + 60), W - R - 60),
    ty = Math.max(y(vals[sel]) - 52, 2);
  g +=
    '<line x1="' + xc(sel) + '" x2="' + xc(sel) + '" y1="' + (ty + 38) + '" y2="' + y(vals[sel]) + '" class="pl-sel"/>' +
    '<g class="pl-tip"><rect x="' + (tx - 60) + '" y="' + ty + '" width="120" height="38" rx="8"/>' +
    '<text x="' + tx + '" y="' + (ty + 15) + '" class="a">' + esc(nomeMes(frMesKey())) + "</text>" +
    '<text x="' + tx + '" y="' + (ty + 31) + '" class="b">' + money(vals[sel]) + "</text></g>";
  $("pvLinha").innerHTML =
    '<svg viewBox="0 0 ' + W + " " + H + '" class="pv-line" role="img" aria-label="Gasto por mês em ' + frAnoSel + '">' + g + "</svg>";
}

// Rosca: onde o dinheiro foi gasto no ano selecionado.
function renderFrDonut() {
  const pref = String(frAnoSel);
  $("pvDistPer").textContent = "· " + frAnoSel;
  const por = {};
  for (const v of frVeics())
    for (const r of v.reparos || [])
      if ((r.data || "").startsWith(pref)) {
        const o = frOnde(r);
        por[o] = (por[o] || 0) + (num(r.valor) || 0);
      }
  const L = Object.entries(por).sort((a, b) => b[1] - a[1]);
  const tot = L.reduce((s, x) => s + x[1], 0);
  if (!tot) {
    $("pvDonut").innerHTML = '<p class="pv-vazio">Nenhum gasto em ' + frAnoSel + ".<br><b>R$ 0,00</b></p>";
    return;
  }
  const C = 2 * Math.PI * 52;
  let off = 0,
    arcs = "";
  L.forEach(([, v], i) => {
    const len = (v / tot) * C;
    arcs +=
      '<circle r="52" cx="70" cy="70" fill="none" stroke="' + FR_CORES[i % FR_CORES.length] +
      '" stroke-width="18" stroke-dasharray="' + len + " " + (C - len) + '" stroke-dashoffset="' + -off + '"/>';
    off += len;
  });
  $("pvDonut").innerHTML =
    '<div class="pv-dn"><div class="pv-rosca"><svg viewBox="0 0 140 140" aria-hidden="true"><g transform="rotate(-90 70 70)">' + arcs +
    '</g></svg><div><b>' + money(tot) + "</b><small>Total em " + frAnoSel + '</small></div></div><ul class="pv-leg">' +
    L.map(
      ([k, v], i) =>
        '<li><i style="background:' + FR_CORES[i % FR_CORES.length] + '"></i><span>' + esc(k) + "</span><b>" + money(v) +
        "</b><em>" + String(Math.round((v / tot) * 1000) / 10).replace(".", ",") + "%</em></li>",
    ).join("") +
    "</ul></div>";
}

// Cadastro/edição do veículo.
function renderFrCad() {
  if (!frEdit) {
    $("pvCad").innerHTML = "";
    return;
  }
  const n = frEdit === "novo",
    v = n ? { placa: frEdit === "novo" ? limpaPlaca($("pvPlaca").value) : "" } : frota.find((x) => x.id === frEdit) || {};
  $("pvCad").innerHTML =
    '<div class="dv-form pv-cad"><h3>' + (n ? "Novo veículo" : "Editar veículo") + '</h3><div class="dvf-grid">' +
    '<label>Placa<input type="text" id="ffPlaca" maxlength="10" value="' + esc(v.placa || "") + '" placeholder="ABC1D23"></label>' +
    '<label>Modelo<input type="text" id="ffVeic" maxlength="80" value="' + esc(v.veiculo || "") + '" placeholder="Ex.: Renault Logan"></label>' +
    '<label>Em uso com<input type="text" id="ffUso" maxlength="80" value="' + esc(v.em_uso_com || "") + '" placeholder="Nome, ou “Veículo para venda”"></label>' +
    '<label class="full">Observação<input type="text" id="ffObs" maxlength="300" value="' + esc(v.obs || "") + '" placeholder="Opcional"></label></div>' +
    '<div class="dcacts"><button type="button" class="btn" data-ffsave="' + esc(n ? "novo" : v.id) + '">' + (n ? "Cadastrar veículo" : "Salvar") +
    '</button><button type="button" class="btn ghost2" data-ffcancel="1">Cancelar</button></div></div>';
}

function frLinha(v, r, i, comPlaca) {
  const ed = frRepEd && frRepEd.id === v.id && frRepEd.i === i;
  if (ed)
    return (
      '<tr class="pv-ed" data-fr="' + esc(v.id) + '"><td><input type="date" id="reData" value="' + esc(r.data || "") + '" aria-label="Data"></td>' +
      (comPlaca ? "<td><b>" + esc(v.placa) + "</b></td>" : "") +
      '<td><input type="text" id="reDesc" maxlength="400" value="' + esc(r.descricao || "") + '" aria-label="Descrição"></td>' +
      '<td><input type="text" id="reLocal" list="frLocais" maxlength="40" value="' + esc(r.local || (frOnde(r) === "Outros" ? "" : frOnde(r))) + '" placeholder="Local" aria-label="Local"></td>' +
      '<td><span class="mi"><i>R$</i><input type="text" inputmode="decimal" id="reValor" value="' + fmtIn(num(r.valor) || 0) + '" aria-label="Valor"></span></td>' +
      '<td><input type="text" id="reObs" maxlength="300" value="' + esc(r.obs || "") + '" placeholder="Opcional" aria-label="Observação"></td>' +
      '<td class="r nw"><button type="button" class="btn" data-resave="' + i + '">Salvar</button> <button type="button" class="btn ghost2" data-recancel="1">Cancelar</button></td></tr>'
    );
  return (
    '<tr data-fr="' + esc(v.id) + '"><td class="nw">' + (r.data ? fdate(r.data) : '<span class="z">—</span>') + "</td>" +
    (comPlaca ? '<td class="nw"><button type="button" class="pv-pl" data-pvsel="' + esc(v.id) + '">' + esc(v.placa) + "</button></td>" : "") +
    '<td class="pv-desc">' + esc(r.descricao || "") + '</td><td><span class="pv-loc">' + esc(frOnde(r)) + "</span></td>" +
    '<td class="r nw pv-val">' + money(num(r.valor) || 0) + '</td><td class="pv-obs">' + esc(r.obs || "") + "</td>" +
    '<td class="r nw"><button type="button" class="ico" data-rped="' + i + '" title="Editar lançamento" aria-label="Editar lançamento">' + ICO_ED +
    '</button><button type="button" class="ico red" data-rpdel="' + i + '" title="Excluir lançamento" aria-label="Excluir lançamento">' + ICO_TR +
    "</button></td></tr>"
  );
}

// Histórico de reparos (do veículo consultado, ou de todos).
function renderFrHist() {
  const V = frSel ? frVeics()[0] : null,
    todos = !V;
  const L = [];
  for (const v of frVeics()) for (const x of frReps(v)) L.push({ v, r: x.r, i: x.i });
  L.sort((a, b) => (b.r.data || "").localeCompare(a.r.data || ""));
  const total = L.reduce((s, x) => s + (num(x.r.valor) || 0), 0);
  const cols = todos ? 7 : 6;
  let h =
    '<datalist id="frLocais">' + frLocaisLista().map((l) => '<option value="' + esc(l) + '">').join("") + "</datalist>" +
    '<div class="scroll"><table class="pv-t"><thead><tr><th>Data</th>' + (todos ? "<th>Placa</th>" : "") +
    '<th>Descrição do serviço</th><th>Local</th><th class="r">Valor</th><th>Observações</th><th></th></tr></thead><tbody>' +
    (L.map((x) => frLinha(x.v, x.r, x.i, todos)).join("") ||
      '<tr><td colspan="' + cols + '" class="z pv-z">Nenhum reparo em ' + esc(frPerNome().replace("Ano de ", "")) + ". Total: R$ 0,00</td></tr>") +
    "</tbody><tfoot>";
  if (V)
    h +=
      '<tr class="pv-add"><td><input type="date" id="rpData" aria-label="Data" value="' + hojeISO() + '"></td>' +
      '<td><input type="text" id="rpDesc" maxlength="400" placeholder="Ex.: troca de óleo e filtro" aria-label="Descrição"></td>' +
      '<td><input type="text" id="rpLocal" list="frLocais" maxlength="40" placeholder="PGS2, RRON…" aria-label="Local"></td>' +
      '<td><span class="mi"><i>R$</i><input type="text" inputmode="decimal" id="rpValor" placeholder="0,00" aria-label="Valor"></span></td>' +
      '<td><input type="text" id="rpObs" maxlength="300" placeholder="Opcional" aria-label="Observação"></td>' +
      '<td><button type="button" class="btn" data-rpadd="' + esc(V.id) + '">+ Lançar</button></td></tr>';
  h +=
    '<tr class="pv-sum"><td colspan="' + (todos ? 4 : 3) + '">Total · ' + esc(frPerNome()) + " · " + L.length + (L.length === 1 ? " lançamento" : " lançamentos") +
    '</td><td class="r nw">' + money(total) + "</td><td colspan=\"2\"></td></tr></tfoot></table></div>";
  if (todos) h += '<p class="pv-dica">Para lançar um reparo, consulte a placa do veículo.</p>';
  $("frList").innerHTML = h;
}

// ---------- gravação ----------

async function salvarFrota(v, msg) {
  const antes = frota.find((x) => x.id === v.id);
  frota = frota.filter((x) => x.id !== v.id).concat([v]);
  renderFrota();
  setStatus("Salvando…");
  try {
    await store.saveFrota(v);
    setStatus(msg + " às " + hora());
  } catch (er) {
    frota = frota.filter((x) => x.id !== v.id).concat(antes ? [antes] : []);
    renderFrota();
    setStatus(
      /frota|schema|relation/i.test(er.message)
        ? "A tabela de Veículos Mega ainda não existe no Supabase. Rode o SQL 5."
        : "Não foi possível salvar (" + er.message + ").",
    );
  }
}

// ---------- consulta ----------

function frConsultar(t, silencioso) {
  const p = limpaPlaca(t);
  $("pvAviso").hidden = true;
  if (!p) {
    frSel = "";
    frRepEd = null;
    renderFrota();
    return;
  }
  const v = frAchar(p);
  if (v) {
    frSel = v.id;
    frRepEd = null;
    renderFrota();
  } else if (!silencioso) {
    $("pvAviso").hidden = false;
    $("pvAviso").innerHTML =
      "Placa <b>" + esc(p) + '</b> não encontrada. <button type="button" class="lnk" id="pvCadNova">Cadastrar esse veículo</button>';
  }
}

$("pvForm").addEventListener("submit", (e) => {
  e.preventDefault();
  frConsultar($("pvPlaca").value);
});
// Ao digitar a placa completa, o painel já carrega o veículo.
$("pvPlaca").addEventListener("input", () => {
  const p = limpaPlaca($("pvPlaca").value);
  if (p.length >= 7 && frAchar(p)) frConsultar(p, true);
});
$("pvLimpar").onclick = () => {
  $("pvPlaca").value = "";
  frConsultar("");
  $("pvPlaca").focus();
};
$("pvAviso").addEventListener("click", (e) => {
  if (e.target.id !== "pvCadNova") return;
  frEdit = "novo";
  $("pvAviso").hidden = true;
  renderFrCad();
  $("ffVeic").focus();
});
$("pvMes").onchange = () => {
  frMesSel = Number($("pvMes").value);
  renderFrota();
};
$("pvAno").onchange = () => {
  frAnoSel = Number($("pvAno").value);
  renderFrota();
};
$("pvHoje").onclick = () => {
  frMesSel = Number(CUR.slice(5));
  frAnoSel = Number(CUR.slice(0, 4));
  renderFrota();
};
$("pvEscopo").onchange = () => {
  frRepEd = null;
  renderFrHist();
};
$("pvLinha").addEventListener("click", (e) => {
  const g = e.target.closest("[data-plm]");
  if (!g) return;
  frMesSel = Number(g.dataset.plm);
  renderFrota();
});
$("frNew").onclick = () => {
  frEdit = "novo";
  renderFrCad();
  $("ffPlaca").value = "";
  $("ffPlaca").focus();
};

// ---------- ações (veículo e lançamentos) ----------

document.getElementById("v-frota").addEventListener("click", (e) => {
  const ps = e.target.closest("[data-pvsel]");
  if (ps) {
    frSel = ps.dataset.pvsel;
    frRepEd = null;
    renderFrota();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (e.target.closest("[data-ffcancel]")) {
    frEdit = null;
    renderFrCad();
    return;
  }
  const ed = e.target.closest("[data-fred]");
  if (ed) {
    frEdit = ed.dataset.fred;
    renderFrCad();
    $("ffPlaca").focus();
    return;
  }
  const sv = e.target.closest("[data-ffsave]");
  if (sv) {
    const placa = limpaPlaca($("ffPlaca").value);
    if (!placa) return setStatus("Digite a placa.");
    const novo = sv.dataset.ffsave === "novo";
    if (frota.some((x) => x.placa === placa && x.id !== sv.dataset.ffsave)) return setStatus("Essa placa já está cadastrada.");
    const base = novo
      ? { id: placa.toLowerCase(), reparos: [], criado_em: new Date().toISOString() }
      : frota.find((x) => x.id === sv.dataset.ffsave);
    const v = Object.assign({}, base, {
      placa,
      veiculo: $("ffVeic").value.trim(),
      em_uso_com: $("ffUso").value.trim(),
      obs: $("ffObs").value.trim(),
    });
    frEdit = null;
    frSel = v.id;
    $("pvPlaca").value = v.placa;
    salvarFrota(v, novo ? "Veículo cadastrado" : "Veículo atualizado");
    return;
  }
  const del = e.target.closest("[data-frdel]");
  if (del) {
    if (!confirmarClique(del, "Clique de novo para excluir o veículo")) return;
    const id = del.dataset.frdel,
      antes = frota.find((x) => x.id === id);
    frota = frota.filter((x) => x.id !== id);
    frSel = "";
    $("pvPlaca").value = "";
    renderFrota();
    store
      .delFrota(id)
      .then(() => setStatus("Veículo excluído."))
      .catch((er) => {
        frota.push(antes);
        renderFrota();
        setStatus("Não foi possível excluir (" + er.message + ").");
      });
    return;
  }

  const add = e.target.closest("[data-rpadd]");
  if (add) {
    const v = frota.find((x) => x.id === add.dataset.rpadd),
      descricao = $("rpDesc").value.trim(),
      valor = parseBRL($("rpValor").value);
    if (!descricao) return setStatus("Descreva o reparo.");
    if (valor == null) return setStatus("Digite o valor do reparo.");
    const r = { data: $("rpData").value || null, descricao, valor };
    const local = $("rpLocal").value.trim(),
      obs = $("rpObs").value.trim();
    if (local) r.local = local;
    if (obs) r.obs = obs;
    salvarFrota(Object.assign({}, v, { reparos: (v.reparos || []).concat([r]) }), "Reparo lançado");
    setTimeout(() => $("rpDesc") && $("rpDesc").focus(), 0);
    return;
  }
  const re = e.target.closest("[data-rped]");
  if (re) {
    frRepEd = { id: re.closest("[data-fr]").dataset.fr, i: Number(re.dataset.rped) };
    renderFrHist();
    $("reDesc").focus();
    return;
  }
  if (e.target.closest("[data-recancel]")) {
    frRepEd = null;
    renderFrHist();
    return;
  }
  const rs = e.target.closest("[data-resave]");
  if (rs) {
    const v = frota.find((x) => x.id === rs.closest("[data-fr]").dataset.fr),
      i = Number(rs.dataset.resave),
      descricao = $("reDesc").value.trim(),
      valor = parseBRL($("reValor").value);
    if (!descricao) return setStatus("Descreva o reparo.");
    if (valor == null) return setStatus("Digite o valor do reparo.");
    const r = Object.assign({}, v.reparos[i], { data: $("reData").value || null, descricao, valor });
    const local = $("reLocal").value.trim(),
      obs = $("reObs").value.trim();
    if (local) r.local = local;
    else delete r.local;
    if (obs) r.obs = obs;
    else delete r.obs;
    const L = v.reparos.slice();
    L[i] = r;
    frRepEd = null;
    salvarFrota(Object.assign({}, v, { reparos: L }), "Lançamento atualizado");
    return;
  }
  const rd = e.target.closest("[data-rpdel]");
  if (rd) {
    if (!confirmarClique(rd)) return setStatus("Clique de novo na lixeira para excluir o lançamento.");
    const v = frota.find((x) => x.id === rd.closest("[data-fr]").dataset.fr);
    const L = v.reparos.slice();
    L.splice(Number(rd.dataset.rpdel), 1);
    salvarFrota(Object.assign({}, v, { reparos: L }), "Lançamento excluído");
  }
});

$("v-frota").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (e.target.closest(".pv-ed")) {
    e.preventDefault();
    document.querySelector("[data-resave]").click();
  } else if (e.target.closest(".pv-add")) {
    e.preventDefault();
    document.querySelector("[data-rpadd]").click();
  } else if (e.target.closest(".pv-cad")) {
    e.preventDefault();
    document.querySelector("[data-ffsave]").click();
  }
});
$("v-frota").addEventListener("focusout", (e) => {
  if (e.target.closest(".mi")) {
    const v = parseBRL(e.target.value);
    if (v != null) e.target.value = fmtIn(v);
  }
});
