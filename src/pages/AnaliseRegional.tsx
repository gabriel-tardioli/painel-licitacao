import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { formatNumber } from "@/data/mockData";
import { useFilters } from "@/hooks/useFilters";
import brazilMapBase from "@/assets/mapa-brasil-estados-oficial.jpg";

type BrazilStateHotspot = {
  uf: string;
  nome: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  dotDx?: number;
  dotDy?: number;
};

const BRAZIL_STATE_HOTSPOTS: BrazilStateHotspot[] = [
  { uf: "AC", nome: "Acre", x: 6.4, y: 38.0, width: 5.2, height: 4.0, fontSize: 3.5, dotDx: 2.1, dotDy: -1.8 },
  { uf: "AM", nome: "Amazonas", x: 24.0, y: 24.8, width: 7.4, height: 4.6, fontSize: 4.4, dotDx: 2.8, dotDy: -2.0 },
  { uf: "RR", nome: "Roraima", x: 31.6, y: 9.8, width: 5.4, height: 4.0, fontSize: 3.8, dotDx: 2.0, dotDy: -1.8 },
  { uf: "AP", nome: "Amapá", x: 56.5, y: 11.0, width: 5.4, height: 4.0, fontSize: 3.8, dotDx: 2.0, dotDy: -1.8 },
  { uf: "PA", nome: "Pará", x: 53.5, y: 27.5, width: 7.0, height: 4.4, fontSize: 4.2, dotDx: 2.6, dotDy: -1.8 },
  { uf: "RO", nome: "Rondônia", x: 27.8, y: 41.8, width: 6.2, height: 4.2, fontSize: 4.0, dotDx: 2.3, dotDy: -1.8 },
  { uf: "TO", nome: "Tocantins", x: 63.3, y: 40.0, width: 6.2, height: 4.2, fontSize: 4.1, dotDx: 2.4, dotDy: -1.8 },
  { uf: "MA", nome: "Maranhão", x: 72.5, y: 27.3, width: 6.2, height: 4.2, fontSize: 4.0, dotDx: 2.4, dotDy: -1.8 },
  { uf: "PI", nome: "Piauí", x: 78.3, y: 34.5, width: 5.8, height: 4.1, fontSize: 3.9, dotDx: 2.1, dotDy: -1.7 },
  { uf: "CE", nome: "Ceará", x: 86.9, y: 27.9, width: 6.0, height: 4.1, fontSize: 4.0, dotDx: 1.8, dotDy: -1.6 },
  { uf: "RN", nome: "Rio Grande do Norte", x: 94.9, y: 30.4, width: 4.8, height: 3.5, fontSize: 2.9, dotDx: 0.5, dotDy: -1.3 },
  { uf: "PB", nome: "Paraíba", x: 95.6, y: 33.4, width: 4.8, height: 3.5, fontSize: 2.9, dotDx: 0.4, dotDy: -1.1 },
  { uf: "PE", nome: "Pernambuco", x: 90.1, y: 36.9, width: 5.0, height: 3.6, fontSize: 3.2, dotDx: 1.6, dotDy: -1.4 },
  { uf: "AL", nome: "Alagoas", x: 97.2, y: 41.0, width: 4.8, height: 3.4, fontSize: 2.9, dotDx: -1.1, dotDy: -1.3 },
  { uf: "SE", nome: "Sergipe", x: 97.0, y: 44.8, width: 4.8, height: 3.4, fontSize: 2.9, dotDx: -1.0, dotDy: -1.3 },
  { uf: "BA", nome: "Bahia", x: 79.9, y: 46.0, width: 6.4, height: 4.3, fontSize: 4.1, dotDx: 2.5, dotDy: -1.8 },
  { uf: "MT", nome: "Mato Grosso", x: 46.3, y: 47.3, width: 6.8, height: 4.4, fontSize: 4.2, dotDx: 2.5, dotDy: -1.8 },
  { uf: "MS", nome: "Mato Grosso do Sul", x: 48.0, y: 65.5, width: 6.6, height: 4.4, fontSize: 4.1, dotDx: 2.4, dotDy: -1.8 },
  { uf: "GO", nome: "Goiás", x: 60.3, y: 56.0, width: 5.8, height: 4.1, fontSize: 4.0, dotDx: 2.1, dotDy: -1.7 },
  { uf: "DF", nome: "Distrito Federal", x: 69.0, y: 54.7, width: 4.6, height: 3.0, fontSize: 2.5, dotDx: 1.4, dotDy: -1.1 },
  { uf: "MG", nome: "Minas Gerais", x: 73.3, y: 63.0, width: 6.8, height: 4.4, fontSize: 4.2, dotDx: 2.5, dotDy: -1.8 },
  { uf: "ES", nome: "Espírito Santo", x: 86.3, y: 65.8, width: 4.8, height: 3.5, fontSize: 3.0, dotDx: 1.6, dotDy: -1.3 },
  { uf: "RJ", nome: "Rio de Janeiro", x: 80.3, y: 73.5, width: 4.8, height: 3.5, fontSize: 3.0, dotDx: 1.6, dotDy: -1.3 },
  { uf: "SP", nome: "São Paulo", x: 62.5, y: 70.6, width: 5.8, height: 4.1, fontSize: 4.0, dotDx: 2.1, dotDy: -1.7 },
  { uf: "PR", nome: "Paraná", x: 56.0, y: 76.5, width: 5.8, height: 4.1, fontSize: 4.0, dotDx: 2.1, dotDy: -1.7 },
  { uf: "SC", nome: "Santa Catarina", x: 59.5, y: 83.3, width: 5.8, height: 4.0, fontSize: 4.0, dotDx: 2.1, dotDy: -1.7 },
  { uf: "RS", nome: "Rio Grande do Sul", x: 50.3, y: 88.8, width: 6.2, height: 4.2, fontSize: 4.1, dotDx: 2.2, dotDy: -1.7 },
];

