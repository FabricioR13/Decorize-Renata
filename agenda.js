// Decorize — Agenda de eventos (painel) | TF Solutions
// Calendário do mês, detalhes de cada evento com a foto da montagem, aviso de tema
// repetido na mesma data e exportação para a planilha (Excel).
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const P = () => window.Painel;
  const SITUACOES = {
    orcamento: { nome: "Orçamento", cor: "#f0a400" },
    confirmado: { nome: "Confirmado", cor: "#1fa855" },
    realizado: { nome: "Realizado", cor: "#86695a" },
    cancelado: { nome: "Cancelado", cor: "#c0392b" },
  };
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const SEMANA_LONGA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  const hoje = () => diaISO(new Date());
  const ag = { mes: hoje().slice(0, 7), dia: hoje(), visao: "mes", editando: null, valorManual: false, pecas: new Map(), pecasManual: false, verGerais: false };

  const partes = (iso) => String(iso).split("-").map(Number);
  const diaSemana = (iso) => { const [a, m, d] = partes(iso); return new Date(a, m - 1, d).getDay(); };
  const dataLonga = (iso) => { const [a, m, d] = partes(iso); return `${SEMANA_LONGA[diaSemana(iso)]}, ${d} de ${MESES[m - 1]}`; };
  const maiuscula = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);
  const dataCurta = (iso) => { const [, m, d] = partes(iso); return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`; };
  const hora = (h) => (h ? String(h).replace(":00", "h").replace(":", "h") : "");
  const situacao = (e) => (SITUACOES[e.status] ? e.status : "orcamento");
  const fim = (e) => (e.devolucao && e.devolucao >= e.data ? e.devolucao : e.data);
  const kitDe = (id) => (P().d.combos.find((c) => c.id === id) || { id, nome: id ? `Kit ${id}` : "", precoPegueMonte: 0, precoMontagem: 0 });
  const temaDe = (e) => P().d.temas.find((t) => (t.id || t.docId) === e.temaId);
  const ativos = () => P().d.eventos.filter((e) => e.status !== "cancelado");
  const zap = (n) => { let x = String(n || "").replace(/\D/g, ""); if (x.length === 10 || x.length === 11) x = `55${x}`; return x; };
  const telefone = (n) => { const x = String(n || "").replace(/\D/g, "").replace(/^55/, ""); return x.length === 11 ? `(${x.slice(0, 2)}) ${x.slice(2, 7)}-${x.slice(7)}` : x; };

  /** Outros eventos com o mesmo tema em datas que se cruzam (as peças são as mesmas). */
  function conflitos(e, lista = ativos()) {
    if (!e.temaId || e.status === "cancelado") return [];
    return lista.filter((o) => o.id !== e.id && o.temaId === e.temaId && o.data <= fim(e) && fim(o) >= e.data);
  }

  function noDia(iso) {
    return P().d.eventos
      .filter((e) => e.data === iso)
      .sort((a, b) => String(a.horaFesta || a.horaMontagem).localeCompare(String(b.horaFesta || b.horaMontagem)));
  }
  const devolveNoDia = (iso) => ativos().filter((e) => e.devolucao === iso && e.devolucao !== e.data);

  /* ---------- resumo do mês ---------- */
  function doMes() { return P().d.eventos.filter((e) => String(e.data).startsWith(ag.mes)); }

  function desenharResumo() {
    const lista = doMes().filter((e) => e.status !== "cancelado");
    const fechados = lista.filter((e) => e.status === "confirmado" || e.status === "realizado");
    const soma = (arr, f) => arr.reduce((s, e) => s + (Number(f(e)) || 0), 0);
    const total = soma(fechados, (e) => e.valor);
    const sinais = soma(fechados, (e) => e.sinal);
    const orc = lista.filter((e) => e.status === "orcamento");
    $("agResumo").innerHTML = `
      <div><small>Eventos no mês</small><b>${lista.length}</b><span>${fechados.length} fechados · ${orc.length} em orçamento</span></div>
      <div><small>Fechado no mês</small><b>${formatarMoeda(total)}</b><span>confirmados e realizados</span></div>
      <div><small>Já recebido (sinais)</small><b>${formatarMoeda(sinais)}</b><span>dos eventos fechados</span></div>
      <div class="destaque"><small>A receber</small><b>${formatarMoeda(total - sinais)}</b><span>saldo dos fechados</span></div>`;
  }

  /* ---------- calendário ---------- */
  function desenharCalendario() {
    const [a, m] = partes(`${ag.mes}-01`);
    $("agMes").textContent = `${maiuscula(MESES[m - 1])} de ${a}`;
    const primeiro = new Date(a, m - 1, 1).getDay();
    const dias = new Date(a, m, 0).getDate();
    const celulas = [];
    SEMANA.forEach((s) => celulas.push(`<div class="cal-semana">${s}</div>`));
    for (let i = 0; i < primeiro; i++) celulas.push(`<div class="cal-vazio"></div>`);
    for (let dia = 1; dia <= dias; dia++) {
      const iso = `${ag.mes}-${String(dia).padStart(2, "0")}`;
      const evs = noDia(iso);
      const dev = devolveNoDia(iso);
      const classes = ["cal-dia"];
      if (iso === hoje()) classes.push("hoje");
      if (iso === ag.dia) classes.push("selecionado");
      if (iso < hoje()) classes.push("passado");
      if ([0, 6].includes(diaSemana(iso))) classes.push("fds");
      const chips = evs.slice(0, 3).map((e) => {
        const t = temaDe(e);
        const foto = t ? fotoDoNivel(t, e.kitId || "diamante").src : "";
        const alerta = conflitos(e).length ? " ⚠️" : "";
        return `<span class="cal-ev ${situacao(e)}" title="${escaparHtml(`${e.temaNome} — ${e.cliente}${e.horaFesta ? ` — ${hora(e.horaFesta)}` : ""}`)}">
          ${foto ? `<img src="${escaparHtml(foto)}" alt="">` : ""}<em>${escaparHtml(e.temaNome || "Evento")}${alerta}</em></span>`;
      }).join("");
      const mais = evs.length > 3 ? `<span class="cal-mais">+${evs.length - 3}</span>` : "";
      const pontos = evs.map((e) => `<i class="${situacao(e)}"></i>`).join("");
      celulas.push(`<button class="${classes.join(" ")}" data-dia="${iso}">
        <span class="cal-num">${dia}</span>
        <span class="cal-pontos">${pontos}</span>
        ${chips}${mais}
        ${dev.length ? `<span class="cal-dev">↩ ${dev.length} devolução${dev.length > 1 ? "ões" : ""}</span>` : ""}
      </button>`);
    }
    $("agCal").innerHTML = celulas.join("");
  }

  /* ---------- peças fora de uso ---------- */
  function avisoPecas(e) {
    if (!window.Pecas || e.status === "realizado" || e.status === "cancelado") return "";
    const faltam = window.Pecas.faltas(e);
    if (!faltam.length) return "";
    return `<p class="ev-alerta ev-falta">🧰 Falta peça nesta data: ${faltam.map((d) => `<b>${escaparHtml(d.peca.nome)}</b> (${escaparHtml(window.Pecas.textoFalta(d))})`).join("; ")}</p>`;
  }

  /* ---------- lembretes de hoje e amanhã ---------- */
  function lembretes() {
    const h = hoje(), am = somarDias(h, 1), ontem = somarDias(h, -1);
    const c = P().d.config;
    const quando = (iso) => (iso === h ? "hoje" : iso === am ? "amanhã" : `dia ${dataCurta(iso)}`);
    const nome = (e) => String(e.cliente || "").split(" ")[0];
    const lista = [];
    const add = (e, tipo, icone, titulo, detalhe, msg) => {
      if ((e.lembretesFeitos || []).includes(tipo)) return;
      lista.push({ e, tipo, icone, titulo, detalhe, msg });
    };
    P().d.eventos.filter((e) => e.status !== "cancelado").forEach((e) => {
      const pegue = e.modalidade === "pegue";
      const falta = Math.max(0, (Number(e.valor) || 0) - (Number(e.sinal) || 0));
      const fimE = fim(e);
      if (e.status === "confirmado" && (e.data === h || e.data === am)) {
        add(e, "confirmar", pegue ? "📦" : "🛠️",
          `${pegue ? "Retirada" : "Montagem"} ${quando(e.data)}${e.horaMontagem ? ` às ${hora(e.horaMontagem)}` : ""}: ${e.temaNome}`,
          `${e.cliente}${e.local ? ` · ${e.local}` : ""}`,
          pegue
            ? `Olá, ${nome(e)}! Tudo certo para retirar a decoração *${e.temaNome}* ${quando(e.data)}${e.horaMontagem ? ` às ${hora(e.horaMontagem)}` : ""}? 🧡\nEndereço: ${c.enderecoEmpresa || c.cidade}`
            : `Olá, ${nome(e)}! Confirmando a montagem da decoração *${e.temaNome}* ${quando(e.data)}${e.horaMontagem ? ` às ${hora(e.horaMontagem)}` : ""}${e.local ? ` em ${e.local}` : ""}. Alguém vai estar no local para abrir? 🧡`);
        if (falta > 0) add(e, "saldo", "💰", `Cobrar saldo de ${formatarMoeda(falta)}: ${e.temaNome}`, `${e.cliente} · prazo ${c.prazoSaldo}`,
          `Olá, ${nome(e)}! Passando para lembrar do saldo da decoração *${e.temaNome}* (${dataCurta(e.data)}): *${formatarMoeda(falta)}*, ${c.prazoSaldo}.${c.chavePix ? `\nPix: ${c.chavePix}` : ""}\nObrigada! 🧡`);
      }
      if ((e.status === "confirmado" || e.status === "realizado") && (fimE === h || fimE === am) && (fimE !== e.data || pegue)) {
        add(e, "devolucao", pegue ? "↩️" : "🧹",
          `${pegue ? "Devolução" : "Desmontagem"} ${quando(fimE)}${e.horaDevolucao ? ` às ${hora(e.horaDevolucao)}` : ""}: ${e.temaNome}`, e.cliente,
          pegue
            ? `Olá, ${nome(e)}! Espero que a festa tenha sido linda 🎉 Lembrando que a devolução da decoração *${e.temaNome}* é ${quando(fimE)}${e.horaDevolucao ? ` até as ${hora(e.horaDevolucao)}` : ""}. Qualquer coisa me chama!`
            : `Olá, ${nome(e)}! Espero que a festa tenha sido linda 🎉 Vou passar para desmontar ${quando(fimE)}${e.horaDevolucao ? ` às ${hora(e.horaDevolucao)}` : ""}, combinado?`);
      }
      if (e.status === "confirmado" && fimE < h && fimE >= somarDias(h, -7)) {
        add(e, "conferir", "🔎", `Conferir as peças que voltaram: ${e.temaNome}`, `${e.cliente} · ${fimE === ontem ? "voltou ontem" : `voltou ${dataCurta(fimE)}`}`, "");
      }
      if (e.status === "orcamento" && e.data >= h && e.data <= somarDias(h, 7)) {
        add(e, "orcamento", "⏳", `Orçamento sem resposta para ${dataCurta(e.data)}: ${e.temaNome}`, e.cliente,
          `Olá, ${nome(e)}! Tudo bem? Ainda estou segurando a data ${dataCurta(e.data)} com a decoração *${e.temaNome}* para você. Vamos confirmar? 🧡`);
      }
    });
    const ordem = { saldo: 0, confirmar: 1, devolucao: 2, orcamento: 3, conferir: 4 };
    return lista.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
  }

  function desenharLembretes() {
    const lista = lembretes();
    $("agLembretes").hidden = !lista.length;
    if (!lista.length) return;
    $("agLembretes").innerHTML = `<h2>🔔 Para hoje e amanhã <small>${lista.length}</small></h2>` + lista.map((l) => {
      const tel = zap(l.e.telefone);
      const botoes = l.tipo === "conferir"
        ? `<button class="btn btn-claro" data-lembrete-ok="${escaparHtml(l.e.id)}">✅ Tudo certo</button><button class="btn btn-claro" data-dano="${escaparHtml(l.e.id)}">🧰 Registrar dano</button>`
        : `${tel ? `<a class="btn btn-zap" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${encodeURIComponent(l.msg)}" data-lembrete-zap="${escaparHtml(l.e.id)}|${l.tipo}">WhatsApp</a>` : ""}
           <button class="btn btn-claro" data-lembrete-feito="${escaparHtml(l.e.id)}|${l.tipo}">Feito</button>`;
      return `<div class="lembrete ${l.tipo}">
        <span class="lembrete-ico">${l.icone}</span>
        <div><b>${escaparHtml(l.titulo)}</b><small>${escaparHtml(l.detalhe || "")}</small></div>
        <div class="lembrete-acoes">${botoes}</div>
      </div>`;
    }).join("");
  }

  async function marcarLembrete(id, tipo) {
    const e = P().d.eventos.find((x) => x.id === id);
    if (!e) return;
    const feitos = [...new Set([...(e.lembretesFeitos || []), tipo])];
    await Dados.salvar("eventos", e.docId || e.id, { lembretesFeitos: feitos });
    e.lembretesFeitos = feitos;
    desenharLembretes();
  }

  /* ---------- cartão do evento ---------- */
  function cartao(e) {
    const t = temaDe(e);
    const kit = kitDe(e.kitId);
    const foto = t ? fotoDoNivel(t, e.kitId || "diamante") : { src: "" };
    const st = situacao(e);
    const falta = Math.max(0, (Number(e.valor) || 0) - (Number(e.sinal) || 0));
    const nomesAd = (e.adicionais || []).map((id) => (P().d.adicionais.find((a) => (a.id || a.docId) === id) || {}).nome).filter(Boolean);
    const conf = conflitos(e);
    const pegue = e.modalidade === "pegue";
    const mapa = e.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.endereco)}` : "";
    const msg = `Olá, ${String(e.cliente || "").split(" ")[0]}! Aqui é a ${P().d.config.nomeDona}, da ${P().d.config.nomeLoja} 🧡\nSobre a decoração ${e.temaNome} do dia ${dataCurta(e.data)}:`;
    return `<article class="ev-card ${st}">
      <div class="ev-foto">
        ${foto.src ? `<img src="${escaparHtml(foto.src)}" alt="">` : `<span>🎈</span>`}
        <span class="ev-sit" style="--c:${SITUACOES[st].cor}">${SITUACOES[st].nome}</span>
      </div>
      <div class="ev-info">
        <p class="ev-hora">${e.horaFesta ? `Festa às ${hora(e.horaFesta)}` : "Horário a combinar"} · ${escaparHtml(dataLonga(e.data))}</p>
        <h3>${escaparHtml(e.temaNome || "Evento")}</h3>
        <p class="ev-kit"><b>${escaparHtml(kit.nome)}</b> · ${pegue ? "📦 Pegue e monte" : "🚚 Montagem pela Decorize"}${nomesAd.length ? ` · + ${escaparHtml(nomesAd.join(", "))}` : ""}</p>
        ${conf.length ? `<p class="ev-alerta">⚠️ Este tema também está em: ${conf.map((o) => `${escaparHtml(o.cliente)} (${dataCurta(o.data)})`).join(", ")}</p>` : ""}
        ${avisoPecas(e)}
        <ul class="ev-lista">
          <li><span>${pegue ? "📦 Retirada" : "🛠️ Montagem"}</span><b>${dataCurta(e.data)}${e.horaMontagem ? ` às ${hora(e.horaMontagem)}` : ""}</b></li>
          <li><span>${pegue ? "↩ Devolução" : "🧹 Desmontagem"}</span><b>${dataCurta(fim(e))}${e.horaDevolucao ? ` às ${hora(e.horaDevolucao)}` : ""}</b></li>
          <li><span>📍 Local</span><b>${escaparHtml(e.local || "—")}${e.endereco ? `<small>${escaparHtml(e.endereco)}</small>` : ""}</b></li>
          <li><span>👤 Cliente</span><b>${escaparHtml(e.cliente || "—")}${e.telefone ? `<small>${escaparHtml(telefone(e.telefone))}</small>` : ""}</b></li>
        </ul>
        <div class="ev-valores">
          <div><small>Total</small><b>${formatarMoeda(e.valor)}</b></div>
          <div><small>Sinal</small><b>${formatarMoeda(e.sinal)}</b></div>
          <div class="${falta ? "falta" : "pago"}"><small>${falta ? "Falta receber" : "Pago"}</small><b>${falta ? formatarMoeda(falta) : "✓"}</b></div>
        </div>
        ${e.obs ? `<p class="ev-obs">📝 ${escaparHtml(e.obs)}</p>` : ""}
        <div class="ev-acoes">
          <button class="btn btn-claro" data-editar-ev="${escaparHtml(e.id)}">Editar</button>
          ${e.telefone ? `<a class="btn btn-zap" href="https://wa.me/${zap(e.telefone)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
          ${mapa ? `<a class="btn btn-claro" href="${mapa}" target="_blank" rel="noopener">Ver no mapa</a>` : ""}
        </div>
        <div class="ev-acoes ev-docs">
          <button class="btn btn-claro" data-doc="recibo" data-ev="${escaparHtml(e.id)}">🧾 Recibo</button>
          <button class="btn btn-claro" data-doc="contrato" data-ev="${escaparHtml(e.id)}">📄 Contrato</button>
          ${fim(e) <= hoje() && e.status !== "cancelado" ? `<button class="btn btn-claro" data-dano="${escaparHtml(e.id)}">🧰 Registrar dano</button>` : ""}
          ${fim(e) < hoje() && (e.cpf || e.telefone || e.endereco) ? `<button class="btn btn-claro" data-apagar-dados="${escaparHtml(e.id)}">🧹 Apagar dados da cliente</button>` : ""}
          ${e.dadosApagadosEm ? `<small class="ev-dados-apagados">Dados da cliente apagados em ${dataCurta(e.dadosApagadosEm.slice(0, 10))}</small>` : ""}
        </div>
      </div>
    </article>`;
  }

  function desenharDia() {
    const evs = noDia(ag.dia);
    const dev = devolveNoDia(ag.dia);
    $("agDiaTitulo").textContent = ag.dia === hoje() ? `Hoje, ${dataLonga(ag.dia).split(", ")[1]}` : maiuscula(dataLonga(ag.dia));
    $("agDiaLista").innerHTML = (evs.length ? evs.map(cartao).join("") : `<p class="vazio-adm">Nenhum evento neste dia.</p>`) +
      (dev.length ? `<div class="ev-devolucoes"><b>↩ Voltam neste dia:</b> ${dev.map((e) => `${escaparHtml(e.temaNome)} (${escaparHtml(e.cliente)}${e.horaDevolucao ? `, ${hora(e.horaDevolucao)}` : ""})`).join(" · ")}</div>` : "");
  }

  /* ---------- lista dos próximos ---------- */
  function desenharLista() {
    const prox = P().d.eventos.filter((e) => fim(e) >= hoje() && e.status !== "cancelado")
      .sort((a, b) => (a.data + (a.horaFesta || "")).localeCompare(b.data + (b.horaFesta || "")));
    if (!prox.length) { $("agLista").innerHTML = `<p class="vazio-adm">Nenhum evento marcado daqui para frente.</p>`; return; }
    let ultimo = "";
    $("agLista").innerHTML = prox.map((e) => {
      const cab = e.data !== ultimo ? `<h3 class="ag-lista-dia">${escaparHtml(maiuscula(dataLonga(e.data)))}</h3>` : "";
      ultimo = e.data;
      return cab + cartao(e);
    }).join("");
  }

  function desenhar() {
    if (!P() || !$("agCal")) return;
    desenharResumo();
    desenharLembretes();
    desenharCalendario();
    desenharDia();
    desenharLista();
    $("agVisaoMes").hidden = ag.visao !== "mes";
    $("agLista").hidden = ag.visao !== "lista";
    document.querySelectorAll("#agVisoes button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.visao === ag.visao)));
  }

  /* ---------- editor ---------- */
  function abrirEditor(e, padrao = {}) {
    ag.editando = e || null;
    ag.valorManual = !!e;
    // peças: evento salvo com a lista usa a lista dele; novo (ou antigo, sem lista) segue o tema e o kit
    ag.pecasManual = !!(e && Array.isArray(e.pecas));
    ag.pecas = new Map(ag.pecasManual ? e.pecas.map((x) => [x.id, x.qtd]) : []);
    ag.verGerais = false;
    const v = { modalidade: "pegue", status: "orcamento", data: ag.dia >= hoje() ? ag.dia : hoje(), horaMontagem: "14:00", horaDevolucao: "12:00", adicionais: [], ...padrao, ...(e || {}) };
    const f = $("agForm");
    f.reset();
    $("agEditorTitulo").textContent = e ? "Editar evento" : "Novo evento";
    f.temaId.innerHTML = `<option value="">Escolha o tema…</option>` + [...P().d.temas]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((t) => `<option value="${escaparHtml(t.id || t.docId)}">${escaparHtml(t.nome)}</option>`).join("");
    f.kitId.innerHTML = P().d.combos.map((c) => `<option value="${escaparHtml(c.id)}">${escaparHtml(c.nome)}</option>`).join("");
    $("agAdicionais").innerHTML = P().d.adicionais.map((a) => {
      const id = a.id || a.docId;
      return `<label><input type="checkbox" value="${escaparHtml(id)}" ${(v.adicionais || []).includes(id) ? "checked" : ""}> ${escaparHtml(a.nome)} <small>${formatarMoeda(a.preco)}</small></label>`;
    }).join("");
    ["temaId", "kitId", "data", "horaFesta", "horaMontagem", "devolucao", "horaDevolucao", "cliente", "telefone", "cpf", "local", "endereco", "status", "obs"]
      .forEach((k) => { if (f[k]) f[k].value = v[k] ?? ""; });
    f.telefone.value = mascaraTelefone(f.telefone.value);
    f.cpf.value = mascaraCpf(f.cpf.value);
    if (!v.kitId) f.kitId.value = (P().d.combos[0] || {}).id || "";
    f.modalidade.value = v.modalidade;
    f.valor.value = P().valorCampo(v.valor);
    f.sinal.value = P().valorCampo(v.sinal);
    if (!f.devolucao.value) f.devolucao.value = somarDias(f.data.value, 1);
    $("agExcluir").hidden = !e;
    atualizarEditor();
    $("agEditor").hidden = false;
    document.body.classList.add("travado");
  }

  function fecharEditor() { $("agEditor").hidden = true; document.body.classList.remove("travado"); }

  function lerForm() {
    const f = $("agForm");
    const tema = P().d.temas.find((t) => (t.id || t.docId) === f.temaId.value);
    return {
      id: ag.editando ? ag.editando.id : `ev${Date.now().toString(36)}`,
      temaId: f.temaId.value, temaNome: tema ? tema.nome : "",
      kitId: f.kitId.value, modalidade: f.modalidade.value,
      data: f.data.value, horaFesta: f.horaFesta.value, horaMontagem: f.horaMontagem.value,
      devolucao: f.devolucao.value || f.data.value, horaDevolucao: f.horaDevolucao.value,
      cliente: f.cliente.value.trim(), telefone: f.telefone.value.trim(), cpf: f.cpf.value.trim(),
      local: f.local.value.trim(), endereco: f.endereco.value.trim(),
      adicionais: [...$("agAdicionais").querySelectorAll("input:checked")].map((i) => i.value),
      valor: P().numero(f.valor.value), sinal: P().numero(f.sinal.value),
      status: f.status.value, obs: f.obs.value.trim(),
      pecas: [...ag.pecas.entries()].map(([id, qtd]) => ({ id, qtd })),
    };
  }

  function valorSugerido(ev) {
    const kit = kitDe(ev.kitId);
    const base = Number(ev.modalidade === "pegue" ? kit.precoPegueMonte : kit.precoMontagem) || 0;
    const extras = P().d.adicionais.filter((a) => ev.adicionais.includes(a.id || a.docId)).reduce((s, a) => s + (Number(a.preco) || 0), 0);
    return base + extras;
  }

  function atualizarEditor() {
    const f = $("agForm");
    const ev = lerForm();
    const pegue = ev.modalidade === "pegue";
    $("agRotMontagem").textContent = pegue ? "Retirada às" : "Montagem às";
    $("agRotDevolucao").textContent = pegue ? "Devolução em" : "Desmontagem em";
    $("agRotHoraDev").textContent = pegue ? "Devolução às" : "Desmontagem às";
    const tema = P().d.temas.find((t) => (t.id || t.docId) === ev.temaId);
    const foto = tema ? fotoDoNivel(tema, ev.kitId || "diamante").src : "";
    $("agPrevia").innerHTML = foto ? `<img src="${escaparHtml(foto)}" alt="">` : `<span>🎈</span>`;
    const sug = valorSugerido(ev);
    if (!ag.valorManual && sug) f.valor.value = P().valorCampo(sug);
    $("agSugestao").textContent = sug ? `Pela tabela: ${formatarMoeda(sug)}` : "";
    if (!ag.pecasManual && window.Pecas) {
      ag.pecas = new Map(window.Pecas.padraoDoEvento(ev.temaId, ev.kitId).map((x) => [x.id, x.qtd]));
      ev.pecas = [...ag.pecas.entries()].map(([id, qtd]) => ({ id, qtd }));
    }
    desenharPecasEditor(ev);
    $("agPecas").innerHTML = avisoPecas({ ...ev, status: ev.status === "realizado" ? "orcamento" : ev.status });
    $("agPecas").hidden = !$("agPecas").innerHTML;
    const conf = conflitos({ ...ev, valor: 0 });
    $("agConflito").hidden = !conf.length;
    $("agConflito").innerHTML = conf.length
      ? `⚠️ <b>${escaparHtml(ev.temaNome)}</b> já está marcado para ${conf.map((o) => `${escaparHtml(o.cliente)} (${dataCurta(o.data)}${fim(o) !== o.data ? ` a ${dataCurta(fim(o))}` : ""})`).join(", ")}. Confira se dá tempo de voltar as peças.`
      : "";
  }

  /* ---------- peças do evento (pré-marcadas pelo tema e kit) ---------- */
  function desenharPecasEditor(ev) {
    const caixa = $("agPecasLista");
    if (!window.Pecas || !caixa) return;
    const todas = window.Pecas.lista();
    const doTema = todas.filter((x) => ev.temaId && x.temaId === ev.temaId);
    const gerais = todas.filter((x) => !x.temaId);
    const escolhidasFora = todas.filter((x) => ag.pecas.has(x.id || x.docId) && !doTema.includes(x) && !gerais.includes(x));
    const mostrar = [...doTema, ...escolhidasFora, ...gerais.filter((x) => ag.verGerais || ag.pecas.has(x.id || x.docId))];
    const disp = new Map(window.Pecas.disponibilidade(ev, [...ag.pecas.entries()].map(([id, qtd]) => ({ id, qtd })))
      .map((d) => [d.peca.id || d.peca.docId, d]));
    const linha = (x) => {
      const id = x.id || x.docId;
      const marcada = ag.pecas.has(id);
      const d = disp.get(id);
      const tema = P().d.temas.find((t) => (t.id || t.docId) === x.temaId);
      const foto = x.foto || (tema ? fotoCapa(tema) : "");
      return `<div class="ag-peca${marcada ? "" : " desmarcada"}${d && d.falta ? " falta" : ""}" data-peca="${escaparHtml(id)}">
        <label class="ag-peca-check"><input type="checkbox" data-peca-marcar ${marcada ? "checked" : ""}>
          ${foto ? `<img src="${escaparHtml(foto)}" alt="">` : `<span class="sem">🧰</span>`}
          <span><b>${escaparHtml(x.nome)}</b><small>${Number(x.valorReposicao) > 0 ? `reposição ${formatarMoeda(x.valorReposicao)}` : "sem valor de reposição"}</small></span>
        </label>
        <input class="entrada ag-peca-qtd" type="number" min="1" data-peca-qtd value="${marcada ? ag.pecas.get(id) : Math.max(1, Number(x.porFesta) || 1)}" ${marcada ? "" : "disabled"} aria-label="Quantidade">
        <span class="ag-peca-status" data-peca-status>${marcada && d ? (d.falta ? `⚠️ ${escaparHtml(window.Pecas.textoFalta(d))}` : `✓ ${d.total - d.reservado} livre${d.total - d.reservado === 1 ? "" : "s"}`) : ""}</span>
      </div>`;
    };
    caixa.innerHTML = (mostrar.length ? mostrar.map(linha).join("") : `<p class="vazio-adm">${ev.temaId ? "Nenhuma peça cadastrada para este tema ainda (aba 🧰 Peças)." : "Escolha o tema para ver as peças."}</p>`)
      + (gerais.length ? `<button type="button" class="link" data-ver-gerais>${ag.verGerais ? "Esconder peças gerais" : `+ Peças gerais (${gerais.length})`}</button>` : "");
  }

  function ligarPecasEditor() {
    const caixa = $("agPecasLista");
    if (!caixa) return;
    const mudou = () => { ag.pecasManual = true; desenharPecasEditor(lerForm()); };
    // os eventos das peças não sobem para o formulário (senão a lista seria redesenhada enquanto digita)
    caixa.addEventListener("input", (e) => {
      e.stopPropagation();
      const l = e.target.closest("[data-peca]");
      if (!l || !e.target.matches("[data-peca-qtd]")) return;
      const q = Math.max(1, Math.round(Number(e.target.value) || 1));
      ag.pecas.set(l.dataset.peca, q);
      ag.pecasManual = true;
      clearTimeout(ligarPecasEditor._t);
      ligarPecasEditor._t = setTimeout(() => { const foco = l.dataset.peca; desenharPecasEditor(lerForm()); const el = caixa.querySelector(`[data-peca="${foco}"] [data-peca-qtd]`); if (el) { el.focus(); const v = el.value; el.value = ""; el.value = v; } }, 500);
    });
    caixa.addEventListener("change", (e) => {
      e.stopPropagation();
      const l = e.target.closest("[data-peca]");
      if (!l || !e.target.matches("[data-peca-marcar]")) return;
      if (e.target.checked) ag.pecas.set(l.dataset.peca, Math.max(1, Number(l.querySelector("[data-peca-qtd]").value) || 1));
      else ag.pecas.delete(l.dataset.peca);
      mudou();
    });
    caixa.addEventListener("click", (e) => {
      if (!e.target.matches("[data-ver-gerais]")) return;
      ag.verGerais = !ag.verGerais;
      desenharPecasEditor(lerForm());
    });
  }

  /* ---------- WhatsApp e CPF da cliente ---------- */
  /** (51) 99999-9999 — no máximo DDD + 9 dígitos (o 55 do Brasil é tirado). */
  function mascaraTelefone(v) {
    let d = String(v || "").replace(/\D/g, "");
    if (d.length > 11 && d.startsWith("55")) d = d.slice(2); // tirou o +55 do Brasil
    d = d.slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  /** 000.000.000-00 — no máximo 11 dígitos. */
  function mascaraCpf(v) {
    const d = String(v || "").replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
  }
  /** Confere os dígitos verificadores do CPF. */
  function cpfValido(v) {
    const d = String(v || "").replace(/\D/g, "");
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }

  async function salvar(ev) {
    ev.preventDefault();
    const dados = lerForm();
    if (!dados.data) { P().toast("Escolha a data do evento."); return; }
    if (!dados.temaId && !dados.cliente) { P().toast("Escolha o tema ou informe a cliente."); return; }
    const digitosTel = dados.telefone.replace(/\D/g, "");
    if (digitosTel && digitosTel.length !== 10 && digitosTel.length !== 11) { P().toast("Confira o WhatsApp: DDD + número (10 ou 11 dígitos)."); $("agForm").telefone.focus(); return; }
    if (dados.cpf && !cpfValido(dados.cpf)) { P().toast("CPF inválido. Confira os números."); $("agForm").cpf.focus(); return; }
    if (dados.devolucao < dados.data) dados.devolucao = dados.data;
    dados.criadoEm = ag.editando ? ag.editando.criadoEm || new Date().toISOString() : new Date().toISOString();
    if (ag.editando && ag.editando.lembretesFeitos) dados.lembretesFeitos = ag.editando.lembretesFeitos;
    if (ag.editando) await Dados.excluir("eventos", ag.editando.docId || ag.editando.id);
    await Dados.salvar("eventos", dados.id, dados);
    if (ag.deContato) { await Dados.salvar("contatos", ag.deContato, { status: dados.status === "orcamento" ? "respondido" : "fechado" }); ag.deContato = null; }
    fecharEditor();
    ag.dia = dados.data;
    ag.mes = dados.data.slice(0, 7);
    await P().recarregar();
    P().toast(ag.editando ? "Evento atualizado." : "Evento marcado na agenda!");
  }

  /* ---------- exportar para a planilha ---------- */
  const num = (v) => (Number(v) || 0).toFixed(2).replace(".", ",");
  /** Todas as colunas que a planilha pode ter. A Renata escolhe quais, a ordem e o nome de cada uma. */
  const COLUNAS = {
    data: { nome: "Data", valor: (e) => e.data.split("-").reverse().join("/") },
    mes: { nome: "Mês", valor: (e) => maiuscula(MESES[partes(e.data)[1] - 1]) },
    dia: { nome: "Dia da semana", valor: (e) => SEMANA_LONGA[diaSemana(e.data)] },
    hora: { nome: "Horário da festa", valor: (e) => e.horaFesta || "" },
    cliente: { nome: "Cliente", valor: (e) => e.cliente || "" },
    whatsapp: { nome: "WhatsApp", valor: (e) => telefone(e.telefone) },
    tema: { nome: "Tema", valor: (e) => e.temaNome || "" },
    kit: { nome: "Kit", valor: (e) => kitDe(e.kitId).nome },
    modalidade: { nome: "Modalidade", valor: (e) => (e.modalidade === "pegue" ? "Pegue e monte" : "Montagem") },
    adicionais: { nome: "Adicionais", valor: (e) => (e.adicionais || []).map((id) => (P().d.adicionais.find((a) => (a.id || a.docId) === id) || {}).nome).filter(Boolean).join(", ") },
    local: { nome: "Local", valor: (e) => e.local || "" },
    endereco: { nome: "Endereço", valor: (e) => e.endereco || "" },
    situacao: { nome: "Situação", valor: (e) => SITUACOES[situacao(e)].nome },
    valor: { nome: "Valor total", valor: (e) => num(e.valor) },
    sinal: { nome: "Sinal recebido", valor: (e) => num(e.sinal) },
    receber: { nome: "A receber", valor: (e) => num(Math.max(0, (Number(e.valor) || 0) - (Number(e.sinal) || 0))) },
    obs: { nome: "Observações", valor: (e) => (e.obs || "").replace(/\s+/g, " ") },
  };
  const colunasAtuais = () => {
    const salvas = P().d.config.colunasPlanilha;
    const lista = Array.isArray(salvas) && salvas.length ? salvas.filter((c) => COLUNAS[c.id]) : [];
    return lista.length ? lista : Object.keys(COLUNAS).filter((k) => k !== "mes").map((id) => ({ id, nome: COLUNAS[id].nome }));
  };

  function linhasPlanilha() {
    const cols = colunasAtuais();
    const cab = cols.map((c) => c.nome || COLUNAS[c.id].nome);
    const lista = doMes().sort((a, b) => (a.data + (a.horaFesta || "")).localeCompare(b.data + (b.horaFesta || "")));
    const linhas = lista.map((e) => cols.map((c) => COLUNAS[c.id].valor(e)));
    return { cab: P().d.config.cabecalhoPlanilha === false ? null : cab, linhas, qtd: lista.length };
  }

  /* ----- escolher colunas ----- */
  let rascunhoCols = [];
  function abrirColunas() {
    const ativas = colunasAtuais();
    rascunhoCols = [...ativas.map((c) => ({ ...c, on: true })), ...Object.keys(COLUNAS).filter((k) => !ativas.some((c) => c.id === k)).map((id) => ({ id, nome: COLUNAS[id].nome, on: false }))];
    $("colCabecalho").checked = P().d.config.cabecalhoPlanilha !== false;
    desenharColunas();
    $("agColunas").hidden = false;
    document.body.classList.add("travado");
  }
  function desenharColunas() {
    $("colLista").innerHTML = rascunhoCols.map((c, i) => `
      <div class="col-linha${c.on ? "" : " off"}" data-i="${i}">
        <input type="checkbox" data-col-on ${c.on ? "checked" : ""} aria-label="Usar a coluna">
        <span class="col-orig">${escaparHtml(COLUNAS[c.id].nome)}</span>
        <input class="entrada" data-col-nome value="${escaparHtml(c.nome)}" aria-label="Nome na sua planilha">
        <button type="button" class="btn btn-claro" data-col-mover="-1" aria-label="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="btn btn-claro" data-col-mover="1" aria-label="Descer" ${i === rascunhoCols.length - 1 ? "disabled" : ""}>↓</button>
      </div>`).join("");
    const exemplo = P().d.eventos[0];
    const ativas = rascunhoCols.filter((c) => c.on);
    $("colExemplo").innerHTML = exemplo && ativas.length ? `<table><tr>${ativas.map((c) => `<th>${escaparHtml(c.nome)}</th>`).join("")}</tr><tr>${ativas.map((c) => `<td>${escaparHtml(COLUNAS[c.id].valor(exemplo))}</td>`).join("")}</tr></table>` : "";
  }
  function fecharColunas() { $("agColunas").hidden = true; document.body.classList.remove("travado"); }

  async function copiarExcel() {
    const { cab, linhas, qtd } = linhasPlanilha();
    if (!qtd) { P().toast("Nenhum evento neste mês."); return; }
    const tsv = [...(cab ? [cab] : []), ...linhas].map((l) => l.map((c) => String(c).replace(/[\t\n]/g, " ")).join("\t")).join("\n");
    try { await navigator.clipboard.writeText(tsv); P().toast(`${qtd} eventos copiados. É só colar no Excel!`); }
    catch (e) { P().toast("Não deu para copiar. Use o botão Baixar planilha."); }
  }

  function baixarCsv() {
    const { cab, linhas, qtd } = linhasPlanilha();
    if (!qtd) { P().toast("Nenhum evento neste mês."); return; }
    const csv = "﻿" + [...(cab ? [cab] : []), ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `decorize-agenda-${ag.mes}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ---------- eventos da tela ---------- */
  function ligar() {
    $("agAnterior").addEventListener("click", () => { const [a, m] = partes(`${ag.mes}-01`); ag.mes = diaISO(new Date(a, m - 2, 1)).slice(0, 7); desenhar(); });
    $("agProximo").addEventListener("click", () => { const [a, m] = partes(`${ag.mes}-01`); ag.mes = diaISO(new Date(a, m, 1)).slice(0, 7); desenhar(); });
    $("agHoje").addEventListener("click", () => { ag.dia = hoje(); ag.mes = ag.dia.slice(0, 7); desenhar(); });
    $("agVisoes").addEventListener("click", (e) => { const b = e.target.closest("[data-visao]"); if (b) { ag.visao = b.dataset.visao; desenhar(); } });
    $("agCal").addEventListener("click", (e) => {
      const b = e.target.closest("[data-dia]");
      if (!b) return;
      ag.dia = b.dataset.dia;
      desenharCalendario();
      desenharDia();
      if (window.innerWidth < 900) $("agDia").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.querySelector('[data-painel="agenda"]').addEventListener("click", (e) => {
      const id = e.target.dataset.editarEv;
      if (id) abrirEditor(P().d.eventos.find((x) => x.id === id));
    });
    $("agNovo").addEventListener("click", () => abrirEditor(null));
    $("agFechar").addEventListener("click", fecharEditor);
    $("agForm").addEventListener("submit", salvar);
    $("agForm").addEventListener("input", (e) => {
      if (e.target.name === "telefone") e.target.value = mascaraTelefone(e.target.value);
      if (e.target.name === "cpf") e.target.value = mascaraCpf(e.target.value);
      if (e.target.name === "valor") ag.valorManual = true;
      if (e.target.name === "temaId" || e.target.name === "kitId") ag.pecasManual = false; // outro tema/kit: volta a marcar pelas peças dele
      if (e.target.name === "data") {
        const f = $("agForm");
        if (!f.devolucao.value || f.devolucao.value < f.data.value) f.devolucao.value = somarDias(f.data.value, f.modalidade.value === "pegue" ? 1 : 0);
      }
      atualizarEditor();
    });
    $("agForm").addEventListener("change", atualizarEditor);
    $("agUsarTabela").addEventListener("click", () => { ag.valorManual = false; atualizarEditor(); });
    ligarPecasEditor();
    $("agExcluir").addEventListener("click", async () => {
      if (!ag.editando || !confirm("Excluir este evento da agenda?")) return;
      await Dados.excluir("eventos", ag.editando.docId || ag.editando.id);
      fecharEditor();
      await P().recarregar();
      P().toast("Evento excluído.");
    });
    $("agCopiar").addEventListener("click", copiarExcel);
    $("agColunasAbrir").addEventListener("click", abrirColunas);
    $("colFechar").addEventListener("click", fecharColunas);
    $("colLista").addEventListener("input", (e) => {
      const linha = e.target.closest("[data-i]");
      if (!linha) return;
      const c = rascunhoCols[Number(linha.dataset.i)];
      if (e.target.matches("[data-col-nome]")) { c.nome = e.target.value; desenharColunasExemplo(); }
      if (e.target.matches("[data-col-on]")) { c.on = e.target.checked; desenharColunas(); }
    });
    const desenharColunasExemplo = () => {
      const exemplo = P().d.eventos[0];
      const ativas = rascunhoCols.filter((c) => c.on);
      $("colExemplo").innerHTML = exemplo && ativas.length ? `<table><tr>${ativas.map((c) => `<th>${escaparHtml(c.nome)}</th>`).join("")}</tr><tr>${ativas.map((c) => `<td>${escaparHtml(COLUNAS[c.id].valor(exemplo))}</td>`).join("")}</tr></table>` : "";
    };
    $("colLista").addEventListener("click", (e) => {
      const b = e.target.closest("[data-col-mover]");
      if (!b) return;
      const i = Number(b.closest("[data-i]").dataset.i), j = i + Number(b.dataset.colMover);
      [rascunhoCols[i], rascunhoCols[j]] = [rascunhoCols[j], rascunhoCols[i]];
      desenharColunas();
    });
    $("colPadrao").addEventListener("click", () => {
      rascunhoCols = Object.keys(COLUNAS).map((id) => ({ id, nome: COLUNAS[id].nome, on: id !== "mes" }));
      $("colCabecalho").checked = true;
      desenharColunas();
    });
    $("colSalvar").addEventListener("click", async () => {
      const escolhidas = rascunhoCols.filter((c) => c.on).map((c) => ({ id: c.id, nome: c.nome.trim() || COLUNAS[c.id].nome }));
      if (!escolhidas.length) { P().toast("Escolha pelo menos uma coluna."); return; }
      const novo = { colunasPlanilha: escolhidas, cabecalhoPlanilha: $("colCabecalho").checked };
      await Dados.salvar("configuracoes", "geral", novo);
      Object.assign(P().d.config, novo);
      fecharColunas();
      P().toast("Colunas da planilha salvas!");
    });
    // lembretes, documentos e danos
    document.querySelector('[data-painel="agenda"]').addEventListener("click", (e) => {
      const feito = e.target.dataset.lembreteFeito;
      if (feito) { const [id, tipo] = feito.split("|"); marcarLembrete(id, tipo); return; }
      const zapL = e.target.dataset.lembreteZap;
      if (zapL) { const [id, tipo] = zapL.split("|"); setTimeout(() => marcarLembrete(id, tipo), 400); return; }
      const ok = e.target.dataset.lembreteOk;
      if (ok) {
        const ev = P().d.eventos.find((x) => x.id === ok);
        Dados.salvar("eventos", ev.docId || ev.id, { status: "realizado" }).then(() => P().recarregar()).then(() => P().toast("Evento marcado como realizado. ✅"));
        return;
      }
      const apagar = e.target.dataset.apagarDados;
      if (apagar) {
        const ev = P().d.eventos.find((x) => x.id === apagar);
        if (!ev || !confirm(`Apagar o CPF, o WhatsApp e o endereço de ${ev.cliente || "esta cliente"}?\n\nO tema, a data e os valores continuam na agenda e nos relatórios. Não dá para desfazer.`)) return;
        Dados.salvar("eventos", ev.docId || ev.id, { cpf: "", telefone: "", endereco: "", dadosApagadosEm: new Date().toISOString() })
          .then(() => P().recarregar()).then(() => P().toast("Dados da cliente apagados."));
        return;
      }
      const dano = e.target.dataset.dano;
      if (dano && window.Pecas) { window.Pecas.registrarDano(P().d.eventos.find((x) => x.id === dano)); return; }
      const doc = e.target.dataset.doc;
      if (doc && window.Documentos) { window.Documentos[doc](P().d.eventos.find((x) => x.id === e.target.dataset.ev)); }
    });
    $("agBaixar").addEventListener("click", baixarCsv);
  }

  // Para o painel: transformar um contato do site em evento
  window.Agenda = {
    deContato(c) {
      if (!c) return;
      document.querySelector('[data-aba="agenda"]').click();
      const tema = P().d.temas.find((t) => t.nome === c.tema);
      const kit = P().d.combos.find((k) => k.nome === c.combo);
      const ads = P().d.adicionais.filter((a) => (c.adicionais || []).includes(a.nome)).map((a) => a.id || a.docId);
      ag.deContato = c.docId;
      abrirEditor(null, {
        temaId: tema ? tema.id || tema.docId : "", kitId: kit ? kit.id : "",
        modalidade: /pegue/i.test(c.modalidade) ? "pegue" : "montagem",
        adicionais: ads, valor: c.total, obs: `Pedido do site ${c.codigo}`,
      });
    },
    datasLivres(qtd = 6, dias = 45) {
      const ocupados = new Set(ativos().map((e) => e.data));
      const livres = [];
      for (let i = 1; i <= dias && livres.length < qtd; i++) {
        const iso = somarDias(hoje(), i);
        if ([6, 0].includes(diaSemana(iso)) && !ocupados.has(iso)) livres.push(iso);
      }
      return livres.map((iso) => `${SEMANA[diaSemana(iso)]} ${dataCurta(iso)}`);
    },
    temasLivresEm(iso) {
      const ocupados = new Set(ativos().filter((e) => e.data <= iso && fim(e) >= iso).map((e) => e.temaId));
      return P().d.temas.filter((t) => t.ativo !== false && !ocupados.has(t.id || t.docId));
    },
  };

  (window.PainelExtras = window.PainelExtras || []).push(desenhar);
  document.addEventListener("aba", (e) => { if (e.detail === "agenda") desenhar(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ligar); else ligar();
})();
