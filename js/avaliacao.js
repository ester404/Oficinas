/* Aba "Avaliação do mês": lista de oficinas, critérios, veículos enviados, resumo e exportação. */

let selEval = null; // oficina aberta no painel
let selVeh = 0; // veículo sendo avaliado (posição na lista)

const CRIT_IC = {
  q: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
  p: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  s: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/></svg>',
  o: '<svg viewBox="0 0 24 24"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>',
  d: '<svg viewBox="0 0 24 24"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  e: '<svg viewBox="0 0 24 24"><path d="M3 21V9l9-6 9 6v12"/><path d="M8 21v-7h8v7"/></svg>',
};

const CRIT_TXT = {
  q: [
    "Qualidade do reparo",
    "Sem retrabalho; sem reclamação de peças ou pintura",
  ],
  p: ["Prazo de entrega", "Veículo entregue na data prometida ou antes"],
  s: ["Satisfação do cliente", "Notas e avaliações dos associados"],
  o: ["Preço e orçamento", "Orçamento final igual ao aprovado, sem extras"],
  d: ["Documentação", "Notas fiscais e fotos enviadas rápido"],
  e: ["Estrutura da oficina", "Ferramentas, alinhamento e organização"],
};

function updCards() {
  for (const [k, mx] of PTS) {
    const el = $("vc-" + k);
    const b = document.querySelector('[data-ccb="' + k + '"]');
    if (!el || !b) continue;
    const v = num(el.value);
    const pc = v == null ? 0 : Math.max(0, Math.min(100, (v / mx) * 100));
    b.style.width = pc + "%";
    b.className = pc >= 90 ? "hi" : pc >= 65 ? "md" : pc > 0 ? "lo" : "";
    const c = document.querySelector('[data-cc="' + k + '"]');
    c.classList.toggle("filled", v != null);
    document.querySelector('[data-ccp="' + k + '"]').textContent =
      v == null ? "Sem nota" : Math.round(pc) + "% do máximo";
  }
}

function envList(m, id) {
  return parseEnviados((rec(m, id) || {}).enviados);
}

function carCount(m, id) {
  const n = envList(m, id).length;
  return n || num((rec(m, id) || {}).carros) || 0;
}

// Seção "Veículos do mês": cadastro dos veículos enviados e avaliação de cada um.
function envHtml(o) {
  const L = envList(mes, o.id),
    id = esc(o.id);
  if (selVeh >= L.length) selVeh = Math.max(0, L.length - 1);
  let h =
    '<div class="ep-sec env"><div class="env-h"><h3>Veículos do mês · <span class="h3o">' +
    esc(o.nome) +
    '</span></h3><span class="env-n" id="envN">' +
    L.length +
    " veículo" +
    (L.length === 1 ? "" : "s") +
    " em " +
    label(mes) +
    "</span></div>" +
    '<div class="env-add"><input type="text" id="envPl" maxlength="10" placeholder="Placa" aria-label="Placa"><input type="text" id="envDs" maxlength="80" placeholder="Modelo, nº do sinistro (opcional)" aria-label="Modelo ou sinistro"><input type="date" id="envDt" aria-label="Data de entrada" title="Data de entrada na oficina"><button type="button" class="btn" data-envadd="' +
    id +
    '"><span aria-hidden="true">+</span> Adicionar veículo</button></div>';
  if (!L.length)
    return (
      h +
      '<p class="env-empty">Nenhum veículo lançado para esta oficina neste mês. Adicione a placa acima para avaliar o serviço feito nele.</p></div>'
    );
  h +=
    '<ul class="env-l">' +
    L.map((v, i) => {
      const t = somaCriterios(v),
        n = nivel(t);
      return (
        '<li class="' +
        (i === selVeh ? "on " : "") +
        (n || "") +
        '"><button type="button" class="env-sel" data-vsel="' +
        i +
        '"><span class="env-i">' +
        (i + 1) +
        '</span><span class="env-t"><b>' +
        esc(v.placa || "Sem placa") +
        "</b><small>" +
        esc(v.descricao || "") +
        (v.data
          ? (v.descricao ? " · " : "") + "entrada " + fdate(v.data)
          : "") +
        '</small></span><span class="env-s" data-vs="' +
        i +
        '">' +
        (t == null ? "Avaliar" : t) +
        '</span></button><button type="button" class="ico red" data-envdel="' +
        i +
        '" title="Remover veículo" aria-label="Remover veículo">' +
        ICO_TR +
        "</button></li>"
      );
    }).join("") +
    "</ul></div>";
  return h + vehEvalHtml(L[selVeh], L.length);
}

