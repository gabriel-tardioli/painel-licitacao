import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFilters } from "@/hooks/useFilters";
import { useEditaisData } from "@/context/EditaisDataContext";
import { faseLabels, formatCurrency, formatNumber, getKPIs, type Edital, type FaseEdital } from "@/data/mockData";
import { FileDown, FileSpreadsheet, Filter, LayoutDashboard, MapPin, Printer, Wallet } from "lucide-react";
import { buildMonthlyPerformanceChart, yearChartColors } from "@/lib/monthlyPerformanceChart";

const reportSections = [
  { key: "executiva", label: "Visão Executiva", icon: LayoutDashboard },
  { key: "administrativa", label: "Visão Administrativa", icon: Filter },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "regional", label: "Análise Regional", icon: MapPin },
  { key: "base", label: "Base Detalhada", icon: FileSpreadsheet },
] as const;

type ReportSectionKey = (typeof reportSections)[number]["key"];
type ReportSelectionState = Record<ReportSectionKey, boolean>;

type GroupedObjectItem = {
  objeto: string;
  quantidade: number;
  percentual: number;
};

type NoGoReasonItem = {
  motivo: string;
  quantidade: number;
  percentualAcumulado: number;
};

const defaultSelection: ReportSelectionState = {
  executiva: true,
  administrativa: true,
  financeiro: true,
  regional: true,
  base: true,
};

const statusColors = [
  "hsl(214,62%,26%)",
  "hsl(214,84%,42%)",
  "hsl(42,92%,55%)",
  "hsl(152,60%,40%)",
  "hsl(0,72%,51%)",
  "hsl(262,72%,56%)",
  "hsl(24,95%,53%)",
  "hsl(215,12%,50%)",
];

const CHART_AXIS_TICK = { fontSize: 14, fontWeight: 600 } as const;
const CHART_AXIS_TICK_ROTATED = { fontSize: 14, fontWeight: 600 } as const;

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatMillions(value: number) {
  return `${(value / 1_000_000).toFixed(3)} milhões`;
}

function formatMillionsSummary(value: number) {
  const millions = value / 1_000_000;
  return `${millions.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} Milhões`;
}

