import { Router, Response } from 'express';
import { z } from 'zod';
import { Corrida } from '../models/Corrida';
import { Abastecimento } from '../models/Abastecimento';
import { Meta } from '../models/Meta';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { rangeParaPeriodoBRT, dataISOBRT } from '../utils/dataBRT';

const router = Router();
router.use(authMiddleware);

const detalhadoQuerySchema = z.object({
  inicio: z.iso.datetime().optional(),
  fim: z.iso.datetime().optional(),
  periodo: z.enum(['hoje', 'semana', 'mes']).optional(),
});

router.get('/resumo', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const periodos = ['hoje', 'semana', 'mes'] as const;

    const resultados = await Promise.all(
      periodos.map(async (p) => {
        const { inicio, fim } = rangeParaPeriodoBRT(p);
        const [corridas, abastecimentos] = await Promise.all([
          Corrida.find({ userId: req.user!.id, data: { $gte: inicio, $lte: fim } }),
          Abastecimento.find({ userId: req.user!.id, data: { $gte: inicio, $lte: fim } }),
        ]);
        const ganho_bruto = corridas.reduce((acc, c) => acc + c.valor, 0);
        const total_abastecimento = abastecimentos.reduce((acc, a) => acc + a.valor, 0);
        return {
          ganho_bruto,
          total_abastecimento,
          lucro_liquido: ganho_bruto - total_abastecimento,
          total_corridas: corridas.length,
        };
      })
    );

    res.json({
      hoje: resultados[0],
      semana: resultados[1],
      mes: resultados[2],
    });
  } catch {
    res.status(500).json({ message: 'Erro ao gerar resumo.' });
  }
});

router.get('/detalhado', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsedQuery = detalhadoQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ message: 'Parâmetros inválidos.', details: parsedQuery.error.issues });
    return;
  }

  try {
    let inicio: Date;
    let fim: Date;

    const { inicio: inicioStr, fim: fimStr, periodo } = parsedQuery.data;

    if (inicioStr && fimStr) {
      inicio = new Date(inicioStr);
      fim = new Date(fimStr);
    } else {
      ({ inicio, fim } = rangeParaPeriodoBRT(periodo ?? 'mes'));
    }

    const [corridas, abastecimentos, meta] = await Promise.all([
      Corrida.find({ userEmail: req.user!.email, data: { $gte: inicio, $lte: fim } }),
      Abastecimento.find({ userEmail: req.user!.email, data: { $gte: inicio, $lte: fim } }),
      Meta.findOne({ userId: req.user!.id }),
    ]);

    const ganho_bruto = corridas.reduce((acc, c) => acc + c.valor, 0);
    const total_abastecimento = abastecimentos.reduce((acc, a) => acc + a.valor, 0);
    const lucro_liquido = ganho_bruto - total_abastecimento;
    const total_corridas = corridas.length;

    const porDia = new Map<string, number>();
    for (const c of corridas) {
      const dia = dataISOBRT(c.data);
      porDia.set(dia, (porDia.get(dia) ?? 0) + c.valor);
    }
    const dias_trabalhados = porDia.size;

    const media_por_corrida = total_corridas > 0 ? ganho_bruto / total_corridas : 0;
    const media_por_dia = dias_trabalhados > 0 ? ganho_bruto / dias_trabalhados : 0;

    const por_pagamento = corridas.reduce(
      (acc, c) => {
        acc[c.formaPagamento] += c.valor;
        return acc;
      },
      { pix: 0, dinheiro: 0, cartao: 0 }
    );

    let dias_meta_batida: number | null = null;
    if (meta && meta.metaDiaria > 0) {
      dias_meta_batida = 0;
      for (const total of porDia.values()) {
        if (total >= meta.metaDiaria) dias_meta_batida++;
      }
    }

    res.json({
      ganho_bruto,
      total_abastecimento,
      lucro_liquido,
      total_corridas,
      dias_trabalhados,
      media_por_corrida,
      media_por_dia,
      por_pagamento,
      dias_meta_batida,
    });
  } catch {
    res.status(500).json({ message: 'Erro ao gerar relatório detalhado.' });
  }
});

export default router;
