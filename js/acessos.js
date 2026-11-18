/* Aba "Acessos" (só administradores): aprovar, recusar, editar e excluir contas. */

let accRows = [];
let accEdit = null; // user_id da conta sendo editada

async function loadAcc(silent) {
  if (!perfil || !perfil.admin) return;
  try {
    const r = await sbFetch(SB + "perfis?select=*&order=criado_em.desc", { cache: "no-store" });
    if (!r.ok) throw await sbErr(r);
    accRows = await r.json();
    try {
      await loadEquipes();
    } catch (e) {}
    renderAcc();
  } catch (e) {
    if (!silent)
      $("accList").innerHTML = '<p class="dcl-empty">Não foi possível carregar (' + esc(e.message) + ").</p>";
  }
}

// ---------- desenho da lista ----------

function accButtons(u) {
  const id = esc(u.user_id);
  const me = u.user_id === sess.uid;
  const status = me
    ? '<span class="acc-me">Você' + (u.admin ? " · administradora" : "") + "</span>"
    : u.status === "pendente"
      ? '<button class="btn" data-acc="aprovado" data-u="' +
        id +
        '">Aprovar</button><button class="btn ghost2 redt" data-acc="recusado" data-u="' +
        id +
        '">Recusar</button>'
      : u.status === "aprovado"
        ? '<button class="btn ghost2 redt" data-acc="recusado" data-u="' + id + '">Tirar acesso</button>'
        : '<button class="btn ghost2" data-acc="aprovado" data-u="' + id + '">Aprovar</button>';
  const editar =
    '<button class="ico" data-accedit="' +
    id +
    '" title="Editar" aria-label="Editar">' +
    ICO_ED +
    "</button>";
  const excluir = me
    ? ""
    : '<button class="ico red" data-accdel="' +
      id +
      '" title="Excluir conta" aria-label="Excluir conta">' +
      ICO_TR +
      "</button>";
  return status + editar + excluir;
}

function accEditForm(u) {
  const me = u.user_id === sess.uid;
  return (
    '<div class="acc-edit"><label>Nome<input type="text" id="accNome" maxlength="60" value="' +
    esc(u.nome || "") +
    '"></label>' +
    '<label class="acc-chk"><input type="checkbox" id="accAdmin"' +
    (u.admin ? " checked" : "") +
    (me ? " disabled" : "") +
    "> Administrador(a) — pode aprovar, editar e excluir acessos</label>" +
    '<div class="dcacts"><button type="button" class="btn" data-accsave="' +
    esc(u.user_id) +
    '">Salvar</button><button type="button" class="btn ghost2" data-acccancel="1">Cancelar</button></div></div>'
  );
}

// Equipes de cada pessoa (pode marcar mais de uma; as abas somam).
function accEquipe(u) {
  if (u.admin) return '<span class="acc-eq-adm">Vê tudo (administradora)</span>';
  if (!equipes.length) return "";
  const minhas = u.equipes || [];
  return (
    '<div class="acc-eq"><small>Equipes</small><div class="acc-chips">' +
    equipes
      .map(
        (e) =>
          '<label class="acc-chip' +
          (minhas.includes(e.id) ? " on" : "") +
          '"><input type="checkbox" data-acceq="' +
          esc(u.user_id) +
          '" value="' +
          esc(e.id) +
          '"' +
          (minhas.includes(e.id) ? " checked" : "") +
          ">" +
          esc(e.nome) +
          "</label>",
      )
      .join("") +
    "</div></div>"
  );
}

// ---------- equipes e abas ----------

function renderEq() {
  if (!$("eqList")) return;
  if (!equipes.length) {
    $("eqList").innerHTML =
      '<p class="dcl-empty">As equipes ainda não existem no Supabase. Rode o SQL 5 e clique em “Atualizar lista”.</p>';
    return;
  }
  $("eqList").innerHTML =
    '<div class="scroll"><table class="eqt"><thead><tr><th>Equipe</th>' +
    ABAS.map((a) => "<th>" + ABA_NOME[a] + "</th>").join("") +
    "<th>Pessoas</th><th></th></tr></thead><tbody>" +
    equipes
      .map((e) => {
        const n = accRows.filter((u) => (u.equipes || []).includes(e.id) && !u.admin).length;
        return (
          "<tr><td><b>" +
          esc(e.nome) +
          "</b></td>" +
          ABAS.map(
            (a) =>
              '<td class="c"><input type="checkbox" aria-label="' +
              esc(e.nome) +
              ": " +
              ABA_NOME[a] +
              '" data-eqaba="' +
              a +
              '" data-eq="' +
              esc(e.id) +
              '"' +
              ((e.abas || []).includes(a) ? " checked" : "") +
              "></td>",
          ).join("") +
          '<td class="c">' +
          n +
          '</td><td class="c">' +
          (n
            ? ""
            : '<button type="button" class="ico red" data-eqdel="' +
              esc(e.id) +
              '" title="Excluir equipe" aria-label="Excluir equipe">' +
              ICO_TR +
              "</button>") +
          "</td></tr>"
        );
      })
      .join("") +
    "</tbody></table></div>";
}

