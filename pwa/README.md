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
npm run build
```

(equivalente a `npx expo export -p web`, mas dispara também o script `postbuild` — ver
nota sobre `.vercelignore` na seção de Hospedagem). Gera os arquivos estáticos em `dist/`
(HTML, JS, CSS, assets, `manifest.json`, `service-worker.js`, ícones). Esse diretório pode
ser hospedado em qualquer serviço de arquivos estáticos.

Normalmente você **não precisa rodar esse comando manualmente** para publicar no Vercel —
veja a seção de Hospedagem, o Vercel builda o projeto sozinho.

## Variável de ambiente

`.env` define `EXPO_PUBLIC_API_URL`, a base URL da API (`pra-frente/server`):

```
EXPO_PUBLIC_API_URL=https://pra-frente-production.up.railway.app
```

Em produção, aponte para a URL definitiva de deploy do `server` (Railway ou outro host).
Como o `server` já usa `app.use(cors())` sem restrição de origem, a PWA pode chamá-lo de
qualquer domínio sem configuração adicional no backend.

## Hospedagem

### Vercel (configurado e em produção)

O projeto está publicado em **https://pra-frente-pwa.vercel.app**, projeto Vercel
`pra-frente-pwa`. Deploy:

```bash
cd pra-frente/pwa
npx vercel --prod
```

Não é preciso rodar `npm run build` manualmente antes — **o Vercel builda o projeto no
próprio ambiente dele**, usando a configuração em `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null,
  "cleanUrls": true,
  "trailingSlash": false
}
```

Duas armadilhas que já mordemos aqui e por isso ficam documentadas:

1. **`node_modules` no `.gitignore` engolindo os assets de fonte.** O `expo export`
   gera as fontes de terceiros (ícones do `@expo/vector-icons` e as fontes Inter do
   `@expo-google-fonts`) dentro de `dist/assets/node_modules/...` — o caminho espelha o
   import do pacote, não é o `node_modules` real do projeto. A regra `node_modules/` no
   `.gitignore` (sem barra inicial) casa com qualquer pasta com esse nome em qualquer
   profundidade, então um deploy que sobe a pasta `dist/` já pronta via CLI
   (`vercel deploy` de dentro de `dist/`) tinha esses arquivos **silenciosamente
   excluídos do upload** (404 em produção, mesmo existindo localmente). Duas camadas de
   proteção contra isso:
   - O script `postbuild` do `package.json` cria um `dist/.vercelignore` vazio depois de
     cada `npm run build` — um `.vercelignore` presente (mesmo vazio) substitui
     completamente as regras do `.gitignore` para aquele deploy, então nada fica de fora.
     Isso importa só se algum dia você voltar a fazer deploy subindo a pasta `dist/`
     pronta em vez de deixar o Vercel buildar.
   - A abordagem atual (Vercel builda sozinho, a partir do código-fonte em `pwa/`) evita
     o problema de outra forma: os arquivos gerados pelo build nunca passam pelo filtro
     de "o que subir do meu computador", porque são criados depois, dentro do container
     do Vercel — só o código-fonte (que respeita o `.gitignore` normalmente, e não deve
     mesmo incluir `node_modules/` de verdade) é enviado.
2. **Clean URLs.** O `expo-router` em modo estático gera um arquivo `.html` real por
   rota (`login.html`, `nova-corrida.html`, etc.), e a navegação do app usa URLs sem
   extensão (`/login`, `/nova-corrida`). Sem `"cleanUrls": true`, o Vercel serve
   `/login.html` com 200 mas `/login` com 404 — quebra qualquer navegação direta,
   recarregamento de página ou link compartilhado fora da raiz.

**Variável de ambiente**: como quem builda agora é o Vercel, `EXPO_PUBLIC_API_URL`
também está configurada como Environment Variable do projeto (Production), além de
existir no `.env` local — não dependa só do `.env` ser enviado no upload.

### Alternativas

- **Netlify**: mesma ideia — apontar para a pasta `pwa/`, build command `npm run build`,
  output directory `dist`, e configurar clean URLs equivalente (`_redirects` ou
  `netlify.toml` com `pretty_urls`).
- **O próprio `server`**: o Express já serve arquivos estáticos (`/assets`), então é
  possível copiar o conteúdo de `dist/` para uma pasta pública e servir com
  `express.static(...)`, ou usar um serviço separado (recomendado, para não acoplar
  deploys do backend e do frontend).

## Estrutura do projeto

Mesma organização do app mobile, adaptada para web:

```
pwa/
  app/                  rotas do expo-router: (auth)/, (tabs)/, _layout.tsx, +html.tsx
  components/ui/        PasswordInput.tsx (copiado), DateTimeField.tsx (substitui o
                         @react-native-community/datetimepicker que não roda na web),
                         InstallBanner.tsx (banner de instalação, ver seção PWA abaixo)
  hooks/useInstallPrompt.ts  captura o evento beforeinstallprompt e detecta iOS/standalone
  constants/            colors.ts, typography.ts, fonts.ts (copiados)
  lib/storage.ts         substitui expo-secure-store por localStorage (mesma assinatura
                         async, mesma chave "pra_frente_jwt")
  services/api.ts        axios (copiado, usando lib/storage no lugar de SecureStore)
  store/useAuthStore.ts  zustand (copiado, usando lib/storage no lugar de SecureStore)
  types/                  copiado sem alteração (puro TS, sem API nativa)
  utils/                  dataBRT.ts, tratarErro.ts (copiados); confirmar.ts (novo — ver
                         seção "Bugs corrigidos" abaixo)
  public/                 manifest.json, service-worker.js, ícones 192/512/180/32/16px
  vercel.json             configuração de build/deploy do Vercel (ver Hospedagem)
