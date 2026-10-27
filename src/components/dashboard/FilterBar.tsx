import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { faseLabels } from "@/data/mockData";
import { useEditaisData } from "@/context/EditaisDataContext";

interface FilterBarProps {
  filters: {
    uf: string;
    regiao: string;
    fase: string;
    ano: string;
    mes: string;
    objeto: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

const meses = [
  { value: "Todos", label: "Todos" },
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
];

const faseList = [
  { value: "todos", label: "Todos" },
  ...Object.entries(faseLabels)
    .filter(([value]) => value !== "Excluídos")
    .map(([value, label]) => ({ value, label })),
];

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const { data } = useEditaisData();

  const baseFiltravel = useMemo(
    () => data.filter((e) => e?.id && e.novaGestao && e.fase !== "Excluídos"),
    [data]
  );

  const ufs = useMemo(
    () => ["Todos", ...Array.from(new Set(baseFiltravel.map((e) => e.uf).filter(Boolean))).sort()],
    [baseFiltravel]
  );

  const regioes = useMemo(
    () => ["Todas", ...Array.from(new Set(baseFiltravel.map((e) => e.regiao).filter(Boolean))).sort()],
    [baseFiltravel]
  );

  const anos = useMemo(
    () => ["Todos", ...Array.from(new Set(baseFiltravel.map((e) => e.abertura?.substring(0, 4)).filter(Boolean))).sort()],
    [baseFiltravel]
  );

  const objetos = useMemo(
    () => ["Todos", ...Array.from(new Set(baseFiltravel.map((e) => e.objeto).filter(Boolean))).sort()],
    [baseFiltravel]
  );

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ano</label>
        <Select value={filters.ano} onValueChange={(v) => onFilterChange("ano", v)}>
          <SelectTrigger className="w-[110px] bg-card"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>{anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mês</label>
        <Select value={filters.mes} onValueChange={(v) => onFilterChange("mes", v)}>
          <SelectTrigger className="w-[140px] bg-card"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>{meses.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">UF</label>
        <Select value={filters.uf} onValueChange={(v) => onFilterChange("uf", v)}>
          <SelectTrigger className="w-[100px] bg-card"><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>{ufs.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Região</label>
        <Select value={filters.regiao} onValueChange={(v) => onFilterChange("regiao", v)}>
          <SelectTrigger className="w-[150px] bg-card"><SelectValue placeholder="Região" /></SelectTrigger>
          <SelectContent>{regioes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fase</label>
        <Select value={filters.fase} onValueChange={(v) => onFilterChange("fase", v)}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Fase" /></SelectTrigger>
          <SelectContent>{faseList.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Objeto</label>
        <Select value={filters.objeto} onValueChange={(v) => onFilterChange("objeto", v)}>
          <SelectTrigger className="w-[200px] bg-card"><SelectValue placeholder="Objeto" /></SelectTrigger>
          <SelectContent>{objetos.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}
