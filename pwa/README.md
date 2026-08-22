# Pra Frente — PWA

Progressive Web App do app "Pra Frente" (controle de ganhos e gastos para motoristas de
aplicativo), construída com **Expo + React Native Web + expo-router**, reaproveitando o
máximo possível da lógica e do design do app mobile em `pra-frente/app`.

Este projeto é independente de `pra-frente/app` e `pra-frente/server` — nenhum arquivo
desses dois foi modificado. Ele consome a mesma API REST do `server`.

## Rodando localmente

```bash
npm install
npm run web
```

Isso inicia o Metro bundler em modo web (`expo start --web`), normalmente em
`http://localhost:8081`.

## Build de produção (estático)

```bash
npx expo export -p web
```

Gera os arquivos estáticos em `dist/` (HTML, JS, CSS, assets, `manifest.json`,
`service-worker.js`, ícones). Esse diretório pode ser hospedado em qualquer serviço de
arquivos estáticos.

## Variável de ambiente

`.env` define `EXPO_PUBLIC_API_URL`, a base URL da API (`pra-frente/server`):

```
EXPO_PUBLIC_API_URL=https://pra-frente-production.up.railway.app
```

Em produção, aponte para a URL definitiva de deploy do `server` (Railway ou outro host).
Como o `server` já usa `app.use(cors())` sem restrição de origem, a PWA pode chamá-lo de
qualquer domínio sem configuração adicional no backend.

## Hospedagem

O build estático (`dist/`) pode ser hospedado em:

- **Vercel** ou **Netlify**: aponte o projeto para a pasta `pwa/`, comando de build
  `npx expo export -p web`, diretório de saída `dist`.
- **O próprio `server`**: o Express já serve arquivos estáticos (`/assets`), então é
  possível copiar o conteúdo de `dist/` para uma pasta pública e servir com
  `express.static(...)`, ou usar um serviço separado (recomendado, para não acoplar
  deploys do backend e do frontend).

## Estrutura do projeto

Mesma organização do app mobile, adaptada para web:

```
pwa/
  app/                  rotas do expo-router: (auth)/, (tabs)/, _layout.tsx, +html.tsx
  components/ui/        PasswordInput.tsx (copiado), DateTimeField.tsx (novo, substitui o
                         @react-native-community/datetimepicker que não roda na web)
  constants/            colors.ts, typography.ts, fonts.ts (copiados)
  lib/storage.ts         substitui expo-secure-store por localStorage (mesma assinatura
                         async, mesma chave "pra_frente_jwt")
  services/api.ts        axios (copiado, usando lib/storage no lugar de SecureStore)
  store/useAuthStore.ts  zustand (copiado, usando lib/storage no lugar de SecureStore)
  types/, utils/          copiados sem alteração (puro TS, sem API nativa)
  public/                 manifest.json, service-worker.js, ícones 192/512/180/32/16px
```

## Instalação como PWA

- **Android (Chrome)**: o navegador deve oferecer automaticamente um banner/botão de
  "Instalar app" (ou menu ⋮ → "Instalar app"). Depois de instalado, abre em modo
  standalone (sem barra de endereço).
- **iPhone (Safari)**: **não existe banner automático de instalação no iOS**. O usuário
  precisa abrir o menu de compartilhar (ícone de compartilhamento) e escolher
  **"Adicionar à Tela de Início"** manualmente.

### Limitações conhecidas do iOS Safari

- Sem banner de instalação automático — instalação é sempre manual via compartilhar.
- Push notifications no iOS só funcionam depois que a PWA foi adicionada à Tela de
  Início (não funcionam em uma aba normal do Safari).
- O `localStorage` (usado aqui para guardar o JWT, ver `lib/storage.ts`) pode ser limpo
  pelo Safari após um período de inatividade do site (ITP — Intelligent Tracking
  Prevention). Isso significa que a sessão pode expirar de forma mais agressiva no
  iPhone do que no Android, exigindo login novamente com mais frequência.

## Service worker

`public/service-worker.js` implementa:

- **Cache-first com atualização em segundo plano** para os assets do app shell (JS,
  CSS, imagens, fontes — tudo servido da mesma origem que o Metro/`expo export` gera).
- **Network-only** para qualquer requisição para outra origem (a API em
  `EXPO_PUBLIC_API_URL`, ex.: Railway) — nunca cacheamos dados financeiros do usuário.

Registrado em `app/_layout.tsx` via `navigator.serviceWorker.register('/service-worker.js')`,
guardado por `Platform.OS === 'web'`.

## Verificação já feita nesta implementação

- `npm install` executado com sucesso.
- `npx tsc --noEmit` sem erros.
- `npx expo export -p web` gera `dist/` com sucesso.
- `npx expo start --web` testado brevemente em background, confirmando que o servidor
  responde HTML em `localhost:8081`.

## Ainda falta testar manualmente (não é possível a partir daqui)

- Fluxo real de login/cadastro contra a API em produção, em um navegador de verdade.
- "Adicionar à Tela de Início" no Chrome Android.
- "Adicionar à Tela de Início" no Safari iOS (via menu de compartilhar).
- Confirmar que o app abre em modo standalone (sem barra de endereço) após instalado,
  em ambas as plataformas.
- Confirmar que fechar e reabrir o app instalado mantém o usuário logado (JWT
  persistido em `localStorage`), especialmente no iPhone (ver limitação do ITP acima).
