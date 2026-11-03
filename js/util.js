/* Constantes, utilidades e formatação usadas em todo o site. */

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const ABR = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const PTS = [
  ["q", 30],
  ["p", 20],
  ["s", 20],
  ["o", 15],
  ["d", 10],
  ["e", 5],
];

const IND = [
  ["carros", "Carros atendidos"],
  ["refeitos", "Carros refeitos"],
  ["atrasos", "Entregas atrasadas"],
  ["notaCliente", "Nota média clientes (0–10)"],
  ["extras", "Orçamentos com extra"],
];

const FIELDS = [...PTS.map((p) => p[0]), ...IND.map((i) => i[0])];

const $ = (id) => document.getElementById(id);

const now = new Date();

const CUR = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

function slug(n) {
  return (
    n
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "of-" + Date.now()
  );
}

function addMonth(k, n) {
  let [y, m] = k.split("-").map(Number);
  m += n;
  while (m > 12) {
    m -= 12;
    y++;
  }
  while (m < 1) {
    m += 12;
    y--;
  }
  return y + "-" + String(m).padStart(2, "0");
}

function label(k) {
  const [y, m] = k.split("-");
  return MESES[+m - 1] + " " + y;
}

function nivel(t) {
  return t == null ? null : t >= 90 ? "Diamante" : t >= 80 ? "Ouro" : t >= 65 ? "Prata" : "Bronze";
}

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// Soma dos 6 critérios de uma avaliação (de um veículo). null se nada foi preenchido.
function somaCriterios(x) {
  if (!x) return null;
  let any = false,
    s = 0;
  for (const [k] of PTS) {
    const v = num(x[k]);
    if (v != null) {
      any = true;
      s += v;
    }
  }
  return any ? Math.round(s * 10) / 10 : null;
}

// Lista de veículos enviados guardada na avaliação do mês.
function parseEnviados(e) {
  if (typeof e === "string") {
    try {
      e = JSON.parse(e);
    } catch (_) {
      e = [];
    }
  }
  return Array.isArray(e) ? e : [];
}

// Nota da oficina no mês = média das notas dos veículos avaliados.
// Meses antigos, avaliados no geral (sem veículos), continuam usando a nota geral.
function total(a) {
  if (!a) return null;
  const notas = parseEnviados(a.enviados)
    .map(somaCriterios)
    .filter((v) => v != null);
  if (notas.length) return Math.round((notas.reduce((s, v) => s + v, 0) / notas.length) * 10) / 10;
  return somaCriterios(a);
}

function key(m, id) {
  return m + "__" + id;
}

function rec(m, id) {
  return pending[key(m, id)] || aval[key(m, id)];
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function hora() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Mensagem de status (aparece embaixo da aba aberta).
function setStatus(t) {
  for (const id of ["status", "fstatus", "accStatus"]) {
    const el = $(id);
    if (el) el.textContent = t;
  }
}

function fdate(d) {
  if (!d) return "";
  const [y, m, dd] = String(d).slice(0, 10).split("-");
  return dd + "/" + m + "/" + y;
}

function hojeISO() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function inis(n) {
  return n
    .replace(/[^A-Z0-9 ]/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function money(v) {
  return BRL.format(v || 0);
}

function parseBRL(t) {
  if (t == null) return null;
  t = String(t).replace(/R\$|\s/g, "");
  if (t === "") return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

function fmtIn(v) {
  v = num(v);
  return v == null
    ? ""
    : v.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

const ICO_ED =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>';

const ICO_TR =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>';

const COR = {
  Diamante: "#2A9DB0",
  Ouro: "#D4A21C",
  Prata: "#9AA3A6",
  Bronze: "#B8642E",
  "Sem nota": "#B9B2AB",
};

function medal(c, n) {
  return n === "Diamante"
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="' +
        c +
        '" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h12l3 6-9 12L3 9z" fill="' +
        c +
        '22"/><path d="M3 9h18M9 3l3 18 3-18"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="' +
        c +
        '" stroke-width="1.8" stroke-linejoin="round"><path d="M8 2l4 6 4-6"/><circle cx="12" cy="15" r="6" fill="' +
        c +
        '22"/><path d="M12 12.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 14.3l2-.3z" fill="' +
        c +
        '" stroke="none"/></svg>';
}
