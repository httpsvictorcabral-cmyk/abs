import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usuariosService } from '@/lib/services';
import { useAuthStore } from '@/lib/auth';
import type { Usuario } from '@/types';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const roleConfig: Record<string, { color: string }> = {
  Administrador: { color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  RH: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  Gestor: { color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  Visualizador: { color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
};

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosService.list,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usuariosService.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Permissão atualizada!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => usuariosService.toggleAtivo(id, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Status atualizado!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns: Column<Usuario>[] = [
    { key: 'nome', header: 'Nome', sortable: true,
      render: (u) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {u.nome?.[0]?.toUpperCase()}
          </div>
          <span className="font-medium">{u.nome}</span>
          {u.id === currentUser?.id && <Badge variant="secondary" className="text-xs">Você</Badge>}
        </div>
      ),
    },
    { key: 'email', header: 'E-mail', render: (u) => <span className="text-sm text-muted-foreground">{u.email}</span> },
    { key: 'role', header: 'Nível de Acesso', width: '180px',
      render: (u) => (
        <Select
          value={u.role}
          onValueChange={(v) => updateRoleMutation.mutate({ id: u.id, role: v })}
          disabled={u.id === currentUser?.id}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Administrador">Administrador</SelectItem>
            <SelectItem value="RH">RH</SelectItem>
            <SelectItem value="Gestor">Gestor</SelectItem>
            <SelectItem value="Visualizador">Visualizador</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    { key: 'ativo', header: 'Status', align: 'center', width: '100px',
      render: (u) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={u.id === currentUser?.id}
          onClick={() => toggleAtivoMutation.mutate({ id: u.id, ativo: !u.ativo })}
        >
          <Badge variant={u.ativo ? 'success' : 'secondary'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
        </Button>
      ),
    },
    { key: 'created_at', header: 'Cadastro', width: '120px',
      render: (u) => new Date(u.created_at).toLocaleDateString('pt-BR'),
    },
  ];

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerenciar acessos e permissões do sistema</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(roleConfig).map(([role, cfg]) => {
          const count = usuarios.filter(u => u.role === role).length;
          return (
            <Card key={role}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.color}`}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DataTable data={usuarios} columns={columns} loading={isLoading} emptyMessage="Nenhum usuário cadastrado" />
    </div>
  );
}
