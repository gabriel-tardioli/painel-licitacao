import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatNumber, getKPIs, type Edital } from "@/data/mockData";
import { useFilters } from "@/hooks/useFilters";
import {
  ResponsiveContainer,
  Tooltip,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  ComposedChart,
  Cell,
} from "recharts";

const OBJECT_COLORS = [
  "hsl(214,62%,26%)",
  "hsl(214,84%,42%)",
  "hsl(42,92%,55%)",
  "hsl(152,60%,40%)",
  "hsl(0,72%,51%)",
  "hsl(262,72%,56%)",
  "hsl(24,95%,53%)",
  "hsl(215,12%,50%)",
];

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getJustificativaNoGo(value?: string | null) {
  const text = value?.trim();
  return text ? text : "Não informado";
}

function getObjetoLabel(value?: string | null) {
  const text = value?.trim();
  return text ? text : "Não informado";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

type GroupedObjectItem = {
  objeto: string;
  quantidade: number;
};

function buildGroupedObjects(items: Edital[]): GroupedObjectItem[] {
  return Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      const objeto = getObjetoLabel(item.objeto);
      acc[objeto] = (acc[objeto] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([objeto, quantidade]) => ({ objeto, quantidade }))
    .sort((a, b) => {
      if (b.quantidade !== a.quantidade) return b.quantidade - a.quantidade;
      return a.objeto.localeCompare(b.objeto, "pt-BR");
    });
}

function sortEditaisByDateDesc(items: Edital[]) {
  return [...items].sort((a, b) => {
    const dateA = a.abertura ? new Date(`${a.abertura}T00:00:00`).getTime() : 0;
    const dateB = b.abertura ? new Date(`${b.abertura}T00:00:00`).getTime() : 0;
    return dateB - dateA;
  });
}

function ObjetosBarChart({
  title,
  subtitle,
  data,
  selectedKey,
  onSelect,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  subtitle: string;
  data: GroupedObjectItem[];
  selectedKey: string | null;
  onSelect: (value: string | null) => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="chart-container">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="section-title">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {selectedKey ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="self-start rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Limpar destaque
          </button>
        ) : null}
      </div>

      {data.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <div className="h-[360px] min-w-[760px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 78 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                  <XAxis
                    dataKey="objeto"
                    angle={-18}
                    textAnchor="end"
                    interval={0}
                    height={92}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(215,12%,50%)"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215,12%,50%)" />
                  <Tooltip
                    formatter={(value: number) => [`${formatNumber(Number(value))} editais`, "Quantidade"]}
                    labelFormatter={(label) => `Classificação do objeto: ${label}`}
                  />
                  <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                    {data.map((item, index) => {
                      const isActive = !selectedKey || selectedKey === item.objeto;
                      return (
                        <Cell
                          key={`objeto-${item.objeto}`}
                          cursor="pointer"
                          fill={isActive ? OBJECT_COLORS[index % OBJECT_COLORS.length] : "hsl(214,20%,85%)"}
                          onClick={() => onSelect(selectedKey === item.objeto ? null : item.objeto)}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.map((item, index) => {
              const isActive = selectedKey === item.objeto;
              return (
                <button
                  key={item.objeto}
                  type="button"
                  onClick={() => onSelect(selectedKey === item.objeto ? null : item.objeto)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${isActive ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:bg-muted/50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: OBJECT_COLORS[index % OBJECT_COLORS.length] }} />
                      <span className="text-sm font-medium leading-5 break-words">{item.objeto}</span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{formatNumber(item.quantidade)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EditaisListPanel({
  title,
  subtitle,
  items,
  selectedLabel,
  emptyTitle,
  emptyDescription,
  showNoGoReason = false,
}: {
  title: string;
  subtitle: string;
  items: Edital[];
  selectedLabel: string | null;
  emptyTitle: string;
  emptyDescription: string;
  showNoGoReason?: boolean;
}) {
  return (
    <div className="chart-container">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="section-title">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {items.length > 0 ? (
        <div className="max-h-[520px] overflow-y-auto pr-2">
          <div className="space-y-3">
            {items.map((edital) => (
              <div key={`${edital.id}-${edital.numeroProcesso}-${edital.abertura}`} className="rounded-xl border bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{edital.orgao || "Órgão não informado"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Processo {edital.numeroProcesso || "—"} • Abertura {formatDate(edital.abertura)}
                    </div>
                  </div>
                  <StatusBadge status={edital.fase} />
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Objeto:</span>{" "}
                    <span className="font-medium text-foreground">{getObjetoLabel(edital.objeto)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">UF / Região:</span>{" "}
                    <span className="font-medium text-foreground">{edital.uf || "—"} • {edital.regiao || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor estimado:</span>{" "}
                    <span className="font-semibold text-foreground">
                      {edital.valorEstimado !== null ? formatCurrency(edital.valorEstimado) : "—"}
                    </span>
                  </div>
                  {showNoGoReason ? (
                    <div>
                      <span className="text-muted-foreground">Motivo do NO-GO:</span>{" "}
                      <span className="font-medium text-foreground">{getJustificativaNoGo(edital.justificativas)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="text-sm text-muted-foreground">
              {selectedLabel ? `Selecione outra categoria além de ${selectedLabel} ou ajuste os filtros.` : emptyDescription}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunilLicitacoes() {
  const { filters, onFilterChange, filtered } = useFilters();
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [selectedObjetoCaptado, setSelectedObjetoCaptado] = useState<string | null>(null);
  const [selectedObjetoAprovacao, setSelectedObjetoAprovacao] = useState<string | null>(null);
  const kpis = getKPIs(filtered);

  const captadosPorObjeto = useMemo(() => buildGroupedObjects(filtered), [filtered]);

  const editaisPorObjetoSelecionado = useMemo(() => {
    if (!selectedObjetoCaptado) return [];
    return sortEditaisByDateDesc(filtered.filter((item) => getObjetoLabel(item.objeto) === selectedObjetoCaptado));
  }, [filtered, selectedObjetoCaptado]);

  const noGoItems = useMemo(
    () => filtered.filter((item) => item.fase === "NO-GO" || item.participou === "NO-GO"),
    [filtered],
  );

  const editaisEmAndamento = useMemo(
    () =>
      sortEditaisByDateDesc(
        filtered.filter((item) => item.fase === "Em Andamento" || item.participou === "EM ANDAMENTO"),
      ),
    [filtered],
  );

  const aprovacaoPorObjeto = useMemo(() => buildGroupedObjects(editaisEmAndamento), [editaisEmAndamento]);

  const editaisAprovacaoSelecionados = useMemo(() => {
    if (!selectedObjetoAprovacao) return [];
    return editaisEmAndamento.filter((item) => getObjetoLabel(item.objeto) === selectedObjetoAprovacao);
  }, [editaisEmAndamento, selectedObjetoAprovacao]);

  const taxasConversao = [
    {
      label: "Participação sobre captados",
      value: kpis.captados > 0 ? (kpis.participados / kpis.captados) * 100 : 0,
      helper: `${formatNumber(kpis.participados)} de ${formatNumber(kpis.captados)} editais captados`,
    },
    {
      label: "Vitória sobre participados",
      value: kpis.participados > 0 ? (kpis.vencidos / kpis.participados) * 100 : 0,
      helper: `${formatNumber(kpis.vencidos)} de ${formatNumber(kpis.participados)} editais participados`,
    },
    {
      label: "Vitória sobre captados",
      value: kpis.captados > 0 ? (kpis.vencidos / kpis.captados) * 100 : 0,
      helper: `${formatNumber(kpis.vencidos)} de ${formatNumber(kpis.captados)} editais captados`,
    },
  ];

  const noGoRate = kpis.captados > 0 ? (noGoItems.length / kpis.captados) * 100 : 0;

  const noGoMotivos = useMemo(() => {
    const grouped = Object.entries(
      noGoItems.reduce<Record<string, number>>((acc, item) => {
        const motivo = getJustificativaNoGo(item.justificativas);
        acc[motivo] = (acc[motivo] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([motivo, quantidade]) => ({ motivo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);

    let acumulado = 0;
    return grouped.map((item) => {
      acumulado += item.quantidade;
      const percentualAcumulado = noGoItems.length > 0 ? (acumulado / noGoItems.length) * 100 : 0;

      return {
        ...item,
        percentualAcumulado,
      };
    });
  }, [noGoItems]);

  useEffect(() => {
    if (captadosPorObjeto.length === 0) {
      setSelectedObjetoCaptado(null);
      return;
    }

    if (!selectedObjetoCaptado || !captadosPorObjeto.some((item) => item.objeto === selectedObjetoCaptado)) {
      setSelectedObjetoCaptado(captadosPorObjeto[0].objeto);
    }
  }, [captadosPorObjeto, selectedObjetoCaptado]);

  useEffect(() => {
    if (aprovacaoPorObjeto.length === 0) {
      setSelectedObjetoAprovacao(null);
      return;
    }

    if (!selectedObjetoAprovacao || !aprovacaoPorObjeto.some((item) => item.objeto === selectedObjetoAprovacao)) {
      setSelectedObjetoAprovacao(aprovacaoPorObjeto[0].objeto);
    }
  }, [aprovacaoPorObjeto, selectedObjetoAprovacao]);

  useEffect(() => {
    if (noGoMotivos.length === 0) {
      setSelectedMotivo(null);
      return;
    }

    if (!selectedMotivo || !noGoMotivos.some((item) => item.motivo === selectedMotivo)) {
      setSelectedMotivo(noGoMotivos[0].motivo);
    }
  }, [noGoMotivos, selectedMotivo]);

  const selectedNoGoItems = useMemo(() => {
    if (!selectedMotivo) return [];
    return sortEditaisByDateDesc(noGoItems.filter((item) => getJustificativaNoGo(item.justificativas) === selectedMotivo));
  }, [noGoItems, selectedMotivo]);

  const valorEstimadoEmAndamento = editaisEmAndamento.reduce((acc, item) => acc + (item.valorEstimado ?? 0), 0);
  const objetoSelecionadoResumo = captadosPorObjeto.find((item) => item.objeto === selectedObjetoCaptado) ?? null;
  const aprovacaoSelecionadaResumo = aprovacaoPorObjeto.find((item) => item.objeto === selectedObjetoAprovacao) ?? null;

  return (
    <DashboardLayout title="Visão Administrativa">
      <div className="space-y-6 animate-fade-in">
        <FilterBar filters={filters} onFilterChange={onFilterChange} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {taxasConversao.map((taxa) => (
            <div key={taxa.label} className="rounded-2xl border bg-card px-5 py-5 shadow-sm">
              <div className="text-sm font-medium text-foreground">{taxa.label}</div>
              <div className="mt-2 text-3xl font-bold text-primary">{formatPercent(taxa.value)}</div>
              <p className="mt-2 text-xs text-muted-foreground">{taxa.helper}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
          <ObjetosBarChart
            title="Editais Captados por Classificação do Objeto"
            subtitle="Clique em uma barra para destacar a categoria e ver, ao lado, a lista dos editais pertencentes ao objeto selecionado."
            data={captadosPorObjeto}
            selectedKey={selectedObjetoCaptado}
            onSelect={setSelectedObjetoCaptado}
            emptyTitle="Nenhum edital encontrado no período selecionado."
            emptyDescription="Quando houver editais captados no recorte atual, as classificações de objeto aparecerão neste gráfico."
          />

          <EditaisListPanel
            title="Editais do Objeto Selecionado"
            subtitle={
              selectedObjetoCaptado && objetoSelecionadoResumo
                ? `Mostrando ${formatNumber(editaisPorObjetoSelecionado.length)} edital(is) da classificação ${selectedObjetoCaptado}, equivalente a ${formatNumber(objetoSelecionadoResumo.quantidade)} registro(s) no gráfico.`
                : "Clique em uma barra do gráfico para ver os editais correspondentes à classificação de objeto selecionada."
            }
            items={editaisPorObjetoSelecionado}
            selectedLabel={selectedObjetoCaptado}
            emptyTitle="Nenhum edital encontrado para a classificação selecionada."
            emptyDescription="Selecione uma classificação no gráfico para abrir a lista detalhada ao lado."
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
          <ObjetosBarChart
            title="Aguardando aprovação por classificação do objeto"
            subtitle="A contagem considera apenas os editais em andamento. Clique em uma barra para filtrar a lista ao lado."
            data={aprovacaoPorObjeto}
            selectedKey={selectedObjetoAprovacao}
            onSelect={setSelectedObjetoAprovacao}
            emptyTitle="Nenhum edital em andamento no período selecionado."
            emptyDescription="Quando houver editais em andamento no recorte atual, as classificações de objeto aparecerão neste gráfico."
          />

          <EditaisListPanel
            title="Editais em Andamento"
            subtitle={
              selectedObjetoAprovacao && aprovacaoSelecionadaResumo
                ? `${formatNumber(editaisEmAndamento.length)} edital(is) em andamento no período, com valor estimado total de ${formatCurrency(valorEstimadoEmAndamento)}. A lista mostra a classificação ${selectedObjetoAprovacao}, com ${formatNumber(aprovacaoSelecionadaResumo.quantidade)} registro(s).`
                : `${formatNumber(editaisEmAndamento.length)} edital(is) em andamento no período, com valor estimado total de ${formatCurrency(valorEstimadoEmAndamento)}.`
            }
            items={editaisAprovacaoSelecionados}
            selectedLabel={selectedObjetoAprovacao}
            emptyTitle="Nenhum edital em andamento no período selecionado."
            emptyDescription="Quando houver editais em andamento, selecione uma classificação de objeto no gráfico ao lado para ver a lista correspondente."
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="chart-container">
            <div className="mb-4 flex flex-col gap-1">
              <h3 className="section-title">NO-GO por Motivo</h3>
              <p className="text-sm text-muted-foreground">
                {formatNumber(noGoItems.length)} editais em NO-GO no período, equivalentes a {formatPercent(noGoRate)} dos editais captados. A linha azul mostra o percentual acumulado dos motivos informados na coluna de justificativas.
              </p>
            </div>

            {noGoMotivos.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="h-[380px] min-w-[680px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={noGoMotivos} margin={{ top: 12, right: 16, left: 0, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                      <XAxis
                        dataKey="motivo"
                        angle={-18}
                        textAnchor="end"
                        interval={0}
                        height={92}
                        tick={{ fontSize: 12 }}
                        stroke="hsl(215,12%,50%)"
                      />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215,12%,50%)" />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                        tick={{ fontSize: 12 }}
                        stroke="hsl(215,12%,50%)"
                        width={60}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === "percentualAcumulado") return [formatPercent(Number(value)), "% acumulado de NO-GO"];
                          return [`${formatNumber(Number(value))} editais`, "Quantidade de NO-GO"];
                        }}
                        labelFormatter={(label) => `Motivo: ${label}`}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="quantidade"
                        radius={[6, 6, 0, 0]}
                        onClick={(data: { motivo?: string; payload?: { motivo?: string } }) => {
                          const motivo = data?.motivo ?? data?.payload?.motivo;
                          if (motivo) setSelectedMotivo(motivo);
                        }}
                      >
                        {noGoMotivos.map((item) => (
                          <Cell
                            key={item.motivo}
                            cursor="pointer"
                            fill={selectedMotivo === item.motivo ? "hsl(214,84%,42%)" : "hsl(214,62%,26%)"}
                          />
                        ))}
                      </Bar>
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="percentualAcumulado"
                        stroke="hsl(214,84%,56%)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "hsl(214,84%,56%)" }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Nenhum edital em NO-GO no período selecionado.</p>
                  <p className="text-sm text-muted-foreground">Quando houver registros em NO-GO, os motivos vindos da coluna de justificativas aparecerão aqui.</p>
                </div>
              </div>
            )}
          </div>

          <EditaisListPanel
            title="Editais do Motivo Selecionado"
            subtitle={
              selectedMotivo
                ? `Mostrando ${formatNumber(selectedNoGoItems.length)} edital(is) classificados como ${selectedMotivo}.`
                : "Clique em uma barra do gráfico para ver os editais correspondentes ao motivo selecionado."
            }
            items={selectedNoGoItems}
            selectedLabel={selectedMotivo}
            emptyTitle="Nenhum edital encontrado para o motivo selecionado."
            emptyDescription="Clique em uma categoria do gráfico para filtrar a lista ao lado."
            showNoGoReason
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