// Critérios do veículo selecionado.
function vehEvalHtml(v, qtd) {
  let h =
    '<div class="ep-sec veh-eval"><div class="env-h"><h3>Avaliação do veículo · <span class="h3o">' +
    esc(v.placa || v.descricao || "Sem placa") +
    '</span></h3><span class="veh-tot" id="vehTot"></span></div><div class="crits">';
  for (const [k, mx] of PTS) {
    h +=
      '<div class="ccrit" data-cc="' +
      k +
      '"><div class="cc-top"><span class="cc-ic">' +
      CRIT_IC[k] +
      '</span><div class="cc-t"><b>' +
      CRIT_TXT[k][0] +
      "</b><small>" +
      CRIT_TXT[k][1] +
      "</small></div></div>" +
      '<div class="cc-in"><button type="button" class="stp" data-step="' +
      k +
      '" data-d="-1" aria-label="Diminuir">−</button>' +
      '<label class="cc-val"><input type="number" inputmode="decimal" min="0" max="' +
      mx +
      '" step="0.5" placeholder="–" data-vc="' +
      k +
      '" id="vc-' +
      k +
      '" aria-label="' +
      CRIT_TXT[k][0] +
      '" value="' +
      esc(v[k] ?? "") +
      '"><span>de ' +
      mx +
      "</span></label>" +
      '<button type="button" class="stp" data-step="' +
      k +
      '" data-d="1" aria-label="Aumentar">+</button></div>' +
      '<div class="cc-bar"><i data-ccb="' +
      k +
      '"></i></div><div class="cc-ft"><span data-ccp="' +
      k +
      '">Sem nota</span><button type="button" class="cc-max" data-step="' +
      k +
      '" data-d="max">Nota máxima</button></div></div>';
  }
  h +=
    '</div><div class="veh-nav"><button type="button" class="btn ghost2" data-vnav="-1"' +
    (selVeh === 0 ? " disabled" : "") +
    '>‹ Veículo anterior</button><button type="button" class="btn ghost2" data-vnav="1"' +
    (selVeh >= qtd - 1 ? " disabled" : "") +
    ">Próximo veículo ›</button></div></div>";
  return h;
}

// Atualiza a nota do veículo selecionado na tela (sem redesenhar o painel).
function updVehUI() {
  const v = envList(mes, selEval)[selVeh];
  if (!v) return;
  const t = somaCriterios(v),
    n = nivel(t);
  const s = document.querySelector('[data-vs="' + selVeh + '"]');
  if (s) s.textContent = t == null ? "Avaliar" : t;
  const li = s && s.closest("li");
  if (li) li.className = "on " + (n || "");
  if ($("vehTot"))
    $("vehTot").innerHTML =
      t == null
        ? "Sem nota"
        : "Nota do veículo: <b>" +
          t +
          "</b>" +
          (n ? ' <span class="badge ' + n + '">' + n + "</span>" : "");
}

// Grava a nota de um critério no veículo selecionado.
function setVehScore(k, val) {
  const L = envList(mes, selEval).slice();
  if (!L[selVeh]) return;
  L[selVeh] = Object.assign({}, L[selVeh], { [k]: val });
  const kk = key(mes, selEval);
  pending[kk] = Object.assign({}, aval[kk] || {}, pending[kk] || {}, {
    enviados: L,
  });
  queueSave(selEval);
  updVehUI();
}

