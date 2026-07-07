import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ParsedRow {
  [key: string]: any;
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'txt') {
    return parseCSV(file);
  }

  return parseExcel(file);
}

function parseCSV(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = results.data as ParsedRow[];
        const cleaned = rows.map(r => cleanKeys(r));
        resolve(cleaned);
      },
      error: (err) => reject(err),
    });
  });
}

async function parseExcel(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ParsedRow>(firstSheet, { defval: '' });
  return rows.map(r => cleanKeys(r));
}

function cleanKeys(row: ParsedRow): ParsedRow {
  const cleaned: ParsedRow = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.trim().toUpperCase().replace(/\s+/g, '_');
    cleaned[cleanKey] = typeof value === 'string' ? value.trim() : value;
  }
  return cleaned;
}

// ============================================================
// COLUMN MAPPING - FUNCIONARIOS
// ============================================================
const FUNCIONARIO_COLUMN_ALIASES: Record<string, string[]> = {
  matricula: ['MATRICULA', 'MATRÍCULA', 'MATRICULA_', 'MAT', 'CODIGO', 'COD', 'ID', 'REGISTRO'],
  nome: ['NOME', 'FUNCIONARIO', 'FUNCIONÁRIO', 'COLABORADOR', 'EMPREGADO', 'NOME_COMPLETO', 'NOME DO FUNCIONARIO'],
  cpf: ['CPF', 'CPF_CNPJ'],
  cargo: ['CARGO', 'FUNCAO', 'FUNÇÃO', 'JOB'],
  departamento: ['DEPARTAMENTO', 'DEPTO', 'DEP'],
  setor: ['SETOR', 'AREA', 'ÁREA', 'SECAO', 'SEÇÃO'],
  centro_custo: ['CENTRO_CUSTO', 'CENTRO DE CUSTO', 'CC', 'CUSTO', 'CENTRO_CUSTOS'],
  empresa: ['EMPRESA', 'COMPANHIA', 'FILIAL', 'ORG'],
  unidade: ['UNIDADE', 'FILIAL', 'SITE', 'LOCAL', 'UNID'],
  gestor: ['GESTOR', 'SUPERVISOR', 'CHEFE', 'LIDER', 'LÍDER', 'MANAGER'],
  escala: ['ESCALA', 'TURNO', 'JORNADA'],
  data_admissao: ['DATA_ADMISSAO', 'DATA DE ADMISSAO', 'ADMISSAO', 'ADMISSÃO', 'DT_ADMISSAO', 'DATAADM'],
  status: ['STATUS', 'SITUACAO', 'SITUAÇÃO', 'ATIVO_INATIVO'],
  telefone: ['TELEFONE', 'TEL', 'CELULAR', 'CONTATO'],
  email: ['EMAIL', 'E_MAIL', 'E-MAIL', 'MAIL'],
  observacoes: ['OBSERVACOES', 'OBSERVAÇÕES', 'OBS', 'OBSERVACAO'],
};

export function mapFuncionarioColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const upperHeaders = headers.map(h => h.toUpperCase().replace(/\s+/g, '_'));

  for (const [field, aliases] of Object.entries(FUNCIONARIO_COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const found = upperHeaders.find(h => h === alias || h.includes(alias));
      if (found) {
        mapping[field] = headers[upperHeaders.indexOf(found)];
        break;
      }
    }
  }

  return mapping;
}

// ============================================================
// COLUMN MAPPING - OCORRENCIAS
// ============================================================
const OCORRENCIA_COLUMN_ALIASES: Record<string, string[]> = {
  matricula: ['MATRICULA', 'MATRÍCULA', 'MAT', 'CODIGO', 'COD', 'ID', 'REGISTRO'],
  nome: ['FUNCIONARIO', 'FUNCIONÁRIO', 'NOME', 'COLABORADOR', 'EMPREGADO'],
  codigo: ['COD', 'CODIGO', 'COD_OCORRENCIA', 'CODIGO_OCORRENCIA', 'TIPO', 'COD_OC'],
  ocorrencia: ['OCORRENCIA', 'OCORRÊNCIA', 'TIPO_OCORRENCIA', 'DESCRICAO', 'DESCRIÇÃO', 'NOME_OCORRENCIA'],
  quantidade: ['QUANTIDADE', 'QTD', 'QTDE', 'HORAS', 'QTD_HORAS', 'HORA', 'VALOR'],
  data_ocorrencia: ['DATA_OCORRENCIA', 'DATA DA OCORRENCIA', 'DATA', 'DT_OCORRENCIA', 'DATAOCORR', 'DATA_OCORR'],
};

export function mapOcorrenciaColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const upperHeaders = headers.map(h => h.toUpperCase().replace(/\s+/g, '_'));

  for (const [field, aliases] of Object.entries(OCORRENCIA_COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const found = upperHeaders.find(h => h === alias || h.includes(alias));
      if (found) {
        mapping[field] = headers[upperHeaders.indexOf(found)];
        break;
      }
    }
  }

  return mapping;
}

export function normalizeString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function normalizeNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function normalizeDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  const str = String(value).trim();
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{2})-(\d{2})-(\d{4})/,
  ];
  for (const fmt of formats) {
    const match = str.match(fmt);
    if (match) {
      if (fmt === formats[0]) return `${match[1]}-${match[2]}-${match[3]}`;
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}