async function salvarEquipe(e) {
  const r = await sbFetch(SB + "equipes", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: e.id, nome: e.nome, abas: e.abas || [], ordem: e.ordem || null }),
  });
  if (!r.ok) throw await sbErr(r);
}

$("eqList").addEventListener("change", async (ev) => {
  const c = ev.target.closest("[data-eqaba]");
  if (!c) return;
  const e = equipes.find((x) => x.id === c.dataset.eq);
  const antes = (e.abas || []).slice();
  e.abas = ABAS.filter((a) => (a === c.dataset.eqaba ? c.checked : antes.includes(a)));
  c.disabled = true;
  try {
    await salvarEquipe(e);
    setStatus("Equipe " + e.nome + ": " + (e.abas.map((a) => ABA_NOME[a]).join(", ") || "nenhuma aba") + ".");
  } catch (er) {
    e.abas = antes;
    renderEq();
    setStatus("Não foi possível salvar (" + er.message + ").");
  }
  c.disabled = false;
});

$("eqList").addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-eqdel]");
  if (!b) return;
  if (!confirmar(b)) return setStatus("Clique de novo na lixeira para excluir a equipe.");
  const id = b.dataset.eqdel;
  try {
    const r = await sbFetch(SB + "equipes?id=eq." + encodeURIComponent(id), { method: "DELETE" });
    if (!r.ok) throw await sbErr(r);
    equipes = equipes.filter((x) => x.id !== id);
    renderAcc();
    setStatus("Equipe excluída.");
  } catch (er) {
    setStatus("Não foi possível excluir (" + er.message + ").");
  }
});

$("eqForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const nome = $("eqNome").value.trim();
  if (!nome) return;
  const id = slug(nome);
  if (equipes.some((x) => x.id === id)) return setStatus("Essa equipe já existe.");
  const e = { id, nome, abas: [], ordem: equipes.length + 1 };
  try {
    await salvarEquipe(e);
    equipes.push(e);
    $("eqNome").value = "";
    renderAcc();
    setStatus("Equipe " + nome + " criada. Marque as abas dela.");
  } catch (er) {
    setStatus("Não foi possível criar (" + er.message + ").");
  }
});

function accItem(u, cls) {
  const editing = accEdit === u.user_id;
  return (
    '<li class="' +
    cls +
    (editing ? " editing" : "") +
    '"><span class="av">' +
    esc(inis(u.nome || u.email || "?").toUpperCase() || "?") +
    '</span><div class="acc-t"><b>' +
    esc(u.nome || "Sem nome") +
    (u.admin ? ' <span class="acc-adm">admin</span>' : "") +
    "</b><small>" +
    esc(u.email || "") +
    " · desde " +
    fdate(u.criado_em) +
    "</small></div>" +
    accEquipe(u) +
    '<div class="acc-a">' +
    accButtons(u) +
    "</div>" +
    (editing ? accEditForm(u) : "") +
    "</li>"
  );
}

function renderAcc() {
  const pend = accRows.filter((x) => x.status === "pendente");
  $("accBadge").textContent = pend.length;
  $("accBadge").hidden = !pend.length;
  const grupo = (titulo, lista, cls) =>
    lista.length
      ? '<h3 class="acc-g">' +
        titulo +
        " <span>" +
        lista.length +
        '</span></h3><ul class="acc-l">' +
        lista.map((u) => accItem(u, cls)).join("") +
        "</ul>"
      : "";
  const h =
    grupo("Aguardando aprovação", pend, "p") +
    grupo(
      "Com acesso",
      accRows.filter((x) => x.status === "aprovado"),
      "a",
    ) +
    grupo(
      "Recusados",
      accRows.filter((x) => x.status === "recusado"),
      "r",
    );
  $("accList").innerHTML = h || '<p class="dcl-empty">Ninguém pediu acesso ainda.</p>';
  renderEq();
}