function addEnv() {
  const pl = $("envPl").value.trim().toUpperCase(),
    ds = $("envDs").value.trim(),
    dt = $("envDt").value;
  if (!pl && !ds) {
    setStatus("Digite a placa do veículo.");
    $("envPl").focus();
    return;
  }
  if (pl && envList(mes, selEval).some((v) => v.placa === pl)) {
    setStatus("A placa " + pl + " já está na lista deste mês.");
    return;
  }
  const L = envList(mes, selEval).concat([
    { placa: pl, descricao: ds, data: dt || null },
  ]);
  selVeh = L.length - 1;
  setEnv(selEval, L);
  setStatus("Veículo " + (pl || ds) + " adicionado.");
  setTimeout(() => {
    const x = $("envPl");
    if (x) x.focus();
  }, 0);
}

function setEnv(id, arr) {
  const k = key(mes, id);
  pending[k] = Object.assign({}, aval[k] || {}, pending[k] || {}, {
    enviados: arr,
  });
  const c = $("i-" + id + "-carros");
  if (c) c.value = arr.length || "";
  queueSave(id);
  renderMonth();
  renderHist();
}

// Situação da oficina no mês, contando os veículos avaliados.
function stInfo(id) {
  const r = rec(mes, id) || {};
  const L = envList(mes, id);
  if (!L.length)
    return somaCriterios(r) != null
      ? ["Avaliada (geral)", "ok"]
      : ["Sem veículos", ""];
  const completos = L.filter((v) =>
    PTS.every(([k]) => num(v[k]) != null),
  ).length;
  const iniciados = L.filter((v) => somaCriterios(v) != null).length;
  if (completos === L.length) return ["Avaliada", "ok"];
  if (iniciados) return ["Em andamento · " + completos + "/" + L.length, "mid"];
  return ["Pendente", ""];
}

