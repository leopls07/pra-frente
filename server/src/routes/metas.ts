import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Meta } from '../models/Meta';

const router = Router();
router.use(authMiddleware);

const metaSchema = z.object({
  metaDiaria: z.number().min(0),
  diasTrabalhoSemana: z.number().int().min(1).max(7),
  metaSemanal: z.number().min(0),
  metaMensal: z.number().min(0),
  metaSemanalEditada: z.boolean().default(false),
  metaMensalEditada: z.boolean().default(false),
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meta = await Meta.findOne({ userId: req.user!.id });
    if (!meta) {
      res.status(404).json({ message: 'Metas não encontradas.' });
      return;
    }
    res.json(meta);
  } catch {
    res.status(500).json({ message: 'Erro ao buscar metas.' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parse = metaSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ message: 'Dados inválidos.', details: parse.error.issues });
      return;
    }

    const { metaDiaria, diasTrabalhoSemana, metaSemanal, metaMensal, metaSemanalEditada, metaMensalEditada } = parse.data;

    const metaSemanalFinal = metaSemanalEditada ? metaSemanal : metaDiaria * diasTrabalhoSemana;
    const metaMensalFinal = metaMensalEditada ? metaMensal : metaDiaria * diasTrabalhoSemana * 4;

    const meta = await Meta.findOneAndUpdate(
      { userId: req.user!.id },
      { metaDiaria, diasTrabalhoSemana, metaSemanal: metaSemanalFinal, metaMensal: metaMensalFinal, metaSemanalEditada, metaMensalEditada },
      { upsert: true, new: true }
    );

    res.status(200).json(meta);
  } catch {
    res.status(500).json({ message: 'Erro ao criar metas.' });
  }
});

router.put('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parse = metaSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ message: 'Dados inválidos.', details: parse.error.issues });
      return;
    }

    const meta = await Meta.findOne({ userId: req.user!.id });
    if (!meta) {
      res.status(404).json({ message: 'Metas não encontradas. Use POST para criar.' });
      return;
    }

    const { metaDiaria, diasTrabalhoSemana, metaSemanal, metaMensal, metaSemanalEditada, metaMensalEditada } = parse.data;

    meta.metaDiaria = metaDiaria;
    meta.diasTrabalhoSemana = diasTrabalhoSemana;
    meta.metaSemanalEditada = metaSemanalEditada;
    meta.metaMensalEditada = metaMensalEditada;
    meta.metaSemanal = metaSemanalEditada ? metaSemanal : metaDiaria * diasTrabalhoSemana;
    meta.metaMensal = metaMensalEditada ? metaMensal : metaDiaria * diasTrabalhoSemana * 4;

    await meta.save();
    res.json(meta);
  } catch {
    res.status(500).json({ message: 'Erro ao atualizar metas.' });
  }
});

export default router;
