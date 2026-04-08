export type TipoCombustivel = 'gasolina' | 'etanol';
export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao';

export interface Usuario {
  email: string;
  name: string;
}

export interface Corrida {
  _id: string;
  userId: string;
  userEmail: string;
  valor: number;
  formaPagamento: FormaPagamento;
  data: string;
  observacao?: string;
}

export interface Abastecimento {
  _id: string;
  userId: string;
  userEmail: string;
  valor: number;
  tipoCombustivel: TipoCombustivel;
  data: string;
}

export interface PaginadoResposta<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
