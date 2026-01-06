# INSTRUÇÕES: Configurar OAuth Google Drive

## PROBLEMA ATUAL
A aplicação não consegue baixar PDFs do Google Drive devido a restrições CORS do browser.

## SOLUÇÃO DEFINITIVA: OAuth 2.0

### 1. Configurar Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: **gen-lang-client-0179408963**
3. Navegue para: APIs e Serviços > Biblioteca
4. Habilite: **Google Drive API**
5. Vá para: APIs e Serviços > Credenciais
6. Clique em: **Criar credenciais > ID do cliente OAuth 2.0**
7. Configure:
   - Tipo de aplicativo: **Aplicativo da Web**
   - Nome: **ConstruCost AI Drive Access**
   - URIs de redirecionamento autorizados:
     - https://construcost-ai-app-82274527518.europe-west1.run.app
     - http://localhost:5173 (para desenvolvimento)
   - Origens JavaScript autorizadas:
     - https://construcost-ai-app-82274527518.europe-west1.run.app
     - http://localhost:5173
8. Salve e copie o **Client ID**

### 2. Adicionar Client ID ao código

Crie um arquivo `.env` na raiz do projeto:
```
VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID_AQUI
```

### 3. O que foi implementado

- ✅ Arquivo `googleAuth.ts` com funções de autenticação
- ✅ Modificado `driveService.ts` para usar Google Drive API autenticada
- ✅ Botão "Conectar Google Drive" no Dashboard
- ✅ Lista de orçamentos ordenada em ordem decrescente

### 4. Como funciona

1. Usuário clica em "Conectar Google Drive"
2. Popup do Google pede permissão para acessar Drive
3. Após autorização, token é salvo no localStorage
4. App usa token para baixar PDFs sem erro CORS
5. PDFs são processados pela IA Gemini
6. Dados extraídos são salvos no sistema

## IMPORTANTE

⚠️ **Sem o Client ID configurado, a funcionalidade de leitura de PDFs não funcionará.**

Após configurar o Client ID, faça um novo deploy para aplicar as mudanças.