function renderMonth() {
  syncPicker();
  const ul = $("rows");
  $("tblTitle").innerHTML = "Oficinas<small>" + label(mes) + "</small>";
  if (!oficinas.length) {
    ul.innerHTML =
      '<li class="empty">' +
      (ready
        ? "Nenhuma oficina cadastrada. Digite o nome abaixo e clique em “Adicionar”."
        : "Carregando oficinas…") +
      "</li>";
    $("evalPanel").innerHTML =
      '<div class="empty">' +
      (ready ? "Cadastre uma oficina para começar." : "Carregando…") +
      "</div>";
    renderComputed();
    return;
  }
  if (!selEval || !oficinas.some((o) => o.id === selEval))
    selEval = oficinas[0].id;
  let lst = oficinas.slice();
  const q = ($("fQ").value || "").trim().toUpperCase(),
    fl = $("fLv").value,
    od = $("fOrd").value;
  if (q) lst = lst.filter((o) => o.nome.toUpperCase().includes(q));
  if (fl)
    lst = lst.filter((o) => {
      const n = nivel(total(rec(mes, o.id)));
      return fl === "none" ? !n : n === fl;
    });
  const tt = (o) => total(rec(mes, o.id));
  if (od === "desc") lst.sort((a, b) => (tt(b) ?? -1) - (tt(a) ?? -1));
  else if (od === "asc") lst.sort((a, b) => (tt(a) ?? 999) - (tt(b) ?? 999));
  else if (od === "nome") lst.sort((a, b) => a.nome.localeCompare(b.nome));
  ul.innerHTML =
    (lst.length
      ? ""
      : '<li class="empty">Nenhuma oficina encontrada com esse filtro.</li>') +
    lst
      .map(
        (o) =>
          '<li><button type="button" class="oi' +
          (o.id === selEval ? " on" : "") +
          '" data-sel="' +
          esc(o.id) +
          '"><span class="av" data-av="' +
          esc(o.id) +
          '">' +
          esc(inis(o.nome)) +
          '</span><span class="oi-n"><b>' +
          esc(o.nome) +
          '</b><small data-st="' +
          esc(o.id) +
          '"></small></span><span class="oi-t" data-tt="' +
          esc(o.id) +
          '"></span></button></li>',
      )
      .join("");
  const o = oficinas.find((x) => x.id === selEval),
    a = rec(mes, o.id) || {},
    id = esc(o.id),
    idx = oficinas.indexOf(o);
  let h =
    '<div class="ep-head"><div class="ep-who"><span class="av big" id="epAv">' +
    esc(inis(o.nome)) +
    '</span><div><div class="ep-k">Avaliação de ' +
    label(mes) +
    "</div><h2>" +
    esc(o.nome) +
    '</h2><small id="epSt"></small></div></div>' +
    '<div class="ep-score"><svg viewBox="0 0 120 120" class="ring" aria-hidden="true"><circle cx="60" cy="60" r="50" class="rg-bg"/><circle cx="60" cy="60" r="50" class="rg-fg" id="rgFg" pathLength="100"/></svg><div class="ring-c"><b id="epTot">—</b><small>de 100</small></div></div>' +
    '<div class="ep-res"><div id="epBadge"></div><div class="ep-pos" id="epPos"></div></div>' +
    '<div class="ep-cars"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/></svg><b id="epCars">0</b><small id="epCarsL">veículos</small></div></div>';
  h += envHtml(o);
  h +=
    '<div class="ep-sec"><h3>Indicadores do mês · <span class="h3o">' +
    esc(o.nome) +
    '</span></h3><div class="inds">';
  for (const [k, l] of IND)
    h +=
      "<label>" +
      l +
      '<input type="number" inputmode="decimal" min="0" ' +
      (k === "notaCliente" ? 'max="10" step="0.1"' : 'step="1"') +
      ' placeholder="–" data-f="' +
      k +
      '" id="i-' +
      id +
      "-" +
      k +
      '" value="' +
      esc(a[k] ?? "") +
      '"></label>';
  h +=
    '<label class="obs">Observações<textarea data-f="obs" id="i-' +
    id +
    '-obs" placeholder="Anotações sobre a oficina neste mês">' +
    esc(a.obs || "") +
    "</textarea></label></div></div>";
  h +=
    '<div class="dcform" id="dcForm" hidden><div class="dchead"><b>Descredenciar ' +
    esc(o.nome) +
    '</b><span>A oficina sai da avaliação e do ranking. As notas e os valores antigos continuam salvos.</span></div><label>Motivo do descredenciamento<textarea id="dcm-' +
    id +
    '" placeholder="Ex.: atrasos recorrentes, reclamações de qualidade, nota Bronze por 3 meses…"></textarea></label><div class="dcacts"><button type="button" class="btn red" data-dcok="' +
    id +
    '">Confirmar descredenciamento</button><button type="button" class="btn ghost2" data-dcno="1">Cancelar</button></div></div>';
  h +=
    '<div class="renform" id="renForm" hidden><label>Novo nome da oficina<input type="text" id="renIn" maxlength="60" value="' +
    esc(o.nome) +
    '"></label><div class="dcacts"><button type="button" class="btn" data-renok="' +
    id +
    '">Salvar nome</button><button type="button" class="btn ghost2" data-renno="1">Cancelar</button></div></div>';
  h +=
    '<div class="ep-foot"><div class="ofacts"><button type="button" class="lnk" data-ren="' +
    id +
    '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>Editar nome</button><button type="button" class="lnk red" data-delof="' +
    id +
    '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg><span>Excluir oficina</span></button><button type="button" class="lnk red" data-dc="' +
    id +
    '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>Descredenciar oficina</button></div>' +
    '<div class="navb"><button type="button" class="btn ghost2" data-nav="-1"' +
    (idx === 0 ? " disabled" : "") +
    '>‹ Anterior</button><button type="button" class="btn" data-nav="1"' +
    (idx === oficinas.length - 1 ? " disabled" : "") +
    ">Próxima oficina ›</button></div></div>";
  $("evalPanel").innerHTML = h;
  updCards();
  updVehUI();
  renderComputed();
}

