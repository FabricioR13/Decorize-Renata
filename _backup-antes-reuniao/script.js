// Decorize — vitrine de temas | TF Solutions
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const NOME_NIVEL = { bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante" };

  const estado = {
    config: { ...CONFIG_PADRAO },
    temas: [],
    categorias: [],
    combos: [],
    adicionais: [],
    cat: "todos",
    sub: "",
    busca: "",
    aberto: null,
    nivel: "bronze",
    modalidade: "pegue",
    extras: new Set(),
  };

  const linkZap = (texto) => `https://wa.me/${String(estado.config.whatsapp).replace(/\D/g, "")}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
  const comboDe = (nivel) => estado.combos.find((c) => c.id === nivel) || { id: nivel, nome: `Kit ${NOME_NIVEL[nivel]}`, itens: "", precoPegueMonte: 0, precoMontagem: 0 };
  const menorPreco = () => {
    const v = estado.combos.map(precoInicial).filter((x) => x > 0);
    return v.length ? Math.min(...v) : 0;
  };

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 2200);
  }

  /* ---------- carregar ---------- */
  async function carregar() {
    const [cfg, temas, cats, combos, adicionais] = await Promise.all([
      Dados.obter("configuracoes", "geral"),
      Dados.listar("temas"),
      Dados.listar("categorias"),
      Dados.listar("combos"),
      Dados.listar("adicionais"),
    ]);
    estado.config = { ...CONFIG_PADRAO, ...(cfg || {}) };
    estado.temas = temas.filter((t) => t.ativo !== false).sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || a.nome.localeCompare(b.nome, "pt-BR"));
    estado.categorias = cats.sort(ordenarPor("ordem"));
    estado.combos = combos.sort(ordenarPor("ordem"));
    estado.adicionais = adicionais.filter((a) => a.ativo !== false);
  }

  /* ---------- textos fixos ---------- */
  function preencherTextos() {
    const c = estado.config;
    $("demoBar").hidden = !MODO_DEMO;
    $("nomeLoja").textContent = c.nomeLoja;
    $("heroTitulo").textContent = c.heroTitulo;
    $("heroSubtitulo").textContent = c.heroSubtitulo;
    $("cidade").textContent = c.cidade;
    $("rodapeCidade").textContent = c.cidade;
    $("qtdTemas").textContent = estado.temas.length >= 50 ? `+${Math.floor(estado.temas.length / 10) * 10}` : String(estado.temas.length);
    $("txtPegue").textContent = c.textoPegueMonte;
    $("txtMontagem").textContent = c.textoMontagem;
    if (c.aviso) { $("aviso").textContent = c.aviso; $("aviso").hidden = false; }
    const oi = `Olá, ${c.nomeDona}! Vim pelo catálogo da ${c.nomeLoja} 🧡`;
    $("zapTopo").href = linkZap(oi);
    $("zapRodape").href = linkZap(oi);
    $("zapRodape").textContent = formatarTelefone(c.whatsapp);
    $("instaRodape").href = `https://www.instagram.com/${c.instagram}/`;
    $("instaRodape").textContent = `@${c.instagram}`;
    $("creditoTF").href = `https://wa.me/${TF_SOLUTIONS_WHATSAPP}`;
  }

  function formatarTelefone(n) {
    const d = String(n).replace(/\D/g, "").replace(/^55/, "");
    return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d;
  }

  /* ---------- categorias e subcategorias ---------- */
  function desenharCategorias() {
    const btn = (id, rotulo) => `<button class="chip" data-cat="${id}" aria-pressed="${estado.cat === id}">${rotulo}</button>`;
    $("cats").innerHTML = btn("todos", "✨ Todos") + estado.categorias
      .filter((c) => estado.temas.some((t) => (t.categorias || []).includes(c.id)))
      .map((c) => btn(c.id, `${c.emoji} ${escaparHtml(c.nome)}`)).join("");

    const subs = estado.cat === "todos" ? [] : [...new Set(
      estado.temas.filter((t) => (t.categorias || []).includes(estado.cat) && t.sub).map((t) => t.sub),
    )].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
    $("subs").hidden = subs.length < 2;
    $("subs").innerHTML = [`<button class="chip chip-sub" data-sub="" aria-pressed="${!estado.sub}">Todos</button>`]
      .concat(subs.map((s) => `<button class="chip chip-sub" data-sub="${escaparHtml(s)}" aria-pressed="${estado.sub === s}">${escaparHtml(s)}</button>`))
      .join("");
  }

  /* ---------- grade de temas ---------- */
  function filtrados() {
    const termo = semAcento(estado.busca.trim());
    return estado.temas.filter((t) => {
      if (estado.cat !== "todos" && !(t.categorias || []).includes(estado.cat)) return false;
      if (estado.sub && t.sub !== estado.sub) return false;
      if (!termo) return true;
      const nomesCat = (t.categorias || []).map((id) => (estado.categorias.find((c) => c.id === id) || {}).nome || "");
      return semAcento([t.nome, t.sub, t.descricao, ...nomesCat].join(" ")).includes(termo);
    });
  }

  function desenharGrade() {
    const lista = filtrados();
    const preco = menorPreco();
    const cat = estado.categorias.find((c) => c.id === estado.cat);
    $("tituloLista").textContent = estado.busca.trim()
      ? `Resultado para “${estado.busca.trim()}”`
      : estado.sub ? estado.sub : cat ? cat.nome : "Todos os temas";
    $("contador").textContent = `${lista.length} ${lista.length === 1 ? "tema" : "temas"}`;
    $("vazio").hidden = lista.length > 0;
    $("zapVazio").href = linkZap(`Olá, ${estado.config.nomeDona}! Vocês têm o tema "${estado.busca.trim() || "…"}"? Vi o catálogo da ${estado.config.nomeLoja}.`);

    $("grade").innerHTML = lista.map((t) => {
      const capa = fotoCapa(t);
      const bolinhas = NIVEIS.map((n) => `<i class="${n}${t.fotos && t.fotos[n] ? " tem" : ""}"></i>`).join("");
      const qtd = NIVEIS.filter((n) => t.fotos && t.fotos[n]).length;
      const selo = t.novo ? `<span class="selo-card novo">Novidade</span>` : t.destaque ? `<span class="selo-card">Mais pedido</span>` : "";
      return `<li><button class="card" data-tema="${escaparHtml(t.id || t.docId)}">
        <div class="card-foto">
          ${capa ? `<img src="${escaparHtml(capa)}" alt="Decoração tema ${escaparHtml(t.nome)}" loading="lazy">` : `<div class="card-sem-foto">🎈</div>`}
          ${selo}
          <span class="montagens" title="${qtd} de 4 montagens com foto">${bolinhas}</span>
        </div>
        <div class="card-corpo">
          ${t.sub ? `<p class="card-sub">${escaparHtml(t.sub)}</p>` : ""}
          <h3>${escaparHtml(t.nome)}</h3>
          ${preco ? `<p class="card-preco">a partir de <b>${formatarMoeda(preco)}</b></p>` : ""}
        </div>
      </button></li>`;
    }).join("");
  }

  /* ---------- kits e adicionais ---------- */
  function desenharKits() {
    $("listaKits").innerHTML = estado.combos.map((c) => `
      <li class="kit ${escaparHtml(c.id)}">
        <h3>${escaparHtml(c.nome)}</h3>
        <p>${escaparHtml(c.itens)}</p>
        <dl>
          <div><dt>Pegue e monte</dt><dd>${Number(c.precoPegueMonte) > 0 ? formatarMoeda(c.precoPegueMonte) : "—"}</dd></div>
          <div><dt>Com montagem</dt><dd>${Number(c.precoMontagem) > 0 ? formatarMoeda(c.precoMontagem) : "—"}</dd></div>
        </dl>
      </li>`).join("");
    $("listaAdicionais").innerHTML = estado.adicionais.map((a) => `
      <li><div><b>${escaparHtml(a.nome)}</b>${a.detalhe ? `<small>${escaparHtml(a.detalhe)}</small>` : ""}</div><span>+ ${formatarMoeda(a.preco)}</span></li>`).join("");
  }

  /* ---------- tema aberto ---------- */
  function abrirTema(id, { atualizarEndereco = true } = {}) {
    const tema = estado.temas.find((t) => (t.id || t.docId) === id);
    if (!tema) return;
    estado.aberto = tema;
    estado.extras = new Set();
    // começa na montagem mais simples que tem foto
    estado.nivel = NIVEIS.find((n) => tema.fotos && tema.fotos[n]) || "bronze";
    escolherModalidadePadrao();
    $("temaSub").textContent = tema.sub || "";
    $("temaNome").textContent = tema.nome;
    $("temaDesc").textContent = tema.descricao || "";
    desenharTema();
    $("fundo").hidden = false;
    document.body.classList.add("travado");
    if (atualizarEndereco && location.hash !== `#tema/${id}`) history.pushState(null, "", `#tema/${id}`);
  }

  function fecharTema({ atualizarEndereco = true } = {}) {
    $("fundo").hidden = true;
    document.body.classList.remove("travado");
    estado.aberto = null;
    if (atualizarEndereco && location.hash.startsWith("#tema/")) history.pushState(null, "", location.pathname + location.search);
  }

  function escolherModalidadePadrao() {
    const c = comboDe(estado.nivel);
    if (estado.modalidade === "pegue" && !(Number(c.precoPegueMonte) > 0)) estado.modalidade = "montagem";
    if (estado.modalidade === "montagem" && !(Number(c.precoMontagem) > 0) && Number(c.precoPegueMonte) > 0) estado.modalidade = "pegue";
  }

  function valorAtual() {
    const c = comboDe(estado.nivel);
    const base = Number(estado.modalidade === "pegue" ? c.precoPegueMonte : c.precoMontagem) || 0;
    const extras = estado.adicionais.filter((a) => estado.extras.has(a.id || a.docId)).reduce((s, a) => s + (Number(a.preco) || 0), 0);
    return { base, extras, total: base + extras };
  }

  function desenharTema() {
    const tema = estado.aberto;
    const foto = fotoDoNivel(tema, estado.nivel);
    const img = $("temaFoto");
    img.src = foto.src || "assets/logo.png";
    img.alt = `${tema.nome} — ${comboDe(estado.nivel).nome}`;
    $("temaIlustrativa").hidden = !foto.ilustrativa || !foto.src;

    $("niveis").innerHTML = NIVEIS.map((n) => `
      <button class="nivel ${n}" role="tab" data-nivel="${n}" aria-selected="${estado.nivel === n}">${escaparHtml(comboDe(n).nome.replace(/^Kit\s+/i, ""))}</button>`).join("");
    const combo = comboDe(estado.nivel);
    $("kitItens").textContent = combo.itens || "";

    const pm = Number(combo.precoPegueMonte) || 0;
    const mt = Number(combo.precoMontagem) || 0;
    $("modalidades").innerHTML = `
      <button class="modalidade" data-mod="pegue" aria-pressed="${estado.modalidade === "pegue"}" ${pm ? "" : "disabled"}>
        📦 Pegue e monte <small>você retira e monta</small><b>${pm ? formatarMoeda(pm) : "não disponível"}</b>
      </button>
      <button class="modalidade" data-mod="montagem" aria-pressed="${estado.modalidade === "montagem"}" ${mt ? "" : "disabled"}>
        🚚 Com montagem <small>a Decorize monta</small><b>${mt ? formatarMoeda(mt) : "sob consulta"}</b>
      </button>`;

    $("adicionais").innerHTML = estado.adicionais.map((a) => {
      const id = a.id || a.docId;
      return `<label class="adicional">
        <input type="checkbox" data-extra="${escaparHtml(id)}" ${estado.extras.has(id) ? "checked" : ""}>
        <span>${escaparHtml(a.nome)}${a.detalhe ? `<small>${escaparHtml(a.detalhe)}</small>` : ""}</span>
        <b>+ ${formatarMoeda(a.preco)}</b>
      </label>`;
    }).join("");

    const v = valorAtual();
    $("total").textContent = v.base ? formatarMoeda(v.total) : "sob consulta";
  }

  function codigo() {
    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "DZ";
    for (let i = 0; i < 4; i++) s += letras[Math.floor(Math.random() * letras.length)];
    return s;
  }

  async function quero() {
    const tema = estado.aberto;
    if (!tema) return;
    const c = estado.config;
    const combo = comboDe(estado.nivel);
    const v = valorAtual();
    const modalidade = estado.modalidade === "pegue" ? "Pegue e monte" : "Montagem pela Decorize";
    const extras = estado.adicionais.filter((a) => estado.extras.has(a.id || a.docId));
    const ref = codigo();
    const link = `${location.origin}${location.pathname}#tema/${tema.id || tema.docId}`;

    const linhas = [
      `Olá, ${c.nomeDona}! Vi no catálogo da ${c.nomeLoja} e quero esse tema 🧡`,
      "",
      `*Tema:* ${tema.nome}`,
      `*Kit:* ${combo.nome} — ${modalidade}${v.base ? ` (${formatarMoeda(v.base)})` : ""}`,
    ];
    if (extras.length) linhas.push(`*Adicionais:* ${extras.map((a) => `${a.nome} (${formatarMoeda(a.preco)})`).join(", ")}`);
    linhas.push(`*Total estimado:* ${v.base ? formatarMoeda(v.total) : "a combinar"}`);
    linhas.push("", "Pode me contar mais sobre esse tema e ver se tem a minha data?");
    if (!location.protocol.startsWith("file")) linhas.push("", `Tema no catálogo: ${link}`);
    linhas.push(`Ref.: ${ref}`);

    // Registra o interesse no painel (não trava o cliente se falhar)
    Dados.salvar("contatos", ref, {
      codigo: ref, status: "novo", criadoEm: new Date().toISOString(),
      tema: tema.nome, combo: combo.nome, modalidade,
      adicionais: extras.map((a) => a.nome), total: v.base ? v.total : 0,
    }).catch(() => {});

    window.open(linkZap(linhas.join("\n")), "_blank", "noopener");
  }

  async function compartilhar() {
    const tema = estado.aberto;
    if (!tema) return;
    const link = `${location.origin}${location.pathname}#tema/${tema.id || tema.docId}`;
    try {
      if (navigator.share) { await navigator.share({ title: `${tema.nome} | ${estado.config.nomeLoja}`, url: link }); return; }
      await navigator.clipboard.writeText(link);
      toast("Link do tema copiado!");
    } catch (e) {
      toast("Não deu para copiar. Copie o endereço do navegador.");
    }
  }

  /* ---------- rota (#tema/slug) ---------- */
  function lerRota() {
    const m = location.hash.match(/^#tema\/(.+)$/);
    if (m) abrirTema(decodeURIComponent(m[1]), { atualizarEndereco: false });
    else if (estado.aberto) fecharTema({ atualizarEndereco: false });
  }

  /* ---------- eventos ---------- */
  function ligarEventos() {
    $("cats").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]");
      if (!b) return;
      estado.cat = b.dataset.cat;
      estado.sub = "";
      desenharCategorias();
      desenharGrade();
    });
    $("subs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sub]");
      if (!b) return;
      estado.sub = b.dataset.sub;
      desenharCategorias();
      desenharGrade();
    });
    // Duas caixas de busca (a grande do topo e a pequena fixa) sempre com o mesmo texto
    let espera;
    ["busca", "buscaMini"].forEach((id) => {
      $(id).addEventListener("input", (e) => {
        const outra = id === "busca" ? "buscaMini" : "busca";
        $(outra).value = e.target.value;
        clearTimeout(espera);
        espera = setTimeout(() => {
          estado.busca = e.target.value;
          if (estado.busca.trim()) { estado.cat = "todos"; estado.sub = ""; desenharCategorias(); }
          desenharGrade();
          if (id === "buscaMini") window.scrollTo({ top: $("temas").offsetTop - 150, behavior: "smooth" });
        }, 150);
      });
      $(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.target.blur(); window.scrollTo({ top: $("temas").offsetTop - 150, behavior: "smooth" }); }
      });
    });
    // A busca pequena aparece quando a grande sai da tela
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entrada]) => { $("buscaMiniCaixa").hidden = entrada.isIntersecting; })
        .observe(document.querySelector(".hero .busca"));
    } else {
      $("buscaMiniCaixa").hidden = false;
    }
    $("grade").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tema]");
      if (b) abrirTema(b.dataset.tema);
    });
    $("fechar").addEventListener("click", () => fecharTema());
    $("fundo").addEventListener("click", (e) => { if (e.target === e.currentTarget) fecharTema(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && estado.aberto) fecharTema(); });
    $("niveis").addEventListener("click", (e) => {
      const b = e.target.closest("[data-nivel]");
      if (!b) return;
      estado.nivel = b.dataset.nivel;
      escolherModalidadePadrao();
      desenharTema();
    });
    $("modalidades").addEventListener("click", (e) => {
      const b = e.target.closest("[data-mod]");
      if (!b || b.disabled) return;
      estado.modalidade = b.dataset.mod;
      desenharTema();
    });
    $("adicionais").addEventListener("change", (e) => {
      const id = e.target.dataset.extra;
      if (!id) return;
      if (e.target.checked) estado.extras.add(id); else estado.extras.delete(id);
      desenharTema();
    });
    $("quero").addEventListener("click", quero);
    $("compartilhar").addEventListener("click", compartilhar);
    window.addEventListener("popstate", lerRota);
    window.addEventListener("hashchange", lerRota);
  }

  /* ---------- início ---------- */
  (async function iniciar() {
    try {
      await carregar();
    } catch (e) {
      console.error(e);
      $("grade").innerHTML = `<li class="vazio">Não conseguimos carregar o catálogo. Atualize a página.</li>`;
      return;
    }
    preencherTextos();
    desenharCategorias();
    desenharGrade();
    desenharKits();
    ligarEventos();
    lerRota();
  })();
})();
