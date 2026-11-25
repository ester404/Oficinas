/* Cadastro de oficinas: editar nome, excluir, descredenciar e recredenciar. */

let dcEdit = null;

function colErr(er) {
  return /column|coluna|schema/i.test(er.message)
    ? "Falta atualizar o Supabase: rode o SQL de descredenciamento (veja a mensagem da Claude / LEIA-ME)."
    : "Não foi possível salvar (" + er.message + ").";
}

function renderDc() {
  $("dcCount").textContent = descreds.length;
  const it = (o) =>
    dcEdit === o.id
      ? '<li class="editing"><div class="dcedit"><label>Nome<input type="text" id="dcEdN" maxlength="60" value="' +
        esc(o.nome) +
        '"></label><label>Motivo<textarea id="dcEdM">' +
        esc(o.motivo || "") +
        '</textarea></label><div class="dcacts"><button type="button" class="btn" data-dcsave="' +
        esc(o.id) +
        '">Salvar</button><button type="button" class="btn ghost2" data-dccancel="1">Cancelar</button></div></div></li>'
      : '<li><div class="dcl-name"><b>' +
        esc(o.nome) +
        "</b><small>Descredenciada em " +
        fdate(o.descredenciada_em) +
        '</small></div><p class="dcl-mot"><span>Motivo</span>' +
        esc(o.motivo || "Sem motivo registrado") +
        '</p><div class="dcl-acts"><button type="button" class="ico" data-dced="' +
        esc(o.id) +
        '" title="Editar nome e motivo" aria-label="Editar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg></button><button type="button" class="ico red" data-delof="' +
        esc(o.id) +
        '" title="Excluir oficina" aria-label="Excluir"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg></button><button type="button" class="btn ghost2" data-rec="' +
        esc(o.id) +
        '">Recredenciar</button></div></li>';
  $("dcPanel").innerHTML =
    '<div class="dclist-h"><h3>Oficinas descredenciadas</h3><span>' +
    descreds.length +
    " no total · aparecem no Financeiro</span></div>" +
    (descreds.length
      ? '<ul class="dclist">' + descreds.map(it).join("") + "</ul>"
      : '<p class="dcl-empty">Nenhuma oficina descredenciada até agora.</p>') +
    '<div class="dcadd"><b>Cadastrar oficina já descredenciada</b><small>Para oficinas que não são mais avaliadas, mas ainda têm valores no Financeiro.</small><input type="text" id="dcNewN" maxlength="60" placeholder="Nome da oficina"><textarea id="dcNewM" placeholder="Motivo do descredenciamento"></textarea><button type="button" class="btn red" id="dcNewBtn">+ Cadastrar descredenciada</button></div>';
}

function nomeExiste(n, exceto) {
  return oficinas.concat(descreds).some((o) => o.nome === n && o.id !== exceto);
}

function renameOf(id, nome) {
  nome = String(nome || "")
    .trim()
    .toUpperCase();
  if (!nome) {
    setStatus("Digite o nome da oficina.");
    return;
  }
  if (nomeExiste(nome, id)) {
    setStatus("Já existe uma oficina com o nome " + nome + ".");
    return;
  }
  const o = oficinas.find((x) => x.id === id) || descreds.find((x) => x.id === id);
  if (!o) return;
  const nv = Object.assign({}, o, { nome });
  store
    .saveOf(nv)
    .then(() => {
      oficinas = oficinas.map((x) => (x.id === id ? nv : x));
      descreds = descreds.map((x) => (x.id === id ? nv : x));
      renderAll();
      setStatus("Nome alterado para " + nome + ".");
    })
    .catch((er) => setStatus(colErr(er)));
}

