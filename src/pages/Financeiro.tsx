import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { useFilters } from "@/hooks/useFilters";
import { formatCurrency, formatNumber, Edital } from "@/data/mockData";
import { DollarSign, TrendingUp, TrendingDown, Percent, Building2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LabelList,
} from "recharts";

const COMPETITOR_COLORS = [
  "hsl(214,62%,26%)",
  "hsl(152,60%,40%)",
  "hsl(42,92%,55%)",
  "hsl(0,72%,51%)",
  "hsl(262,83%,58%)",
  "hsl(190,80%,40%)",
  "hsl(338,78%,48%)",
  "hsl(24,95%,53%)",
  "hsl(221,83%,53%)",
  "hsl(142,71%,45%)",
];

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
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

function getDescontoPercentual(edital: Edital) {
  const estimado = edital.valorEstimado ?? 0;
  const fechado = edital.valorFechado ?? 0;
  if (estimado <= 0 || fechado <= 0) return 0;
  return (1 - fechado / estimado) * 100;
}

function getDescontoProprioPercentual(edital: Edital) {
  const estimado = edital.valorEstimado ?? 0;
  const propostaPropria = edital.propostaPropria ?? (edital.participou === "VENCEU" ? edital.valorFechado : null) ?? 0;
  if (estimado <= 0 || propostaPropria <= 0) return null;
  return (1 - propostaPropria / estimado) * 100;
}

function getDescontoMedio(editais: Edital[]) {
  const descontosValidos = editais
    .map((edital) => getDescontoProprioPercentual(edital))
    .filter((value): value is number => value !== null);

  if (!descontosValidos.length) return 0;
  return descontosValidos.reduce((sum, value) => sum + value, 0) / descontosValidos.length;
}

function DescontoMedioLabel(props: {
  x?: number;
  y?: number;
  value?: number | string;
}) {
  if (typeof props.x !== "number" || typeof props.y !== "number" || props.value === undefined || props.value === null) {
    return null;
  }

  return (
    <text
      x={props.x}
      y={props.y - 12}
      fill="hsl(214,84%,56%)"
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
    >
      {formatPercent(Number(props.value))}
    </text>
  );
}

