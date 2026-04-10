import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { Resend } from 'resend';
import { UserPraFrente } from '../models/UserPraFrente';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const registerSchema = z.object({
  email: z.email('Email inválido.').max(100, 'Email muito longo.'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.').max(32, 'Senha deve ter no máximo 32 caracteres.'),
  name: z.string().min(1, 'Nome é obrigatório.').max(32, 'Nome deve ter no máximo 32 caracteres.'),
});

const loginSchema = z.object({
  email: z.email('Email inválido.').max(100, 'Email muito longo.'),
  password: z.string().min(1, 'Senha é obrigatória.').max(32, 'Senha deve ter no máximo 32 caracteres.'),
});

const emailSchema = z.object({
  email: z.email('Email inválido.').max(100, 'Email muito longo.'),
});

const tokenQuerySchema = z.object({
  token: z.string().min(1, 'Token inválido.').max(128, 'Token inválido.'),
});

const redefinirSenhaSchema = z.object({
  token: z.string().min(1, 'Token inválido.').max(128, 'Token inválido.'),
  novaSenha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.').max(32, 'Senha deve ter no máximo 32 caracteres.'),
});

const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual.').max(32, 'Senha deve ter no máximo 32 caracteres.'),
  novaSenha: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.').max(32, 'Senha deve ter no máximo 32 caracteres.'),
});

async function enviarEmailConfirmacao(email: string, name: string, token: string): Promise<void> {
  const apiUrl = process.env.API_URL;
  const link = `${apiUrl}/auth/confirmar-email?token=${token}`;
  const fromEmail = process.env.EMAIL_FROM || 'Pra Frente <noreply@prafrente.app.br>';
  
  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Confirme seu email - Pra Frente',
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; background: #F3F4F6; margin: 0; padding: 32px;">
        <div style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h1 style="color: #1F2937; font-size: 24px; margin-bottom: 8px;">Olá, ${name}!</h1>
          <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
            Bem-vindo ao <strong>Pra Frente</strong>! Para acessar o app, confirme seu email clicando no botão abaixo.
          </p>
          <a href="${link}" style="display: inline-block; background: #E4AF00; color: #1F1F1F; font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 12px; padding: 16px 32px;">
            Confirmar email
          </a>
          <p style="color: #9CA3AF; font-size: 14px; margin-top: 32px;">
            Se você não criou uma conta no Pra Frente, ignore este email.
          </p>
        </div>
      </body>
      </html>
    `,
  });
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { email, password, name } = parsed.data;

  try {
    const existing = await UserPraFrente.findOne({ email: { $eq: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ message: 'Email já cadastrado.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const tokenConfirmacao = crypto.randomUUID();

    await UserPraFrente.create({
      email: email.toLowerCase(),
      name,
      passwordHash,
      confirmado: false,
      tokenConfirmacao,
    });

    await enviarEmailConfirmacao(email.toLowerCase(), name, tokenConfirmacao);

    res.status(201).json({
      message: 'Cadastro realizado! Enviamos um email de confirmação. Verifique sua caixa de entrada.',
    });
  } catch {
    res.status(500).json({ message: 'Erro ao criar conta. Tente novamente.' });
  }
});

router.get('/confirmar-email', async (req: Request, res: Response): Promise<void> => {
  const parsed = tokenQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).send(paginaHTML('erro', 'Link inválido. Solicite um novo email de confirmação no app.'));
    return;
  }

  const { token } = parsed.data;

  try {
    const user = await UserPraFrente.findOne({ tokenConfirmacao: { $eq: token } });

    if (!user) {
      res.status(404).send(paginaHTML('erro', 'Link inválido ou expirado. Solicite um novo email de confirmação no app.'));
      return;
    }

    user.confirmado = true;
    user.tokenConfirmacao = undefined;
    await user.save();

    res.send(paginaHTML('sucesso', 'Email confirmado! Você já pode fazer login no app.'));
  } catch {
    res.status(500).send(paginaHTML('erro', 'Erro ao confirmar email. Tente novamente.'));
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
    const user = await UserPraFrente.findOne({ email: { $eq: email.toLowerCase() } });
    if (!user) {
      res.status(401).json({ message: 'Email ou senha incorretos.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: 'Email ou senha incorretos.' });
      return;
    }

    if (!user.confirmado) {
      res.status(403).json({
        error: 'Confirme seu email antes de acessar. Verifique sua caixa de entrada.',
        codigo: 'EMAIL_NAO_CONFIRMADO',
      });
      return;
    }

    const jwtToken = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '720h' }
    );

    res.json({ jwt: jwtToken, user: { email: user.email, name: user.name } });
  } catch {
    res.status(500).json({ message: 'Erro ao entrar. Tente novamente.' });
  }
});

router.post('/reenviar-confirmacao', async (req: Request, res: Response): Promise<void> => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { email } = parsed.data;

  try {
    const user = await UserPraFrente.findOne({ email: { $eq: email.toLowerCase() } });

    if (!user || user.confirmado) {
      // Resposta genérica para não expor se o email existe
      res.json({ message: 'Se o email estiver cadastrado e pendente de confirmação, você receberá um novo link.' });
      return;
    }

    const tokenConfirmacao = crypto.randomUUID();
    user.tokenConfirmacao = tokenConfirmacao;
    await user.save();

    await enviarEmailConfirmacao(user.email, user.name, tokenConfirmacao);

    res.json({ message: 'Se o email estiver cadastrado e pendente de confirmação, você receberá um novo link.' });
  } catch {
    res.status(500).json({ message: 'Erro ao reenviar email. Tente novamente.' });
  }
});

router.post('/esqueceu-senha', async (req: Request, res: Response): Promise<void> => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { email } = parsed.data;

  try {
    const user = await UserPraFrente.findOne({ email: { $eq: email.toLowerCase().trim() } });

    if (user) {
      const tokenRedefinicaoSenha = crypto.randomUUID();
      user.tokenRedefinicaoSenha = tokenRedefinicaoSenha;
      await user.save();

      const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
      const link = `${apiUrl}/auth/redefinir-senha?token=${tokenRedefinicaoSenha}`;
      const fromEmail = process.env.EMAIL_FROM || 'Pra Frente <noreply@prafrente.app.br>';

      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Redefinição de senha - Pra Frente',
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: Arial, sans-serif; background: #F3F4F6; margin: 0; padding: 32px;">
            <div style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <h1 style="color: #1F2937; font-size: 24px; margin-bottom: 8px;">Olá, ${user.name}!</h1>
              <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Pra Frente</strong>.
                Clique no botão abaixo para criar uma nova senha.
              </p>
              <a href="${link}" style="display: inline-block; background: #E4AF00; color: #1F1F1F; font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 12px; padding: 16px 32px;">
                Redefinir senha
              </a>
              <p style="color: #9CA3AF; font-size: 14px; margin-top: 32px;">
                Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanece a mesma.
              </p>
            </div>
          </body>
          </html>
        `,
      });
    }

    // Resposta genérica — não revela se o email existe
    res.json({ message: 'Se o email estiver cadastrado, você receberá as instruções em instantes.' });
  } catch {
    res.status(500).json({ message: 'Erro ao processar solicitação. Tente novamente.' });
  }
});

