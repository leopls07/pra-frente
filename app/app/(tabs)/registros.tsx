import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { toISOComOffsetBRT } from '../../utils/dataBRT';
import { Colors } from '../../constants/colors';
import {
  Corrida,
  Abastecimento,
  FormaPagamento,
  TipoCombustivel,
  PaginadoResposta,
} from '../../types';

type Aba = 'hoje' | 'historico';
type TipoRegistro = 'corridas' | 'abastecimentos';
type Registro = Registro;
type RegistroOuNull = Registro | null;
type McIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const FORMAS_PAG: { valor: FormaPagamento; label: string; icone: McIcon }[] = [
  { valor: 'pix', label: 'Pix', icone: 'qrcode' },
  { valor: 'dinheiro', label: 'Dinheiro', icone: 'cash' },
  { valor: 'cartao', label: 'Cartão', icone: 'credit-card-outline' },
];

const COMBUSTIVEIS: { valor: TipoCombustivel; label: string; icone: McIcon }[] = [
  { valor: 'gasolina', label: 'Gasolina', icone: 'fire' },
  { valor: 'etanol', label: 'Etanol', icone: 'leaf' },
];

const LIMITE = 20;

interface HistoricoSetters {
  setCarregando: (v: boolean) => void;
  setCarregandoMais: (v: boolean) => void;
  setRegistros: React.Dispatch<React.SetStateAction<(Registro)[]>>;
  setPagina: (v: number) => void;
  setTotalPaginas: (v: number) => void;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataHoraLocal(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function formatarDataHoraCurta(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function formatarDataBtn(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatarDateHoraSimples(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rangeHoje() {
  const d = new Date();
  const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { inicio: toISOComOffsetBRT(inicio), fim: toISOComOffsetBRT(fim) };
}

function rangeData(date: Date) {
  const inicio = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const fim = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { inicio: toISOComOffsetBRT(inicio), fim: toISOComOffsetBRT(fim) };
}

function isCorrida(item: Registro): item is Corrida {
  return 'formaPagamento' in item;
}

// ── Module-level helpers ──────────────────────────────────────────────────

function getTituloModal(
  modoEdicao: boolean,
  item: RegistroOuNull,
): string {
  if (modoEdicao) return 'Editar registro';
  if (item && isCorrida(item)) return 'Corrida';
  return 'Abastecimento';
}

function calcularEditData(
  selected: Date,
  mode: 'date' | 'time',
  currentEditData: Date,
): { novaData: Date; novoMode?: 'time'; fechar: boolean } {
  if (Platform.OS !== 'android') return { novaData: selected, fechar: false };
  if (mode === 'date') {
    const nova = new Date(selected);
    nova.setHours(currentEditData.getHours(), currentEditData.getMinutes());
    return { novaData: nova, novoMode: 'time', fechar: false };
  }
  const nova = new Date(currentEditData);
  nova.setHours(selected.getHours(), selected.getMinutes());
  return { novaData: nova, fechar: true };
}

async function fetchHoje(
  t: TipoRegistro,
  setCarregandoHoje: (v: boolean) => void,
  setRegistrosHoje: (v: (Registro)[]) => void,
): Promise<void> {
  setCarregandoHoje(true);
  try {
    const { inicio, fim } = rangeHoje();
    const endpoint = t === 'corridas' ? '/corridas' : '/abastecimentos';
    const { data } = await api.get<(Registro)[]>(endpoint, {
      params: { inicio, fim },
    });
    setRegistrosHoje(data);
  } catch (error) {
    Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
  } finally {
    setCarregandoHoje(false);
  }
}

async function fetchHistorico(
  pagNum: number,
  t: TipoRegistro,
  fd: Date | null,
  setters: HistoricoSetters,
): Promise<void> {
  const { setCarregando, setCarregandoMais, setRegistros, setPagina, setTotalPaginas } = setters;
  if (pagNum === 1) setCarregando(true);
  else setCarregandoMais(true);
  try {
    const endpoint = t === 'corridas' ? '/corridas' : '/abastecimentos';
    if (fd) {
      const { inicio, fim } = rangeData(fd);
      const { data } = await api.get<(Registro)[]>(endpoint, {
        params: { inicio, fim },
      });
      setRegistros(data);
      setPagina(1);
      setTotalPaginas(1);
    } else {
      const { data } = await api.get<PaginadoResposta<Registro>>(endpoint, {
        params: { page: pagNum, limit: LIMITE },
      });
      if (pagNum === 1) setRegistros(data.items);
      else setRegistros((prev) => [...prev, ...data.items]);
      setPagina(data.page);
      setTotalPaginas(data.pages);
    }
  } catch (error) {
    Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
  } finally {
    setCarregando(false);
    setCarregandoMais(false);
  }
}

type EmptyHojeProps = Readonly<{ tipo: TipoRegistro }>;
function EmptyHoje({ tipo }: EmptyHojeProps) {
  const msg =
    tipo === 'corridas'
      ? 'Você não registrou nenhuma corrida hoje.'
      : 'Você não abasteceu hoje.';
  return (
    <View style={styles.vazioContainer}>
      <MaterialCommunityIcons
        name={tipo === 'corridas' ? 'car-outline' : 'gas-station-outline'}
        size={48}
        color={Colors.textMuted}
      />
      <Text style={styles.vazioTexto}>{msg}</Text>
    </View>
  );
}

type EmptyHistoricoProps = Readonly<{ filtroData: Date | null }>;
function EmptyHistorico({ filtroData }: EmptyHistoricoProps) {
  return (
    <View style={styles.vazioContainer}>
      <MaterialCommunityIcons name="clipboard-text-off-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.vazioTexto}>
        {filtroData
          ? `Nenhum registro em ${formatarDataBtn(filtroData)}.`
          : 'Nenhum registro encontrado.'}
      </Text>
    </View>
  );
}

type ItemCardProps = Readonly<{ item: Registro; onPress: (item: Registro) => void }>;
function ItemCard({ item, onPress }: ItemCardProps) {
  const corrida = isCorrida(item);
  const forma = corrida ? FORMAS_PAG.find((f) => f.valor === item.formaPagamento) : null;
  const combust = corrida ? null : COMBUSTIVEIS.find((c) => c.valor === item.tipoCombustivel);
  const icone: McIcon = corrida ? (forma?.icone ?? 'cash') : (combust?.icone ?? 'fire');
  const label = corrida ? (forma?.label ?? '') : (combust?.label ?? '');

  return (
    <TouchableOpacity style={styles.itemCard} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.itemEsquerda}>
        <Text style={[styles.itemValor, { color: corrida ? Colors.gain : Colors.cost }]}>
          {formatarMoeda(item.valor)}
        </Text>
        <View style={styles.itemMeta}>
          <MaterialCommunityIcons name={icone} size={14} color={Colors.textSecondary} />
          <Text style={styles.itemMetaTexto}>{label}</Text>
        </View>
      </View>
      <View style={styles.itemDireita}>
        <Text style={styles.itemHora}>{formatarDataHoraCurta(item.data)}</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const PICKER_DISPLAY: 'inline' | 'default' = Platform.OS === 'ios' ? 'inline' : 'default';
const KAV_BEHAVIOR: 'padding' | 'height' = Platform.OS === 'ios' ? 'padding' : 'height';

function atualizarNaLista(
  atualizado: Registro,
  aba: Aba,
  setRegistrosHoje: React.Dispatch<React.SetStateAction<(Registro)[]>>,
  setRegistros: React.Dispatch<React.SetStateAction<(Registro)[]>>,
): void {
  const substituir = (prev: (Registro)[]) =>
    prev.map((item) => (item._id === atualizado._id ? atualizado : item));
  if (aba === 'hoje') setRegistrosHoje(substituir);
  else setRegistros(substituir);
}

function removerDaLista(
  id: string,
  aba: Aba,
  setRegistrosHoje: React.Dispatch<React.SetStateAction<(Registro)[]>>,
  setRegistros: React.Dispatch<React.SetStateAction<(Registro)[]>>,
): void {
  const filtrar = (prev: (Registro)[]) => prev.filter((item) => item._id !== id);
  if (aba === 'hoje') setRegistrosHoje(filtrar);
  else setRegistros(filtrar);
}

interface IniciarEdicaoSetters {
  setEditData: (v: Date) => void;
  setEditValor: (v: string) => void;
  setEditFormaPagamento: (v: FormaPagamento) => void;
  setEditObservacao: (v: string) => void;
  setEditTipoCombustivel: (v: TipoCombustivel) => void;
  setModoEdicao: (v: boolean) => void;
}

function iniciarEdicao(
  itemSelecionado: Registro,
  setters: IniciarEdicaoSetters,
): void {
  setters.setEditData(new Date(itemSelecionado.data));
  setters.setEditValor(String(Math.round(itemSelecionado.valor * 100)));
  if (isCorrida(itemSelecionado)) {
    setters.setEditFormaPagamento(itemSelecionado.formaPagamento);
    setters.setEditObservacao(itemSelecionado.observacao ?? '');
  } else {
    setters.setEditTipoCombustivel(itemSelecionado.tipoCombustivel);
  }
  setters.setModoEdicao(true);
}

interface SalvarEdicaoParams {
  itemSelecionado: Registro;
  editValor: string;
  editFormaPagamento: FormaPagamento;
  editTipoCombustivel: TipoCombustivel;
  editData: Date;
  editObservacao: string;
  aba: Aba;
  setSalvandoEdicao: (v: boolean) => void;
  setRegistrosHoje: React.Dispatch<React.SetStateAction<(Registro)[]>>;
  setRegistros: React.Dispatch<React.SetStateAction<(Registro)[]>>;
  fecharModal: () => void;
}

async function salvarEdicao(params: SalvarEdicaoParams): Promise<void> {
  const {
    itemSelecionado, editValor, editFormaPagamento, editTipoCombustivel,
    editData, editObservacao, aba, setSalvandoEdicao, setRegistrosHoje,
    setRegistros, fecharModal,
  } = params;

  if (!editValor || Number(editValor) === 0) {
    Toast.show({ type: 'error', text1: 'Informe o valor.', position: 'bottom' });
    return;
  }

  const endpoint = isCorrida(itemSelecionado)
    ? `/corridas/${itemSelecionado._id}`
    : `/abastecimentos/${itemSelecionado._id}`;

  const body: Record<string, unknown> = {
    valor: Number(editValor) / 100,
    data: toISOComOffsetBRT(editData),
  };

  if (isCorrida(itemSelecionado)) {
    body.formaPagamento = editFormaPagamento;
    body.observacao = editObservacao.trim() || undefined;
  } else {
    body.tipoCombustivel = editTipoCombustivel;
  }

  setSalvandoEdicao(true);
  try {
    const { data: atualizado } = await api.put<Registro>(endpoint, body);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'success', text1: 'Registro atualizado!', position: 'bottom' });
    atualizarNaLista(atualizado, aba, setRegistrosHoje, setRegistros);
    fecharModal();
  } catch (error) {
    Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
  } finally {
    setSalvandoEdicao(false);
  }
}

async function executarExclusao(
  itemSelecionado: RegistroOuNull,
  aba: Aba,
  setExcluindo: (v: boolean) => void,
  setRegistrosHoje: React.Dispatch<React.SetStateAction<(Registro)[]>>,
  setRegistros: React.Dispatch<React.SetStateAction<(Registro)[]>>,
  fecharModal: () => void,
): Promise<void> {
  if (!itemSelecionado) return;
  const endpoint = isCorrida(itemSelecionado)
    ? `/corridas/${itemSelecionado._id}`
    : `/abastecimentos/${itemSelecionado._id}`;
  setExcluindo(true);
  try {
    await api.delete(endpoint);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'success', text1: 'Registro excluído!', position: 'bottom' });
    removerDaLista(itemSelecionado._id, aba, setRegistrosHoje, setRegistros);
    fecharModal();
  } catch (error) {
    Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
  } finally {
    setExcluindo(false);
  }
}

export default function RegistrosScreen() {
  const [aba, setAba] = useState<Aba>('hoje');
  const [tipo, setTipo] = useState<TipoRegistro>('corridas');

  // Hoje
  const [registrosHoje, setRegistrosHoje] = useState<(Registro)[]>([]);
  const [carregandoHoje, setCarregandoHoje] = useState(false);

  // Histórico
  const [registros, setRegistros] = useState<(Registro)[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [filtroData, setFiltroData] = useState<Date | null>(null);
  const [showFiltroDatePicker, setShowFiltroDatePicker] = useState(false);

  // Refs para evitar stale closure no useFocusEffect
  const abaRef = useRef<Aba>('hoje');
  const tipoRef = useRef<TipoRegistro>('corridas');
  const filtroDataRef = useRef<Date | null>(null);

  // Modal de detalhe / edição
  const [itemSelecionado, setItemSelecionado] = useState<RegistroOuNull>(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);

  // Formulário de edição
  const [editValor, setEditValor] = useState('');
  const [editFormaPagamento, setEditFormaPagamento] = useState<FormaPagamento>('pix');
  const [editTipoCombustivel, setEditTipoCombustivel] = useState<TipoCombustivel>('gasolina');
  const [editData, setEditData] = useState(new Date());
  const [editObservacao, setEditObservacao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editPickerMode, setEditPickerMode] = useState<'date' | 'time'>('date');

  // ── Carregamento de dados ─────────────────────────────────────────────────

  async function carregarHoje(t: TipoRegistro = tipoRef.current) {
    await fetchHoje(t, setCarregandoHoje, setRegistrosHoje);
  }

  async function carregarHistorico(
    pagNum = 1,
    t: TipoRegistro = tipoRef.current,
    fd: Date | null = filtroDataRef.current,
  ) {
    await fetchHistorico(pagNum, t, fd, {
      setCarregando, setCarregandoMais, setRegistros, setPagina, setTotalPaginas,
    });
  }

  useFocusEffect(
    useCallback(() => {
      if (abaRef.current === 'hoje') carregarHoje();
      else carregarHistorico(1);
    }, []),
  );

  // ── Handlers de navegação interna ─────────────────────────────────────────

  function handleMudarAba(novaAba: Aba) {
    abaRef.current = novaAba;
    setAba(novaAba);
    if (novaAba === 'hoje') carregarHoje();
    else carregarHistorico(1);
  }

  function handleMudarTipo(novoTipo: TipoRegistro) {
    tipoRef.current = novoTipo;
    setTipo(novoTipo);
    setRegistrosHoje([]);
    setRegistros([]);
    if (abaRef.current === 'hoje') carregarHoje(novoTipo);
    else carregarHistorico(1, novoTipo, filtroDataRef.current);
  }

  function handleFiltroDataChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowFiltroDatePicker(false);
    if (date) {
      filtroDataRef.current = date;
      setFiltroData(date);
      carregarHistorico(1, tipoRef.current, date);
    }
  }

  function limparFiltroData() {
    filtroDataRef.current = null;
    setFiltroData(null);
    carregarHistorico(1, tipoRef.current, null);
  }

  function carregarMais() {
    if (pagina < totalPaginas && !carregandoMais) {
      carregarHistorico(pagina + 1);
    }
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function abrirItem(item: Registro) {
    setItemSelecionado(item);
    setModoEdicao(false);
    setShowEditDatePicker(false);
    setModalVisivel(true);
  }

  function fecharModal() {
    setModalVisivel(false);
    setItemSelecionado(null);
    setModoEdicao(false);
    setShowEditDatePicker(false);
  }


  function confirmarExclusao() {
    Alert.alert('Excluir registro', 'Tem certeza que deseja excluir este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => executarExclusao(itemSelecionado, abaRef.current, setExcluindo, setRegistrosHoje, setRegistros, fecharModal),
      },
    ]);
  }


  // ── Edit date picker ──────────────────────────────────────────────────────

  function abrirEditDatePicker() {
    setEditPickerMode('date');
    setShowEditDatePicker(true);
  }

  function onEditPickerChange(_event: DateTimePickerEvent, selected?: Date) {
    if (!selected) {
      setShowEditDatePicker(false);
      return;
    }
    const { novaData, novoMode, fechar } = calcularEditData(selected, editPickerMode, editData);
    setEditData(novaData);
    if (novoMode) setEditPickerMode(novoMode);
    if (fechar) setShowEditDatePicker(false);
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const editValorFormatado = editValor
    ? (Number(editValor) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '';


  const listaAtiva = aba === 'hoje' ? registrosHoje : registros;
  const estaCarregando = aba === 'hoje' ? carregandoHoje : carregando;

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={[Colors.primary, Colors.background]} style={styles.gradient}>
      {/* Cabeçalho */}
      <View style={styles.headerArea}>
        <Text style={styles.titulo}>Registros</Text>
      </View>

      {/* Card principal — 95% para o gradient aparecer nas laterais */}
      <View style={styles.card}>
        {/* Abas Hoje / Histórico */}
        <View style={styles.tabContainer}>
          {(['hoje', 'historico'] as Aba[]).map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.tabBtn, aba === a && styles.tabBtnAtivo]}
              onPress={() => handleMudarAba(a)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnTexto, aba === a && styles.tabBtnTextoAtivo]}>
                {a === 'hoje' ? 'Hoje' : 'Histórico'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggle Corridas / Abastecimentos */}
        <View style={styles.toggleContainer}>
          {(['corridas', 'abastecimentos'] as TipoRegistro[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, tipo === t && styles.toggleBtnAtivo]}
              onPress={() => handleMudarTipo(t)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={t === 'corridas' ? 'car' : 'gas-station'}
                size={18}
                color={tipo === t ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.toggleTexto, tipo === t && styles.toggleTextoAtivo]}>
                {t === 'corridas' ? 'Corridas' : 'Abastecimentos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filtro de data (somente Histórico) */}
        {aba === 'historico' && (
          <View style={styles.filtroDataRow}>
            <TouchableOpacity
              style={styles.filtroDataBtn}
              onPress={() => setShowFiltroDatePicker(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="calendar-search" size={18} color={Colors.primary} />
              <Text style={[styles.filtroDataTexto, filtroData && styles.filtroDataTextoAtivo]}>
                {filtroData ? formatarDataBtn(filtroData) : 'Filtrar por data'}
              </Text>
            </TouchableOpacity>
            {filtroData && (
              <TouchableOpacity style={styles.filtroLimparBtn} onPress={limparFiltroData}>
                <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {showFiltroDatePicker && (
          <DateTimePicker
            value={filtroData ?? new Date()}
            mode="date"
            display={PICKER_DISPLAY}
            onChange={handleFiltroDataChange}
            maximumDate={new Date()}
            locale="pt-BR"
          />
        )}

        {/* Lista */}
        {estaCarregando ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loading} />
        ) : (
          <FlatList
            data={listaAtiva}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <ItemCard item={item} onPress={abrirItem} />}
            ListEmptyComponent={aba === 'hoje' ? <EmptyHoje tipo={tipo} /> : <EmptyHistorico filtroData={filtroData} />}
            contentContainerStyle={styles.listaContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              aba === 'historico' && !filtroData && pagina < totalPaginas ? (
                <TouchableOpacity
                  style={styles.carregarMaisBtn}
                  onPress={carregarMais}
                  disabled={carregandoMais}
                  activeOpacity={0.7}
                >
                  {carregandoMais ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.carregarMaisTexto}>Carregar mais</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </View>

      {/* Modal de detalhe / edição */}
      <Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={fecharModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalFundo} activeOpacity={1} onPress={fecharModal} />
          <KeyboardAvoidingView behavior={KAV_BEHAVIOR}>
            <View style={styles.modalContainer}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* Cabeçalho do modal */}
                <View style={styles.modalHeader}>
                  {modoEdicao ? (
                    <TouchableOpacity onPress={() => setModoEdicao(false)} hitSlop={8}>
                      <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 24 }} />
                  )}
                  <Text style={styles.modalTitulo}>
                    {getTituloModal(modoEdicao, itemSelecionado)}
                  </Text>
                  <TouchableOpacity onPress={fecharModal} hitSlop={8}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Modo detalhe */}
                {!modoEdicao && itemSelecionado && (
                  <View style={styles.modalBody}>
                    <View style={styles.detalheValorContainer}>
                      <Text
                        style={[
                          styles.detalheValor,
                          { color: isCorrida(itemSelecionado) ? Colors.gain : Colors.cost },
                        ]}
                      >
                        {formatarMoeda(itemSelecionado.valor)}
                      </Text>
                    </View>

                    <View style={styles.detalheRow}>
                      <Text style={styles.detalheLabel}>Data e hora</Text>
                      <Text style={styles.detalheValorTexto}>
                        {formatarDataHoraLocal(itemSelecionado.data)}
                      </Text>
                    </View>

                    {isCorrida(itemSelecionado) ? (
                      <>
                        <View style={styles.detalheRow}>
                          <Text style={styles.detalheLabel}>Pagamento</Text>
                          <View style={styles.detalheIconRow}>
                            <MaterialCommunityIcons
                              name={
                                FORMAS_PAG.find((f) => f.valor === itemSelecionado.formaPagamento)
                                  ?.icone ?? 'cash'
                              }
                              size={18}
                              color={Colors.text}
                            />
                            <Text style={styles.detalheValorTexto}>
                              {FORMAS_PAG.find((f) => f.valor === itemSelecionado.formaPagamento)
                                ?.label}
                            </Text>
                          </View>
                        </View>
                        {itemSelecionado.observacao ? (
                          <View style={styles.detalheRow}>
                            <Text style={styles.detalheLabel}>Observação</Text>
                            <Text style={styles.detalheValorTexto}>
                              {itemSelecionado.observacao}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <View style={styles.detalheRow}>
                        <Text style={styles.detalheLabel}>Combustível</Text>
                        <View style={styles.detalheIconRow}>
                          <MaterialCommunityIcons
                            name={
                              COMBUSTIVEIS.find((c) => c.valor === itemSelecionado.tipoCombustivel)
                                ?.icone ?? 'fire'
                            }
                            size={18}
                            color={Colors.text}
                          />
                          <Text style={styles.detalheValorTexto}>
                            {COMBUSTIVEIS.find((c) => c.valor === itemSelecionado.tipoCombustivel)
                              ?.label}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.modalAcoes}>
                      <TouchableOpacity
                        style={styles.btnEditar}
                        onPress={() => itemSelecionado && iniciarEdicao(itemSelecionado, { setEditData, setEditValor, setEditFormaPagamento, setEditObservacao, setEditTipoCombustivel, setModoEdicao })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="create-outline" size={20} color={Colors.text} />
                        <Text style={styles.btnEditarTexto}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnExcluir, excluindo && styles.btnDesabilitado]}
                        onPress={confirmarExclusao}
                        activeOpacity={0.8}
                        disabled={excluindo}
                      >
                        <Ionicons name="trash-outline" size={20} color={Colors.textWhite} />
                        <Text style={styles.btnExcluirTexto}>
                          {excluindo ? 'Excluindo...' : 'Excluir'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Modo edição */}
                {modoEdicao && itemSelecionado && (
                  <View style={styles.modalBody}>
                    <View style={styles.grupo}>
                      <Text style={styles.label}>Valor</Text>
                      <TextInput
                        style={[
                          styles.inputValor,
                          {
                            color: isCorrida(itemSelecionado) ? Colors.gain : Colors.cost,
                          },
                        ]}
                        value={editValorFormatado}
                        onChangeText={(t) => setEditValor(t.replaceAll(/\D/g, ''))}
                        keyboardType="numeric"
                        placeholder="R$ 0,00"
                        placeholderTextColor={Colors.textMuted}
                        accessibilityLabel="Valor"
                      />
                    </View>

                    {isCorrida(itemSelecionado) ? (
                      <View style={styles.grupo}>
                        <Text style={styles.label}>Forma de pagamento</Text>
                        <View style={styles.opcoes}>
                          {FORMAS_PAG.map((f) => (
                            <TouchableOpacity
                              key={f.valor}
                              style={[
                                styles.opcaoBtn,
                                editFormaPagamento === f.valor && styles.opcaoBtnAtivo,
                              ]}
                              onPress={() => setEditFormaPagamento(f.valor)}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons
                                name={f.icone}
                                size={22}
                                color={
                                  editFormaPagamento === f.valor
                                    ? Colors.primary
                                    : Colors.textSecondary
                                }
                              />
                              <Text
                                style={[
                                  styles.opcaoTexto,
                                  editFormaPagamento === f.valor && styles.opcaoTextoAtivo,
                                ]}
                              >
                                {f.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.grupo}>
                        <Text style={styles.label}>Combustível</Text>
                        <View style={styles.opcoes}>
                          {COMBUSTIVEIS.map((c) => (
                            <TouchableOpacity
                              key={c.valor}
                              style={[
                                styles.opcaoBtn,
                                editTipoCombustivel === c.valor && styles.opcaoBtnAtivo,
                              ]}
                              onPress={() => setEditTipoCombustivel(c.valor)}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons
                                name={c.icone}
                                size={22}
                                color={
                                  editTipoCombustivel === c.valor
                                    ? Colors.primary
                                    : Colors.textSecondary
                                }
                              />
                              <Text
                                style={[
                                  styles.opcaoTexto,
                                  editTipoCombustivel === c.valor && styles.opcaoTextoAtivo,
                                ]}
                              >
                                {c.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={styles.grupo}>
                      <Text style={styles.label}>Data e hora</Text>
                      <TouchableOpacity
                        style={styles.inputData}
                        onPress={abrirEditDatePicker}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                      >
                        <Text style={styles.inputDataTexto}>
                          {formatarDateHoraSimples(editData)}
                        </Text>
                        <MaterialCommunityIcons
                          name="calendar-month"
                          size={26}
                          color={Colors.primaryDisabled}
                        />
                      </TouchableOpacity>
                      {showEditDatePicker && (
                        <DateTimePicker
                          value={editData}
                          mode={editPickerMode}
                          display={PICKER_DISPLAY}
                          onChange={onEditPickerChange}
                          maximumDate={new Date()}
                          locale="pt-BR"
                        />
                      )}
                    </View>

                    {isCorrida(itemSelecionado) && (
                      <View style={styles.grupo}>
                        <Text style={styles.label}>Observação (opcional)</Text>
                        <TextInput
                          style={styles.inputObs}
                          value={editObservacao}
                          onChangeText={setEditObservacao}
                          placeholder="Ex: corrida para o aeroporto"
                          placeholderTextColor={Colors.textMuted}
                          multiline
                          numberOfLines={3}
                          maxLength={200}
                          accessibilityLabel="Observação"
                        />
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.btnSalvar, salvandoEdicao && styles.btnDesabilitado]}
                      onPress={() => itemSelecionado && salvarEdicao({ itemSelecionado, editValor, editFormaPagamento, editTipoCombustivel, editData, editObservacao, aba: abaRef.current, setSalvandoEdicao, setRegistrosHoje, setRegistros, fecharModal })}
                      disabled={salvandoEdicao}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.btnSalvarTexto}>
                        {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },

  headerArea: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Colors.text },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '95%',
    alignSelf: 'center',
    flex: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },

  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabBtnAtivo: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    marginBottom: -1,
  },
  tabBtnTexto: { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
  tabBtnTextoAtivo: { color: Colors.primary },

  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  toggleBtnAtivo: { borderColor: Colors.primary, backgroundColor: Colors.selectedBg },
  toggleTexto: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  toggleTextoAtivo: { color: Colors.primary },

  filtroDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  filtroDataBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filtroDataTexto: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  filtroDataTextoAtivo: { color: Colors.text },
  filtroLimparBtn: { padding: 2 },

  loading: { marginTop: 40 },

  listaContent: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },

  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  itemEsquerda: { gap: 4 },
  itemValor: { fontSize: 20, fontWeight: 'bold' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemMetaTexto: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  itemDireita: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemHora: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },

  vazioContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  vazioTexto: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },

  carregarMaisBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 4,
  },
  carregarMaisTexto: { fontSize: 15, color: Colors.primary, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalFundo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 6,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: Colors.text },

  modalBody: {
    padding: 20,
    gap: 20,
  },

  detalheValorContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  detalheValor: { fontSize: 38, fontWeight: 'bold' },
  detalheRow: { gap: 4 },
  detalheLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detalheValorTexto: { fontSize: 17, color: Colors.text, fontWeight: '500' },
  detalheIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  modalAcoes: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btnEditar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  btnEditarTexto: { fontSize: 16, fontWeight: '700', color: Colors.text },
  btnExcluir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.cost,
  },
  btnExcluirTexto: { fontSize: 16, fontWeight: '700', color: Colors.textWhite },

  // Formulário de edição
  grupo: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.label },
  inputValor: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    fontSize: 28,
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: Colors.border,
    fontVariant: ['tabular-nums'],
  },
  opcoes: { flexDirection: 'row', gap: 10 },
  opcaoBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    minHeight: 68,
  },
  opcaoBtnAtivo: { borderColor: Colors.primary, backgroundColor: Colors.selectedBg },
  opcaoTexto: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  opcaoTextoAtivo: { color: Colors.primary },
  inputData: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  inputDataTexto: { fontSize: 17, color: Colors.text, fontWeight: '500' },
  inputObs: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  btnSalvar: {
    backgroundColor: Colors.btnAcao,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 60,
    justifyContent: 'center',
  },
  btnDesabilitado: { opacity: 0.6 },
  btnSalvarTexto: { color: Colors.text, fontSize: 18, fontWeight: 'bold' },
});
