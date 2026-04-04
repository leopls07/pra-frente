import { Schema, model, Document } from 'mongoose';

export type TipoCombustivel = 'gasolina' | 'etanol' ;

export interface IAbastecimento extends Document {
  userId: string;
  userEmail: string;
  valor: number;
  tipoCombustivel: TipoCombustivel;
  data: Date;
}

const AbastecimentoSchema = new Schema<IAbastecimento>({
  userId: { type: String, index: true },
  userEmail: { type: String, required: true, index: true },
  valor: { type: Number, required: true, min: 0 },
  tipoCombustivel: {
    type: String,
    required: true,
    enum: ['gasolina', 'etanol'],
  },
  data: { type: Date, required: true, default: Date.now },
});

export const Abastecimento = model<IAbastecimento>('Abastecimento', AbastecimentoSchema);
