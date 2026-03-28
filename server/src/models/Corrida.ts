import { Schema, model, Document } from 'mongoose';

export interface ICorrida extends Document {
  userEmail: string;
  valor: number;
  formaPagamento: 'pix' | 'dinheiro' | 'cartao';
  data: Date;
  observacao?: string;
}

const CorridaSchema = new Schema<ICorrida>({
  userEmail: { type: String, required: true, index: true },
  valor: { type: Number, required: true, min: 0 },
  formaPagamento: {
    type: String,
    required: true,
    enum: ['pix', 'dinheiro', 'cartao'],
  },
  data: { type: Date, required: true, default: Date.now },
  observacao: { type: String, trim: true },
});

export const Corrida = model<ICorrida>('Corrida', CorridaSchema);
