import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateBradford, aggregateByField, getReincidentes } from '@/lib/indicators';
import type { Alerta, Ocorrencia } from '@/types';

export function AlertasPage() {
  const { data: ocorrencias = [] } = useQuery({
    queryKey: ['alertas-ocorrencias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ocorrencias')
        .select('*, funcionario:funcionarios(*, cargo:cargos(*), setor:setores(*), gestor:gestores(*)), tipo_ocorrencia:tipos_ocorrencias(*)');
      return (data || []) as Ocorrencia[];
    },
  });

  const { data: config = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const { data } = await supabase.from('configuracoes').select('*');
      return data || [];
    },
  });

  const configMap = useMemo(() => {
    const m: Record<string, any> = {};
    config.forEach(c => m[c.chave] = c.valor);
    return m;
  }, [config]);

  const alertas = useMemo<Alerta[]>(() => {
    const alerts: Alerta[] = [];
    const limiteHoras = configMap.limite_horas_funcionario || 40;
    const limiteBradford = configMap.limite_bradford || 100;

    // Group by funcionario
    const byFunc = new Map<string, Ocorrencia[]>();
    for (const o of ocorrencias) {
      if (!o.funcionario) continue;
      if (!byFunc.has(o.funcionario_id)) byFunc.set(o.funcionario_id, []);
      byFunc.get(o.funcionario_id)!.push(o);
    }

    for (const [funcId, funcOcorrencias] of byFunc) {
      const func = funcOcorrencias[0].funcionario!;
      const totalHoras = funcOcorrencias.reduce((s, o) => s + Number(o.quantidade), 0);
      const bradford = calculateBradford(funcOcorrencias);

      // Alert: Funcionário acima de X horas
      if (totalHoras > limiteHoras) {
        alerts.push({
          id: `horas-${funcId}`,
          tipo: 'horas_excedidas',
          severidade: totalHoras > limiteHoras * 2 ? 'alta' : 'media',
          titulo: 'Funcionário acima do limite de horas',
          descricao: `${func.nome} ultrapassou o limite de ${limiteHoras}h com ${totalHoras}h perdidas`,
          funcionario_id: funcId,
          funcionario_nome: func.nome,
          valor: totalHoras,
          limite: limiteHoras,
          created_at: new Date().toISOString(),
        });
      }

      // Alert: Bradford alto
      if (bradford.bradford > limiteBradford) {
        alerts.push({
          id: `bradford-${funcId}`,
          tipo: 'bradford_alto',
          severidade: bradford.bradford > limiteBradford * 3 ? 'alta' : 'media',
          titulo: 'Bradford Factor elevado',
          descricao: `${func.nome} possui Bradford Factor de ${bradford.bradford} (limite: ${limiteBradford})`,
          funcionario_id: funcId,
          funcionario_nome: func.nome,
          valor: bradford.bradford,
          limite: limiteBradford,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Alert: Reincidentes (3+ ocorrências)
    const reincidentes = getReincidentes(ocorrencias, 3);
    for (const r of reincidentes) {
      alerts.push({
        id: `reincidente-${r.nome}`,
        tipo: 'reincidente',
        severidade: r.valor >= 5 ? 'alta' : 'media',
        titulo: 'Colaborador reincidente',
        descricao: `${r.nome} possui ${r.valor} ocorrências registradas`,
        funcionario_nome: r.nome,
        valor: r.valor,
        limite: 3,
        created_at: new Date().toISOString(),
      });
    }

    // Alert: Setor acima da meta
    const bySetor = aggregateByField(ocorrencias, 'setor');
    for (const s of bySetor.slice(0, 5)) {
      if (s.valor > 100) {
        alerts.push({
          id: `setor-${s.nome}`,
          tipo: 'setor_acima_meta',
          severidade: 'media',
          titulo: 'Setor com alto absenteísmo',
          descricao: `Setor "${s.nome}" acumula ${s.valor}h de absenteísmo`,
          valor: s.valor,
          limite: 100,
          created_at: new Date().toISOString(),
        });
      }
    }

    return alerts.sort((a, b) => {
      const sevOrder = { alta: 0, media: 1, baixa: 2 };
      return sevOrder[a.severidade] - sevOrder[b.severidade];
    });
  }, [ocorrencias, configMap]);

  const altaCount = alertas.filter(a => a.severidade === 'alta').length;
  const mediaCount = alertas.filter(a => a.severidade === 'media').length;
  const baixaCount = alertas.filter(a => a.severidade === 'baixa').length;

  const sevConfig = {
    alta: { color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: AlertCircle, label: 'Alta' },
    media: { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', icon: AlertTriangle, label: 'Média' },
    baixa: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: TrendingUp, label: 'Baixa' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
        <p className="text-sm text-muted-foreground">Notificações automáticas de absenteísmo</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{altaCount}</p>
                <p className="text-xs text-muted-foreground">Severidade Alta</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mediaCount}</p>
                <p className="text-xs text-muted-foreground">Severidade Média</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{baixaCount}</p>
                <p className="text-xs text-muted-foreground">Severidade Baixa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {alertas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="mx-auto h-12 w-12 text-green-500 mb-3" />
              <p className="text-lg font-semibold">Nenhum alerta ativo</p>
              <p className="text-sm text-muted-foreground">Todos os indicadores estão dentro dos limites</p>
            </CardContent>
          </Card>
        ) : (
          alertas.map((alert) => {
            const cfg = sevConfig[alert.severidade];
            const Icon = cfg.icon;
            return (
              <Card key={alert.id} className={`border ${cfg.color} animate-slide-up`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{alert.titulo}</p>
                        <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.descricao}</p>
                      {alert.funcionario_nome && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Colaborador: {alert.funcionario_nome} • Valor: {alert.valor} • Limite: {alert.limite}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
