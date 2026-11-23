// Decorize — painel: categorias da página inicial e vídeos das montagens | TF Solutions
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const P = () => window.Painel;

  /** Reduz a foto de capa (no máximo 900px, JPEG leve). */
  function reduzirFoto(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onerror = reject;
      leitor.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const escala = Math.min(1, 900 / Math.max(img.width, img.height));
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

  /* ---------- categorias ---------- */
  function desenharCats() {
    const { d } = P();
    const qtd = (id) => d.temas.filter((t) => (t.categorias || []).includes(id)).length;
    $("listaCatsAdm").innerHTML = d.categorias.map((c, i) => `
      <div class="cat-linha" data-cat="${escaparHtml(c.docId || c.id)}">
        <label class="cat-capa" title="Trocar foto de capa">
          ${c.capa ? `<img src="${escaparHtml(c.capa)}" alt="">` : `<span>${c.emoji || "🎈"}<small>foto de capa</small></span>`}
          <input type="file" accept="image/*" name="capa" hidden>
        </label>
        <label class="campo cat-emoji"><span>Emoji</span><input name="emoji" value="${escaparHtml(c.emoji || "")}" maxlength="4"></label>
        <label class="campo"><span>Nome</span><input name="nome" value="${escaparHtml(c.nome)}"></label>
        <div class="cat-acoes">
          <small>${qtd(c.id)} ${qtd(c.id) === 1 ? "tema" : "temas"}</small>
          <span>
            <button type="button" class="link" data-mover="-1" ${i === 0 ? "disabled" : ""} title="Subir">▲</button>
            <button type="button" class="link" data-mover="1" ${i === d.categorias.length - 1 ? "disabled" : ""} title="Descer">▼</button>
          </span>
          ${c.capa ? `<button type="button" class="link" data-tirar-capa>tirar foto</button>` : ""}
          <button type="button" class="link perigo" data-apagar-cat>excluir</button>
        </div>
      </div>`).join("");
  }

  const catDaLinha = (linha) => P().d.categorias.find((c) => (c.docId || c.id) === linha.dataset.cat);

  async function salvarCat(c, mudancas) {
    Object.assign(c, mudancas);
    await Dados.salvar("categorias", c.docId || c.id, {
      id: c.id, nome: c.nome, emoji: c.emoji || "", ordem: c.ordem || 0, capa: c.capa || "",
    });
  }

  async function reordenar() {
    const { d } = P();
    for (let i = 0; i < d.categorias.length; i++) await salvarCat(d.categorias[i], { ordem: i + 1 });
  }

  $("listaCatsAdm").addEventListener("change", async (e) => {
    const linha = e.target.closest("[data-cat]");
    if (!linha) return;
    const c = catDaLinha(linha);
    if (!c) return;
    if (e.target.name === "capa") {
      const arquivo = e.target.files && e.target.files[0];
      if (!arquivo) return;
      try {
        await salvarCat(c, { capa: await reduzirFoto(arquivo) });
        desenharCats();
        P().toast("Foto de capa salva!");
      } catch (err) { P().toast("Não consegui abrir essa foto."); }
      return;
    }
    const q = (n) => linha.querySelector(`[name="${n}"]`).value.trim();
    if (!q("nome")) { P().toast("A categoria precisa de um nome."); return; }
    await salvarCat(c, { nome: q("nome"), emoji: q("emoji") });
    P().toast("Categoria salva.");
  });

  $("listaCatsAdm").addEventListener("click", async (e) => {
    const linha = e.target.closest("[data-cat]");
    if (!linha) return;
    const c = catDaLinha(linha);
    const { d } = P();
    if (e.target.matches("[data-mover]")) {
      const i = d.categorias.indexOf(c);
      const j = i + Number(e.target.dataset.mover);
      if (j < 0 || j >= d.categorias.length) return;
      [d.categorias[i], d.categorias[j]] = [d.categorias[j], d.categorias[i]];
      await reordenar();
      desenharCats();
    } else if (e.target.matches("[data-tirar-capa]")) {
      await salvarCat(c, { capa: "" });
      desenharCats();
    } else if (e.target.matches("[data-apagar-cat]")) {
      const qtd = d.temas.filter((t) => (t.categorias || []).includes(c.id)).length;
      const aviso = qtd ? ` Os ${qtd} temas dela continuam cadastrados, mas saem desta categoria.` : "";
      if (!confirm(`Excluir a categoria "${c.nome}"?${aviso}`)) return;
      await Dados.excluir("categorias", c.docId || c.id);
      await P().recarregar();
    }
  });

  $("novaCat").addEventListener("click", async () => {
    const { d, slug } = P();
    const nome = prompt("Nome da nova categoria (ex.: Chá revelação):");
    if (!nome || !nome.trim()) return;
    let id = slug(nome.trim());
    if (d.categorias.some((c) => c.id === id)) id = `${id}-${Date.now().toString(36).slice(-3)}`;
    await Dados.salvar("categorias", id, { id, nome: nome.trim(), emoji: "🎈", ordem: d.categorias.length + 1, capa: "" });
    // garante que as categorias padrão também fiquem gravadas (no Firebase começam vazias)
    for (const c of d.categorias) if (!c.docId) await salvarCat(c, {});
    await P().recarregar();
    P().toast("Categoria criada! Marque ela nos temas.");
  });

  /* ---------- vídeos ---------- */
  const videos = () => (P().d.config.videos || []).slice();

  function desenharVideos() {
    const lista = videos();
    $("listaVideosAdm").innerHTML = lista.length ? lista.map((v, i) => `
      <div class="video-linha" data-video="${i}">
        <label class="campo"><span>Título</span><input name="titulo" value="${escaparHtml(v.titulo || "")}"></label>
        <label class="campo"><span>Detalhe (opcional)</span><input name="detalhe" value="${escaparHtml(v.detalhe || "")}"></label>
        <label class="campo"><span>Link do vídeo</span><input name="link" value="${escaparHtml(v.link || "")}" placeholder="https://www.instagram.com/reel/..."></label>
        <div class="checks"><button type="button" class="link perigo" data-apagar-video>excluir</button></div>
      </div>`).join("") : `<p class="vazio-adm">Nenhum vídeo cadastrado. A parte de vídeos fica escondida no catálogo.</p>`;
  }

  async function salvarVideos(lista) {
    await Dados.salvar("configuracoes", "geral", { videos: lista });
    P().d.config.videos = lista;
  }

  $("listaVideosAdm").addEventListener("change", async (e) => {
    const linha = e.target.closest("[data-video]");
    if (!linha) return;
    const lista = videos();
    const q = (n) => linha.querySelector(`[name="${n}"]`).value.trim();
    lista[Number(linha.dataset.video)] = { titulo: q("titulo"), detalhe: q("detalhe"), link: q("link") };
    await salvarVideos(lista);
    P().toast("Vídeo salvo.");
  });
  $("listaVideosAdm").addEventListener("click", async (e) => {
    if (!e.target.matches("[data-apagar-video]")) return;
    if (!confirm("Excluir este vídeo do catálogo?")) return;
    const lista = videos();
    lista.splice(Number(e.target.closest("[data-video]").dataset.video), 1);
    await salvarVideos(lista);
    desenharVideos();
  });
  $("novoVideo").addEventListener("click", async () => {
    const lista = videos();
    lista.push({ titulo: "Novo vídeo", detalhe: "", link: "" });
    await salvarVideos(lista);
    desenharVideos();
    const campo = $("listaVideosAdm").querySelector("[data-video]:last-child input");
    if (campo) { campo.focus(); campo.select(); }
  });

  (window.PainelExtras = window.PainelExtras || []).push(desenharCats, desenharVideos);
})();
