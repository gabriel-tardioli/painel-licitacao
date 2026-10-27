import { Edital, FaseEdital, editais as rawEditais } from "@/data/mockData";

export const STORAGE_KEY = "painel-licitacao.editais.importados.v1";

const validFases: FaseEdital[] = [
  "Venceu",
  "Perdeu",
  "NO-GO",
  "Suspenso",
  "Revogado",
  "Excluídos",
  "Aguardando Resultado",
  "Em Andamento",
];

const phaseMap: Record<string, FaseEdital> = {
  VENCEU: "Venceu",
  PERDEU: "Perdeu",
  "NO-GO": "NO-GO",
  NOGO: "NO-GO",
  SUSPENSO: "Suspenso",
  REVOGADO: "Revogado",
  EXCLUIDOS: "Excluídos",
  "EXCLUÍDOS": "Excluídos",
  "AGUARDANDO RESULTADO": "Aguardando Resultado",
  "EM ANDAMENTO": "Em Andamento",
};

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

function getByAliases(row: Record<string, unknown>, aliases: string[]): unknown {
  const entries = Object.entries(row);
  const normalizedAliases = aliases.map(normalizeKey);

  for (const [key, value] of entries) {
    if (normalizedAliases.includes(normalizeKey(key))) {
      return value;
    }
  }

  return undefined;
}

function parseBoolean(value: unknown): boolean {
  const text = cleanText(value).toLowerCase();
  return ["sim", "true", "1", "yes", "y"].includes(text);
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const text = cleanText(value)
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function excelDateToISO(serial: number): string {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  let totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  totalSeconds -= seconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  dateInfo.setUTCHours(hours);
  dateInfo.setUTCMinutes(minutes);
  dateInfo.setUTCSeconds(seconds);
  return dateInfo.toISOString().slice(0, 10);
}

function parseDate(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    return excelDateToISO(value);
  }

  const text = cleanText(value);
  if (!text) return "";

  const isoCandidate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoCandidate) return `${isoCandidate[1]}-${isoCandidate[2]}-${isoCandidate[3]}`;

  const brCandidate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brCandidate) return `${brCandidate[3]}-${brCandidate[2]}-${brCandidate[1]}`;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function parseFase(value: unknown, fallback?: unknown): FaseEdital {
  const primary = cleanText(value).toUpperCase();
  const secondary = cleanText(fallback).toUpperCase();
  const resolved = phaseMap[primary] || phaseMap[secondary];
  return resolved && validFases.includes(resolved) ? resolved : "Em Andamento";
}

export function sanitizeEditais(data: Edital[]): Edital[] {
  return data.filter((item) => {
    return item && item.id !== null && item.id !== undefined && cleanText(item.orgao) !== "" && cleanText(item.fase) !== "";
  });
}

export const defaultEditais: Edital[] = sanitizeEditais(rawEditais as Edital[]);

export function parseSpreadsheetRows(rows: Record<string, unknown>[]): Edital[] {
  return rows
    .map((row, index) => {
      const fase = parseFase(getByAliases(row, ["FASE"]), getByAliases(row, ["PARTICIPOU?", "PARTICIPOU"]));

      return {
        id: parseNumber(getByAliases(row, ["Nº", "N", "NO", "NUMERO"])) ?? index + 1,
        orgao: cleanText(getByAliases(row, ["ORGÃO", "ORGAO"])),
        numeroProcesso: cleanText(getByAliases(row, ["Nº DO PROCESSO", "N DO PROCESSO", "NUMERO DO PROCESSO"])),
        fase,
        recurso: cleanText(getByAliases(row, ["Recurso"])),
        decisaoRecurso: cleanText(getByAliases(row, ["Decisão de Recurso", "Decisao de Recurso"])),
        impugnacao: cleanText(getByAliases(row, ["Impugnação", "Impugnacao"])),
        decisaoImpugnacao: cleanText(getByAliases(row, ["Decisão Impugnação", "Decisao Impugnacao"])),
        tipo: cleanText(getByAliases(row, ["TIPO"])),
        abertura: parseDate(getByAliases(row, ["ABERTURA"])),
        valorFechado: parseNumber(getByAliases(row, ["VALOR FECHADO"])),
        empresaVencedora: cleanText(getByAliases(row, ["EMPRESA VENCEDORA"])) || null,
        valorEstimado: parseNumber(getByAliases(row, ["VALOR ESTIMADO"])),
        srp: cleanText(getByAliases(row, ["SRP"])),
        justificativas: cleanText(getByAliases(row, ["JUSTIFICATIVAS"])),
        objeto: cleanText(getByAliases(row, ["OBJETO"])),
        uf: cleanText(getByAliases(row, ["UF"])),
        regiao: cleanText(getByAliases(row, ["Região", "Regiao"])),
        admOs: cleanText(getByAliases(row, ["ADM/OS", "ADM OS"])),
        propostaPropria: parseNumber(getByAliases(row, ["PROPOSTA", "NOSSA PROPOSTA"])),
        participou: cleanText(getByAliases(row, ["PARTICIPOU?", "PARTICIPOU"])),
        mesesContrato: parseNumber(getByAliases(row, ["MESES CONTRATO"])),
        novaGestao: parseBoolean(getByAliases(row, ["Nova gestão?", "Nova gestao?"])),
        linkEdital: cleanText(getByAliases(row, ["Link do Edital", "Link Edital"])),
        atualContratada: cleanText(getByAliases(row, ["Atual Contratada"])),
      } as Edital;
    })
    .filter((item) => cleanText(item.orgao) !== "");
}
