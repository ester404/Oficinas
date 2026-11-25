/* Aba "Devedores": dívidas das oficinas e os descontos feitos por placa até quitar. */

let devOpen = null; // dívida aberta (id)
let devEdit = null; // dívida sendo editada (id) ou "nova"

const DIV_IC =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18v12H3z"/><path d="M3 11h18M7 15h3"/></svg>';

// Quanto já foi descontado e quanto falta.
function divCalc(d) {
  const desc = (d.descontos || []).reduce((s, x) => s + (num(x.valor) || 0), 0);
  const total = num(d.valor_total) || 0;
  const saldo = Math.round((total - desc) * 100) / 100;
  return { total, desc: Math.round(desc * 100) / 100, saldo, quitada: total > 0 && saldo <= 0 };
}

// Dias desde o último desconto (ou desde o cadastro) e a situação da dívida.
const DIV_LIMITE_AT = 30,
  DIV_LIMITE_CR = 60;
function divUltimo(d) {
  return (d.descontos || []).reduce((m, x) => (x.data && x.data > m ? x.data : m), "");
}
function divStatus(d, c) {
  c = c || divCalc(d);
  if (c.quitada) return { k: "q", dias: 0, txt: "Quitada" };
  const ref = divUltimo(d) || (d.criado_em || "").slice(0, 10);
  const dias = ref ? Math.max(0, Math.round((new Date(hojeISO()) - new Date(ref)) / 864e5)) : 0;
  if (dias > DIV_LIMITE_CR) return { k: "cr", dias, txt: "Sem desconto há " + dias + " dias" };
  if (dias > DIV_LIMITE_AT) return { k: "at", dias, txt: "Atenção · " + dias + " dias" };
  return { k: "ok", dias, txt: "Em dia" };
}
// Placa citada no "referente a" (ex.: "Honda PCX150 (LMD0G98)").
function divPlaca(d) {
  const m = (d.referente || "").toUpperCase().match(/\b([A-Z]{3}\d[A-Z0-9]\d{2})\b/);
  return m ? m[1] : "—";
}

function divOrdenadas() {
  const q = ($("dvQ").value || "").trim().toUpperCase(),
    f = $("dvF").value,
    o = $("dvO").value;
  return dividas
    .filter((d) => !q || (d.devedor + " " + (d.referente || "")).toUpperCase().includes(q))
    .filter((d) => !f || divStatus(d).k === f)
    .sort((a, b) =>
      o === "nome"
        ? a.devedor.localeCompare(b.devedor)
        : o === "dias"
          ? divStatus(b).dias - divStatus(a).dias
          : divCalc(b).saldo - divCalc(a).saldo || a.devedor.localeCompare(b.devedor),
    );
}

// Saldo em aberto no fim do mês (dívidas menos os descontos feitos até lá).
function divSaldoEm(fim) {
  return dividas.reduce((s, d) => {
    const desc = (d.descontos || []).filter((x) => !x.data || x.data <= fim).reduce((t, x) => t + (num(x.valor) || 0), 0);
    return s + Math.max(0, (num(d.valor_total) || 0) - desc);
  }, 0);
}
function divDescNoMes(k) {
  return dividas.reduce(
    (s, d) => s + (d.descontos || []).filter((x) => (x.data || "").startsWith(k)).reduce((t, x) => t + (num(x.valor) || 0), 0),
    0,
  );
}

// ---------- desenho ----------

const DV_CHIP = { q: "green", ok: "green", at: "amber", cr: "red" };

