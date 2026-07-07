import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { funcionariosService, ocorrenciasService } from '@/lib/services';
import { calculateBradford, aggregateByMonth, aggregateByField } from '@/lib/indicators';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/dashboard/KPICard';
import {
  ArrowLeft, Clock, AlertTriangle, Activity, Award,
  TrendingUp, Calendar, User, Mail, Phone, Building2,
} from 'lucide-react';
import type { Ocorrencia } from '@/types';

export function FuncionarioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: funcionario, isLoading } = useQuery({
    queryKey: ['funcionario', id],
    queryFn: () => funcionariosService.getById(id!),
    enabled: !!id,
  });

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ['funcionario-ocorrencias', id],
    queryFn: () => ocorrenciasService.getByFuncionario(id!),
    enabled: !!id,
  });

  const { data: allOcorrencias = [] } = useQuery({
    queryKey: ['all-ocorrencias-for-comparison'],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase
        .from('ocorrencias')
        .select('*, funcionario:funcionarios(*), tipo_ocorrencia:tipos_ocorrencias(*)');
      return (data || []) as Ocorrencia[];
    },
  });

  const bradford = useMemo(() => calculateBradford(ocorrencias), [ocorrencias]);
  const monthlyData = useMemo(() => aggregateByMonth(ocorrencias), [ocorrencias]);
  const totalHoras = useMemo(() => ocorrencias.reduce((s, o) => s + Number(o.quantidade), 0), [ocorrencias]);

  const setorComparison = useMemo(() => {
    if (!funcionario?.setor_id) return null;
    const setorOcorrencias = allOcorrencias.filter(o => o.funcionario?.setor_id === funcionario.setor_id);
    const setorHoras = setorOcorrencias.reduce((s, o) => s + Number(o.quantidade), 0);
    const setorFuncionarios = new Set(setorOcorrencias.map(o => o.funcionario_id)).size;
    const mediaSetor = setorFuncionarios > 0 ? Math.round((setorHoras / setorFuncionarios) * 100) / 100 : 0;
    return { setorHoras, mediaSetor, setorFuncionarios };
  }, [allOcorrencias, funcionario]);

  const empresaComparison = useMemo(() => {
    if (!funcionario?.empresa_id) return null;
    const empresaOcorrencias = allOcorrencias.filter(o => o.funcionario?.empresa_id === funcionario.empresa_id);
    const empresaHoras = empresaOcorrencias.reduce((s, o) => s + Number(o.quantidade), 0);
    const empresaFuncionarios = new Set(empresaOcorrencias.map(o => o.funcionario_id)).size;
    const mediaEmpresa = empresaFuncionarios > 0 ? Math.round((empresaHoras / empresaFuncionarios) * 100) / 100 : 0;
    return { empresaHoras, mediaEmpresa, empresaFuncionarios };
  }, [allOcorrencias, funcionario]);

  const byType = useMemo(() => aggregateByField(ocorrencias, 'tipo'), [ocorrencias]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!funcionario) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Funcionário não encontrado</p>
        <Button onClick={() => navigate('/funcionarios')}>Voltar</Button>
      </div>
    );
  }

  const initials = funcionario.nome?.[0]?.toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/funcionarios')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{funcionario.nome}</h1>
          <p className="text-sm text-muted-foreground">Matrícula: {funcionario.matricula}</p>
        </div>
        <Badge variant={funcionario.status === 'Ativo' ? 'success' : 'secondary'}>{funcionario.status}</Badge>
      </div>

      {/* Profile Card */}
      <Card className="animate-slide-up">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold">
              {initials}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
              <InfoItem icon={Building2} label="Empresa" value={funcionario.empresa?.nome || '—'} />
              <InfoItem icon={Building2} label="Setor" value={funcionario.setor?.nome || '—'} />
              <InfoItem icon={Award} label="Cargo" value={funcionario.cargo?.nome || '—'} />
              <InfoItem icon={User} label="Gestor" value={funcionario.gestor?.nome || '—'} />
              <InfoItem icon={Calendar} label="Admissão" value={funcionario.data_admissao ? new Date(funcionario.data_admissao).toLocaleDateString('pt-BR') : '—'} />
              <InfoItem icon={Clock} label="Escala" value={funcionario.escala || '—'} />
              <InfoItem icon={Phone} label="Telefone" value={funcionario.telefone || '—'} />
              <InfoItem icon={Mail} label="E-mail" value={funcionario.email || '—'} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total de Horas Perdidas" value={totalHoras.toLocaleString('pt-BR')} icon={Clock} color="destructive" />
        <KPICard title="Total de Ocorrências" value={ocorrencias.length} icon={Activity} color="warning" />
        <KPICard title="Bradford Factor" value={bradford.bradford.toLocaleString('pt-BR')} icon={AlertTriangle} color={bradford.bradford > 100 ? 'destructive' : 'warning'} description={`S²×D (${bradford.instancias}²×${bradford.diasPerdidos})`} />
        <KPICard title="Tempo Médio/Ocorrência" value={`${ocorrencias.length > 0 ? Math.round((totalHoras / ocorrencias.length) * 100) / 100 : 0}h`} icon={TrendingUp} color="info" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Evolução Mensal de Horas Perdidas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mesNome" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="horas" stroke="#3b82f6" strokeWidth={2} name="Horas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Ocorrências por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={120} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {byType.map((_, i) => <Cell key={i} fill={['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7'][i % 5]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Comparisons */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {setorComparison && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="text-base">Comparação com o Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ComparisonBar label="Este funcionário" value={totalHoras} max={Math.max(totalHoras, setorComparison.mediaSetor * 2)} color="bg-primary" />
                <ComparisonBar label="Média do setor" value={setorComparison.mediaSetor} max={Math.max(totalHoras, setorComparison.mediaSetor * 2)} color="bg-green-500" />
                <p className="text-xs text-muted-foreground">
                  {totalHoras > setorComparison.mediaSetor
                    ? `${Math.round((totalHoras / setorComparison.mediaSetor - 1) * 100)}% acima da média do setor`
                    : `${Math.round((1 - totalHoras / Math.max(setorComparison.mediaSetor, 1)) * 100)}% abaixo da média do setor`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {empresaComparison && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="text-base">Comparação com a Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ComparisonBar label="Este funcionário" value={totalHoras} max={Math.max(totalHoras, empresaComparison.mediaEmpresa * 2)} color="bg-primary" />
                <ComparisonBar label="Média da empresa" value={empresaComparison.mediaEmpresa} max={Math.max(totalHoras, empresaComparison.mediaEmpresa * 2)} color="bg-blue-500" />
                <p className="text-xs text-muted-foreground">
                  {totalHoras > empresaComparison.mediaEmpresa
                    ? `${Math.round((totalHoras / empresaComparison.mediaEmpresa - 1) * 100)}% acima da média da empresa`
                    : `${Math.round((1 - totalHoras / Math.max(empresaComparison.mediaEmpresa, 1)) * 100)}% abaixo da média da empresa`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Timeline */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base">Linha do Tempo de Ocorrências</CardTitle>
        </CardHeader>
        <CardContent>
          {ocorrencias.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma ocorrência registrada</p>
          ) : (
            <div className="space-y-3">
              {ocorrencias.slice(0, 20).map((o) => (
                <div key={o.id} className="flex items-start gap-3 border-l-2 border-primary/30 pl-4 pb-3 relative">
                  <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{o.nome_ocorrencia || o.tipo_ocorrencia?.nome || 'Ocorrência'}</span>
                      <Badge variant="outline">{o.quantidade}h</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(o.data_ocorrencia).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    {o.observacoes && <p className="text-xs text-muted-foreground mt-1 italic">{o.observacoes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function ComparisonBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}h</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
