// ═════════════════════════════════════════════════════════════════════════════
//  DECORIZE — CAMADA DE DADOS (usada pela vitrine e pelo painel)
//  Desenvolvido por TF Solutions
//
//  Dois modos de funcionamento (mesma base do catálogo Olimpo):
//   • DEMONSTRAÇÃO (padrão): sem configurar nada, os dados ficam salvos no próprio
//     navegador (localStorage). Serve para apresentar o sistema à Renata.
//   • FIREBASE: preencha o FIREBASE_CONFIG abaixo e os dados passam a ficar na nuvem
//     (Firestore + login por e-mail/senha). Regras em regras.md.
// ═════════════════════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = null;
// Exemplo:
// const FIREBASE_CONFIG = {
//   apiKey: "...", authDomain: "decorize-xxxx.firebaseapp.com", projectId: "decorize-xxxx",
//   storageBucket: "...", messagingSenderId: "...", appId: "..."
// };

// Senha do painel no modo demonstração
const SENHA_DEMO = "decorize2026";

// WhatsApp da TF Solutions (crédito no rodapé)
const TF_SOLUTIONS_WHATSAPP = "5551982165186";

// ─── ESTRUTURA FIXA ──────────────────────────────────────────────────────────
// As 4 montagens de cada tema, da mais simples à mais completa.
const NIVEIS = ["bronze", "prata", "ouro", "diamante"];

// Grandes grupos da vitrine (o tema pode estar em mais de um).
const SEED_CATEGORIAS = [
    { id: "menino", nome: "Menino", emoji: "👦", ordem: 1 },
    { id: "menina", nome: "Menina", emoji: "👧", ordem: 2 },
    { id: "revelacao", nome: "Chá revelação", emoji: "🎀", ordem: 3 },
    { id: "adulto", nome: "Adulto", emoji: "🥂", ordem: 4 },
    { id: "formatura", nome: "Formatura", emoji: "🎓", ordem: 5 },
    { id: "outros", nome: "Chás e outros", emoji: "🍼", ordem: 6 },
];

// ─── DADOS INICIAIS DA DEMONSTRAÇÃO ──────────────────────────────────────────
// Valores e itens dos combos são EXEMPLOS: a Renata ajusta tudo no painel.
const SEED_COMBOS = [
    {
        id: "bronze", nome: "Kit Bronze", ordem: 1,
        itens: "Painel redondo com capa do tema + 3 cilindros com capas",
        precoPegueMonte: 150, precoMontagem: 220,
    },
    {
        id: "prata", nome: "Kit Prata", ordem: 2,
        itens: "Tudo do Bronze + mesa ou cubos, bandejas, boleira e peças decorativas do tema",
        precoPegueMonte: 200, precoMontagem: 280,
    },
    {
        id: "ouro", nome: "Kit Ouro", ordem: 3,
        itens: "Tudo do Prata + painel de fundo, arranjos de flores e mais peças do tema",
        precoPegueMonte: 250, precoMontagem: 350,
    },
    {
        id: "diamante", nome: "Kit Diamante", ordem: 4,
        itens: "Tudo do Ouro + arco de balões desconstruído e cenário completo para fotos",
        precoPegueMonte: 0, precoMontagem: 480,
    },
];

const SEED_ADICIONAIS = [
    { id: "led", nome: "Número de LED", detalhe: "Idade do aniversariante", preco: 50, ativo: true },
    { id: "escadinha", nome: "Escadinha de lembrancinhas", detalhe: "Expositor para as lembranças", preco: 40, ativo: true },
    { id: "lembrancinhas", nome: "Lembrancinhas personalizadas", detalhe: "Pacote com 10 unidades no tema", preco: 60, ativo: true },
    { id: "convites", nome: "Pacote de convites", detalhe: "Convite digital no tema da festa", preco: 30, ativo: true },
];

const IMG = "assets/temas/";
// Monta as fotos das montagens que existem para o tema (as outras ficam vazias)
const fotos = (slug, niveis) => Object.fromEntries(niveis.map((n) => [n, `${IMG}${slug}-${n}.jpg`]));
const T4 = ["bronze", "prata", "ouro", "diamante"];

