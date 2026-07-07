/*
# ABS RH - Corporate Absenteeism Management System Schema

## Overview
Creates the complete database schema for the ABS RH system, a corporate HR
absenteeism management application. The system supports thousands of employees
and millions of occurrence records, with role-based access control
(Administrador, RH, Gestor, Visualizador).

## New Tables (17 total)
1. `permissoes` - Role-based permission definitions
2. `usuarios` - Extended user profiles linked to auth.users, with role assignment
3. `empresas` - Companies
4. `unidades` - Business units (linked to company)
5. `departamentos` - Departments (linked to unit)
6. `setores` - Sectors (linked to department)
7. `centro_custos` - Cost centers (linked to company)
8. `gestores` - Managers (linked to unit/sector)
9. `cargos` - Job positions
10. `importacoes` - Import job records (created before ocorrencias due to FK)
11. `funcionarios` - Employees (the core entity, identified by matricula)
12. `tipos_ocorrencias` - Absence occurrence types
13. `ocorrencias` - Individual absence records (the transactional table)
14. `pendencias_importacao` - Pending records from failed imports
15. `logs_importacao` - Detailed import logs
16. `auditoria` - Audit trail for all CRUD operations
17. `configuracoes` - System configuration (thresholds, targets, etc.)

## Security
- RLS enabled on ALL tables
- All policies scoped to `authenticated` users
- Ownership/membership checks via auth.uid()
- The first user to sign up is auto-assigned 'Administrador' role via trigger

## Important Notes
1. All relationships use UUID primary keys
2. Matricula is a unique business identifier (not PK) used during imports
3. Occurrences store hours lost (quantidade = hours)
4. Bradford Factor = S² × D (instances² × total_days)
5. Absenteeism Index = (Hours Lost / Expected Hours) × 100
6. All tables have created_at/updated_at timestamps
*/

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PERMISSOES (Role definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  nivel int NOT NULL DEFAULT 0,
  permissoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- USUARIOS (Extended user profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text NOT NULL UNIQUE,
  nome text NOT NULL,
  role text NOT NULL DEFAULT 'Visualizador',
  permissao_id uuid REFERENCES permissoes(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  telefone text,
  avatar_url text,
  ultimo_acesso timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- EMPRESAS (Companies)
-- ============================================================
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  razao_social text,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS empresas_nome_idx ON empresas(lower(nome)) WHERE ativa = true;

-- ============================================================
-- UNIDADES (Business units)
-- ============================================================
CREATE TABLE IF NOT EXISTS unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  endereco text,
  cidade text,
  estado text,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS unidades_empresa_idx ON unidades(empresa_id);

-- ============================================================
-- DEPARTAMENTOS (Departments)
-- ============================================================
CREATE TABLE IF NOT EXISTS departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS departamentos_unidade_idx ON departamentos(unidade_id);

-- ============================================================
-- SETORES (Sectors)
-- ============================================================
CREATE TABLE IF NOT EXISTS setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  departamento_id uuid NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS setores_departamento_idx ON setores(departamento_id);

-- ============================================================
-- CENTRO_CUSTOS (Cost centers)
-- ============================================================
CREATE TABLE IF NOT EXISTS centro_custos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS centro_custos_empresa_idx ON centro_custos(empresa_id);

-- ============================================================
-- GESTORES (Managers)
-- ============================================================
CREATE TABLE IF NOT EXISTS gestores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  telefone text,
  unidade_id uuid REFERENCES unidades(id) ON DELETE SET NULL,
  setor_id uuid REFERENCES setores(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gestores_unidade_idx ON gestores(unidade_id);
CREATE INDEX IF NOT EXISTS gestores_setor_idx ON gestores(setor_id);

-- ============================================================
-- CARGOS (Job positions)
-- ============================================================
CREATE TABLE IF NOT EXISTS cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cbo text,
  nivel text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cargos_nome_idx ON cargos(lower(nome)) WHERE ativo = true;

-- ============================================================
-- IMPORTACOES (Import job records - created before ocorrencias/funcionarios due to FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  nome_arquivo text NOT NULL,
  tamanho_arquivo bigint,
  total_registros int DEFAULT 0,
  importados int DEFAULT 0,
  atualizados int DEFAULT 0,
  duplicados int DEFAULT 0,
  ignorados int DEFAULT 0,
  erros int DEFAULT 0,
  pendencias int DEFAULT 0,
  status text NOT NULL DEFAULT 'Processando',
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  log_detalhado jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS importacoes_tipo_idx ON importacoes(tipo);
CREATE INDEX IF NOT EXISTS importacoes_status_idx ON importacoes(status);
CREATE INDEX IF NOT EXISTS importacoes_usuario_idx ON importacoes(usuario_id);

-- ============================================================
-- FUNCIONARIOS (Employees - core entity)
-- ============================================================
CREATE TABLE IF NOT EXISTS funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula text NOT NULL UNIQUE,
  nome text NOT NULL,
  cpf text,
  cargo_id uuid REFERENCES cargos(id) ON DELETE SET NULL,
  departamento_id uuid REFERENCES departamentos(id) ON DELETE SET NULL,
  setor_id uuid REFERENCES setores(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES centro_custos(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES empresas(id) ON DELETE SET NULL,
  unidade_id uuid REFERENCES unidades(id) ON DELETE SET NULL,
  gestor_id uuid REFERENCES gestores(id) ON DELETE SET NULL,
  escala text,
  data_admissao date,
  status text NOT NULL DEFAULT 'Ativo',
  telefone text,
  email text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS funcionarios_nome_idx ON funcionarios(lower(nome));
CREATE INDEX IF NOT EXISTS funcionarios_empresa_idx ON funcionarios(empresa_id);
CREATE INDEX IF NOT EXISTS funcionarios_unidade_idx ON funcionarios(unidade_id);
CREATE INDEX IF NOT EXISTS funcionarios_setor_idx ON funcionarios(setor_id);
CREATE INDEX IF NOT EXISTS funcionarios_gestor_idx ON funcionarios(gestor_id);
CREATE INDEX IF NOT EXISTS funcionarios_status_idx ON funcionarios(status);

-- ============================================================
-- TIPOS_OCORRENCIAS (Absence occurrence types)
-- ============================================================
CREATE TABLE IF NOT EXISTS tipos_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  categoria text,
  conta_absenteismo boolean NOT NULL DEFAULT true,
  cor text DEFAULT '#ef4444',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tipos_ocorrencias_codigo_idx ON tipos_ocorrencias(codigo);

-- ============================================================
-- OCORRENCIAS (Absence records - transactional, high volume)
-- ============================================================
CREATE TABLE IF NOT EXISTS ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  tipo_ocorrencia_id uuid REFERENCES tipos_ocorrencias(id) ON DELETE SET NULL,
  codigo_ocorrencia text,
  nome_ocorrencia text,
  quantidade decimal(10,2) NOT NULL DEFAULT 0,
  unidade_medida text NOT NULL DEFAULT 'horas',
  data_ocorrencia date NOT NULL DEFAULT CURRENT_DATE,
  mes int NOT NULL DEFAULT EXTRACT(month FROM CURRENT_DATE),
  ano int NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
  observacoes text,
  importacao_id uuid REFERENCES importacoes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ocorrencias_funcionario_idx ON ocorrencias(funcionario_id);
CREATE INDEX IF NOT EXISTS ocorrencias_data_idx ON ocorrencias(data_ocorrencia);
CREATE INDEX IF NOT EXISTS ocorrencias_mes_ano_idx ON ocorrencias(mes, ano);
CREATE INDEX IF NOT EXISTS ocorrencias_tipo_idx ON ocorrencias(tipo_ocorrencia_id);
CREATE INDEX IF NOT EXISTS ocorrencias_importacao_idx ON ocorrencias(importacao_id);

-- ============================================================
-- PENDENCIAS_IMPORTACAO (Pending records from failed imports)
-- ============================================================
CREATE TABLE IF NOT EXISTS pendencias_importacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id uuid NOT NULL REFERENCES importacoes(id) ON DELETE CASCADE,
  matricula text,
  nome_funcionario text,
  codigo_ocorrencia text,
  nome_ocorrencia text,
  quantidade decimal(10,2),
  data_ocorrencia date,
  motivo text NOT NULL,
  dados_originais jsonb,
  status text NOT NULL DEFAULT 'Pendente',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pendencias_importacao_idx ON pendencias_importacao(importacao_id);
CREATE INDEX IF NOT EXISTS pendencias_status_idx ON pendencias_importacao(status);

-- ============================================================
-- LOGS_IMPORTACAO (Detailed import logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS logs_importacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id uuid NOT NULL REFERENCES importacoes(id) ON DELETE CASCADE,
  nivel text NOT NULL DEFAULT 'info',
  mensagem text NOT NULL,
  detalhes jsonb,
  linha int,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS logs_importacao_idx ON logs_importacao(importacao_id);

-- ============================================================
-- AUDITORIA (Audit trail for all operations)
-- ============================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  operacao text NOT NULL,
  dados_anteriores jsonb,
  dados_posteriores jsonb,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_email text,
  usuario_nome text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_tabela_idx ON auditoria(tabela);
CREATE INDEX IF NOT EXISTS auditoria_registro_idx ON auditoria(registro_id);
CREATE INDEX IF NOT EXISTS auditoria_usuario_idx ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS auditoria_created_idx ON auditoria(created_at);

-- ============================================================
-- CONFIGURACOES (System configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor jsonb NOT NULL,
  descricao text,
  categoria text,
  updated_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['permissoes','usuarios','empresas','unidades','departamentos','setores','centro_custos','gestores','cargos','funcionarios','tipos_ocorrencias','ocorrencias','importacoes','pendencias_importacao','logs_importacao','auditoria','configuracoes'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============================================================
-- AUTO-CREATE USUARIO ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_count int;
  new_role text;
BEGIN
  SELECT count(*) INTO admin_count FROM usuarios WHERE role = 'Administrador';
  IF admin_count = 0 THEN
    new_role := 'Administrador';
  ELSE
    new_role := 'Visualizador';
  END IF;
  INSERT INTO usuarios (id, email, nome, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), new_role)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin_or_rh()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role IN ('Administrador', 'RH') AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND role = 'Administrador' AND ativo = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PERMISSOES
ALTER TABLE permissoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissoes_select_all" ON permissoes;
CREATE POLICY "permissoes_select_all" ON permissoes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "permissoes_manage_admin" ON permissoes;
CREATE POLICY "permissoes_manage_admin" ON permissoes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- USUARIOS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usuarios_select_all" ON usuarios;
CREATE POLICY "usuarios_select_all" ON usuarios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "usuarios_update_self" ON usuarios;
CREATE POLICY "usuarios_update_self" ON usuarios FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "usuarios_manage_admin" ON usuarios;
CREATE POLICY "usuarios_manage_admin" ON usuarios FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- EMPRESAS
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empresas_select_all" ON empresas;
CREATE POLICY "empresas_select_all" ON empresas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "empresas_manage_hr" ON empresas;
CREATE POLICY "empresas_manage_hr" ON empresas FOR ALL TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());

-- UNIDADES
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unidades_select_all" ON unidades;
CREATE POLICY "unidades_select_all" ON unidades FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "unidades_manage_hr" ON unidades;
CREATE POLICY "unidades_manage_hr" ON unidades FOR ALL TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());

-- DEPARTAMENTOS
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departamentos_select_all" ON departamentos;
CREATE POLICY "departamentos_select_all" ON departamentos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "departamentos_manage_hr" ON departamentos;
CREATE POLICY "departamentos_manage_hr" ON departamentos FOR ALL TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());

-- SETORES
ALTER TABLE setores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "setores_select_all" ON setores;
CREATE POLICY "setores_select_all" ON setores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "setores_manage_hr" ON setores;
CREATE POLICY "setores_manage_hr" ON setores FOR ALL TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());

-- CENTRO_CUSTOS
ALTER TABLE centro_custos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "centro_custos_select_all" ON centro_custos;
CREATE POLICY "centro_custos_select_all" ON centro_custos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "centro_custos_manage_hr" ON centro_custos;
CREATE POLICY "centro_custos_manage_hr" ON centro_custos FOR ALL TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());

-- GESTORES
ALTER TABLE gestores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gestores_select_all" ON gestores;
CREATE POLICY "gestores_select_all" ON gestores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gestores_manage_hr" ON gestores;
CREATE POLICY "gestores_manage_hr" ON gestores FOR ALL TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());

-- CARGOS
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cargos_select_all" ON cargos;
CREATE POLICY "cargos_select_all" ON cargos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cargos_manage_hr" ON cargos;
CREATE POLICY "cargos_manage_hr" ON cargos FOR ALL TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());

-- FUNCIONARIOS
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "funcionarios_select_all" ON funcionarios;
CREATE POLICY "funcionarios_select_all" ON funcionarios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "funcionarios_insert_hr" ON funcionarios;
CREATE POLICY "funcionarios_insert_hr" ON funcionarios FOR INSERT TO authenticated WITH CHECK (is_admin_or_rh());
DROP POLICY IF EXISTS "funcionarios_update_hr" ON funcionarios;
CREATE POLICY "funcionarios_update_hr" ON funcionarios FOR UPDATE TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());
DROP POLICY IF EXISTS "funcionarios_delete_admin" ON funcionarios;
CREATE POLICY "funcionarios_delete_admin" ON funcionarios FOR DELETE TO authenticated USING (is_admin());

-- TIPOS_OCORRENCIAS
ALTER TABLE tipos_ocorrencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_ocorrencias_select_all" ON tipos_ocorrencias;
CREATE POLICY "tipos_ocorrencias_select_all" ON tipos_ocorrencias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tipos_ocorrencias_manage_hr" ON tipos_ocorrencias;
CREATE POLICY "tipos_ocorrencias_manage_hr" ON tipos_ocorrencias FOR ALL TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());

