import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { Colors } from '../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

type Periodo = 'hoje' | 'semana' | 'mes';

interface PeriodoResumo {
  ganho_bruto: number;
  total_abastecimento: number;
  lucro_liquido: number;
  total_corridas: number;
}

interface ResumoGeral {
  hoje: PeriodoResumo;
  semana: PeriodoResumo;
  mes: PeriodoResumo;
}

interface RelatorioDetalhado {
  ganho_bruto: number;
  total_abastecimento: number;
  lucro_liquido: number;
  total_corridas: number;
  dias_trabalhados: number;
  media_por_corrida: number;
  media_por_dia: number;
  por_pagamento: { pix: number; dinheiro: number; cartao: number };
}

const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: 'hoje', label: 'Hoje' },
  { valor: 'semana', label: 'Esta semana' },
  { valor: 'mes', label: 'Este mês' },
];

const ANO_ATUAL = new Date().getFullYear();

const fmt = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RelatoriosScreen() {
  const [resumo, setResumo] = useState<ResumoGeral | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<Periodo | null>(null);
  const [detalhe, setDetalhe] = useState<RelatorioDetalhado | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  const [anualAberto, setAnualAberto] = useState(false);
  const [ano, setAno] = useState(ANO_ATUAL);
  const [relatorioAnual, setRelatorioAnual] = useState<RelatorioDetalhado | null>(null);
  const [loadingAnual, setLoadingAnual] = useState(false);

  const carregarResumo = useCallback(() => {
    setLoadingResumo(true);
    setPeriodoSelecionado(null);
    setDetalhe(null);
    api.get<ResumoGeral>('/relatorios/resumo')
      .then(({ data }) => setResumo(data))
      .catch((error: unknown) => {
        Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
      })
      .finally(() => setLoadingResumo(false));
  }, []);

  useEffect(() => { carregarResumo(); }, []);

  const abrirDetalhe = async (periodo: Periodo) => {
    if (periodoSelecionado === periodo) {
      setPeriodoSelecionado(null);
      setDetalhe(null);
      return;
    }
    setPeriodoSelecionado(periodo);
    setDetalhe(null);
    setLoadingDetalhe(true);
    setAnualAberto(false);
    setRelatorioAnual(null);
    try {
      const { data } = await api.get<RelatorioDetalhado>(`/relatorios/detalhado?periodo=${periodo}`);
      setDetalhe(data);
    } catch (error: unknown) {
      Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
      setPeriodoSelecionado(null);
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const carregarAnual = async (anoAlvo: number) => {
    setLoadingAnual(true);
    setRelatorioAnual(null);
    try {
      // Limites em BRT (GMT-3): Jan 1 00:00 BRT = Jan 1 03:00 UTC; Dez 31 23:59 BRT = Jan 1 (próximo ano) 02:59 UTC
      const inicio = `${anoAlvo}-01-01T03:00:00.000Z`;
      const fim = `${anoAlvo + 1}-01-01T02:59:59.999Z`;
      const { data } = await api.get<RelatorioDetalhado>(
        `/relatorios/detalhado?inicio=${inicio}&fim=${fim}`
      );
      setRelatorioAnual(data);
    } catch (error: unknown) {
      Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
    } finally {
      setLoadingAnual(false);
    }
  };

  const alterarAno = (delta: number) => {
    const novoAno = ano + delta;
    setAno(novoAno);
    setRelatorioAnual(null);
    carregarAnual(novoAno);
  };

  const abrirAnual = () => {
    setAnualAberto(true);
    carregarAnual(ano);
  };

  const compartilhar = async () => {
    if (!detalhe || !periodoSelecionado) return;
    const label = PERIODOS.find((p) => p.valor === periodoSelecionado)?.label;
    const texto =
      `📊 Relatório — ${label}\n\n` +
      `💰 Ganho bruto: ${fmt(detalhe.ganho_bruto)}\n` +
      `⛽ Abastecimentos: ${fmt(detalhe.total_abastecimento)}\n` +
      `✅ Lucro líquido: ${fmt(detalhe.lucro_liquido)}\n\n` +
      `🚕 Corridas: ${detalhe.total_corridas}\n` +
      `📅 Dias trabalhados: ${detalhe.dias_trabalhados}\n` +
      `📈 Média por corrida: ${fmt(detalhe.media_por_corrida)}\n` +
      `📈 Média por dia: ${fmt(detalhe.media_por_dia)}\n\n` +
      `💸 Pix: ${fmt(detalhe.por_pagamento.pix)}\n` +
      `💵 Dinheiro: ${fmt(detalhe.por_pagamento.dinheiro)}\n` +
      `💳 Cartão: ${fmt(detalhe.por_pagamento.cartao)}`;
    await Share.share({ message: texto });
  };

  const compartilharAnual = async () => {
    if (!relatorioAnual) return;
    const texto =
      `📊 Relatório Anual — ${ano}\n\n` +
      `💰 Ganho bruto: ${fmt(relatorioAnual.ganho_bruto)}\n` +
      `⛽ Abastecimentos: ${fmt(relatorioAnual.total_abastecimento)}\n` +
      `✅ Lucro líquido: ${fmt(relatorioAnual.lucro_liquido)}\n\n` +
      `🚕 Corridas: ${relatorioAnual.total_corridas}\n` +
      `📅 Dias trabalhados: ${relatorioAnual.dias_trabalhados}\n` +
      `📈 Média por corrida: ${fmt(relatorioAnual.media_por_corrida)}\n` +
      `📈 Média por dia: ${fmt(relatorioAnual.media_por_dia)}\n\n` +
      `💸 Pix: ${fmt(relatorioAnual.por_pagamento.pix)}\n` +
      `💵 Dinheiro: ${fmt(relatorioAnual.por_pagamento.dinheiro)}\n` +
      `💳 Cartão: ${fmt(relatorioAnual.por_pagamento.cartao)}`;
    await Share.share({ message: texto });
  };

  return (
    <LinearGradient colors={[Colors.primary, Colors.background]} style={styles.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerArea}>
          <Text style={styles.titulo}>Relatórios</Text>
        </View>

        <View style={styles.body}>
        <View style={styles.topBar}>
        <TouchableOpacity onPress={carregarResumo} disabled={loadingResumo} activeOpacity={0.6}>
          <Text style={[styles.atualizar, loadingResumo && { opacity: 0.4 }]}>
            {loadingResumo ? 'Atualizando...' : '↻ Atualizar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cards}>
        {PERIODOS.map((p) => {
          const dados = resumo?.[p.valor];
          const selecionado = periodoSelecionado === p.valor;
          const semDados = !loadingResumo && (dados?.total_corridas ?? 0) === 0;

          return (
            <TouchableOpacity
              key={p.valor}
              style={[styles.card, selecionado && styles.cardSelecionado]}
              onPress={() => abrirDetalhe(p.valor)}
              activeOpacity={0.8}
              accessibilityLabel={`Ver detalhes de ${p.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selecionado }}
            >
              <Text style={styles.cardLabel}>{p.label}</Text>
              {loadingResumo ? (
                <ActivityIndicator color={Colors.primary} />
              ) : semDados ? (
                <Text style={styles.cardSemDados}>Nenhuma corrida no período</Text>
              ) : (
                <>
                  <Text style={styles.cardLucro}>{fmt(dados?.ganho_bruto ?? 0)}</Text>
                  <Text style={styles.cardSubtexto}>
                    {dados?.total_corridas} corrida{dados?.total_corridas !== 1 ? 's' : ''}
                    {'  ·  '}líquido {fmt(dados?.lucro_liquido ?? 0)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {periodoSelecionado && (
        <View style={styles.detalhe}>
          <Text style={styles.detalheTitle}>
            {PERIODOS.find((p) => p.valor === periodoSelecionado)?.label}
          </Text>

          {loadingDetalhe ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
          ) : detalhe ? (
            detalhe.total_corridas === 0 ? (
              <Text style={styles.detalheVazio}>Nenhuma corrida registrada neste período.</Text>
            ) : (
              <>
                <View style={styles.linhas}>
                  <Linha label="Ganho bruto" valor={fmt(detalhe.ganho_bruto)} cor={Colors.gain} />
                  <Linha label="Abastecimentos" valor={fmt(detalhe.total_abastecimento)} cor={Colors.cost} />
                  <Linha label="Lucro líquido" valor={fmt(detalhe.lucro_liquido)} cor={Colors.gain} destaque />
                  <Linha label="Total de corridas" valor={String(detalhe.total_corridas)} />
                  {periodoSelecionado !== 'hoje' && (
                    <Linha label="Dias trabalhados" valor={String(detalhe.dias_trabalhados)} />
                  )}
                  <Linha label="Média por corrida" valor={fmt(detalhe.media_por_corrida)} />
                  {periodoSelecionado !== 'hoje' && (
                    <Linha label="Média por dia" valor={fmt(detalhe.media_por_dia)} />
                  )}
                  <Linha label="Pix" valor={fmt(detalhe.por_pagamento.pix)} />
                  <Linha label="Dinheiro" valor={fmt(detalhe.por_pagamento.dinheiro)} />
                  <Linha label="Cartão" valor={fmt(detalhe.por_pagamento.cartao)} />
                </View>
                <TouchableOpacity
                  style={styles.botaoCompartilhar}
                  onPress={compartilhar}
                  accessibilityLabel="Compartilhar relatório"
                  accessibilityRole="button"
                >
                  <Text style={styles.botaoCompartilharTexto}>Compartilhar</Text>
                </TouchableOpacity>
              </>
            )
          ) : null}
        </View>
      )}

      <View style={styles.anualContainer}>
        {!anualAberto ? (
          <TouchableOpacity onPress={abrirAnual} activeOpacity={0.6}>
            <Text style={styles.anualLink}>Gerar relatório anual</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.anualCard}>
            <View style={styles.anualHeader}>
              <TouchableOpacity
                onPress={() => alterarAno(-1)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.anualSeta}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.anualAno}>{ano}</Text>
              <TouchableOpacity
                onPress={() => alterarAno(1)}
                disabled={ano >= ANO_ATUAL}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.anualSeta, ano >= ANO_ATUAL && { opacity: 0.3 }]}>›</Text>
              </TouchableOpacity>
            </View>

            {loadingAnual ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
            ) : relatorioAnual ? (
              relatorioAnual.total_corridas === 0 ? (
                <Text style={styles.detalheVazio}>Nenhuma corrida registrada em {ano}.</Text>
              ) : (
                <>
                  <View style={styles.linhas}>
                    <Linha label="Ganho bruto" valor={fmt(relatorioAnual.ganho_bruto)} cor={Colors.gain} />
                    <Linha label="Abastecimentos" valor={fmt(relatorioAnual.total_abastecimento)} cor={Colors.cost} />
                    <Linha label="Lucro líquido" valor={fmt(relatorioAnual.lucro_liquido)} cor={Colors.gain} destaque />
                    <Linha label="Total de corridas" valor={String(relatorioAnual.total_corridas)} />
                    <Linha label="Dias trabalhados" valor={String(relatorioAnual.dias_trabalhados)} />
                    <Linha label="Média por corrida" valor={fmt(relatorioAnual.media_por_corrida)} />
                    <Linha label="Média por dia" valor={fmt(relatorioAnual.media_por_dia)} />
                    <Linha label="Pix" valor={fmt(relatorioAnual.por_pagamento.pix)} />
                    <Linha label="Dinheiro" valor={fmt(relatorioAnual.por_pagamento.dinheiro)} />
                    <Linha label="Cartão" valor={fmt(relatorioAnual.por_pagamento.cartao)} />
                  </View>
                  <TouchableOpacity
                    style={styles.botaoCompartilhar}
                    onPress={compartilharAnual}
                    accessibilityLabel="Compartilhar relatório anual"
                    accessibilityRole="button"
                  >
                    <Text style={styles.botaoCompartilharTexto}>Compartilhar</Text>
                  </TouchableOpacity>
                </>
              )
            ) : null}
          </View>
        )}
        </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function Linha({
  label,
  valor,
  cor,
  destaque,
}: {
  label: string;
  valor: string;
  cor?: string;
  destaque?: boolean;
}) {
  return (
    <View style={[linhaStyles.row, destaque && linhaStyles.rowDestaque]}>
      <Text style={linhaStyles.label}>{label}</Text>
      <Text style={[linhaStyles.valor, cor ? { color: cor } : {}]}>{valor}</Text>
    </View>
  );
}

const linhaStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowDestaque: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8 },
  label: { fontSize: 16, color: Colors.textSecondary },
  valor: { fontSize: 16, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { flexGrow: 1 },
  headerArea: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  body: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '95%',
    alignSelf: 'center',
    paddingTop: 8,
    paddingBottom: 32,
    flex: 1,
    marginBottom: 16,
  },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  topBar: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  atualizar: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  cards: { gap: 12, paddingHorizontal: 12 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 4,
    minHeight: 88,
    justifyContent: 'center',
  },
  cardSelecionado: { borderColor: Colors.primary },
  cardLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardLucro: { fontSize: 30, fontWeight: 'bold', color: Colors.gain, fontVariant: ['tabular-nums'] },
  cardSubtexto: { fontSize: 13, color: Colors.textMuted },
  cardSemDados: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  detalhe: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 12,
    marginTop: 8,
  },
  detalheTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  detalheVazio: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  linhas: {},
  botaoCompartilhar: {
    backgroundColor: Colors.btnAcao,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 52,
    justifyContent: 'center',
  },
  botaoCompartilharTexto: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
  anualContainer: {
    marginHorizontal: 12,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  anualLink: {
    fontSize: 14,
    alignSelf: 'flex-start',
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  anualCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  anualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  anualSeta: { fontSize: 32, color: Colors.text, fontWeight: '300' },
  anualAno: { fontSize: 24, fontWeight: 'bold', color: Colors.text, minWidth: 60, textAlign: 'center' },
});