const t = (id, nome, categorias, sub, descricao, fts, extra = {}) => ({
    id, nome, categorias, sub, descricao, fotos: fts, ativo: true, destaque: false, ...extra,
});

const SEED_TEMAS = [
    // Infantil
    t("homem-aranha", "Homem-Aranha", ["menino"], "Super-heróis", "Azul e vermelho, com o herói favorito da criançada.", fotos("homem-aranha", T4), { destaque: true }),
    t("baby-shark", "Baby Shark", ["menino", "menina"], "1 aninho", "Fundo do mar colorido, perfeito para o primeiro aninho.", fotos("baby-shark", T4), { destaque: true }),
    t("bobbie-goods", "Bobbie Goods", ["menina", "menino"], "Desenhos", "Os bichinhos fofos de colorir, em tons alegres.", fotos("bobbie-goods", ["diamante"]), { novo: true }),
    t("branca-de-neve", "Branca de Neve", ["menina"], "Princesas", "Clássico encantado, com maçãs e os sete anões.", fotos("branca-de-neve", T4), { destaque: true }),
    t("minnie-rosa", "Minnie Rosa", ["menina"], "1 aninho", "Rosa delicado com a Minnie e laços.", fotos("minnie-rosa", T4)),
    t("ursinho-balonista", "Ursinho Balonista", ["menino", "outros"], "Chá de bebê", "Azul-claro com balões de ar quente e ursinho.", fotos("ursinho-balonista", T4)),
    t("ursinha-princesa", "Ursinha Princesa", ["menina", "outros"], "Chá de bebê", "Rosa com coroa dourada e ursinha.", fotos("ursinha-princesa", T4)),
    t("internacional", "Internacional", ["menino", "adulto"], "Futebol", "Para colorado de todas as idades.", fotos("internacional", ["diamante"])),

    // Adulto
    t("18-anos-black", "18 Anos Black", ["adulto"], "18 anos", "Preto e prata, com número em neon.", fotos("18-anos-black", ["diamante"]), { destaque: true }),
    t("50-anos-azul-royal", "50 Anos Azul Royal", ["adulto"], "50 anos", "Azul royal com dourado, elegante e marcante.", fotos("50-anos-azul-royal", ["prata", "ouro", "diamante"])),

    // Formaturas
    t("formatura-direito", "Formatura Direito", ["formatura"], "Direito", "Preto e dourado, com a balança da justiça.", fotos("formatura-direito", ["ouro", "diamante"]), { destaque: true }),
    t("formatura-pedagogia", "Formatura Pedagogia", ["formatura"], "Pedagogia", "Lilás e prata, a cor da Pedagogia.", fotos("formatura-pedagogia", ["diamante"])),
    t("formatura-verde-dourado", "Formatura Verde e Dourado", ["formatura"], "Outros cursos", "Verde e dourado, com capelo.", fotos("formatura-verde-dourado", ["diamante"])),
    t("formatura-azul-royal", "Formatura Azul Royal", ["formatura"], "Outros cursos", "Azul royal e dourado.", fotos("formatura-azul-royal", ["diamante"])),
    t("formatura-branco-dourado", "Formatura Branco e Dourado", ["formatura"], "Outros cursos", "Claro e sofisticado, com folhagens.", fotos("formatura-branco-dourado", ["diamante"])),

    // Chás e outros
    t("cha-ursinho-azul-bege", "Chá Ursinho Azul e Bege", ["outros"], "Chá de bebê", "Oh Baby! em azul e bege, com cubos BABY.", fotos("cha-ursinho-azul-bege", T4)),
    t("cha-ursinha-rosa-bege", "Chá Ursinha Rosa e Bege", ["outros"], "Chá de bebê", "Oh Baby! em rosa e bege, com cubos BABY.", fotos("cha-ursinha-rosa-bege", T4)),
    t("cha-ursinhos-verde-lilas", "Chá Ursinhos Verde e Lilás", ["revelacao"], "Chá revelação", "Verde-oliva e lilás, com ursinhos de pelúcia.", fotos("cha-ursinhos-verde-lilas", ["diamante"])),
];

