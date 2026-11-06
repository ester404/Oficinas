/* Estado compartilhado do site (dados carregados e mês selecionado). */

let mes = CUR; // mês da aba aberta, no formato "AAAA-MM"
let abaAtual = "mes"; // aba aberta
const mesPorAba = { mes: CUR, hist: CUR, fin: CUR }; // cada aba guarda o seu próprio mês
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

let perfil = null; // perfil de acesso de quem está logado (status, admin)