function renderDev() {
  if (!$("devList")) return;
  const ativos = dividas.filter((d) => !divCalc(d).quitada);
  const saldo = ativos.reduce((s, d) => s + Math.max(0, divCalc(d).saldo), 0);
  const st = ativos.map((d) => divStatus(d));
  const nCr = st.filter((x) => x.k === "cr").length,
    nOk = st.filter((x) => x.k !== "cr").length;
  const k = CUR,
    [yy, mm] = k.split("-").map(Number),
    ant = mm === 1 ? yy - 1 + "-12" : yy + "-" + String(mm - 1).padStart(2, "0");
  const dMes = divDescNoMes(k),
    dAnt = divDescNoMes(ant);
  $("devStats").innerHTML =
    gKpi({ ic: "pessoas", rotulo: "Devedores ativos", valor: ativos.length, sub: '<em class="kc-var">' + (dividas.length - ativos.length) + " quitada(s)</em>" }) +
    gKpi({ ic: "saco", rotulo: "Valor total em aberto", valor: money(saldo), sub: '<em class="kc-var">de ' + money(dividas.reduce((s, d) => s + divCalc(d).total, 0)) + " em dívidas</em>" }) +
    gKpi({ ic: "calendario", rotulo: "Descontado no mês", valor: money(dMes), sub: gVar(dMes, dAnt, "vs. mês anterior") }) +
    gKpi({ ic: "alerta", rotulo: "Sem desconto há +" + DIV_LIMITE_CR + " dias", valor: nCr, sub: '<em class="kc-var">' + nOk + " em dia ou em atenção</em>", tom: nCr ? "red" : "" });

  // Evolução (últimos 6 meses)
  const meses = [];
  let y = yy,
    m = mm;
  for (let i = 0; i < 6; i++) {
    meses.unshift(y + "-" + String(m).padStart(2, "0"));
    if (--m === 0) (m = 12), y--;
  }
  const fim = (k2) => {
    const [a, b] = k2.split("-").map(Number);
    return k2 + "-" + String(new Date(a, b, 0).getDate()).padStart(2, "0");
  };
  $("devGraf").innerHTML = gLinha(
    meses.map((k2) => divSaldoEm(fim(k2))),
    meses.map((k2) => MESES[Number(k2.slice(5)) - 1].slice(0, 3)),
    5,
    (v) => (v >= 1000 ? "R$ " + Math.round(v / 1000) + "k" : "R$ " + Math.round(v)),
  );

  // Críticos: mais tempo sem desconto
  const crit = ativos
    .map((d) => ({ d, s: divStatus(d), c: divCalc(d) }))
    .sort((a, b) => b.s.dias - a.s.dias || b.c.saldo - a.c.saldo)
    .slice(0, 4);
  $("devCrit").innerHTML = crit.length
    ? crit
        .map(
          (x) =>
            '<div class="crit-i" data-dvopen="' + esc(x.d.id) + '"><span class="dav">' + esc(gIniciais(x.d.devedor)) + "</span><div class=\"crit-n\"><b>" + esc(x.d.devedor) +
            '</b><strong>' + money(Math.max(0, x.c.saldo)) + '</strong></div><span class="chip ' + DV_CHIP[x.s.k] + '">' +
            (x.s.k === "ok" ? "Em dia" : "Sem desconto há " + x.s.dias + " dias") + "</span></div>",
        )
        .join("")
    : '<p class="pv-vazio">Nenhuma dívida em aberto.</p>';

  $("devBanner").hidden = divOk;
  const L = divOrdenadas();
  let h = devEdit === "nova" ? divForm(null) : "";
  if (!dividas.length && devEdit !== "nova")
    h += '<div class="vempty"><b>Nenhuma dívida cadastrada</b><span>Clique em “Nova dívida” para lançar a primeira.</span></div>';
  else if (!L.length && devEdit !== "nova")
    h += '<div class="vempty"><b>Nada encontrado</b><span>Mude a busca ou o filtro.</span></div>';
  if (L.length)
    h +=
      '<div class="scroll"><table class="pv-t dsh-t"><thead><tr><th>Devedor</th><th>Placa</th><th class="r">Valor total</th><th class="r">Descontado</th><th class="r">Em aberto</th><th>Último desconto</th><th>Status</th><th class="c">Ações</th></tr></thead><tbody>' +
      L.map(divLinha).join("") +
      "</tbody></table></div>";
  $("devList").innerHTML = h;
}