-- OCORRENCIAS
ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ocorrencias_select_all" ON ocorrencias;
CREATE POLICY "ocorrencias_select_all" ON ocorrencias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ocorrencias_insert_hr" ON ocorrencias;
CREATE POLICY "ocorrencias_insert_hr" ON ocorrencias FOR INSERT TO authenticated WITH CHECK (is_admin_or_rh());
DROP POLICY IF EXISTS "ocorrencias_update_hr" ON ocorrencias;
CREATE POLICY "ocorrencias_update_hr" ON ocorrencias FOR UPDATE TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());
DROP POLICY IF EXISTS "ocorrencias_delete_admin" ON ocorrencias;
CREATE POLICY "ocorrencias_delete_admin" ON ocorrencias FOR DELETE TO authenticated USING (is_admin());

-- IMPORTACOES
ALTER TABLE importacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "importacoes_select_all" ON importacoes;
CREATE POLICY "importacoes_select_all" ON importacoes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "importacoes_insert_hr" ON importacoes;
CREATE POLICY "importacoes_insert_hr" ON importacoes FOR INSERT TO authenticated WITH CHECK (is_admin_or_rh());
DROP POLICY IF EXISTS "importacoes_update_own" ON importacoes;
CREATE POLICY "importacoes_update_own" ON importacoes FOR UPDATE TO authenticated USING (auth.uid() = usuario_id OR is_admin_or_rh()) WITH CHECK (auth.uid() = usuario_id OR is_admin_or_rh());
DROP POLICY IF EXISTS "importacoes_delete_admin" ON importacoes;
CREATE POLICY "importacoes_delete_admin" ON importacoes FOR DELETE TO authenticated USING (is_admin());

