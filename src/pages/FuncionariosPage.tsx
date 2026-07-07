import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Plus, Edit2, Trash2, Eye, Users, UserCheck, UserX, Loader2,
} from 'lucide-react';
import { keepPreviousData } from '@tanstack/react-query';
import { DataTable, Column } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { KPICard } from '@/components/dashboard/KPICard';
import { funcionariosService, cargosService, departamentosService, setoresService, empresasService, unidadesService, gestoresService, centroCustosService } from '@/lib/services';
import { useAuthStore } from '@/lib/auth';
import type { Funcionario } from '@/types';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

export function FuncionariosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canEdit } = useAuthStore();
  const [page] = useState(1);
  const [search] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Funcionario | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Funcionario | null>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ['funcionarios', page, search],
    queryFn: () => funcionariosService.list(page, 20, search),
    placeholderData: keepPreviousData,
  });
  const funcionarios = result?.data || [];
  const total = result?.total || 0;

  const { data: cargos = [] } = useQuery({ queryKey: ['cargos'], queryFn: cargosService.list });
  const { data: departamentos = [] } = useQuery({ queryKey: ['departamentos'], queryFn: departamentosService.list });
  const { data: setores = [] } = useQuery({ queryKey: ['setores'], queryFn: setoresService.list });
  const { data: empresas = [] } = useQuery({ queryKey: ['empresas'], queryFn: empresasService.list });
  const { data: unidades = [] } = useQuery({ queryKey: ['unidades'], queryFn: unidadesService.list });
  const { data: gestores = [] } = useQuery({ queryKey: ['gestores'], queryFn: gestoresService.list });
  const { data: centroCustos = [] } = useQuery({ queryKey: ['centro_custos'], queryFn: centroCustosService.list });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Partial<Funcionario>>();

  const createMutation = useMutation({
    mutationFn: funcionariosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      setShowForm(false);
      reset();
      toast.success('Funcionário cadastrado com sucesso!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Funcionario> }) =>
      funcionariosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      setShowForm(false);
      setEditTarget(null);
      reset();
      toast.success('Funcionário atualizado com sucesso!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: funcionariosService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      setDeleteTarget(null);
      toast.success('Funcionário removido com sucesso!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (f: Funcionario) => {
    setEditTarget(f);
    reset({
      matricula: f.matricula, nome: f.nome, cpf: f.cpf || '',
      cargo_id: f.cargo_id || '', departamento_id: f.departamento_id || '',
      setor_id: f.setor_id || '', empresa_id: f.empresa_id || '',
      unidade_id: f.unidade_id || '', gestor_id: f.gestor_id || '',
      centro_custo_id: f.centro_custo_id || '', escala: f.escala || '',
      data_admissao: f.data_admissao || '', status: f.status || 'Ativo',
      telefone: f.telefone || '', email: f.email || '', observacoes: f.observacoes || '',
    });
    setShowForm(true);
  };

  const onSubmit = (data: Partial<Funcionario>) => {
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]));
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: clean });
    } else {
      createMutation.mutate(clean);
    }
  };

  const ativos = funcionarios.filter((f: Funcionario) => f.status === 'Ativo').length;
  const inativos = funcionarios.filter((f: Funcionario) => f.status !== 'Ativo').length;

  const columns: Column<Funcionario>[] = [
    { key: 'matricula', header: 'Matrícula', sortable: true, width: '100px' },
    { key: 'nome', header: 'Nome', sortable: true,
      render: (f) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {f.nome?.[0]?.toUpperCase()}
          </div>
          <span className="font-medium">{f.nome}</span>
        </div>
      )
    },
    { key: 'cargo', header: 'Cargo', render: (f) => f.cargo?.nome || '—' },
    { key: 'setor', header: 'Setor', render: (f) => f.setor?.nome || '—' },
    { key: 'empresa', header: 'Empresa', render: (f) => f.empresa?.nome || '—' },
    { key: 'status', header: 'Status', align: 'center', width: '100px',
      render: (f) => (
        <Badge variant={f.status === 'Ativo' ? 'success' : 'secondary'}>
          {f.status}
        </Badge>
      )
    },
    { key: 'actions', header: '', align: 'right', width: '100px',
      render: (f) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${f.id}`); }}>
            <Eye className="h-4 w-4" />
          </Button>
          {canEdit() && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(f); }}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(f); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString('pt-BR')} colaboradores cadastrados</p>
        </div>
        {canEdit() && (
          <Button onClick={() => { reset(); setEditTarget(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Funcionário
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Total Cadastrados" value={total.toLocaleString('pt-BR')} icon={Users} color="primary" />
        <KPICard title="Ativos" value={ativos.toLocaleString('pt-BR')} icon={UserCheck} color="success" />
        <KPICard title="Inativos" value={inativos.toLocaleString('pt-BR')} icon={UserX} color="warning" />
      </div>

      <DataTable
        data={funcionarios}
        columns={columns}
        loading={isLoading}
        onRowClick={(f) => navigate(`/funcionarios/${f.id}`)}
        emptyMessage="Nenhum funcionário cadastrado"
      />

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditTarget(null); reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Matrícula *</Label>
                <Input {...register('matricula', { required: true })} placeholder="001234" />
                {errors.matricula && <p className="text-xs text-destructive">Campo obrigatório</p>}
              </div>
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input {...register('nome', { required: true })} placeholder="Nome completo" />
                {errors.nome && <p className="text-xs text-destructive">Campo obrigatório</p>}
              </div>
              <div className="space-y-1">
                <Label>CPF</Label>
                <Input {...register('cpf')} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select defaultValue="Ativo" onValueChange={(v) => setValue('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Afastado">Afastado</SelectItem>
                    <SelectItem value="Férias">Férias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Empresa</Label>
                <Select onValueChange={(v) => setValue('empresa_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Select onValueChange={(v) => setValue('unidade_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Departamento</Label>
                <Select onValueChange={(v) => setValue('departamento_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {departamentos.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Setor</Label>
                <Select onValueChange={(v) => setValue('setor_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {setores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cargo</Label>
                <Select onValueChange={(v) => setValue('cargo_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {cargos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Gestor</Label>
                <Select onValueChange={(v) => setValue('gestor_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {gestores.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Centro de Custo</Label>
                <Select onValueChange={(v) => setValue('centro_custo_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {centroCustos.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Escala</Label>
                <Input {...register('escala')} placeholder="Ex: 5x2, 6x1" />
              </div>
              <div className="space-y-1">
                <Label>Data de Admissão</Label>
                <Input {...register('data_admissao')} type="date" />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input {...register('telefone')} placeholder="(11) 99999-9999" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>E-mail</Label>
                <Input {...register('email')} type="email" placeholder="email@empresa.com" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Observações</Label>
                <Textarea {...register('observacoes')} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editTarget ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o funcionário <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita e todos os registros de ocorrência serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