function divLinha(d) {
  const c = divCalc(d),
    s = divStatus(d, c),
    id = esc(d.id),
    aberto = devOpen === d.id;
  const pct = c.total ? Math.min(100, Math.round((c.desc / c.total) * 100)) : 0;
  const ult = divUltimo(d);
  let h =
    '<tr data-dv="' + id + '"' + (aberto ? ' class="on"' : "") + '><td><div class="dv-who"><span class="dav">' + esc(gIniciais(d.devedor)) +
    "</span><div><b>" + esc(d.devedor) + "</b><small>" + esc(d.referente || "") + '</small><span class="mini-bar" title="' + pct +
    '% descontado"><i style="width:' + pct + '%"></i></span></div></div></td><td class="nw"><b>' + esc(divPlaca(d)) + '</b></td><td class="r nw">' +
    money(c.total) + '</td><td class="r nw">' + money(c.desc) + '</td><td class="r nw pv-val ' + (c.quitada ? "tpos" : "tneg") + '">' +
    money(Math.max(0, c.saldo)) + '</td><td class="nw">' + (ult ? fdate(ult) : '<span class="z">—</span>') + '</td><td><span class="chip ' +
    DV_CHIP[s.k] + '">' + s.txt + '</span></td><td class="c nw"><button type="button" class="ico" data-dvopen="' + id +
    '" title="Ver descontos" aria-label="Ver descontos">' + gSvg("olho") + '</button><button type="button" class="ico" data-dved="' + id +
    '" title="Editar dívida" aria-label="Editar dívida">' + ICO_ED + '</button><button type="button" class="ico red" data-dvdel="' + id +
    '" title="Excluir dívida" aria-label="Excluir dívida">' + ICO_TR + "</button></td></tr>";
  if (aberto) h += '<tr class="dv-det" data-dv="' + id + '"><td colspan="8">' + (devEdit === d.id ? divForm(d) : divDetail(d, c)) + "</td></tr>";
  return h;
}

function divDetail(d, c) {
  const id = esc(d.id);
  const lin = (d.descontos || [])
    .map(
      (x, i) =>
        '<tr><td>' +
        (x.data ? fdate(x.data) : '<span class="z">—</span>') +
        "</td><td><b>" +
        esc(x.placa || "—") +
        '</b></td><td class="r">' +
        money(num(x.valor) || 0) +
        '</td><td class="obs">' +
        esc(x.obs || "") +
        '</td><td class="r"><button type="button" class="ico red" data-dsdel="' +
        i +
        '" title="Excluir desconto" aria-label="Excluir desconto">' +
        ICO_TR +
        "</button></td></tr>",
    )
    .join("");
  return (
    '<div class="dv-body">' +
    (d.obs ? '<p class="dv-obs">' + esc(d.obs) + "</p>" : "") +
    '<div class="scroll"><table class="dvt"><thead><tr><th>Data</th><th>Placa usada no desconto</th><th class="r">Valor deduzido</th><th>Observação</th><th></th></tr></thead><tbody>' +
    (lin || '<tr><td colspan="5" class="z">Nenhum desconto lançado ainda.</td></tr>') +
    "</tbody><tfoot>" +
    '<tr class="dv-add"><td><input type="date" id="dsData" aria-label="Data"></td><td><input type="text" id="dsPlaca" maxlength="10" placeholder="Placa" aria-label="Placa"></td>' +
    '<td><span class="mi"><i>R$</i><input type="text" inputmode="decimal" id="dsValor" placeholder="0,00" aria-label="Valor deduzido"></span></td>' +
    '<td><input type="text" id="dsObs" maxlength="140" placeholder="Observação (opcional)" aria-label="Observação"></td>' +
    '<td><button type="button" class="btn" data-dsadd="' +
    id +
    '">+ Descontar</button></td></tr>' +
    '<tr class="dv-sum"><td colspan="2">Saldo depois dos descontos</td><td class="r"><b class="' +
    (c.quitada ? "tpos" : "tneg") +
    '">' +
    money(Math.max(0, c.saldo)) +
    "</b></td><td colspan=\"2\">" +
    (c.saldo < 0 ? '<span class="tpos">Descontado ' + money(-c.saldo) + " a mais que a dívida</span>" : "") +
    "</td></tr></tfoot></table></div>" +
    '<div class="dv-acts"><button type="button" class="lnk" data-dved="' +
    id +
    '">' +
    ICO_ED +
    'Editar dívida</button><button type="button" class="lnk red" data-dvdel="' +
    id +
    '">' +
    ICO_TR +
    "<span>Excluir dívida</span></button></div></div>"
  );
}

