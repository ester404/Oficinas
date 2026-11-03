/* Aba "Financeiro": veículos por oficina, saldos e compensação de débitos. */

let vEdit = null;

const VF = [
  ["vfLq", "liquido"],
  ["vfCp", "complemento"],
  ["vfFr", "franquia"],
  ["vfPg", "pago"],
  ["vfPc", "pecas"],
];

// Veículos de uma oficina em um mês, na ordem em que foram lançados.
function vehList(m, of) {
  return Object.values(veic)
    .filter((v) => v.mes === m && v.oficinaId === of)
    .sort(
      (a, b) =>
        String(a.criadoEm || "").localeCompare(String(b.criadoEm || "")) ||
        String(a.id).localeCompare(String(b.id)),
    );
}

// Calcula o mês de uma oficina:
// saldo do veículo = líquido + complemento + franquia − já pago − peças.
// Veículos com saldo negativo viram débito, que é descontado dos próximos
// veículos positivos. O que sobrar de débito ("restante") passa para o mês seguinte.
function calcMonth(list, carryIn) {
  const rows = list.map((v) => {
    const fr = num(v.franquia) || 0,
      lq = num(v.liquido) || 0,
      cp = num(v.complemento) || 0,
      pc = num(v.pecas) || 0,
      pg = num(v.pago) || 0;
    return {
      v,
      fr,
      lq,
      cp,
      pc,
      pg,
      saldo: Math.round((lq + cp + fr - pg - pc) * 100) / 100,
      desc: 0,
      pagar: 0,
    };
  });
  let debt = carryIn + rows.reduce((a, r) => a + (r.saldo < 0 ? -r.saldo : 0), 0);
  const debtTotal = debt;
  for (const r of rows) {
    if (r.saldo > 0) {
      r.desc = Math.min(r.saldo, debt);
      debt = Math.round((debt - r.desc) * 100) / 100;
      r.pagar = Math.round((r.saldo - r.desc) * 100) / 100;
    }
  }
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  return {
    rows,
    carryIn,
    debtTotal,
    restante: Math.round(debt * 100) / 100,
    fr: sum("fr"),
    lq: sum("lq"),
    cp: sum("cp"),
    pc: sum("pc"),
    pg: sum("pg"),
    pagar: Math.round(sum("pagar") * 100) / 100,
  };
}

// Resultado do mês já considerando o débito que veio dos meses anteriores.
function fin(m, of) {
  const ms = [
    ...new Set(
      Object.values(veic)
        .filter((v) => v.oficinaId === of && v.mes < m)
        .map((v) => v.mes),
    ),
  ].sort();
  let carry = 0;
  for (const mm of ms) carry = calcMonth(vehList(mm, of), carry).restante;
  return calcMonth(vehList(m, of), carry);
}

