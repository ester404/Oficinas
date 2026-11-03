/* Tela de login, criação de conta e espera de aprovação. */

// Mostra uma das telas do login: in (entrar), up (criar conta), rec (esqueci a senha),
// new (criar nova senha) ou wait (aguardando aprovação).
function lgView(v) {
  $("lgForm").hidden = v !== "in";
  $("upForm").hidden = v !== "up";
  $("recForm").hidden = v !== "rec";
  $("newForm").hidden = v !== "new";
  $("lgWait").hidden = v !== "wait";
  $("lgTabs").hidden = !["in", "up"].includes(v);
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
    guardarNoNavegador(em, pw);
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

// ---------- senha: salvar no navegador, esqueci, alterar ----------

const SITE_URL = location.origin + location.pathname;

// Pede ao navegador (Chrome/Edge) para guardar e-mail e senha.
function guardarNoNavegador(email, senha) {
  try {
    if (window.PasswordCredential && navigator.credentials)
      navigator.credentials
        .store(new PasswordCredential({ id: email, password: senha, name: email }))
        .catch(() => {});
  } catch (e) {}
}

// Botão 👁 para mostrar/esconder a senha.
function botoesOlho() {
  document.querySelectorAll('input[type="password"]').forEach((inp) => {
    if (inp.parentElement.classList.contains("pw-wrap")) return;
    const w = document.createElement("span");
    w.className = "pw-wrap";
    inp.replaceWith(w);
    w.append(inp);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pw-eye";
    b.setAttribute("aria-label", "Mostrar senha");
    b.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    b.onclick = () => {
      const ver = inp.type === "password";
      inp.type = ver ? "text" : "password";
      b.classList.toggle("on", ver);
      b.setAttribute("aria-label", ver ? "Esconder senha" : "Mostrar senha");
    };
    w.append(b);
  });
}

// Troca a senha de quem está logado (ou de quem veio pelo link de recuperação).
async function trocarSenha(senha) {
  await ensureSess();
  const r = await fetch(AUTH + "user", {
    method: "PUT",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + sess.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: senha }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Object.assign(new Error(j.msg || j.message || j.error_description || "HTTP " + r.status), {
      code: j.error_code,
    });
  return j;
}

function erroSenha(er) {
  return er.code === "same_password"
    ? "A senha nova precisa ser diferente da atual."
    : er.code === "weak_password"
      ? "Senha fraca. Use pelo menos 6 caracteres."
      : er.login
        ? "O link expirou. Peça um novo em “Esqueci minha senha”."
        : "Não foi possível salvar a senha (" + er.message + ").";
}

function validarSenhas(a, b) {
  if (a.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
  if (a !== b) return "As senhas não são iguais.";
  return "";
}

// Lê o link de recuperação que chega por e-mail (#access_token=...&type=recovery).
function lerLinkRecuperacao() {
  if (!location.hash || location.hash.length < 2) return null;
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.get("type") && !h.get("error_code") && !h.get("error")) return null;
  history.replaceState(null, "", SITE_URL);
  if (h.get("error_code") || h.get("error"))
    return {
      erro:
        h.get("error_code") === "otp_expired"
          ? "O link expirou. Peça um novo em “Esqueci minha senha”."
          : "Link inválido. Peça um novo.",
    };
  if (h.get("type") === "recovery" && h.get("access_token")) {
    saveSess({
      access_token: h.get("access_token"),
      refresh_token: h.get("refresh_token"),
      expires_in: Number(h.get("expires_in")) || 3600,
    });
    return { recuperar: true };
  }
  return null;
}

function mostrarNovaSenha() {
  document.body.classList.add("locked");
  $("login").hidden = false;
  lgView("new");
  setTimeout(() => $("newPass").focus(), 50);
}

$("lgForgot").onclick = () => {
  lgView("rec");
  $("recEmail").value = $("lgEmail").value;
  $("recMsg").hidden = true;
  setTimeout(() => $("recEmail").focus(), 30);
};

$("recForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const em = $("recEmail").value.trim(),
    msg = (t, ok) => {
      $("recMsg").textContent = t;
      $("recMsg").classList.toggle("ok", !!ok);
      $("recMsg").hidden = false;
    };
  if (!em) return msg("Digite seu e-mail.");
  $("recBtn").disabled = true;
  try {
    await authPost("recover?redirect_to=" + encodeURIComponent(SITE_URL), { email: em });
    msg(
      "Pronto! Se esse e-mail tiver conta, você vai receber um link para criar uma senha nova. Veja também o spam.",
      true,
    );
  } catch (er) {
    msg(
      er.status === 429
        ? "Muitos pedidos seguidos. Espere alguns minutos e tente de novo."
        : "Não foi possível enviar (" + er.message + ").",
    );
  } finally {
    $("recBtn").disabled = false;
  }
});

$("newForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const a = $("newPass").value,
    erro = (t) => {
      $("newErr").textContent = t;
      $("newErr").hidden = false;
    };
  const v = validarSenhas(a, $("newPass2").value);
  if (v) return erro(v);
  $("newBtn").disabled = true;
  try {
    const u = await trocarSenha(a);
    $("newUser").value = u.email || "";
    guardarNoNavegador(u.email || "", a);
    $("newPass").value = $("newPass2").value = "";
    await afterAuth();
    setStatus("Senha alterada.");
  } catch (er) {
    erro(erroSenha(er));
  } finally {
    $("newBtn").disabled = false;
  }
});

$("pwBtn").onclick = () => {
  $("pwUser").value = sess ? sess.email : "";
  $("pwErr").hidden = true;
  $("pwDlg").showModal();
  setTimeout(() => $("pwNew").focus(), 30);
};
$("pwCancel").onclick = () => $("pwDlg").close();

$("pwForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const a = $("pwNew").value,
    erro = (t) => {
      $("pwErr").textContent = t;
      $("pwErr").classList.remove("ok");
      $("pwErr").hidden = false;
    };
  const v = validarSenhas(a, $("pwNew2").value);
  if (v) return erro(v);
  $("pwSave").disabled = true;
  try {
    await trocarSenha(a);
    guardarNoNavegador(sess.email, a);
    $("pwNew").value = $("pwNew2").value = "";
    $("pwDlg").close();
    setStatus("Senha alterada com sucesso.");
  } catch (er) {
    erro(erroSenha(er));
  } finally {
    $("pwSave").disabled = false;
  }
});

botoesOlho();
