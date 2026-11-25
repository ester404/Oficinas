/* Tema "Painel Mega": coloca um ícone verde-menta em cada cartão de número (.fstats),
   escolhido pelo texto do rótulo. Roda sozinho sempre que as telas são redesenhadas. */
(function () {
  const P = {
    carteira: '<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4"/><circle cx="16.5" cy="14" r="1.2"/>',
    recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    chave: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5z"/>',
    caixa: '<path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
    mais: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    carro: '<path d="M3 13l2-5h14l2 5v5H3z"/><path d="M3 13h18"/><circle cx="7.5" cy="16" r="1.2"/><circle cx="16.5" cy="16" r="1.2"/>',
    grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
  };
  const REGRAS = [
    [/quitad|pago|aprovad/i, "check"],
    [/saldo|devedor|a pagar|gasto/i, "carteira"],
    [/desconta/i, "check"],
    [/franquia|dívida|divida|total/i, "recibo"],
    [/peça|peca/i, "caixa"],
    [/complement/i, "mais"],
    [/líquido|liquido|reparo/i, "chave"],
    [/veículo|veiculo/i, "carro"],
    [/mês|mes|ano|período/i, "calendario"],
    [/atras|pendent/i, "alerta"],
  ];
  function decorar() {
    document.querySelectorAll(".fstats > div:not(.tm-ok)").forEach((d) => {
      const rot = (d.querySelector("small") || d).textContent || "";
      const r = REGRAS.find((x) => x[0].test(rot));
      const nome = r ? r[1] : "grafico";
      d.classList.add("tm-ok");
      d.insertAdjacentHTML(
        "afterbegin",
        '<span class="tm-ic" aria-hidden="true"><svg viewBox="0 0 24 24">' + P[nome] + "</svg></span>",
      );
    });
  }
  let agendado = false;
  new MutationObserver(() => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      decorar();
    });
  }).observe(document.body, { childList: true, subtree: true });
  decorar();
})();
