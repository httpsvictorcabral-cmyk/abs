import type { Ocorrencia } from '@/types';

export interface BradfordResult {
  bradford: number;
  instancias: number;
  diasPerdidos: number;
}

export function calculateBradford(ocorrencias: Ocorrencia[]): BradfordResult {
  const absenteismoOcorrencias = ocorrencias.filter(o => {
    if (!o.tipo_ocorrencia) return true;
    return o.tipo_ocorrencia.conta_absenteismo;
  });

  if (absenteismoOcorrencias.length === 0) {
    return { bradford: 0, instancias: 0, diasPerdidos: 0 };
  }

  const instancias = absenteismoOcorrencias.length;
  const totalHoras = absenteismoOcorrencias.reduce((sum, o) => sum + Number(o.quantidade), 0);
  const diasPerdidos = totalHoras / 8;

  const bradford = Math.pow(instancias, 2) * diasPerdidos;

  return {
    bradford: Math.round(bradford * 100) / 100,
    instancias,
    diasPerdidos: Math.round(diasPerdidos * 100) / 100,
  };
}

export function calculateIndiceAbsenteismo(
  horasPerdidas: number,
  horasPrevistas: number
): number {
  if (horasPrevistas === 0) return 0;
  return Math.round((horasPerdidas / horasPrevistas) * 100 * 100) / 100;
}

export function calculateTempoMedioPerdido(
  ocorrencias: Ocorrencia[],
  totalFuncionarios: number
): number {
  if (totalFuncionarios === 0) return 0;
  const totalHoras = ocorrencias.reduce((sum, o) => sum + Number(o.quantidade), 0);
  return Math.round((totalHoras / totalFuncionarios) * 100) / 100;
}

export interface MonthlyData {
  mes: number;
  mesNome: string;
  ano: number;
  horas: number;
  ocorrencias: number;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function aggregateByMonth(ocorrencias: Ocorrencia[]): MonthlyData[] {
  const map = new Map<string, MonthlyData>();

  for (const o of ocorrencias) {
    const key = `${o.ano}-${o.mes}`;
    if (!map.has(key)) {
      map.set(key, {
        mes: o.mes,
        mesNome: MESES[o.mes - 1],
        ano: o.ano,
        horas: 0,
        ocorrencias: 0,
      });
    }
    const entry = map.get(key)!;
    entry.horas += Number(o.quantidade);
    entry.ocorrencias += 1;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.mes - b.mes;
  });
}

export interface RankingItem {
  nome: string;
  valor: number;
  id?: string;
}

export function aggregateByField(
  ocorrencias: Ocorrencia[],
  field: 'funcionario' | 'setor' | 'cargo' | 'gestor' | 'empresa' | 'tipo'
): RankingItem[] {
  const map = new Map<string, number>();

  for (const o of ocorrencias) {
    let nome = 'N/A';
    if (field === 'funcionario') nome = o.funcionario?.nome || 'N/A';
    else if (field === 'tipo') nome = o.nome_ocorrencia || o.tipo_ocorrencia?.nome || 'N/A';
    else if (o.funcionario) {
      const f = o.funcionario as any;
      if (field === 'setor') nome = f.setor?.nome || 'N/A';
      else if (field === 'cargo') nome = f.cargo?.nome || 'N/A';
      else if (field === 'gestor') nome = f.gestor?.nome || 'N/A';
      else if (field === 'empresa') nome = f.empresa?.nome || 'N/A';
    }

    map.set(nome, (map.get(nome) || 0) + Number(o.quantidade));
  }

  return Array.from(map.entries())
    .map(([nome, valor]) => ({ nome, valor: Math.round(valor * 100) / 100 }))
    .sort((a, b) => b.valor - a.valor);
}

export interface HeatmapData {
  diaSemana: string;
  hora: number;
  valor: number;
}

export function aggregateHeatmap(ocorrencias: Ocorrencia[]): HeatmapData[] {
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const map = new Map<string, number>();

  for (const o of ocorrencias) {
    const date = new Date(o.data_ocorrencia);
    const dia = diasSemana[date.getDay()];
    const key = `${dia}`;
    map.set(key, (map.get(key) || 0) + Number(o.quantidade));
  }

  return diasSemana.map(dia => ({
    diaSemana: dia,
    hora: 0,
    valor: Math.round((map.get(dia) || 0) * 100) / 100,
  }));
}

export interface CalendarData {
  date: string;
  value: number;
}

export function aggregateCalendar(ocorrencias: Ocorrencia[]): CalendarData[] {
  const map = new Map<string, number>();

  for (const o of ocorrencias) {
    map.set(o.data_ocorrencia, (map.get(o.data_ocorrencia) || 0) + Number(o.quantidade));
  }

  return Array.from(map.entries())
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface DayOfWeekData {
  dia: string;
  horas: number;
  ocorrencias: number;
}

export function aggregateByDayOfWeek(ocorrencias: Ocorrencia[]): DayOfWeekData[] {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const map = new Map<number, { horas: number; ocorrencias: number }>();

  for (const o of ocorrencias) {
    const date = new Date(o.data_ocorrencia);
    const day = date.getDay();
    if (!map.has(day)) map.set(day, { horas: 0, ocorrencias: 0 });
    const entry = map.get(day)!;
    entry.horas += Number(o.quantidade);
    entry.ocorrencias += 1;
  }

  return dias.map((dia, i) => ({
    dia,
    horas: Math.round((map.get(i)?.horas || 0) * 100) / 100,
    ocorrencias: map.get(i)?.ocorrencias || 0,
  }));
}

export function getReincidentes(ocorrencias: Ocorrencia[], limite = 3): RankingItem[] {
  const map = new Map<string, number>();
  for (const o of ocorrencias) {
    const nome = o.funcionario?.nome || 'N/A';
    map.set(nome, (map.get(nome) || 0) + 1);
  }
  return Array.from(map.entries())
    .filter(([, count]) => count >= limite)
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function getTopAbsenteistas(ocorrencias: Ocorrencia[], top = 10): RankingItem[] {
  return aggregateByField(ocorrencias, 'funcionario').slice(0, top);
}
