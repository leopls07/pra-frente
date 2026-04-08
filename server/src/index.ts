import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';

import authRoutes from './routes/auth';
import corridasRoutes from './routes/corridas';
import abastecimentosRoutes from './routes/abastecimentos';
import relatoriosRoutes from './routes/relatorios';
import metasRoutes from './routes/metas';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🟢';
    console.log(`${color} ${req.method} ${req.path} → ${status} (${ms}ms)`);
    if (req.body && Object.keys(req.body).length > 0) {
      const sanitized = { ...req.body };
      if (sanitized.password) sanitized.password = '***';
      console.log('   body:', JSON.stringify(sanitized));
    }
  });
  next();
});

app.use('/auth', authRoutes);
app.use('/corridas', corridasRoutes);
app.use('/abastecimentos', abastecimentosRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/metas', metasRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('✅ MongoDB conectado');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Falha ao conectar no MongoDB:', err);
    process.exit(1);
  });