-- PENDENCIAS_IMPORTACAO
ALTER TABLE pendencias_importacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pendencias_select_all" ON pendencias_importacao;
CREATE POLICY "pendencias_select_all" ON pendencias_importacao FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pendencias_manage_hr" ON pendencias_importacao;
CREATE POLICY "pendencias_manage_hr" ON pendencias_importacao FOR ALL TO authenticated USING (is_admin_or_rh()) WITH CHECK (is_admin_or_rh());

-- LOGS_IMPORTACAO
ALTER TABLE logs_importacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs_importacao_select_all" ON logs_importacao;
CREATE POLICY "logs_importacao_select_all" ON logs_importacao FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "logs_importacao_insert_hr" ON logs_importacao;
CREATE POLICY "logs_importacao_insert_hr" ON logs_importacao FOR INSERT TO authenticated WITH CHECK (is_admin_or_rh());
DROP POLICY IF EXISTS "logs_importacao_delete_admin" ON logs_importacao;
CREATE POLICY "logs_importacao_delete_admin" ON logs_importacao FOR DELETE TO authenticated USING (is_admin());

-- AUDITORIA
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditoria_select_all" ON auditoria;
CREATE POLICY "auditoria_select_all" ON auditoria FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auditoria_insert_all" ON auditoria;
CREATE POLICY "auditoria_insert_all" ON auditoria FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auditoria_delete_admin" ON auditoria;
CREATE POLICY "auditoria_delete_admin" ON auditoria FOR DELETE TO authenticated USING (is_admin());