function renderComputed() {
  const list = oficinas.map((o) => ({ id: o.id, t: total(rec(mes, o.id)) }));
  const scored = list.filter((x) => x.t != null).sort((a, b) => b.t - a.t);
  const cnt = { Diamante: 0, Ouro: 0, Prata: 0, Bronze: 0 };
  for (const x of list) {
    const n = nivel(x.t);
    if (n) cnt[n]++;
    const av = document.querySelector('[data-av="' + CSS.escape(x.id) + '"]');
    if (!av) continue;
    av.className = "av " + (n || "");
    const [st, cl] = stInfo(x.id);
    const se = document.querySelector('[data-st="' + CSS.escape(x.id) + '"]');
    se.textContent = st;
    se.className = cl;
    document.querySelector('[data-tt="' + CSS.escape(x.id) + '"]').innerHTML =
      x.t == null
        ? '<span class="nil">—</span>'
        : '<b class="' + n + '">' + x.t + "</b>";
    if (x.id === selEval && $("epTot")) {
      $("epAv").className = "av big " + (n || "");
      $("epTot").textContent = x.t == null ? "—" : x.t;
      const fg = $("rgFg");
      fg.style.strokeDasharray = (x.t || 0) + " 100";
      fg.style.opacity = x.t ? 1 : 0;
      fg.setAttribute("class", "rg-fg " + (n || ""));
      $("epSt").textContent = st;
      $("epSt").className = cl;
      $("epBadge").innerHTML = n
        ? '<span class="badge ' + n + '">' + n + "</span>"
        : '<span class="dash">Sem nota</span>';
      const qv = carCount(mes, x.id);
      $("epCars").textContent = qv;
      $("epCarsL").textContent = qv === 1 ? "veículo" : "veículos";
      $("epPos").textContent =
        x.t == null
          ? ""
          : scored.findIndex((s) => s.t === x.t) +
            1 +
            "º lugar de " +
            list.length;
    }
  }
  const sem = list.length - scored.length;
  const done = list.filter((x) => stInfo(x.id)[1] === "ok").length,
    pct = list.length ? Math.round((done / list.length) * 100) : 0;
  const avg = scored.length
    ? Math.round((scored.reduce((a, b) => a + b.t, 0) / scored.length) * 10) /
      10
    : null;
  $("anTxt").textContent =
    done + " de " + list.length + " avaliações concluídas";
  $("anPct").textContent = pct + "%";
  $("progBar").style.width = pct + "%";
  const fl = $("fLv").value;
  $("levels").innerHTML =
    ["Diamante", "Ouro", "Prata", "Bronze"]
      .map((n) => lvTile(n, cnt[n], fl === n))
      .join("") + lvTile("Sem nota", sem, fl === "none");
  const st = (ic, l, v, c) =>
    '<div class="st4 ' +
    c +
    '"><span class="st-ic">' +
    ic +
    "</span><div><small>" +
    l +
    "</small><b>" +
    v +
    "</b></div></div>";
  $("stats4").innerHTML =
    st(
      '<svg viewBox="0 0 24 24"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg>',
      "Oficinas cadastradas",
      String(list.length).padStart(2, "0"),
      "g",
    ) +
    st(
      '<svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
      "Avaliadas",
      String(done).padStart(2, "0"),
      "g",
    ) +
    st(
      '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.4l6-.9z"/></svg>',
      "Pontuação média",
      avg == null ? "—" : avg.toLocaleString("pt-BR"),
      "g",
    ) +
    st(
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>',
      "Descredenciadas",
      String(descreds.length).padStart(2, "0"),
      "r",
    );
}

function lvTile(n, v, on) {
  const k = n === "Sem nota" ? "none" : n;
  const ic =
    n === "Sem nota"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="#7C858A" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9" fill="#7C858A22"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.2"/></svg>'
      : medal(COR[n], n);
  return (
    '<button type="button" class="lvb ' +
    k +
    (on ? " on" : "") +
    '" data-lv="' +
    (n === "Sem nota" ? "none" : n) +
    '" title="Filtrar: ' +
    n +
    '"><span class="lvb-ic">' +
    ic +
    "</span><b>" +
    v +
    "</b><small>" +
    n +
    "</small></button>"
  );
}

