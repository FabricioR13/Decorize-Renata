# Decorize — catálogo de temas para festas

Vitrine de temas da **Decorize** (@decorize.locacoes, Gravataí/RS): a cliente escolhe o tema,
a montagem (Kit Bronze, Prata, Ouro ou Diamante), pegue e monte ou montagem, os adicionais,
e fala direto com a Renata pelo WhatsApp. Desenvolvido pela **TF Solutions** a partir da base
do catálogo Olimpo.

**Demonstração:** https://fabricior13.github.io/decorize/ (depois de publicar)

## Vitrine (`index.html`)
- Busca por tema (a caixa fica fixa no topo quando a cliente rola a página) e categorias **Menino, Menina, Adulto, Formatura, Chás e outros**,
  com subcategorias (15 anos, 18 anos, Direito, Pedagogia, Chá de bebê…)
- Cada tema com **4 fotos, uma por montagem**; se faltar foto, mostra a mais completa como
  "foto ilustrativa"
- Tabela dos kits (pegue e monte e com montagem) e dos **adicionais** (número de LED,
  escadinha de lembrancinhas, lembrancinhas, convites)
- Total estimado e botão **"Quero esse tema"** → WhatsApp com tema, kit, adicionais e total
- Link próprio de cada tema (`#tema/homem-aranha`) para mandar no WhatsApp e nos stories
- Prévia do link no WhatsApp (Open Graph, `assets/og.jpg` 1200×630)

## Painel (`admin.html`)
- **Agenda:** calendário do mês com a foto do tema em cada dia; ao tocar no dia, os eventos com
  horário, local (link do mapa), cliente (botão de WhatsApp), kit, retirada/devolução ou
  montagem/desmontagem, total, sinal e quanto falta; aviso quando o mesmo tema está em duas
  festas na mesma data; resumo do mês (fechado, recebido, a receber); lista dos próximos
  eventos; **copiar para o Excel** ou baixar a planilha (.csv) do mês
- **Lembretes de hoje e amanhã** (topo da agenda): cobrar saldo, confirmar retirada/montagem,
  lembrar devolução/desmontagem, orçamento sem resposta e conferir as peças que voltaram, cada um
  com a mensagem pronta no WhatsApp e botão "Feito"
- **Recibo e contrato:** em cada evento, gera o recibo (sinal ou quitação, com valor por extenso)
  e o contrato de locação, prontos para imprimir/salvar em PDF e com o texto para o WhatsApp
- **Planilha do jeito dela:** escolher quais colunas vão, a ordem e o nome de cada uma, e se a
  linha de cabeçalho vai junto
- **Peças:** controle de capas, painéis, pelúcias e acessórios (em uso, manutenção, danificada,
  perdida); a agenda avisa quando o tema de um evento tem peça fora de uso, e o botão
  "Registrar dano" abre o cadastro já preenchido a partir do evento
- **Post do dia:** modelos prontos (mais pedidos, novidades, datas livres, formaturas, livre),
  escolha dos temas, imagens para grupos (4:5) ou status (9:16), datas livres puxadas da agenda
  e texto com o link de cada tema
- **Contatos:** quem tocou em "Quero esse tema" (tema, kit, total), com situação e botão
  **📅 Agendar**, que já abre o evento preenchido
- **Temas:** cadastrar/editar tema, categorias, subcategoria e as **4 fotos** (reduzidas sozinhas)
- **Kits e valores:** nome, o que vem e preços dos 4 kits; adicionais com preço
- **Post do tema:** em Temas, o botão 📣 Post gera a imagem (feed 4:5 ou stories 9:16) com as
  fotos das montagens, o nome e o preço inicial, mais o texto com o link do tema, para mandar nos
  grupos de WhatsApp e no status
- **Configurações:** WhatsApp, Instagram, endereço do catálogo, textos do topo e aviso

## Modo demonstração
Sem configurar nada, tudo funciona salvo no navegador (senha do painel: `decorize2026`).
Para usar de verdade, siga `regras.md` (Firebase).

---
Desenvolvido por **Fabrício Rodrigues Garcia** — [TF Solutions](https://www.tfsolutions.com.br)
