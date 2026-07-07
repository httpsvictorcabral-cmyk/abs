import { useQuery } from '@tanstack/react-query';
import { useFiltrosStore } from '@/lib/filtros';
import { empresasService, unidadesService, departamentosService, setoresService, cargosService, gestoresService, tiposOcorrenciaService } from '@/lib/services';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, X } from 'lucide-react';
import { useMemo } from 'react';

export function GlobalFilters() {
  const filtros = useFiltrosStore();
  const { data: empresas = [] } = useQuery({ queryKey: ['empresas'], queryFn: empresasService.list });
  const { data: unidades = [] } = useQuery({ queryKey: ['unidades'], queryFn: unidadesService.list });
  const { data: departamentos = [] } = useQuery({ queryKey: ['departamentos'], queryFn: departamentosService.list });
  const { data: setores = [] } = useQuery({ queryKey: ['setores'], queryFn: setoresService.list });
  const { data: cargos = [] } = useQuery({ queryKey: ['cargos'], queryFn: cargosService.list });
  const { data: gestores = [] } = useQuery({ queryKey: ['gestores'], queryFn: gestoresService.list });
  const { data: tiposOcorrencia = [] } = useQuery({ queryKey: ['tipos_ocorrencias'], queryFn: tiposOcorrenciaService.list });

  const filteredUnidades = useMemo(
    () => filtros.empresaId ? unidades.filter(u => u.empresa_id === filtros.empresaId) : unidades,
    [unidades, filtros.empresaId]
  );
  const filteredDepartamentos = useMemo(
    () => filtros.unidadeId ? departamentos.filter(d => d.unidade_id === filtros.unidadeId) : departamentos,
    [departamentos, filtros.unidadeId]
  );
  const filteredSetores = useMemo(
    () => filtros.departamentoId ? setores.filter(s => s.departamento_id === filtros.departamentoId) : setores,
    [setores, filtros.departamentoId]
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-fade-in">
      <div className="mb-3 flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Filtros Globais</h3>
        {filtros.hasActiveFilters() && (
          <Button variant="ghost" size="sm" onClick={filtros.resetFiltros} className="ml-auto h-7 text-xs">
            <X className="mr-1 h-3 w-3" /> Limpar
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-xs">Data Início</Label>
          <Input
            type="date"
            value={filtros.dataInicio || ''}
            onChange={(e) => filtros.setFiltro('dataInicio', e.target.value || null)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Fim</Label>
          <Input
            type="date"
            value={filtros.dataFim || ''}
            onChange={(e) => filtros.setFiltro('dataFim', e.target.value || null)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Empresa</Label>
          <Select
            value={filtros.empresaId || 'all'}
            onValueChange={(v) => filtros.setFiltro('empresaId', v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unidade</Label>
          <Select
            value={filtros.unidadeId || 'all'}
            onValueChange={(v) => filtros.setFiltro('unidadeId', v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {filteredUnidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Departamento</Label>
          <Select
            value={filtros.departamentoId || 'all'}
            onValueChange={(v) => filtros.setFiltro('departamentoId', v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filteredDepartamentos.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Setor</Label>
          <Select
            value={filtros.setorId || 'all'}
            onValueChange={(v) => filtros.setFiltro('setorId', v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filteredSetores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cargo</Label>
          <Select
            value={filtros.cargoId || 'all'}
            onValueChange={(v) => filtros.setFiltro('cargoId', v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {cargos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Gestor</Label>
          <Select
            value={filtros.gestorId || 'all'}
            onValueChange={(v) => filtros.setFiltro('gestorId', v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {gestores.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ocorrência</Label>
          <Select
            value={filtros.tipoOcorrenciaId || 'all'}
            onValueChange={(v) => filtros.setFiltro('tipoOcorrenciaId', v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {tiposOcorrencia.map(t => <SelectItem key={t.id} value={t.id}>{t.codigo} - {t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
