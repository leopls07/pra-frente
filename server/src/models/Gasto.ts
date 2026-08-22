import { Schema, model, Document } from 'mongoose';

export type CategoriaGasto = 'alimentacao' | 'manutencao' | 'caixinha' | 'outros';

export interface IGasto extends Document {
  userId: string;
  userEmail: string;
  valor: number;
  categoria: CategoriaGasto;
  descricao?: string;
  data: Date;
}

const GastoSchema = new Schema<IGasto>(
  {
    userId: { type: String, index: true },
    userEmail: { type: String, required: true, index: true },
    valor: { type: Number, required: true, min: 0 },
    categoria: {
      type: String,
      required: true,
      enum: ['alimentacao', 'manutencao', 'caixinha', 'outros'],
    },
    descricao: { type: String, trim: true },
    data: { type: Date, required: true, default: Date.now },
  },
  { collection: 'gastos' }
);

export const Gasto = model<IGasto>('Gasto', GastoSchema);