-- CONFIGURACOES
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configuracoes_select_all" ON configuracoes;
CREATE POLICY "configuracoes_select_all" ON configuracoes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "configuracoes_manage_admin" ON configuracoes;
CREATE POLICY "configuracoes_manage_admin" ON configuracoes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO permissoes (nome, descricao, nivel, permissoes) VALUES
  ('Administrador', 'Acesso total ao sistema', 100, '["all"]'::jsonb),
  ('RH', 'Gestão de funcionários, ocorrências e importações', 75, '["funcionarios","ocorrencias","importacoes","relatorios","dashboard"]'::jsonb),
  ('Gestor', 'Visualização do seu setor/equipe', 50, '["dashboard","funcionarios_read","ocorrencias_read","relatorios_read"]'::jsonb),
  ('Visualizador', 'Apenas visualização', 25, '["dashboard_read","relatorios_read"]'::jsonb)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO configuracoes (chave, valor, descricao, categoria) VALUES
  ('meta_absenteismo', '3.0'::jsonb, 'Meta mensal do índice de absenteísmo (%)', 'indicadores'),
  ('limite_horas_funcionario', '40'::jsonb, 'Limite de horas perdidas para alerta por funcionário', 'alertas'),
  ('limite_bradford', '100'::jsonb, 'Limite do Bradford Factor para alerta', 'alertas'),
  ('limite_aumento_percentual', '20'::jsonb, 'Limite de aumento percentual para alerta', 'alertas'),
  ('horas_previstas_mes', '220'::jsonb, 'Horas previstas por colaborador por mês', 'indicadores'),
  ('dias_uteis_mes', '22'::jsonb, 'Dias úteis por mês', 'indicadores')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO tipos_ocorrencias (codigo, nome, categoria, cor) VALUES
  ('001', 'Falta Injustificada', 'Falta', '#ef4444'),
  ('002', 'Falta Justificada', 'Falta', '#f97316'),
  ('003', 'Atestado Médico', 'Saúde', '#eab308'),
  ('004', 'Licença Médica', 'Saúde', '#84cc16'),
  ('005', 'Férias', 'Férias', '#22c55e'),
  ('006', 'Licença Maternidade', 'Licença', '#06b6d4'),
  ('007', 'Licença Paternidade', 'Licença', '#0ea5e9'),
  ('008', 'Atraso', 'Pontualidade', '#3b82f6'),
  ('009', 'Saída Antecipada', 'Pontualidade', '#6366f1'),
  ('010', 'Folga', 'Folga', '#a855f7'),
  ('011', 'Abono', 'Abono', '#ec4899'),
  ('012', 'Suspensão', 'Disciplinar', '#64748b')
ON CONFLICT (codigo) DO NOTHING;