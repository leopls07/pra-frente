import { Router, Response } from 'express';
import { z } from 'zod';
import { Corrida } from '../models/Corrida';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const corridaSchema = z.object({
  valor: z.number().positive(),
  formaPagamento: z.enum(['pix', 'dinheiro', 'cartao']),
  data: z.string().datetime(),
  observacao: z.string().optional(),
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inicio, fim } = req.query;
    const filtro: Record<string, unknown> = { userEmail: req.user!.email };

    if (inicio || fim) {
      filtro.data = {};
      if (inicio) (filtro.data as Record<string, Date>).$gte = new Date(inicio as string);
      if (fim) (filtro.data as Record<string, Date>).$lte = new Date(fim as string);
    }

    const corridas = await Corrida.find(filtro).sort({ data: -1 });
    res.json(corridas);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar corridas.' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = corridaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
    return;
  }

  try {
    const corrida = await Corrida.create({ ...parsed.data, userEmail: req.user!.email });
    res.status(201).json(corrida);
  } catch {
    res.status(500).json({ error: 'Erro ao registrar corrida.' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = corridaSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
    return;
  }

  try {
    const corrida = await Corrida.findOneAndUpdate(
      { _id: req.params.id, userEmail: req.user!.email },
      parsed.data,
      { new: true }
    );
    if (!corrida) {
      res.status(404).json({ error: 'Corrida não encontrada.' });
      return;
    }
    res.json(corrida);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar corrida.' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const corrida = await Corrida.findOneAndDelete({ _id: req.params.id, userEmail: req.user!.email });
    if (!corrida) {
      res.status(404).json({ error: 'Corrida não encontrada.' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao deletar corrida.' });
  }
});

export default router;