```

## Bugs corrigidos após o primeiro deploy

Dois bugs reais de portabilidade web foram encontrados testando o app publicado (não
apareciam em `expo start --web` da mesma forma, ou passaram despercebidos até o teste
manual):

1. **Nenhum ícone aparecia.** No app nativo (`pra-frente/app`), as fontes dos ícones
   (`@expo/vector-icons`) são vinculadas automaticamente no build nativo — na web isso não
   acontece sozinho, é preciso carregar as fontes explicitamente com `Font.loadAsync`
   (via o hook `useFonts`). Sem isso, os glyphs (caracteres Unicode de área privada) não
   tinham fonte nenhuma para serem desenhados. Corrigido em `app/_layout.tsx`, incluindo
   `Ionicons.font`, `MaterialIcons.font` e `MaterialCommunityIcons.font` no mesmo
   `useFonts` que já carrega as fontes Inter.
2. **Botão "Sair" (e confirmação de exclusão em Registros) não faziam nada.**
   `Alert.alert(...)` do React Native é um **no-op** em `react-native-web`
   (`static alert() {}` — não mostra diálogo nem chama callback). Substituído por
   `window.confirm(...)` através do helper `utils/confirmar.ts`, usado em
   `(tabs)/configuracoes.tsx` (handleSair) e `(tabs)/registros.tsx` (confirmarExclusao).

## Instalação como PWA

Além do suporte nativo do navegador, o app mostra seu próprio banner de instalação
(`components/ui/InstallBanner.tsx` + `hooks/useInstallPrompt.ts`), montado no root
layout e visível em qualquer tela:

- **Android (Chrome)**: o Chrome só dispara o banner automático (`beforeinstallprompt`)
  depois de algum sinal de engajamento do usuário — não no primeiro carregamento. Em vez
  de depender só disso, o app captura esse evento e mostra seu próprio botão "Instalar"
  a qualquer momento (também disponível manualmente via menu ⋮ → "Instalar app").
  Depois de instalado, abre em modo standalone (sem barra de endereço).
- **iPhone (Safari)**: **não existe API de instalação programática no iOS** — o banner
  mostra a instrução manual ("Toque em Compartilhar e depois em 'Adicionar à Tela de
  Início'"). O usuário também pode fazer isso a qualquer momento pelo ícone de
  compartilhar do Safari.
- O banner se esconde sozinho quando o app já está instalado (modo standalone) e lembra
  se o usuário já dispensou (via `localStorage`, mesma chave de dismissal persistida).

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

**Nota**: a estratégia é cache-first para o app shell (mesma origem), com atualização em
segundo plano. Isso significa que, depois de um novo deploy, um usuário que já tinha o
site aberto/instalado antes pode continuar vendo a versão em cache por um carregamento
a mais, até a atualização em segundo plano terminar e a próxima visita pegar a versão
nova. Normal, não é bug — só não espere ver uma mudança "instantaneamente" sem recarregar
de novo.

## Verificação já feita nesta implementação

- `npm install`, `npx tsc --noEmit` sem erros.
- `npm run build` (`expo export -p web`) gera `dist/` com sucesso, 20 rotas estáticas.
- Deploy real em produção verificado direto por HTTP (não só suposição): `/`, `/login`,
  `/nova-corrida` (clean URLs), `manifest.json`, `service-worker.js`, ícones do PWA, a
  fonte do Ionicons (389 KB) e as fontes Inter — todos retornando 200 a partir do bundle
  JS realmente publicado em `https://pra-frente-pwa.vercel.app`.

## Ainda falta testar manualmente (não é possível a partir daqui)

- Fluxo real de login/cadastro contra a API em produção, em um navegador de verdade.
- "Adicionar à Tela de Início" no Chrome Android (banner automático ou pelo botão
  "Instalar" do InstallBanner) e no Safari iOS (via menu de compartilhar).
- Confirmar que o app abre em modo standalone (sem barra de endereço) após instalado,
  em ambas as plataformas.
- Confirmar que fechar e reabrir o app instalado mantém o usuário logado (JWT
  persistido em `localStorage`), especialmente no iPhone (ver limitação do ITP acima).
