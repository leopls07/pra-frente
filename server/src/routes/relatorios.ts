import { Router, Response } from 'express';
import { Corrida } from '../models/Corrida';
import { Abastecimento } from '../models/Abastecimento';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function rangeParaPeriodo(periodo: string): { inicio: Date; fim: Date } {
  const agora = new Date();
  const fim = new Date(agora);
  fim.setHours(23, 59, 59, 999);

  if (periodo === 'hoje') {
    const inicio = new Date(agora);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim };
  }

  if (periodo === 'semana') {
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - agora.getDay());
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim };
  }

  // mes
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
  return { inicio, fim };
}

router.get('/resumo', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const email = req.user!.email;
    const periodos = ['hoje', 'semana', 'mes'] as const;

    const resultados = await Promise.all(
      periodos.map(async (p) => {
        const { inicio, fim } = rangeParaPeriodo(p);
        const [corridas, abastecimentos] = await Promise.all([
          Corrida.find({ userEmail: email, data: { $gte: inicio, $lte: fim } }),
          Abastecimento.find({ userEmail: email, data: { $gte: inicio, $lte: fim } }),
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
  try {
    let inicio: Date;
    let fim: Date;

    if (req.query.inicio && req.query.fim) {
      inicio = new Date(req.query.inicio as string);
      fim = new Date(req.query.fim as string);
    } else {
      const periodo = (req.query.periodo as string) || 'mes';
      ({ inicio, fim } = rangeParaPeriodo(periodo));
    }

    const [corridas, abastecimentos] = await Promise.all([
      Corrida.find({ userEmail: req.user!.email, data: { $gte: inicio, $lte: fim } }),
      Abastecimento.find({ userEmail: req.user!.email, data: { $gte: inicio, $lte: fim } }),
    ]);

    const ganho_bruto = corridas.reduce((acc, c) => acc + c.valor, 0);
    const total_abastecimento = abastecimentos.reduce((acc, a) => acc + a.valor, 0);
    const lucro_liquido = ganho_bruto - total_abastecimento;
    const total_corridas = corridas.length;

    const diasSet = new Set(corridas.map((c) => c.data.toISOString().slice(0, 10)));
    const dias_trabalhados = diasSet.size;

    const media_por_corrida = total_corridas > 0 ? ganho_bruto / total_corridas : 0;
    const media_por_dia = dias_trabalhados > 0 ? ganho_bruto / dias_trabalhados : 0;

    const por_pagamento = corridas.reduce(
      (acc, c) => {
        acc[c.formaPagamento] += c.valor;
        return acc;
      },
      { pix: 0, dinheiro: 0, cartao: 0 }
    );

    res.json({
      ganho_bruto,
      total_abastecimento,
      lucro_liquido,
      total_corridas,
      dias_trabalhados,
      media_por_corrida,
      media_por_dia,
      por_pagamento,
    });
  } catch {
    res.status(500).json({ message: 'Erro ao gerar relatório detalhado.' });
  }
});

export default router;