router.get('/redefinir-senha', async (req: Request, res: Response): Promise<void> => {
  const parsed = tokenQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).send(paginaHTML('erro', 'Link inválido. Solicite uma nova redefinição de senha no app.'));
    return;
  }

  const { token } = parsed.data;

  try {
    const user = await UserPraFrente.findOne({ tokenRedefinicaoSenha: { $eq: token } });

    if (!user) {
      res.status(404).send(paginaHTML('erro', 'Link inválido ou expirado. Solicite uma nova redefinição de senha no app.'));
      return;
    }

    res.send(paginaRedefinirSenha(token));
  } catch {
    res.status(500).send(paginaHTML('erro', 'Erro ao processar solicitação. Tente novamente.'));
  }
});

router.post('/alterar-senha', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = alterarSenhaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { senhaAtual, novaSenha } = parsed.data;

  try {
    const user = await UserPraFrente.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado.' });
      return;
    }

    const senhaCorreta = await bcrypt.compare(senhaAtual, user.passwordHash);
    if (!senhaCorreta) {
      res.status(400).json({ message: 'Senha atual incorreta.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(novaSenha, 10);
    await user.save();

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch {
    res.status(500).json({ message: 'Erro ao alterar senha. Tente novamente.' });
  }
});

router.post('/redefinir-senha', async (req: Request, res: Response): Promise<void> => {
  const parsed = redefinirSenhaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { token, novaSenha } = parsed.data;

  try {
    const user = await UserPraFrente.findOne({ tokenRedefinicaoSenha: { $eq: token } });

    if (!user) {
      res.status(404).json({ message: 'Link inválido ou expirado. Solicite uma nova redefinição de senha no app.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(novaSenha, 10);
    user.tokenRedefinicaoSenha = undefined;
    await user.save();

    res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login no app.' });
  } catch {
    res.status(500).json({ message: 'Erro ao redefinir senha. Tente novamente.' });
  }
});

function paginaRedefinirSenha(token: string): string {
  const html = fs.readFileSync(
    path.join(__dirname, '../templates/redefinir-senha.html'),
    'utf-8'
  );
  return html.replace('{{token}}', token);
}

function paginaHTML(tipo: 'sucesso' | 'erro', mensagem: string): string {
  const html = fs.readFileSync(
    path.join(__dirname, '../templates/status.html'),
    'utf-8'
  );
  const cor = tipo === 'sucesso' ? '#1A6B3C' : '#C0392B';
  const titulo = tipo === 'sucesso' ? 'Tudo certo!' : 'Algo deu errado';
  return html
    .replace('{{cor_titulo}}', cor)
    .replace('{{titulo}}', titulo)
    .replace('{{mensagem}}', mensagem);
}

export default router;
