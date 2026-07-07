import { supabase } from './supabase';
import type {
  Empresa, Unidade, Departamento, Setor, CentroCusto,
  Gestor, Cargo, Funcionario, TipoOcorrencia, Ocorrencia,
  Importacao, PendenciaImportacao, Auditoria, Configuracao,
  FiltrosGlobais,
} from '@/types';

export function buildFiltroQuery(query: any, filtros: Partial<FiltrosGlobais> = {}): any {
  let q = query;
  if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
  if (filtros.unidadeId) q = q.eq('unidade_id', filtros.unidadeId);
  if (filtros.departamentoId) q = q.eq('departamento_id', filtros.departamentoId);
  if (filtros.setorId) q = q.eq('setor_id', filtros.setorId);
  if (filtros.cargoId) q = q.eq('cargo_id', filtros.cargoId);
  if (filtros.gestorId) q = q.eq('gestor_id', filtros.gestorId);
  if (filtros.funcionarioId) q = q.eq('funcionario_id', filtros.funcionarioId);
  if (filtros.tipoOcorrenciaId) q = q.eq('tipo_ocorrencia_id', filtros.tipoOcorrenciaId);
  if (filtros.dataInicio) q = q.gte('data_ocorrencia', filtros.dataInicio);
  if (filtros.dataFim) q = q.lte('data_ocorrencia', filtros.dataFim);
  return q;
}

