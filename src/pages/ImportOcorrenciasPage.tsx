import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2,
  Loader2, FileUp, X, ArrowRight, AlertTriangle, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseFile, mapOcorrenciaColumns, normalizeString, normalizeNumber, normalizeDate } from '@/lib/import-utils';
import { funcionariosService, tiposOcorrenciaService, importacoesService, pendenciasService } from '@/lib/services';
import { useAuthStore } from '@/lib/auth';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

interface PreviewRow { [key: string]: any }
interface ImportSummary {
  total: number; importados: number; atualizados: number;
  duplicados: number; ignorados: number; erros: number; pendencias: number;
}
interface PendenciaItem {
  matricula: string; nome: string; motivo: string; dados: any;
}

export function ImportOcorrenciasPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'done'>('upload');
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [pendencias, setPendencias] = useState<PendenciaItem[]>([]);
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
      const mapped = mapOcorrenciaColumns(headers);
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
      setPendencias([]);

      const imp = await importacoesService.create({
        tipo: 'ocorrencias',
        nome_arquivo: file!.name,
        tamanho_arquivo: file!.size,
        total_registros: rows.length,
        status: 'Processando',
        usuario_id: user?.id,
      });

      const result: ImportSummary = {
        total: rows.length, importados: 0, atualizados: 0,
        duplicados: 0, ignorados: 0, erros: 0, pendencias: 0,
      };
      const pendenciaList: PendenciaItem[] = [];

      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        for (const row of batch) {
          try {
            const matricula = normalizeString(row[mapping.matricula] || row['MATRICULA'] || row['MATRÍCULA']);
            const codigo = normalizeString(row[mapping.codigo] || row['COD']);
            const nomeOcorrencia = normalizeString(row[mapping.ocorrencia] || row['OCORRENCIA']);
            const quantidade = normalizeNumber(row[mapping.quantidade] || row['QUANTIDADE'] || row['HORAS']);
            const dataOcorrencia = normalizeDate(row[mapping.data_ocorrencia] || row['DATA']);

            if (!matricula) {
              result.ignorados++;
              continue;
            }
            if (!codigo && !nomeOcorrencia) {
              result.ignorados++;
              continue;
            }

            // Find funcionario by matricula
            const funcionario = await funcionariosService.getByMatricula(matricula);
            if (!funcionario) {
              result.pendencias++;
              const pend: PendenciaItem = {
                matricula,
                nome: normalizeString(row[mapping.nome] || row['FUNCIONARIO']),
                motivo: 'Funcionário não encontrado',
                dados: row,
              };
              pendenciaList.push(pend);
              await pendenciasService.create({
                importacao_id: imp.id,
                matricula,
                nome_funcionario: pend.nome,
                codigo_ocorrencia: codigo,
                nome_ocorrencia: nomeOcorrencia,
                quantidade,
                data_ocorrencia: dataOcorrencia,
                motivo: 'Funcionário não encontrado',
                dados_originais: row,
                status: 'Pendente',
              });
              continue;
            }

            // Find or create tipo_ocorrencia
            let tipoId: string | null = null;
            if (codigo) {
              const tipo = await tiposOcorrenciaService.getOrCreateByCodigo(codigo, nomeOcorrencia || codigo);
              tipoId = tipo.id;
            }

            // Check for duplicate (same funcionario, same data, same codigo)
            const { supabase } = await import('@/lib/supabase');
            const { data: existing } = await supabase
              .from('ocorrencias')
              .select('id, quantidade')
              .eq('funcionario_id', funcionario.id)
              .eq('data_ocorrencia', dataOcorrencia || new Date().toISOString().split('T')[0])
              .eq('codigo_ocorrencia', codigo)
              .maybeSingle();

            const date = dataOcorrencia ? new Date(dataOcorrencia) : new Date();
            const mes = date.getMonth() + 1;
            const ano = date.getFullYear();

            if (existing) {
              // Update existing
              const { error } = await supabase.from('ocorrencias').update({
                quantidade,
                tipo_ocorrencia_id: tipoId,
                nome_ocorrencia: nomeOcorrencia,
                mes, ano,
                importacao_id: imp.id,
              }).eq('id', existing.id);
              if (error) result.erros++; else result.atualizados++;
            } else {
              // Insert new
              const { error } = await supabase.from('ocorrencias').insert({
                funcionario_id: funcionario.id,
                tipo_ocorrencia_id: tipoId,
                codigo_ocorrencia: codigo,
                nome_ocorrencia: nomeOcorrencia,
                quantidade,
                unidade_medida: 'horas',
                data_ocorrencia: dataOcorrencia || new Date().toISOString().split('T')[0],
                mes, ano,
                importacao_id: imp.id,
              });
              if (error) result.erros++; else result.importados++;
            }
          } catch (err) {
            result.erros++;
          }
        }
        setProgress(Math.round(((i + batchSize) / rows.length) * 100));
      }

      await importacoesService.update(imp.id, { ...result, status: 'Concluído' });
      setSummary(result);
      setPendencias(pendenciaList);
      setStep('done');
      queryClient.invalidateQueries();
    },
    onError: (e: any) => {
      toast.error(`Erro na importação: ${e.message}`);
      setStep('preview');
    },
  });

  const reset = () => {
    setFile(null); setRows([]); setMapping({}); setStep('upload');
    setProgress(0); setSummary(null); setPendencias([]);
  };

  const mappedFields = Object.keys(mapping);
  const previewHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importação de Ocorrências</h1>
        <p className="text-sm text-muted-foreground">Importe registros de absenteísmo via Excel ou CSV. A quantidade representa horas.</p>
      </div>

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
                <p className="text-sm text-muted-foreground mt-1">Formatos: Excel (.xlsx, .xls) e CSV. Layout: MATRICULA, FUNCIONÁRIO, COD, OCORRÊNCIA, QUANTIDADE, DATA</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" />{file?.name}</span>
                <Badge>{rows.length} registros</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">Mapeamento Automático de Colunas</h4>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {mappedFields.map((field) => (
                    <div key={field} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
                      <ClipboardList className="h-3 w-3 text-primary" />
                      <span className="font-medium">{field}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{mapping[field]}</span>
                    </div>
                  ))}
                </div>
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
                        {previewHeaders.map(h => <TableCell key={h} className="text-xs">{String(row[h] ?? '')}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="mt-4 flex items-center justify-between">
                <Button variant="outline" onClick={reset}><X className="mr-2 h-4 w-4" /> Cancelar</Button>
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
                <p className="text-sm text-muted-foreground">Validando dados, localizando funcionários e registrando ocorrências</p>
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
                <CheckCircle2 className="h-5 w-5 text-green-500" /> Importação Concluída
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
                <SummaryItem label="Total" value={summary.total} color="text-primary" />
                <SummaryItem label="Importados" value={summary.importados} color="text-green-600 dark:text-green-400" />
                <SummaryItem label="Atualizados" value={summary.atualizados} color="text-blue-600 dark:text-blue-400" />
                <SummaryItem label="Duplicados" value={summary.duplicados} color="text-yellow-600 dark:text-yellow-400" />
                <SummaryItem label="Ignorados" value={summary.ignorados} color="text-gray-500" />
                <SummaryItem label="Pendências" value={summary.pendencias} color="text-orange-600 dark:text-orange-400" />
                <SummaryItem label="Erros" value={summary.erros} color="text-red-600 dark:text-red-400" />
              </div>
              <div className="mt-6 flex gap-2">
                <Button onClick={reset}>Nova Importação</Button>
              </div>
            </CardContent>
          </Card>

          {pendencias.length > 0 && (
            <Card className="border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-5 w-5" /> Pendências de Importação ({pendencias.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Os seguintes registros não puderam ser importados porque o funcionário não foi encontrado no sistema.
                </p>
                <ScrollArea className="h-[300px] rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Matrícula</TableHead>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendencias.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{p.matricula}</TableCell>
                          <TableCell className="text-xs">{p.nome || '—'}</TableCell>
                          <TableCell className="text-xs text-orange-600 dark:text-orange-400">{p.motivo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
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
