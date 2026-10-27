import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useEditaisData } from "@/context/EditaisDataContext";
import { buildVideoReport, type VideoReportPeriodMode } from "@/lib/videoReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Download, FileJson, FileText, Video } from "lucide-react";

const MONTH_OPTIONS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
] as const;

function getBaseDataYears(data: ReturnType<typeof useEditaisData>["data"]) {
  return Array.from(
    new Set(
      data
        .filter((item) => item?.id && item.novaGestao && item.fase !== "Excluídos" && item.abertura)
        .map((item) => item.abertura.slice(0, 4)),
    ),
  ).sort((a, b) => Number(b) - Number(a));
}

function getAvailableMonthsForYear(data: ReturnType<typeof useEditaisData>["data"], year: string) {
  return Array.from(
    new Set(
      data
        .filter((item) => item?.id && item.novaGestao && item.fase !== "Excluídos" && item.abertura.slice(0, 4) === year)
        .map((item) => item.abertura.slice(5, 7)),
    ),
  )
    .sort((a, b) => Number(a) - Number(b))
    .map((value) => MONTH_OPTIONS.find((item) => item.value === value))
    .filter((item): item is (typeof MONTH_OPTIONS)[number] => Boolean(item));
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function RelatorioVideo() {
  const { data } = useEditaisData();
  const years = useMemo(() => getBaseDataYears(data), [data]);
  const [mode, setMode] = useState<VideoReportPeriodMode>("total");
  const [year, setYear] = useState<string>(years[0] ?? "");

  useEffect(() => {
    if (!years.length) return;
    if (!year || !years.includes(year)) {
      setYear(years[0]);
    }
  }, [year, years]);

  const monthOptions = useMemo(() => getAvailableMonthsForYear(data, year), [data, year]);
  const [month, setMonth] = useState<string>(monthOptions[monthOptions.length - 1]?.value ?? "01");

  useEffect(() => {
    if (!monthOptions.length) return;
    if (!monthOptions.some((item) => item.value === month)) {
      setMonth(monthOptions[monthOptions.length - 1]?.value ?? monthOptions[0].value);
    }
  }, [month, monthOptions]);

  const report = useMemo(
    () => buildVideoReport({ data, mode, year, month }),
    [data, mode, year, month],
  );

  async function handleCopy(content: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(successMessage);
    } catch {
      toast.error("Não foi possível copiar o conteúdo.");
    }
  }

  return (
    <DashboardLayout title="Relatório de Vídeo">
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <Video className="h-3.5 w-3.5" />
                    Synthesia
                  </Badge>
                </div>
                <CardTitle className="text-xl">Roteiro automático para vídeo</CardTitle>
                <CardDescription className="max-w-3xl leading-relaxed">
                  Gere um resumo em texto e em JSON para locução de vídeo com base no período analisado. O conteúdo acompanha a base importada mais recente e segue a estrutura do roteiro que você definiu.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Período: {report.periodLabel}</Badge>
                <Badge variant="outline">Editais no recorte: {report.filtered.length}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de período</label>
                <Select value={mode} onValueChange={(value) => setMode(value as VideoReportPeriodMode)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Período total</SelectItem>
                    <SelectItem value="ano">Ano</SelectItem>
                    <SelectItem value="mes">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode !== "total" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ano</label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === "mes" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mês</label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="texto" className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList>
              <TabsTrigger value="texto" className="gap-2">
                <FileText className="h-4 w-4" />
                Texto
              </TabsTrigger>
              <TabsTrigger value="json" className="gap-2">
                <FileJson className="h-4 w-4" />
                JSON
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="texto">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-lg">Roteiro em texto</CardTitle>
                    <CardDescription>
                      Versão pronta para locução, com o período analisado e os indicadores preenchidos automaticamente.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => handleCopy(report.scriptText, "Roteiro copiado.") }>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar TXT
                    </Button>
                    <Button onClick={() => downloadTextFile(report.scriptText, "roteiro-video.txt", "text/plain;charset=utf-8") }>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar TXT
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea readOnly value={report.scriptText} className="min-h-[520px] resize-y whitespace-pre-wrap font-mono text-sm leading-7" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-lg">Resumo estruturado em JSON</CardTitle>
                    <CardDescription>
                      Estrutura pronta para integrações, automações e geração de vídeo em ferramentas externas.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => handleCopy(report.jsonText, "JSON copiado.") }>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar JSON
                    </Button>
                    <Button onClick={() => downloadTextFile(report.jsonText, "roteiro-video.json", "application/json;charset=utf-8") }>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar JSON
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea readOnly value={report.jsonText} className="min-h-[520px] resize-y whitespace-pre font-mono text-sm leading-7" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
