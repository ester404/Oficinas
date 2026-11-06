/* Conexão com o Supabase (login e banco) e modo local (navegador). */

const LS_KEY = "ranking-oficinas-v1";

const SB = SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/";

const SB_H = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };

const AUTH = SUPABASE_URL.replace(/\/+$/, "") + "/auth/v1/";

const SESS_KEY = "ranking-oficinas-sessao";

let sess = null;

function loadSess() {
  try {
    sess = JSON.parse(localStorage.getItem(SESS_KEY));
  } catch (e) {
    sess = null;
  }
}

function saveSess(j) {
  sess = {
    uid: (j.user && j.user.id) || (sess && sess.uid) || "",
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
    email: (j.user && j.user.email) || (sess && sess.email) || "",
  };
  try {
    localStorage.setItem(SESS_KEY, JSON.stringify(sess));
  } catch (e) {}
  SB_H.Authorization = "Bearer " + sess.access_token;
}

function clearSess() {
  sess = null;
  try {
    localStorage.removeItem(SESS_KEY);
  } catch (e) {}
  delete SB_H.Authorization;
}

async function authPost(path, body) {
  const r = await fetch(AUTH + path, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Object.assign(new Error(j.error_description || j.msg || j.message || "HTTP " + r.status), {
      status: r.status,
      code: j.error_code || j.error,
    });
  return j;
}

async function refreshSess() {
  if (!sess || !sess.refresh_token) throw new Error("sem sessão");
  const j = await authPost("token?grant_type=refresh_token", { refresh_token: sess.refresh_token });
  saveSess(j);
}

async function ensureSess() {
  if (!sess) throw Object.assign(new Error("Faça login para continuar."), { login: true });
  if (sess.expires_at - 60 < Date.now() / 1000) {
    try {
      await refreshSess();
    } catch (e) {
      clearSess();
      showLogin("Sua sessão expirou. Entre de novo.");
      throw Object.assign(new Error("Sessão expirada."), { login: true });
    }
  }
  SB_H.Authorization = "Bearer " + sess.access_token;
}

async function sbFetch(url, opts) {
  await ensureSess();
  let r = await fetch(
    url,
    Object.assign({}, opts, { headers: Object.assign({}, opts && opts.headers, SB_H) }),
  );
  if (r.status === 401) {
    try {
      await refreshSess();
      r = await fetch(
        url,
        Object.assign({}, opts, { headers: Object.assign({}, opts && opts.headers, SB_H) }),
      );
    } catch (e) {
      clearSess();
      showLogin("Sua sessão expirou. Entre de novo.");
    }
  }
  return r;
}

const AV_MAP = [
  ["key", "key"],
  ["mes", "mes"],
  ["oficinaId", "oficina_id"],
  ["q", "q"],
  ["p", "p"],
  ["s", "s"],
  ["o", "o"],
  ["d", "d"],
  ["e", "e"],
  ["carros", "carros"],
  ["refeitos", "refeitos"],
  ["atrasos", "atrasos"],
  ["notaCliente", "nota_cliente"],
  ["extras", "extras"],
  ["obs", "obs"],
  ["enviados", "enviados"],
  ["atualizadoEm", "atualizado_em"],
];

async function sbErr(r) {
  let t = "";
  try {
    const j = await r.json();
    t = j.message || j.hint || "";
  } catch (e) {}
  return new Error("HTTP " + r.status + (t ? " – " + t : ""));
}

const store =
  SUPABASE_URL && SUPABASE_KEY
    ? {
        modo: "online",
        async get(t) {
          const r = await sbFetch(SB + t + "?select=*", { cache: "no-store" });
          if (!r.ok) throw await sbErr(r);
          return r.json();
        },
        async load() {
          const [of, av, ve, dv] = await Promise.all([
            this.get("oficinas"),
            this.get("avaliacoes"),
            this.get("veiculos").catch(() => null),
            this.get("dividas").catch(() => null),
          ]);
          return {
            dividas: dv,
            oficinas: of,
            avaliacoes: av.map((row) => {
              const a = {};
              for (const [js, db] of AV_MAP) a[js] = row[db];
              return a;
            }),
            veiculos:
              ve &&
              ve.map((r) => ({
                id: r.id,
                mes: r.mes,
                oficinaId: r.oficina_id,
                placa: r.placa,
                descricao: r.descricao,
                franquia: r.franquia,
                liquido: r.liquido,
                complemento: r.complemento,
                pecas: r.pecas,
                pago: r.pago,
                obs: r.obs,
                criadoEm: r.criado_em,
              })),
          };
        },
        saveVeh(v) {
          return this.upsert("veiculos", {
            id: v.id,
            mes: v.mes,
            oficina_id: v.oficinaId,
            placa: v.placa || null,
            descricao: v.descricao || null,
            franquia: num(v.franquia),
            liquido: num(v.liquido),
            complemento: num(v.complemento),
            pecas: num(v.pecas),
            pago: num(v.pago),
            obs: v.obs || null,
            criado_em: v.criadoEm,
          });
        },
        async delVeh(id) {
          const r = await sbFetch(SB + "veiculos?id=eq." + encodeURIComponent(id), { method: "DELETE" });
          if (!r.ok) throw await sbErr(r);
        },
        saveDiv(d) {
          return this.upsert("dividas", {
            id: d.id,
            devedor: d.devedor,
            referente: d.referente || null,
            valor_total: num(d.valor_total),
            descontos: d.descontos || [],
            obs: d.obs || null,
            criado_em: d.criado_em,
          });
        },
        async delDiv(id) {
          const r = await sbFetch(SB + "dividas?id=eq." + encodeURIComponent(id), { method: "DELETE" });
          if (!r.ok) throw await sbErr(r);
        },
        async upsert(t, body) {
          const r = await sbFetch(SB + t, {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify(body),
          });
          if (!r.ok) throw await sbErr(r);
        },
        saveAval(d) {
          const row = {};
          for (const [js, db] of AV_MAP) row[db] = d[js] === undefined || d[js] === "" ? null : d[js];
          return this.upsert("avaliacoes", row);
        },
        saveOf(d) {
          const row = { id: d.id, nome: d.nome, ativa: d.ativa !== false, ordem: Number(d.ordem) || null };
          if ("descredenciada" in d) {
            row.descredenciada = !!d.descredenciada;
            row.motivo = d.motivo || null;
            row.descredenciada_em = d.descredenciada_em || null;
          }
          return this.upsert("oficinas", row);
        },
      }
    : {
        modo: "local",
        read() {
          try {
            const j = JSON.parse(localStorage.getItem(LS_KEY));
            if (j) return j;
          } catch (e) {}
          return {
            oficinas: OFICINAS_INICIAIS.map((n, i) => ({
              id: slug(n),
              nome: n,
              ativa: true,
              ordem: i + 1,
            })),
            avaliacoes: [],
          };
        },
        write(j) {
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(j));
          } catch (e) {
            throw new Error("não foi possível gravar no navegador");
          }
        },
        async load() {
          return this.read();
        },
        async saveAval(d) {
          const j = this.read();
          j.avaliacoes = j.avaliacoes.filter((a) => a.key !== d.key);
          j.avaliacoes.push(d);
          this.write(j);
        },
        async saveOf(d) {
          const j = this.read();
          j.oficinas = j.oficinas.filter((o) => o.id !== d.id);
          j.oficinas.push(d);
          this.write(j);
        },
        async saveVeh(v) {
          const j = this.read();
          j.veiculos = (j.veiculos || []).filter((x) => x.id !== v.id);
          j.veiculos.push(v);
          this.write(j);
        },
        async saveDiv(d) {
          const j = this.read();
          j.dividas = (j.dividas || []).filter((x) => x.id !== d.id);
          j.dividas.push(d);
          this.write(j);
        },
        async delDiv(id) {
          const j = this.read();
          j.dividas = (j.dividas || []).filter((x) => x.id !== id);
          this.write(j);
        },
        async delVeh(id) {
          const j = this.read();
          j.veiculos = (j.veiculos || []).filter((x) => x.id !== id);
          this.write(j);
        },
      };

