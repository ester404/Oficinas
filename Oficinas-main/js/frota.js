/* Aba "Veículos Mega": histórico de reparos dos veículos da Mega, por placa. */

let frota = []; // veículos da Mega (cada um com a lista de reparos)
let frotaOk = true; // false se a tabela ainda não existir no Supabase
let frOpen = null; // veículo aberto (id)
let frEdit = null; // veículo sendo editado (id) ou "novo"
let frRepEd = null; // reparo sendo editado: { id do veículo, i posição }
const FR_LOCAIS = ["PGS2", "PGS", "RRON", "Castor"];

const FR_IC =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13l2-5h14l2 5v5H3z"/><path d="M3 13h18"/><circle cx="7.5" cy="16" r="1.2"/><circle cx="16.5" cy="16" r="1.2"/></svg>';

function frTotal(v) {
  return Math.round((v.reparos || []).reduce((s, r) => s + (num(r.valor) || 0), 0) * 100) / 100;
}

// Mês escolhido no filtro ("" = todos os meses).
function frPer() {
  return ($("frMes") && $("frMes").value) || "";
}
// Placa escolhida no filtro ("" = todas). Guarda o id do veículo.
function frPlaca() {
  return ($("frPlaca") && $("frPlaca").value) || "";
}
// Veículos considerados (todos ou só a placa escolhida).
function frVeics() {
  const p = frPlaca();
  return p ? frota.filter((v) => v.id === p) : frota;
}
// Soma dos reparos do veículo cujo data começa com o prefixo (mês "2026-11" ou ano "2026").
function frSoma(v, pref) {
  return (v.reparos || []).filter((r) => (r.data || "").startsWith(pref)).reduce((s, r) => s + (num(r.valor) || 0), 0);
}
function frPlacasOpcoes() {
  const atual = frPlaca();
  $("frPlaca").innerHTML =
    '<option value="">Todas as placas</option>' +
    frota
      .slice()
      .sort((a, b) => a.placa.localeCompare(b.placa))
      .map(
        (v) =>
          '<option value="' +
          esc(v.id) +
          '"' +
          (v.id === atual ? " selected" : "") +
          ">" +
          esc(v.placa + (v.veiculo ? " · " + v.veiculo : "")) +
          "</option>",
      )
      .join("");
}
// Reparos do veículo dentro do mês escolhido (guarda a posição original para excluir).
function frReps(v) {
  const per = frPer();
  return (v.reparos || []).map((r, i) => ({ r, i })).filter((x) => !per || (x.r.data || "").slice(0, 7) === per);
}
function frTotalP(v) {
  return Math.round(frReps(v).reduce((s, x) => s + (num(x.r.valor) || 0), 0) * 100) / 100;
}
function nomeMes(k) {
  return MESES[Number(k.slice(5)) - 1] + "/" + k.slice(0, 4);
}
// Opções do filtro de mês: todos + meses que têm reparo + mês atual.
function frMesesOpcoes() {
  const s = new Set([CUR]);
  for (const v of frota) for (const r of v.reparos || []) if (r.data) s.add(r.data.slice(0, 7));
  const atual = frPer();
  if (atual) s.add(atual);
  $("frMes").innerHTML =
    '<option value="">Todos os meses</option>' +
    [...s]
      .sort()
      .reverse()
      .map((k) => '<option value="' + k + '"' + (k === atual ? " selected" : "") + ">" + nomeMes(k) + "</option>")
      .join("");
}

// Data do último reparo (para ordenar e mostrar).
function frUltimo(v) {
  return (v.reparos || []).reduce((m, r) => (r.data && r.data > m ? r.data : m), "");
}

function frOrdenados() {
  const q = ($("frQ").value || "").trim().toUpperCase();
  const per = frPer();
  return frVeics()
    .filter((v) => !per || frReps(v).length || frOpen === v.id || frPlaca())
    .filter((v) => !q || (v.placa + " " + (v.veiculo || "") + " " + (v.em_uso_com || "")).toUpperCase().includes(q))
    .sort((a, b) => frUltimo(b).localeCompare(frUltimo(a)) || a.placa.localeCompare(b.placa));
}

// ---------- desenho ----------