function syncInputs() {
  if (
    !$("evalPanel").contains(document.activeElement) &&
    !Object.keys(pending).length
  ) {
    renderMonth();
    return;
  }
  if (selEval && !pending[key(mes, selEval)]) {
    const a = rec(mes, selEval) || {};
    for (const k of [...FIELDS, "obs"]) {
      const el = $("i-" + selEval + "-" + k);
      if (!el || el === document.activeElement) continue;
      const v = a[k] ?? "";
      if (el.value !== String(v)) el.value = v;
    }
    const veh = envList(mes, selEval)[selVeh] || {};
    for (const [k] of PTS) {
      const el = $("vc-" + k);
      if (
        el &&
        el !== document.activeElement &&
        el.value !== String(veh[k] ?? "")
      )
        el.value = veh[k] ?? "";
    }
    updCards();
    updVehUI();
  }
  renderComputed();
}

function queueSave(id) {
  const k = key(mes, id),
    m = mes;
  const base = Object.assign({}, aval[k] || {}, pending[k] || {});
  for (const f of FIELDS) {
    const el = $("i-" + id + "-" + f);
    if (el) {
      const v =
        el.value.trim() === "" ? null : Number(el.value.replace(",", "."));
      base[f] = v == null || isNaN(v) ? null : v;
    }
  }
  const ob = $("i-" + id + "-obs");
  if (ob) base.obs = ob.value;
  base.key = k;
  base.mes = m;
  base.oficinaId = id;
  pending[k] = base;
  renderComputed();
  renderHist();
  clearTimeout(timers[k]);
  setStatus("Salvando…");
  timers[k] = setTimeout(() => {
    const body = Object.assign({}, pending[k], {
      atualizadoEm: new Date().toISOString(),
    });
    const snap = pending[k];
    chain[k] = (chain[k] || Promise.resolve())
      .then(() => store.saveAval(body))
      .then(() => {
        aval[k] = body;
        if (pending[k] === snap) delete pending[k];
        setStatus("Salvo às " + hora());
      })
      .catch((e) =>
        setStatus(
          "Não foi possível salvar (" +
            e.message +
            "). Confira a internet e altere o campo de novo.",
        ),
      );
  }, 700);
}

$("evalPanel").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.closest(".env-add")) {
    e.preventDefault();
    addEnv();
  }
});

$("evalPanel").addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.vc) {
    const mx = Number(el.max),
      v = el.value.trim() === "" ? null : Number(el.value.replace(",", "."));
    const bad = v != null && (isNaN(v) || v < 0 || v > mx);
    el.classList.toggle("bad", bad);
    if (bad)
      return setStatus(
        "Valor fora do limite (0 a " + mx + "). Corrija para salvar.",
      );
    updCards();
    setVehScore(el.dataset.vc, v);
    return;
  }
  if (!el.dataset.f) return;
  if (el.type === "number") {
    const mx = el.max ? Number(el.max) : Infinity;
    const v = Number(el.value);
    const bad = el.value !== "" && (isNaN(v) || v < 0 || v > mx);
    el.classList.toggle("bad", bad);
    if (bad) {
      setStatus(
        "Valor fora do limite (0 a " + el.max + "). Corrija para salvar.",
      );
      return;
    }
  }
  updCards();
  queueSave(selEval);
});