function renderFin() {
  if (!$("finPanel")) return;
  if (!oficinas.length && !descreds.length) {
    $("finOfs").innerHTML = "";
    $("finHead").innerHTML =
      '<div class="empty">' +
      (ready ? "Cadastre uma oficina na aba Avaliação do mês." : "Carregando…") +
      "</div>";
    $("finBody").innerHTML = "";
    return;
  }
  const fOfs = oficinas.concat(descreds);
  if (!selOf || !fOfs.some((o) => o.id === selOf)) selOf = fOfs[0].id;
  $("finOfs").innerHTML = fOfs
    .map((o) => {
      const r = fin(mes, o.id);
      const n = r.rows.length;
      let st = '<span class="fz">Sem veículos</span>';
      if (r.restante > 0) st = '<span class="fneg">Devendo ' + money(r.restante) + "</span>";
      else if (n || r.carryIn) st = '<span class="fpos">A pagar ' + money(r.pagar) + "</span>";
      return (
        '<button class="fo' +
        (o.id === selOf ? " on" : "") +
        (r.restante > 0 ? " neg" : "") +
        '" data-of="' +
        esc(o.id) +
        '"><b>' +
        esc(o.nome) +
        "</b><small>" +
        n +
        " veículo" +
        (n === 1 ? "" : "s") +
        (o.descredenciada ? " · descredenciada" : "") +
        "</small>" +
        st +
        "</button>"
      );
    })
    .join("");
  const o = fOfs.find((x) => x.id === selOf),
    r = fin(mes, selOf);
  let h =
    '<div class="phead"><div><h2>' +
    esc(o.nome) +
    '</h2><p class="psub">Veículos de ' +
    label(mes) +
    ' · Saldo = líquido + complemento + franquia − já pago − peças.</p></div><button type="button" class="btn" id="vNew"><span aria-hidden="true">+</span> Novo veículo</button></div>';
  if (!veicOk)
    h +=
      '<div class="banner">A tabela de veículos ainda não existe no Supabase. Rode o SQL do financeiro (veja o LEIA-ME) e recarregue a página.</div>';
  const box = (l, v, c) => '<div class="' + (c || "") + '"><small>' + l + "</small><b>" + v + "</b></div>";
  h +=
    '<div class="fstats">' +
    box("Líquido dos reparos", money(r.lq)) +
    box("Complementos", money(r.cp)) +
    box("Franquias", money(r.fr)) +
    box("Já pago", "− " + money(r.pg), "m") +
    box("Peças compradas", "− " + money(r.pc), "m") +
    (r.carryIn ? box("Débito do mês anterior", "− " + money(r.carryIn), "m") : "") +
    box(
      r.restante > 0 ? "Devendo" : "Total a pagar",
      money(r.restante > 0 ? r.restante : r.pagar),
      r.restante > 0 ? "big neg" : "big pos",
    ) +
    "</div>";
  $("finHead").innerHTML = h;
  let t = "";
  if (!r.rows.length)
    t =
      '<div class="vempty"><b>Nenhum veículo lançado</b><span>Clique em “Novo veículo” para lançar o primeiro veículo da ' +
      esc(o.nome) +
      " em " +
      label(mes) +
      ".</span></div>";
  else {
    t =
      '<div class="scroll"><table class="vt"><thead><tr><th class="l">Veículo</th><th>Líquido</th><th>Complemento</th><th>Franquia</th><th>Já pago</th><th>Peças</th><th>Saldo</th><th>A pagar</th><th><span class="sr">Ações</span></th></tr></thead><tbody>';
    const val = (n, neg) =>
      n
        ? "<span" + (neg ? ' class="m"' : "") + ">" + (neg ? "− " : "") + money(n) + "</span>"
        : '<span class="z">—</span>';
    for (const x of r.rows) {
      const v = x.v,
        id = esc(v.id),
        neg = x.saldo < 0;
      const note = neg
        ? '<small class="tneg">descontado de outros veículos</small>'
        : x.desc > 0
          ? '<small class="tneg">− ' + money(x.desc) + " de compensação</small>"
          : "";
      t +=
        '<tr class="' +
        (neg ? "rneg" : "") +
        (vEdit === v.id ? " editing" : "") +
        '" data-v="' +
        id +
        '"><td class="l"><div class="vid"><b>' +
        esc(v.placa || "Sem placa") +
        "</b><small>" +
        esc(v.descricao || "") +
        "</small></div></td>" +
        "<td>" +
        val(x.lq) +
        "</td><td>" +
        val(x.cp) +
        "</td><td>" +
        val(x.fr) +
        "</td><td>" +
        val(x.pg, 1) +
        "</td><td>" +
        val(x.pc, 1) +
        "</td>" +
        '<td><b class="' +
        (neg ? "tneg" : "tpos") +
        '">' +
        money(x.saldo) +
        '</b></td><td><div class="pg"><b class="' +
        (x.pagar > 0 ? "tpos" : "z") +
        '">' +
        money(x.pagar) +
        "</b>" +
        note +
        "</div></td>" +
        '<td class="acts"><button class="ico" data-ved="' +
        id +
        '" title="Editar veículo" aria-label="Editar">' +
        ICO_ED +
        '</button><button class="ico red" data-del="' +
        id +
        '" title="Excluir veículo" aria-label="Excluir">' +
        ICO_TR +
        "</button></td></tr>";
    }
    t +=
      '</tbody><tfoot><tr><td class="l"><b>Total · ' +
      r.rows.length +
      " veículo" +
      (r.rows.length === 1 ? "" : "s") +
      "</b></td><td>" +
      money(r.lq) +
      "</td><td>" +
      money(r.cp) +
      "</td><td>" +
      money(r.fr) +
      "</td><td>− " +
      money(r.pg) +
      "</td><td>− " +
      money(r.pc) +
      '</td><td></td><td><b class="' +
      (r.restante > 0 ? "tneg" : "tpos") +
      '">' +
      money(r.restante > 0 ? -r.restante : r.pagar) +
      "</b></td><td></td></tr></tfoot></table></div>";
  }
  if (r.restante > 0)
    t +=
      '<div class="fmsg neg"><b>A oficina ficou devendo ' +
      money(r.restante) +
      ".</b> Os valores já pagos e as peças compradas passaram do valor dos reparos, complementos e franquias deste mês. Esse valor será descontado automaticamente dos veículos do próximo mês.</div>";
  else if (r.debtTotal > 0)
    t +=
      '<div class="fmsg pos"><b>Débito de ' +
      money(r.debtTotal) +
      " compensado.</b> O valor que faltou" +
      (r.carryIn ? " (incluindo o débito do mês anterior)" : "") +
      " foi descontado de outros veículos desta oficina.</div>";
  else if (r.rows.length)
    t += '<div class="fmsg pos"><b>Tudo certo.</b> Nenhum veículo ficou com saldo negativo.</div>';
  $("finBody").innerHTML = t;
}

