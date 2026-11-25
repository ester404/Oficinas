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

function divOrdenadas() {
  const q = ($("dvQ").value || "").trim().toUpperCase(),
    f = $("dvF").value;
  return dividas
    .filter((d) => !q || (d.devedor + " " + (d.referente || "")).toUpperCase().includes(q))
    .filter((d) => !f || (f === "q" ? divCalc(d).quitada : !divCalc(d).quitada))
    .sort((a, b) => divCalc(b).saldo - divCalc(a).saldo || a.devedor.localeCompare(b.devedor));
}

// ---------- desenho ----------

function renderDev() {
  if (!$("devList")) return;
  const tot = dividas.reduce(
    (a, d) => {
      const c = divCalc(d);
      a.total += c.total;
      a.desc += c.desc;
      a.saldo += Math.max(0, c.saldo);
      a.quit += c.quitada ? 1 : 0;
      return a;
    },
    { total: 0, desc: 0, saldo: 0, quit: 0 },
  );
  const box = (l, v, c) => '<div class="' + (c || "") + '"><small>' + l + "</small><b>" + v + "</b></div>";
  $("devStats").innerHTML =
    box("Total das dívidas", money(tot.total)) +
    box("Já descontado", money(tot.desc), "pos") +
    box("Saldo devedor", money(tot.saldo), "big neg") +
    box("Dívidas quitadas", tot.quit + " de " + dividas.length);

  $("devBanner").hidden = divOk;
  const L = divOrdenadas();
  let h = devEdit === "nova" ? divForm(null) : "";
  if (!dividas.length && devEdit !== "nova")
    h +=
      '<div class="vempty"><b>Nenhuma dívida cadastrada</b><span>Clique em “Nova dívida” para lançar a primeira.</span></div>';
  else if (!L.length && devEdit !== "nova")
    h += '<div class="vempty"><b>Nada encontrado</b><span>Mude a busca ou o filtro.</span></div>';
  h += L.map(divCard).join("");
  $("devList").innerHTML = h;
}

function divCard(d) {
  const c = divCalc(d),
    id = esc(d.id),
    aberto = devOpen === d.id;
  const pct = c.total ? Math.min(100, Math.round((c.desc / c.total) * 100)) : 0;
  let h =
    '<article class="dv' +
    (c.quitada ? " ok" : "") +
    (aberto ? " open" : "") +
    '" data-dv="' +
    id +
    '"><button type="button" class="dv-head" data-dvopen="' +
    id +
    '" aria-expanded="' +
    aberto +
    '"><span class="dv-ic">' +
    DIV_IC +
    '</span><span class="dv-t"><b>' +
    esc(d.devedor) +
    "</b><small>" +
    esc(d.referente || "") +
    '</small></span><span class="dv-num"><small>Total</small>' +
    money(c.total) +
    '</span><span class="dv-num"><small>Descontado</small>' +
    money(c.desc) +
    '</span><span class="dv-num saldo"><small>' +
    (c.quitada ? "Quitada" : "Saldo devedor") +
    "</small>" +
    money(Math.max(0, c.saldo)) +
    '</span><span class="dv-chip">' +
    (c.quitada ? "Quitada" : "Em pagamento") +
    '</span><svg class="dv-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
    '<div class="dv-bar" title="' +
    pct +
    '% descontado"><i style="width:' +
    pct +
    '%"></i></div>';
  if (aberto) h += devEdit === d.id ? divForm(d) : divDetail(d, c);
  return h + "</article>";
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