export default function Financeiro() {
  const { filters, onFilterChange, filtered } = useFilters();
  const [competidorAtivo, setCompetidorAtivo] = useState<string | null>(null);

  const vencidos = filtered.filter((e) => e.participou === "VENCEU");
  const perdidos = filtered.filter((e) => e.participou === "PERDEU");
  const participados = filtered.filter((e) => ["VENCEU", "PERDEU", "AGUARDANDO RESULTADO", "EM ANDAMENTO"].includes(e.participou));
  const valorGanho = vencidos.reduce((s, e) => s + (e.valorFechado ?? e.valorEstimado ?? 0), 0);
  const valorPerdidoEstimado = perdidos.reduce((s, e) => s + (e.valorEstimado ?? 0), 0);
  const valorPerdidoFechado = perdidos.reduce((s, e) => s + (e.valorFechado ?? 0), 0);
  const valorEstimado = filtered.reduce((s, e) => s + (e.valorEstimado ?? 0), 0);
  const descontoMedioVencidos = getDescontoMedio(vencidos);
  const descontoMedioParticipados = getDescontoMedio(participados);

  const competidoresDetalhados = useMemo(() => {
    const agrupado = perdidos
      .filter((e) => e.empresaVencedora && e.empresaVencedora !== "Nossa OSS")
      .reduce<
        Record<
          string,
          {
            vitorias: number;
            valorTotal: number;
            editais: Edital[];
          }
        >
      >((acc, e) => {
        const nome = e.empresaVencedora!;
        if (!acc[nome]) {
          acc[nome] = { vitorias: 0, valorTotal: 0, editais: [] };
        }
        acc[nome].vitorias += 1;
        acc[nome].valorTotal += e.valorFechado ?? e.valorEstimado ?? 0;
        acc[nome].editais.push(e);
        return acc;
      }, {});

    return Object.entries(agrupado)
      .map(([name, data], index) => {
        const descontosConcorrencia = data.editais
          .map((edital) => getDescontoPercentual(edital))
          .filter((value) => Number.isFinite(value));
        const descontosProprios = data.editais
          .map((edital) => getDescontoProprioPercentual(edital))
          .filter((value): value is number => value !== null && Number.isFinite(value));

        return {
          name,
          color: COMPETITOR_COLORS[index % COMPETITOR_COLORS.length],
          vitorias: data.vitorias,
          valorTotal: data.valorTotal,
          descontoMedio:
            descontosConcorrencia.length > 0
              ? descontosConcorrencia.reduce((sum, value) => sum + value, 0) / descontosConcorrencia.length
              : 0,
          descontoMedioProprio:
            descontosProprios.length > 0
              ? descontosProprios.reduce((sum, value) => sum + value, 0) / descontosProprios.length
              : null,
          editais: data.editais.sort((a, b) => (b.valorFechado ?? 0) - (a.valorFechado ?? 0)),
        };
      })
      .sort((a, b) => b.vitorias - a.vitorias || b.valorTotal - a.valorTotal)
      .slice(0, 10);
  }, [perdidos]);

  const competidorSelecionado = useMemo(() => {
    if (!competidoresDetalhados.length) return null;
    const nomeSelecionado = competidorAtivo ?? competidoresDetalhados[0].name;
    return competidoresDetalhados.find((item) => item.name === nomeSelecionado) ?? competidoresDetalhados[0];
  }, [competidorAtivo, competidoresDetalhados]);

  return (
    <DashboardLayout title="Financeiro e Competitividade">
      <div className="space-y-6 animate-fade-in">
        <FilterBar filters={filters} onFilterChange={onFilterChange} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            label="Valor Estimado Total Captado"
            icon={DollarSign}
            variant="default"
            details={[
              {
                label: "Valor total",
                value: formatCurrency(valorEstimado),
              },
              {
                label: "Em milhões",
                value: formatMillionsSummary(valorEstimado),
                valueClassName: "text-muted-foreground",
              },
            ]}
          />
          <KPICard
            label="Valor Ganho"
            icon={TrendingUp}
            variant="success"
            details={[
              {
                label: "Valor total",
                value: formatCurrency(valorGanho),
                valueClassName: "text-success",
              },
              {
                label: "Em milhões",
                value: formatMillionsSummary(valorGanho),
                valueClassName: "text-muted-foreground",
              },
            ]}
          />
          <KPICard
            label="Valor Perdido (Deixou de Ganhar)"
            icon={TrendingDown}
            variant="warning"
            details={[
              {
                label: "Estimado",
                value: formatCurrency(valorPerdidoEstimado),
                valueClassName: "text-rose-600",
              },
              {
                label: "Estimado em milhões",
                value: formatMillionsSummary(valorPerdidoEstimado),
                valueClassName: "text-muted-foreground",
              },
              {
                label: "Fechado",
                value: formatCurrency(valorPerdidoFechado),
                valueClassName: "text-amber-600",
              },
              {
                label: "Fechado em milhões",
                value: formatMillionsSummary(valorPerdidoFechado),
                valueClassName: "text-muted-foreground",
              },
            ]}
          />
          <KPICard
            label="Nosso Desconto Médio"
            icon={Percent}
            variant="primary"
            details={[
              {
                label: "Nos vencidos",
                value: formatPercent(descontoMedioVencidos),
              },
              {
                label: "Nos participados",
                value: formatPercent(descontoMedioParticipados),
                valueClassName: "text-primary",
              },
            ]}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr,1fr]">
          <div className="chart-container">
            <div className="mb-4 flex flex-col gap-1">
              <h3 className="section-title">Principais Competidores</h3>
              <p className="text-sm text-muted-foreground">
                Clique em uma barra para ver os editais perdidos para a OSS competidora, com valor fechado e desconto em relação ao valor máximo estimado.
              </p>
            </div>

            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={competidoresDetalhados} margin={{ top: 12, right: 18, left: 0, bottom: 72 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={86}
                  tick={{ fontSize: 12 }}
                  stroke="hsl(215,12%,50%)"
                />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215,12%,50%)" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                  tick={{ fontSize: 12 }}
                  stroke="hsl(215,12%,50%)"
                  width={58}
                />
                <Tooltip
                  cursor={{ fill: "hsl(214,20%,96%)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as (typeof competidoresDetalhados)[number];
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-md">
                        <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                        <div className="mt-2 text-sm text-slate-600">
                          Editais perdidos: <span className="font-medium text-slate-900">{formatNumber(item.vitorias)}</span>
                        </div>
                        <div className="text-sm text-slate-600">
                          Valor fechado total: <span className="font-medium text-slate-900">{formatCurrency(item.valorTotal)}</span>
                        </div>
                        <div className="text-sm text-slate-600">
                          Desconto médio da concorrência: <span className="font-medium text-slate-900">{formatPercent(item.descontoMedio)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="vitorias" yAxisId="left" radius={[6, 6, 0, 0]} onClick={(data) => setCompetidorAtivo(data?.name ?? null)}>
                  {competidoresDetalhados.map((entry) => {
                    const isActive = !competidorSelecionado || competidorSelecionado.name === entry.name;
                    return (
                      <Cell
                        key={entry.name}
                        fill={isActive ? entry.color : "hsl(214,20%,85%)"}
                        cursor="pointer"
                        onClick={() => setCompetidorAtivo(entry.name)}
                      />
                    );
                  })}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="descontoMedio"
                  stroke="hsl(214,84%,56%)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#ffffff", stroke: "hsl(214,84%,56%)", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#ffffff", stroke: "hsl(214,84%,56%)", strokeWidth: 2 }}
                  name="Desconto médio"
                >
                  <LabelList dataKey="descontoMedio" content={<DescontoMedioLabel />} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {competidoresDetalhados.map((item) => {
                const isActive = competidorSelecionado?.name === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setCompetidorAtivo(item.name)}
                    className={`rounded-xl border px-4 py-3 text-left transition-all ${isActive ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:bg-muted/50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">{formatNumber(item.vitorias)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Valor fechado total: {formatCurrency(item.valorTotal)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Desconto médio da concorrência: {formatPercent(item.descontoMedio)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="chart-container">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="section-title">Editais Perdidos por Competidor</h3>
                <p className="text-sm text-muted-foreground">
                  Lista interativa dos editais vencidos pelo competidor selecionado.
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
            </div>

            {competidorSelecionado ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                  <span className="font-semibold">{competidorSelecionado.name}:</span> {formatNumber(competidorSelecionado.vitorias)} editais perdidos e {formatCurrency(competidorSelecionado.valorTotal)} em valor fechado no período selecionado. {competidorSelecionado.descontoMedioProprio !== null ? `Nosso desconto médio nesse grupo: ${formatPercent(competidorSelecionado.descontoMedioProprio)}.` : ""}
                </div>

                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {competidorSelecionado.editais.map((edital) => {
                    const desconto = getDescontoPercentual(edital);
                    return (
                      <div key={`${competidorSelecionado.name}-${edital.id}-${edital.numeroProcesso}`} className="rounded-xl border bg-background/80 px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {edital.uf || "-"}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground">Abertura: {formatDateBR(edital.abertura)}</span>
                            </div>
                            <h4 className="mt-2 text-sm font-semibold leading-5 text-foreground">{edital.orgao}</h4>
                            {edital.numeroProcesso ? <p className="mt-1 text-xs text-muted-foreground">Processo: {edital.numeroProcesso}</p> : null}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Valor fechado pela concorrência</div>
                            <div className="mt-1 font-semibold text-foreground">{edital.valorFechado !== null ? formatCurrency(edital.valorFechado) : "-"}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nossa proposta</div>
                            <div className="mt-1 font-semibold text-foreground">{edital.propostaPropria !== null ? formatCurrency(edital.propostaPropria) : edital.participou === "VENCEU" && edital.valorFechado !== null ? formatCurrency(edital.valorFechado) : "-"}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Valor máximo estimado</div>
                            <div className="mt-1 font-semibold text-foreground">{edital.valorEstimado !== null ? formatCurrency(edital.valorEstimado) : "-"}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Desconto da concorrência</div>
                            <div className={`mt-1 font-semibold ${desconto >= 0 ? "text-success" : "text-destructive"}`}>{formatPercent(desconto)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nosso desconto</div>
                            <div className={`mt-1 font-semibold ${(getDescontoProprioPercentual(edital) ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                              {getDescontoProprioPercentual(edital) !== null ? formatPercent(getDescontoProprioPercentual(edital) ?? 0) : "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Nenhum competidor selecionado.</p>
                  <p className="text-sm text-muted-foreground">Clique em uma barra do gráfico para listar os editais em que perdemos para aquela OSS competidora.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
