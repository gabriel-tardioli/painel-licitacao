import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/hooks/useFilters";
import { getKPIs, formatCurrency, formatNumber, faseLabels, FaseEdital, type Edital } from "@/data/mockData";
import { FileText, Users, Trophy, Target, TrendingUp, XCircle, BarChart3, ListFilter, MessageCircle } from "lucide-react";
import { buildMonthlyPerformanceChart } from "@/lib/monthlyPerformanceChart";
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
} from "recharts";

const COLORS = [
  "hsl(214,62%,26%)",
  "hsl(42,92%,55%)",
  "hsl(152,60%,40%)",
  "hsl(0,72%,51%)",
  "hsl(215,12%,50%)",
  "hsl(214,55%,38%)",
  "hsl(38,92%,50%)",
];

const statusOrder: FaseEdital[] = [
  "NO-GO",
  "Perdeu",
  "Venceu",
  "Em Andamento",
  "Aguardando Resultado",
  "Revogado",
  "Suspenso",
];

type AndamentoColorStatus = "amarelo" | "verde";

type AndamentoSelections = Record<string, AndamentoColorStatus>;

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMillionsSummary(value: number) {
  const millions = value / 1_000_000;
  return `${millions.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} Milhões`;
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function getItemKey(item: Edital) {
  return `${item.id ?? "sem-id"}-${item.numeroProcesso ?? item.orgao ?? "sem-orgao"}-${item.abertura ?? "sem-data"}`;
}

function getAndamentoMarker(status: AndamentoColorStatus) {
  return status === "verde" ? "VERDE" : "AMARELO";
}

function buildWhatsAppMessage(args: {
  editaisEmAndamento: Edital[];
  editaisAguardandoResultado: Edital[];
  andamentoSelections: AndamentoSelections;
}) {
  const { editaisEmAndamento, editaisAguardandoResultado, andamentoSelections } = args;

  const sections: string[] = ["Atualização de licitações", ""];

  if (editaisEmAndamento.length > 0) {
    sections.push("----------------------- *EDITAIS EM ANDAMENTO* AMARELO/VERDE -------------------", "");

    editaisEmAndamento.forEach((item, index) => {
      const itemKey = getItemKey(item);
      const marker = getAndamentoMarker(andamentoSelections[itemKey] ?? "amarelo");

      sections.push(
        `${marker} ${index + 1}. Edital: ${item.orgao || "-"}`,
        `   Objeto: ${item.objeto || "-"}`,
        `   Abertura: ${formatDateBR(item.abertura)}`,
        `   Valor Estimado: ${item.valorEstimado !== null ? formatCurrency(item.valorEstimado ?? 0) : "-"}`,
        `   Nossa proposta: ${item.propostaPropria !== null ? formatCurrency(item.propostaPropria ?? 0) : "-"}`,
        ""
      );
    });

    sections.push(
      "*Aguardando aprovação* AMARELO",
      "*Participação aprovada* VERDE",
      ""
    );
  }

  if (editaisAguardandoResultado.length > 0) {
    sections.push("----------------------- *EDITAIS AGUARDANDO RESULTADO* AZUL -------------------", "");

    editaisAguardandoResultado.forEach((item, index) => {
      sections.push(
        `AZUL ${index + 1}. Edital: ${item.orgao || "-"}`,
        `   Objeto: ${item.objeto || "-"}`,
        `   Abertura: ${formatDateBR(item.abertura)}`,
        `   Valor Estimado: ${item.valorEstimado !== null ? formatCurrency(item.valorEstimado ?? 0) : "-"}`,
        `   Nossa proposta: ${item.propostaPropria !== null ? formatCurrency(item.propostaPropria ?? 0) : "-"}`,
        ""
      );
    });
  }

  return sections.join("\n").trim();
}

export default function VisaoExecutiva() {
  const { filters, onFilterChange, filtered } = useFilters();
  const [statusAtivo, setStatusAtivo] = useState<FaseEdital | null>(null);
  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const kpis = getKPIs(filtered);

  const monthlyChart = useMemo(
    () =>
      buildMonthlyPerformanceChart({
        filtered,
        selectedYear: filters.ano,
        isWinner: (edital) => edital.participou === "VENCEU",
      }),
    [filtered, filters.ano],
  );

  const statusData = useMemo(() => {
    const base = statusOrder
      .map((fase) => ({
        fase,
        nome: faseLabels[fase],
        quantidade: filtered.filter((edital) => edital.fase === fase).length,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);

    let acumulado = 0;

    return base.map((item) => {
      acumulado += item.quantidade;

      return {
        ...item,
        percentual: kpis.captados > 0 ? (item.quantidade / kpis.captados) * 100 : 0,
        percentualAcumulado: kpis.captados > 0 ? (acumulado / kpis.captados) * 100 : 0,
      };
    });
  }, [filtered, kpis.captados]);

  const statusSelecionado = statusAtivo ? statusData.find((item) => item.fase === statusAtivo) ?? null : null;

  const editaisSelecionados = useMemo(() => {
    if (!statusAtivo) return [];

    return filtered
      .filter((item) => item.fase === statusAtivo)
      .sort((a, b) => (a.abertura ?? "").localeCompare(b.abertura ?? ""))
      .reverse();
  }, [filtered, statusAtivo]);

  const editaisEmAndamento = useMemo(
    () =>
      filtered
        .filter((item) => item.fase === "Em Andamento" || item.participou === "EM ANDAMENTO")
        .sort((a, b) => (a.abertura ?? "").localeCompare(b.abertura ?? ""))
        .reverse(),
    [filtered]
  );

  const editaisAguardandoResultado = useMemo(
    () =>
      filtered
        .filter((item) => item.fase === "Aguardando Resultado" || item.participou === "AGUARDANDO RESULTADO")
        .sort((a, b) => (a.abertura ?? "").localeCompare(b.abertura ?? ""))
        .reverse(),
    [filtered]
  );

  const andamentoSelections = useMemo<AndamentoSelections>(() => {
    return editaisEmAndamento.reduce<AndamentoSelections>((acc, item) => {
      acc[getItemKey(item)] = "amarelo";
      return acc;
    }, {});
  }, [editaisEmAndamento]);

  const [andamentoColorSelections, setAndamentoColorSelections] = useState<AndamentoSelections>({});

  const mergedAndamentoSelections = useMemo(() => {
    return { ...andamentoSelections, ...andamentoColorSelections };
  }, [andamentoSelections, andamentoColorSelections]);

  const hasWhatsAppItems = editaisEmAndamento.length > 0 || editaisAguardandoResultado.length > 0;

  function openWhatsAppWithMessage() {
    const message = buildWhatsAppMessage({
      editaisEmAndamento,
      editaisAguardandoResultado,
      andamentoSelections: mergedAndamentoSelections,
    });

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleGenerateWhatsAppClick() {
    if (!hasWhatsAppItems) return;

    if (editaisEmAndamento.length === 0) {
      openWhatsAppWithMessage();
      return;
    }

    setAndamentoColorSelections((current) => ({ ...andamentoSelections, ...current }));
    setWhatsAppDialogOpen(true);
  }

  function handleConfirmWhatsApp() {
    setWhatsAppDialogOpen(false);
    openWhatsAppWithMessage();
  }

  return (
    <DashboardLayout title="Visão Executiva">
      <div className="space-y-6 animate-fade-in">
        <FilterBar filters={filters} onFilterChange={onFilterChange} />

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KPICard compact label="Editais Captados" value={formatNumber(kpis.captados)} icon={FileText} variant="primary" />
          <KPICard compact label="Participados" value={formatNumber(kpis.participados)} icon={Users} variant="default" />
          <KPICard compact label="Vencidos" value={formatNumber(kpis.vencidos)} icon={Trophy} variant="success" />
          <KPICard compact label="Taxa de Vitória" value={`${kpis.taxaVitoria.toFixed(1)}%`} icon={Target} variant="accent" />
          <KPICard
            compact
            label="Valor Estimado Total Captado"
            icon={BarChart3}
            variant="default"
            details={[
              { label: "Valor total", value: formatCurrency(kpis.valorEstimadoTotal) },
              { label: "Em milhões", value: formatMillionsSummary(kpis.valorEstimadoTotal), valueClassName: "text-muted-foreground" },
            ]}
          />
          <KPICard
            compact
            label="Valor Ganho"
            icon={TrendingUp}
            variant="success"
            details={[
              { label: "Valor total", value: formatCurrency(kpis.valorGanho), valueClassName: "text-success" },
              { label: "Em milhões", value: formatMillionsSummary(kpis.valorGanho), valueClassName: "text-muted-foreground" },
            ]}
          />
          <KPICard
            compact
            label="Valor Não Ganho"
            icon={XCircle}
            variant="warning"
            details={[
              { label: "Estimado", value: formatCurrency(kpis.valorPerdidoCaptado), valueClassName: "text-destructive" },
              { label: "Estimado em milhões", value: formatMillionsSummary(kpis.valorPerdidoCaptado), valueClassName: "text-muted-foreground" },
              { label: "Orçado pela concorrência", value: formatCurrency(kpis.valorPerdidoFechado), valueClassName: "text-destructive" },
              { label: "Orçado pela concorrência em milhões", value: formatMillionsSummary(kpis.valorPerdidoFechado), valueClassName: "text-muted-foreground" },
            ]}
          />
          <KPICard compact label="Taxa Participação" value={`${kpis.taxaParticipacao.toFixed(1)}%`} icon={Target} variant="primary" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" onClick={handleGenerateWhatsAppClick} disabled={!hasWhatsAppItems} className="w-full sm:w-auto">
            <MessageCircle className="mr-2 h-4 w-4" /> Gerar mensagem para WhatsApp
          </Button>
        </div>

        <div className="chart-container">
          <div className="mb-4 flex flex-col gap-1">
            <h3 className="section-title">Captação e Valor Ganho por Mês</h3>
            <p className="text-sm text-muted-foreground">
              Relação entre o valor ganho com a quantidade de editais captados.
              {monthlyChart.hasYearSegregation ? " No filtro de ano em 'Todos', as barras e linhas passam a ser exibidas separadamente por ano." : ""}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={monthlyChart.chartHeight}>
            <ComposedChart data={monthlyChart.data} margin={monthlyChart.chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(215,12%,50%)" />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215,12%,50%)" />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatCompactCurrency(Number(value))}
                tick={{ fontSize: 12 }}
                stroke="hsl(215,12%,50%)"
                width={monthlyChart.rightAxisWidth}
              />
              <Tooltip
                formatter={(value: number | string | null, name: string) => {
                  if (value === null || value === undefined) return ["-", name];
                  if (name.startsWith("Valor ganho")) {
                    return [formatCurrencyDetailed(Number(value)), name];
                  }
                  if (name.startsWith("Editais captados")) {
                    return [`${formatNumber(Number(value))} editais`, name];
                  }
                  return [value, name];
                }}
              />
              {monthlyChart.hasYearSegregation && (
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
              )}
              {monthlyChart.hasYearSegregation
                ? monthlyChart.series.map((item) => (
                    <Bar
                      key={item.captadosKey}
                      yAxisId="left"
                      dataKey={item.captadosKey}
                      fill={item.color}
                      fillOpacity={0.28}
                      stroke={item.color}
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]}
                      name={`Editais captados ${item.year}`}
                    />
                  ))
                : (
                    <Bar yAxisId="left" dataKey="captados" fill="hsl(214,62%,26%)" radius={[6, 6, 0, 0]} name="Editais captados" />
                  )}
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
                      activeDot={{ r: 5 }}
                      name={`Valor ganho ${item.year}`}
                    />
                  ))
                : (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="valorGanho"
                      stroke="hsl(152,60%,40%)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Valor ganho"
                    />
                  )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.45fr,1.05fr]">
          <div className="chart-container">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="section-title">Status dos Editais no Período</h3>
                <p className="text-sm text-muted-foreground">
                  Barras por contagem e linha com o percentual acumulado sobre o total de editais captados no período.
                </p>
              </div>
              {statusSelecionado ? (
                <button
                  type="button"
                  onClick={() => setStatusAtivo(null)}
                  className="self-start rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Limpar destaque
                </button>
              ) : null}
            </div>

            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={statusData} margin={{ top: 12, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} angle={-12} textAnchor="end" interval={0} height={70} stroke="hsl(215,12%,50%)" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="hsl(215,12%,50%)" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} stroke="hsl(215,12%,50%)" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "percentualAcumulado") return [`${value.toFixed(1)}%`, "% acumulado"];
                    if (name === "quantidade") return [`${formatNumber(value)} editais`, "Editais"];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Fase: ${label}`}
                />
                <Bar dataKey="quantidade" yAxisId="left" radius={[6, 6, 0, 0]} name="quantidade">
                  {statusData.map((entry, index) => {
                    const isActive = !statusAtivo || statusAtivo === entry.fase;
                    return (
                      <Cell
                        key={`status-${entry.fase}`}
                        cursor="pointer"
                        fill={isActive ? COLORS[index % COLORS.length] : "hsl(214,20%,85%)"}
                        onClick={() => setStatusAtivo((current) => (current === entry.fase ? null : entry.fase))}
                      />
                    );
                  })}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="percentualAcumulado"
                  stroke="hsl(214,62%,26%)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="percentualAcumulado"
                />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {statusData.map((item, index) => {
                const isActive = statusAtivo === item.fase;
                return (
                  <button
                    key={item.fase}
                    type="button"
                    onClick={() => setStatusAtivo((current) => (current === item.fase ? null : item.fase))}
                    className={`rounded-xl border px-4 py-3 text-left transition-all ${isActive ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:bg-muted/50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <span className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm font-medium leading-5 break-words">{item.nome}</span>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">{formatNumber(item.quantidade)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.percentual.toFixed(1)}% do total | acumulado: {item.percentualAcumulado.toFixed(1)}%
                    </p>
                  </button>
                );
              })}
            </div>

            {statusSelecionado ? (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                <span className="font-semibold">Destaque:</span> {statusSelecionado.nome} representa {formatNumber(statusSelecionado.quantidade)} editais,
                equivalentes a {statusSelecionado.percentual.toFixed(1)}% dos editais captados no período selecionado.
              </div>
            ) : null}
          </div>

          <div className="chart-container">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="section-title">Editais por Status Selecionado</h3>
                <p className="text-sm text-muted-foreground">
                  Clique em uma barra do gráfico ao lado para listar os editais daquele status no período filtrado.
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <ListFilter className="h-4 w-4" />
              </div>
            </div>

            {statusSelecionado ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                  <span className="font-semibold">{statusSelecionado.nome}:</span> {formatNumber(statusSelecionado.quantidade)} editais no período selecionado.
                </div>

                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {editaisSelecionados.map((item) => (
                    <div key={`${item.id}-${item.fase}`} className="rounded-xl border bg-background/80 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {item.uf || "-"}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">Abertura: {formatDateBR(item.abertura)}</span>
                          </div>
                          <h4 className="mt-2 text-sm font-semibold text-foreground leading-5">{item.orgao}</h4>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Valor estimado</div>
                          <div className="mt-1 font-semibold text-foreground">{formatCurrency(item.valorEstimado ?? 0)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nossa proposta</div>
                          <div className="mt-1 font-semibold text-foreground">{item.propostaPropria !== null ? formatCurrency(item.propostaPropria) : "-"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Nenhum status selecionado.</p>
                  <p className="text-sm text-muted-foreground">
                    Selecione uma barra no gráfico de status para ver a lista de editais com UF, órgão, data de abertura, valor estimado e nossa proposta.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Dialog open={whatsAppDialogOpen} onOpenChange={setWhatsAppDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Classificar editais em andamento</DialogTitle>
              <DialogDescription>
                Selecione quais editais estão aguardando aprovação e quais já estão com participação aprovada. Essa escolha define a cor na mensagem do WhatsApp.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>Aguardando aprovação</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Participação aprovada</span>
              </div>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {editaisEmAndamento.map((item, index) => {
                const itemKey = getItemKey(item);
                const selectedValue = mergedAndamentoSelections[itemKey] ?? "amarelo";

                return (
                  <div key={itemKey} className="rounded-xl border bg-background/70 p-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">
                        {index + 1}. {item.orgao || "Edital sem nome"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.uf || "-"} • {formatDateBR(item.abertura)} • {item.objeto || "Objeto não informado"}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr,220px] sm:items-end">
                      <div className="text-sm text-muted-foreground">
                        Valor estimado: <span className="font-semibold text-foreground">{item.valorEstimado !== null ? formatCurrency(item.valorEstimado ?? 0) : "-"}</span>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`status-andamento-${index}`}>Situação para a mensagem</Label>
                        <Select
                          value={selectedValue}
                          onValueChange={(value: AndamentoColorStatus) => {
                            setAndamentoColorSelections((current) => ({
                              ...current,
                              [itemKey]: value,
                            }));
                          }}
                        >
                          <SelectTrigger id={`status-andamento-${index}`}>
                            <SelectValue placeholder="Selecione a situação" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amarelo">
                              <div className="flex items-center gap-2">
                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                                <span>Aguardando aprovação</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="verde">
                              <div className="flex items-center gap-2">
                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                <span>Participação aprovada</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setWhatsAppDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmWhatsApp}>
                <MessageCircle className="mr-2 h-4 w-4" /> Gerar mensagem no WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
