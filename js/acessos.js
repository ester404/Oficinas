/* Aba "Acessos" (só administradores): aprovar, recusar, editar e excluir contas. */

let accRows = [];
let accEdit = null; // user_id da conta sendo editada

async function loadAcc(silent) {
  if (!perfil || !perfil.admin) return;
  try {
    const r = await sbFetch(SB + "perfis?select=*&order=criado_em.desc", { cache: "no-store" });
    if (!r.ok) throw await sbErr(r);
    accRows = await r.json();
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
    '</small></div><div class="acc-a">' +
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
}

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
