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
  const pc = { filtro: "fora", tema: "", busca: "", editando: null };

  const pecas = () => (P().d.pecas || []);
  const nomeTema = (id) => (id ? ((P().d.temas.find((t) => (t.id || t.docId) === id) || {}).nome || "Tema removido") : "Peça geral (vários temas)");
  const situacao = (x) => (SITUACOES[x.situacao] ? x.situacao : "ok");

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
      const capa = t ? fotoCapa(t) : "";
      const st = situacao(x);
      const quando = x.atualizadoEm ? new Date(x.atualizadoEm).toLocaleDateString("pt-BR") : "";
      return `<div class="pc-linha pc-${st}">
        ${capa ? `<img src="${escaparHtml(capa)}" alt="">` : `<span class="sem">🧰</span>`}
        <div>
          <h3>${escaparHtml(x.nome)} ${Number(x.quantidade) > 1 ? `<small>× ${Number(x.quantidade)}</small>` : ""}</h3>
          <p>${escaparHtml(nomeTema(x.temaId))}${quando ? ` · atualizado em ${quando}` : ""}</p>
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
    const v = { quantidade: 1, situacao: "ok", temaId: "", nome: "", obs: "", ...padrao, ...(x || {}) };
    const f = $("pcForm");
    f.reset();
    $("pcEditorTitulo").textContent = x ? "Editar peça" : "Nova peça";
    f.temaId.innerHTML = `<option value="">Peça geral (vários temas)</option>` +
      [...P().d.temas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((t) => `<option value="${escaparHtml(t.id || t.docId)}">${escaparHtml(t.nome)}</option>`).join("");
    f.nome.value = v.nome; f.temaId.value = v.temaId; f.quantidade.value = v.quantidade; f.situacao.value = v.situacao; f.obs.value = v.obs;
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
    await Dados.salvar("pecas", id, {
      id, nome, temaId: f.temaId.value,
      quantidade: Math.max(1, Math.round(Number(f.quantidade.value) || 1)),
      situacao: f.situacao.value, obs: f.obs.value.trim(), atualizadoEm: new Date().toISOString(),
    });
    fechar();
    await P().recarregar();
    P().toast(pc.editando ? "Peça atualizada." : "Peça cadastrada.");
  }

  function ligar() {
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
