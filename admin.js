// Decorize — painel da administradora | TF Solutions
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const NOME_NIVEL = { bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante" };
  const ESTADOS = { novo: "Novo", respondido: "Respondido", fechado: "Fechado", perdido: "Não fechou" };

  const d = { config: {}, temas: [], categorias: [], combos: [], adicionais: [], contatos: [], eventos: [], pecas: [] };
  let editando = null;      // tema em edição (ou null para novo)
  let fotosEdicao = {};     // { bronze: dataURL|url, ... }

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 2200);
  }

  const slug = (s) => semAcento(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `tema-${Date.now().toString(36)}`;
  const numero = (v) => {
    const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
  };
  const valorCampo = (n) => (Number(n) > 0 ? String(n).replace(".", ",") : "");

  /* ---------- login ---------- */
  function mostrarLogin() {
    $("telaLogin").hidden = false;
    $("telaPainel").hidden = true;
    $("campoEmail").hidden = MODO_DEMO;
    $("dicaLogin").textContent = MODO_DEMO ? "Demonstração: a senha é decorize2026." : "Entre com o seu e-mail e senha.";
  }

  $("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("erroLogin").hidden = true;
    try {
      await Dados.entrar($("loginEmail").value, $("loginSenha").value);
      await abrirPainel();
    } catch (err) {
      $("erroLogin").textContent = err && err.message === "sem-acesso"
        ? "Este e-mail não tem acesso ao painel. Fale com a TF Solutions."
        : "E-mail ou senha incorretos.";
      $("erroLogin").hidden = false;
    }
  });

  // Esqueci minha senha (só com Firebase): manda o e-mail para criar uma senha nova
  $("esqueciSenha").hidden = MODO_DEMO;
  $("esqueciSenha").addEventListener("click", async () => {
    const email = $("loginEmail").value.trim();
    if (!email) { $("erroLogin").textContent = "Digite o seu e-mail primeiro."; $("erroLogin").hidden = false; return; }
    try {
      await Dados.redefinirSenha(email);
      toast("Enviamos um e-mail para você criar uma senha nova.");
    } catch (e) {
      $("erroLogin").textContent = "Não consegui enviar. Confira o e-mail digitado.";
      $("erroLogin").hidden = false;
    }
  });

  $("sair").addEventListener("click", async () => { await Dados.sair(); mostrarLogin(); });

  async function abrirPainel() {
    $("telaLogin").hidden = true;
    $("telaPainel").hidden = false;
    $("caixaDemo").hidden = !MODO_DEMO;
    await recarregar();
  }

  async function recarregar() {
    const [cfg, privado, temas, cats, combos, adicionais, contatos, eventos, pecas] = await Promise.all([
      Dados.obter("configuracoes", "geral"),
      Dados.obter("configuracoes", "privado"),
      Dados.listar("temas"), Dados.listar("categorias"), Dados.listar("combos"),
      Dados.listar("adicionais"), Dados.listar("contatos"), Dados.listar("eventos"), Dados.listar("pecas"),
    ]);
    d.eventos = eventos;
    d.pecas = pecas;
    d.config = { ...CONFIG_PADRAO, ...(cfg || {}), ...(privado || {}) };
    d.temas = temas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    d.categorias = (cats.length ? cats : SEED_CATEGORIAS).sort(ordenarPor("ordem"));
    d.combos = (combos.length ? combos : SEED_COMBOS).sort(ordenarPor("ordem"));
    d.adicionais = adicionais;
    d.contatos = contatos.sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
    desenharTudo();
  }

  function desenharTudo() {
    desenharContatos();
    desenharFiltro();
    desenharTemas();
    desenharKits();
    desenharAdicionais();
    preencherConfig();
    (window.PainelExtras || []).forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  }

  // As outras partes do painel (agenda.js, post-dia.js) usam estes dados e funções.
  window.Painel = { d, toast, recarregar, linkTema: (t) => linkDoTema(t), slug, numero, valorCampo };

  /* ---------- abas ---------- */
  $("abas").addEventListener("click", (e) => {
    const b = e.target.closest("[data-aba]");
    if (!b) return;
    document.querySelectorAll("#abas button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    document.querySelectorAll("[data-painel]").forEach((p) => { p.hidden = p.dataset.painel !== b.dataset.aba; });
    document.dispatchEvent(new CustomEvent("aba", { detail: b.dataset.aba }));
    window.scrollTo(0, 0);
  });

  /* ---------- contatos ---------- */
  function desenharContatos() {
    const novos = d.contatos.filter((c) => c.status === "novo").length;
    $("bolhaContatos").hidden = !novos;
    $("bolhaContatos").textContent = novos;

    const mes = new Date().toISOString().slice(0, 7);
    const doMes = d.contatos.filter((c) => String(c.criadoEm).startsWith(mes));
    const contagem = {};
    d.contatos.forEach((c) => { contagem[c.tema] = (contagem[c.tema] || 0) + 1; });
    const top = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
    $("resumo").innerHTML = `
      <div><small>Contatos no mês</small><b>${doMes.length}</b></div>
      <div><small>Esperando resposta</small><b>${novos}</b></div>
      <div><small>Tema mais pedido</small><b>${top ? escaparHtml(top[0]) : "—"}</b></div>`;

    if (!d.contatos.length) {
      $("listaContatos").innerHTML = `<p class="vazio-adm">Ainda ninguém pediu tema pelo site.</p>`;
      return;
    }
    $("listaContatos").innerHTML = d.contatos.map((c) => {
      const quando = new Date(c.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      const st = ESTADOS[c.status] ? c.status : "novo";
      return `<div class="contato">
        <div>
          <h3>${escaparHtml(c.tema)} <span class="estado ${st}">${ESTADOS[st]}</span></h3>
          <p>${escaparHtml(c.combo)} · ${escaparHtml(c.modalidade)}${c.adicionais && c.adicionais.length ? ` · + ${escaparHtml(c.adicionais.join(", "))}` : ""}</p>
          <p>${quando} · Ref. ${escaparHtml(c.codigo)} · <span class="valor">${c.total ? formatarMoeda(c.total) : "a combinar"}</span></p>
        </div>
        <div class="contato-acoes">
          <select class="entrada" data-status="${escaparHtml(c.docId)}" aria-label="Situação">
            ${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${k === st ? "selected" : ""}>${v}</option>`).join("")}
          </select>
          <button class="btn btn-claro" data-agendar="${escaparHtml(c.docId)}">📅 Agendar</button>
          <button class="link perigo" data-apagar-contato="${escaparHtml(c.docId)}">apagar</button>
        </div>
      </div>`;
    }).join("");
  }

  $("listaContatos").addEventListener("change", async (e) => {
    const id = e.target.dataset.status;
    if (!id) return;
    await Dados.salvar("contatos", id, { status: e.target.value });
    const c = d.contatos.find((x) => x.docId === id);
    if (c) c.status = e.target.value;
    desenharContatos();
    toast("Situação atualizada.");
  });
  $("listaContatos").addEventListener("click", async (e) => {
    const ag = e.target.dataset.agendar;
    if (ag && window.Agenda) { window.Agenda.deContato(d.contatos.find((x) => x.docId === ag)); return; }
    const id = e.target.dataset.apagarContato;
    if (!id || !confirm("Apagar este contato da lista?")) return;
    await Dados.excluir("contatos", id);
    d.contatos = d.contatos.filter((x) => x.docId !== id);
    desenharContatos();
  });

  /* ---------- temas ---------- */
  function desenharFiltro() {
    const atual = $("filtroCat").value;
    $("filtroCat").innerHTML = `<option value="">Todas as categorias</option>` +
      d.categorias.map((c) => `<option value="${c.id}">${c.emoji} ${escaparHtml(c.nome)}</option>`).join("");
    $("filtroCat").value = atual;
  }

  function desenharTemas() {
    const termo = semAcento($("buscaTemas").value.trim());
    const cat = $("filtroCat").value;
    const lista = d.temas.filter((t) =>
      (!cat || (t.categorias || []).includes(cat)) &&
      (!termo || semAcento(`${t.nome} ${t.sub}`).includes(termo)));
    if (!lista.length) {
      $("listaTemas").innerHTML = `<p class="vazio-adm">Nenhum tema encontrado.</p>`;
      return;
    }
    const nomeCat = (id) => (d.categorias.find((c) => c.id === id) || {}).nome || id;
    $("listaTemas").innerHTML = lista.map((t) => {
      const capa = fotoCapa(t);
      const qtd = NIVEIS.filter((n) => t.fotos && t.fotos[n]).length;
      return `<div class="linha-tema${t.ativo === false ? " oculto" : ""}">
        ${capa ? `<img src="${escaparHtml(capa)}" alt="">` : `<span class="sem">🎈</span>`}
        <div>
          <h3>${escaparHtml(t.nome)}${t.ativo === false ? " (oculto)" : ""}</h3>
          <p>${(t.categorias || []).map(nomeCat).join(", ")}${t.sub ? ` · ${escaparHtml(t.sub)}` : ""}</p>
          <p>${qtd} de 4 fotos <span class="pontos">${NIVEIS.map((n) => `<i class="${n}${t.fotos && t.fotos[n] ? " tem" : ""}"></i>`).join("")}</span></p>
        </div>
        <div class="linha-acoes"><button class="btn btn-claro" data-post="${escaparHtml(t.docId)}">📣 Post</button><button class="btn btn-claro" data-editar="${escaparHtml(t.docId)}">Editar</button></div>
      </div>`;
    }).join("");
  }

  $("buscaTemas").addEventListener("input", desenharTemas);
  $("filtroCat").addEventListener("change", desenharTemas);
  $("listaTemas").addEventListener("click", (e) => {
    const id = e.target.dataset.editar;
    if (id) abrirEditor(d.temas.find((t) => t.docId === id));
    const pid = e.target.dataset.post;
    if (pid) abrirPost(d.temas.find((t) => t.docId === pid));
  });
  $("novoTema").addEventListener("click", () => abrirEditor(null));

  function abrirEditor(tema) {
    editando = tema || null;
    fotosEdicao = { ...((tema && tema.fotos) || {}) };
    const f = $("formTema");
    f.reset();
    $("editorTitulo").textContent = tema ? `Editar: ${tema.nome}` : "Novo tema";
    f.nome.value = tema ? tema.nome : "";
    f.sub.value = tema ? tema.sub || "" : "";
    f.descricao.value = tema ? tema.descricao || "" : "";
    f.destaque.checked = !!(tema && tema.destaque);
    f.novo.checked = !!(tema && tema.novo);
    f.ativo.checked = !tema || tema.ativo !== false;
    $("checksCat").innerHTML = d.categorias.map((c) => `
      <label><input type="checkbox" value="${c.id}" ${tema && (tema.categorias || []).includes(c.id) ? "checked" : ""}> ${c.emoji} ${escaparHtml(c.nome)}</label>`).join("");
    $("listaSubs").innerHTML = [...new Set(d.temas.map((t) => t.sub).filter(Boolean))].sort().map((s) => `<option value="${escaparHtml(s)}">`).join("");
    $("excluirTema").hidden = !tema;
    desenharSlots();
    $("editor").hidden = false;
    document.body.classList.add("travado");
  }

  function fecharEditor() {
    $("editor").hidden = true;
    document.body.classList.remove("travado");
  }
  $("fecharEditor").addEventListener("click", fecharEditor);

  function desenharSlots() {
    $("fotosNivel").innerHTML = NIVEIS.map((n) => {
      const nomeKit = ((d.combos.find((c) => c.id === n) || {}).nome || `Kit ${NOME_NIVEL[n]}`).replace(/^Kit\s+/i, "");
      return `<div class="slot ${n}">
        <b>${escaparHtml(nomeKit)}</b>
        <label class="slot-foto">
          ${fotosEdicao[n] ? `<img src="${escaparHtml(fotosEdicao[n])}" alt="">` : "+ foto"}
          <input type="file" accept="image/*" data-slot="${n}" aria-label="Foto ${NOME_NIVEL[n]}">
        </label>
        ${fotosEdicao[n] ? `<button type="button" class="link perigo" data-tirar="${n}">tirar foto</button>` : ""}
      </div>`;
    }).join("");
  }

  $("fotosNivel").addEventListener("change", async (e) => {
    const n = e.target.dataset.slot;
    const arquivo = e.target.files && e.target.files[0];
    if (!n || !arquivo) return;
    try {
      fotosEdicao[n] = await reduzirFoto(arquivo);
      desenharSlots();
    } catch (err) {
      toast("Não consegui abrir essa foto.");
    }
  });
  $("fotosNivel").addEventListener("click", (e) => {
    const n = e.target.dataset.tirar;
    if (!n) return;
    delete fotosEdicao[n];
    desenharSlots();
  });

  /** Reduz a foto para no máximo 900px e JPEG leve (cabe bem no banco e carrega rápido). */
  function reduzirFoto(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onerror = reject;
      leitor.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 900;
          const escala = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * escala);
          c.height = Math.round(img.height * escala);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.78));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  $("formTema").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const nome = f.nome.value.trim();
    const categorias = [...$("checksCat").querySelectorAll("input:checked")].map((i) => i.value);
    if (!nome) { toast("Dê um nome ao tema."); return; }
    if (!categorias.length) { toast("Marque pelo menos uma categoria."); return; }
    let id = editando ? editando.docId : slug(nome);
    if (!editando && d.temas.some((t) => t.docId === id)) id = `${id}-${Date.now().toString(36).slice(-4)}`;
    const dados = {
      id, nome, categorias,
      sub: f.sub.value.trim(),
      descricao: f.descricao.value.trim(),
      fotos: { ...fotosEdicao },
      destaque: f.destaque.checked,
      novo: f.novo.checked,
      ativo: f.ativo.checked,
    };
    // regrava o tema inteiro, para fotos removidas saírem do banco (o salvar mescla campos)
    if (editando) await Dados.excluir("temas", id);
    await Dados.salvar("temas", id, dados);
    fecharEditor();
    await recarregar();
    toast(editando ? "Tema atualizado." : "Tema cadastrado!");
  });

  $("excluirTema").addEventListener("click", async () => {
    if (!editando || !confirm(`Excluir o tema "${editando.nome}"? As fotos dele também saem.`)) return;
    await Dados.excluir("temas", editando.docId);
    fecharEditor();
    await recarregar();
    toast("Tema excluído.");
  });

  /* ---------- kits ---------- */
  function desenharKits() {
    $("formKits").innerHTML = d.combos.map((c) => `
      <div class="kit-linha ${escaparHtml(c.id)}" data-kit="${escaparHtml(c.docId || c.id)}">
        <label class="campo"><span>Nome</span><input name="nome" value="${escaparHtml(c.nome)}"></label>
        <label class="campo itens"><span>O que vem no kit</span><input name="itens" value="${escaparHtml(c.itens)}"></label>
        <label class="campo"><span>Pegue e monte (R$)</span><input name="precoPegueMonte" inputmode="decimal" value="${valorCampo(c.precoPegueMonte)}" placeholder="não tem"></label>
        <label class="campo"><span>Com montagem (R$)</span><input name="precoMontagem" inputmode="decimal" value="${valorCampo(c.precoMontagem)}" placeholder="sob consulta"></label>
      </div>`).join("") + `<div><button class="btn btn-laranja" type="submit">Salvar kits</button></div>`;
  }

  $("formKits").addEventListener("submit", async (e) => {
    e.preventDefault();
    const linhas = [...$("formKits").querySelectorAll("[data-kit]")];
    for (const l of linhas) {
      const q = (n) => l.querySelector(`[name="${n}"]`).value;
      const base = d.combos.find((c) => (c.docId || c.id) === l.dataset.kit) || {};
      await Dados.salvar("combos", l.dataset.kit, {
        id: base.id || l.dataset.kit, ordem: base.ordem || 0,
        nome: q("nome").trim() || base.nome,
        itens: q("itens").trim(),
        precoPegueMonte: numero(q("precoPegueMonte")),
        precoMontagem: numero(q("precoMontagem")),
      });
    }
    await recarregar();
    toast("Kits salvos!");
  });

  /* ---------- adicionais ---------- */
  function desenharAdicionais() {
    $("listaAdicionaisAdm").innerHTML = d.adicionais.length ? d.adicionais.map((a) => `
      <div class="adicional-linha" data-adicional="${escaparHtml(a.docId)}">
        <label class="campo"><span>Nome</span><input name="nome" value="${escaparHtml(a.nome)}"></label>
        <label class="campo"><span>Detalhe</span><input name="detalhe" value="${escaparHtml(a.detalhe || "")}"></label>
        <label class="campo"><span>Valor (R$)</span><input name="preco" inputmode="decimal" value="${valorCampo(a.preco)}"></label>
        <div class="checks"><label><input type="checkbox" name="ativo" ${a.ativo !== false ? "checked" : ""}> No catálogo</label></div>
        <div class="checks"><button type="button" class="link perigo" data-apagar>excluir</button></div>
      </div>`).join("") : `<p class="vazio-adm">Nenhum adicional cadastrado.</p>`;
  }

  $("listaAdicionaisAdm").addEventListener("change", async (e) => {
    const linha = e.target.closest("[data-adicional]");
    if (!linha) return;
    const q = (n) => linha.querySelector(`[name="${n}"]`);
    await Dados.salvar("adicionais", linha.dataset.adicional, {
      nome: q("nome").value.trim(), detalhe: q("detalhe").value.trim(),
      preco: numero(q("preco").value), ativo: q("ativo").checked,
    });
    const a = d.adicionais.find((x) => x.docId === linha.dataset.adicional);
    if (a) Object.assign(a, { nome: q("nome").value.trim(), detalhe: q("detalhe").value.trim(), preco: numero(q("preco").value), ativo: q("ativo").checked });
    toast("Adicional salvo.");
  });
  $("listaAdicionaisAdm").addEventListener("click", async (e) => {
    if (!e.target.matches("[data-apagar]")) return;
    const linha = e.target.closest("[data-adicional]");
    if (!confirm("Excluir este adicional?")) return;
    await Dados.excluir("adicionais", linha.dataset.adicional);
    await recarregar();
  });
  $("novoAdicional").addEventListener("click", async () => {
    await Dados.adicionar("adicionais", { nome: "Novo adicional", detalhe: "", preco: 0, ativo: true });
    await recarregar();
    const ultimo = $("listaAdicionaisAdm").querySelector("[data-adicional]:last-child input");
    if (ultimo) { ultimo.focus(); ultimo.select(); }
  });

  /* ---------- configurações ---------- */
  function preencherConfig() {
    const f = $("formConfig");
    ["nomeDona", "whatsapp", "instagram", "cidade", "enderecoSite", "heroTitulo", "heroSubtitulo", "aviso", "textoPegueMonte", "textoMontagem", "nomeMontagem", "textoComoFunciona"]
      .forEach((k) => { f[k].value = d.config[k] ?? ""; });
  }
  $("formConfig").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const novo = {};
    ["nomeDona", "instagram", "cidade", "enderecoSite", "heroTitulo", "heroSubtitulo", "aviso", "textoPegueMonte", "textoMontagem", "nomeMontagem", "textoComoFunciona"]
      .forEach((k) => { novo[k] = f[k].value.trim(); });
    novo.instagram = novo.instagram.replace(/^@/, "");
    let zap = f.whatsapp.value.replace(/\D/g, "");
    if (zap.length === 10 || zap.length === 11) zap = `55${zap}`;
    if (zap.length < 12) { toast("Confira o WhatsApp com DDD."); return; }
    novo.whatsapp = zap;
    await Dados.salvar("configuracoes", "geral", novo);
    d.config = { ...d.config, ...novo };
    preencherConfig();
    toast("Configurações salvas!");
  });
  const CAMPOS_DOCS = ["documento", "chavePix", "enderecoEmpresa", "prazoSaldo", "clausulasContrato"];
  function preencherDocs() { const f = $("formDocs"); CAMPOS_DOCS.forEach((k) => { f[k].value = d.config[k] ?? ""; }); }
  (window.PainelExtras = window.PainelExtras || []).push(preencherDocs);
  $("formDocs").addEventListener("submit", async (e) => {
    e.preventDefault();
    const novo = {};
    CAMPOS_DOCS.forEach((k) => { novo[k] = e.target[k].value.trim(); });
    await Dados.salvar("configuracoes", "privado", novo); // não fica público
    Object.assign(d.config, novo);
    toast("Dados dos documentos salvos!");
  });

  $("recomecar").addEventListener("click", async () => {
    if (!confirm("Voltar tudo para os dados de exemplo da demonstração?")) return;
    Dados.resetar();
    await recarregar();
    toast("Demonstração reiniciada.");
  });

  /* ---------- post do tema ---------- */
  const post = { tema: null, formato: "feed" };

  function linkDoTema(tema) {
    let base = String(d.config.enderecoSite || "").trim();
    if (!base) base = new URL("index.html", location.href).href;
    base = base.replace(/#.*$/, "");
    return `${base}#tema/${encodeURIComponent(tema.id || tema.docId)}`;
  }

  function menorPrecoKits() {
    const v = d.combos.map(precoInicial).filter((x) => x > 0);
    return v.length ? Math.min(...v) : 0;
  }

  function textoDoPost(tema) {
    const preco = menorPrecoKits();
    const nomes = d.combos.map((c) => c.nome.replace(/^Kit\s+/i, ""));
    const kits = nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}` : nomes.join("");
    return [
      `🎉 Tema *${tema.nome}* na ${d.config.nomeLoja}!`,
      tema.descricao ? tema.descricao : "",
      "",
      `✨ ${nomes.length} montagens: ${kits}${preco ? ` — a partir de ${formatarMoeda(preco)}` : ""}`,
      "📦 Pegue e monte ou 🚚 com montagem",
      "",
      `👉 Veja as fotos e escolha o seu kit: ${linkDoTema(tema)}`,
      `📍 ${d.config.cidade}`,
    ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
  }

  function carregarImagem(src) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function cobrir(ctx, img, x, y, w, h, raio) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, raio);
    ctx.clip();
    if (img) {
      const escala = Math.max(w / img.width, h / img.height);
      const iw = img.width * escala, ih = img.height * escala;
      ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    } else {
      ctx.fillStyle = "#fff1e5";
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  function selo(ctx, texto, x, y, cor) {
    ctx.font = "800 30px Nunito, sans-serif";
    const w = ctx.measureText(texto).width + 58;
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.beginPath(); ctx.roundRect(x, y, w, 50, 25); ctx.fill();
    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.arc(x + 22, y + 25, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b2314";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, x + 38, y + 26);
    ctx.textBaseline = "alphabetic";
    return w;
  }

  function quebrar(ctx, texto, max) {
    const palavras = String(texto).split(" ");
    const linhas = [];
    let atual = "";
    palavras.forEach((p) => {
      const teste = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(teste).width > max && atual) { linhas.push(atual); atual = p; } else atual = teste;
    });
    if (atual) linhas.push(atual);
    return linhas;
  }

  async function desenharPost() {
    const tema = post.tema;
    const cv = $("postCanvas");
    const W = 1080, H = post.formato === "stories" ? 1920 : 1350;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* segue */ } }

    // fundo laranja com bolinhas
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#ff8a26"); g.addColorStop(0.55, "#fe7000"); g.addColorStop(1, "#e65f00");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    [[90, 80, 120], [W - 60, H - 120, 170], [W - 170, 120, 40]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });

    // topo: logo
    const logo = await carregarImagem("assets/logo.png");
    if (logo) cobrir(ctx, logo, 60, 50, 96, 96, 22);
    ctx.fillStyle = "#fff";
    ctx.font = "800 44px Poppins, sans-serif";
    ctx.fillText(d.config.nomeLoja, 176, 108);
    ctx.font = "700 26px Nunito, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.fillText("Decorações para festas", 178, 140);

    // fotos
    const comFoto = NIVEIS.filter((n) => tema.fotos && tema.fotos[n]);
    const topoFotos = 180;
    const altFotos = post.formato === "stories" ? 1280 : 730;
    const cores = { bronze: "#b8743d", prata: "#8c96a3", ouro: "#d4a017", diamante: "#4fb3d9" };
    const nomeNivel = (n) => ((d.combos.find((c) => c.id === n) || {}).nome || NOME_NIVEL[n]).replace(/^Kit\s+/i, "");
    if (comFoto.length >= 2) {
      const lista = comFoto.slice(0, 4);
      const cols = 2, rows = Math.ceil(lista.length / 2);
      const gap = 16, w = (W - 120 - gap) / cols, h = (altFotos - gap * (rows - 1)) / rows;
      const imgs = await Promise.all(lista.map((n) => carregarImagem(tema.fotos[n])));
      lista.forEach((n, i) => {
        const x = 60 + (i % cols) * (w + gap), y = topoFotos + Math.floor(i / cols) * (h + gap);
        cobrir(ctx, imgs[i], x, y, w, h, 26);
        selo(ctx, nomeNivel(n), x + 16, y + h - 66, cores[n]);
      });
    } else {
      const img = await carregarImagem(fotoCapa(tema));
      cobrir(ctx, img, 60, topoFotos, W - 120, altFotos, 30);
    }

    // textos
    let y = topoFotos + altFotos + (tema.sub ? 140 : 100);
    ctx.fillStyle = "#fff";
    if (tema.sub) {
      ctx.font = "800 30px Nunito, sans-serif";
      ctx.fillStyle = "#ffe2c7";
      ctx.fillText(String(tema.sub).toUpperCase(), 60, y - 70);
      ctx.fillStyle = "#fff";
    }
    ctx.font = "800 76px Poppins, sans-serif";
    const linhas = quebrar(ctx, tema.nome, W - 120).slice(0, 2);
    linhas.forEach((l, i) => ctx.fillText(l, 60, y + i * 82));
    y += (linhas.length - 1) * 82 + 70;

    const preco = menorPrecoKits();
    ctx.font = "700 34px Nunito, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillText(`${d.combos.length} montagens · do ${nomeNivel(NIVEIS[0])} ao ${nomeNivel(NIVEIS[NIVEIS.length - 1])}`, 60, y);

    // rodapé: preço + chamada
    const yPe = H - 120;
    if (preco) {
      ctx.font = "800 34px Poppins, sans-serif";
      const t1 = `a partir de ${formatarMoeda(preco)}`;
      const w1 = ctx.measureText(t1).width + 56;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.roundRect(60, yPe - 44, w1, 76, 38); ctx.fill();
      ctx.fillStyle = "#d65c00";
      ctx.fillText(t1, 88, yPe + 6);
    }
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.font = "800 30px Nunito, sans-serif";
    ctx.fillText("Escolha o seu kit no catálogo 👉", W - 60, yPe - 8);
    ctx.font = "700 26px Nunito, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText(`@${d.config.instagram} · ${d.config.cidade}`, W - 60, yPe + 30);
    ctx.textAlign = "left";
  }

  async function abrirPost(tema) {
    if (!tema) return;
    post.tema = tema;
    $("postTitulo").textContent = `Post: ${tema.nome}`;
    $("postTexto").value = textoDoPost(tema);
    $("postErro").hidden = true;
    $("post").hidden = false;
    document.body.classList.add("travado");
    await desenharPost();
  }

  function fecharPost() { $("post").hidden = true; document.body.classList.remove("travado"); }
  $("fecharPost").addEventListener("click", fecharPost);
  $("postFormatos").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-formato]");
    if (!b) return;
    post.formato = b.dataset.formato;
    document.querySelectorAll("#postFormatos button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    await desenharPost();
  });

  function imagemDoPost() {
    return new Promise((resolve, reject) => {
      try { $("postCanvas").toBlob((b) => (b ? resolve(b) : reject(new Error("vazio"))), "image/jpeg", 0.9); }
      catch (e) { reject(e); }
    });
  }
  const nomeArquivo = () => `decorize-${slug(post.tema.nome)}-${post.formato}.jpg`;

  $("postBaixar").addEventListener("click", async () => {
    try {
      const blob = await imagemDoPost();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nomeArquivo();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      $("postErro").textContent = "O navegador bloqueou a imagem porque o painel foi aberto direto do computador. Pelo link publicado (GitHub Pages) o download funciona.";
      $("postErro").hidden = false;
    }
  });
  $("postCopiar").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("postTexto").value); toast("Texto copiado!"); }
    catch (e) { $("postTexto").select(); toast("Selecionei o texto: é só copiar."); }
  });
  $("postEnviar").addEventListener("click", async () => {
    const texto = $("postTexto").value;
    try {
      const blob = await imagemDoPost();
      const arquivo = new File([blob], nomeArquivo(), { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], text: texto });
        return;
      }
    } catch (e) { /* sem compartilhar com imagem: manda só o texto */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  });

  /* ---------- início ---------- */
  Dados.estaLogado((logado) => { if (logado) abrirPainel(); else mostrarLogin(); });
})();
