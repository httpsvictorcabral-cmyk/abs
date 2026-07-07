import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ocorrenciasService, tiposOcorrenciaService } from '@/lib/services';
import { useAuthStore } from '@/lib/auth';
import { useFiltrosStore } from '@/lib/filtros';
import type { Ocorrencia } from '@/types';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

export function OcorrenciasPage() {
  const queryClient = useQueryClient();
  const { canEdit } = useAuthStore();
  const filtros = useFiltrosStore();
  const [page] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Ocorrencia | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Partial<Ocorrencia>>();

  const { data: result, isLoading } = useQuery({
    queryKey: ['ocorrencias', page, filtros],
    queryFn: () => ocorrenciasService.list(page, 20, filtros),
    placeholderData: keepPreviousData,
  });
  const ocorrencias = result?.data || [];

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-all'],
    queryFn: async () => {
      const { data } = await (await import('@/lib/supabase')).supabase.from('funcionarios').select('id, nome, matricula').order('nome').limit(500);
      return data || [];
    },
  });
  const { data: tiposOcorrencia = [] } = useQuery({ queryKey: ['tipos_ocorrencias'], queryFn: tiposOcorrenciaService.list });

  const createMutation = useMutation({
    mutationFn: ocorrenciasService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ocorrencias'] }); setShowForm(false); reset(); toast.success('Ocorrência registrada!'); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Ocorrencia> }) => ocorrenciasService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ocorrencias'] }); setShowForm(false); setEditTarget(null); reset(); toast.success('Ocorrência atualizada!'); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: ocorrenciasService.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ocorrencias'] }); toast.success('Ocorrência removida!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const onSubmit = (data: Partial<Ocorrencia>) => {
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]));
    if (clean.data_ocorrencia) {
      const d = new Date(clean.data_ocorrencia as string);
      (clean as any).mes = d.getMonth() + 1;
      (clean as any).ano = d.getFullYear();
    }
    if (editTarget) updateMutation.mutate({ id: editTarget.id, data: clean });
    else createMutation.mutate(clean);
  };

  const openEdit = (o: Ocorrencia) => {
    setEditTarget(o);
    reset({
      funcionario_id: o.funcionario_id, tipo_ocorrencia_id: o.tipo_ocorrencia_id || '',
      codigo_ocorrencia: o.codigo_ocorrencia || '', nome_ocorrencia: o.nome_ocorrencia || '',
      quantidade: o.quantidade, data_ocorrencia: o.data_ocorrencia, observacoes: o.observacoes || '',
    });
    setShowForm(true);
  };

  const columns: Column<Ocorrencia>[] = [
    { key: 'funcionario', header: 'Funcionário', sortable: true,
      render: (o) => o.funcionario?.nome || '—' },
    { key: 'nome_ocorrencia', header: 'Ocorrência', render: (o) => o.nome_ocorrencia || o.tipo_ocorrencia?.nome || '—' },
    { key: 'codigo_ocorrencia', header: 'Cód.', width: '80px', render: (o) => o.codigo_ocorrencia || '—' },
    { key: 'quantidade', header: 'Horas', align: 'right', sortable: true, width: '80px',
      render: (o) => <span className="font-semibold">{o.quantidade}h</span> },
    { key: 'data_ocorrencia', header: 'Data', sortable: true, width: '120px',
      render: (o) => new Date(o.data_ocorrencia as string).toLocaleDateString('pt-BR') },
    { key: 'actions', header: '', align: 'right', width: '80px',
      render: (o) => canEdit() ? (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(o)}><Edit2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(o.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ocorrências</h1>
          <p className="text-sm text-muted-foreground">{result?.total.toLocaleString('pt-BR') || 0} registros</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { reset(); setEditTarget(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nova Ocorrência
          </Button>
        )}
      </div>

      <DataTable data={ocorrencias} columns={columns} loading={isLoading} emptyMessage="Nenhuma ocorrência registrada" />

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditTarget(null); reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTarget ? 'Editar Ocorrência' : 'Nova Ocorrência'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Funcionário *</Label>
              <Select onValueChange={(v) => setValue('funcionario_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.matricula} - {f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.funcionario_id && <p className="text-xs text-destructive">Campo obrigatório</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Ocorrência</Label>
                <Select onValueChange={(v) => setValue('tipo_ocorrencia_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tiposOcorrencia.map(t => <SelectItem key={t.id} value={t.id}>{t.codigo} - {t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Quantidade (horas) *</Label>
                <Input type="number" step="0.01" {...register('quantidade', { required: true, valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Data da Ocorrência *</Label>
                <Input type="date" {...register('data_ocorrencia', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Código</Label>
                <Input {...register('codigo_ocorrencia')} placeholder="Ex: 001" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input {...register('observacoes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editTarget ? 'Salvar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