$("v-mes").addEventListener("click", (e) => {
  const sel = e.target.closest("[data-sel]");
  if (sel) {
    selEval = sel.dataset.sel;
    selVeh = 0;
    renderMonth();
    return;
  }
  const vs = e.target.closest("[data-vsel]");
  if (vs) {
    selVeh = Number(vs.dataset.vsel);
    renderMonth();
    return;
  }
  const vn = e.target.closest("[data-vnav]");
  if (vn) {
    selVeh += Number(vn.dataset.vnav);
    renderMonth();
    $("vc-q") &&
      $("vc-q").closest(".veh-eval").scrollIntoView({ block: "nearest" });
    return;
  }
  const ea = e.target.closest("[data-envadd]");
  if (ea) {
    addEnv();
    return;
  }
  const ed2 = e.target.closest("[data-envdel]");
  if (ed2) {
    const L = envList(mes, selEval).slice();
    const i = Number(ed2.dataset.envdel);
    if (ed2.dataset.armed !== "1") {
      ed2.dataset.armed = "1";
      ed2.classList.add("armed");
      ed2.title = "Clique de novo para remover";
      setTimeout(() => {
        if (ed2.isConnected) {
          ed2.dataset.armed = "";
          ed2.classList.remove("armed");
        }
      }, 4000);
      return;
    }
    L.splice(i, 1);
    if (selVeh >= i && selVeh > 0) selVeh--;
    setEnv(selEval, L);
    setStatus("Veículo removido da lista.");
    return;
  }
  if (e.target.closest("[data-ren]")) {
    const f = $("renForm");
    f.hidden = !f.hidden;
    if (!f.hidden) {
      $("renIn").focus();
      $("renIn").select();
    }
    return;
  }
  if (e.target.closest("[data-renno]")) {
    $("renForm").hidden = true;
    return;
  }
  const rk = e.target.closest("[data-renok]");
  if (rk) {
    renameOf(rk.dataset.renok, $("renIn").value);
    return;
  }
  const dl = e.target.closest("[data-delof]");
  if (dl) {
    delOf(dl, dl.dataset.delof);
    return;
  }
  const sp = e.target.closest("[data-step]");
  if (sp) {
    const k = sp.dataset.step,
      mx = PTS.find((x) => x[0] === k)[1],
      el = $("vc-" + k);
    let v = num(el.value) || 0;
    v =
      sp.dataset.d === "max"
        ? mx
        : Math.max(0, Math.min(mx, v + Number(sp.dataset.d)));
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  const nv = e.target.closest("[data-nav]");
  if (nv) {
    const i =
      oficinas.findIndex((o) => o.id === selEval) + Number(nv.dataset.nav);
    if (oficinas[i]) {
      selEval = oficinas[i].id;
      selVeh = 0;
      renderMonth();
      $("evalPanel").scrollIntoView({ block: "nearest" });
    }
    return;
  }
  const dc = e.target.closest("[data-dc]");
  if (dc) {
    const f = $("dcForm");
    f.hidden = !f.hidden;
    if (!f.hidden) f.querySelector("textarea").focus();
    return;
  }
  if (e.target.closest("[data-dcno]")) {
    $("dcForm").hidden = true;
    return;
  }
  const ok = e.target.closest("[data-dcok]");
  if (ok) {
    const o = oficinas.find((x) => x.id === ok.dataset.dcok);
    if (!o) return;
    const motivo = $("dcm-" + o.id).value.trim();
    if (!motivo) {
      setStatus("Escreva o motivo do descredenciamento.");
      $("dcm-" + o.id).focus();
      return;
    }
    const d = new Date();
    const hoje =
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");
    const nv2 = Object.assign({}, o, {
      descredenciada: true,
      motivo,
      descredenciada_em: hoje,
    });
    store
      .saveOf(nv2)
      .then(() => {
        oficinas = oficinas.filter((x) => x.id !== o.id);
        descreds.push(nv2);
        renderAll();
        setStatus(o.nome + " descredenciada.");
      })
      .catch((er) => setStatus(colErr(er)));
  }
});

["fQ", "fLv", "fOrd"].forEach((i) =>
  $(i).addEventListener("input", () => renderMonth()),
);

$("levels").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lv]");
  if (!b) return;
  $("fLv").value = $("fLv").value === b.dataset.lv ? "" : b.dataset.lv;
  renderMonth();
});

