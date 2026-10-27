import type { Edital } from "@/data/mockData";

export interface StoredPayload {
  data: Edital[];
  fileName?: string | null;
  importedAt?: string | null;
}

type RemoteRow = {
  id: string;
  data: Edital[];
  file_name: string | null;
  imported_at: string | null;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const DATA_TABLE = import.meta.env.VITE_SUPABASE_DATA_TABLE ?? "dashboard_data_source";
const DATA_ROW_ID = import.meta.env.VITE_SUPABASE_DATA_ROW_ID ?? "global-active";

export const isRemoteSyncEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function getHeaders(extra?: HeadersInit): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function getTableUrl(query = "") {
  return `${SUPABASE_URL}/rest/v1/${DATA_TABLE}${query}`;
}

function normalizePayload(row: RemoteRow | null | undefined): StoredPayload | null {
  if (!row) return null;
  return {
    data: Array.isArray(row.data) ? row.data : [],
    fileName: row.file_name ?? null,
    importedAt: row.imported_at ?? null,
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string; hint?: string };
    return body.message || body.error || body.hint || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

export async function fetchSharedDataset(): Promise<StoredPayload | null> {
  if (!isRemoteSyncEnabled) return null;

  const query = `?id=eq.${encodeURIComponent(DATA_ROW_ID)}&select=id,data,file_name,imported_at&limit=1`;
  const response = await fetch(getTableUrl(query), {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Não foi possível carregar a base compartilhada: ${await parseError(response)}`);
  }

  const rows = (await response.json()) as RemoteRow[];
  return normalizePayload(rows[0]);
}

export async function saveSharedDataset(payload: StoredPayload): Promise<void> {
  if (!isRemoteSyncEnabled) return;

  const response = await fetch(getTableUrl("?on_conflict=id"), {
    method: "POST",
    headers: getHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify([
      {
        id: DATA_ROW_ID,
        data: payload.data,
        file_name: payload.fileName ?? null,
        imported_at: payload.importedAt ?? null,
        updated_at: new Date().toISOString(),
      },
    ]),
  });

  if (!response.ok) {
    throw new Error(`Não foi possível salvar a base compartilhada: ${await parseError(response)}`);
  }
}