function openVForm(id) {
  vEdit = id || null;
  const v = id ? veic[id] : {};
  const o = oficinas.concat(descreds).find((x) => x.id === selOf);
  $("vfTitle").textContent = id
    ? "Editar veículo " + (v.placa || "")
    : "Novo veículo · " + (o ? o.nome : "");
  $("vfPlaca").value = v.placa || "";
  $("vfDesc").value = v.descricao || "";
  for (const [el, k] of VF) $(el).value = fmtIn(v[k]);
  $("vfSave").textContent = id ? "Salvar alterações" : "Adicionar veículo";
  $("vFormBox").hidden = false;
  updPrev();
  renderFin();
  $("vfPlaca").focus();
}

function closeVForm() {
  vEdit = null;
  $("vFormBox").hidden = true;
  renderFin();
}

function updPrev() {
  const g = (k) => parseBRL($(k).value) || 0;
  const sd = Math.round((g("vfLq") + g("vfCp") + g("vfFr") - g("vfPg") - g("vfPc")) * 100) / 100;
  $("vfPrev").className = "vf-prev " + (sd < 0 ? "neg" : "pos");
  $("vfPrev").innerHTML =
    "<small>Saldo deste veículo</small><b>" +
    money(sd) +
    "</b>" +
    (sd < 0 ? "<em>Será descontado de outros veículos</em>" : "");
}

function saveVForm() {
  const pl = $("vfPlaca").value.trim().toUpperCase(),
    ds = $("vfDesc").value.trim();
  if (!pl && !ds) {
    setStatus("Digite a placa ou a descrição do veículo.");
    $("vfPlaca").focus();
    return;
  }
  const base = vEdit
    ? veic[vEdit]
    : {
        id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        mes,
        oficinaId: selOf,
        criadoEm: new Date().toISOString(),
      };
  const v = Object.assign({}, base, { placa: pl, descricao: ds });
  for (const [el, k] of VF) v[k] = parseBRL($(el).value);
  const wasNew = !vEdit;
  veic[v.id] = v;
  vPending[v.id] = v;
  setStatus("Salvando…");
  if (wasNew) {
    openVForm(null);
  } else closeVForm();
  store
    .saveVeh(v)
    .then(() => {
      if (vPending[v.id] === v) delete vPending[v.id];
      setStatus(
        (wasNew ? "Veículo " + (pl || ds) + " adicionado" : "Veículo " + (pl || ds) + " atualizado") +
          " às " +
          hora(),
      );
    })
    .catch((e) => setStatus("Não foi possível salvar o veículo (" + e.message + ")."));
  renderFin();
}

$("v-fin").addEventListener("click", (e) => {
  const fo = e.target.closest("[data-of]");
  if (fo) {
    selOf = fo.dataset.of;
    if (!$("vFormBox").hidden) closeVForm();
    else renderFin();
    return;
  }
  if (e.target.closest("#vNew")) {
    openVForm(null);
    return;
  }
  if (e.target.closest("[data-vfclose]")) {
    closeVForm();
    return;
  }
  if (e.target.closest("#vfSave")) {
    saveVForm();
    return;
  }
  const ed = e.target.closest("[data-ved]");
  if (ed) {
    openVForm(ed.dataset.ved);
    $("vFormBox").scrollIntoView({ block: "nearest" });
    return;
  }
  const d = e.target.closest("[data-del]");
  if (d) {
    if (d.dataset.armed !== "1") {
      d.dataset.armed = "1";
      d.classList.add("armed");
      d.title = "Clique de novo para excluir";
      setTimeout(() => {
        if (d.isConnected) {
          d.dataset.armed = "";
          d.classList.remove("armed");
        }
      }, 4000);
      return;
    }
    const id = d.dataset.del;
    const old = veic[id];
    delete veic[id];
    delete vPending[id];
    if (vEdit === id) closeVForm();
    else renderFin();
    store
      .delVeh(id)
      .then(() => setStatus("Veículo excluído."))
      .catch((er) => {
        veic[id] = old;
        renderFin();
        setStatus("Não foi possível excluir (" + er.message + ").");
      });
    return;
  }
  const row = e.target.closest("tr[data-v]");
  if (row && !e.target.closest("button")) {
    openVForm(row.dataset.v);
    $("vFormBox").scrollIntoView({ block: "nearest" });
  }
});

$("vFormBox").addEventListener("input", () => updPrev());

$("vFormBox").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    saveVForm();
  }
  if (e.key === "Escape") closeVForm();
});

$("vFormBox").addEventListener("focusout", (e) => {
  const el = e.target;
  if (el.closest(".mi")) {
    const v = parseBRL(el.value);
    if (v != null) el.value = fmtIn(v);
  }
});