$("expBtn").onclick = () => {
  const all = oficinas.map((o) => ({ o, t: total(rec(mes, o.id)) }));
  const sc = all.filter((x) => x.t != null).sort((a, b) => b.t - a.t);
  const H = [
    "Oficina",
    "Qualidade (30)",
    "Prazo (20)",
    "Satisfação (20)",
    "Preço (15)",
    "Documentação (10)",
    "Estrutura (5)",
    "Total",
    "Nível",
    "Posição",
    "Carros atendidos",
    "Carros refeitos",
    "Entregas atrasadas",
    "Nota clientes",
    "Orçamentos com extra",
    "Observações",
    "Veículos enviados",
  ];
  const cell = (v) => {
    v = v == null ? "" : String(v).replace(".", ",");
    return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  const rows = all
    .sort((a, b) => (b.t ?? -1) - (a.t ?? -1))
    .map(({ o, t }) => {
      const r = rec(mes, o.id) || {};
      return [
        o.nome,
        ...PTS.map(([k]) => num(r[k])),
        t,
        nivel(t) || "Sem nota",
        t == null ? "" : sc.findIndex((x) => x.t === t) + 1 + "º",
        ...IND.map(([k]) => num(r[k])),
        r.obs || "",
        envList(mes, o.id)
          .map((v) => v.placa + (v.descricao ? " (" + v.descricao + ")" : ""))
          .join(", "),
      ]
        .map(cell)
        .join(";");
    });
  descreds.forEach((o) =>
    rows.push(
      [
        o.nome + " (descredenciada)",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Descredenciada",
        "",
        "",
        "",
        "",
        "",
        "",
        o.motivo || "",
      ]
        .map(cell)
        .join(";"),
    ),
  );
  // Segunda parte do relatório: a nota de cada veículo avaliado.
  const HV = [
    "Oficina",
    "Placa",
    "Veículo / sinistro",
    "Entrada",
    ...PTS.map(([k]) => CRIT_TXT[k][0]),
    "Nota do veículo",
    "Nível",
  ];
  const vrows = [];
  for (const o of oficinas)
    for (const v of envList(mes, o.id)) {
      const t = somaCriterios(v);
      vrows.push(
        [
          o.nome,
          v.placa,
          v.descricao,
          v.data ? fdate(v.data) : "",
          ...PTS.map(([k]) => num(v[k])),
          t,
          nivel(t) || "Sem nota",
        ]
          .map(cell)
          .join(";"),
      );
    }
  const csv =
    "\ufeff" +
    [
      "Ranking de Oficinas — " + label(mes),
      "",
      H.join(";"),
      ...rows,
      "",
      "Avaliação por veículo",
      HV.join(";"),
      ...vrows,
    ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  a.download = "ranking-oficinas-" + mes + ".csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
  setStatus("Relatório de " + label(mes) + " exportado (abre no Excel).");
};

$("addForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = $("newName").value.trim().toUpperCase();
  if (!nome) return;
  if (oficinas.some((o) => o.nome === nome)) {
    setStatus(nome + " já está cadastrada.");
    return;
  }
  if (descreds.some((o) => o.nome === nome)) {
    setStatus(
      nome +
        " está descredenciada. Use “Recredenciar” na lista de descredenciadas.",
    );
    return;
  }
  let nid = slug(nome);
  while (
    knownIds.has(nid) ||
    oficinas.concat(descreds).some((x) => x.id === nid)
  )
    nid += "-2";
  knownIds.add(nid);
  const o = {
    id: nid,
    nome,
    ativa: true,
    ordem: oficinas.length
      ? Math.max(...oficinas.map((o) => Number(o.ordem) || 0)) + 1
      : 1,
  };
  store
    .saveOf(o)
    .then(() => {
      oficinas.push(o);
      $("newName").value = "";
      renderAll();
      setStatus(nome + " adicionada.");
    })
    .catch((e) => setStatus("Não foi possível adicionar (" + e.message + ")."));
});
