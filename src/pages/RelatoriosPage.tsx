import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, FileSpreadsheet, FileDown, BarChart3, Users,
  Building2, UserCog, Activity, Award, TrendingUp, Gauge,
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/export-utils';
import { supabase } from '@/lib/supabase';
import { aggregateByField, aggregateByMonth, calculateBradford } from '@/lib/indicators';
import type { Ocorrencia } from '@/types';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

type ReportType = 'executivo' | 'analitico' | 'funcionarios' | 'setores' | 'gestores' | 'ocorrencias' | 'bradford' | 'indicadores' | 'comparativos';

const reportConfig: Record<ReportType, { label: string; icon: any; description: string }> = {
  executivo: { label: 'Executivo', icon: BarChart3, description: 'Resumo geral com KPIs e indicadores principais' },
  analitico: { label: 'Analítico', icon: FileText, description: 'Relatório detalhado de todas as ocorrências' },
  funcionarios: { label: 'Funcionários', icon: Users, description: 'Horas perdidas por colaborador' },
  setores: { label: 'Setores', icon: Building2, description: 'Absenteísmo agrupado por setor' },
  gestores: { label: 'Gestores', icon: UserCog, description: 'Horas perdidas por gestor' },
  ocorrencias: { label: 'Ocorrências', icon: Activity, description: 'Distribuição por tipo de ocorrência' },
  bradford: { label: 'Bradford', icon: Award, description: 'Ranking Bradford Factor por colaborador' },
  indicadores: { label: 'Indicadores', icon: Gauge, description: 'Índices e métricas de absenteísmo' },
  comparativos: { label: 'Comparativos', icon: TrendingUp, description: 'Comparativo mensal e anual' },
};

