import axios from 'axios';

/**
 * Extrai uma mensagem de erro amigável a partir de qualquer erro capturado em um catch.
 * - Erros de rede (sem resposta): mensagem de conexão
 * - Erros HTTP: usa o campo `message` da API quando disponível; fallback por status code
 * - Outros erros: mensagem genérica
 */
export function tratarErro(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Erro inesperado. Tente novamente.';
  }

  if (!error.response) {
    return 'Sem conexão com o servidor. Verifique sua internet.';
  }

  const { status, data } = error.response;
  const mensagemApi = typeof data?.message === 'string' ? data.message : undefined;

  if (status === 400) return mensagemApi ?? 'Dados inválidos. Verifique as informações.';
  if (status === 401) return 'Sessão expirada. Faça login novamente.';
  if (status === 403) return mensagemApi ?? 'Acesso não autorizado.';
  if (status === 404) return mensagemApi ?? 'Recurso não encontrado.';
  if (status === 409) return mensagemApi ?? 'Conflito com dados existentes.';
  if (status >= 500) return 'Erro no servidor. Tente novamente em instantes.';

  return mensagemApi ?? 'Erro inesperado. Tente novamente.';
}