function delOf(btn, id) {
  if (btn.dataset.armed !== "1") {
    btn.dataset.armed = "1";
    btn.classList.add("armed");
    const sp = btn.querySelector("span");
    if (sp) sp.textContent = "Clique de novo para excluir";
    btn.title = "Clique de novo para excluir";
    setTimeout(() => {
      if (btn.isConnected) {
        btn.dataset.armed = "";
        btn.classList.remove("armed");
        if (sp) sp.textContent = "Excluir oficina";
      }
    }, 4000);
    return;
  }
  const o = oficinas.find((x) => x.id === id) || descreds.find((x) => x.id === id);
  if (!o) return;
  store
    .saveOf(Object.assign({}, o, { ativa: false }))
    .then(() => {
      oficinas = oficinas.filter((x) => x.id !== id);
      descreds = descreds.filter((x) => x.id !== id);
      if (selEval === id) selEval = null;
      if (selOf === id) selOf = null;
      renderAll();
      setStatus(o.nome + " excluída.");
    })
    .catch((er) => setStatus(colErr(er)));
}

$("dcToggle").onclick = () => {
  const p = $("dcPanel");
  p.hidden = !p.hidden;
  $("dcToggle").setAttribute("aria-expanded", !p.hidden);
};

$("dcPanel").addEventListener("click", (e) => {
  const ed = e.target.closest("[data-dced]");
  if (ed) {
    dcEdit = ed.dataset.dced;
    renderDc();
    $("dcEdN").focus();
    return;
  }
  if (e.target.closest("[data-dccancel]")) {
    dcEdit = null;
    renderDc();
    return;
  }
  const sv = e.target.closest("[data-dcsave]");
  if (sv) {
    const id = sv.dataset.dcsave,
      o = descreds.find((x) => x.id === id);
    const nome = $("dcEdN").value.trim().toUpperCase(),
      motivo = $("dcEdM").value.trim();
    if (!nome) {
      setStatus("Digite o nome da oficina.");
      return;
    }
    if (nomeExiste(nome, id)) {
      setStatus("Já existe uma oficina com o nome " + nome + ".");
      return;
    }
    const nv = Object.assign({}, o, { nome, motivo });
    store
      .saveOf(nv)
      .then(() => {
        descreds = descreds.map((x) => (x.id === id ? nv : x));
        dcEdit = null;
        renderAll();
        setStatus("Oficina atualizada.");
      })
      .catch((er) => setStatus(colErr(er)));
    return;
  }
  const dl = e.target.closest("[data-delof]");
  if (dl) {
    delOf(dl, dl.dataset.delof);
    return;
  }
  if (e.target.closest("#dcNewBtn")) {
    const nome = $("dcNewN").value.trim().toUpperCase(),
      motivo = $("dcNewM").value.trim();
    if (!nome) {
      setStatus("Digite o nome da oficina.");
      $("dcNewN").focus();
      return;
    }
    if (nomeExiste(nome)) {
      setStatus(nome + " já está cadastrada.");
      return;
    }
    let id = slug(nome);
    while (knownIds.has(id) || oficinas.concat(descreds).some((x) => x.id === id)) id += "-2";
    knownIds.add(id);
    const ordem = Math.max(0, ...oficinas.concat(descreds).map((x) => Number(x.ordem) || 0)) + 1;
    const o = {
      id,
      nome,
      ativa: true,
      ordem,
      descredenciada: true,
      motivo: motivo || null,
      descredenciada_em: hojeISO(),
    };
    store
      .saveOf(o)
      .then(() => {
        descreds.push(o);
        renderAll();
        setStatus(nome + " cadastrada como descredenciada. Ela já aparece no Financeiro.");
      })
      .catch((er) => setStatus(colErr(er)));
    return;
  }
  const b = e.target.closest("[data-rec]");
  if (!b) return;
  if (b.dataset.armed !== "1") {
    b.dataset.armed = "1";
    b.textContent = "Clique de novo para confirmar";
    setTimeout(() => {
      if (b.isConnected) {
        b.dataset.armed = "";
        b.textContent = "Recredenciar";
      }
    }, 4000);
    return;
  }
  const o = descreds.find((x) => x.id === b.dataset.rec);
  if (!o) return;
  const nv = Object.assign({}, o, { descredenciada: false, motivo: null, descredenciada_em: null });
  store
    .saveOf(nv)
    .then(() => {
      descreds = descreds.filter((x) => x.id !== o.id);
      oficinas.push(nv);
      oficinas.sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
      renderAll();
      setStatus(o.nome + " voltou a ser credenciada.");
    })
    .catch((er) => setStatus(colErr(er)));
});
