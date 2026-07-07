import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Gauge, AlertTriangle } from 'lucide-react';
import { configuracoesService } from '@/lib/services';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

export function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, any>>({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: configuracoesService.list,
  });

  // Initialize values when data loads
  if (configs.length > 0 && Object.keys(values).length === 0) {
    const initial: Record<string, any> = {};
    configs.forEach(c => initial[c.chave] = c.valor);
    setValues(initial);
  }

  const updateMutation = useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: any }) => {
      await configuracoesService.update(chave, valor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = () => {
    Object.entries(values).forEach(([chave, valor]) => {
      updateMutation.mutate({ chave, valor });
    });
  };

  const indicadores = configs.filter(c => c.categoria === 'indicadores');
  const alertas = configs.filter(c => c.categoria === 'alertas');

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Parâmetros do sistema de absenteísmo</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Configurações
        </Button>
      </div>

      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-primary" /> Indicadores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {indicadores.map(c => (
            <div key={c.id} className="grid grid-cols-3 items-center gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium">{c.descricao}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Chave: {c.chave}</p>
              </div>
              <Input
                type="number"
                step="0.01"
                value={values[c.chave] ?? ''}
                onChange={(e) => setValues({ ...values, [c.chave]: parseFloat(e.target.value) })}
                className="text-right"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-yellow-500" /> Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {alertas.map(c => (
            <div key={c.id} className="grid grid-cols-3 items-center gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium">{c.descricao}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Chave: {c.chave}</p>
              </div>
              <Input
                type="number"
                step="0.01"
                value={values[c.chave] ?? ''}
                onChange={(e) => setValues({ ...values, [c.chave]: parseFloat(e.target.value) })}
                className="text-right"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