function renderFrota() {
  if (!$("frList")) return;
  frMesesOpcoes();
  frPlacasOpcoes();
  const per = frPer(),
    placa = frPlaca(),
    VS = frVeics();
  const mesRef = per || CUR,
    anoRef = mesRef.slice(0, 4);
  const soma = (f) => VS.reduce((s, v) => s + f(v), 0);
  const nRep = soma((v) => frReps(v).length);
  const box = (l, v, c) => '<div class="' + (c || "") + '"><small>' + l + "</small><b>" + v + "</b></div>";
  if (placa) {
    const v = VS[0];
    $("frStats").innerHTML =
      box("Reparos" + (per ? " no mês" : ""), nRep) +
      box("Gasto em " + nomeMes(mesRef), money(frSoma(v, mesRef))) +
      box("Gasto em " + anoRef, money(frSoma(v, anoRef))) +
      box("Gasto total da placa", money(frTotal(v)), "big neg");
  } else if (per) {
    $("frStats").innerHTML =
      box("Veículos com reparo", VS.filter((v) => frReps(v).length).length) +
      box("Reparos no mês", nRep) +
      box("Gasto em " + nomeMes(per), money(soma(frTotalP)), "big neg") +
      box("Gasto em " + anoRef, money(soma((v) => frSoma(v, anoRef))));
  } else {
    $("frStats").innerHTML =
      box("Veículos", frota.length) +
      box("Reparos lançados", nRep) +
      box("Gasto em " + nomeMes(CUR), money(soma((v) => frSoma(v, CUR)))) +
      box("Gasto em " + anoRef, money(soma((v) => frSoma(v, anoRef)))) +
      box("Gasto total", money(soma(frTotal)), "big neg");
  }
  $("frStats").classList.toggle("cinco", !placa && !per);

  renderFrDash();
  $("frBanner").hidden = frotaOk;
  const L = frOrdenados();
  let h = frEdit === "novo" ? frForm(null) : "";
  if (!frota.length && frEdit !== "novo")
    h +=
      '<div class="vempty"><b>Nenhum veículo cadastrado</b><span>Clique em “Novo veículo” para lançar o primeiro.</span></div>';
  else if (!L.length && frEdit !== "novo")
    h += '<div class="vempty"><b>Nada encontrado</b><span>Mude a busca ou o mês.</span></div>';
  h += L.map(frCard).join("");
  $("frList").innerHTML = h;
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

// Barras horizontais simples: [[rótulo, valor, detalhe]]
function frBarras(L) {
  const max = Math.max(1, ...L.map((x) => x[1]));
  return L.length
    ? L.map(
        (x) =>
          '<div class="frb"><span class="frb-l" title="' +
          esc(x[0]) +
          '">' +
          esc(x[0]) +
          '</span><span class="frb-t"><i style="width:' +
          Math.max(2, Math.round((x[1] / max) * 100)) +
          '%"></i></span><b>' +
          money(x[1]) +
          "</b>" +
          (x[2] ? "<small>" + esc(x[2]) + "</small>" : "<small></small>") +
          "</div>",
      ).join("")
    : '<p class="dcl-empty">Sem dados ainda.</p>';
}

function renderFrDash() {
  const per = frPer();
  const todos = [],
    doPer = [];
  for (const v of frVeics()) {
    for (const r of v.reparos || []) todos.push(Object.assign({ v }, r));
    for (const x of frReps(v)) doPer.push(Object.assign({ v }, x.r));
  }
  // Gasto por mês (6 meses até o mês escolhido)
  const meses = [];
  let [y, m] = (per || CUR).split("-").map(Number);
  for (let i = 0; i < 6; i++) {
    meses.unshift(y + "-" + String(m).padStart(2, "0"));
    if (--m === 0) ((m = 12), y--);
  }
  const porMes = meses.map((k) =>
    todos.filter((r) => (r.data || "").slice(0, 7) === k).reduce((s, r) => s + (num(r.valor) || 0), 0),
  );
  const maxM = Math.max(1, ...porMes);
  $("frMeses").innerHTML = meses
    .map(
      (k, i) =>
        '<div class="frm' +
        (k === per ? " on" : "") +
        '" data-frm="' +
        k +
        '" title="Ver ' +
        nomeMes(k) +
        '"><b>' +
        (porMes[i] ? money(porMes[i]).replace(",00", "") : "") +
        '</b><span class="frm-t"><i style="height:' +
        Math.round((porMes[i] / maxM) * 100) +
        '%"></i></span><small>' +
        MESES[Number(k.slice(5)) - 1].slice(0, 3) +
        "</small></div>",
    )
    .join("");
  // Onde foi feito
  const onde = {};
  for (const r of doPer) {
    const o = frOnde(r);
    onde[o] = onde[o] || [0, 0];
    onde[o][0] += num(r.valor) || 0;
    onde[o][1]++;
  }
  $("frOnde").innerHTML = frBarras(
    Object.entries(onde)
      .sort((a, b) => b[1][0] - a[1][0])
      .map(([k, x]) => [k, x[0], x[1] + (x[1] === 1 ? " reparo" : " reparos")]),
  );
  // Veículos que mais gastaram
  $("frTop").innerHTML = frBarras(
    frVeics()
      .map((v) => [v.placa + " · " + (v.veiculo || ""), frTotalP(v), frReps(v).length + " reparo(s)"])
      .filter((x) => x[1] > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
  );
}

function frCard(v) {
  const id = esc(v.id),
    aberto = frOpen === v.id,
    ult = frUltimo(v);
  let h =
    '<article class="dv fr' +
    (aberto ? " open" : "") +
    '" data-fr="' +
    id +
    '"><button type="button" class="dv-head" data-fropen="' +
    id +
    '" aria-expanded="' +
    aberto +
    '"><span class="dv-ic">' +
    FR_IC +
    '</span><span class="dv-t"><b>' +
    esc(v.placa) +
    " · " +
    esc(v.veiculo || "—") +
    "</b><small>" +
    (v.em_uso_com ? "Em uso com: " + esc(v.em_uso_com) : "Sem responsável") +
    '</small></span><span class="dv-num"><small>Reparos</small>' +
    frReps(v).length +
    '</span><span class="dv-num"><small>Último</small>' +
    (ult ? fdate(ult) : "—") +
    '</span><span class="dv-num saldo"><small>' +
    (frPer() ? "Gasto no mês" : "Total gasto") +
    "</small>" +
    money(frTotalP(v)) +
    '</span><span></span><svg class="dv-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>';
  if (aberto) h += frEdit === v.id ? frForm(v) : frDetail(v);
  return h + "</article>";
}

function frLocaisLista() {
  const s = new Set(FR_LOCAIS);
  for (const v of frota) for (const r of v.reparos || []) if (r.local) s.add(r.local);
  return [...s];
}

function frLinha(v, r, i) {
  if (frRepEd && frRepEd.id === v.id && frRepEd.i === i)
    return (
      '<tr class="dv-add rp-ed"><td><input type="date" id="reData" value="' +
      esc(r.data || "") +
      '" aria-label="Data"></td><td><input type="text" id="reDesc" maxlength="400" value="' +
      esc(r.descricao || "") +
      '" aria-label="Reparo"></td><td><input type="text" id="reLocal" list="frLocais" maxlength="40" value="' +
      esc(r.local || (frOnde(r) === "Outros" ? "" : frOnde(r))) +
      '" placeholder="Local" aria-label="Local"></td><td><span class="mi"><i>R$</i><input type="text" inputmode="decimal" id="reValor" value="' +
      fmtIn(num(r.valor) || 0) +
      '" aria-label="Valor"></span></td><td class="r nw"><button type="button" class="btn" data-resave="' +
      i +
      '">Salvar</button> <button type="button" class="btn ghost2" data-recancel="1">Cancelar</button></td></tr>'
    );
  return (
    "<tr><td>" +
    (r.data ? fdate(r.data) : '<span class="z">—</span>') +
    '</td><td class="obs">' +
    esc(r.descricao || "") +
    "</td><td>" +
    esc(frOnde(r)) +
    '</td><td class="r">' +
    money(num(r.valor) || 0) +
    '</td><td class="r nw"><button type="button" class="ico" data-rped="' +
    i +
    '" title="Editar reparo" aria-label="Editar reparo">' +
    ICO_ED +
    '</button><button type="button" class="ico red" data-rpdel="' +
    i +
    '" title="Excluir reparo" aria-label="Excluir reparo">' +
    ICO_TR +
    "</button></td></tr>"
  );
}

function frDetail(v) {
  const id = esc(v.id);
  const lin = frReps(v)
    .sort((a, b) => (a.r.data || "").localeCompare(b.r.data || ""))
    .map(({ r, i }) => frLinha(v, r, i))
    .join("");
  return (
    '<div class="dv-body">' +
    (v.obs ? '<p class="dv-obs">' + esc(v.obs) + "</p>" : "") +
    '<datalist id="frLocais">' +
    frLocaisLista()
      .map((l) => '<option value="' + esc(l) + '">')
      .join("") +
    "</datalist>" +
    '<div class="scroll"><table class="dvt"><thead><tr><th>Data</th><th>Reparo / peças</th><th>Local</th><th class="r">Valor</th><th></th></tr></thead><tbody>' +
    (lin ||
      '<tr><td colspan="5" class="z">' +
        (frPer() ? "Nenhum reparo neste mês." : "Nenhum reparo lançado ainda.") +
        "</td></tr>") +
    "</tbody><tfoot>" +
    '<tr class="dv-add"><td><input type="date" id="rpData" aria-label="Data" value="' +
    hojeISO() +
    '"></td><td><input type="text" id="rpDesc" maxlength="400" placeholder="Ex.: troca de óleo e filtro" aria-label="Reparo"></td>' +
    '<td><input type="text" id="rpLocal" list="frLocais" maxlength="40" placeholder="PGS2, RRON…" aria-label="Local"></td>' +
    '<td><span class="mi"><i>R$</i><input type="text" inputmode="decimal" id="rpValor" placeholder="0,00" aria-label="Valor"></span></td>' +
    '<td><button type="button" class="btn" data-rpadd="' +
    id +
    '">+ Lançar</button></td></tr>' +
    '<tr class="dv-sum"><td colspan="3">' +
    (frPer() ? "Gasto em " + nomeMes(frPer()) : "Total gasto com este veículo") +
    '</td><td class="r"><b class="tneg">' +
    money(frTotalP(v)) +
    "</b></td><td></td></tr></tfoot></table></div>" +
    '<div class="dv-acts"><button type="button" class="lnk" data-fred="' +
    id +
    '">' +
    ICO_ED +
    'Editar veículo</button><button type="button" class="lnk red" data-frdel="' +
    id +
    '">' +
    ICO_TR +
    "<span>Excluir veículo</span></button></div></div>"
  );
}

function frForm(v) {
  const n = !v;
  v = v || {};
  return (
    '<div class="dv-form' +
    (n ? " nova" : "") +
    '"><h3>' +
    (n ? "Novo veículo" : "Editar veículo") +
    '</h3><div class="dvf-grid">' +
    '<label>Placa<input type="text" id="ffPlaca" maxlength="10" value="' +
    esc(v.placa || "") +
    '" placeholder="ABC1D23"></label>' +
    '<label>Veículo<input type="text" id="ffVeic" maxlength="80" value="' +
    esc(v.veiculo || "") +
    '" placeholder="Modelo"></label>' +
    '<label>Em uso com<input type="text" id="ffUso" maxlength="80" value="' +
    esc(v.em_uso_com || "") +
    '" placeholder="Nome, ou “Veículo para venda”"></label>' +
    '<label class="full">Observação<input type="text" id="ffObs" maxlength="300" value="' +
    esc(v.obs || "") +
    '" placeholder="Opcional"></label></div>' +
    '<div class="dcacts"><button type="button" class="btn" data-ffsave="' +
    esc(v.id || "novo") +
    '">' +
    (n ? "Cadastrar veículo" : "Salvar") +
    '</button><button type="button" class="btn ghost2" data-ffcancel="1">Cancelar</button></div></div>'
  );
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

// ---------- eventos ----------

$("frNew").onclick = () => {
  frEdit = "novo";
  renderFrota();
  $("ffPlaca").focus();
};
$("frQ").addEventListener("input", renderFrota);
$("frMes").addEventListener("change", renderFrota);
$("frPlaca").addEventListener("change", () => {
  frOpen = frPlaca() || null;
  frRepEd = null;
  renderFrota();
});
$("frMeses").addEventListener("click", (e) => {
  const b = e.target.closest("[data-frm]");
  if (!b) return;
  const k = b.dataset.frm,
    novo = frPer() === k ? "" : k;
  if (novo && !$("frMes").querySelector('option[value="' + k + '"]'))
    $("frMes").insertAdjacentHTML("beforeend", '<option value="' + k + '">' + nomeMes(k) + "</option>");
  $("frMes").value = novo;
  renderFrota();
});

$("frList").addEventListener("click", (e) => {
  const op = e.target.closest("[data-fropen]");
  if (op) {
    frOpen = frOpen === op.dataset.fropen ? null : op.dataset.fropen;
    frRepEd = null;
    if (frEdit !== "novo") frEdit = null;
    renderFrota();
    return;
  }
  if (e.target.closest("[data-ffcancel]")) {
    frEdit = null;
    renderFrota();
    return;
  }
  const ed = e.target.closest("[data-fred]");
  if (ed) {
    frEdit = ed.dataset.fred;
    renderFrota();
    $("ffPlaca").focus();
    return;
  }

  const sv = e.target.closest("[data-ffsave]");
  if (sv) {
    const placa = $("ffPlaca")
      .value.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!placa) return setStatus("Digite a placa.");
    const novo = sv.dataset.ffsave === "novo";
    if (frota.some((x) => x.placa === placa && x.id !== sv.dataset.ffsave))
      return setStatus("Essa placa já está cadastrada.");
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
    frOpen = v.id;
    salvarFrota(v, novo ? "Veículo cadastrado" : "Veículo atualizado");
    return;
  }

  const del = e.target.closest("[data-frdel]");
  if (del) {
    if (!confirmarClique(del, "Clique de novo para excluir")) return;
    const id = del.dataset.frdel,
      antes = frota.find((x) => x.id === id);
    frota = frota.filter((x) => x.id !== id);
    frOpen = null;
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
    const local = $("rpLocal").value.trim();
    if (local) r.local = local;
    salvarFrota(Object.assign({}, v, { reparos: (v.reparos || []).concat([r]) }), "Reparo lançado");
    setTimeout(() => $("rpDesc") && $("rpDesc").focus(), 0);
    return;
  }

  const re = e.target.closest("[data-rped]");
  if (re) {
    frRepEd = { id: re.closest("[data-fr]").dataset.fr, i: Number(re.dataset.rped) };
    renderFrota();
    $("reDesc") && $("reDesc").focus();
    return;
  }
  if (e.target.closest("[data-recancel]")) {
    frRepEd = null;
    renderFrota();
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
    const local = $("reLocal").value.trim();
    if (local) r.local = local;
    else delete r.local;
    const L = v.reparos.slice();
    L[i] = r;
    frRepEd = null;
    salvarFrota(Object.assign({}, v, { reparos: L }), "Reparo atualizado");
    return;
  }

  const rd = e.target.closest("[data-rpdel]");
  if (rd) {
    if (!confirmarClique(rd)) return setStatus("Clique de novo na lixeira para excluir o reparo.");
    const v = frota.find((x) => x.id === rd.closest("[data-fr]").dataset.fr);
    const L = v.reparos.slice();
    L.splice(Number(rd.dataset.rpdel), 1);
    salvarFrota(Object.assign({}, v, { reparos: L }), "Reparo excluído");
  }
});

$("frList").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (e.target.closest(".rp-ed")) {
    e.preventDefault();
    document.querySelector("[data-resave]").click();
  } else if (e.target.closest(".dv-add")) {
    e.preventDefault();
    document.querySelector("[data-rpadd]").click();
  } else if (e.target.closest(".dv-form")) {
    e.preventDefault();
    document.querySelector("[data-ffsave]").click();
  }
});
$("frList").addEventListener("focusout", (e) => {
  if (e.target.closest(".mi")) {
    const v = parseBRL(e.target.value);
    if (v != null) e.target.value = fmtIn(v);
  }
});
