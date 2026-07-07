export type UserRole = 'Administrador' | 'RH' | 'Gestor' | 'Visualizador';

export interface Permissao {
  id: string;
  nome: string;
  descricao: string | null;
  nivel: number;
  permissoes: string[];
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  permissao_id: string | null;
  ativo: boolean;
  telefone: string | null;
  avatar_url: string | null;
  ultimo_acesso: string | null;
  created_at: string;
  updated_at: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  razao_social: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unidade {
  id: string;
  nome: string;
  empresa_id: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  ativa: boolean;
  empresa?: Empresa;
  created_at: string;
  updated_at: string;
}

export interface Departamento {
  id: string;
  nome: string;
  unidade_id: string;
  ativo: boolean;
  unidade?: Unidade;
  created_at: string;
  updated_at: string;
}

export interface Setor {
  id: string;
  nome: string;
  departamento_id: string;
  ativo: boolean;
  departamento?: Departamento;
  created_at: string;
  updated_at: string;
}

export interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  empresa_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Gestor {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  unidade_id: string | null;
  setor_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cargo {
  id: string;
  nome: string;
  cbo: string | null;
  nivel: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Funcionario {
  id: string;
  matricula: string;
  nome: string;
  cpf: string | null;
  cargo_id: string | null;
  departamento_id: string | null;
  setor_id: string | null;
  centro_custo_id: string | null;
  empresa_id: string | null;
  unidade_id: string | null;
  gestor_id: string | null;
  escala: string | null;
  data_admissao: string | null;
  status: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  cargo?: Cargo;
  departamento?: Departamento;
  setor?: Setor;
  centro_custo?: CentroCusto;
  empresa?: Empresa;
  unidade?: Unidade;
  gestor?: Gestor;
  created_at: string;
  updated_at: string;
}

export interface TipoOcorrencia {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  conta_absenteismo: boolean;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ocorrencia {
  id: string;
  funcionario_id: string;
  tipo_ocorrencia_id: string | null;
  codigo_ocorrencia: string | null;
  nome_ocorrencia: string | null;
  quantidade: number;
  unidade_medida: string;
  data_ocorrencia: string;
  mes: number;
  ano: number;
  observacoes: string | null;
  importacao_id: string | null;
  funcionario?: Funcionario;
  tipo_ocorrencia?: TipoOcorrencia;
  created_at: string;
  updated_at: string;
}

export interface Importacao {
  id: string;
  tipo: string;
  nome_arquivo: string;
  tamanho_arquivo: number | null;
  total_registros: number;
  importados: number;
  atualizados: number;
  duplicados: number;
  ignorados: number;
  erros: number;
  pendencias: number;
  status: string;
  usuario_id: string | null;
  log_detalhado: any[];
  usuario?: Usuario;
  created_at: string;
  updated_at: string;
}

export interface PendenciaImportacao {
  id: string;
  importacao_id: string;
  matricula: string | null;
  nome_funcionario: string | null;
  codigo_ocorrencia: string | null;
  nome_ocorrencia: string | null;
  quantidade: number | null;
  data_ocorrencia: string | null;
  motivo: string;
  dados_originais: any;
  status: string;
  resolved_at: string | null;
  resolved_by: string | null;
  importacao?: Importacao;
  created_at: string;
}

export interface LogImportacao {
  id: string;
  importacao_id: string;
  nivel: string;
  mensagem: string;
  detalhes: any;
  linha: number | null;
  created_at: string;
}

export interface Auditoria {
  id: string;
  tabela: string;
  registro_id: string | null;
  operacao: string;
  dados_anteriores: any;
  dados_posteriores: any;
  usuario_id: string | null;
  usuario_email: string | null;
  usuario_nome: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Configuracao {
  id: string;
  chave: string;
  valor: any;
  descricao: string | null;
  categoria: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardKPIs {
  totalColaboradores: number;
  funcionariosComOcorrencia: number;
  horasPerdidas: number;
  horasPerdidasMes: number;
  horasPerdidasAno: number;
  quantidadeOcorrencias: number;
  indiceAbsenteismo: number;
  bradfordFactor: number;
  tempoMedioPerdido: number;
  topSetor: { nome: string; valor: number } | null;
  topGestor: { nome: string; valor: number } | null;
  topCargo: { nome: string; valor: number } | null;
  topFuncionario: { nome: string; valor: number } | null;
  metaAbsenteismo: number;
}

export interface FiltrosGlobais {
  dataInicio: string | null;
  dataFim: string | null;
  empresaId: string | null;
  unidadeId: string | null;
  departamentoId: string | null;
  setorId: string | null;
  cargoId: string | null;
  gestorId: string | null;
  funcionarioId: string | null;
  tipoOcorrenciaId: string | null;
}

export interface Alerta {
  id: string;
  tipo: string;
  severidade: 'alta' | 'media' | 'baixa';
  titulo: string;
  descricao: string;
  funcionario_id?: string;
  funcionario_nome?: string;
  valor: number;
  limite: number;
  created_at: string;
}
