/* Aba "Histórico": ranking do mês e evolução dos últimos 12 meses. */

function renderHist() {
  const ms = [];
  for (let i = 11; i >= 0; i--) ms.push(addMonth(mes, -i));
  const prev = addMonth(mes, -1);
  $("rkTitle").textContent = "Ranking de " + label(mes);
  if (!oficinas.length) {
    $("rank").innerHTML =
      '<li class="empty">' + (ready ? "Nenhuma oficina cadastrada ainda." : "Carregando…") + "</li>";
    $("hbody").innerHTML = "";
    return;
  }
  const rows = oficinas.map((o) => ({ o, t: total(rec(mes, o.id)), p: total(rec(prev, o.id)) }));
  const sc = rows.filter((r) => r.t != null).sort((a, b) => b.t - a.t),
    ns = rows.filter((r) => r.t == null);
  let html = sc
    .map((r) => {
      const n = nivel(r.t);
      const pos = sc.findIndex((x) => x.t === r.t) + 1;
      let d = '<span class="dl">—</span>';
      if (r.p != null) {
        const v = Math.round((r.t - r.p) * 10) / 10;
        d =
          v > 0
            ? '<span class="dl up">▲ ' + v + "</span>"
            : v < 0
              ? '<span class="dl down">▼ ' + Math.abs(v) + "</span>"
              : '<span class="dl">= 0</span>';
      }
      return (
        '<li><span class="rpos' +
        (pos <= 3 ? " top" : "") +
        '">' +
        pos +
        'º</span><span class="rname">' +
        esc(r.o.nome) +
        '</span><span class="rbar"><i class="' +
        n +
        '" style="width:' +
        Math.max(2, Math.min(100, r.t)) +
        '%"></i></span><span class="rval">' +
        fmtNota(r.t) +
        '</span><span class="badge ' +
        n +
        '">' +
        n +
        "</span>" +
        d +
        "</li>"
      );
    })
    .join("");
  if (ns.length)
    html +=
      '<li class="rnone"><span>Sem nota neste mês:</span> ' +
      ns.map((r) => esc(r.o.nome)).join(" · ") +
      "</li>";
  if (!sc.length && !ns.length) html = '<li class="empty">Nenhuma nota lançada.</li>';
  $("rank").innerHTML = html;
  $("hbody").innerHTML = oficinas
    .map((o) => {
      const vals = ms.map((m) => total(rec(m, o.id)));
      const f = vals.filter((v) => v != null);
      const last = [...vals].reverse().find((v) => v != null);
      const n = nivel(last ?? null);
      const avg = f.length ? Math.round((f.reduce((a, b) => a + b, 0) / f.length) * 10) / 10 : null;
      const best = f.length ? Math.max(...f) : null;
      const bars = ms
        .map((m, i) => {
          const t = vals[i];
          const mm = +m.split("-")[1];
          return (
            '<button class="col" data-go="' +
            m +
            '" title="' +
            label(m) +
            (t == null ? ": sem nota" : ": " + t + " (" + nivel(t) + ")") +
            '"><span class="bw"><i class="' +
            (t == null ? "nil" : nivel(t)) +
            '" style="height:' +
            (t == null ? 4 : Math.max(6, t)) +
            '%"></i></span><em>' +
            ABR[mm - 1][0] +
            "</em></button>"
          );
        })
        .join("");
      return (
        '<article class="ocard"><header><h3>' +
        esc(o.nome) +
        "</h3>" +
        (n
          ? '<span class="badge ' + n + '">' + n + "</span>"
          : '<span class="badge none">Sem nota</span>') +
        "</header>" +
        '<div class="ostats"><div><b>' +
        fmtNota(last) +
        "</b><small>Última nota</small></div><div><b>" +
        fmtNota(avg) +
        "</b><small>Média 12 meses</small></div><div><b>" +
        fmtNota(best) +
        "</b><small>Melhor nota</small></div></div>" +
        '<div class="chart">' +
        bars +
        "</div></article>"
      );
    })
    .join("");
}

$("v-hist").addEventListener("click", (e) => {
  const b = e.target.closest("[data-go]");
  if (b) {
    mes = b.dataset.go;
    renderAll();
    tab("mes");
  }
});
