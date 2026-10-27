import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useFilters } from "@/hooks/useFilters";
import { formatCurrency, Edital, FaseEdital } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function currencyOrDash(value: number | null | undefined) {
  return typeof value === "number" ? formatCurrency(value) : "—";
}

export default function BaseDetalhada() {
  const { filters, onFilterChange, filtered } = useFilters();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Edital | null>(null);

  const data = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return filtered.filter((e) => {
      if (!searchValue) return true;

      return (
        e.objeto?.toLowerCase().includes(searchValue) ||
        e.orgao?.toLowerCase().includes(searchValue) ||
        e.numeroProcesso?.toLowerCase().includes(searchValue) ||
        e.justificativas?.toLowerCase().includes(searchValue) ||
        String(e.id).includes(searchValue)
      );
    });
  }, [filtered, search]);

  return (
    <DashboardLayout title="Base Detalhada">
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col gap-3">
          <FilterBar filters={filters} onFilterChange={onFilterChange} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar edital..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 bg-card pl-9"
            />
          </div>
        </div>

        <div className="chart-container overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Nº</TableHead>
                <TableHead>Órgão</TableHead>
                <TableHead className="hidden md:table-cell">UF</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead className="hidden md:table-cell">Objeto</TableHead>
                <TableHead className="text-right">Valor Estimado</TableHead>
                <TableHead className="hidden xl:table-cell">Justificativas</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Nossa proposta</TableHead>
                <TableHead className="hidden lg:table-cell">Vencedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 50).map((e) => (
                <TableRow
                  key={`${e.id}-${e.numeroProcesso}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(e)}
                >
                  <TableCell className="font-mono text-xs font-medium">{e.id}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{e.orgao}</TableCell>
                  <TableCell className="hidden md:table-cell">{e.uf}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.fase as FaseEdital} />
                  </TableCell>
                  <TableCell className="hidden max-w-[180px] truncate md:table-cell">{e.objeto}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{currencyOrDash(e.valorEstimado)}</TableCell>
                  <TableCell className="hidden max-w-[220px] xl:table-cell">
                    <div className="truncate text-sm text-foreground/90">{e.justificativas?.trim() || "—"}</div>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-sm lg:table-cell">
                    {currencyOrDash(e.propostaPropria)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{e.empresaVencedora ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Exibindo {Math.min(data.length, 50)} de {data.length} editais
          </p>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Edital Nº {selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Processo:</span>{" "}
                  <span className="font-medium">{selected.numeroProcesso || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">UF:</span>{" "}
                  <span className="font-medium">
                    {selected.uf || "—"} {selected.regiao ? `— ${selected.regiao}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Objeto:</span>{" "}
                  <span className="font-medium">{selected.objeto || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fase:</span>{" "}
                  <StatusBadge status={selected.fase as FaseEdital} />
                </div>
                <div>
                  <span className="text-muted-foreground">Abertura:</span>{" "}
                  <span className="font-medium">{selected.abertura || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Meses Contrato:</span>{" "}
                  <span className="font-medium">{selected.mesesContrato ?? "—"}</span>
                </div>
              </div>

              <div className="rounded-xl border bg-background/60 p-4 text-sm">
                <span className="text-muted-foreground">Órgão:</span>{" "}
                <span className="font-medium">{selected.orgao || "—"}</span>
              </div>

              <div className="rounded-xl border bg-background/60 p-4 text-sm">
                <div className="mb-2 font-medium text-foreground">Justificativas</div>
                <p className="whitespace-pre-wrap leading-6 text-foreground/90">
                  {selected.justificativas?.trim() || "—"}
                </p>
              </div>

              <div className="grid gap-3 border-t pt-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Valor Estimado:</span>
                  <p className="font-heading text-lg font-bold">{currencyOrDash(selected.valorEstimado)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Fechado:</span>
                  <p className="font-heading text-lg font-bold">{currencyOrDash(selected.valorFechado)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Nossa proposta:</span>
                  <p className="font-heading font-bold">{currencyOrDash(selected.propostaPropria)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vencedor:</span>
                  <p className="font-heading font-bold">{selected.empresaVencedora ?? "—"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.novaGestao && <Badge variant="secondary">Nova Gestão</Badge>}
                {selected.participou && <Badge variant="outline">{selected.participou}</Badge>}
              </div>

              {selected.linkEdital && (
                <a
                  href={selected.linkEdital}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Ver edital →
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
