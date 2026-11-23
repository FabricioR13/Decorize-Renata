// Decorize — Recibo e contrato de locação (painel) | TF Solutions
// Abre uma página pronta para imprimir ou salvar em PDF e um texto para o WhatsApp.
(function () {
  "use strict";

  const P = () => window.Painel;
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  /* ---------- valor por extenso (reais e centavos) ---------- */
  const UN = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const DZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const CT = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function ate999(n) {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const c = Math.floor(n / 100), r = n % 100, d = Math.floor(r / 10), u = r % 10;
    const partes = [];
    if (c) partes.push(CT[c]);
    if (r) partes.push(r < 20 ? UN[r] : DZ[d] + (u ? ` e ${UN[u]}` : ""));
    return partes.join(" e ");
  }

  function inteiroPorExtenso(n) {
    if (n === 0) return "zero";
    const mil = Math.floor(n / 1000), resto = n % 1000;
    const partes = [];
    if (mil) partes.push(mil === 1 ? "mil" : `${ate999(mil)} mil`);
    if (resto) partes.push(ate999(resto));
    // "mil e cem", "dois mil e trinta"; mas "mil duzentos e cinquenta"
    const liga = mil && resto && (resto < 100 || resto % 100 === 0) ? " e " : " ";
    return partes.join(liga);
  }

  function porExtenso(valor) {
    const centavosTotal = Math.round((Number(valor) || 0) * 100);
    const reais = Math.floor(centavosTotal / 100), cent = centavosTotal % 100;
    const partes = [];
    if (reais) partes.push(`${inteiroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}`);
    if (cent) partes.push(`${ate999(cent)} ${cent === 1 ? "centavo" : "centavos"}`);
    return partes.length ? partes.join(" e ") : "zero reais";
  }

  /* ---------- ajudantes ---------- */
  const esc = (s) => escaparHtml(s);
  const dataBR = (iso) => (iso ? String(iso).split("-").reverse().join("/") : "");
  const hora = (h) => (h ? String(h).replace(":00", "h").replace(":", "h") : "");
  const dataExtensa = (d = new Date()) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  const kitDe = (id) => P().d.combos.find((c) => c.id === id) || { nome: "", itens: "" };
  const nomesAdicionais = (e) => (e.adicionais || []).map((id) => (P().d.adicionais.find((a) => (a.id || a.docId) === id) || {}).nome).filter(Boolean);
  const falta = (e) => Math.max(0, (Number(e.valor) || 0) - (Number(e.sinal) || 0));
  const codigo = (e) => `DZ-${String(e.data).replace(/-/g, "").slice(2)}-${String(e.id).slice(-3).toUpperCase()}`;
  const cidade = () => String(P().d.config.enderecoEmpresa || P().d.config.cidade || "").split(/[—,-]/)[0].trim() || "Gravataí";

  function abrirPagina(titulo, corpo, textoZap, telefoneCliente) {
    const logo = new URL("assets/logo.png", location.href).href;
    const zap = String(telefoneCliente || "").replace(/\D/g, "");
    const numero = zap.length === 10 || zap.length === 11 ? `55${zap}` : zap;
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(titulo)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Nunito:wght@500;600;700;800&display=swap">
<style>
  *{box-sizing:border-box} body{margin:0;background:#f4ece5;font-family:Nunito,system-ui,sans-serif;color:#3b2314}
  .barra{position:sticky;top:0;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:12px;background:#3b2314}
  .barra button,.barra a{border:0;border-radius:999px;padding:10px 18px;font:800 14px Nunito,sans-serif;cursor:pointer;text-decoration:none}
  .b1{background:#fe7000;color:#fff}.b2{background:#fff;color:#3b2314}.b3{background:#1fa855;color:#fff}
  .folha{width:min(210mm,100%);margin:20px auto;padding:18mm 16mm;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.12)}
  header{display:flex;align-items:center;gap:14px;padding-bottom:12px;border-bottom:3px solid #fe7000}
  header img{width:62px;height:62px;border-radius:14px}
  header h1{margin:0;font:800 22px Poppins,sans-serif} header p{margin:2px 0 0;font-size:12px;color:#86695a;font-weight:700}
  .num{margin-left:auto;text-align:right;font-size:12px;color:#86695a;font-weight:800}
  h2{font:800 18px Poppins,sans-serif;margin:22px 0 8px} h3{font:700 14px Poppins,sans-serif;margin:16px 0 6px;color:#d65c00;text-transform:uppercase;letter-spacing:.4px}
  p,li{font-size:14px;line-height:1.6} ol{padding-left:20px} li{margin-bottom:4px}
  .caixa{padding:12px 14px;border:1.5px solid #f1dfcf;border-radius:12px;background:#fffaf5}
  .valor{font:800 26px Poppins,sans-serif;color:#3b2314}
  table{width:100%;border-collapse:collapse;font-size:14px} td{padding:6px 4px;border-bottom:1px dashed #f1dfcf} td:last-child{text-align:right;font-weight:800}
  .ass{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:46px} .ass div{padding-top:8px;border-top:1.5px solid #3b2314;text-align:center;font-size:13px;font-weight:700}
  .ass.uma{grid-template-columns:minmax(0,320px);justify-content:center}
  .rodape{margin-top:26px;font-size:11px;color:#a08676;text-align:center}
  @media print{body{background:#fff}.barra{display:none}.folha{margin:0;box-shadow:none;width:auto;padding:0}@page{size:A4;margin:16mm}}
</style></head><body>
<div class="barra">
  <button class="b1" onclick="window.print()">🖨️ Imprimir ou salvar PDF</button>
  <button class="b2" id="copiar">📋 Copiar texto para WhatsApp</button>
  ${numero ? `<a class="b3" target="_blank" rel="noopener" href="https://wa.me/${numero}?text=${encodeURIComponent(textoZap)}">Enviar texto à cliente</a>` : ""}
</div>
<div class="folha">
  <header><img src="${logo}" alt=""><div><h1>${esc(P().d.config.nomeLoja)}</h1>
  <p>Decorações para festas · ${esc(P().d.config.enderecoEmpresa || P().d.config.cidade)}${P().d.config.documento ? ` · ${esc(P().d.config.documento)}` : ""}</p>
  <p>WhatsApp ${esc(telefoneFormatado(P().d.config.whatsapp))} · @${esc(P().d.config.instagram)}</p></div>
  <div class="num">${esc(titulo)}</div></header>
  ${corpo}
  <p class="rodape">Documento gerado pelo painel da ${esc(P().d.config.nomeLoja)}</p>
</div>
<script>
  document.getElementById("copiar").onclick=async()=>{try{await navigator.clipboard.writeText(${JSON.stringify(textoZap)});alert("Texto copiado!")}catch(e){prompt("Copie o texto:",${JSON.stringify(textoZap)})}};
<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { P().toast("O navegador bloqueou a janela. Libere os pop-ups para este site."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function telefoneFormatado(n) {
    const x = String(n || "").replace(/\D/g, "").replace(/^55/, "");
    return x.length === 11 ? `(${x.slice(0, 2)}) ${x.slice(2, 7)}-${x.slice(7)}` : x;
  }

  /* ---------- recibo ---------- */
  function recibo(e) {
    const c = P().d.config;
    const quitado = falta(e) === 0;
    const valor = quitado ? Number(e.valor) || 0 : Number(e.sinal) || 0;
    if (!valor) { P().toast("Registre o sinal recebido no evento antes de gerar o recibo."); return; }
    const kit = kitDe(e.kitId);
    const ref = quitado ? "pagamento total" : "sinal (reserva da data)";
    const corpo = `
      <h2>Recibo de ${quitado ? "pagamento" : "sinal"}</h2>
      <div class="caixa"><span class="valor">${formatarMoeda(valor)}</span><br><small>(${esc(porExtenso(valor))})</small></div>
      <p>Recebi de <b>${esc(e.cliente || "—")}</b>${e.telefone ? ` (WhatsApp ${esc(telefoneFormatado(e.telefone))})` : ""} a quantia de
      <b>${formatarMoeda(valor)}</b> (${esc(porExtenso(valor))}), referente ao <b>${ref}</b> da locação de decoração
      tema <b>${esc(e.temaNome)}</b>, ${esc(kit.nome)} (${e.modalidade === "pegue" ? "pegue e monte" : "com montagem"}), para o evento do dia
      <b>${dataBR(e.data)}</b>${e.local ? `, em ${esc(e.local)}` : ""}.</p>
      <table>
        <tr><td>Valor total da locação</td><td>${formatarMoeda(e.valor)}</td></tr>
        <tr><td>Já recebido${quitado ? "" : " (este recibo)"}</td><td>${formatarMoeda(quitado ? e.valor : e.sinal)}</td></tr>
        <tr><td>${quitado ? "Situação" : "Saldo a pagar " + esc(c.prazoSaldo || "")}</td><td>${quitado ? "Quitado ✓" : formatarMoeda(falta(e))}</td></tr>
      </table>
      ${!quitado && c.chavePix ? `<p>Chave Pix para o saldo: <b>${esc(c.chavePix)}</b></p>` : ""}
      <p>${esc(cidade())}, ${dataExtensa()}.</p>
      <div class="ass uma"><div>${esc(c.nomeDona)} — ${esc(c.nomeLoja)}${c.documento ? `<br>${esc(c.documento)}` : ""}</div></div>`;
    const texto = [
      `🧾 *Recibo — ${c.nomeLoja}*`,
      `Recebi de ${e.cliente} o valor de *${formatarMoeda(valor)}* (${porExtenso(valor)}), referente ao ${ref} da decoração *${e.temaNome}* (${kit.nome}) do dia ${dataBR(e.data)}.`,
      quitado ? "✅ Locação quitada. Obrigada!" : `Saldo a pagar ${c.prazoSaldo}: *${formatarMoeda(falta(e))}*${c.chavePix ? `\nPix: ${c.chavePix}` : ""}`,
      `${c.nomeDona} — ${c.nomeLoja}`,
    ].join("\n");
    abrirPagina(`Recibo ${codigo(e)}`, corpo, texto, e.telefone);
  }

  /* ---------- contrato ---------- */
  function contrato(e) {
    const c = P().d.config;
    const kit = kitDe(e.kitId);
    const pegue = e.modalidade === "pegue";
    const ads = nomesAdicionais(e);
    const clausulas = String(c.clausulasContrato || "").split("\n").map((x) => x.trim()).filter(Boolean);
    const corpo = `
      <h2>Contrato de locação de decoração</h2>
      <h3>As partes</h3>
      <p><b>LOCADORA:</b> ${esc(c.nomeLoja)}, representada por ${esc(c.nomeDona)}${c.documento ? `, ${esc(c.documento)}` : ""}${c.enderecoEmpresa ? `, ${esc(c.enderecoEmpresa)}` : ""}, WhatsApp ${esc(telefoneFormatado(c.whatsapp))}.</p>
      <p><b>LOCATÁRIA:</b> ${esc(e.cliente || "________________________________")}, WhatsApp ${esc(telefoneFormatado(e.telefone) || "________________")}, CPF ______________________.</p>
      <h3>O que está sendo alugado</h3>
      <div class="caixa">
        <p><b>Tema:</b> ${esc(e.temaNome)}<br><b>${esc(kit.nome)}:</b> ${esc(kit.itens || "")}${ads.length ? `<br><b>Adicionais:</b> ${esc(ads.join(", "))}` : ""}<br>
        <b>Modalidade:</b> ${pegue ? "Pegue e monte (a locatária retira, monta e devolve)" : "Montagem e desmontagem feitas pela locadora"}</p>
      </div>
      <h3>Datas e local</h3>
      <table>
        <tr><td>Evento</td><td>${dataBR(e.data)}${e.horaFesta ? ` às ${hora(e.horaFesta)}` : ""}</td></tr>
        <tr><td>${pegue ? "Retirada" : "Montagem"}</td><td>${dataBR(e.data)}${e.horaMontagem ? ` às ${hora(e.horaMontagem)}` : ""}</td></tr>
        <tr><td>${pegue ? "Devolução" : "Desmontagem"}</td><td>${dataBR(e.devolucao || e.data)}${e.horaDevolucao ? ` às ${hora(e.horaDevolucao)}` : ""}</td></tr>
        <tr><td>Local</td><td>${esc([e.local, e.endereco].filter(Boolean).join(" — ") || "—")}</td></tr>
      </table>
      <h3>Valores</h3>
      <table>
        <tr><td>Valor total</td><td>${formatarMoeda(e.valor)} (${esc(porExtenso(e.valor))})</td></tr>
        <tr><td>Sinal pago</td><td>${formatarMoeda(e.sinal)}</td></tr>
        <tr><td>Saldo, a pagar ${esc(c.prazoSaldo || "")}</td><td>${formatarMoeda(falta(e))}</td></tr>
      </table>
      ${c.chavePix ? `<p>Pagamentos por Pix: <b>${esc(c.chavePix)}</b></p>` : ""}
      <h3>Condições</h3>
      <ol>${clausulas.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
      ${e.obs ? `<p><b>Observações:</b> ${esc(e.obs)}</p>` : ""}
      <p>${esc(cidade())}, ${dataExtensa()}.</p>
      <div class="ass">
        <div>${esc(c.nomeDona)} — LOCADORA</div>
        <div>${esc(e.cliente || "")} — LOCATÁRIA</div>
      </div>`;
    const texto = [
      `📄 *Resumo do contrato — ${c.nomeLoja}*`,
      `Tema: *${e.temaNome}* · ${kit.nome}${ads.length ? ` + ${ads.join(", ")}` : ""}`,
      `${pegue ? "Retirada" : "Montagem"}: ${dataBR(e.data)}${e.horaMontagem ? ` às ${hora(e.horaMontagem)}` : ""}`,
      `${pegue ? "Devolução" : "Desmontagem"}: ${dataBR(e.devolucao || e.data)}${e.horaDevolucao ? ` às ${hora(e.horaDevolucao)}` : ""}`,
      `Total: ${formatarMoeda(e.valor)} · Sinal: ${formatarMoeda(e.sinal)} · Saldo: ${formatarMoeda(falta(e))} (${c.prazoSaldo})`,
      "",
      "Condições:",
      ...clausulas.map((x, i) => `${i + 1}. ${x}`),
      "",
      "Se estiver tudo certo, responda *De acordo* 🧡",
    ].join("\n");
    abrirPagina(`Contrato ${codigo(e)}`, corpo, texto, e.telefone);
  }

  window.Documentos = { recibo, contrato, porExtenso };
})();
