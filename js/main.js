/* Inicialização: seletor de mês, abas e arranque do site. */

let started = false;

function renderAll() {
  renderMonth();
  renderHist();
  renderFin();
  renderDc();
}

(function () {
  const y = +CUR.slice(0, 4);
  $("selMes").innerHTML = MESES.map(
    (n, i) => '<option value="' + String(i + 1).padStart(2, "0") + '">' + n + "</option>",
  ).join("");
  let o = "";
  for (let a = 2025; a <= y + 2; a++) o += '<option value="' + a + '">' + a + "</option>";
  $("selAno").innerHTML = o;
})();

function syncPicker() {
  const [y, m] = mes.split("-");
  if (!$("selAno").querySelector('option[value="' + y + '"]'))
    $("selAno").insertAdjacentHTML("beforeend", '<option value="' + y + '">' + y + "</option>");
  $("selMes").value = m;
  $("selAno").value = y;
}

$("selMes").onchange = $("selAno").onchange = () => {
  mes = $("selAno").value + "-" + $("selMes").value;
  renderAll();
};

function tab(n) {
  if (n === "acc") loadAcc();
  for (const t of ["mes", "hist", "fin", "acc", "crit"]) {
    $("t-" + t).setAttribute("aria-selected", t === n);
    $("v-" + t).hidden = t !== n;
  }
  $("pageTitle").textContent = {
    mes: "Avaliação do mês",
    hist: "Histórico",
    fin: "Financeiro",
    acc: "Acessos",
    crit: "Critérios",
  }[n];
}

["mes", "hist", "fin", "acc", "crit"].forEach((t) => ($("t-" + t).onclick = () => tab(t)));

function startApp() {
  if (started) {
    refresh(true);
    return;
  }
  started = true;
  refresh(true);
  if (store.modo === "online") {
    setInterval(() => {
      if (!document.hidden && sess) refresh(false);
    }, 60000);
    window.addEventListener("focus", () => {
      if (sess) refresh(false);
    });
  }
}

if (store.modo === "local") {
  $("banner").hidden = false;
  $("banner").textContent =
    "Modo local: as notas ficam salvas só neste computador e neste navegador. Para usar em vários computadores com os mesmos dados, configure o Supabase (passo 1 do LEIA-ME).";
}

document
  .querySelectorAll("[data-medal]")
  .forEach((e) => (e.innerHTML = medal(COR[e.dataset.medal], e.dataset.medal)));

renderAll();

if (store.modo === "online") {
  loadSess();
  const link = lerLinkRecuperacao();
  if (link && link.recuperar) mostrarNovaSenha();
  else if (link && link.erro) showLogin(link.erro);
  else if (sess) {
    SB_H.Authorization = "Bearer " + sess.access_token;
    afterAuth();
  } else showLogin();
} else {
  hideLogin();
  $("whoBox").hidden = true;
  startApp();
}
