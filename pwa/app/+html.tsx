import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Documento HTML raiz usado pelo expo-router no build web estático
 * (`web.output: "static"`). Roda apenas no servidor/build-time — nenhum código
 * daqui é incluído no bundle JS do cliente.
 *
 * Aqui adicionamos tudo que é necessário para a PWA ser instalável:
 * - link para o manifest.json (nome, ícones, display standalone)
 * - meta tags específicas do iOS Safari para "Adicionar à Tela de Início"
 * - viewport com viewport-fit=cover (para telas com notch)
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#E4AF00" />
        {/*
          Força os controles nativos do navegador (inputs de data/hora, scrollbars,
          etc.) a usarem o esquema de cores claro, mesmo em dispositivos com tema
          escuro ativado no sistema — o app usa um design claro fixo, não adaptável.
        */}
        <meta name="color-scheme" content="light" />
        <meta name="description" content="Pra Frente — controle de ganhos e gastos para motoristas de aplicativo." />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Ícones (Android/desktop) */}
        <link rel="icon" href="/icons/icon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icons/icon-512.png" sizes="512x512" type="image/png" />

        {/* iOS Safari — "Adicionar à Tela de Início" */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pra Frente" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />

        {/*
          Desativa o comportamento padrão do react-native-web de resetar o
          scroll da página inteira — necessário para telas com ScrollView
          próprio (mesmo padrão usado pelo template padrão do expo-router).
        */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
  html, body { background-color: #FFFFFF; height: 100%; color-scheme: light; }
  #root { display: flex; height: 100%; flex: 1; }
`;
