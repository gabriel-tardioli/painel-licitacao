import { useMemo, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useEditaisData } from "@/context/EditaisDataContext";
import { parseSpreadsheetRows } from "@/lib/editais";
import { formatNumber } from "@/data/mockData";
import { toast } from "sonner";
import { CheckCircle2, Cloud, CloudOff, FileSpreadsheet, RefreshCcw, Upload, XCircle } from "lucide-react";

const compatibilityChecks = [
  { label: "Identificação do edital", aliases: ["Nº", "N", "NO", "NUMERO"] },
  { label: "Órgão", aliases: ["ORGÃO", "ORGAO"] },
  { label: "Situação/Fase", aliases: ["FASE", "PARTICIPOU?", "PARTICIPOU"] },
  { label: "Data de abertura", aliases: ["ABERTURA"] },
  { label: "Valor estimado", aliases: ["VALOR ESTIMADO"] },
  { label: "Valor fechado", aliases: ["VALOR FECHADO"] },
  { label: "Empresa vencedora", aliases: ["EMPRESA VENCEDORA"] },
  { label: "Nossa proposta", aliases: ["PROPOSTA", "NOSSA PROPOSTA"] },
  { label: "Justificativas", aliases: ["JUSTIFICATIVAS"] },
  { label: "Objeto", aliases: ["OBJETO"] },
  { label: "UF", aliases: ["UF"] },
  { label: "Região", aliases: ["REGIÃO", "REGIAO"] },
  { label: "Nova gestão", aliases: ["NOVA GESTÃO?", "NOVA GESTAO?"] },
];

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

