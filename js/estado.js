/* Estado compartilhado do site (dados carregados e mês selecionado). */

let mes = CUR; // mês da aba aberta, no formato "AAAA-MM"
let abaAtual = "mes"; // aba aberta
const mesPorAba = { mes: CUR, hist: CUR, fin: CUR }; // cada aba guarda o seu próprio mês
try {
  Object.assign(mesPorAba, JSON.parse(localStorage.getItem("ranking-oficinas-meses")) || {});
} catch (e) {}
mes = mesPorAba.mes;
let ready = false; // true depois que os dados foram carregados

let oficinas = []; // oficinas credenciadas (aparecem na avaliação)
let descreds = []; // oficinas descredenciadas (só aparecem no financeiro)
let knownIds = new Set(); // todos os ids já usados, inclusive de oficinas excluídas

let aval = {}; // avaliações salvas, por chave "AAAA-MM__oficina"
const pending = {}; // avaliações alteradas que ainda estão sendo salvas
const chain = {}; // fila de gravação por avaliação (uma de cada vez)
const timers = {}; // atraso antes de gravar (evita salvar a cada tecla)

let veic = {}; // veículos do financeiro, por id
let veicOk = true; // false se a tabela de veículos não existir no Supabase
let selOf = null; // oficina aberta no financeiro
const vPending = {}; // veículos alterados que ainda estão sendo salvos
const vTimers = {};

let dividas = []; // dívidas das oficinas (aba Devedores)
let divOk = true; // false se a tabela de dívidas não existir no Supabase

// Abas do site e quem pode ver cada uma (definido pela equipe da pessoa).
const ABAS = ["mes", "hist", "fin", "dev", "frota", "crit"];
const ABA_NOME = {
  mes: "Avaliação do mês",
  hist: "Histórico",
  fin: "Financeiro",
  dev: "Devedores",
  frota: "Veículos Mega",
  crit: "Critérios",
};
let equipes = []; // [{id, nome, abas, ordem}]

function abasLiberadas() {
  if (store.modo === "local" || !perfil || perfil.semTabela || perfil.admin) return ABAS.slice();
  const minhas = equipes.filter((e) => (perfil.equipes || []).includes(e.id));
  return ABAS.filter((a) => minhas.some((e) => (e.abas || []).includes(a)));
}
function podeAba(a) {
  return abasLiberadas().includes(a);
}

let perfil = null; // perfil de acesso de quem está logado (status, admin)

// Subtítulo, ícone e nota de rodapé de cada aba.
const PAGINA = {
  mes: {
    sub: "Acompanhe o desempenho e a classificação das oficinas no mês.",
    ic: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    nota: "As notas consideram os veículos avaliados de cada oficina no mês selecionado.",
  },
  hist: {
    sub: "Consulte a evolução das notas e o desempenho das oficinas.",
    ic: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    nota: "O histórico mostra os últimos 12 meses a partir do mês selecionado.",
  },
  fin: {
    sub: "Acompanhe os valores de reparos, pagamentos e complementos por oficina.",
    ic: '<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4"/><circle cx="16.5" cy="14" r="1.2"/>',
    nota: "Os valores apresentados são referentes aos lançamentos registrados no período selecionado.",
  },
  dev: {
    sub: "Acompanhe os devedores e mantenha o controle dos descontos.",
    ic: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5A5 5 0 0 1 21 20"/>',
    nota: "O saldo devedor diminui a cada desconto lançado por placa.",
  },
  frota: {
    sub: "Consulte os veículos da Mega e acompanhe os gastos com reparos.",
    ic: '<path d="M3 13l2-5h14l2 5v5H3z"/><path d="M3 13h18"/><circle cx="7.5" cy="16" r="1.2"/><circle cx="16.5" cy="16" r="1.2"/>',
    nota: "",
  },
  crit: {
    sub: "Confira os critérios e os pesos usados na avaliação das oficinas.",
    ic: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    nota: "A soma dos pesos dos critérios fecha em 100 pontos por veículo.",
  },
  acc: {
    sub: "Aprove acessos e defina o que cada equipe pode ver.",
    ic: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 11l2 2 4-4"/>',
    nota: "Cada pessoa vê somente as abas liberadas para as equipes dela.",
  },
};