function divForm(d) {
  const n = !d;
  d = d || {};
  return (
    '<div class="dv-form' +
    (n ? " nova" : "") +
    '"><h3>' +
    (n ? "Nova dívida" : "Editar dívida") +
    '</h3><div class="dvf-grid">' +
    '<label>Oficina / devedor<input type="text" id="dfDev" list="dfOfs" maxlength="80" value="' +
    esc(d.devedor || "") +
    '" placeholder="Ex.: Castor - Motos"></label>' +
    '<label>Referente a<input type="text" id="dfRef" maxlength="120" value="' +
    esc(d.referente || "") +
    '" placeholder="Veículo, placa ou motivo"></label>' +
    '<label>Valor total da dívida<span class="mi"><i>R$</i><input type="text" inputmode="decimal" id="dfVal" value="' +
    fmtIn(d.valor_total) +
    '" placeholder="0,00"></span></label>' +
    '<label class="full">Observação<input type="text" id="dfObs" maxlength="300" value="' +
    esc(d.obs || "") +
    '" placeholder="Ex.: renegociada, desconto de R$ 500 por veículo"></label></div>' +
    '<datalist id="dfOfs">' +
    oficinas
      .concat(descreds)
      .map((o) => '<option value="' + esc(o.nome) + '">')
      .join("") +
    "</datalist>" +
    '<div class="dcacts"><button type="button" class="btn" data-dfsave="' +
    esc(d.id || "nova") +
    '">' +
    (n ? "Cadastrar dívida" : "Salvar") +
    '</button><button type="button" class="btn ghost2" data-dfcancel="1">Cancelar</button></div></div>'
  );
}

// ---------- gravação ----------

async function salvarDivida(d, msg) {
  const antes = dividas.find((x) => x.id === d.id);
  dividas = dividas.filter((x) => x.id !== d.id).concat([d]);
  renderDev();
  setStatus("Salvando…");
  try {
    await store.saveDiv(d);
    setStatus(msg + " às " + hora());
  } catch (er) {
    dividas = dividas.filter((x) => x.id !== d.id).concat(antes ? [antes] : []);
    renderDev();
    setStatus(
      /dividas|schema|relation/i.test(er.message)
        ? "A tabela de dívidas ainda não existe no Supabase. Rode o SQL de devedores."
        : "Não foi possível salvar (" + er.message + ").",
    );
  }
}

function confirmarClique(b, texto) {
  if (b.dataset.armed === "1") return true;
  b.dataset.armed = "1";
  b.classList.add("armed");
  const sp = b.querySelector("span");
  const antes = sp ? sp.textContent : "";
  if (sp && texto) sp.textContent = texto;
  setTimeout(() => {
    if (b.isConnected) {
      b.dataset.armed = "";
      b.classList.remove("armed");
      if (sp) sp.textContent = antes;
    }
  }, 4000);
  return false;
}

// ---------- eventos ----------

$("dvNew").onclick = () => {
  devEdit = "nova";
  renderDev();
  $("dfDev").focus();
};
$("dvQ").addEventListener("input", renderDev);
$("dvF").addEventListener("input", renderDev);
$("dvO").addEventListener("input", renderDev);
$("devVerTodos").onclick = () => {
  $("dvF").value = "";
  $("dvO").value = "dias";
  renderDev();
  $("devList").scrollIntoView({ behavior: "smooth", block: "start" });
};
$("devCrit").addEventListener("click", (e) => {
  const it = e.target.closest("[data-dvopen]");
  if (!it) return;
  devOpen = it.dataset.dvopen;
  devEdit = null;
  renderDev();
  const tr = document.querySelector('#devList tr[data-dv="' + CSS.escape(devOpen) + '"]');
  if (tr) tr.scrollIntoView({ behavior: "smooth", block: "center" });
});

