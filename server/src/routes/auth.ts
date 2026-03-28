import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserPraFrente } from '../models/UserPraFrente';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
  name: z.string().min(1, 'Nome é obrigatório.'),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { email, password, name } = parsed.data;

  try {
    const existing = await UserPraFrente.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: 'Email já cadastrado.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserPraFrente.create({ email: email.toLowerCase(), name, passwordHash });

    const jwtToken = jwt.sign(
      { email: user.email, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.status(201).json({ jwt: jwtToken, user: { email: user.email, name: user.name } });
  } catch {
    res.status(500).json({ error: 'Erro ao criar conta. Tente novamente.' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const user = await UserPraFrente.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: 'Email ou senha incorretos.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Email ou senha incorretos.' });
      return;
    }

    const jwtToken = jwt.sign(
      { email: user.email, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.json({ jwt: jwtToken, user: { email: user.email, name: user.name } });
  } catch {
    res.status(500).json({ error: 'Erro ao entrar. Tente novamente.' });
  }
});

export default router;
