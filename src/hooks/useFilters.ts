import { useState, useMemo } from "react";
import { useEditaisData } from "@/context/EditaisDataContext";

export function useFilters() {
  const { data } = useEditaisData();
  const [filters, setFilters] = useState({
    uf: "Todos",
    regiao: "Todas",
    fase: "todos",
    ano: "Todos",
    mes: "Todos",
    objeto: "Todos",
  });

  const onFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filtered = useMemo(() => {
    return data.filter((e) => {
      if (!e?.id) return false;
      if (!e.novaGestao) return false;
      if (e.fase === "Excluídos") return false;

      if (filters.uf !== "Todos" && e.uf !== filters.uf) return false;
      if (filters.regiao !== "Todas" && e.regiao !== filters.regiao) return false;
      if (filters.fase !== "todos" && e.fase !== filters.fase) return false;
      if (filters.ano !== "Todos" && e.abertura) {
        const year = e.abertura.substring(0, 4);
        if (year !== filters.ano) return false;
      }
      if (filters.mes !== "Todos" && e.abertura) {
        const month = e.abertura.substring(5, 7);
        if (month !== filters.mes) return false;
      }
      if (filters.objeto !== "Todos" && e.objeto !== filters.objeto) return false;
      return true;
    });
  }, [data, filters]);

  return { filters, onFilterChange, filtered };
}
