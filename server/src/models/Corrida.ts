import { Schema, model, Document } from 'mongoose';

export interface ICorrida extends Document {
  userId: string;
  userEmail: string;
  valor: number;
  formaPagamento: 'pix' | 'dinheiro' | 'cartao';
  aplicativo?: 'uber' | '99taxi';
  data: Date;
  observacao?: string;
}

const CorridaSchema = new Schema<ICorrida>({
  userId: { type: String, index: true },
  userEmail: { type: String, required: true, index: true },
  valor: { type: Number, required: true, min: 0 },
  formaPagamento: {
    type: String,
    required: true,
    enum: ['pix', 'dinheiro', 'cartao'],
  },
  aplicativo: {
    type: String,
    enum: ['uber', '99taxi'],
  },
  data: { type: Date, required: true, default: Date.now },
  observacao: { type: String, trim: true },
});

export const Corrida = model<ICorrida>('Corrida', CorridaSchema);
