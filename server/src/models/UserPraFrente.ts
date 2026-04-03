import { Schema, model, Document } from 'mongoose';

export interface IUserPraFrente extends Document {
  email: string;
  name: string;
  passwordHash: string;
  confirmado: boolean;
  tokenConfirmacao?: string;
  tokenRedefinicaoSenha?: string;
  createdAt: Date;
}

const UserPraFrenteSchema = new Schema<IUserPraFrente>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    confirmado: { type: Boolean, default: false },
    tokenConfirmacao: { type: String },
    tokenRedefinicaoSenha: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const UserPraFrente = model<IUserPraFrente>('UserPraFrente', UserPraFrenteSchema);