export default function ImportacaoDados() {
  const {
    data,
    fileName,
    importedAt,
    isUsingImportedData,
    setImportedData,
    resetData,
    hasSharedSync,
    syncMode,
    isSyncing,
    syncError,
  } = useEditaisData();
  const [isLoading, setIsLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  const previewColumns = useMemo(() => {
    const firstRow = previewRows[0];
    return firstRow ? Object.keys(firstRow).slice(0, 8) : [];
  }, [previewRows]);

  const compatibility = useMemo(() => {
    const normalizedHeaders = detectedHeaders.map(normalizeHeader);

    return compatibilityChecks.map((item) => ({
      label: item.label,
      ok: item.aliases.some((alias) => normalizedHeaders.includes(normalizeHeader(alias))),
    }));
  }, [detectedHeaders]);

  const compatibilityOk = compatibility.length === 0 || compatibility.every((item) => item.ok);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new Error("Não encontrei nenhuma aba válida no arquivo.");
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: true,
      });

      const headers = rows[0] ? Object.keys(rows[0]) : [];
      setDetectedHeaders(headers);

      const parsed = parseSpreadsheetRows(rows);
      if (!parsed.length) {
        throw new Error("O arquivo foi lido, mas não encontrei linhas válidas para importar.");
      }

      await setImportedData(parsed, file.name);
      setPreviewRows(rows.slice(0, 5));
      toast.success(
        hasSharedSync
          ? `Base compartilhada atualizada com sucesso: ${file.name}`
          : `Base importada apenas neste navegador: ${file.name}`,
      );
      event.target.value = "";
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Não foi possível importar o arquivo.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset() {
    try {
      await resetData();
      toast.success(hasSharedSync ? "Base padrão restaurada para todos os acessos." : "Base padrão restaurada neste navegador.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Não foi possível restaurar a base padrão.");
    }
  }

  return (
    <DashboardLayout title="Importação de Dados Licitações">
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <Upload className="h-5 w-5" /> Atualizar base por Excel
              </CardTitle>
              <CardDescription>
                Envie um arquivo .xlsx, .xls ou .csv. A aplicação usa a primeira aba do arquivo e atualiza todos os dashboards automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={isLoading || isSyncing}
                  className="cursor-pointer bg-background"
                />
                <p className="mt-3 text-sm text-muted-foreground">
                  Estrutura esperada: colunas como <strong>Nº</strong>, <strong>ORGÃO</strong>, <strong>FASE</strong>, <strong>ABERTURA</strong>, <strong>VALOR ESTIMADO</strong>, <strong>JUSTIFICATIVAS</strong> e demais campos da sua planilha padrão.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={isUsingImportedData ? "default" : "secondary"}>
                  {isUsingImportedData ? "Usando base importada" : "Usando base padrão"}
                </Badge>
                <Badge variant={hasSharedSync ? "outline" : "secondary"} className="gap-1">
                  {hasSharedSync ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
                  {hasSharedSync ? "Sincronização compartilhada ativa" : "Somente navegador local"}
                </Badge>
                {fileName && <Badge variant="outline">Arquivo: {fileName}</Badge>}
                {importedAt && (
                  <span className="text-sm text-muted-foreground">
                    Última importação: {new Date(importedAt).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleReset} disabled={isSyncing}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Restaurar base padrão
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <FileSpreadsheet className="h-5 w-5" /> Resumo da base ativa
              </CardTitle>
              <CardDescription>
                {hasSharedSync
                  ? "A base ativa está sincronizada em nuvem e vale para qualquer pessoa que acessar o site."
                  : "A base ativa continua salva só neste navegador até você conectar um backend compartilhado."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Linhas válidas</p>
                  <p className="mt-1 text-2xl font-bold font-heading">{formatNumber(data.length)}</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Fonte</p>
                  <p className="mt-1 text-sm font-medium">
                    {isUsingImportedData ? "Arquivo enviado pelo usuário" : "Base padrão do projeto"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Modo atual: {syncMode === "shared" ? "compartilhado" : "local"}
                  </p>
                </div>
              </div>

              <Alert>
                <AlertTitle>Compatibilidade atual</AlertTitle>
                <AlertDescription>
                  A importação continua funcionando com a planilha no mesmo formato. As telas Visão Executiva, Visão Administrativa, Financeiro, Análise Regional, Base Detalhada e Relatório passam a refletir a base ativa imediatamente.
                </AlertDescription>
              </Alert>

              {hasSharedSync ? (
                <Alert>
                  <AlertTitle>Compartilhamento ativado</AlertTitle>
                  <AlertDescription>
                    Toda nova planilha enviada nesta página passa a valer para qualquer acesso ao site, não só para este computador.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTitle>Compartilhamento ainda não configurado</AlertTitle>
                  <AlertDescription>
                    Conecte o projeto do Lovable a um backend compartilhado e defina as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> para que a base importada seja vista por todos.
                  </AlertDescription>
                </Alert>
              )}

              {syncError ? (
                <Alert variant="destructive">
                  <AlertTitle>Erro de sincronização</AlertTitle>
                  <AlertDescription>{syncError}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Validação rápida das colunas reconhecidas</CardTitle>
            <CardDescription>
              Após escolher um arquivo, o painel abaixo mostra se os campos usados pelas telas continuam presentes no layout da planilha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detectedHeaders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Selecione um arquivo para validar a estrutura antes ou junto da importação.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={compatibilityOk ? "default" : "destructive"}>
                    {compatibilityOk ? "Estrutura compatível" : "Revisar estrutura da planilha"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {compatibility.filter((item) => item.ok).length} de {compatibility.length} grupos de colunas reconhecidos.
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {compatibility.map((item) => (
                    <div key={item.label} className="rounded-xl border bg-background/70 px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        {item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Pré-visualização da última leitura</CardTitle>
            <CardDescription>Conferência rápida das primeiras linhas do arquivo processado.</CardDescription>
          </CardHeader>
          <CardContent>
            {previewRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não houve importação nesta sessão.</p>
            ) : (
              <div className="space-y-3 overflow-auto">
                <div className="flex flex-wrap gap-2">
                  {previewColumns.map((column) => (
                    <Badge key={column} variant="secondary">
                      {column}
                    </Badge>
                  ))}
                </div>
                <div className="rounded-xl border">
                  <pre className="max-h-80 overflow-auto p-4 text-xs leading-6 text-muted-foreground">
                    {JSON.stringify(previewRows, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
