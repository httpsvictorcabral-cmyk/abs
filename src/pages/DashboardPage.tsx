import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area,
  Treemap,
} from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { GlobalFilters } from '@/components/dashboard/GlobalFilters';
import { useFiltrosStore } from '@/lib/filtros';
import { supabase } from '@/lib/supabase';
import {
  aggregateByMonth, aggregateByField, aggregateByDayOfWeek,
  calculateBradford, calculateIndiceAbsenteismo,
} from '@/lib/indicators';
import type { Ocorrencia } from '@/types';
import {
  Users, UserCheck, Clock, Calendar, AlertTriangle,
  Activity, Award, Building2, UserCog, User as UserIcon,
  Target, Gauge, Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

export function DashboardPage() {
  const filtros = useFiltrosStore();

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ['dashboard-ocorrencias', filtros],
    queryFn: async () => {
      let q = supabase
        .from('ocorrencias')
        .select('*, funcionario:funcionarios(*, cargo:cargos(*), setor:setores(*), gestor:gestores(*), empresa:empresas(*)), tipo_ocorrencia:tipos_ocorrencias(*)');
      if (filtros.empresaId) q = q.eq('funcionarios.empresa_id', filtros.empresaId);
      if (filtros.dataInicio) q = q.gte('data_ocorrencia', filtros.dataInicio);
      if (filtros.dataFim) q = q.lte('data_ocorrencia', filtros.dataFim);
      if (filtros.tipoOcorrenciaId) q = q.eq('tipo_ocorrencia_id', filtros.tipoOcorrenciaId);
      const { data, error } = await q.order('data_ocorrencia', { ascending: false });
      if (error) throw error;
      return (data || []) as Ocorrencia[];
    },
  });

  const { data: totalFuncionarios = 0 } = useQuery({
    queryKey: ['total-funcionarios'],
    queryFn: async () => {
      const { count } = await supabase.from('funcionarios').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: metaAbsenteismo = 3.0 } = useQuery({
    queryKey: ['meta-absenteismo'],
    queryFn: async () => {
      const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'meta_absenteismo').maybeSingle();
      return data?.valor ?? 3.0;
    },
  });

  const { data: horasPrevistasMes = 220 } = useQuery({
    queryKey: ['horas-previstas-mes'],
    queryFn: async () => {
      const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'horas_previstas_mes').maybeSingle();
      return data?.valor ?? 220;
    },
  });

  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const horasPerdidas = ocorrencias.reduce((s, o) => s + Number(o.quantidade), 0);
    const horasPerdidasMes = ocorrencias
      .filter(o => o.mes === currentMonth && o.ano === currentYear)
      .reduce((s, o) => s + Number(o.quantidade), 0);
    const horasPerdidasAno = ocorrencias
      .filter(o => o.ano === currentYear)
      .reduce((s, o) => s + Number(o.quantidade), 0);

    const funcionariosComOcorrencia = new Set(ocorrencias.map(o => o.funcionario_id)).size;
    const bradford = calculateBradford(ocorrencias);
    const indiceAbsenteismo = calculateIndiceAbsenteismo(
      horasPerdidasMes,
      totalFuncionarios * horasPrevistasMes
    );
    const tempoMedioPerdido = totalFuncionarios > 0 ? Math.round((horasPerdidas / totalFuncionarios) * 100) / 100 : 0;

    const topSetores = aggregateByField(ocorrencias, 'setor');
    const topGestores = aggregateByField(ocorrencias, 'gestor');
    const topCargos = aggregateByField(ocorrencias, 'cargo');
    const topFuncionarios = aggregateByField(ocorrencias, 'funcionario');

    return {
      totalColaboradores: totalFuncionarios,
      funcionariosComOcorrencia,
      horasPerdidas: Math.round(horasPerdidas * 100) / 100,
      horasPerdidasMes: Math.round(horasPerdidasMes * 100) / 100,
      horasPerdidasAno: Math.round(horasPerdidasAno * 100) / 100,
      quantidadeOcorrencias: ocorrencias.length,
      indiceAbsenteismo,
      bradfordFactor: bradford.bradford,
      tempoMedioPerdido,
      topSetor: topSetores[0] || null,
      topGestor: topGestores[0] || null,
      topCargo: topCargos[0] || null,
      topFuncionario: topFuncionarios[0] || null,
    };
  }, [ocorrencias, totalFuncionarios, horasPrevistasMes]);

  const monthlyData = useMemo(() => aggregateByMonth(ocorrencias), [ocorrencias]);
  const byDayOfWeek = useMemo(() => aggregateByDayOfWeek(ocorrencias), [ocorrencias]);
  const byType = useMemo(() => aggregateByField(ocorrencias, 'tipo').slice(0, 8), [ocorrencias]);
  const topFuncionarios = useMemo(() => aggregateByField(ocorrencias, 'funcionario').slice(0, 10), [ocorrencias]);
  const topSetores = useMemo(() => aggregateByField(ocorrencias, 'setor').slice(0, 10), [ocorrencias]);
  const treemapData = useMemo(() => topSetores.map((s, i) => ({
    name: s.nome, size: s.valor, fill: CHART_COLORS[i % CHART_COLORS.length],
  })), [topSetores]);

  const metaProgress = metaAbsenteismo > 0 ? Math.min((kpis.indiceAbsenteismo / metaAbsenteismo) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos indicadores de absenteísmo</p>
      </div>

      <GlobalFilters />

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total de Colaboradores" value={kpis.totalColaboradores.toLocaleString('pt-BR')} icon={Users} color="primary" description="Cadastrados no sistema" />
        <KPICard title="Com Ocorrência" value={kpis.funcionariosComOcorrencia.toLocaleString('pt-BR')} icon={UserCheck} color="info" description={`${kpis.totalColaboradores > 0 ? Math.round((kpis.funcionariosComOcorrencia / kpis.totalColaboradores) * 100) : 0}% do total`} />
        <KPICard title="Horas Perdidas" value={kpis.horasPerdidas.toLocaleString('pt-BR')} icon={Clock} color="destructive" description="Total acumulado" />
        <KPICard title="Qtd. Ocorrências" value={kpis.quantidadeOcorrencias.toLocaleString('pt-BR')} icon={Activity} color="warning" description="Registros no período" />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Horas Perdidas (Mês)" value={kpis.horasPerdidasMes.toLocaleString('pt-BR')} icon={Calendar} color="destructive" description="Mês atual" />
        <KPICard title="Horas Perdidas (Ano)" value={kpis.horasPerdidasAno.toLocaleString('pt-BR')} icon={Calendar} color="destructive" description="Ano atual" />
        <KPICard title="Índice de Absenteísmo" value={`${kpis.indiceAbsenteismo}%`} icon={Gauge} color={kpis.indiceAbsenteismo > metaAbsenteismo ? 'destructive' : 'success'} description={`Meta: ${metaAbsenteismo}%`} />
        <KPICard title="Bradford Factor" value={kpis.bradfordFactor.toLocaleString('pt-BR')} icon={AlertTriangle} color={kpis.bradfordFactor > 100 ? 'destructive' : 'warning'} description="S² × D" />
      </div>

      {/* KPI Cards Row 3 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Tempo Médio Perdido" value={`${kpis.tempoMedioPerdido}h`} icon={Timer} color="info" description="Por colaborador" />
        <KPICard title="Top Setor" value={kpis.topSetor?.nome || '—'} icon={Building2} color="accent" description={kpis.topSetor ? `${kpis.topSetor.valor}h` : ''} />
        <KPICard title="Top Gestor" value={kpis.topGestor?.nome || '—'} icon={UserCog} color="accent" description={kpis.topGestor ? `${kpis.topGestor.valor}h` : ''} />
        <KPICard title="Top Funcionário" value={kpis.topFuncionario?.nome || '—'} icon={UserIcon} color="destructive" description={kpis.topFuncionario ? `${kpis.topFuncionario.valor}h` : ''} />
      </div>

      {/* Meta x Realizado */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Meta x Realizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Índice de Absenteísmo</span>
              <div className="flex items-center gap-2">
                <Badge variant={kpis.indiceAbsenteismo > metaAbsenteismo ? 'destructive' : 'success'}>
                  {kpis.indiceAbsenteismo}%
                </Badge>
                <span className="text-muted-foreground">/ Meta: {metaAbsenteismo}%</span>
              </div>
            </div>
            <Progress value={metaProgress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {kpis.indiceAbsenteismo > metaAbsenteismo
                ? `${(kpis.indiceAbsenteismo - metaAbsenteismo).toFixed(1)} pontos acima da meta`
                : `${(metaAbsenteismo - kpis.indiceAbsenteismo).toFixed(1)} pontos abaixo da meta`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Monthly Trend - Line Chart */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Comparativo Mensal (Horas Perdidas)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mesNome" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="horas" stroke="#3b82f6" fill="url(#colorHoras)" strokeWidth={2} name="Horas" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Type - Pie Chart */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Ocorrências por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byType}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  label={(e: any) => `${e.nome}: ${e.valor}h`}
                  labelLine={false}
                >
                  {byType.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Day of Week - Bar Chart */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Horas por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byDayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="horas" fill="#22c55e" radius={[4, 4, 0, 0]} name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Treemap - Setores */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Treemap - Horas por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="hsl(var(--background))"
                fill="#3b82f6"
                content={<TreemapContent />}
              />
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking - Top 10 Funcionários */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-primary" />
            Top 10 Absenteístas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topFuncionarios.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum dado disponível</p>
            ) : (
              topFuncionarios.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-500' :
                    i === 2 ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.nome}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(f.valor / topFuncionarios[0].valor) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-16 text-right">{f.valor}h</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TreemapContent(props: any) {
  const { x, y, width, height, name, fill } = props;
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="hsl(var(--background))" strokeWidth={2} rx={4} />
      {width > 60 && height > 30 && (
        <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>
          {name.length > 15 ? name.slice(0, 13) + '...' : name}
        </text>
      )}
    </g>
  );
}