$("devList").addEventListener("click", (e) => {
  const op = e.target.closest("[data-dvopen]");
  if (op) {
    devOpen = devOpen === op.dataset.dvopen ? null : op.dataset.dvopen;
    if (devEdit !== "nova") devEdit = null;
    renderDev();
    return;
  }
  if (e.target.closest("[data-dfcancel]")) {
    devEdit = null;
    renderDev();
    return;
  }
  const ed = e.target.closest("[data-dved]");
  if (ed) {
    devEdit = ed.dataset.dved;
    devOpen = ed.dataset.dved;
    renderDev();
    $("dfDev").focus();
    return;
  }

  const sv = e.target.closest("[data-dfsave]");
  if (sv) {
    const devedor = $("dfDev").value.trim(),
      valor = parseBRL($("dfVal").value);
    if (!devedor) return setStatus("Digite o nome da oficina ou do devedor.");
    if (!valor) return setStatus("Digite o valor total da dívida.");
    const nova = sv.dataset.dfsave === "nova";
    const base = nova
      ? { id: "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), descontos: [], criado_em: new Date().toISOString() }
      : dividas.find((x) => x.id === sv.dataset.dfsave);
    const d = Object.assign({}, base, {
      devedor,
      referente: $("dfRef").value.trim(),
      valor_total: valor,
      obs: $("dfObs").value.trim(),
    });
    devEdit = null;
    devOpen = d.id;
    salvarDivida(d, nova ? "Dívida cadastrada" : "Dívida atualizada");
    return;
  }

  const del = e.target.closest("[data-dvdel]");
  if (del) {
    if (!confirmarClique(del, "Clique de novo para excluir")) return;
    const id = del.dataset.dvdel,
      antes = dividas.find((x) => x.id === id);
    dividas = dividas.filter((x) => x.id !== id);
    devOpen = null;
    renderDev();
    store
      .delDiv(id)
      .then(() => setStatus("Dívida excluída."))
      .catch((er) => {
        dividas.push(antes);
        renderDev();
        setStatus("Não foi possível excluir (" + er.message + ").");
      });
    return;
  }

  const add = e.target.closest("[data-dsadd]");
  if (add) {
    const d = dividas.find((x) => x.id === add.dataset.dsadd),
      valor = parseBRL($("dsValor").value);
    if (!valor) return setStatus("Digite o valor deduzido.");
    const desc = {
      data: $("dsData").value || null,
      placa: $("dsPlaca").value.trim().toUpperCase(),
      valor,
      obs: $("dsObs").value.trim(),
    };
    salvarDivida(Object.assign({}, d, { descontos: (d.descontos || []).concat([desc]) }), "Desconto lançado");
    setTimeout(() => $("dsPlaca") && $("dsPlaca").focus(), 0);
    return;
  }

  const ds = e.target.closest("[data-dsdel]");
  if (ds) {
    if (!confirmarClique(ds)) return setStatus("Clique de novo na lixeira para excluir o desconto.");
    const d = dividas.find((x) => x.id === ds.closest("[data-dv]").dataset.dv);
    const L = d.descontos.slice();
    L.splice(Number(ds.dataset.dsdel), 1);
    salvarDivida(Object.assign({}, d, { descontos: L }), "Desconto excluído");
  }
});

$("devList").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (e.target.closest(".dv-add")) {
    e.preventDefault();
    document.querySelector("[data-dsadd]").click();
  } else if (e.target.closest(".dv-form")) {
    e.preventDefault();
    document.querySelector("[data-dfsave]").click();
  }
});
$("devList").addEventListener("focusout", (e) => {
  if (e.target.closest(".mi")) {
    const v = parseBRL(e.target.value);
    if (v != null) e.target.value = fmtIn(v);
  }
});
