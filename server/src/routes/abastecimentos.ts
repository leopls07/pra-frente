import { Router, Response } from 'express';
import { z } from 'zod';
import { Abastecimento } from '../models/Abastecimento';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const abastecimentoSchema = z.object({
  valor: z.number().positive().max(99999.99, 'Valor máximo é R$ 99.999,99.'),
  tipoCombustivel: z.enum(['gasolina', 'etanol']),
  data: z.iso.datetime(),
});

const querySchema = z.object({
  inicio: z.iso.datetime().optional(),
  fim: z.iso.datetime().optional(),
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
      const total = await Abastecimento.countDocuments(filtro);
      const abastecimentos = await Abastecimento.find(filtro)
        .sort({ data: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
      res.json({ items: abastecimentos, total, page: pageNum, pages: Math.ceil(total / limitNum) });
    } else {
      const abastecimentos = await Abastecimento.find(filtro).sort({ data: -1 });
      res.json(abastecimentos);
    }
  } catch {
    res.status(500).json({ message: 'Erro ao buscar abastecimentos.' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = abastecimentoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', details: parsed.error.issues });
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
  const parsedId = idParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    res.status(400).json({ message: 'ID inválido.' });
    return;
  }

  const parsed = abastecimentoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', details: parsed.error.issues });
    return;
  }

  try {
    const abastecimento = await Abastecimento.findOneAndUpdate(
      { _id: { $eq: parsedId.data.id }, userId: { $eq: req.user!.id } },
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
  const parsedId = idParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    res.status(400).json({ message: 'ID inválido.' });
    return;
  }

  try {
    const abastecimento = await Abastecimento.findOneAndDelete({
      _id: { $eq: parsedId.data.id },
      userId: { $eq: req.user!.id },
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
