import { Router, Response } from 'express';
import { z } from 'zod';
import { Corrida } from '../models/Corrida';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const corridaSchema = z.object({
  valor: z.number().positive().max(99999.99, 'Valor máximo é R$ 99.999,99.'),
  formaPagamento: z.enum(['pix', 'dinheiro', 'cartao']),
  data: z.iso.datetime({ offset: true }),
  observacao: z.string().max(200, 'Observação deve ter no máximo 200 caracteres.').optional(),
});

const querySchema = z.object({
  inicio: z.iso.datetime({ offset: true }).optional(),
  fim: z.iso.datetime({ offset: true }).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido.'),
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsedQuery = querySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ message: 'Parâmetros inválidos.', details: parsedQuery.error.issues });
    return;
  }

  try {
    const { inicio, fim, page, limit } = parsedQuery.data;
    const filtro: Record<string, unknown> = { userId: req.user!.id };

    if (inicio || fim) {
      filtro.data = {};
      if (inicio) (filtro.data as Record<string, Date>).$gte = new Date(inicio);
      if (fim) (filtro.data as Record<string, Date>).$lte = new Date(fim);
    }

    const limitNum = limit ? Number.parseInt(limit) : 0;

    if (limitNum > 0) {
      const pageNum = Math.max(1, page ? Number.parseInt(page) : 1);
      const total = await Corrida.countDocuments(filtro);
      const corridas = await Corrida.find(filtro)
        .sort({ data: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
      res.json({ items: corridas, total, page: pageNum, pages: Math.ceil(total / limitNum) });
    } else {
      const corridas = await Corrida.find(filtro).sort({ data: -1 });
      res.json(corridas);
    }
  } catch {
    res.status(500).json({ message: 'Erro ao buscar corridas.' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = corridaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', details: parsed.error.issues });
    return;
  }

  try {
    const corrida = await Corrida.create({
      ...parsed.data,
      userId: req.user!.id,
      userEmail: req.user!.email,
    });
    res.status(201).json(corrida);
  } catch {
    res.status(500).json({ message: 'Erro ao registrar corrida.' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsedId = idParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    res.status(400).json({ message: 'ID inválido.' });
    return;
  }

  const parsed = corridaSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', details: parsed.error.issues });
    return;
  }

  try {
    const corrida = await Corrida.findOneAndUpdate(
      { _id: { $eq: parsedId.data.id }, userId: { $eq: req.user!.id } },
      parsed.data,
      { new: true }
    );
    if (!corrida) {
      res.status(404).json({ message: 'Corrida não encontrada.' });
      return;
    }
    res.json(corrida);
  } catch {
    res.status(500).json({ message: 'Erro ao atualizar corrida.' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsedId = idParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    res.status(400).json({ message: 'ID inválido.' });
    return;
  }

  try {
    const corrida = await Corrida.findOneAndDelete({ _id: { $eq: parsedId.data.id }, userId: { $eq: req.user!.id } });
    if (!corrida) {
      res.status(404).json({ message: 'Corrida não encontrada.' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Erro ao deletar corrida.' });
  }
});

export default router;