function formatDateBR(value?: string | null) {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function getJustificativa(value?: string | null) {
  const text = value?.trim();
  return text ? text : "Não informado";
}

function getObjetoLabel(value?: string | null) {
  const text = value?.trim();
  return text ? text : "Não informado";
}

function isWinner(edital: Edital) {
  return edital.participou === "VENCEU" || edital.fase === "Venceu" || edital.empresaVencedora === "Nossa OSS";
}

function isLoss(edital: Edital) {
  return edital.participou === "PERDEU" || edital.fase === "Perdeu";
}

function getDiscountPercent(edital: Edital) {
  const estimado = edital.valorEstimado ?? 0;
  const fechado = edital.valorFechado ?? 0;
  if (estimado <= 0 || fechado <= 0) return 0;
  return (1 - fechado / estimado) * 100;
}

function sortEditaisByDateDesc(items: Edital[]) {
  return [...items].sort((a, b) => {
    const dateA = a.abertura ? new Date(`${a.abertura}T00:00:00`).getTime() : 0;
    const dateB = b.abertura ? new Date(`${b.abertura}T00:00:00`).getTime() : 0;
    return dateB - dateA;
  });
}

function buildGroupedObjects(items: Edital[]) {
  const total = items.length;

  return Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      const objeto = getObjetoLabel(item.objeto);
      acc[objeto] = (acc[objeto] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([objeto, quantidade]) => ({
      objeto,
      quantidade,
      percentual: total > 0 ? (quantidade / total) * 100 : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.objeto.localeCompare(b.objeto, "pt-BR"));
}

function DistributionSummaryTable({
  title,
  subtitle,
  rows,
  categoryLabel,
  quantityLabel = "Quantidade",
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  subtitle: string;
  rows: Array<{
    label: string;
    quantidade: number;
    percentual?: number;
    percentualAcumulado?: number;
  }>;
  categoryLabel: string;
  quantityLabel?: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 report-allow-break">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      </div>

      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{categoryLabel}</TableHead>
              <TableHead className="text-right">{quantityLabel}</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">% acumulado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right">{formatNumber(row.quantidade)}</TableCell>
                <TableCell className="text-right">{row.percentual !== undefined ? formatPercent(row.percentual) : "—"}</TableCell>
                <TableCell className="text-right">{row.percentualAcumulado !== undefined ? formatPercent(row.percentualAcumulado) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="p-4">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
  details,
}: {
  label: string;
  value?: string;
  tone?: "default" | "success" | "warning" | "danger";
  details?: Array<{
    label: string;
    value: string;
    valueClassName?: string;
  }>;
}) {
  const toneClassName = {
    default: "text-slate-900",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-rose-600",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      {details?.length ? (
        <div className="mt-2 space-y-2">
          {details.map((detail) => (
            <div key={`${label}-${detail.label}`}>
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{detail.label}</div>
              <div className={`mt-1 text-lg font-bold leading-tight ${detail.valueClassName ?? toneClassName}`}>{detail.value}</div>
            </div>
          ))}
        </div>
      ) : value ? (
        <div className={`mt-2 text-xl font-bold ${toneClassName}`}>{value}</div>
      ) : null}
    </div>
  );
}

function ReportHeader({
  title,
  subtitle,
  showPageBreak = true,
}: {
  title: string;
  subtitle: string;
  showPageBreak?: boolean;
}) {
  return (
    <div className={showPageBreak ? "report-section report-page-break" : "report-section"}>
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Painel de Licitações</div>
          <div>{new Date().toLocaleString("pt-BR")}</div>
        </div>
      </div>
    </div>
  );
}

function EditaisReportTable({
  title,
  subtitle,
  items,
  emptyTitle,
  emptyDescription,
  showStatus = false,
  showNoGoReason = false,
  showNossaProposta = false,
  limit = 12,
}: {
  title: string;
  subtitle: string;
  items: Edital[];
  emptyTitle: string;
  emptyDescription: string;
  showStatus?: boolean;
  showNoGoReason?: boolean;
  showNossaProposta?: boolean;
  limit?: number;
}) {
  const rows = items.slice(0, limit);

  return (
    <div className="rounded-2xl border border-slate-200 p-4 report-keep-together">
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      </div>

      {rows.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Órgão</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Objeto</TableHead>
                  <TableHead className="text-right">Valor estimado</TableHead>
                  {showNossaProposta ? <TableHead className="text-right">Nossa proposta</TableHead> : null}
                  {showStatus ? <TableHead>Status</TableHead> : null}
                  {showNoGoReason ? <TableHead>Motivo do NO-GO</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={`${item.id}-${item.numeroProcesso}-${item.abertura}-${item.orgao}`}>
                    <TableCell className="font-medium">{item.orgao || "Órgão não informado"}</TableCell>
                    <TableCell>{item.uf || "—"}</TableCell>
                    <TableCell>{formatDateBR(item.abertura)}</TableCell>
                    <TableCell>{getObjetoLabel(item.objeto)}</TableCell>
                    <TableCell className="text-right">{item.valorEstimado !== null ? formatCurrency(item.valorEstimado) : "—"}</TableCell>
                    {showNossaProposta ? (
                      <TableCell className="text-right">{item.propostaPropria !== null ? formatCurrency(item.propostaPropria) : "—"}</TableCell>
                    ) : null}
                    {showStatus ? <TableCell>{faseLabels[item.fase as FaseEdital] ?? item.fase}</TableCell> : null}
                    {showNoGoReason ? <TableCell>{getJustificativa(item.justificativas)}</TableCell> : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {items.length > limit ? (
            <div className="mt-3 text-xs text-slate-500">
              Mostrando {formatNumber(rows.length)} de {formatNumber(items.length)} registro(s) nesta seção. A listagem completa permanece disponível na base detalhada ao final do relatório.
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}

export default function Relatorio() {
  const { filters, onFilterChange, filtered } = useFilters();
  const { fileName, importedAt, isUsingImportedData } = useEditaisData();
  const [sections, setSections] = useState<ReportSelectionState>(defaultSelection);

  const activeSections = reportSections.filter((section) => sections[section.key]);

  const selectedFilterBadges = useMemo(() => {
    const badges: string[] = [];
    if (filters.ano !== "Todos") badges.push(`Ano: ${filters.ano}`);
    if (filters.mes !== "Todos") badges.push(`Mês: ${filters.mes}`);
    if (filters.uf !== "Todos") badges.push(`UF: ${filters.uf}`);
    if (filters.regiao !== "Todas") badges.push(`Região: ${filters.regiao}`);
    if (filters.fase !== "todos") badges.push(`Fase: ${faseLabels[filters.fase as FaseEdital] ?? filters.fase}`);
    if (filters.objeto !== "Todos") badges.push(`Objeto: ${filters.objeto}`);
    return badges;
  }, [filters]);

  const kpis = getKPIs(filtered);

  const monthlyChart = useMemo(
    () =>
      buildMonthlyPerformanceChart({
        filtered,
        selectedYear: filters.ano,
        isWinner,
      }),
    [filtered, filters.ano],
  );

  const statusOrder: FaseEdital[] = [
    "NO-GO",
    "Perdeu",
    "Venceu",
    "Em Andamento",
    "Aguardando Resultado",
    "Revogado",
    "Suspenso",
  ];

  const statusData = useMemo(() => {
    const base = statusOrder
      .map((fase) => {
        const quantidade = filtered.filter((item) => item.fase === fase).length;
        return {
          fase,
          label: faseLabels[fase],
          quantidade,
          percentual: kpis.captados > 0 ? (quantidade / kpis.captados) * 100 : 0,
        };
      })
      .sort((a, b) => b.quantidade - a.quantidade || a.label.localeCompare(b.label, "pt-BR"));

    let acumulado = 0;
    return base.map((item) => {
      acumulado += item.quantidade;
      return {
        ...item,
        percentualAcumulado: kpis.captados > 0 ? (acumulado / kpis.captados) * 100 : 0,
      };
    });
  }, [filtered, kpis.captados]);

  const captadosPorObjeto = useMemo(() => buildGroupedObjects(filtered), [filtered]);
  const noGoItems = useMemo(
    () => filtered.filter((item) => item.fase === "NO-GO" || item.participou === "NO-GO"),
    [filtered],
  );

  const noGoByReason = useMemo<NoGoReasonItem[]>(() => {
    const grouped = Object.entries(
      noGoItems.reduce<Record<string, number>>((acc, item) => {
        const reason = getJustificativa(item.justificativas);
        acc[reason] = (acc[reason] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([motivo, quantidade]) => ({ motivo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.motivo.localeCompare(b.motivo, "pt-BR"));

    let cumulative = 0;
    return grouped.map((entry) => {
      cumulative += entry.quantidade;
      return {
        ...entry,
        percentualAcumulado: noGoItems.length > 0 ? (cumulative / noGoItems.length) * 100 : 0,
      };
    });
  }, [noGoItems]);

  const editaisEmAndamento = useMemo(
    () =>
      sortEditaisByDateDesc(
        filtered.filter((item) => item.fase === "Em Andamento" || item.participou === "EM ANDAMENTO"),
      ),
    [filtered],
  );

  const aprovacaoPorObjeto = useMemo(() => buildGroupedObjects(editaisEmAndamento), [editaisEmAndamento]);
  const valorEstimadoEmAndamento = useMemo(
    () => editaisEmAndamento.reduce((acc, item) => acc + (item.valorEstimado ?? 0), 0),
    [editaisEmAndamento],
  );

  const vencidos = useMemo(() => filtered.filter((item) => isWinner(item)), [filtered]);
  const perdidos = useMemo(() => filtered.filter((item) => item.participou === "PERDEU"), [filtered]);

  const descontoMedioProprio = useMemo(
    () => (vencidos.length > 0 ? vencidos.reduce((sum, item) => sum + getDiscountPercent(item), 0) / vencidos.length : 0),
    [vencidos],
  );

  const competidores = useMemo(() => {
    return Object.entries(
      perdidos.reduce<Record<string, { editais: Edital[]; vitorias: number; valorFechado: number }>>((acc, item) => {
        const competitor = item.empresaVencedora?.trim();
        if (!competitor || competitor === "Nossa OSS") return acc;
        if (!acc[competitor]) {
          acc[competitor] = { editais: [], vitorias: 0, valorFechado: 0 };
        }
        acc[competitor].editais.push(item);
        acc[competitor].vitorias += 1;
        acc[competitor].valorFechado += item.valorFechado ?? item.valorEstimado ?? 0;
        return acc;
      }, {}),
    )
      .map(([name, info]) => ({
        name,
        ...info,
        descontoMedio:
          info.editais.length > 0
            ? info.editais.reduce((sum, edital) => sum + getDiscountPercent(edital), 0) / info.editais.length
            : 0,
      }))
      .sort((a, b) => b.vitorias - a.vitorias || b.valorFechado - a.valorFechado)
      .slice(0, 10);
  }, [perdidos]);

  const regionalData = useMemo(() => {
    return Object.entries(
      filtered.reduce<Record<string, { captados: number; vencidos: number; perdidos: number; objetos: Record<string, number> }>>((acc, item) => {
        const uf = item.uf?.trim();
        if (!uf) return acc;
        if (!acc[uf]) {
          acc[uf] = { captados: 0, vencidos: 0, perdidos: 0, objetos: {} };
        }
        acc[uf].captados += 1;
        if (isWinner(item)) {
          acc[uf].vencidos += 1;
          const objeto = getObjetoLabel(item.objeto);
          acc[uf].objetos[objeto] = (acc[uf].objetos[objeto] ?? 0) + 1;
        }
        if (isLoss(item)) {
          acc[uf].perdidos += 1;
        }
        return acc;
      }, {}),
    )
      .map(([uf, info]) => ({
        uf,
        captados: info.captados,
        vencidos: info.vencidos,
        perdidos: info.perdidos,
        objetos: Object.entries(info.objetos)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([objeto, quantidade]) => `${objeto} (${quantidade})`),
      }))
      .sort((a, b) => b.captados - a.captados || b.vencidos - a.vencidos || b.perdidos - a.perdidos || a.uf.localeCompare(b.uf));
  }, [filtered]);

  const baseRows = useMemo(
    () =>
      sortEditaisByDateDesc(filtered),
    [filtered],
  );

  function handleGeneratePdf() {
    window.print();
  }

  function toggleSection(section: ReportSectionKey, checked: boolean) {
    setSections((prev) => ({ ...prev, [section]: checked }));
  }

  return (
    <DashboardLayout title="Relatório">
      <div className="space-y-6 animate-fade-in">
        <div className="print-hidden space-y-6">
          <div className="chart-container">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h3 className="section-title">Configuração do relatório em PDF</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione as páginas que devem entrar no relatório. O PDF é gerado pela impressão desta prévia consolidada já com os filtros aplicados.
                </p>
              </div>
              <Button onClick={handleGeneratePdf} className="w-full lg:w-auto" disabled={activeSections.length === 0}>
                <Printer className="mr-2 h-4 w-4" /> Gerar relatório em PDF
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {reportSections.map((section) => {
                const Icon = section.icon;
                return (
                  <label
                    key={section.key}
                    className="flex min-w-[220px] cursor-pointer items-start gap-3 rounded-xl border bg-background px-4 py-3"
                  >
                    <Checkbox
                      checked={sections[section.key]}
                      onCheckedChange={(checked) => toggleSection(section.key, checked === true)}
                      className="mt-0.5"
                    />
                    <div className="flex items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">{section.label}</div>
                        <div className="text-xs text-muted-foreground">Incluir esta visão na saída final do PDF.</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="chart-container space-y-4">
            <div>
              <h3 className="section-title">Filtros do relatório</h3>
              <p className="text-sm text-muted-foreground">
                Os mesmos filtros usados nas páginas do dashboard serão aplicados ao relatório consolidado.
              </p>
            </div>
            <FilterBar filters={filters} onFilterChange={onFilterChange} />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {selectedFilterBadges.length > 0 ? (
                selectedFilterBadges.map((badge) => (
                  <Badge key={badge} variant="outline">
                    {badge}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary">Sem filtros adicionais: toda a base ativa</Badge>
              )}
            </div>
          </div>
        </div>

        <div id="report-preview" className="space-y-5 rounded-2xl border bg-white p-4 sm:p-6 print:border-0 print:bg-white print:p-0">
          <div className="report-cover rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 report-keep-together">
            <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <FileDown className="h-3.5 w-3.5" /> Relatório consolidado
                </div>
                <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">Relatório de Licitações</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Documento consolidado com as visões selecionadas do dashboard, respeitando os filtros ativos desta sessão, sem logo fixo no cabeçalho ou rodapé e com layout em pilha para melhor leitura na impressão.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">Base em uso</div>
                <div>{isUsingImportedData ? fileName ?? "Base importada" : "Base padrão do projeto"}</div>
                <div>{importedAt ? `Última importação: ${new Date(importedAt).toLocaleString("pt-BR")}` : "Sem importação ativa"}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Escopo do relatório</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeSections.map((section) => (
                    <Badge key={section.key} variant="secondary" className="bg-slate-100 text-slate-800">
                      {section.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Filtros aplicados</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedFilterBadges.length > 0 ? (
                    selectedFilterBadges.map((badge) => (
                      <Badge key={badge} variant="outline" className="border-slate-300 text-slate-700">
                        {badge}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                      Todos os registros válidos da base ativa
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {sections.executiva && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 report-page-break">
              <ReportHeader title="Visão Executiva" subtitle="Resumo consolidado de captação, status e desempenho financeiro, agora em layout vertical para impressão." showPageBreak={false} />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 report-print-kpi-grid">
                <MetricCard label="Captados" value={formatNumber(kpis.captados)} />
                <MetricCard label="Participados" value={formatNumber(kpis.participados)} />
                <MetricCard label="Vencidos" value={formatNumber(kpis.vencidos)} tone="success" />
                <MetricCard label="Taxa de vitória" value={formatPercent(kpis.taxaVitoria)} />
                <MetricCard
                  label="Valor estimado total captado"
                  details={[
                    { label: "Valor total", value: formatCurrency(kpis.valorEstimadoTotal) },
                    { label: "Em milhões", value: formatMillionsSummary(kpis.valorEstimadoTotal), valueClassName: "text-slate-500" },
                  ]}
                />
                <MetricCard
                  label="Valor ganho"
                  tone="success"
                  details={[
                    { label: "Valor total", value: formatCurrency(kpis.valorGanho), valueClassName: "text-emerald-600" },
                    { label: "Em milhões", value: formatMillionsSummary(kpis.valorGanho), valueClassName: "text-slate-500" },
                  ]}
                />
                <MetricCard
                  label="Valor não ganho estimado"
                  tone="danger"
                  details={[
                    { label: "Valor total", value: formatCurrency(kpis.valorPerdidoCaptado), valueClassName: "text-rose-600" },
                    { label: "Em milhões", value: formatMillionsSummary(kpis.valorPerdidoCaptado), valueClassName: "text-slate-500" },
                  ]}
                />
                <MetricCard
                  label="Valor não ganho orçado pela concorrência"
                  tone="warning"
                  details={[
                    { label: "Valor total", value: formatCurrency(kpis.valorPerdidoFechado), valueClassName: "text-amber-600" },
                    { label: "Em milhões", value: formatMillionsSummary(kpis.valorPerdidoFechado), valueClassName: "text-slate-500" },
                  ]}
                />
              </div>

              <div className="mt-6 space-y-6 report-print-stack">
                <div className="rounded-2xl border border-slate-200 p-4 report-keep-together">
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-slate-900">Captação e valor ganho por mês</div>
                    <div className="text-xs text-slate-500">
                      Obs.: a data de captação do edital é a data de abertura. Quando o filtro de ano está em "Todos", o gráfico separa as séries por ano e considera, no ano corrente, apenas registros com abertura até a data de hoje.
                    </div>
                  </div>
                  <div className={monthlyChart.hasYearSegregation ? "h-[440px]" : "h-[390px]"}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyChart.data} margin={monthlyChart.chartMargin}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" tick={CHART_AXIS_TICK} stroke="#64748b" />
                        <YAxis yAxisId="left" allowDecimals={false} tick={CHART_AXIS_TICK} stroke="#64748b" />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(value) => formatMillions(Number(value))}
                          tick={CHART_AXIS_TICK}
                          stroke="#64748b"
                          width={Math.max(monthlyChart.rightAxisWidth, 126)}
                        />
                        <Tooltip
                          formatter={(value: number | string | null, name: string) => {
                            if (value === null || value === undefined) return ["-", name];
                            if (name.startsWith("Valor ganho")) return [formatCurrency(Number(value)), name];
                            if (name.startsWith("Editais captados")) return [`${formatNumber(Number(value))} editais`, name];
                            return [value, name];
                          }}
                        />
                        {monthlyChart.hasYearSegregation
                          ? monthlyChart.series.map((item) => (
                              <Bar
                                key={item.captadosKey}
                                yAxisId="left"
                                dataKey={item.captadosKey}
                                fill={item.color}
                                fillOpacity={0.24}
                                stroke={item.color}
                                strokeWidth={1}
                                radius={[4, 4, 0, 0]}
                                name={`Editais captados ${item.year}`}
                              />
                            ))
                          : <Bar yAxisId="left" dataKey="captados" fill="hsl(214,62%,26%)" radius={[6, 6, 0, 0]} name="Editais captados" />}
                        {monthlyChart.hasYearSegregation
                          ? monthlyChart.series.map((item) => (
                              <Line
                                key={item.valorGanhoKey}
                                yAxisId="right"
                                type="monotone"
                                dataKey={item.valorGanhoKey}
                                stroke={item.color}
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 4 }}
                                name={`Valor ganho ${item.year}`}
                              />
                            ))
                          : <Line yAxisId="right" type="monotone" dataKey="valorGanho" stroke="hsl(152,60%,40%)" strokeWidth={3} dot={{ r: 3 }} name="Valor ganho" />}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 report-keep-together">
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-slate-900">Status dos editais no período</div>
                    <div className="text-xs text-slate-500">
                      Barras por quantidade e linha com o percentual acumulado sobre o total de editais captados no período analisado.
                    </div>
                  </div>
                  {statusData.length > 0 ? (
                    <div className="h-[380px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={statusData} margin={{ top: 12, right: 20, left: 0, bottom: 54 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="label" tick={CHART_AXIS_TICK} angle={-14} textAnchor="end" interval={0} height={78} stroke="#64748b" />
                          <YAxis yAxisId="left" tick={CHART_AXIS_TICK} stroke="#64748b" allowDecimals={false} />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${Number(value).toFixed(0)}%`} tick={CHART_AXIS_TICK} stroke="#64748b" width={60} />
                          <Tooltip
                            formatter={(value: number, name: string) => {
                              if (name === "percentualAcumulado") return [formatPercent(Number(value)), "% acumulado"];
                              return [`${formatNumber(Number(value))} editais`, "Quantidade"];
                            }}
                          />
                          <Bar yAxisId="left" dataKey="quantidade" radius={[6, 6, 0, 0]}>
                            {statusData.map((entry, index) => (
                              <Cell key={entry.fase} fill={statusColors[index % statusColors.length]} />
                            ))}
                          </Bar>
                          <Line yAxisId="right" type="monotone" dataKey="percentualAcumulado" stroke="hsl(214,62%,26%)" strokeWidth={3} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState title="Nenhum status encontrado no período selecionado." description="A distribuição por status aparecerá aqui quando houver editais válidos no recorte atual." />
                  )}
                </div>

                <DistributionSummaryTable
                  title="Resumo das quantidades por status"
                  subtitle="Contagem consolidada de cada status exibido no gráfico, sem listar nominalmente os editais."
                  rows={statusData.map((item) => ({ label: item.label, quantidade: item.quantidade, percentual: item.percentual, percentualAcumulado: item.percentualAcumulado }))}
                  categoryLabel="Status"
                  quantityLabel="Editais"
                  emptyTitle="Nenhum status para resumir nesta visão."
                  emptyDescription="Quando houver dados no gráfico de status, o resumo consolidado aparecerá logo abaixo."
                />
              </div>
            </div>
          )}

          {sections.administrativa && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 report-page-break">
              <ReportHeader title="Visão Administrativa" subtitle="Conversões do funil, classificações de objeto, editais em andamento e NO-GO por motivo no novo layout vertical." showPageBreak={false} />

              <div className="grid gap-3 md:grid-cols-3 report-print-kpi-grid">
                <MetricCard label="Participação sobre captados" value={formatPercent(kpis.captados > 0 ? (kpis.participados / kpis.captados) * 100 : 0)} />
                <MetricCard label="Vitória sobre participados" value={formatPercent(kpis.participados > 0 ? (kpis.vencidos / kpis.participados) * 100 : 0)} />
                <MetricCard label="NO-GO sobre captados" value={formatPercent(kpis.captados > 0 ? (noGoItems.length / kpis.captados) * 100 : 0)} />
              </div>

              <div className="mt-6 space-y-6 report-print-stack">
                <div className="rounded-2xl border border-slate-200 p-4 report-keep-together">
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-slate-900">Editais captados por classificação do objeto</div>
                    <div className="text-xs text-slate-500">Todas as categorias identificadas no período filtrado, em gráfico de barras ocupando toda a largura útil do relatório.</div>
                  </div>
                  {captadosPorObjeto.length > 0 ? (
                    <div className="h-[380px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={captadosPorObjeto} margin={{ top: 12, right: 16, left: 0, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="objeto" angle={-16} textAnchor="end" interval={0} height={96} tick={CHART_AXIS_TICK} stroke="#64748b" />
                          <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} stroke="#64748b" />
                          <Tooltip formatter={(value: number) => [`${formatNumber(Number(value))} editais`, "Quantidade"]} labelFormatter={(label) => `Classificação do objeto: ${label}`} />
                          <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                            {captadosPorObjeto.map((item, index) => (
                              <Cell key={item.objeto} fill={yearChartColors[index % yearChartColors.length]} />
                            ))}
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState title="Nenhum edital captado no período selecionado." description="As classificações de objeto aparecerão aqui quando houver editais captados no recorte atual." />
                  )}
                </div>

                <DistributionSummaryTable
                  title="Resumo das quantidades por classificação do objeto"
                  subtitle="Contagem consolidada de cada classificação apresentada no gráfico de editais captados."
                  rows={captadosPorObjeto.map((item) => ({ label: item.objeto, quantidade: item.quantidade, percentual: item.percentual }))}
                  categoryLabel="Classificação do objeto"
                  quantityLabel="Editais"
                  emptyTitle="Nenhuma classificação para resumir nesta seção."
                  emptyDescription="O resumo por classificação aparecerá aqui quando houver dados no gráfico superior."
                />

                <div className="rounded-2xl border border-slate-200 p-4 report-keep-together">
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-slate-900">Aguardando aprovação por classificação do objeto</div>
                    <div className="text-xs text-slate-500">A contagem considera apenas os editais em andamento no período. O gráfico foi mantido em largura integral para facilitar a leitura no PDF.</div>
                  </div>
                  {aprovacaoPorObjeto.length > 0 ? (
                    <div className="h-[360px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={aprovacaoPorObjeto} margin={{ top: 12, right: 16, left: 0, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="objeto" angle={-16} textAnchor="end" interval={0} height={96} tick={CHART_AXIS_TICK} stroke="#64748b" />
                          <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} stroke="#64748b" />
                          <Tooltip formatter={(value: number) => [`${formatNumber(Number(value))} editais`, "Quantidade"]} labelFormatter={(label) => `Classificação do objeto: ${label}`} />
                          <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                            {aprovacaoPorObjeto.map((item, index) => (
                              <Cell key={item.objeto} fill={yearChartColors[index % yearChartColors.length]} />
                            ))}
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState title="Nenhum edital em andamento no período selecionado." description="Quando houver editais em andamento, a distribuição por classificação do objeto aparecerá neste gráfico." />
                  )}
                </div>

                <DistributionSummaryTable
                  title="Resumo das quantidades em andamento por classificação"
                  subtitle={`Total de ${formatNumber(editaisEmAndamento.length)} edital(is) em andamento no período, com valor estimado agregado de ${formatCurrency(valorEstimadoEmAndamento)}.`}
                  rows={aprovacaoPorObjeto.map((item) => ({ label: item.objeto, quantidade: item.quantidade, percentual: item.percentual }))}
                  categoryLabel="Classificação do objeto"
                  quantityLabel="Editais"
                  emptyTitle="Nenhum edital em andamento para resumir."
                  emptyDescription="O resumo por classificação dos editais em andamento aparecerá aqui quando houver dados no gráfico superior."
                />

                <div className="rounded-2xl border border-slate-200 p-4 report-keep-together">
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-slate-900">NO-GO por motivo</div>
                    <div className="text-xs text-slate-500">Barras por quantidade e linha com percentual acumulado dos motivos informados na coluna de justificativas.</div>
                  </div>
                  {noGoByReason.length > 0 ? (
                    <div className="h-[380px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={noGoByReason} margin={{ top: 12, right: 16, left: 0, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="motivo" angle={-16} textAnchor="end" interval={0} height={96} tick={CHART_AXIS_TICK} stroke="#64748b" />
                          <YAxis yAxisId="left" allowDecimals={false} tick={CHART_AXIS_TICK} stroke="#64748b" />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${Number(value).toFixed(0)}%`} tick={CHART_AXIS_TICK} stroke="#64748b" width={60} />
                          <Tooltip
                            formatter={(value: number, name: string) => {
                              if (name === "percentualAcumulado") return [formatPercent(Number(value)), "% acumulado"];
                              return [`${formatNumber(Number(value))} editais`, "Quantidade"];
                            }}
                            labelFormatter={(label) => `Motivo: ${label}`}
                          />
                          <Bar yAxisId="left" dataKey="quantidade" fill="hsl(214,62%,26%)" radius={[6, 6, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="percentualAcumulado" stroke="hsl(214,84%,56%)" strokeWidth={3} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState title="Nenhum edital em NO-GO no período selecionado." description="Os motivos informados na base aparecerão aqui quando houver registros em NO-GO no recorte atual." />
                  )}
                </div>

                <DistributionSummaryTable
                  title="Resumo das quantidades por motivo de NO-GO"
                  subtitle="Contagem consolidada dos motivos registrados, sem listar nominalmente os editais."
                  rows={noGoByReason.map((item) => ({ label: item.motivo, quantidade: item.quantidade, percentual: noGoItems.length > 0 ? (item.quantidade / noGoItems.length) * 100 : 0, percentualAcumulado: item.percentualAcumulado }))}
                  categoryLabel="Motivo"
                  quantityLabel="Editais"
                  emptyTitle="Nenhum motivo de NO-GO para resumir."
                  emptyDescription="O resumo por motivo aparecerá aqui quando houver dados no gráfico superior."
                />
              </div>
            </div>
          )}

          {sections.financeiro && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 report-page-break">
              <ReportHeader title="Financeiro" subtitle="Indicadores financeiros e principais competidores no recorte filtrado, com gráfico em largura integral e tabela logo abaixo." showPageBreak={false} />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 report-print-kpi-grid">
                <MetricCard
                  label="Valor estimado total captado"
                  details={[
                    { label: "Valor total", value: formatCurrency(filtered.reduce((sum, item) => sum + (item.valorEstimado ?? 0), 0)) },
                    { label: "Em milhões", value: formatMillionsSummary(filtered.reduce((sum, item) => sum + (item.valorEstimado ?? 0), 0)), valueClassName: "text-slate-500" },
                  ]}
                />
                <MetricCard
                  label="Valor ganho"
                  tone="success"
                  details={[
                    { label: "Valor total", value: formatCurrency(vencidos.reduce((sum, item) => sum + (item.valorFechado ?? item.valorEstimado ?? 0), 0)), valueClassName: "text-emerald-600" },
                    { label: "Em milhões", value: formatMillionsSummary(vencidos.reduce((sum, item) => sum + (item.valorFechado ?? item.valorEstimado ?? 0), 0)), valueClassName: "text-slate-500" },
                  ]}
                />
                <MetricCard
                  label="Valor não ganho"
                  tone="danger"
                  details={[
                    { label: "Estimado", value: formatCurrency(perdidos.reduce((sum, item) => sum + (item.valorEstimado ?? 0), 0)), valueClassName: "text-rose-600" },
                    { label: "Estimado em milhões", value: formatMillionsSummary(perdidos.reduce((sum, item) => sum + (item.valorEstimado ?? 0), 0)), valueClassName: "text-slate-500" },
                    { label: "Orçado pela concorrência", value: formatCurrency(perdidos.reduce((sum, item) => sum + (item.valorFechado ?? item.valorEstimado ?? 0), 0)), valueClassName: "text-amber-600" },
                    { label: "Orçado pela concorrência em milhões", value: formatMillionsSummary(perdidos.reduce((sum, item) => sum + (item.valorFechado ?? item.valorEstimado ?? 0), 0)), valueClassName: "text-slate-500" },
                  ]}
                />
                <MetricCard label="Nosso desconto médio" value={formatPercent(descontoMedioProprio)} />
              </div>

              <div className="mt-6 space-y-6 report-print-stack">
                <div className="rounded-2xl border border-slate-200 p-4 report-keep-together">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Principais competidores</div>
                  {competidores.length > 0 ? (
                    <div className="h-[380px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={competidores} margin={{ top: 12, right: 16, left: 0, bottom: 72 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" angle={-16} textAnchor="end" interval={0} height={90} tick={CHART_AXIS_TICK} stroke="#64748b" />
                          <YAxis yAxisId="left" allowDecimals={false} tick={CHART_AXIS_TICK} stroke="#64748b" />
                          <YAxis yAxisId="right" orientation="right" width={64} tick={CHART_AXIS_TICK} stroke="#64748b" />
                          <Tooltip formatter={(value: number, name: string) => name === "descontoMedio" ? [formatPercent(value), "Desconto médio"] : [`${formatNumber(value)} editais`, "Editais perdidos"]} />
                          <Bar yAxisId="left" dataKey="vitorias" fill="hsl(214,62%,26%)" radius={[6, 6, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="descontoMedio" stroke="hsl(214,84%,56%)" strokeWidth={3} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState title="Nenhum competidor encontrado no período selecionado." description="Os principais competidores serão exibidos aqui quando houver editais perdidos com empresa vencedora identificada." />
                  )}
                </div>

                <DistributionSummaryTable
                  title="Resumo das quantidades por competidor"
                  subtitle="Quantidade de editais perdidos para cada competidor listado no gráfico principal."
                  rows={competidores.map((item) => ({
                    label: item.name,
                    quantidade: item.vitorias,
                    percentual: perdidos.length > 0 ? (item.vitorias / perdidos.length) * 100 : 0,
                  }))}
                  categoryLabel="Competidor"
                  quantityLabel="Editais perdidos"
                  emptyTitle="Nenhum competidor para resumir."
                  emptyDescription="O resumo consolidado aparecerá aqui quando houver dados no gráfico de competidores."
                />
              </div>
            </div>
          )}

          {sections.regional && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 report-page-break report-keep-together">
              <ReportHeader title="Análise Regional" subtitle="Consolidação por UF com captados, vencidos, perdidos e principais objetos vencidos." showPageBreak={false} />
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UF</TableHead>
                      <TableHead className="text-right">Captados</TableHead>
                      <TableHead className="text-right">Vencidos</TableHead>
                      <TableHead className="text-right">Perdidos</TableHead>
                      <TableHead>Principais objetos vencidos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regionalData.map((item) => (
                      <TableRow key={item.uf}>
                        <TableCell className="font-semibold">{item.uf}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.captados)}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.vencidos)}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.perdidos)}</TableCell>
                        <TableCell>{item.objetos.length > 0 ? item.objetos.join(" • ") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {sections.base && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 report-page-break report-keep-together">
              <ReportHeader title="Base Detalhada" subtitle="Registros filtrados da base ativa para conferência no relatório final." showPageBreak={false} />
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Órgão</TableHead>
                      <TableHead>UF</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Objeto</TableHead>
                      <TableHead>Justificativas</TableHead>
                      <TableHead className="text-right">Valor Estimado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {baseRows.map((item) => (
                      <TableRow key={`${item.id}-${item.numeroProcesso}-${item.orgao}`}>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>{item.orgao}</TableCell>
                        <TableCell>{item.uf || "—"}</TableCell>
                        <TableCell>{faseLabels[item.fase as FaseEdital] ?? item.fase}</TableCell>
                        <TableCell>{getObjetoLabel(item.objeto)}</TableCell>
                        <TableCell>{getJustificativa(item.justificativas)}</TableCell>
                        <TableCell className="text-right">{item.valorEstimado !== null ? formatCurrency(item.valorEstimado) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