function apply(j) {
  knownIds = new Set((j.oficinas || []).map((o) => String(o.id)));
  const all = (j.oficinas || [])
    .filter((o) => o.ativa !== false && String(o.ativa).toUpperCase() !== "FALSE")
    .map((o) => ({ ...o, id: String(o.id), nome: String(o.nome) }))
    .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0) || a.nome.localeCompare(b.nome));
  const isDc = (o) => o.descredenciada === true || String(o.descredenciada).toUpperCase() === "TRUE";
  oficinas = all.filter((o) => !isDc(o));
  descreds = all.filter(isDc);
  aval = {};
  for (const a of j.avaliacoes || []) if (a && a.key) aval[a.key] = a;
  veicOk = (j.veiculos !== null && j.veiculos !== undefined) || store.modo === "local";
  const nv = {};
  for (const v of j.veiculos || []) if (v && v.id) nv[v.id] = Object.assign({}, v, vPending[v.id] || {});
  for (const id in vPending) if (!nv[id]) nv[id] = vPending[id];
  veic = nv;
  divOk = (j.dividas !== null && j.dividas !== undefined) || store.modo === "local";
  dividas = (j.dividas || []).map((d) => ({ ...d, descontos: parseEnviados(d.descontos) }));
}

async function refresh(first) {
  try {
    const j = await store.load();
    apply(j);
    ready = true;
    if (first) renderAll();
    else {
      emMes("mes", syncInputs);
      emMes("hist", renderHist);
      if (!$("finPanel").contains(document.activeElement)) emMes("fin", renderFin);
      if (!$("v-dev").contains(document.activeElement)) renderDev();
    }
    if (store.modo === "online") setStatus("Atualizado às " + hora());
  } catch (e) {
    if (e.login) return;
    if (first) {
      $("rows").innerHTML =
        '<li class="empty">Não foi possível carregar os dados. Confira a internet e recarregue a página.</li>';
    }
    setStatus("Falha ao atualizar (" + e.message + ").");
  }
}