const SEED_CONFIG = {
    nomeLoja: "Decorize",
    nomeDona: "Renata",
    whatsapp: "5551989378015",
    instagram: "decorize.locacoes",
    cidade: "Gravataí/RS e região",
    enderecoSite: "https://fabricior13.github.io/decorize/",
    // Recibos e contratos
    documento: "",
    enderecoEmpresa: "Gravataí/RS",
    chavePix: "",
    prazoSaldo: "no dia da retirada ou da montagem",
    clausulasContrato: [
        "As peças são entregues limpas e em perfeito estado e devem ser devolvidas da mesma forma, na data e no horário combinados.",
        "Peças danificadas, manchadas, quebradas ou perdidas serão cobradas pelo valor de reposição ou de conserto.",
        "No pegue e monte, a retirada e a devolução são feitas pela LOCATÁRIA no endereço da LOCADORA.",
        "Na montagem pela LOCADORA, a LOCATÁRIA garante o acesso ao local no horário combinado para montar e desmontar.",
        "O sinal garante a reserva da data e do tema. Em caso de desistência, o sinal não é devolvido.",
        "O saldo deve ser pago no prazo combinado neste contrato. Sem o pagamento, a decoração não é liberada.",
        "Atraso na devolução pode gerar cobrança de diária adicional, combinada entre as partes.",
    ].join("\n"),
    // Colunas da planilha (em branco = todas, na ordem padrão)
    colunasPlanilha: null,
    cabecalhoPlanilha: true,
    heroTitulo: "Escolha o tema da sua festa",
    heroSubtitulo: "Mais de 50 temas, cada um em 4 montagens. Escolha o tema, o kit e fale direto com a Renata pelo WhatsApp.",
    aviso: "Valores de exemplo para demonstração. Confirme disponibilidade e valores pelo WhatsApp.",
    textoPegueMonte: "Você retira tudo separadinho, monta do seu jeito e devolve depois da festa.",
    textoMontagem: "A Decorize leva, monta e desmonta no local da festa (frete conforme a cidade).",
    // Página inicial (reunião 12/11): "Como funciona" no topo e vídeos das montagens
    nomeMontagem: "Montagem pela Decorize",
    textoComoFunciona: "Todo tema tem 4 montagens, do Kit Bronze ao Diamante. Você escolhe o tema, o kit e se prefere retirar e montar ou deixar a montagem com a Decorize.",
    videos: [
        { titulo: "Mini arco de balão que cabe no carro", detalhe: "Como instalar em poucos minutos, sem precisar encher balão", link: "" },
    ],
};

// Contatos de exemplo (aparecem no painel da demonstração)
function gerarContatosDemo() {
    const agora = Date.now();
    return [
        {
            codigo: "DZ7K2M", status: "novo", criadoEm: new Date(agora - 25 * 60000).toISOString(),
            tema: "Homem-Aranha", combo: "Kit Prata", modalidade: "Pegue e monte",
            adicionais: ["Número de LED"], total: 250, dataFesta: "",
        },
        {
            codigo: "DZ3PQ8", status: "respondido", criadoEm: new Date(agora - 26 * 3600000).toISOString(),
            tema: "Formatura Direito", combo: "Kit Diamante", modalidade: "Montagem pela Decorize",
            adicionais: [], total: 480, dataFesta: "",
        },
    ];
}

