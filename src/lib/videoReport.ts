import { Edital, getKPIs } from "@/data/mockData";

export type VideoReportPeriodMode = "total" | "ano" | "mes";

export interface VideoReportInput {
  data: Edital[];
  mode: VideoReportPeriodMode;
  year?: string;
  month?: string;
}

export interface VideoReportOutput {
  periodLabel: string;
  closingLabel: string;
  filtered: Edital[];
  scriptText: string;
  jsonText: string;
  structured: Record<string, unknown>;
}

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

const PARTICIPATION_STATUSES = ["VENCEU", "PERDEU", "AGUARDANDO RESULTADO", "EM ANDAMENTO"];

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatMillions(value: number) {
  return `${(value / 1_000_000).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} milhões de reais`;
}

function getDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMonthLabel(month?: string) {
  const monthNumber = Number(month ?? 0);
  if (!monthNumber || monthNumber < 1 || monthNumber > 12) return null;
  return MONTH_NAMES[monthNumber - 1];
}

function getBaseData(data: Edital[]) {
  return data.filter((item) => item?.id && item.novaGestao && item.fase !== "Excluídos");
}

function filterDataByPeriod(baseData: Edital[], mode: VideoReportPeriodMode, year?: string, month?: string) {
  return baseData.filter((item) => {
    if (!item.abertura) return mode === "total";

    if (mode === "ano") {
      return Boolean(year) && item.abertura.slice(0, 4) === year;
    }

    if (mode === "mes") {
      return Boolean(year) && Boolean(month) && item.abertura.slice(0, 4) === year && item.abertura.slice(5, 7) === month;
    }

    return true;
  });
}

function getPeriodLabel(mode: VideoReportPeriodMode, filtered: Edital[], year?: string, month?: string) {
  if (mode === "mes" && year && month) {
    return `${getMonthLabel(month)} de ${year}`;
  }

  if (mode === "ano" && year) {
    return `ano de ${year}`;
  }

  const dates = filtered
    .map((item) => getDate(item.abertura))
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime());

  if (!dates.length) return "período total analisado";

  const first = dates[0];
  const last = dates[dates.length - 1];
  const firstLabel = `${MONTH_NAMES[first.getMonth()]} de ${first.getFullYear()}`;
  const lastLabel = `${MONTH_NAMES[last.getMonth()]} de ${last.getFullYear()}`;

  if (firstLabel === lastLabel) return firstLabel;
  return `período total analisado, de ${firstLabel} a ${lastLabel}`;
}

function getClosingLabel(mode: VideoReportPeriodMode, periodLabel: string) {
  if (mode === "mes") return periodLabel;
  if (mode === "ano") return periodLabel.replace("ano de ", "");
  return periodLabel;
}

function getDiscountPercent(edital: Edital) {
  const estimado = edital.valorEstimado ?? 0;
  const fechado = edital.valorFechado ?? 0;
  if (estimado <= 0 || fechado <= 0) return null;
  return (1 - fechado / estimado) * 100;
}

function getOwnDiscountPercent(edital: Edital) {
  const estimado = edital.valorEstimado ?? 0;
  const propostaPropria = edital.propostaPropria ?? (edital.participou === "VENCEU" ? edital.valorFechado : null) ?? 0;
  if (estimado <= 0 || propostaPropria <= 0) return null;
  return (1 - propostaPropria / estimado) * 100;
}

