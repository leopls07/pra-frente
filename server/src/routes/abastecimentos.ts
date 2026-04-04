import { Router, Response } from 'express';
import { z } from 'zod';
import { Abastecimento } from '../models/Abastecimento';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const abastecimentoSchema = z.object({
  valor: z.number().positive(),
  tipoCombustivel: z.enum(['gasolina', 'etanol']),
  data: z.string().datetime(),
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inicio, fim } = req.query;
    const filtro: Record<string, unknown> = { userId: req.user!.id };

    if (inicio || fim) {
      filtro.data = {};
      if (inicio) (filtro.data as Record<string, Date>).$gte = new Date(inicio as string);
      if (fim) (filtro.data as Record<string, Date>).$lte = new Date(fim as string);
    }

    const abastecimentos = await Abastecimento.find(filtro).sort({ data: -1 });
    res.json(abastecimentos);
  } catch {
    res.status(500).json({ message: 'Erro ao buscar abastecimentos.' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = abastecimentoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', details: parsed.error.flatten() });
    return;
  }

  try {
    const abastecimento = await Abastecimento.create({
      ...parsed.data,
      userId: req.user!.id,
      userEmail: req.user!.email,
    });
    res.status(201).json(abastecimento);
  } catch {
    res.status(500).json({ message: 'Erro ao registrar abastecimento.' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = abastecimentoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', details: parsed.error.flatten() });
    return;
  }

  try {
    const abastecimento = await Abastecimento.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      parsed.data,
      { new: true }
    );
    if (!abastecimento) {
      res.status(404).json({ message: 'Abastecimento não encontrado.' });
      return;
    }
    res.json(abastecimento);
  } catch {
    res.status(500).json({ message: 'Erro ao atualizar abastecimento.' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const abastecimento = await Abastecimento.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.id,
    });
    if (!abastecimento) {
      res.status(404).json({ message: 'Abastecimento não encontrado.' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Erro ao deletar abastecimento.' });
  }
});

export default router;