// ============================================================
// EMPRESAS
// ============================================================
export const empresasService = {
  async list(): Promise<Empresa[]> {
    const { data, error } = await supabase.from('empresas').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },
  async create(emp: Partial<Empresa>): Promise<Empresa> {
    const { data, error } = await supabase.from('empresas').insert(emp).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, emp: Partial<Empresa>): Promise<Empresa> {
    const { data, error } = await supabase.from('empresas').update(emp).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('empresas').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// UNIDADES
// ============================================================
export const unidadesService = {
  async list(): Promise<Unidade[]> {
    const { data, error } = await supabase
      .from('unidades')
      .select('*, empresa:empresas(*)')
      .order('nome');
    if (error) throw error;
    return data || [];
  },
  async create(u: Partial<Unidade>): Promise<Unidade> {
    const { data, error } = await supabase.from('unidades').insert(u).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, u: Partial<Unidade>): Promise<Unidade> {
    const { data, error } = await supabase.from('unidades').update(u).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('unidades').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// DEPARTAMENTOS
// ============================================================
export const departamentosService = {
  async list(): Promise<Departamento[]> {
    const { data, error } = await supabase
      .from('departamentos')
      .select('*, unidade:unidades(*, empresa:empresas(*))')
      .order('nome');
    if (error) throw error;
    return data || [];
  },
  async create(d: Partial<Departamento>): Promise<Departamento> {
    const { data, error } = await supabase.from('departamentos').insert(d).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, d: Partial<Departamento>): Promise<Departamento> {
    const { data, error } = await supabase.from('departamentos').update(d).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('departamentos').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// SETORES
// ============================================================
export const setoresService = {
  async list(): Promise<Setor[]> {
    const { data, error } = await supabase
      .from('setores')
      .select('*, departamento:departamentos(*, unidade:unidades(*, empresa:empresas(*)))')
      .order('nome');
    if (error) throw error;
    return data || [];
  },
  async create(s: Partial<Setor>): Promise<Setor> {
    const { data, error } = await supabase.from('setores').insert(s).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, s: Partial<Setor>): Promise<Setor> {
    const { data, error } = await supabase.from('setores').update(s).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('setores').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// CENTRO_CUSTOS
// ============================================================
export const centroCustosService = {
  async list(): Promise<CentroCusto[]> {
    const { data, error } = await supabase
      .from('centro_custos')
      .select('*, empresa:empresas(*)')
      .order('nome');
    if (error) throw error;
    return data || [];
  },
  async create(c: Partial<CentroCusto>): Promise<CentroCusto> {
    const { data, error } = await supabase.from('centro_custos').insert(c).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, c: Partial<CentroCusto>): Promise<CentroCusto> {
    const { data, error } = await supabase.from('centro_custos').update(c).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('centro_custos').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// GESTORES
// ============================================================
export const gestoresService = {
  async list(): Promise<Gestor[]> {
    const { data, error } = await supabase.from('gestores').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },
  async create(g: Partial<Gestor>): Promise<Gestor> {
    const { data, error } = await supabase.from('gestores').insert(g).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, g: Partial<Gestor>): Promise<Gestor> {
    const { data, error } = await supabase.from('gestores').update(g).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('gestores').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// CARGOS
// ============================================================
export const cargosService = {
  async list(): Promise<Cargo[]> {
    const { data, error } = await supabase.from('cargos').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },
  async create(c: Partial<Cargo>): Promise<Cargo> {
    const { data, error } = await supabase.from('cargos').insert(c).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, c: Partial<Cargo>): Promise<Cargo> {
    const { data, error } = await supabase.from('cargos').update(c).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('cargos').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// FUNCIONARIOS
// ============================================================
export const funcionariosService = {
  async list(page = 1, pageSize = 20, search = '', filtros?: Partial<FiltrosGlobais>): Promise<{ data: Funcionario[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('funcionarios')
      .select('*, cargo:cargos(*), setor:setores(*), departamento:departamentos(*), empresa:empresas(*), unidade:unidades(*), gestor:gestores(*), centro_custo:centro_custos(*)', { count: 'exact' });
    query = buildFiltroQuery(query, filtros);
    if (search) query = query.or(`nome.ilike.%${search}%,matricula.ilike.%${search}%`);
    query = query.order('nome').range(from, to);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },
  async getById(id: string): Promise<Funcionario | null> {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*, cargo:cargos(*), setor:setores(*, departamento:departamentos(*, unidade:unidades(*, empresa:empresas(*)))), empresa:empresas(*), unidade:unidades(*), gestor:gestores(*), centro_custo:centro_custos(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async getByMatricula(matricula: string): Promise<Funcionario | null> {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('matricula', matricula)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async create(f: Partial<Funcionario>): Promise<Funcionario> {
    const { data, error } = await supabase.from('funcionarios').insert(f).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, f: Partial<Funcionario>): Promise<Funcionario> {
    const { data, error } = await supabase.from('funcionarios').update(f).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('funcionarios').delete().eq('id', id);
    if (error) throw error;
  },
  async upsertBatch(funcs: Partial<Funcionario>[]): Promise<{ created: number; updated: number; errors: number }> {
    let created = 0, updated = 0, errors = 0;
    for (const f of funcs) {
      if (!f.matricula) { errors++; continue; }
      const existing = await this.getByMatricula(f.matricula);
      if (existing) {
        const { error } = await supabase.from('funcionarios').update(f).eq('id', existing.id);
        if (error) errors++; else updated++;
      } else {
        const { error } = await supabase.from('funcionarios').insert(f);
        if (error) errors++; else created++;
      }
    }
    return { created, updated, errors };
  },
};

// ============================================================
// TIPOS_OCORRENCIAS
// ============================================================
export const tiposOcorrenciaService = {
  async list(): Promise<TipoOcorrencia[]> {
    const { data, error } = await supabase.from('tipos_ocorrencias').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },
  async create(t: Partial<TipoOcorrencia>): Promise<TipoOcorrencia> {
    const { data, error } = await supabase.from('tipos_ocorrencias').insert(t).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, t: Partial<TipoOcorrencia>): Promise<TipoOcorrencia> {
    const { data, error } = await supabase.from('tipos_ocorrencias').update(t).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tipos_ocorrencias').delete().eq('id', id);
    if (error) throw error;
  },
  async getByCodigo(codigo: string): Promise<TipoOcorrencia | null> {
    const { data, error } = await supabase
      .from('tipos_ocorrencias')
      .select('*')
      .eq('codigo', codigo)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async getOrCreateByCodigo(codigo: string, nome: string): Promise<TipoOcorrencia> {
    const existing = await this.getByCodigo(codigo);
    if (existing) return existing;
    return await this.create({ codigo, nome, conta_absenteismo: true, cor: '#ef4444' });
  },
};

// ============================================================
// OCORRENCIAS
// ============================================================
export const ocorrenciasService = {
  async list(page = 1, pageSize = 20, filtros?: Partial<FiltrosGlobais>): Promise<{ data: Ocorrencia[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('ocorrencias')
      .select('*, funcionario:funcionarios(*), tipo_ocorrencia:tipos_ocorrencias(*)', { count: 'exact' });
    query = buildFiltroQuery(query, filtros);
    query = query.order('data_ocorrencia', { ascending: false }).range(from, to);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },
  async getByFuncionario(funcionarioId: string): Promise<Ocorrencia[]> {
    const { data, error } = await supabase
      .from('ocorrencias')
      .select('*, tipo_ocorrencia:tipos_ocorrencias(*)')
      .eq('funcionario_id', funcionarioId)
      .order('data_ocorrencia', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(o: Partial<Ocorrencia>): Promise<Ocorrencia> {
    const { data, error } = await supabase.from('ocorrencias').insert(o).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, o: Partial<Ocorrencia>): Promise<Ocorrencia> {
    const { data, error } = await supabase.from('ocorrencias').update(o).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('ocorrencias').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// IMPORTACOES
// ============================================================
export const importacoesService = {
  async list(): Promise<Importacao[]> {
    const { data, error } = await supabase
      .from('importacoes')
      .select('*, usuario:usuarios(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(i: Partial<Importacao>): Promise<Importacao> {
    const { data, error } = await supabase.from('importacoes').insert(i).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, i: Partial<Importacao>): Promise<Importacao> {
    const { data, error } = await supabase.from('importacoes').update(i).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('importacoes').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// PENDENCIAS
// ============================================================
export const pendenciasService = {
  async list(): Promise<PendenciaImportacao[]> {
    const { data, error } = await supabase
      .from('pendencias_importacao')
      .select('*, importacao:importacoes(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(p: Partial<PendenciaImportacao>): Promise<void> {
    const { error } = await supabase.from('pendencias_importacao').insert(p);
    if (error) throw error;
  },
  async resolve(id: string): Promise<void> {
    const { error } = await supabase
      .from('pendencias_importacao')
      .update({ status: 'Resolvido', resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// AUDITORIA
// ============================================================
export const auditoriaService = {
  async list(page = 1, pageSize = 20): Promise<{ data: Auditoria[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from('auditoria')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },
  async create(a: Partial<Auditoria>): Promise<void> {
    const { error } = await supabase.from('auditoria').insert(a);
    if (error) throw error;
  },
};

// ============================================================
// CONFIGURACOES
// ============================================================
export const configuracoesService = {
  async list(): Promise<Configuracao[]> {
    const { data, error } = await supabase.from('configuracoes').select('*').order('chave');
    if (error) throw error;
    return data || [];
  },
  async get(chave: string): Promise<any> {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', chave)
      .maybeSingle();
    if (error) throw error;
    return data?.valor;
  },
  async update(chave: string, valor: any): Promise<void> {
    const { error } = await supabase
      .from('configuracoes')
      .update({ valor, updated_at: new Date().toISOString() })
      .eq('chave', chave);
    if (error) throw error;
  },
};

// ============================================================
// USUARIOS
// ============================================================
export const usuariosService = {
  async list(): Promise<any[]> {
    const { data, error } = await supabase.from('usuarios').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },
  async updateRole(id: string, role: string): Promise<void> {
    const { error } = await supabase.from('usuarios').update({ role }).eq('id', id);
    if (error) throw error;
  },
  async toggleAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase.from('usuarios').update({ ativo }).eq('id', id);
    if (error) throw error;
  },
};
