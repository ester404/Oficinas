/* Tela de login, criação de conta e espera de aprovação. */

function lgView(v) {
  $("lgForm").hidden = v !== "in";
  $("upForm").hidden = v !== "up";
  $("lgWait").hidden = v !== "wait";
  $("lgTabs").hidden = v === "wait";
  document
    .querySelectorAll("[data-lgt]")
    .forEach((b) => b.setAttribute("aria-selected", b.dataset.lgt === v));
}

function showLogin(msg) {
  document.body.classList.add("locked");
  $("login").hidden = false;
  lgView("in");
  $("lgErr").textContent = msg || "";
  $("lgErr").hidden = !msg;
  setTimeout(() => {
    try {
      $("lgEmail").focus();
    } catch (e) {}
  }, 50);
}

function showWait(st) {
  document.body.classList.add("locked");
  $("login").hidden = false;
  lgView("wait");
  if (st === "recusado") {
    $("lwIc").textContent = "⛔";
    $("lwT").textContent = "Acesso não autorizado";
    $("lwP").textContent =
      "Seu pedido de acesso foi recusado. Se achar que é um engano, fale com o Departamento de Notas.";
    $("lwRetry").hidden = true;
  } else {
    $("lwIc").textContent = "⏳";
    $("lwT").textContent = "Aguardando aprovação";
    $("lwP").textContent =
      "Olá" +
      (perfil && perfil.nome ? ", " + perfil.nome : "") +
      "! Seu acesso (" +
      (sess ? sess.email : "") +
      ") foi criado e está aguardando a aprovação do Departamento de Notas. Assim que for aprovado, clique em “Verificar de novo”.";
    $("lwRetry").hidden = false;
  }
}

function hideLogin() {
  document.body.classList.remove("locked");
  $("login").hidden = true;
  $("whoMail").textContent = (perfil && perfil.nome) || (sess ? sess.email : "");
  $("whoBox").hidden = !sess;
}

async function loadPerfil() {
  if (!sess.uid) {
    try {
      const r = await fetch(AUTH + "user", {
        headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sess.access_token },
      });
      const u = await r.json();
      if (u && u.id) {
        sess.uid = u.id;
        sess.email = u.email || sess.email;
        try {
          localStorage.setItem(SESS_KEY, JSON.stringify(sess));
        } catch (e) {}
      }
    } catch (e) {}
  }
  const r = await sbFetch(SB + "perfis?select=*&user_id=eq." + encodeURIComponent(sess.uid), {
    cache: "no-store",
  });
  if (r.status === 404 || r.status === 400) {
    return { status: "aprovado", admin: false, semTabela: true };
  }
  if (!r.ok) throw await sbErr(r);
  const a = await r.json();
  return a[0] || { status: "pendente" };
}

async function afterAuth() {
  try {
    await ensureSess();
    perfil = await loadPerfil();
  } catch (e) {
    if (e.login) return;
    showLogin("Não foi possível verificar seu acesso (" + e.message + ").");
    return;
  }
  if (perfil.status !== "aprovado") {
    showWait(perfil.status);
    return;
  }
  $("t-acc").hidden = !perfil.admin;
  hideLogin();
  startApp();
  if (perfil.admin) loadAcc(true);
}

document.querySelectorAll("[data-lgt]").forEach(
  (b) =>
    (b.onclick = () => {
      lgView(b.dataset.lgt);
      $("lgErr").hidden = true;
      $("upErr").hidden = true;
      setTimeout(() => {
        const f = b.dataset.lgt === "up" ? $("upNome") : $("lgEmail");
        if (f) f.focus();
      }, 30);
    }),
);

$("lgForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const em = $("lgEmail").value.trim(),
    pw = $("lgPass").value;
  if (!em || !pw) {
    showLogin("Preencha o e-mail e a senha.");
    return;
  }
  $("lgBtn").disabled = true;
  $("lgBtn").textContent = "Entrando…";
  $("lgErr").hidden = true;
  try {
    const j = await authPost("token?grant_type=password", { email: em, password: pw });
    saveSess(j);
    $("lgPass").value = "";
    await afterAuth();
  } catch (er) {
    showLogin(
      er.code === "email_not_confirmed"
        ? "Confirme seu e-mail antes de entrar (veja sua caixa de entrada)."
        : er.status === 400 || er.code === "invalid_credentials"
          ? "E-mail ou senha incorretos."
          : er.status === 429
            ? "Muitas tentativas. Espere um pouco e tente de novo."
            : "Não foi possível entrar (" + er.message + "). Confira a internet.",
    );
  } finally {
    $("lgBtn").disabled = false;
    $("lgBtn").textContent = "Entrar";
  }
});

$("upForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nm = $("upNome").value.trim(),
    em = $("upEmail").value.trim(),
    pw = $("upPass").value,
    pw2 = $("upPass2").value;
  const err = (t) => {
    $("upErr").textContent = t;
    $("upErr").hidden = false;
  };
  if (!nm || !em || !pw) return err("Preencha nome, e-mail e senha.");
  if (pw.length < 6) return err("A senha precisa ter pelo menos 6 caracteres.");
  if (pw !== pw2) return err("As senhas não são iguais.");
  $("upBtn").disabled = true;
  $("upBtn").textContent = "Criando…";
  $("upErr").hidden = true;
  try {
    const j = await authPost("signup", { email: em, password: pw, data: { nome: nm } });
    if (j.access_token) {
      saveSess(j);
      await afterAuth();
    } else {
      lgView("in");
      $("lgEmail").value = em;
      $("lgErr").textContent =
        "Conta criada! Se o Supabase pedir, confirme o e-mail. Depois entre aqui e aguarde a aprovação.";
      $("lgErr").hidden = false;
      $("lgErr").classList.add("ok");
    }
  } catch (er) {
    err(
      er.code === "user_already_exists" || /already/i.test(er.message)
        ? "Esse e-mail já tem conta. Use a aba Entrar."
        : er.code === "signup_disabled" || /signups? not allowed/i.test(er.message)
          ? "O cadastro está desligado no momento. Fale com o Departamento de Notas."
          : er.code === "weak_password"
            ? "Senha fraca. Use pelo menos 6 caracteres."
            : "Não foi possível criar a conta (" + er.message + ").",
    );
  } finally {
    $("upBtn").disabled = false;
    $("upBtn").textContent = "Criar conta";
  }
});

$("lwRetry").onclick = () => afterAuth();

async function doLogout() {
  try {
    if (sess)
      await fetch(AUTH + "logout", {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sess.access_token },
      });
  } catch (e) {}
  clearSess();
  perfil = null;
  $("t-acc").hidden = true;
  oficinas = [];
  descreds = [];
  aval = {};
  veic = {};
  ready = false;
  renderAll();
  tab("mes");
  showLogin("Você saiu. Entre de novo para continuar.");
}

$("logoutBtn").onclick = doLogout;

$("lwOut").onclick = doLogout;
