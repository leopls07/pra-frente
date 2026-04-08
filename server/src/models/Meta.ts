import { Schema, model, Document } from 'mongoose';

export interface IMeta extends Document {
  userId: string;
  metaDiaria: number;
  diasTrabalhoSemana: number;
  metaSemanal: number;
  metaMensal: number;
  metaSemanalEditada: boolean;
  metaMensalEditada: boolean;
}

const MetaSchema = new Schema<IMeta>({
  userId: { type: String, required: true, unique: true },
  metaDiaria: { type: Number, required: true, min: 0 },
  diasTrabalhoSemana: { type: Number, required: true, min: 1, max: 7 },
  metaSemanal: { type: Number, required: true, min: 0 },
  metaMensal: { type: Number, required: true, min: 0 },
  metaSemanalEditada: { type: Boolean, default: false },
  metaMensalEditada: { type: Boolean, default: false },
});

export const Meta = model<IMeta>('Meta', MetaSchema);
