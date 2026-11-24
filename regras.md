# Regras do Firestore — Decorize

Só é necessário quando sair do **modo demonstração**. Copie o bloco abaixo e cole no Console do Firebase:

**Firestore Database → Regras** → apague o conteúdo atual → cole isto → **Publicar**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Quem pode mexer no painel: só os e-mails que estão na coleção "admins"
    // (um documento por e-mail, com o e-mail em letras minúsculas como ID).
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.token.email.lower()));
    }

    // A lista de acesso: cada pessoa logada só vê o PRÓPRIO item (para o painel saber se ela
    // tem acesso). Ninguém altera pelo site — só pelo Console do Firebase.
    match /admins/{email} {
      allow read: if request.auth != null && request.auth.token.email.lower() == email;
      allow write: if false;
    }

    // Vitrine pública: qualquer visitante LÊ (o catálogo precisa), só admin altera
    match /temas/{doc}      { allow read: if true; allow write: if isAdmin(); }
    match /categorias/{doc} { allow read: if true; allow write: if isAdmin(); }
    match /combos/{doc}     { allow read: if true; allow write: if isAdmin(); }
    match /adicionais/{doc} { allow read: if true; allow write: if isAdmin(); }
    // Fotos extras de cada montagem (uma foto por registro, carregadas ao abrir o tema)
    match /galeria/{doc}    { allow read: if true; allow write: if isAdmin(); }

    // Configurações: "geral" é pública (textos, WhatsApp, Instagram, vídeos).
    // "privado" tem CPF/CNPJ, Pix, endereço e cláusulas do contrato: só admin lê.
    match /configuracoes/{doc} {
      allow read: if doc != 'privado' || isAdmin();
      allow write: if isAdmin();
    }

    // "Quero esse tema": o visitante só CRIA o registro, com os campos certos e tamanho limitado.
    // Ver, alterar e apagar é só admin.
    match /contatos/{doc} {
      allow create: if request.resource.data.keys().hasOnly(
                         ['codigo', 'status', 'criadoEm', 'tema', 'combo', 'modalidade', 'adicionais', 'total'])
                    && request.resource.data.status == 'novo'
                    && request.resource.data.codigo == doc
                    && doc.size() <= 12
                    && request.resource.data.criadoEm is string && request.resource.data.criadoEm.size() <= 40
                    && request.resource.data.tema is string && request.resource.data.tema.size() <= 120
                    && request.resource.data.combo is string && request.resource.data.combo.size() <= 60
                    && request.resource.data.modalidade is string && request.resource.data.modalidade.size() <= 60
                    && request.resource.data.adicionais is list && request.resource.data.adicionais.size() <= 20
                    && request.resource.data.total is number;
      allow read, update, delete: if isAdmin();
    }

    // Dados internos (clientes, endereços, valores e peças): só admin. Nada público.
    match /eventos/{doc} { allow read, write: if isAdmin(); }
    match /pecas/{doc}   { allow read, write: if isAdmin(); }

    // Auto-cadastro da cliente: cada link é um registro com código aleatório (o ID do documento).
    // Sem login, só dá para ABRIR um link específico enquanto ele está aguardando e no prazo,
    // e ENVIAR os dados uma vez (nome, CPF, WhatsApp e endereço, com tamanho limitado).
    // Ninguém lista os links nem lê dados já enviados. Depois que o painel importa, o registro é apagado.
    match /cadastros/{token} {
      allow get: if isAdmin()
        || (resource.data.status == 'aguardando' && request.time.toMillis() < resource.data.expiraEm);
      allow list, create, delete: if isAdmin();
      allow update: if isAdmin() || (
        resource.data.status == 'aguardando'
        && request.time.toMillis() < resource.data.expiraEm
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'dados', 'preenchidoEm'])
        && request.resource.data.status == 'preenchido'
        && request.resource.data.dados.keys().hasOnly(['nome', 'cpf', 'telefone', 'endereco'])
        && request.resource.data.dados.nome is string && request.resource.data.dados.nome.size() <= 80
        && request.resource.data.dados.cpf is string && request.resource.data.dados.cpf.size() <= 14
        && request.resource.data.dados.telefone is string && request.resource.data.dados.telefone.size() <= 15
        && request.resource.data.dados.endereco is string && request.resource.data.dados.endereco.size() <= 200
        && request.resource.data.preenchidoEm is string && request.resource.data.preenchidoEm.size() <= 40
      );
    }

    // Qualquer outra coleção que surgir: fechada por padrão
    match /{caminho=**} { allow read, write: if false; }
  }
}
```

## O que essas regras fazem

- **admins**: a lista de quem entra no painel. Ter usuário e senha no Authentication **não basta** — o e-mail precisa estar nesta lista. O painel confere isso no login e desconecta quem não está.
- **temas, categorias, combos, adicionais, galeria, configuracoes/geral**: o catálogo lê sem login; só admin altera. A **galeria** guarda as fotos extras de cada montagem, uma por registro (um tema no Firebase tem limite de 1 MB).
- **configuracoes/privado**: CPF/CNPJ, chave Pix, endereço e cláusulas do contrato. Só admin lê — não aparece para quem abre o código do site.
- **contatos**: cada clique em "Quero esse tema". O site só cria (com os campos e tamanhos certos); só admin vê.
- **eventos e pecas**: agenda (nomes, telefones, endereços, valores) e controle das peças. Só admin.
- **cadastros**: links de auto-cadastro que a Renata manda pela agenda. A cliente só abre o próprio link (código aleatório de 28 letras, que vale 7 dias e uma vez só) e envia nome, CPF, WhatsApp e endereço. Ninguém consegue listar os links nem ler dados já enviados. O painel passa os dados para o evento e apaga o registro.
- Qualquer outra coleção fica fechada.

## Lista de acesso ao painel (admins)

Devem ter acesso: **tf.solutions@outlook.com.br** (suporte TF Solutions) e o e-mail da Renata.

**Liberar alguém** (no Console do Firebase):
1. **Authentication → Usuários → Adicionar usuário**: e-mail e uma senha provisória (a pessoa troca depois em "Esqueci minha senha", na tela de login do painel).
2. **Firestore Database → coleção `admins` → Adicionar documento** → **ID do documento** = o e-mail, todo em minúsculas → um campo qualquer, por exemplo `nome` (texto) = nome da pessoa → **Salvar**.

**Tirar o acesso**: apague o documento do e-mail na coleção `admins`.

**Importante**: em **Authentication → Configurações → Ações do usuário**, deixe **desmarcado** "Ativar criação (inscrição)". Assim ninguém cria conta sozinho pelo site.

## Passo a passo para sair do modo demonstração

1. Criar o projeto no Firebase (plano Spark, gratuito) e copiar o `firebaseConfig` para `FIREBASE_CONFIG` em `dados.js`.
2. Tirar o comentário das 3 linhas de scripts do Firebase no `index.html` e no `admin.html`.
3. **Authentication → Sign-in method → E-mail/senha** (ativar), criar os usuários e desmarcar "Ativar criação (inscrição)".
4. Criar a coleção `admins` com os e-mails (acima) e publicar as regras.
5. No Firebase o banco começa vazio: cadastrar categorias, kits, adicionais e temas pelo painel
   (os dados de exemplo só existem na demonstração). Os dados do contrato vão em
   **Configurações → Recibos e contratos** (ficam no documento privado).
6. Nas configurações do domínio no Firebase (**Authentication → Configurações → Domínios autorizados**),
   adicionar `decorize.tfsolutions.com.br`.
