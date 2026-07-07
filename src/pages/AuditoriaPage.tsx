import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { auditoriaService } from '@/lib/services';
import { DataTable, Column } from '@/components/DataTable';
import { History, FileEdit, Trash, Upload, Plus } from 'lucide-react';
import type { Auditoria } from '@/types';

const operacaoConfig: Record<string, { icon: any; color: string; label: string }> = {
  INSERT: { icon: Plus, color: 'bg-green-500/10 text-green-600 dark:text-green-400', label: 'Criação' },
  UPDATE: { icon: FileEdit, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Alteração' },
  DELETE: { icon: Trash, color: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'Exclusão' },
  IMPORT: { icon: Upload, color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', label: 'Importação' },
};

export function AuditoriaPage() {
  const [page] = useState(1);

  const { data: result, isLoading } = useQuery({
    queryKey: ['auditoria', page],
    queryFn: () => auditoriaService.list(page, 20),
    placeholderData: (prev) => prev,
  });
  const auditorias = result?.data || [];

  const columns: Column<Auditoria>[] = [
    { key: 'created_at', header: 'Data/Hora', sortable: true, width: '160px',
      render: (a) => new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    },
    { key: 'operacao', header: 'Operação', width: '120px',
      render: (a) => {
        const cfg = operacaoConfig[a.operacao] || { icon: History, color: 'bg-muted text-muted-foreground', label: a.operacao };
        const Icon = cfg.icon;
        return (
          <Badge variant="outline" className={cfg.color}>
            <Icon className="mr-1 h-3 w-3" /> {cfg.label}
          </Badge>
        );
      },
    },
    { key: 'tabela', header: 'Tabela', width: '140px',
      render: (a) => <span className="font-mono text-xs">{a.tabela}</span>,
    },
    { key: 'usuario_nome', header: 'Usuário',
      render: (a) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {a.usuario_nome?.[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <p className="text-sm font-medium">{a.usuario_nome || 'Sistema'}</p>
            <p className="text-xs text-muted-foreground">{a.usuario_email || ''}</p>
          </div>
        </div>
      ),
    },
    { key: 'detalhes', header: 'Detalhes',
      render: (a) => (
        <div className="space-y-1">
          {a.dados_anteriores && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Antes:</span> {JSON.stringify(a.dados_anteriores).slice(0, 80)}...
            </p>
          )}
          {a.dados_posteriores && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Depois:</span> {JSON.stringify(a.dados_posteriores).slice(0, 80)}...
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
        <p className="text-sm text-muted-foreground">Registro de todas as operações do sistema</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(operacaoConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = auditorias.filter((a: Auditoria) => a.operacao === key).length;
          return (
            <Card key={key}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DataTable data={auditorias} columns={columns} loading={isLoading} emptyMessage="Nenhum registro de auditoria" />
    </div>
  );
}
