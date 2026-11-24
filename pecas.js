// Decorize — Controle das peças (painel) | TF Solutions
// Capas, painéis, pelúcias e acessórios: o que está ok, em manutenção, danificado ou perdido.
// Temas com peça fora de uso aparecem com aviso na agenda.
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const P = () => window.Painel;
  const SITUACOES = {
    ok: { nome: "Em uso", emoji: "✅" },
    manutencao: { nome: "Em manutenção", emoji: "🧵" },
    danificada: { nome: "Danificada", emoji: "⚠️" },
    perdida: { nome: "Perdida", emoji: "❓" },
  };
  const pc = { filtro: "fora", tema: "", busca: "", editando: null, foto: "", importar: [] };
  const NOME_KIT = { bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante" };

  const pecas = () => (P().d.pecas || []);
  const nomeTema = (id) => (id ? ((P().d.temas.find((t) => (t.id || t.docId) === id) || {}).nome || "Tema removido") : "Peça geral (vários temas)");
  const situacao = (x) => (SITUACOES[x.situacao] ? x.situacao : "ok");

  const idDe = (x) => x.id || x.docId;
  /** Quantas unidades da peça vão numa festa (o acervo pode ter mais, para festas ao mesmo tempo). */
  const porFesta = (x) => Math.max(1, Math.min(Number(x.porFesta) || 1, Number(x.quantidade) || 1));
  const kitsDa = (x) => (Array.isArray(x.kits) && x.kits.length ? x.kits : NIVEIS);
  const fimDe = (e) => (e.devolucao && e.devolucao >= e.data ? e.devolucao : e.data);
  const dataBr = (iso) => String(iso || "").split("-").reverse().slice(0, 2).join("/");

  /** Peças que já vêm marcadas num evento: as do tema que entram naquele kit. */
  function padraoDoEvento(temaId, kitId) {
    if (!temaId) return [];
    return pecas().filter((x) => x.temaId === temaId && (!kitId || kitsDa(x).includes(kitId)))
      .map((x) => ({ id: idDe(x), qtd: porFesta(x) }));
  }

  /** Peças de um evento (eventos antigos, sem a lista salva, usam as do tema). */
  function pecasDoEvento(e) {
    return Array.isArray(e.pecas) ? e.pecas : padraoDoEvento(e.temaId, e.kitId);
  }

  /**
   * Para cada peça pedida no evento: quantas existem, quantas já estão reservadas em outros
   * eventos com datas que se cruzam (da retirada à devolução) e quantas faltam.
   * Não bloqueia nada: serve para avisar a tempo de comprar ou repor.
   */
  function disponibilidade(e, lista = pecasDoEvento(e)) {
    const outros = (P().d.eventos || []).filter((o) => o.id !== e.id && o.status !== "cancelado"
      && o.data && e.data && o.data <= fimDe(e) && e.data <= fimDe(o));
    return lista.map((item) => {
      const peca = pecas().find((x) => idDe(x) === item.id);
      if (!peca) return null;
      const total = situacao(peca) === "ok" ? Math.max(1, Number(peca.quantidade) || 1) : 0;
      const usos = outros.map((o) => ({ o, qtd: (pecasDoEvento(o).find((y) => y.id === item.id) || {}).qtd || 0 })).filter((u) => u.qtd > 0);
      const reservado = usos.reduce((s, u) => s + u.qtd, 0);
      const falta = Math.max(0, item.qtd - (total - reservado));
      return { peca, qtd: item.qtd, total, reservado, falta, usos };
    }).filter(Boolean);
  }

  function textoFalta(d) {
    const onde = d.usos.map((u) => `${u.o.cliente || u.o.temaNome || "evento"} ${dataBr(u.o.data)}`).join(", ");
    if (situacao(d.peca) !== "ok") return `fora de uso (${SITUACOES[situacao(d.peca)].nome.toLowerCase()})`;
    return `${d.falta === 1 ? "falta 1" : `faltam ${d.falta}`}: ${d.total} no acervo${d.reservado ? `, ${d.reservado} reservada${d.reservado > 1 ? "s" : ""} (${onde})` : ""}`;
  }

  /** Peças que faltam num evento (para o aviso vermelho na agenda). */
  function faltas(e) {
    return disponibilidade(e).filter((d) => d.falta > 0);
  }

  /** Peças fora de uso de um tema (para avisar na agenda). */
  function foraDeUso(temaId) {
    if (!temaId) return [];
    return pecas().filter((x) => x.temaId === temaId && situacao(x) !== "ok");
  }

  function desenhar() {
    if (!P() || !$("pcLista")) return;
    const todas = pecas();
    const conta = (s) => todas.filter((x) => situacao(x) === s).length;
    $("pcResumo").innerHTML = Object.entries(SITUACOES).map(([k, v]) =>
      `<button type="button" data-pcfiltro="${k}" aria-pressed="${pc.filtro === k}" class="pc-${k}"><small>${v.emoji} ${v.nome}</small><b>${conta(k)}</b></button>`).join("") +
      `<button type="button" data-pcfiltro="fora" aria-pressed="${pc.filtro === "fora"}" class="pc-fora"><small>🔧 Fora de uso</small><b>${todas.filter((x) => situacao(x) !== "ok").length}</b></button>`;

    const atual = $("pcTema").value;
    $("pcTema").innerHTML = `<option value="">Todos os temas</option><option value="geral">Peças gerais</option>` +
      [...P().d.temas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((t) => `<option value="${escaparHtml(t.id || t.docId)}">${escaparHtml(t.nome)}</option>`).join("");
    $("pcTema").value = atual;

    const termo = semAcento(pc.busca.trim());
    const lista = todas
      .filter((x) => pc.filtro === "todas" || (pc.filtro === "fora" ? situacao(x) !== "ok" : situacao(x) === pc.filtro))
      .filter((x) => !pc.tema || (pc.tema === "geral" ? !x.temaId : x.temaId === pc.tema))
      .filter((x) => !termo || semAcento(`${x.nome} ${nomeTema(x.temaId)} ${x.obs}`).includes(termo))
      .sort((a, b) => nomeTema(a.temaId).localeCompare(nomeTema(b.temaId), "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));

    if (!lista.length) {
      $("pcLista").innerHTML = `<p class="vazio-adm">${pc.filtro === "fora" ? "Tudo em ordem: nenhuma peça fora de uso. 🎉" : "Nenhuma peça encontrada."}</p>`;
      return;
    }
    $("pcLista").innerHTML = lista.map((x) => {
      const t = P().d.temas.find((tt) => (tt.id || tt.docId) === x.temaId);
      const capa = x.foto || (t ? fotoCapa(t) : "");
      const st = situacao(x);
      const quando = x.atualizadoEm ? new Date(x.atualizadoEm).toLocaleDateString("pt-BR") : "";
      return `<div class="pc-linha pc-${st}">
        ${capa ? `<img src="${escaparHtml(capa)}" alt="">` : `<span class="sem">🧰</span>`}
        <div>
          <h3>${escaparHtml(x.nome)} ${Number(x.quantidade) > 1 ? `<small>× ${Number(x.quantidade)} no acervo${porFesta(x) > 1 ? ` · ${porFesta(x)} por festa` : ""}</small>` : ""}</h3>
          <p>${escaparHtml(nomeTema(x.temaId))}${Number(x.valorReposicao) > 0 ? ` · reposição ${formatarMoeda(x.valorReposicao)}` : ""}${quando ? ` · atualizado em ${quando}` : ""}</p>
          ${x.descricao ? `<p class="pc-desc">${escaparHtml(x.descricao)}</p>` : ""}
          ${x.obs ? `<p class="pc-obs">📝 ${escaparHtml(x.obs)}</p>` : ""}
        </div>
        <div class="pc-acoes">
          <select class="entrada" data-pcsit="${escaparHtml(x.id || x.docId)}" aria-label="Situação">
            ${Object.entries(SITUACOES).map(([k, v]) => `<option value="${k}" ${k === st ? "selected" : ""}>${v.emoji} ${v.nome}</option>`).join("")}
          </select>
          <button class="btn btn-claro" data-pceditar="${escaparHtml(x.id || x.docId)}">Editar</button>
        </div>
      </div>`;
    }).join("");
  }

  /* ---------- editor ---------- */
  function abrir(x, padrao = {}) {
    pc.editando = x || null;
    const v = { quantidade: 1, situacao: "ok", temaId: "", nome: "", obs: "", descricao: "", valorReposicao: 0, foto: "", kits: NIVEIS, ...padrao, ...(x || {}) };
    const f = $("pcForm");
    f.reset();
    $("pcEditorTitulo").textContent = x ? "Editar peça" : "Nova peça";
    f.temaId.innerHTML = `<option value="">Peça geral (vários temas)</option>` +
      [...P().d.temas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((t) => `<option value="${escaparHtml(t.id || t.docId)}">${escaparHtml(t.nome)}</option>`).join("");
    f.nome.value = v.nome; f.temaId.value = v.temaId; f.quantidade.value = v.quantidade; f.situacao.value = v.situacao; f.obs.value = v.obs;
    f.descricao.value = v.descricao || "";
    f.porFesta.value = Math.max(1, Number(v.porFesta) || 1);
    f.valorReposicao.value = P().valorCampo(v.valorReposicao);
    const kits = Array.isArray(v.kits) && v.kits.length ? v.kits : NIVEIS;
    $("pcKits").innerHTML = NIVEIS.map((n) => {
      const nome = ((P().d.combos.find((c) => c.id === n) || {}).nome || `Kit ${NOME_KIT[n]}`);
      return `<label><input type="checkbox" value="${n}" ${kits.includes(n) ? "checked" : ""}> ${escaparHtml(nome)}</label>`;
    }).join("");
    pc.foto = v.foto || "";
    desenharFoto();
    $("pcExcluir").hidden = !x;
    $("pcEditor").hidden = false;
    document.body.classList.add("travado");
    setTimeout(() => (v.nome ? f.obs : f.nome).focus(), 50);
  }
  function fechar() { $("pcEditor").hidden = true; document.body.classList.remove("travado"); }

  async function salvar(ev) {
    ev.preventDefault();
    const f = $("pcForm");
    const nome = f.nome.value.trim();
    if (!nome) { P().toast("Dê um nome para a peça."); return; }
    const id = pc.editando ? pc.editando.id || pc.editando.docId : `pc${Date.now().toString(36)}`;
    const kits = [...$("pcKits").querySelectorAll("input:checked")].map((i) => i.value);
    await Dados.salvar("pecas", id, {
      id, nome, temaId: f.temaId.value,
      quantidade: Math.max(1, Math.round(Number(f.quantidade.value) || 1)),
      situacao: f.situacao.value, obs: f.obs.value.trim(), atualizadoEm: new Date().toISOString(),
      descricao: f.descricao.value.trim(), valorReposicao: P().numero(f.valorReposicao.value),
      porFesta: Math.max(1, Math.round(Number(f.porFesta.value) || 1)),
      foto: pc.foto || "", kits: kits.length ? kits : NIVEIS,
    });
    fechar();
    await P().recarregar();
    P().toast(pc.editando ? "Peça atualizada." : "Peça cadastrada.");
  }

  function desenharFoto() {
    $("pcFotoPrevia").innerHTML = pc.foto ? `<img src="${escaparHtml(pc.foto)}" alt="">` : "📷<small>foto</small>";
    $("pcTirarFoto").hidden = !pc.foto;
  }

  /* ---------- importar planilha (colar do Excel ou arquivo .csv) ---------- */
  const COLUNAS_IMPORT = {
    nome: ["peca", "nome", "item", "produto", "material", "descricao da peca"],
    quantidade: ["quantidade", "qtd", "qtde", "quant", "estoque"],
    valorReposicao: ["valor de reposicao", "reposicao", "valor", "preco", "custo"],
    tema: ["tema"],
    descricao: ["descricao", "detalhe", "detalhes", "observacao", "obs"],
  };

  function lerTabela(texto) {
    const linhas = String(texto || "").replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (linhas.length < 2) return [];
    const sep = linhas[0].includes("\t") ? "\t" : (linhas[0].split(";").length >= linhas[0].split(",").length ? ";" : ",");
    const partir = (l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const cab = partir(linhas[0]).map((c) => semAcento(c).trim());
    const col = {};
    // primeiro o título exato, depois o que contém a palavra (ex.: "Descrição" não vira "nome")
    Object.entries(COLUNAS_IMPORT).forEach(([campo, nomes]) => {
      let i = cab.findIndex((c) => nomes.includes(c));
      if (i < 0) i = cab.findIndex((c, j) => !Object.values(col).includes(j) && nomes.some((n) => c.includes(n)));
      if (i >= 0 && !Object.values(col).includes(i)) col[campo] = i;
    });
    if (col.nome === undefined) return [];
    const numero = (v) => P().numero(String(v || "").replace(/[^\d,.-]/g, ""));
    return linhas.slice(1).map(partir).map((c) => {
      const temaTxt = col.tema !== undefined ? c[col.tema] : "";
      const tema = temaTxt ? P().d.temas.find((t) => semAcento(t.nome) === semAcento(temaTxt)) : null;
      return {
        nome: (c[col.nome] || "").trim(),
        quantidade: Math.max(1, Math.round(numero(col.quantidade !== undefined ? c[col.quantidade] : 1)) || 1),
        valorReposicao: col.valorReposicao !== undefined ? numero(c[col.valorReposicao]) : 0,
        descricao: col.descricao !== undefined ? (c[col.descricao] || "").trim() : "",
        temaId: tema ? tema.id || tema.docId : "",
        temaTxt, temaAchado: !temaTxt || !!tema,
      };
    }).filter((x) => x.nome);
  }

  function previaImport() {
    pc.importar = lerTabela($("pcImportTexto").value);
    const semTema = pc.importar.filter((x) => !x.temaAchado);
    $("pcImportOk").disabled = !pc.importar.length;
    $("pcImportOk").textContent = pc.importar.length ? `Importar ${pc.importar.length} peça${pc.importar.length > 1 ? "s" : ""}` : "Importar";
    $("pcImportPrevia").innerHTML = !$("pcImportTexto").value.trim() ? "" : !pc.importar.length
      ? `<p class="erro">Não achei a coluna com o nome da peça. Confira se a primeira linha tem os títulos (ex.: Peça, Quantidade, Valor de reposição).</p>`
      : `<table class="pc-previa"><tr><th>Peça</th><th>Qtd</th><th>Reposição</th><th>Tema</th></tr>${pc.importar.slice(0, 8).map((x) => `<tr><td>${escaparHtml(x.nome)}</td><td>${x.quantidade}</td><td>${x.valorReposicao ? formatarMoeda(x.valorReposicao) : "—"}</td><td>${x.temaId ? escaparHtml(nomeTema(x.temaId)) : x.temaTxt ? `<span class="erro">"${escaparHtml(x.temaTxt)}" não encontrado</span>` : "Geral"}</td></tr>`).join("")}</table>
        ${pc.importar.length > 8 ? `<p class="dica">… e mais ${pc.importar.length - 8}.</p>` : ""}
        ${semTema.length ? `<p class="dica">${semTema.length} peça(s) com tema não encontrado entram como "peça geral". Dá para ajustar depois.</p>` : ""}`;
  }

  async function importar() {
    const lista = pc.importar;
    if (!lista.length) return;
    $("pcImportOk").disabled = true;
    const agora = new Date().toISOString();
    for (const [i, x] of lista.entries()) {
      const id = `pc${Date.now().toString(36)}${i}`;
      await Dados.salvar("pecas", id, {
        id, nome: x.nome, temaId: x.temaId, quantidade: x.quantidade, valorReposicao: x.valorReposicao,
        descricao: x.descricao, situacao: "ok", obs: "", foto: "", kits: NIVEIS, porFesta: 1, atualizadoEm: agora,
      });
    }
    $("pcImport").hidden = true;
    document.body.classList.remove("travado");
    pc.filtro = "todas";
    await P().recarregar();
    P().toast(`${lista.length} peça(s) importada(s)! Agora é só colocar as fotos.`);
  }

  function ligar() {
    $("pcFotoArquivo").addEventListener("change", async (e) => {
      const arq = e.target.files && e.target.files[0];
      if (!arq) return;
      try { pc.foto = await reduzirImagem(arq, 700); desenharFoto(); } catch (err) { P().toast("Não consegui abrir essa foto."); }
      e.target.value = "";
    });
    $("pcTirarFoto").addEventListener("click", () => { pc.foto = ""; desenharFoto(); });
    $("pcImportar").addEventListener("click", () => {
      $("pcImportTexto").value = ""; previaImport();
      $("pcImport").hidden = false; document.body.classList.add("travado");
    });
    $("pcImportFechar").addEventListener("click", () => { $("pcImport").hidden = true; document.body.classList.remove("travado"); });
    $("pcImportTexto").addEventListener("input", previaImport);
    $("pcImportArquivo").addEventListener("change", (e) => {
      const arq = e.target.files && e.target.files[0];
      if (!arq) return;
      const r = new FileReader();
      r.onload = () => { $("pcImportTexto").value = String(r.result || ""); previaImport(); };
      r.readAsText(arq, "utf-8");
      e.target.value = "";
    });
    $("pcImportOk").addEventListener("click", importar);
    $("pcResumo").addEventListener("click", (e) => { const b = e.target.closest("[data-pcfiltro]"); if (b) { pc.filtro = pc.filtro === b.dataset.pcfiltro ? "todas" : b.dataset.pcfiltro; desenhar(); } });
    $("pcTodas").addEventListener("click", () => { pc.filtro = "todas"; desenhar(); });
    $("pcTema").addEventListener("change", (e) => { pc.tema = e.target.value; desenhar(); });
    $("pcBusca").addEventListener("input", (e) => { pc.busca = e.target.value; desenhar(); });
    $("pcNova").addEventListener("click", () => abrir(null));
    $("pcLista").addEventListener("change", async (e) => {
      const id = e.target.dataset.pcsit;
      if (!id) return;
      await Dados.salvar("pecas", id, { situacao: e.target.value, atualizadoEm: new Date().toISOString() });
      await P().recarregar();
      P().toast(e.target.value === "ok" ? "Peça de volta ao uso! ✅" : "Situação atualizada.");
    });
    $("pcLista").addEventListener("click", (e) => {
      const id = e.target.dataset.pceditar;
      if (id) abrir(pecas().find((x) => (x.id || x.docId) === id));
    });
    $("pcFechar").addEventListener("click", fechar);
    $("pcForm").addEventListener("submit", salvar);
    $("pcExcluir").addEventListener("click", async () => {
      if (!pc.editando || !confirm("Excluir esta peça do controle?")) return;
      await Dados.excluir("pecas", pc.editando.id || pc.editando.docId);
      fechar();
      await P().recarregar();
    });
  }

  window.Pecas = {
    foraDeUso,
    situacoes: SITUACOES,
    padraoDoEvento, pecasDoEvento, disponibilidade, faltas, textoFalta,
    lista: pecas,
    /** Abre o cadastro já preenchido a partir de um evento que voltou com problema. */
    registrarDano(evento) {
      document.querySelector('[data-aba="pecas"]').click();
      abrir(null, {
        temaId: evento.temaId || "", situacao: "danificada",
        obs: `Voltou do evento de ${evento.cliente || "cliente"} (${String(evento.data).split("-").reverse().join("/")}): `,
      });
    },
  };

  (window.PainelExtras = window.PainelExtras || []).push(desenhar);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ligar); else ligar();
})();
