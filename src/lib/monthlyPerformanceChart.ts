import { type Edital } from "@/data/mockData";

export const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const yearChartColors = [
  "hsl(214,62%,26%)",
  "hsl(152,60%,40%)",
  "hsl(42,92%,55%)",
  "hsl(0,72%,51%)",
  "hsl(262,83%,58%)",
  "hsl(199,89%,48%)",
  "hsl(24,95%,53%)",
  "hsl(334,85%,45%)",
];

export type MonthlyPerformanceSeries = {
  year: string;
  captadosKey: string;
  valorGanhoKey: string;
  color: string;
};

export type MonthlyPerformancePoint = {
  mes: string;
  captados: number | null;
  valorGanho: number | null;
} & Record<string, string | number | null>;

function getVisibleYears(filtered: Edital[], selectedYear: string) {
  const years = Array.from(new Set(filtered.map((item) => item.abertura?.substring(0, 4)).filter(Boolean)))
    .filter((year): year is string => Boolean(year))
    .sort((a, b) => a.localeCompare(b));

  if (selectedYear === "Todos") return years;

  return years.includes(selectedYear) ? [selectedYear] : years;
}

export function buildMonthlyPerformanceChart(args: {
  filtered: Edital[];
  selectedYear: string;
  isWinner: (edital: Edital) => boolean;
}) {
  const { filtered, selectedYear, isWinner } = args;
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const currentYear = String(today.getFullYear());
  const currentMonthIndex = today.getMonth();
  const years = getVisibleYears(filtered, selectedYear);
  const hasYearSegregation = selectedYear === "Todos" && years.length > 1;

  const series: MonthlyPerformanceSeries[] = years.map((year, index) => ({
    year,
    captadosKey: `captados_${year}`,
    valorGanhoKey: `valorGanho_${year}`,
    color: yearChartColors[index % yearChartColors.length],
  }));

  const data: MonthlyPerformancePoint[] = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    const point: MonthlyPerformancePoint = {
      mes: monthLabels[index],
      captados: 0,
      valorGanho: 0,
    };

    series.forEach((item) => {
      const shouldHideFutureMonth = item.year === currentYear && index > currentMonthIndex;

      if (shouldHideFutureMonth) {
        point[item.captadosKey] = null;
        point[item.valorGanhoKey] = null;
        return;
      }

      const inMonth = filtered.filter((edital) => {
        if (edital.abertura?.substring(0, 4) !== item.year || edital.abertura?.substring(5, 7) !== month) {
          return false;
        }

        if (item.year === currentYear && edital.abertura > todayKey) {
          return false;
        }

        return true;
      });
      const valorGanho = inMonth
        .filter((edital) => isWinner(edital))
        .reduce((sum, edital) => sum + (edital.valorFechado ?? edital.valorEstimado ?? 0), 0);

      point[item.captadosKey] = inMonth.length;
      point[item.valorGanhoKey] = valorGanho;
      point.captados = (point.captados ?? 0) + inMonth.length;
      point.valorGanho = (point.valorGanho ?? 0) + valorGanho;
    });

    if (series.length === 0) {
      point.captados = null;
      point.valorGanho = null;
    }

    return point;
  });

  return {
    data,
    series,
    hasYearSegregation,
    chartHeight: hasYearSegregation ? 420 : 320,
    rightAxisWidth: hasYearSegregation ? 96 : 80,
    chartMargin: hasYearSegregation
      ? { top: 16, right: 24, left: 0, bottom: 56 }
      : { top: 8, right: 16, left: 0, bottom: 8 },
  };
}
