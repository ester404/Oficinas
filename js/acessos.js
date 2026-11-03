/* Aba "Acessos" (só administradora): aprovar ou recusar contas. */

let accRows = [];

async function loadAcc(silent) {
  if (!perfil || !perfil.admin) return;
  try {
    const r = await sbFetch(SB + "perfis?select=*&order=criado_em.desc", { cache: "no-store" });
    if (!r.ok) throw await sbErr(r);
    accRows = await r.json();
    renderAcc();
  } catch (e) {
    if (!silent)
      $("accList").innerHTML =
        '<p class="dcl-empty">Não foi possível carregar (' + esc(e.message) + ").</p>";
  }
}

function renderAcc() {
  const pend = accRows.filter((x) => x.status === "pendente");
  $("accBadge").textContent = pend.length;
  $("accBadge").hidden = !pend.length;
  const grp = (t, list, cls) =>
    list.length
      ? '<h3 class="acc-g">' +
        t +
        " <span>" +
        list.length +
        '</span></h3><ul class="acc-l">' +
        list
          .map((u) => {
            const me = u.user_id === sess.uid;
            const acts = me
              ? '<span class="acc-me">Você · administradora</span>'
              : u.status === "pendente"
                ? '<button class="btn" data-acc="aprovar" data-u="' +
                  esc(u.user_id) +
                  '">Aprovar</button><button class="btn ghost2 redt" data-acc="recusar" data-u="' +
                  esc(u.user_id) +
                  '">Recusar</button>'
                : u.status === "aprovado"
                  ? '<button class="btn ghost2 redt" data-acc="recusar" data-u="' +
                    esc(u.user_id) +
                    '">Tirar acesso</button>'
                  : '<button class="btn ghost2" data-acc="aprovar" data-u="' +
                    esc(u.user_id) +
                    '">Aprovar</button>';
            return (
              '<li class="' +
              cls +
              '"><span class="av">' +
              esc(inis(u.nome || u.email || "?").toUpperCase() || "?") +
              '</span><div class="acc-t"><b>' +
              esc(u.nome || "Sem nome") +
              "</b><small>" +
              esc(u.email || "") +
              " · desde " +
              fdate(u.criado_em) +
              '</small></div><div class="acc-a">' +
              acts +
              "</div></li>"
            );
          })
          .join("") +
        "</ul>"
      : "";
  const h =
    grp("Aguardando aprovação", pend, "p") +
    grp(
      "Com acesso",
      accRows.filter((x) => x.status === "aprovado"),
      "a",
    ) +
    grp(
      "Recusados",
      accRows.filter((x) => x.status === "recusado"),
      "r",
    );
  $("accList").innerHTML = h || '<p class="dcl-empty">Ninguém pediu acesso ainda.</p>';
}

$("accList").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-acc]");
  if (!b) return;
  const st = b.dataset.acc === "aprovar" ? "aprovado" : "recusado";
  if (st === "recusado" && b.dataset.armed !== "1") {
    b.dataset.armed = "1";
    const t = b.textContent;
    b.textContent = "Clique de novo para confirmar";
    setTimeout(() => {
      if (b.isConnected) {
        b.dataset.armed = "";
        b.textContent = t;
      }
    }, 4000);
    return;
  }
  b.disabled = true;
  try {
    const r = await sbFetch(SB + "perfis?user_id=eq." + encodeURIComponent(b.dataset.u), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: st }),
    });
    if (!r.ok) throw await sbErr(r);
    const u = accRows.find((x) => x.user_id === b.dataset.u);
    if (u) u.status = st;
    renderAcc();
    setStatus((u && (u.nome || u.email)) + (st === "aprovado" ? " aprovado(a)." : " sem acesso."));
  } catch (er) {
    b.disabled = false;
    setStatus("Não foi possível alterar (" + er.message + ").");
  }
});

$("accReload").onclick = () => loadAcc();
