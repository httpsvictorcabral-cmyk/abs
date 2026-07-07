import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2,
  Loader2, FileUp, X, ArrowRight, Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseFile, mapFuncionarioColumns, normalizeString, normalizeDate } from '@/lib/import-utils';
import { funcionariosService, empresasService, unidadesService, departamentosService, setoresService, cargosService, gestoresService, centroCustosService, importacoesService } from '@/lib/services';
import { useAuthStore } from '@/lib/auth';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

interface PreviewRow {
  [key: string]: any;
}

interface ImportSummary {
  total: number;
  importados: number;
  atualizados: number;
  duplicados: number;
  ignorados: number;
  erros: number;
}

export function ImportFuncionariosPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'done'>('upload');
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  void importId;
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setStep('processing');
    try {
      const parsed = await parseFile(f);
      if (parsed.length === 0) {
        toast.error('Arquivo vazio ou sem dados válidos');
        setStep('upload');
        return;
      }
      const headers = Object.keys(parsed[0]);
      const mapped = mapFuncionarioColumns(headers);
      setMapping(mapped);
      setRows(parsed);
      setStep('preview');
    } catch (e: any) {
      toast.error(`Erro ao ler arquivo: ${e.message}`);
      setStep('upload');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const processImport = useMutation({
    mutationFn: async () => {
      setStep('processing');
      setProgress(0);

      // Create import record
      const imp = await importacoesService.create({
        tipo: 'funcionarios',
        nome_arquivo: file!.name,
        tamanho_arquivo: file!.size,
        total_registros: rows.length,
        status: 'Processando',
        usuario_id: user?.id,
      });
      setImportId(imp.id);

      const result: ImportSummary = {
        total: rows.length, importados: 0, atualizados: 0,
        duplicados: 0, ignorados: 0, erros: 0,
      };

      // Cache existing entities for auto-creation
      const existingEmpresas = await empresasService.list();
      const existingUnidades = await unidadesService.list();
      const existingDepartamentos = await departamentosService.list();
      const existingSetores = await setoresService.list();
      const existingCargos = await cargosService.list();
      const existingGestores = await gestoresService.list();
      const existingCentroCustos = await centroCustosService.list();

      const empresaMap = new Map(existingEmpresas.map(e => [e.nome.toLowerCase(), e.id]));
      const unidadeMap = new Map(existingUnidades.map(u => [u.nome.toLowerCase(), u.id]));
      const deptoMap = new Map(existingDepartamentos.map(d => [d.nome.toLowerCase(), d.id]));
      const setorMap = new Map(existingSetores.map(s => [s.nome.toLowerCase(), s.id]));
      const cargoMap = new Map(existingCargos.map(c => [c.nome.toLowerCase(), c.id]));
      const gestorMap = new Map(existingGestores.map(g => [g.nome.toLowerCase(), g.id]));
      const ccMap = new Map(existingCentroCustos.map(c => [c.nome.toLowerCase(), c.id]));

      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        for (const row of batch) {
          try {
            const matricula = normalizeString(row[mapping.matricula] || row['MATRICULA'] || row['MATRÍCULA']);
            const nome = normalizeString(row[mapping.nome] || row['NOME'] || row['FUNCIONARIO']);

            if (!matricula || !nome) {
              result.ignorados++;
              continue;
            }

            // Auto-create/find entities
            let empresaId: string | null = null;
            const empresaNome = normalizeString(row[mapping.empresa]);
            if (empresaNome) {
              if (empresaMap.has(empresaNome.toLowerCase())) {
                empresaId = empresaMap.get(empresaNome.toLowerCase())!;
              } else {
                const newEmp = await empresasService.create({ nome: empresaNome, ativa: true });
                empresaMap.set(empresaNome.toLowerCase(), newEmp.id);
                empresaId = newEmp.id;
              }
            }

            let unidadeId: string | null = null;
            const unidadeNome = normalizeString(row[mapping.unidade]);
            if (unidadeNome && empresaId) {
              if (unidadeMap.has(unidadeNome.toLowerCase())) {
                unidadeId = unidadeMap.get(unidadeNome.toLowerCase())!;
              } else {
                const newUn = await unidadesService.create({ nome: unidadeNome, empresa_id: empresaId, ativa: true });
                unidadeMap.set(unidadeNome.toLowerCase(), newUn.id);
                unidadeId = newUn.id;
              }
            }

            let deptoId: string | null = null;
            const deptoNome = normalizeString(row[mapping.departamento]);
            if (deptoNome && unidadeId) {
              if (deptoMap.has(deptoNome.toLowerCase())) {
                deptoId = deptoMap.get(deptoNome.toLowerCase())!;
              } else {
                const newDep = await departamentosService.create({ nome: deptoNome, unidade_id: unidadeId, ativo: true });
                deptoMap.set(deptoNome.toLowerCase(), newDep.id);
                deptoId = newDep.id;
              }
            }

            let setorId: string | null = null;
            const setorNome = normalizeString(row[mapping.setor]);
            if (setorNome && deptoId) {
              if (setorMap.has(setorNome.toLowerCase())) {
                setorId = setorMap.get(setorNome.toLowerCase())!;
              } else {
                const newSet = await setoresService.create({ nome: setorNome, departamento_id: deptoId, ativo: true });
                setorMap.set(setorNome.toLowerCase(), newSet.id);
                setorId = newSet.id;
              }
            }

            let cargoId: string | null = null;
            const cargoNome = normalizeString(row[mapping.cargo]);
            if (cargoNome) {
              if (cargoMap.has(cargoNome.toLowerCase())) {
                cargoId = cargoMap.get(cargoNome.toLowerCase())!;
              } else {
                const newCargo = await cargosService.create({ nome: cargoNome, ativo: true });
                cargoMap.set(cargoNome.toLowerCase(), newCargo.id);
                cargoId = newCargo.id;
              }
            }

            let gestorId: string | null = null;
            const gestorNome = normalizeString(row[mapping.gestor]);
            if (gestorNome) {
              if (gestorMap.has(gestorNome.toLowerCase())) {
                gestorId = gestorMap.get(gestorNome.toLowerCase())!;
              } else {
                const newGestor = await gestoresService.create({ nome: gestorNome, unidade_id: unidadeId, setor_id: setorId, ativo: true });
                gestorMap.set(gestorNome.toLowerCase(), newGestor.id);
                gestorId = newGestor.id;
              }
            }

            let ccId: string | null = null;
            const ccNome = normalizeString(row[mapping.centro_custo]);
            if (ccNome && empresaId) {
              if (ccMap.has(ccNome.toLowerCase())) {
                ccId = ccMap.get(ccNome.toLowerCase())!;
              } else {
                const newCC = await centroCustosService.create({ codigo: ccNome.slice(0, 20), nome: ccNome, empresa_id: empresaId, ativo: true });
                ccMap.set(ccNome.toLowerCase(), newCC.id);
                ccId = newCC.id;
              }
            }

            const funcData: any = {
              matricula,
              nome,
              cpf: normalizeString(row[mapping.cpf]) || null,
              cargo_id: cargoId,
              departamento_id: deptoId,
              setor_id: setorId,
              empresa_id: empresaId,
              unidade_id: unidadeId,
              gestor_id: gestorId,
              centro_custo_id: ccId,
              escala: normalizeString(row[mapping.escala]) || null,
              data_admissao: normalizeDate(row[mapping.data_admissao]),
              status: normalizeString(row[mapping.status]) || 'Ativo',
              telefone: normalizeString(row[mapping.telefone]) || null,
              email: normalizeString(row[mapping.email]) || null,
              observacoes: normalizeString(row[mapping.observacoes]) || null,
            };

            // Check if exists
            const existing = await funcionariosService.getByMatricula(matricula);
            if (existing) {
              await funcionariosService.update(existing.id, funcData);
              result.atualizados++;
            } else {
              await funcionariosService.create(funcData);
              result.importados++;
            }
          } catch (err) {
            result.erros++;
          }
        }
        setProgress(Math.round(((i + batchSize) / rows.length) * 100));
      }

      // Update import record
      await importacoesService.update(imp.id, {
        ...result,
        status: 'Concluído',
      });

      setSummary(result);
      setStep('done');
      queryClient.invalidateQueries();
    },
    onError: (e: any) => {
      toast.error(`Erro na importação: ${e.message}`);
      setStep('preview');
    },
  });

  const reset = () => {
    setFile(null);
    setRows([]);
    setMapping({});
    setStep('upload');
    setProgress(0);
    setSummary(null);
    setImportId(null);
  };

  const mappedFields = Object.keys(mapping);
  const previewHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importação de Funcionários</h1>
        <p className="text-sm text-muted-foreground">Importe colaboradores via Excel ou CSV com mapeamento automático</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[
          { key: 'upload', label: 'Upload', icon: FileUp },
          { key: 'preview', label: 'Prévia', icon: FileSpreadsheet },
          { key: 'processing', label: 'Processando', icon: Loader2 },
          { key: 'done', label: 'Concluído', icon: CheckCircle2 },
        ].map((s, i) => {
          const Icon = s.icon;
          const active = step === s.key;
          const done = ['preview', 'processing', 'done'].indexOf(step) > ['upload', 'preview', 'processing', 'done'].indexOf(s.key) - 1;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                active ? 'bg-primary text-primary-foreground' : done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                <Icon className={`h-4 w-4 ${active && s.key === 'processing' ? 'animate-spin' : ''}`} />
              </div>
              <span className={`text-sm ${active ? 'font-semibold' : 'text-muted-foreground'}`}>{s.label}</span>
              {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />}
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Arraste um arquivo ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground mt-1">Formatos suportados: Excel (.xlsx, .xls) e CSV</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  {file?.name}
                </span>
                <Badge>{rows.length} registros</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">Mapeamento Automático de Colunas</h4>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {mappedFields.map((field) => (
                    <div key={field} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
                      <Database className="h-3 w-3 text-primary" />
                      <span className="font-medium">{field}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{mapping[field]}</span>
                    </div>
                  ))}
                </div>
                {mappedFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum mapeamento automático detectado. Verifique os cabeçalhos do arquivo.</p>
                )}
              </div>

              <ScrollArea className="h-[300px] rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {previewHeaders.map(h => <TableHead key={h} className="text-xs">{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        {previewHeaders.map(h => (
                          <TableCell key={h} className="text-xs">{String(row[h] ?? '')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="mt-4 flex items-center justify-between">
                <Button variant="outline" onClick={reset}>
                  <X className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button onClick={() => processImport.mutate()} disabled={processImport.isPending}>
                  <UploadCloud className="mr-2 h-4 w-4" /> Importar {rows.length} Registros
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'processing' && (
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-semibold">Processando importação...</p>
                <p className="text-sm text-muted-foreground">Criando entidades e cadastrando funcionários</p>
              </div>
              <div className="w-full max-w-md">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground mt-2">{progress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'done' && summary && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Importação Concluída
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <SummaryItem label="Total" value={summary.total} color="text-primary" />
                <SummaryItem label="Importados" value={summary.importados} color="text-green-600 dark:text-green-400" />
                <SummaryItem label="Atualizados" value={summary.atualizados} color="text-blue-600 dark:text-blue-400" />
                <SummaryItem label="Duplicados" value={summary.duplicados} color="text-yellow-600 dark:text-yellow-400" />
                <SummaryItem label="Ignorados" value={summary.ignorados} color="text-gray-500" />
                <SummaryItem label="Erros" value={summary.erros} color="text-red-600 dark:text-red-400" />
              </div>
              <div className="mt-6 flex gap-2">
                <Button onClick={reset}>Nova Importação</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
