/* Aba "Veículos Mega": histórico de reparos dos veículos da Mega, por placa. */

let frota = []; // veículos da Mega (cada um com a lista de reparos)
let frotaOk = true; // false se a tabela ainda não existir no Supabase
let frOpen = null; // veículo aberto (id)
let frEdit = null; // veículo sendo editado (id) ou "novo"

const FR_IC =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13l2-5h14l2 5v5H3z"/><path d="M3 13h18"/><circle cx="7.5" cy="16" r="1.2"/><circle cx="16.5" cy="16" r="1.2"/></svg>';

function frTotal(v) {
  return Math.round((v.reparos || []).reduce((s, r) => s + (num(r.valor) || 0), 0) * 100) / 100;
}

// Data do último reparo (para ordenar e mostrar).
function frUltimo(v) {
  return (v.reparos || []).reduce((m, r) => (r.data && r.data > m ? r.data : m), "");
}

function frOrdenados() {
  const q = ($("frQ").value || "").trim().toUpperCase();
  return frota
    .filter((v) => !q || (v.placa + " " + (v.veiculo || "") + " " + (v.em_uso_com || "")).toUpperCase().includes(q))
    .sort((a, b) => frUltimo(b).localeCompare(frUltimo(a)) || a.placa.localeCompare(b.placa));
}

// ---------- desenho ----------

function renderFrota() {
  if (!$("frList")) return;
  const mesAtual = CUR;
  const tot = frota.reduce(
    (a, v) => {
      a.total += frTotal(v);
      a.rep += (v.reparos || []).length;
      for (const r of v.reparos || []) if (r.data && r.data.slice(0, 7) === mesAtual) a.mes += num(r.valor) || 0;
      return a;
    },
    { total: 0, rep: 0, mes: 0 },
  );
  const box = (l, v, c) => '<div class="' + (c || "") + '"><small>' + l + "</small><b>" + v + "</b></div>";
  $("frStats").innerHTML =
    box("Veículos", frota.length) +
    box("Reparos lançados", tot.rep) +
    box("Gasto neste mês", money(tot.mes)) +
    box("Gasto total", money(tot.total), "big neg");

  renderFrDash();
  $("frBanner").hidden = frotaOk;
  const L = frOrdenados();
  let h = frEdit === "novo" ? frForm(null) : "";
  if (!frota.length && frEdit !== "novo")
    h +=
      '<div class="vempty"><b>Nenhum veículo cadastrado</b><span>Clique em “Novo veículo” para lançar o primeiro.</span></div>';
  else if (!L.length && frEdit !== "novo")
    h += '<div class="vempty"><b>Nada encontrado</b><span>Mude a busca.</span></div>';
  h += L.map(frCard).join("");
  $("frList").innerHTML = h;
}

// Onde o reparo foi feito (lido da descrição).
function frOnde(d) {
  d = (d || "").toUpperCase();
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
  const todos = [];
  for (const v of frota) for (const r of v.reparos || []) todos.push(Object.assign({ v }, r));
  // Gasto por mês (últimos 6 meses)
  const meses = [];
  let [y, m] = CUR.split("-").map(Number);
  for (let i = 0; i < 6; i++) {
    meses.unshift(y + "-" + String(m).padStart(2, "0"));
    if (--m === 0) (m = 12), y--;
  }
  const porMes = meses.map((k) => todos.filter((r) => (r.data || "").slice(0, 7) === k).reduce((s, r) => s + (num(r.valor) || 0), 0));
  const maxM = Math.max(1, ...porMes);
  $("frMeses").innerHTML = meses
    .map(
      (k, i) =>
        '<div class="frm"><b>' +
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
  for (const r of todos) {
    const o = frOnde(r.descricao);
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
    frota
      .map((v) => [v.placa + " · " + (v.veiculo || ""), frTotal(v), (v.reparos || []).length + " reparo(s)"])
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
    (v.reparos || []).length +
    '</span><span class="dv-num"><small>Último</small>' +
    (ult ? fdate(ult) : "—") +
    '</span><span class="dv-num saldo"><small>Total gasto</small>' +
    money(frTotal(v)) +
    '</span><span></span><svg class="dv-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>';
  if (aberto) h += frEdit === v.id ? frForm(v) : frDetail(v);
  return h + "</article>";
}

function frDetail(v) {
  const id = esc(v.id);
  const lin = (v.reparos || [])
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.data || "").localeCompare(b.r.data || ""))
    .map(
      ({ r, i }) =>
        "<tr><td>" +
        (r.data ? fdate(r.data) : '<span class="z">—</span>') +
        '</td><td class="obs">' +
        esc(r.descricao || "") +
        '</td><td class="r">' +
        money(num(r.valor) || 0) +
        '</td><td class="r"><button type="button" class="ico red" data-rpdel="' +
        i +
        '" title="Excluir reparo" aria-label="Excluir reparo">' +
        ICO_TR +
        "</button></td></tr>",
    )
    .join("");
  return (
    '<div class="dv-body">' +
    (v.obs ? '<p class="dv-obs">' + esc(v.obs) + "</p>" : "") +
    '<div class="scroll"><table class="dvt"><thead><tr><th>Data</th><th>Reparo / peças / onde foi feito</th><th class="r">Valor</th><th></th></tr></thead><tbody>' +
    (lin || '<tr><td colspan="4" class="z">Nenhum reparo lançado ainda.</td></tr>') +
    "</tbody><tfoot>" +
    '<tr class="dv-add"><td><input type="date" id="rpData" aria-label="Data" value="' +
    hojeISO() +
    '"></td><td><input type="text" id="rpDesc" maxlength="400" placeholder="Ex.: Reparos realizados na PGS2 - troca de óleo e filtro" aria-label="Reparo"></td>' +
    '<td><span class="mi"><i>R$</i><input type="text" inputmode="decimal" id="rpValor" placeholder="0,00" aria-label="Valor"></span></td>' +
    '<td><button type="button" class="btn" data-rpadd="' +
    id +
    '">+ Lançar</button></td></tr>' +
    '<tr class="dv-sum"><td colspan="2">Total gasto com este veículo</td><td class="r"><b class="tneg">' +
    money(frTotal(v)) +
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

$("frList").addEventListener("click", (e) => {
  const op = e.target.closest("[data-fropen]");
  if (op) {
    frOpen = frOpen === op.dataset.fropen ? null : op.dataset.fropen;
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
    const placa = $("ffPlaca").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
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
    salvarFrota(Object.assign({}, v, { reparos: (v.reparos || []).concat([r]) }), "Reparo lançado");
    setTimeout(() => $("rpDesc") && $("rpDesc").focus(), 0);
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
  if (e.target.closest(".dv-add")) {
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
