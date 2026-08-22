/**
 * `Alert.alert` do React Native não tem implementação real em react-native-web
 * (é um no-op: `static alert() {}`) — botões de confirmação que dependem dele
 * silenciosamente não fazem nada nesta PWA. Usamos `window.confirm` como
 * substituto direto para os poucos fluxos de confirmação (sair, excluir).
 */
export function confirmar(titulo: string, mensagem: string): boolean {
  return window.confirm(`${titulo}\n\n${mensagem}`);
}