$("accList").addEventListener("change", async (ev) => {
  const s = ev.target.closest("[data-acceq]");
  if (!s) return;
  s.disabled = true;
  const u0 = accRows.find((x) => x.user_id === s.dataset.acceq) || {};
  const lista = equipes
    .map((e) => e.id)
    .filter((id) => (id === s.value ? s.checked : (u0.equipes || []).includes(id)));
  try {
    const u = await patchPerfil(s.dataset.acceq, { equipes: lista });
    renderAcc();
    const nomes = equipes.filter((e) => lista.includes(e.id)).map((e) => e.nome);
    setStatus((u && (u.nome || u.email)) + (nomes.length ? ": " + nomes.join(", ") + "." : " sem equipe."));
  } catch (er) {
    s.disabled = false;
    setStatus("Não foi possível alterar (" + er.message + ").");
  }
});

// ---------- ações ----------

async function patchPerfil(uid, campos) {
  const r = await sbFetch(SB + "perfis?user_id=eq." + encodeURIComponent(uid), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(campos),
  });
  if (!r.ok) throw await sbErr(r);
  const u = accRows.find((x) => x.user_id === uid);
  if (u) Object.assign(u, campos);
  if (uid === sess.uid && perfil) Object.assign(perfil, campos);
  return u;
}

// Exclui a conta de vez (precisa da função excluir_usuario no Supabase).
async function excluirConta(uid) {
  const r = await sbFetch(SB + "rpc/excluir_usuario", { method: "POST", body: JSON.stringify({ uid }) });
  if (r.status === 404)
    throw new Error("falta rodar o SQL de exclusão no Supabase (veja a mensagem da Claude / LEIA-ME)");
  if (!r.ok) throw await sbErr(r);
  accRows = accRows.filter((x) => x.user_id !== uid);
}

// Botões que pedem um segundo clique para confirmar.
function confirmar(b, texto) {
  if (b.dataset.armed === "1") return true;
  b.dataset.armed = "1";
  const antes = b.innerHTML;
  b.classList.add("armed");
  if (texto) b.textContent = texto;
  b.title = "Clique de novo para confirmar";
  setTimeout(() => {
    if (b.isConnected) {
      b.dataset.armed = "";
      b.classList.remove("armed");
      b.innerHTML = antes;
    }
  }, 4000);
  return false;
}

$("accList").addEventListener("click", async (e) => {
  const ed = e.target.closest("[data-accedit]");
  if (ed) {
    accEdit = accEdit === ed.dataset.accedit ? null : ed.dataset.accedit;
    renderAcc();
    if (accEdit) $("accNome").focus();
    return;
  }
  if (e.target.closest("[data-acccancel]")) {
    accEdit = null;
    renderAcc();
    return;
  }

  const sv = e.target.closest("[data-accsave]");
  if (sv) {
    const nome = $("accNome").value.trim(),
      admin = $("accAdmin").checked;
    sv.disabled = true;
    try {
      const u = await patchPerfil(sv.dataset.accsave, { nome, admin });
      accEdit = null;
      renderAcc();
      if (sv.dataset.accsave === sess.uid) $("whoMail").textContent = nome || sess.email;
      setStatus((u && (u.nome || u.email)) + " atualizado(a).");
    } catch (er) {
      sv.disabled = false;
      setStatus("Não foi possível salvar (" + er.message + ").");
    }
    return;
  }

  const del = e.target.closest("[data-accdel]");
  if (del) {
    if (!confirmar(del)) return setStatus("Clique de novo na lixeira para excluir a conta.");
    const u = accRows.find((x) => x.user_id === del.dataset.accdel);
    try {
      await excluirConta(del.dataset.accdel);
      renderAcc();
      setStatus("Conta de " + (u && (u.nome || u.email)) + " excluída.");
    } catch (er) {
      setStatus("Não foi possível excluir (" + er.message + ").");
    }
    return;
  }

  const b = e.target.closest("[data-acc]");
  if (!b) return;
  const st = b.dataset.acc;
  if (st === "recusado" && !confirmar(b, "Clique de novo para confirmar")) return;
  b.disabled = true;
  try {
    const u = await patchPerfil(b.dataset.u, { status: st });
    renderAcc();
    setStatus((u && (u.nome || u.email)) + (st === "aprovado" ? " aprovado(a)." : " sem acesso."));
  } catch (er) {
    b.disabled = false;
    setStatus("Não foi possível alterar (" + er.message + ").");
  }
});

$("accList").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "accNome") {
    e.preventDefault();
    document.querySelector("[data-accsave]").click();
  }
  if (e.key === "Escape") {
    accEdit = null;
    renderAcc();
  }
});

$("accReload").onclick = () => loadAcc();
