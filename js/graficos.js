/* Peças visuais reaproveitadas pelas abas: cartões de indicador, gráfico de linha e rosca. */

const GIC = {
  pessoas: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.8 14.2A5.5 5.5 0 0 1 22 20"/>',
  saco: '<path d="M9 3h6l-1.5 3h-3z"/><path d="M10.5 6C6 8 4 12 4 15a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6c0-3-2-7-6.5-9"/><path d="M12 10v7M14 11.5h-3a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3h-3"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  carteira: '<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4"/><circle cx="16.5" cy="14" r="1.2"/>',
  grafico: '<path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/>',
  trofeu: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  carro: '<path d="M3 13l2-5h14l2 5v5H3z"/><path d="M3 13h18"/><circle cx="7.5" cy="16" r="1.2"/><circle cx="16.5" cy="16" r="1.2"/>',
  chave: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5z"/>',
  estrela: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const gSvg = (k) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (GIC[k] || GIC.grafico) + "</svg>";

// Seta de variação (para baixo é bom quando "menorBom").
function gVar(atual, antes, rotulo, menorBom) {
  if (!antes) return '<em class="kc-var">' + (atual ? "sem lançamentos " + rotulo.replace(/^vs\. (\d{4})/, "em $1").replace(/^vs\. /, "no ") : "—") + "</em>";
  const p = Math.round(((atual - antes) / antes) * 1000) / 10;
  if (!p) return '<em class="kc-var">— sem variação</em>';
  const bom = menorBom ? p < 0 : p > 0;
  return (
    '<em class="kc-var ' + (bom ? "bom" : "ruim") + '"><b>' + (p > 0 ? "↑ " : "↓ ") + String(Math.abs(p)).replace(".", ",") +
    "%</b> " + rotulo + "</em>"
  );
}

// Cartão de indicador: { ic, rotulo, valor, sub, tom: "" | "red" | "amber" | "dark" }
function gKpi(o) {
  return (
    '<div class="kc ' + (o.tom || "") + '"><span class="kc-ic">' + gSvg(o.ic) + '</span><div><small>' + o.rotulo +
    "</small><b>" + o.valor + "</b>" + (o.sub || "") + "</div></div>"
  );
}

// Gráfico de linha com área: vals[], rotulos[], sel = índice destacado.
function gLinha(vals, rotulos, sel, fmt) {
  fmt = fmt || ((v) => money(v).replace(",00", ""));
  const n = vals.length,
    W = 660,
    H = 240,
    L = 66,
    R = 16,
    T = 48,
    B = 28;
  const max = Math.max(...vals, 0);
  const passo = max <= 0 ? 1000 : Math.pow(10, Math.floor(Math.log10(max))) / 2;
  const topo = max <= 0 ? 1000 : Math.ceil(max / passo) * passo;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1)),
    y = (v) => T + (1 - v / topo) * (H - T - B);
  let g = "";
  for (let k = 0; k <= 4; k++) {
    const v = (topo * k) / 4,
      yy = y(v);
    g +=
      '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" class="pl-grid"/>' +
      '<text x="' + (L - 8) + '" y="' + (yy + 4) + '" class="pl-y">' + fmt(v) + "</text>";
  }
  const pts = vals.map((v, i) => x(i) + "," + y(v));
  g +=
    '<path class="gl-area" d="M' + x(0) + "," + y(0) + " L" + pts.join(" L") + " L" + x(n - 1) + "," + y(0) + ' Z"/>' +
    '<polyline class="gl-line" points="' + pts.join(" ") + '"/>';
  vals.forEach((v, i) => {
    g +=
      '<g class="gl-pt' + (i === sel ? " on" : "") + '" data-gli="' + i + '"><title>' + rotulos[i] + ": " + money(v) +
      '</title><rect x="' + (x(i) - 18) + '" y="' + T + '" width="36" height="' + (H - T) + '" fill="transparent"/>' +
      '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="' + (i === sel ? 6 : 4.5) + '"/>' +
      '<text x="' + x(i) + '" y="' + (H - 7) + '" class="pl-x">' + rotulos[i] + "</text></g>";
  });
  if (sel != null && sel >= 0) {
    const tx = Math.min(Math.max(x(sel), L + 62), W - R - 62),
      ty = Math.max(y(vals[sel]) - 54, 2);
    g +=
      '<line x1="' + x(sel) + '" x2="' + x(sel) + '" y1="' + y(vals[sel]) + '" y2="' + y(0) + '" class="pl-sel"/>' +
      '<g class="pl-tip"><rect x="' + (tx - 62) + '" y="' + ty + '" width="124" height="40" rx="8"/>' +
      '<text x="' + tx + '" y="' + (ty + 16) + '" class="a">' + rotulos[sel] + "</text>" +
      '<text x="' + tx + '" y="' + (ty + 32) + '" class="b">' + money(vals[sel]) + "</text></g>";
  }
  return '<svg viewBox="0 0 ' + W + " " + H + '" class="pv-line" role="img">' + g + "</svg>";
}

const G_CORES = ["#0b6b55", "#5cc9a7", "#f2b33d", "#e7774f", "#8f84e0", "#5b8bd9", "#b9c4c1"];
// Rosca com legenda: L = [[rótulo, valor]], centro = texto do meio.
function gRosca(L, centro, sub, fmt) {
  fmt = fmt || money;
  const tot = L.reduce((s, x) => s + x[1], 0);
  if (!tot) return '<p class="pv-vazio">Sem valores no período.<br><b>R$ 0,00</b></p>';
  const C = 2 * Math.PI * 52;
  let off = 0,
    arcs = "";
  L.forEach(([, v], i) => {
    const len = (v / tot) * C;
    arcs +=
      '<circle r="52" cx="70" cy="70" fill="none" stroke="' + G_CORES[i % G_CORES.length] + '" stroke-width="20" stroke-dasharray="' +
      len + " " + (C - len) + '" stroke-dashoffset="' + -off + '"/>';
    off += len;
  });
  return (
    '<div class="pv-dn"><div class="pv-rosca"><svg viewBox="0 0 140 140" aria-hidden="true"><g transform="rotate(-90 70 70)">' + arcs +
    "</g></svg><div><b>" + centro + "</b><small>" + sub + '</small></div></div><ul class="pv-leg">' +
    L.map(
      ([k, v], i) =>
        '<li><i style="background:' + G_CORES[i % G_CORES.length] + '"></i><span>' + esc(k) + "</span><b>" + fmt(v) + "</b><em>" +
        String(Math.round((v / tot) * 1000) / 10).replace(".", ",") + "%</em></li>",
    ).join("") +
    "</ul></div>"
  );
}

// Iniciais para o avatar redondo.
function gIniciais(t) {
  const p = (t || "?").replace(/[^A-Za-zÀ-ú ]/g, " ").trim().split(/\s+/);
  return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : (p[0] || "")[1] || "")).toUpperCase();
}