function getAverage(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function classifyObject(value?: string | null) {
  const text = normalizeText(value);
  if (text === "hospital") return "hospital";
  if (text === "upa") return "upa";
  if (text === "ame") return "ame";
  if (text === "caps") return "caps";
  if (text === "usf") return "usf";
  if (text === "conjunto de unidades") return "misto";
  return "outros";
}

function getObjectBreakdown(items: Edital[]) {
  const counters = {
    hospital: 0,
    upa: 0,
    ame: 0,
    caps: 0,
    usf: 0,
    misto: 0,
    outros: 0,
  };

  items.forEach((item) => {
    const key = classifyObject(item.objeto);
    counters[key] += 1;
  });

  return counters;
}

function normalizeNoGoReason(value?: string | null) {
  const text = normalizeText(value);
  if (text === "sem interesse") return "Sem interesse";
  if (text === "sem qualificacao") return "Sem qualificação";
  if (text === "politica local") return "Política local";
  if (text === "preco") return "Preço";
  if (text === "prazo") return "Prazo";
  if (text === "habilitacao" || text === "inabilitado") return "Habilitação";
  if (text === "exposicao elevada") return "Exposição elevada";
  if (text === "risco de execucao") return "Risco de execução";
  return "Outros";
}

function getNoGoBreakdown(items: Edital[]) {
  const counters = {
    "Sem interesse": 0,
    "Sem qualificação": 0,
    "Política local": 0,
    Preço: 0,
    Prazo: 0,
    Habilitação: 0,
    "Exposição elevada": 0,
    "Risco de execução": 0,
    Outros: 0,
  };

  items.forEach((item) => {
    const key = normalizeNoGoReason(item.justificativas);
    counters[key] += 1;
  });

  return counters;
}

function getCompetitors(items: Edital[]) {
  return Object.entries(
    items.reduce<Record<string, { quantidade: number; descontos: number[] }>>((acc, item) => {
      const nome = (item.empresaVencedora ?? "").trim();
      if (!nome || normalizeText(nome) === "nossa oss") return acc;

      if (!acc[nome]) {
        acc[nome] = { quantidade: 0, descontos: [] };
      }

      acc[nome].quantidade += 1;
      const desconto = getDiscountPercent(item);
      if (desconto !== null) {
        acc[nome].descontos.push(desconto);
      }
      return acc;
    }, {}),
  )
    .map(([nome, data]) => ({
      nome,
      quantidade: data.quantidade,
      descontoMedio: getAverage(data.descontos),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));
}

function getUfResults(items: Edital[]) {
  return Object.entries(
    items.reduce<Record<string, { vencidos: number; perdidos: number }>>((acc, item) => {
      const uf = (item.uf ?? "").trim() || "UF não informada";
      if (!acc[uf]) {
        acc[uf] = { vencidos: 0, perdidos: 0 };
      }

      if (item.participou === "VENCEU") acc[uf].vencidos += 1;
      if (item.participou === "PERDEU") acc[uf].perdidos += 1;
      return acc;
    }, {}),
  )
    .map(([uf, data]) => ({ uf, ...data }))
    .filter((item) => item.vencidos > 0 || item.perdidos > 0)
    .sort((a, b) => b.vencidos + b.perdidos - (a.vencidos + a.perdidos) || a.uf.localeCompare(b.uf, "pt-BR"));
}

function getIntroLine(mode: VideoReportPeriodMode, periodLabel: string) {
  if (mode === "mes") {
    return `Olá. Este é o fechamento mensal de licitações referente a ${periodLabel}.`;
  }

  if (mode === "ano") {
    return `Olá. Este é o fechamento de licitações referente ao ${periodLabel}.`;
  }

  return `Olá. Este é o fechamento de licitações referente ao ${periodLabel}.`;
}

export function buildVideoReport(input: VideoReportInput): VideoReportOutput {
  const baseData = getBaseData(input.data);
  const filtered = filterDataByPeriod(baseData, input.mode, input.year, input.month);
  const periodLabel = getPeriodLabel(input.mode, filtered, input.year, input.month);
  const closingLabel = getClosingLabel(input.mode, periodLabel);

  const kpis = getKPIs(filtered);
  const participados = filtered.filter((item) => PARTICIPATION_STATUSES.includes(item.participou));
  const vencidos = filtered.filter((item) => item.participou === "VENCEU");
  const perdidos = filtered.filter((item) => item.participou === "PERDEU");
  const noGo = filtered.filter((item) => item.fase === "NO-GO" || item.participou === "NO-GO");

  const objectBreakdown = getObjectBreakdown(filtered);
  const noGoBreakdown = getNoGoBreakdown(noGo);
  const competitors = getCompetitors(perdidos);
  const ufResults = getUfResults(filtered);

  const descontoMedioVencidos = getAverage(vencidos.map((item) => getOwnDiscountPercent(item)));
  const descontoMedioParticipados = getAverage(participados.map((item) => getOwnDiscountPercent(item)));

  const competitorNames = competitors.map((item) => item.nome).join(", ");
  const competitorDiscounts = competitors.length
    ? competitors
        .map((item) => `${item.nome}, ${formatPercent(item.descontoMedio)}`)
        .join("; ")
    : "Não houve competidores registrados nos editais perdidos do período.";

  const ufResultText = ufResults.length
    ? ufResults
        .map((item) => `${item.uf}: ${formatCount(item.vencidos)} vencidos e ${formatCount(item.perdidos)} perdidos`)
        .join("; ")
    : "Não houve vencidos ou perdidos com UF identificada no período analisado.";

  const scriptText = [
    getIntroLine(input.mode, periodLabel),
    "",
    `A quantidade total de editais captados no período analisado foi de ${formatCount(filtered.length)} editais, sendo estes ${formatCount(objectBreakdown.hospital)} Hospitais, ${formatCount(objectBreakdown.upa)} UPAs, ${formatCount(objectBreakdown.ame)} AMEs, ${formatCount(objectBreakdown.caps)} CAPS, ${formatCount(objectBreakdown.usf)} USFs, ${formatCount(objectBreakdown.misto)} Editais mistos, correspondentes a conjunto de unidades, e mais ${formatCount(objectBreakdown.outros)} outros. O valor total captado em editais de chamamento público, participados e não participados, alcançou, no período analisado, ${formatMillions(kpis.valorEstimadoTotal)}. Destes, o valor convertido em ganhos foi de ${formatMillions(kpis.valorGanho)} e o valor perdido foi de ${formatMillions(kpis.valorPerdidoCaptado)} com relação ao total captado e ${formatMillions(kpis.valorPerdidoFechado)} referente ao valor fechado pela concorrência.`,
    "",
    `Resultando então em um total de ${formatCount(kpis.captados)} editais captados, ${formatCount(kpis.participados)} editais participados e ${formatCount(kpis.vencidos)} editais vencidos, o que implica em uma taxa de participação de ${formatPercent(kpis.taxaParticipacao)} e ${formatPercent(kpis.taxaVitoria)} de vitória.`,
    "",
    `No período analisado, a quantidade total de editais NO-GO foi de ${formatCount(noGo.length)}. Destes, ${formatCount(noGoBreakdown["Sem interesse"])} não participamos por serem classificados como Sem interesse, ${formatCount(noGoBreakdown["Sem qualificação"])} por não possuirmos qualificação, ${formatCount(noGoBreakdown["Política local"])} por Política local, ${formatCount(noGoBreakdown["Preço"])} por questões de preço, ${formatCount(noGoBreakdown["Prazo"])} por questões de prazo para a data de entrega, ${formatCount(noGoBreakdown["Habilitação"])} por não sermos habilitados, ${formatCount(noGoBreakdown["Exposição elevada"])} por exposição elevada, ${formatCount(noGoBreakdown["Risco de execução"])} por risco de execução e ${formatCount(noGoBreakdown.Outros)} por outros motivos.`,
    "",
    `Em relação aos indicadores de competitividade, temos: demos em média, no período de ${closingLabel}, ${formatPercent(descontoMedioVencidos)} de desconto com relação ao valor máximo estimado dos editais em que vencemos e ${formatPercent(descontoMedioParticipados)} de desconto médio nos editais em que participamos. Os principais competidores, OSSs que nos venceram nos editais que participamos, foram ${competitorNames || "não houve competidores registrados no período"}. Em média, estas deram: ${competitorDiscounts}`,
    "",
    `Por fim, o nosso resultado foi, por Unidade Federativa, em ${closingLabel}: ${ufResultText}.`,
    "",
    `Este foi o resumo dos indicadores de ${closingLabel}. Até a próxima!`,
  ].join("\n");

  const structured = {
    periodo: {
      modo: input.mode,
      ano: input.year ?? null,
      mes: input.month ?? null,
      descricao: periodLabel,
      encerramento: closingLabel,
      totalEditaisConsiderados: filtered.length,
    },
    captacao: {
      totalCaptado: kpis.captados,
      porClassificacaoObjeto: {
        hospitais: objectBreakdown.hospital,
        upas: objectBreakdown.upa,
        ames: objectBreakdown.ame,
        caps: objectBreakdown.caps,
        usfs: objectBreakdown.usf,
        editaisMistos: objectBreakdown.misto,
        outros: objectBreakdown.outros,
      },
    },
    valores: {
      valorEstimadoTotal: kpis.valorEstimadoTotal,
      valorEstimadoTotalMilhoes: formatMillions(kpis.valorEstimadoTotal),
      valorGanho: kpis.valorGanho,
      valorGanhoMilhoes: formatMillions(kpis.valorGanho),
      valorPerdidoCaptado: kpis.valorPerdidoCaptado,
      valorPerdidoCaptadoMilhoes: formatMillions(kpis.valorPerdidoCaptado),
      valorPerdidoFechado: kpis.valorPerdidoFechado,
      valorPerdidoFechadoMilhoes: formatMillions(kpis.valorPerdidoFechado),
    },
    desempenho: {
      editaisCaptados: kpis.captados,
      editaisParticipados: kpis.participados,
      editaisVencidos: kpis.vencidos,
      taxaParticipacao: kpis.taxaParticipacao,
      taxaParticipacaoFormatada: formatPercent(kpis.taxaParticipacao),
      taxaVitoria: kpis.taxaVitoria,
      taxaVitoriaFormatada: formatPercent(kpis.taxaVitoria),
    },
    noGo: {
      total: noGo.length,
      motivos: noGoBreakdown,
    },
    competitividade: {
      descontoMedioVencidos: descontoMedioVencidos,
      descontoMedioVencidosFormatado: formatPercent(descontoMedioVencidos),
      descontoMedioParticipados: descontoMedioParticipados,
      descontoMedioParticipadosFormatado: formatPercent(descontoMedioParticipados),
      competidores: competitors,
    },
    resultadoPorUf: ufResults,
    roteiro: scriptText,
  } satisfies Record<string, unknown>;

  return {
    periodLabel,
    closingLabel,
    filtered,
    scriptText,
    jsonText: JSON.stringify(structured, null, 2),
    structured,
  };
}
