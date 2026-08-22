import { Router, Response } from 'express';
import { z } from 'zod';
import { Gasto } from '../models/Gasto';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const gastoSchema = z.object({
  valor: z.number().positive().max(99999.99, 'Valor máximo é R$ 99.999,99.'),
  categoria: z.enum(['alimentacao', 'manutencao', 'caixinha', 'outros']),
  data: z.iso.datetime({ offset: true }),
  descricao: z.string().trim().max(200).optional(),
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
      const total = await Gasto.countDocuments(filtro);
      const gastos = await Gasto.find(filtro)
        .sort({ data: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
      res.json({ items: gastos, total, page: pageNum, pages: Math.ceil(total / limitNum) });
    } else {
      const gastos = await Gasto.find(filtro).sort({ data: -1 });
      res.json(gastos);
    }
  } catch {
    res.status(500).json({ message: 'Erro ao buscar gastos.' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = gastoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', details: parsed.error.issues });
    return;
  }

  try {
    const gasto = await Gasto.create({
      ...parsed.data,
      userId: req.user!.id,
      userEmail: req.user!.email,
    });
    res.status(201).json(gasto);
  } catch {
    res.status(500).json({ message: 'Erro ao registrar gasto.' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsedId = idParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    res.status(400).json({ message: 'ID inválido.' });
    return;
  }

  const parsed = gastoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', details: parsed.error.issues });
    return;
  }

  try {
    const gasto = await Gasto.findOneAndUpdate(
      { _id: { $eq: parsedId.data.id }, userId: { $eq: req.user!.id } },
      parsed.data,
      { new: true }
    );
    if (!gasto) {
      res.status(404).json({ message: 'Gasto não encontrado.' });
      return;
    }
    res.json(gasto);
  } catch {
    res.status(500).json({ message: 'Erro ao atualizar gasto.' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsedId = idParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    res.status(400).json({ message: 'ID inválido.' });
    return;
  }

  try {
    const gasto = await Gasto.findOneAndDelete({
      _id: { $eq: parsedId.data.id },
      userId: { $eq: req.user!.id },
    });
    if (!gasto) {
      res.status(404).json({ message: 'Gasto não encontrado.' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Erro ao deletar gasto.' });
  }
});

export default router;