export function RelatoriosPage() {
  const [selected, setSelected] = useState<ReportType | null>(null);

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ['relatorios-ocorrencias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ocorrencias')
        .select('*, funcionario:funcionarios(*, cargo:cargos(*), setor:setores(*), gestor:gestores(*), empresa:empresas(*)), tipo_ocorrencia:tipos_ocorrencias(*)');
      return (data || []) as Ocorrencia[];
    },
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['relatorios-funcionarios'],
    queryFn: async () => {
      const { data } = await supabase.from('funcionarios').select('*, cargo:cargos(*), setor:setores(*), empresa:empresas(*), gestor:gestores(*)');
      return data || [];
    },
  });

  const generateReport = (type: ReportType, format: 'excel' | 'pdf' | 'csv') => {
    let data: any[] = [];
    let title = '';
    let columns: { header: string; dataKey: string }[] = [];

    switch (type) {
      case 'executivo': {
        const totalHoras = ocorrencias.reduce((s, o) => s + Number(o.quantidade), 0);
        const funcComOcorrencia = new Set(ocorrencias.map(o => o.funcionario_id)).size;
        const bradford = calculateBradford(ocorrencias);
        data = [{
          'Total Colaboradores': funcionarios.length,
          'Com Ocorrência': funcComOcorrencia,
          'Total Horas Perdidas': totalHoras,
          'Total Ocorrências': ocorrencias.length,
          'Bradford Factor': bradford.bradford,
          'Tempo Médio Perdido': funcionarios.length > 0 ? Math.round((totalHoras / funcionarios.length) * 100) / 100 : 0,
        }];
        title = 'Relatório Executivo';
        break;
      }
      case 'analitico': {
        data = ocorrencias.map(o => ({
          'Matrícula': o.funcionario?.matricula || '',
          'Funcionário': o.funcionario?.nome || '',
          'Setor': o.funcionario?.setor?.nome || '',
          'Ocorrência': o.nome_ocorrencia || o.tipo_ocorrencia?.nome || '',
          'Código': o.codigo_ocorrencia || '',
          'Horas': o.quantidade,
          'Data': new Date(o.data_ocorrencia).toLocaleDateString('pt-BR'),
        }));
        title = 'Relatório Analítico de Ocorrências';
        break;
      }
      case 'funcionarios': {
        data = aggregateByField(ocorrencias, 'funcionario').map(f => ({
          'Funcionário': f.nome, 'Horas Perdidas': f.valor,
        }));
        title = 'Relatório por Funcionários';
        break;
      }
      case 'setores': {
        data = aggregateByField(ocorrencias, 'setor').map(s => ({
          'Setor': s.nome, 'Horas Perdidas': s.valor,
        }));
        title = 'Relatório por Setores';
        break;
      }
      case 'gestores': {
        data = aggregateByField(ocorrencias, 'gestor').map(g => ({
          'Gestor': g.nome, 'Horas Perdidas': g.valor,
        }));
        title = 'Relatório por Gestores';
        break;
      }
      case 'ocorrencias': {
        data = aggregateByField(ocorrencias, 'tipo').map(t => ({
          'Ocorrência': t.nome, 'Horas Perdidas': t.valor,
        }));
        title = 'Relatório por Tipo de Ocorrência';
        break;
      }
      case 'bradford': {
        const byFunc = new Map<string, Ocorrencia[]>();
        for (const o of ocorrencias) {
          if (!o.funcionario) continue;
          if (!byFunc.has(o.funcionario_id)) byFunc.set(o.funcionario_id, []);
          byFunc.get(o.funcionario_id)!.push(o);
        }
        data = Array.from(byFunc.entries()).map(([_, ocs]) => {
          const b = calculateBradford(ocs);
          return {
            'Funcionário': ocs[0].funcionario?.nome || '',
            'Instâncias': b.instancias,
            'Dias Perdidos': b.diasPerdidos,
            'Bradford Factor': b.bradford,
          };
        }).sort((a, b) => b['Bradford Factor'] - a['Bradford Factor']);
        title = 'Relatório Bradford Factor';
        break;
      }
      case 'indicadores': {
        const totalHoras = ocorrencias.reduce((s, o) => s + Number(o.quantidade), 0);
        const bradford = calculateBradford(ocorrencias);
        const indice = funcionarios.length > 0 ? Math.round((totalHoras / (funcionarios.length * 220)) * 100 * 100) / 100 : 0;
        data = [{
          'Índice de Absenteísmo (%)': indice,
          'Bradford Factor': bradford.bradford,
          'Tempo Médio Perdido (h)': funcionarios.length > 0 ? Math.round((totalHoras / funcionarios.length) * 100) / 100 : 0,
          'Total Horas Perdidas': totalHoras,
          'Total Ocorrências': ocorrencias.length,
          'Total Colaboradores': funcionarios.length,
        }];
        title = 'Relatório de Indicadores';
        break;
      }
      case 'comparativos': {
        data = aggregateByMonth(ocorrencias).map(m => ({
          'Mês': `${m.mesNome}/${m.ano}`,
          'Horas Perdidas': m.horas,
          'Ocorrências': m.ocorrencias,
        }));
        title = 'Relatório Comparativo Mensal';
        break;
      }
    }

    const filename = `abs_rh_${type}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'excel') {
      exportToExcel(data, filename, type);
    } else if (format === 'csv') {
      exportToCSV(data, filename);
    } else {
      exportToPDF(title, data, filename, columns);
    }
    toast.success(`Relatório ${type} exportado em ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Gere e exporte relatórios em Excel, PDF e CSV</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(reportConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isSelected = selected === key;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 animate-slide-up ${
                isSelected ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => setSelected(key as ReportType)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cfg.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selected && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              Exportar: {reportConfig[selected].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => generateReport(selected, 'excel')} className="bg-green-600 hover:bg-green-700">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
              </Button>
              <Button onClick={() => generateReport(selected, 'pdf')} className="bg-red-600 hover:bg-red-700">
                <FileDown className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button onClick={() => generateReport(selected, 'csv')} variant="outline">
                <FileText className="mr-2 h-4 w-4" /> CSV
              </Button>
            </div>
            {ocorrencias.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Não há dados de ocorrências para gerar relatórios. Importe ocorrências primeiro.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
