import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { Resend } from 'resend';
import { UserPraFrente } from '../models/UserPraFrente';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const registerSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
  name: z.string().min(1, 'Nome é obrigatório.'),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
});

async function enviarEmailConfirmacao(email: string, name: string, token: string): Promise<void> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
  const link = `${apiUrl}/auth/confirmar-email?token=${token}`;
  
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'leonardobento233@gmail.com',
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
          <a href="${link}" style="display: inline-block; background: #2563EB; color: #FFFFFF; font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 12px; padding: 16px 32px;">
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
    const existing = await UserPraFrente.findOne({ email: email.toLowerCase() });
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
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    res.status(400).send(paginaHTML('erro', 'Link inválido. Solicite um novo email de confirmação no app.'));
    return;
  }

  try {
    const user = await UserPraFrente.findOne({ tokenConfirmacao: token });

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
    const user = await UserPraFrente.findOne({ email: email.toLowerCase() });
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
      { email: user.email, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.json({ jwt: jwtToken, user: { email: user.email, name: user.name } });
  } catch {
    res.status(500).json({ message: 'Erro ao entrar. Tente novamente.' });
  }
});

router.post('/reenviar-confirmacao', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ message: 'Email é obrigatório.' });
    return;
  }

  try {
    const user = await UserPraFrente.findOne({ email: email.toLowerCase() });

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
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ message: 'Email é obrigatório.' });
    return;
  }

  try {
    const user = await UserPraFrente.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      const tokenRedefinicaoSenha = crypto.randomUUID();
      user.tokenRedefinicaoSenha = tokenRedefinicaoSenha;
      await user.save();

      const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
      const link = `${apiUrl}/auth/redefinir-senha?token=${tokenRedefinicaoSenha}`;

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'leonardobento233@gmail.com',
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
              <a href="${link}" style="display: inline-block; background: #2563EB; color: #FFFFFF; font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 12px; padding: 16px 32px;">
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
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    res.status(400).send(paginaHTML('erro', 'Link inválido. Solicite uma nova redefinição de senha no app.'));
    return;
  }

  try {
    const user = await UserPraFrente.findOne({ tokenRedefinicaoSenha: token });

    if (!user) {
      res.status(404).send(paginaHTML('erro', 'Link inválido ou expirado. Solicite uma nova redefinição de senha no app.'));
      return;
    }

    res.send(paginaRedefinirSenha(token));
  } catch {
    res.status(500).send(paginaHTML('erro', 'Erro ao processar solicitação. Tente novamente.'));
  }
});

router.post('/redefinir-senha', async (req: Request, res: Response): Promise<void> => {
  const { token, novaSenha } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ message: 'Token inválido.' });
    return;
  }
  if (!novaSenha || typeof novaSenha !== 'string' || novaSenha.length < 6) {
    res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });
    return;
  }

  try {
    const user = await UserPraFrente.findOne({ tokenRedefinicaoSenha: token });

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
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redefinir senha — Pra Frente</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: #F3F4F6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 32px; }
        .card { max-width: 420px; width: 100%; background: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        h1 { color: #1F2937; font-size: 22px; margin-bottom: 8px; }
        p.sub { color: #6B7280; font-size: 15px; margin-bottom: 28px; line-height: 1.5; }
        label { display: block; font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        input { width: 100%; padding: 14px 16px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 16px; color: #111827; background: #F9FAFB; margin-bottom: 16px; outline: none; }
        input:focus { border-color: #2563EB; background: #fff; }
        button { width: 100%; background: #2563EB; color: #fff; font-size: 17px; font-weight: bold; border: none; border-radius: 12px; padding: 16px; cursor: pointer; margin-top: 4px; }
        button:disabled { background: #93C5FD; cursor: not-allowed; }
        .mensagem { margin-top: 20px; padding: 14px 16px; border-radius: 10px; font-size: 15px; text-align: center; display: none; }
        .sucesso { background: #DCFCE7; color: #166534; display: block; }
        .erro-msg { background: #FEE2E2; color: #991B1B; display: block; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Redefinir senha</h1>
        <p class="sub">Digite sua nova senha abaixo.</p>
        <form id="form">
          <label for="novaSenha">Nova senha</label>
          <input type="password" id="novaSenha" placeholder="Mínimo 6 caracteres" minlength="6" required />
          <label for="confirmar">Confirmar nova senha</label>
          <input type="password" id="confirmar" placeholder="Repita a senha" required />
          <button type="submit" id="btn">Salvar nova senha</button>
        </form>
        <div class="mensagem" id="mensagem"></div>
      </div>
      <script>
        document.getElementById('form').addEventListener('submit', async function(e) {
          e.preventDefault();
          var novaSenha = document.getElementById('novaSenha').value;
          var confirmar = document.getElementById('confirmar').value;
          var msg = document.getElementById('mensagem');
          var btn = document.getElementById('btn');
          msg.className = 'mensagem';
          msg.style.display = 'none';
          if (novaSenha !== confirmar) {
            msg.textContent = 'As senhas não coincidem.';
            msg.className = 'mensagem erro-msg';
            return;
          }
          btn.disabled = true;
          btn.textContent = 'Salvando...';
          try {
            var res = await fetch('/auth/redefinir-senha', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: '${token}', novaSenha: novaSenha })
            });
            var data = await res.json();
            if (res.ok) {
              document.getElementById('form').style.display = 'none';
              msg.textContent = data.message;
              msg.className = 'mensagem sucesso';
            } else {
              msg.textContent = data.error || 'Erro ao redefinir senha.';
              msg.className = 'mensagem erro-msg';
              btn.disabled = false;
              btn.textContent = 'Salvar nova senha';
            }
          } catch {
            msg.textContent = 'Erro de conexão. Tente novamente.';
            msg.className = 'mensagem erro-msg';
            btn.disabled = false;
            btn.textContent = 'Salvar nova senha';
          }
        });
      </script>
    </body>
    </html>
  `;
}

function paginaHTML(tipo: 'sucesso' | 'erro', mensagem: string): string {
  const cor = tipo === 'sucesso' ? '#16A34A' : '#DC2626';
  const icone = tipo === 'sucesso' ? '✅' : '❌';
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pra Frente</title>
    </head>
    <body style="font-family: Arial, sans-serif; background: #F3F4F6; margin: 0; padding: 32px; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
      <div style="max-width: 420px; width: 100%; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 48px 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center;">
        <div style="font-size: 64px; margin-bottom: 24px;">${icone}</div>
        <h1 style="color: ${cor}; font-size: 22px; margin-bottom: 16px;">
          ${tipo === 'sucesso' ? 'Tudo certo!' : 'Algo deu errado'}
        </h1>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">${mensagem}</p>
      </div>
    </body>
    </html>
  `;
}

export default router;