// Data local no formato AAAA-MM-DD (sem pular o dia por causa do fuso)
function diaISO(data) {
    const x = new Date(data);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
function somarDias(iso, n) {
    const [a, m, dd] = String(iso).split("-").map(Number);
    return diaISO(new Date(a, m - 1, dd + n));
}

// Eventos de exemplo da agenda (sempre em volta da data de hoje)
function gerarEventosDemo() {
    const hoje = diaISO(new Date());
    const sabado = somarDias(hoje, ((6 - new Date().getDay() + 7) % 7) || 7);
    const ev = (id, o) => ({ id, criadoEm: new Date().toISOString(), adicionais: [], obs: "", sinal: 0, ...o });
    return [
        ev("ev1", { data: somarDias(hoje, -5), horaFesta: "15:00", modalidade: "pegue", horaMontagem: "14:00", devolucao: somarDias(hoje, -4), horaDevolucao: "12:00",
            cliente: "Fernanda Lima", telefone: "51999990001", local: "Casa da cliente", endereco: "Gravataí",
            temaId: "minnie-rosa", temaNome: "Minnie Rosa", kitId: "prata", valor: 200, sinal: 200, status: "realizado", obs: "1 aninho da Helena" }),
        ev("ev0", { data: somarDias(hoje, -2), horaFesta: "19:00", modalidade: "pegue", horaMontagem: "14:00", devolucao: somarDias(hoje, -1), horaDevolucao: "12:00",
            cliente: "Bruna Costa", telefone: "51999990007", local: "Casa da cliente", endereco: "Cachoeirinha",
            temaId: "cha-ursinho-azul-bege", temaNome: "Chá Ursinho Azul e Bege", kitId: "ouro", valor: 250, sinal: 250, status: "confirmado", obs: "Chá de bebê do Theo" }),
        ev("ev2", { data: somarDias(hoje, 1), horaFesta: "16:00", modalidade: "pegue", horaMontagem: "14:00", devolucao: somarDias(hoje, 2), horaDevolucao: "12:00",
            cliente: "Juliana Martins", telefone: "51999990002", local: "Salão do condomínio", endereco: "Rua das Acácias, 300 — Cachoeirinha",
            temaId: "homem-aranha", temaNome: "Homem-Aranha", kitId: "prata", adicionais: ["led"], valor: 250, sinal: 100, status: "confirmado", obs: "Número 5 de LED" }),
        ev("ev3", { data: sabado, horaFesta: "20:00", modalidade: "montagem", horaMontagem: "15:00", devolucao: somarDias(sabado, 1), horaDevolucao: "10:00",
            cliente: "Camila (Turma Direito 2026)", telefone: "51999990003", local: "Salão de festas Villa Verde", endereco: "Av. Central, 1500 — Gravataí",
            temaId: "formatura-direito", temaNome: "Formatura Direito", kitId: "diamante", valor: 480, sinal: 240, status: "confirmado", obs: "Chegar 15h para montar. Desmontagem no domingo às 10h." }),
        ev("ev4", { data: sabado, horaFesta: "15:00", modalidade: "pegue", horaMontagem: "10:00", devolucao: somarDias(sabado, 2), horaDevolucao: "12:00",
            cliente: "Patrícia Souza", telefone: "51999990004", local: "Casa da cliente", endereco: "Gravataí",
            temaId: "baby-shark", temaNome: "Baby Shark", kitId: "bronze", adicionais: ["led"], valor: 200, sinal: 0, status: "orcamento", obs: "Vai confirmar até quarta" }),
        ev("ev5", { data: somarDias(hoje, 12), horaFesta: "14:00", modalidade: "montagem", horaMontagem: "10:00", devolucao: somarDias(hoje, 12), horaDevolucao: "19:00",
            cliente: "Aline Rocha", telefone: "51999990005", local: "Espaço Kids Alegria", endereco: "Rua São Luiz, 85 — Gravataí",
            temaId: "cha-ursinha-rosa-bege", temaNome: "Chá Ursinha Rosa e Bege", kitId: "ouro", adicionais: ["escadinha"], valor: 390, sinal: 195, status: "confirmado" }),
        ev("ev6", { data: somarDias(hoje, 20), horaFesta: "21:00", modalidade: "montagem", horaMontagem: "16:00", devolucao: somarDias(hoje, 21), horaDevolucao: "11:00",
            cliente: "Sr. Roberto Alves", telefone: "51999990006", local: "Salão da Igreja São Pedro", endereco: "Rua da Igreja, 10 — Glorinha",
            temaId: "50-anos-azul-royal", temaNome: "50 Anos Azul Royal", kitId: "diamante", valor: 480, sinal: 0, status: "orcamento" }),
    ];
}

// Peças de exemplo (controle de estoque e manutenção)
function gerarPecasDemo() {
    const agora = new Date().toISOString();
    const pc = (id, nome, temaId, quantidade, situacao, obs = "") => ({ id, nome, temaId, quantidade, situacao, obs, atualizadoEm: agora });
    return [
        pc("pc1", "Capa do painel redondo", "homem-aranha", 1, "ok"),
        pc("pc2", "Capas dos 3 cilindros", "homem-aranha", 3, "ok"),
        pc("pc3", "Capa do cilindro médio", "branca-de-neve", 1, "manutencao", "Costura soltando na barra. Levar na costureira."),
        pc("pc4", "Ursinho de pelúcia grande", "cha-ursinho-azul-bege", 1, "danificada", "Voltou com mancha de bolo. Mandar lavar."),
        pc("pc5", "Cubos BABY (letras)", "cha-ursinho-azul-bege", 4, "ok"),
        pc("pc6", "Número de LED 1", "", 2, "ok"),
        pc("pc7", "Painel arco azul royal", "", 1, "ok"),
        pc("pc8", "Escadinha de lembrancinhas", "", 2, "ok"),
        pc("pc9", "Bandeja espelhada redonda", "", 1, "perdida", "Faltou 1 das 6 na devolução de outubro."),
    ];
}

// ─── IMPLEMENTAÇÃO ───────────────────────────────────────────────────────────
const CHAVE_DEMO = "decorize_demo_v2";

const DadosDemo = {
    _ler() {
        let banco = null;
        try { banco = JSON.parse(localStorage.getItem(CHAVE_DEMO)); } catch (e) { banco = null; }
        if (!banco) banco = this._criarBancoInicial();
        let mudou = false; // demonstração aberta antes destas partes existirem
        if (!banco.eventos) { banco.eventos = Object.fromEntries(gerarEventosDemo().map((e) => [e.id, e])); mudou = true; }
        if (!banco.pecas) { banco.pecas = Object.fromEntries(gerarPecasDemo().map((e) => [e.id, e])); mudou = true; }
        // categoria Chá revelação (reunião 12/11) para quem já tinha aberto a demonstração
        if (banco.categorias && !banco.categorias.revelacao && !banco._revelacao) {
            Object.values(banco.categorias).forEach((c) => { if ((Number(c.ordem) || 0) >= 3) c.ordem = (Number(c.ordem) || 0) + 1; });
            banco.categorias.revelacao = SEED_CATEGORIAS.find((c) => c.id === "revelacao");
            const tema = banco.temas && banco.temas["cha-ursinhos-verde-lilas"];
            if (tema) tema.categorias = ["revelacao"];
            banco._revelacao = true; mudou = true;
        }
        if (mudou) this._gravar(banco);
        return banco;
    },
    _gravar(banco) {
        try { localStorage.setItem(CHAVE_DEMO, JSON.stringify(banco)); }
        catch (e) { console.warn("Não foi possível salvar no navegador:", e); alert("Atenção: o navegador está sem espaço para salvar. Tente usar fotos menores."); }
    },
    _criarBancoInicial() {
        const idx = (lista, campo) => Object.fromEntries(lista.map((x, i) => [String(x[campo] ?? i), x]));
        const banco = {
            temas: idx(SEED_TEMAS, "id"),
            categorias: idx(SEED_CATEGORIAS, "id"),
            combos: idx(SEED_COMBOS, "id"),
            adicionais: idx(SEED_ADICIONAIS, "id"),
            configuracoes: { geral: SEED_CONFIG },
            contatos: idx(gerarContatosDemo(), "codigo"),
            eventos: idx(gerarEventosDemo(), "id"),
            pecas: idx(gerarPecasDemo(), "id"),
        };
        try { localStorage.setItem(CHAVE_DEMO, JSON.stringify(banco)); } catch (e) { /* sem armazenamento: segue só na memória */ }
        return banco;
    },
    async listar(col) {
        const banco = this._ler();
        return Object.entries(banco[col] || {}).map(([docId, d]) => ({ ...d, docId }));
    },
    async obter(col, id) {
        const banco = this._ler();
        const d = (banco[col] || {})[String(id)];
        return d ? { ...d, docId: String(id) } : null;
    },
    async salvar(col, id, dados) {
        const banco = this._ler();
        banco[col] = banco[col] || {};
        const limpo = { ...dados }; delete limpo.docId;
        banco[col][String(id)] = { ...(banco[col][String(id)] || {}), ...limpo };
        this._gravar(banco);
    },
    async adicionar(col, dados) {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        await this.salvar(col, id, dados);
        return id;
    },
    async excluir(col, id) {
        const banco = this._ler();
        if (banco[col]) delete banco[col][String(id)];
        this._gravar(banco);
    },
    async entrar(_email, senha) {
        if (senha === SENHA_DEMO) { try { sessionStorage.setItem("decorize_logado", "1"); } catch (e) { /* ok */ } return true; }
        throw new Error("Senha incorreta");
    },
    async sair() { try { sessionStorage.removeItem("decorize_logado"); } catch (e) { /* ok */ } },
    estaLogado(cb) { let ok = false; try { ok = sessionStorage.getItem("decorize_logado") === "1"; } catch (e) { ok = false; } cb(ok); },
    resetar() { try { localStorage.removeItem(CHAVE_DEMO); } catch (e) { /* ok */ } },
};

const DadosFirebase = {
    _db: null,
    _init() {
        if (this._db) return;
        firebase.initializeApp(FIREBASE_CONFIG);
        this._db = firebase.firestore();
    },
    async listar(col) {
        this._init();
        const snap = await this._db.collection(col).get();
        return snap.docs.map((d) => ({ ...d.data(), docId: d.id }));
    },
    async obter(col, id) {
        this._init();
        const d = await this._db.collection(col).doc(String(id)).get();
        return d.exists ? { ...d.data(), docId: d.id } : null;
    },
    async salvar(col, id, dados) {
        this._init();
        const limpo = { ...dados }; delete limpo.docId;
        await this._db.collection(col).doc(String(id)).set(limpo, { merge: true });
    },
    async adicionar(col, dados) {
        this._init();
        const ref = await this._db.collection(col).add(dados);
        return ref.id;
    },
    async excluir(col, id) {
        this._init();
        await this._db.collection(col).doc(String(id)).delete();
    },
    async entrar(email, senha) {
        this._init();
        await firebase.auth().signInWithEmailAndPassword(email, senha);
        return true;
    },
    async sair() { this._init(); await firebase.auth().signOut(); },
    estaLogado(cb) { this._init(); firebase.auth().onAuthStateChanged((u) => cb(!!u)); },
    resetar() {},
};

const MODO_DEMO = !FIREBASE_CONFIG;
const Dados = MODO_DEMO ? DadosDemo : DadosFirebase;

// Valores padrão (usados quando a configuração salva não tem algum campo)
const CONFIG_PADRAO = SEED_CONFIG;

// Utilitários compartilhados
const formatarMoeda = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escaparHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ordenarPor = (campo) => (a, b) => (Number(a[campo]) || 0) - (Number(b[campo]) || 0);

/** Menor preço disponível de um combo (pegue e monte, se houver; senão montagem). */
function precoInicial(combo) {
    const valores = [combo.precoPegueMonte, combo.precoMontagem].map(Number).filter((v) => v > 0);
    return valores.length ? Math.min(...valores) : 0;
}

/** Foto de uma montagem; se ainda não tiver, usa a foto mais completa do tema. */
function fotoDoNivel(tema, nivel) {
    const f = tema.fotos || {};
    if (f[nivel]) return { src: f[nivel], ilustrativa: false };
    const outra = [...NIVEIS].reverse().find((n) => f[n]);
    return outra ? { src: f[outra], ilustrativa: true } : { src: "", ilustrativa: true };
}

function fotoCapa(tema) {
    return fotoDoNivel(tema, "diamante").src;
}
