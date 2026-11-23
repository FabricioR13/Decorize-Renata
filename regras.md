# Regras do Firestore — Decorize

Só é necessário quando sair do **modo demonstração** (preencher `FIREBASE_CONFIG` em `dados.js`
e tirar o comentário dos scripts do Firebase no `index.html` e no `admin.html`).

Console do Firebase → **Firestore Database → Regras** → apague o conteúdo → cole o bloco abaixo → **Publicar**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Vitrine pública: qualquer visitante lê, só a Renata (logada) altera
    match /temas/{doc}         { allow read: if true; allow write: if request.auth != null; }
    match /categorias/{doc}    { allow read: if true; allow write: if request.auth != null; }
    match /combos/{doc}        { allow read: if true; allow write: if request.auth != null; }
    match /adicionais/{doc}    { allow read: if true; allow write: if request.auth != null; }
    match /configuracoes/{doc} { allow read: if true; allow write: if request.auth != null; }

    // "Quero esse tema": o visitante só CRIA o registro; ver/alterar é só da Renata
    match /contatos/{doc} {
      allow create: if request.resource.data.status == 'novo';
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

## Passo a passo para colocar no ar com Firebase
1. Criar o projeto no Firebase e copiar o `firebaseConfig` para `FIREBASE_CONFIG` em `dados.js`.
2. **Authentication → Sign-in method → E-mail/senha** (ativar) e criar o usuário da Renata em **Users**.
3. Publicar as regras acima.
4. No Firebase o banco começa vazio: cadastrar categorias, kits, adicionais e temas
   (os dados de exemplo só existem na demonstração). Dica: as categorias podem ser criadas
   copiando `SEED_CATEGORIAS` de `dados.js` direto no console.