const SELECTED_FILL = "#4c56e6";
const SELECTED_BORDER = "#3139b8";

function isWinner(edital: { participou: string; fase: string; empresaVencedora: string | null }) {
  return edital.participou === "VENCEU" || edital.fase === "Venceu" || edital.empresaVencedora === "Nossa OSS";
}

function isLoss(edital: { participou: string; fase: string }) {
  return edital.participou === "PERDEU" || edital.fase === "Perdeu";
}

export default function AnaliseRegional() {
  const { filters, onFilterChange, filtered } = useFilters();
  const [selectedUF, setSelectedUF] = useState<string>("SP");

  const byUF = useMemo(() => {
    return filtered.reduce<Record<string, { total: number; vencidos: number; perdidos: number }>>((acc, edital) => {
      if (!edital.uf) return acc;
      if (!acc[edital.uf]) acc[edital.uf] = { total: 0, vencidos: 0, perdidos: 0 };
      acc[edital.uf].total += 1;
      if (isWinner(edital)) acc[edital.uf].vencidos += 1;
      if (isLoss(edital)) acc[edital.uf].perdidos += 1;
      return acc;
    }, {});
  }, [filtered]);

  const rankedUfs = useMemo(() => {
    return Object.entries(byUF)
      .map(([uf, data]) => ({ uf, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [byUF]);

  useEffect(() => {
    const availableUfs = new Set(rankedUfs.map((item) => item.uf));

    if (availableUfs.size === 0) {
      setSelectedUF("SP");
      return;
    }

    if (!availableUfs.has(selectedUF)) {
      const preferred = availableUfs.has("SP") ? "SP" : rankedUfs[0]?.uf;
      if (preferred) setSelectedUF(preferred);
    }
  }, [rankedUfs, selectedUF]);

  const editaisDaUf = useMemo(() => filtered.filter((item) => item.uf === selectedUF), [filtered, selectedUF]);
  const editaisVencidosDaUf = useMemo(() => editaisDaUf.filter((item) => isWinner(item)), [editaisDaUf]);
  const editaisPerdidosDaUf = useMemo(() => editaisDaUf.filter((item) => isLoss(item)), [editaisDaUf]);

  const objetosVencidos = useMemo(() => {
    return Object.entries(
      editaisVencidosDaUf.reduce<Record<string, number>>((acc, item) => {
        const objeto = item.objeto?.trim() || "Objeto não informado";
        acc[objeto] = (acc[objeto] ?? 0) + 1;
        return acc;
      }, {})
    )
      .map(([objeto, quantidade]) => ({ objeto, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.objeto.localeCompare(b.objeto));
  }, [editaisVencidosDaUf]);

  const selectedStateName = BRAZIL_STATE_HOTSPOTS.find((item) => item.uf === selectedUF)?.nome ?? selectedUF;

  return (
    <DashboardLayout title="Análise por Região">
      <div className="space-y-6 animate-fade-in">
        <FilterBar filters={filters} onFilterChange={onFilterChange} />

        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="chart-container">
            <div className="mb-4 flex flex-col gap-1">
              <h3 className="section-title">Mapa Interativo do Brasil</h3>
              <p className="text-sm text-muted-foreground">
                O mapa usa a imagem-base oficial e os cliques ficam posicionados exatamente sobre as siglas das UFs.
              </p>
            </div>

            <div className="rounded-2xl border bg-background/50 p-3 sm:p-4">
              <div className="overflow-x-auto">
                <div className="mx-auto min-w-[520px] max-w-[860px]">
                  <div className="relative aspect-square w-full rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200" style={{ containerType: "inline-size" }}>
                    <img
                      src={brazilMapBase}
                      alt="Mapa do Brasil com siglas dos estados"
                      className="pointer-events-none absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] object-contain"
                    />

                    <div className="absolute inset-4">
                      {BRAZIL_STATE_HOTSPOTS.map((state) => {
                        const isSelected = state.uf === selectedUF;
                        const hasWins = (byUF[state.uf]?.vencidos ?? 0) > 0;
                        const dotLeft = state.x + (state.dotDx ?? 2.1);
                        const dotTop = state.y + (state.dotDy ?? -1.7);

                        return (
                          <div key={state.uf}>
                            <button
                              type="button"
                              title={state.nome}
                              aria-label={`Selecionar estado ${state.nome}`}
                              onClick={() => setSelectedUF(state.uf)}
                              className="absolute rounded-md border border-transparent bg-transparent font-bold tracking-[0.04em] text-transparent outline-none transition-all duration-150 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
                              style={{
                                left: `${state.x}%`,
                                top: `${state.y}%`,
                                width: `${state.width}%`,
                                height: `${state.height}%`,
                                transform: "translate(-50%, -50%)",
                                fontSize: `${(state.fontSize * 0.88).toFixed(2)}cqi`,
                                backgroundColor: isSelected ? SELECTED_FILL : "transparent",
                                borderColor: isSelected ? SELECTED_BORDER : "transparent",
                                color: isSelected ? "#ffffff" : "transparent",
                                boxShadow: isSelected ? "0 6px 18px rgba(76, 86, 230, 0.28)" : "none",
                                textShadow: isSelected ? "0 1px 1px rgba(0,0,0,0.18)" : "none",
                              }}
                            >
                              {state.uf}
                            </button>

                            {hasWins ? (
                              <span
                                className="pointer-events-none absolute block h-2.5 w-2.5 rounded-full border border-white bg-emerald-600 shadow-sm"
                                style={{
                                  left: `${dotLeft}%`,
                                  top: `${dotTop}%`,
                                  transform: "translate(-50%, -50%)",
                                }}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: SELECTED_FILL }} />
                  UF selecionada
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-emerald-600" />
                  Há edital vencido na UF
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="kpi-card">
              <div className="text-sm font-medium text-muted-foreground">UF Selecionada</div>
              <div className="mt-2 text-3xl font-bold text-primary">{selectedUF}</div>
              <p className="mt-1 text-sm text-foreground">{selectedStateName}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="kpi-card">
                <div className="text-sm font-medium text-muted-foreground">Captados</div>
                <div className="mt-2 text-3xl font-bold text-primary">{formatNumber(editaisDaUf.length)}</div>
                <p className="mt-1 text-sm text-muted-foreground">Quantidade de editais captados na UF selecionada.</p>
              </div>

              <div className="kpi-card">
                <div className="text-sm font-medium text-muted-foreground">Vencidos</div>
                <div className="mt-2 text-3xl font-bold text-emerald-600">{formatNumber(editaisVencidosDaUf.length)}</div>
                <p className="mt-1 text-sm text-muted-foreground">Quantidade de editais que vencemos na UF selecionada.</p>
              </div>

              <div className="kpi-card">
                <div className="text-sm font-medium text-muted-foreground">Perdidos</div>
                <div className="mt-2 text-3xl font-bold text-destructive">{formatNumber(editaisPerdidosDaUf.length)}</div>
                <p className="mt-1 text-sm text-muted-foreground">Quantidade de editais perdidos na UF selecionada.</p>
              </div>
            </div>

            <div className="chart-container">
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="section-title">Objetos Vencidos na UF</h3>
                <p className="text-sm text-muted-foreground">Número de cada objeto vencido em {selectedUF}.</p>
              </div>

              {objetosVencidos.length > 0 ? (
                <div className="space-y-3">
                  {objetosVencidos.map((item) => (
                    <div key={item.objeto} className="rounded-xl border bg-background/70 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-foreground">{item.objeto}</div>
                        <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                          {formatNumber(item.quantidade)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Nenhum edital vencido na UF selecionada.</p>
                    <p className="text-sm text-muted-foreground">Quando houver vitórias nesta UF, os objetos vencidos aparecerão aqui.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
