// Decorize — Post do dia (painel) | TF Solutions
// A Renata escolhe um modelo e os temas; o painel monta as imagens (grupos ou status)
// e o texto com os links, puxando as datas livres da agenda.
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const P = () => window.Painel;
  const FORMATOS = { grupo: { w: 1080, h: 1350, porImagem: 6 }, status: { w: 1080, h: 1920, porImagem: 6 } };
  const MODELOS = {
    destaque: { rotulo: "⭐ Mais pedidos", titulo: "Temas mais pedidos", sub: "Escolha o seu e garanta a data!" },
    novidades: { rotulo: "🆕 Novidades", titulo: "Novidades na Decorize", sub: "Temas novos para a sua festa" },
    datas: { rotulo: "📅 Datas livres", titulo: "Ainda temos datas livres!", sub: "Temas disponíveis para os próximos fins de semana" },
    formatura: { rotulo: "🎓 Formaturas", titulo: "Temas para formatura", sub: "Celebre a conquista com uma mesa linda" },
    livre: { rotulo: "✍️ Do meu jeito", titulo: "Monte a sua festa", sub: "Kits pegue e monte e decorações completas" },
  };

  const st = { modelo: "destaque", formato: "grupo", escolhidos: [], preco: true, datas: true, cat: "", busca: "", desenhando: 0, ligado: false };
  // fotos extras: kits fora do catálogo ou artes prontas que a Renata inclui (ficam em configuracoes/postExtra-<id>)
  const ex = { lista: [], sel: new Set(), excluindo: null, gerada: true, carregou: false };

  const idDe = (t) => t.id || t.docId;
  const temas = () => P().d.temas.filter((t) => t.ativo !== false);
  const menorPreco = () => { const v = P().d.combos.map(precoInicial).filter((x) => x > 0); return v.length ? Math.min(...v) : 0; };
  const siteBase = () => String(P().d.config.enderecoSite || new URL("index.html", location.href).href).replace(/#.*$/, "");

  /* ---------- modelo escolhido → temas sugeridos ---------- */
  function aplicarModelo(chave) {
    st.modelo = chave;
    const m = MODELOS[chave];
    $("pdTitulo").value = m.titulo;
    $("pdSub").value = m.sub;
    let lista = [];
    if (chave === "destaque") lista = temas().filter((t) => t.destaque);
    if (chave === "novidades") lista = temas().filter((t) => t.novo);
    if (chave === "formatura") lista = temas().filter((t) => (t.categorias || []).includes("formatura"));
    if (chave === "datas") {
      const livres = window.Agenda ? window.Agenda.datasLivres(1) : [];
      lista = temas().filter((t) => t.destaque || t.novo);
      st.datas = true;
      $("pdDatas").checked = true;
      if (!livres.length) P().toast("A agenda não tem fim de semana livre nos próximos dias.");
    }
    if (!lista.length) lista = temas().filter((t) => t.destaque);
    st.escolhidos = lista.slice(0, 6).map(idDe);
    desenharModelos();
    desenharEscolha();
    gerar();
  }

  function desenharModelos() {
    $("pdModelos").innerHTML = Object.entries(MODELOS).map(([k, m]) =>
      `<button type="button" data-modelo="${k}" aria-pressed="${st.modelo === k}">${m.rotulo}</button>`).join("");
  }

  /* ---------- escolha dos temas ---------- */
  function desenharEscolha() {
    const termo = semAcento(st.busca.trim());
    $("pdCats").innerHTML = [`<button type="button" data-pdcat="" aria-pressed="${!st.cat}">Todos</button>`]
      .concat(P().d.categorias.map((c) => `<button type="button" data-pdcat="${c.id}" aria-pressed="${st.cat === c.id}">${c.emoji} ${escaparHtml(c.nome)}</button>`)).join("");
    const lista = temas()
      .filter((t) => !st.cat || (t.categorias || []).includes(st.cat))
      .filter((t) => !termo || semAcento(`${t.nome} ${t.sub}`).includes(termo));
    $("pdTemas").innerHTML = lista.map((t) => {
      const pos = st.escolhidos.indexOf(idDe(t));
      const capa = fotoCapa(t);
      return `<button type="button" class="pd-tema${pos >= 0 ? " on" : ""}" data-pdtema="${escaparHtml(idDe(t))}">
        ${capa ? `<img src="${escaparHtml(capa)}" alt="">` : `<span class="sem">🎈</span>`}
        ${pos >= 0 ? `<b class="pd-n">${pos + 1}</b>` : ""}
        <span>${escaparHtml(t.nome)}</span>
      </button>`;
    }).join("") || `<p class="vazio-adm">Nenhum tema encontrado.</p>`;
    $("pdQtd").textContent = st.escolhidos.length
      ? `${st.escolhidos.length} ${st.escolhidos.length === 1 ? "tema escolhido" : "temas escolhidos"} · ${Math.ceil(st.escolhidos.length / FORMATOS[st.formato].porImagem)} imagem(ns)`
      : "Toque nos temas para colocar no post";
  }

  /* ---------- desenho ---------- */
  function carregar(src) {
    return new Promise((ok) => {
      if (!src) { ok(null); return; }
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ok(null);
      i.src = src;
    });
  }
  function cobrir(ctx, img, x, y, w, h, r) {
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    if (img) { const e = Math.max(w / img.width, h / img.height); ctx.drawImage(img, x + (w - img.width * e) / 2, y + (h - img.height * e) / 2, img.width * e, img.height * e); }
    else { ctx.fillStyle = "#fff1e5"; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
  function encaixar(ctx, texto, max, tam, peso, familia) {
    let t = tam;
    do { ctx.font = `${peso} ${t}px ${familia}`; t -= 2; } while (ctx.measureText(texto).width > max && t > 14);
  }

  async function desenharPagina(cv, itens, pagina, total) {
    const F = FORMATOS[st.formato];
    cv.width = F.w; cv.height = F.h;
    const ctx = cv.getContext("2d");
    const W = F.w, H = F.h, status = st.formato === "status";

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#ff8a26"); g.addColorStop(0.55, "#fe7000"); g.addColorStop(1, "#e65f00");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    [[80, 70, 120], [W - 50, H - 110, 170], [W - 150, 110, 40]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });

    const logo = await carregar("assets/logo.png");
    if (logo) cobrir(ctx, logo, 60, 50, 88, 88, 20);
    ctx.fillStyle = "#fff"; ctx.font = "800 40px Poppins, sans-serif"; ctx.fillText(P().d.config.nomeLoja, 166, 102);
    ctx.font = "700 24px Nunito, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText(`@${P().d.config.instagram}`, 168, 132);
    if (total > 1) { ctx.textAlign = "right"; ctx.font = "800 26px Nunito, sans-serif"; ctx.fillText(`${pagina}/${total}`, W - 60, 102); ctx.textAlign = "left"; }

    // título
    let y = status ? 260 : 222;
    ctx.fillStyle = "#fff";
    encaixar(ctx, $("pdTitulo").value || " ", W - 120, status ? 76 : 64, 800, "Poppins, sans-serif");
    ctx.fillText($("pdTitulo").value, 60, y);
    if ($("pdSub").value) {
      encaixar(ctx, $("pdSub").value, W - 120, 32, 700, "Nunito, sans-serif");
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.fillText($("pdSub").value, 60, y + 50);
    }

    // grade de temas
    const topo = y + (status ? 110 : 90);
    const livres = st.datas && window.Agenda ? window.Agenda.datasLivres(status ? 6 : 4) : [];
    const rodape = (livres.length ? 120 : 0) + (st.preco && menorPreco() ? 0 : 0) + (status ? 260 : 190);
    const area = H - topo - rodape;
    const n = itens.length;
    const cols = n <= 1 ? 1 : 2;
    const rows = Math.ceil(n / cols) || 1;
    const gap = 18;
    const w = (W - 120 - gap * (cols - 1)) / cols;
    const h = (area - gap * (rows - 1)) / rows;
    const imgs = await Promise.all(itens.map((t) => carregar(fotoCapa(t))));
    itens.forEach((t, i) => {
      // o último sozinho numa linha fica centralizado
      const sozinho = cols === 2 && n % 2 === 1 && i === n - 1;
      const x = sozinho ? (W - w) / 2 : 60 + (i % cols) * (w + gap);
      const yy = topo + Math.floor(i / cols) * (h + gap);
      cobrir(ctx, imgs[i], x, yy, w, h, 24);
      const faixa = Math.min(92, h * 0.3);
      const gr = ctx.createLinearGradient(0, yy + h - faixa - 40, 0, yy + h);
      gr.addColorStop(0, "rgba(40,20,8,0)"); gr.addColorStop(1, "rgba(40,20,8,.85)");
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, yy, w, h, 24); ctx.clip();
      ctx.fillStyle = gr; ctx.fillRect(x, yy + h - faixa - 40, w, faixa + 40); ctx.restore();
      ctx.fillStyle = "#fff";
      encaixar(ctx, t.nome, w - 40, n <= 2 ? 44 : 34, 800, "Poppins, sans-serif");
      ctx.fillText(t.nome, x + 20, yy + h - (t.sub ? 50 : 24));
      if (t.sub) { ctx.font = "800 22px Nunito, sans-serif"; ctx.fillStyle = "#ffd9b8"; ctx.fillText(String(t.sub).toUpperCase(), x + 20, yy + h - 20); }
    });

    // rodapé
    let yp = H - rodape + 54;
    if (livres.length) {
      ctx.font = "800 28px Nunito, sans-serif"; ctx.fillStyle = "#fff";
      ctx.fillText("📅 Datas livres:", 60, yp);
      let x = 60, yy = yp + 18;
      ctx.font = "800 26px Nunito, sans-serif";
      livres.forEach((d) => {
        const lw = ctx.measureText(d).width + 34;
        if (x + lw > W - 60) { x = 60; yy += 56; }
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(x, yy, lw, 46, 23); ctx.fill();
        ctx.fillStyle = "#d65c00"; ctx.fillText(d, x + 17, yy + 32);
        x += lw + 10;
      });
      yp = yy + 46 + 60;
    }
    const preco = menorPreco();
    yp = Math.max(yp, H - (status ? 170 : 110));
    if (st.preco && preco) {
      ctx.font = "800 32px Poppins, sans-serif";
      const t = `Kits a partir de ${formatarMoeda(preco)}`;
      const lw = ctx.measureText(t).width + 52;
      ctx.fillStyle = "#3b2314"; ctx.beginPath(); ctx.roundRect(60, yp - 44, lw, 72, 36); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText(t, 86, yp + 3);
    }
    ctx.textAlign = "right"; ctx.fillStyle = "#fff";
    ctx.font = "800 28px Nunito, sans-serif"; ctx.fillText("Todos os temas no link 👉", W - 60, yp - 8);
    ctx.font = "700 24px Nunito, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText(P().d.config.cidade, W - 60, yp + 26);
    ctx.textAlign = "left";
  }

  async function gerar() {
    const id = ++st.desenhando;
    const escolhidos = st.escolhidos.map((x) => temas().find((t) => idDe(t) === x)).filter(Boolean);
    const por = FORMATOS[st.formato].porImagem;
    const paginas = [];
    for (let i = 0; i < Math.max(1, escolhidos.length); i += por) paginas.push(escolhidos.slice(i, i + por));
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* segue */ } }
    const canvases = [];
    for (let i = 0; i < paginas.length; i++) {
      const cv = document.createElement("canvas");
      await desenharPagina(cv, paginas[i], i + 1, paginas.length);
      if (id !== st.desenhando) return;
      canvases.push(cv);
    }
    $("pdPrevia").replaceChildren(...canvases);
    $("pdTexto").value = texto(escolhidos);
    $("pdErro").hidden = true;
  }

  function texto(lista) {
    const c = P().d.config;
    const linhas = [`✨ *${$("pdTitulo").value}*`];
    if ($("pdSub").value) linhas.push($("pdSub").value);
    linhas.push("");
    lista.forEach((t) => linhas.push(`🎈 ${t.nome}: ${siteBase()}#tema/${encodeURIComponent(idDe(t))}`));
    const livres = st.datas && window.Agenda ? window.Agenda.datasLivres(6) : [];
    if (livres.length) linhas.push("", `📅 Datas livres: ${livres.join(", ")}`);
    if (st.preco && menorPreco()) linhas.push(`📦 Kits a partir de ${formatarMoeda(menorPreco())} (pegue e monte ou com montagem)`);
    linhas.push("", `👉 Todos os temas: ${siteBase()}`, `📍 ${c.cidade}`);
    return linhas.join("\n");
  }

  /* ---------- fotos e posts extras ---------- */
  async function carregarExtras() {
    try {
      const docs = await Dados.listar("configuracoes");
      ex.lista = docs.filter((x) => x.tipo === "postExtra").sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
      ex.sel = new Set([...ex.sel].filter((id) => ex.lista.some((x) => x.docId === id)));
    } catch (e) { console.warn("fotos extras:", e.message); }
    ex.carregou = true;
    desenharExtras();
  }

  function desenharExtras() {
    const excl = ex.excluindo !== null;
    $("pdExtras").innerHTML = ex.lista.length ? ex.lista.map((x) => {
      const cls = excl ? (ex.excluindo.has(x.docId) ? " marcado" : "") : (ex.sel.has(x.docId) ? " on" : "");
      return `<button type="button" class="pd-extra${cls}" data-extra="${escaparHtml(x.docId)}" aria-pressed="${excl ? ex.excluindo.has(x.docId) : ex.sel.has(x.docId)}">
        <img src="${x.imagem}" alt="Foto extra" loading="lazy"><i>${excl ? "🗑" : "✓"}</i></button>`;
    }).join("") : `<button type="button" class="pd-extra-vazio" data-extra-incluir>📷 Nenhuma foto extra ainda. Toque para incluir</button>`;
    $("pdExtraExcluir").hidden = excl || !ex.lista.length;
    $("pdExtraIncluir").hidden = excl;
    $("pdExcluirBarra").hidden = !excl;
    $("pdExcluirOk").textContent = `Excluir selecionadas${excl && ex.excluindo.size ? ` (${ex.excluindo.size})` : ""}`;
    $("pdExtrasAjuda").textContent = excl
      ? "Toque nas fotos que você não quer mais e depois em Excluir selecionadas."
      : "Tem um kit ou montagem que não está no catálogo, ou uma arte feita no Canva? Inclua a foto aqui e toque nela para mandar junto hoje.";
  }

  // reduz a foto (lado maior 1440px, JPEG) para caber no banco e carregar rápido
  function reduzir(arquivo) {
    return new Promise((ok, erro) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const esc = Math.min(1, 1440 / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * esc); cv.height = Math.round(img.height * esc);
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        let q = 0.85, dados = cv.toDataURL("image/jpeg", q);
        while (dados.length > 600000 && q > 0.4) { q -= 0.1; dados = cv.toDataURL("image/jpeg", q); }
        ok(dados);
      };
      img.onerror = () => { URL.revokeObjectURL(url); erro(new Error("não é uma imagem")); };
      img.src = url;
    });
  }

  async function incluirExtras(arquivosEscolhidos) {
    const lista = [...arquivosEscolhidos].filter((f) => f.type.startsWith("image/"));
    if (!lista.length) { P().toast("Escolha uma imagem (foto ou arte)."); return; }
    P().toast(lista.length > 1 ? `Incluindo ${lista.length} fotos…` : "Incluindo a foto…");
    let ok = 0;
    for (const f of lista) {
      try {
        const imagem = await reduzir(f);
        const id = `postExtra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const doc = { tipo: "postExtra", imagem, criadoEm: Date.now() };
        await Dados.salvar("configuracoes", id, doc);
        ex.lista.unshift({ ...doc, docId: id });
        ex.sel.add(id); // acabou de incluir → já vai junto hoje
        ok++;
      } catch (e) { P().toast(`Não consegui incluir ${f.name}.`); }
    }
    if (ok) P().toast(ok > 1 ? `${ok} fotos incluídas e marcadas para hoje.` : "Foto incluída e marcada para hoje.");
    desenharExtras();
  }

  async function excluirSelecionadas() {
    if (!ex.excluindo || !ex.excluindo.size) { P().toast("Toque nas fotos que quer excluir."); return; }
    const n = ex.excluindo.size;
    if (!confirm(`Excluir ${n === 1 ? "esta foto" : `estas ${n} fotos`}? Elas saem do painel e não dá para desfazer.`)) return;
    try {
      for (const id of ex.excluindo) await Dados.excluir("configuracoes", id);
      ex.lista = ex.lista.filter((x) => !ex.excluindo.has(x.docId));
      ex.excluindo.forEach((id) => ex.sel.delete(id));
      ex.excluindo = null;
      P().toast(n > 1 ? `${n} fotos excluídas.` : "Foto excluída.");
      desenharExtras();
    } catch (e) { P().toast("Não consegui excluir agora. Tente de novo."); }
  }

  /* ---------- exportar ---------- */
  const dia = () => diaISO(new Date());
  const geradas = () => Promise.all([...$("pdPrevia").querySelectorAll("canvas")].map((cv, i) => new Promise((ok, erro) => {
    try { cv.toBlob((b) => (b ? ok(new File([b], `decorize-post-${dia()}-${i + 1}.jpg`, { type: "image/jpeg" })) : erro(new Error("vazio"))), "image/jpeg", 0.9); }
    catch (e) { erro(e); }
  })));
  const extrasEscolhidas = () => Promise.all(ex.lista.filter((x) => ex.sel.has(x.docId)).map(async (x, i) => {
    const b = await (await fetch(x.imagem)).blob();
    return new File([b], `decorize-extra-${dia()}-${i + 1}.jpg`, { type: "image/jpeg" });
  }));
  async function arquivos() {
    const lista = [...(ex.gerada ? await geradas() : []), ...await extrasEscolhidas()];
    if (!lista.length) throw new Error("nada");
    return lista;
  }
  const nadaEscolhido = () => !ex.gerada && !ex.lista.some((x) => ex.sel.has(x.docId));
  function erroExportar() {
    $("pdErro").textContent = "O navegador bloqueou a imagem porque o painel foi aberto direto do computador. Pelo link publicado (GitHub Pages) funciona.";
    $("pdErro").hidden = false;
  }

  function ligar() {
    if (st.ligado) return;
    st.ligado = true;
    $("pdModelos").addEventListener("click", (e) => { const b = e.target.closest("[data-modelo]"); if (b) aplicarModelo(b.dataset.modelo); });
    $("pdCats").addEventListener("click", (e) => { const b = e.target.closest("[data-pdcat]"); if (b) { st.cat = b.dataset.pdcat; desenharEscolha(); } });
    $("pdBusca").addEventListener("input", (e) => { st.busca = e.target.value; desenharEscolha(); });
    $("pdTemas").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pdtema]");
      if (!b) return;
      const id = b.dataset.pdtema;
      st.escolhidos = st.escolhidos.includes(id) ? st.escolhidos.filter((x) => x !== id) : [...st.escolhidos, id];
      desenharEscolha();
      gerar();
    });
    $("pdLimpar").addEventListener("click", () => { st.escolhidos = []; desenharEscolha(); gerar(); });
    let espera;
    ["pdTitulo", "pdSub"].forEach((id) => $(id).addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(gerar, 250); }));
    $("pdPreco").addEventListener("change", (e) => { st.preco = e.target.checked; gerar(); });
    $("pdDatas").addEventListener("change", (e) => { st.datas = e.target.checked; gerar(); });
    $("pdFormatos").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pdformato]");
      if (!b) return;
      st.formato = b.dataset.pdformato;
      document.querySelectorAll("#pdFormatos button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      desenharEscolha();
      gerar();
    });
    $("pdExtraIncluir").addEventListener("click", () => $("pdArquivo").click());
    $("pdArquivo").addEventListener("change", (e) => { incluirExtras(e.target.files); e.target.value = ""; });
    $("pdExtraExcluir").addEventListener("click", () => { ex.excluindo = new Set(); desenharExtras(); });
    $("pdExcluirCancelar").addEventListener("click", () => { ex.excluindo = null; desenharExtras(); });
    $("pdExcluirOk").addEventListener("click", excluirSelecionadas);
    $("pdGerada").addEventListener("change", (e) => { ex.gerada = e.target.checked; });
    $("pdExtras").addEventListener("click", (e) => {
      if (e.target.closest("[data-extra-incluir]")) { $("pdArquivo").click(); return; }
      const b = e.target.closest("[data-extra]");
      if (!b) return;
      const id = b.dataset.extra;
      const alvo = ex.excluindo || ex.sel;
      if (alvo.has(id)) alvo.delete(id); else alvo.add(id);
      desenharExtras();
    });
    $("pdBaixar").addEventListener("click", async () => {
      if (nadaEscolhido()) { P().toast("Marque uma foto extra ou a imagem montada pelo painel."); return; }
      try {
        for (const f of await arquivos()) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(f); a.download = f.name;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        }
      } catch (e) { erroExportar(); }
    });
    $("pdCopiar").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("pdTexto").value); P().toast("Texto copiado!"); }
      catch (e) { $("pdTexto").select(); P().toast("Selecionei o texto: é só copiar."); }
    });
    $("pdEnviar").addEventListener("click", async () => {
      const txt = $("pdTexto").value;
      if (nadaEscolhido()) { P().toast("Marque uma foto extra ou a imagem montada pelo painel."); return; }
      try {
        const fs = await arquivos();
        if (navigator.canShare && navigator.canShare({ files: fs })) { await navigator.share({ files: fs, text: txt }); return; }
      } catch (e) { /* manda só o texto */ }
      window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank", "noopener");
    });
  }

  function aoAbrir() {
    if (!P() || !$("pdModelos")) return;
    ligar();
    if (!ex.carregou) carregarExtras();
    if (!$("pdTitulo").value) aplicarModelo(st.modelo);
    else { desenharModelos(); desenharEscolha(); gerar(); }
  }

  document.addEventListener("aba", (e) => { if (e.detail === "post-dia") aoAbrir(); });
})();
