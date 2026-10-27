import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Edital } from "@/data/mockData";
import { defaultEditais, sanitizeEditais, STORAGE_KEY } from "@/lib/editais";
import { fetchSharedDataset, isRemoteSyncEnabled, saveSharedDataset, type StoredPayload } from "@/lib/sharedDataApi";

interface EditaisDataContextValue {
  data: Edital[];
  fileName: string | null;
  importedAt: string | null;
  isUsingImportedData: boolean;
  setImportedData: (rows: Edital[], fileName?: string) => Promise<void>;
  resetData: () => Promise<void>;
  hasSharedSync: boolean;
  syncMode: "shared" | "local";
  isSyncing: boolean;
  syncError: string | null;
  refreshData: () => Promise<void>;
}

const EditaisDataContext = createContext<EditaisDataContextValue | undefined>(undefined);

function readLocalPayload(): StoredPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPayload;
  } catch (error) {
    console.error("Erro ao carregar base local:", error);
    return null;
  }
}

function writeLocalPayload(payload: StoredPayload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearLocalPayload() {
  localStorage.removeItem(STORAGE_KEY);
}

function sanitizePayload(payload: StoredPayload | null): StoredPayload | null {
  if (!payload) return null;
  const sanitized = sanitizeEditais(payload.data || []);
  return sanitized.length > 0
    ? {
        data: sanitized,
        fileName: payload.fileName ?? null,
        importedAt: payload.importedAt ?? null,
      }
    : null;
}

export function EditaisDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Edital[]>(defaultEditais);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importedAt, setImportedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  function applyPayload(payload: StoredPayload | null) {
    const sanitized = sanitizePayload(payload);
    if (!sanitized) {
      setData(defaultEditais);
      setFileName(null);
      setImportedAt(null);
      return;
    }

    setData(sanitized.data);
    setFileName(sanitized.fileName ?? null);
    setImportedAt(sanitized.importedAt ?? null);
  }

  async function refreshData() {
    setIsSyncing(true);
    setSyncError(null);

    const localPayload = sanitizePayload(readLocalPayload());
    if (localPayload) {
      applyPayload(localPayload);
    }

    if (!isRemoteSyncEnabled) {
      setIsSyncing(false);
      return;
    }

    try {
      const sharedPayload = sanitizePayload(await fetchSharedDataset());
      if (sharedPayload) {
        applyPayload(sharedPayload);
        writeLocalPayload(sharedPayload);
      } else if (localPayload) {
        applyPayload(localPayload);
      } else {
        applyPayload(null);
      }
    } catch (error) {
      console.error(error);
      setSyncError(error instanceof Error ? error.message : "Não foi possível sincronizar a base compartilhada.");
      if (!localPayload) {
        applyPayload(null);
      }
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  const setImportedData = async (rows: Edital[], nextFileName?: string) => {
    const sanitized = sanitizeEditais(rows);
    const importedAtValue = new Date().toISOString();
    const nextPayload: StoredPayload = {
      data: sanitized,
      fileName: nextFileName || null,
      importedAt: importedAtValue,
    };

    setIsSyncing(true);
    setSyncError(null);

    try {
      if (isRemoteSyncEnabled) {
        await saveSharedDataset(nextPayload);
      }
      applyPayload(nextPayload);
      writeLocalPayload(nextPayload);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Não foi possível atualizar a base compartilhada.";
      setSyncError(message);
      throw new Error(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetData = async () => {
    const nextPayload: StoredPayload = {
      data: defaultEditais,
      fileName: null,
      importedAt: null,
    };

    setIsSyncing(true);
    setSyncError(null);

    try {
      if (isRemoteSyncEnabled) {
        await saveSharedDataset(nextPayload);
      }
      setData(defaultEditais);
      setFileName(null);
      setImportedAt(null);
      clearLocalPayload();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Não foi possível restaurar a base padrão compartilhada.";
      setSyncError(message);
      throw new Error(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const value = useMemo(
    () => ({
      data,
      fileName,
      importedAt,
      isUsingImportedData: Boolean(fileName),
      setImportedData,
      resetData,
      hasSharedSync: isRemoteSyncEnabled,
      syncMode: (isRemoteSyncEnabled ? "shared" : "local") as "shared" | "local",
      isSyncing,
      syncError,
      refreshData,
    }),
    [data, fileName, importedAt, isSyncing, syncError],
  );

  return <EditaisDataContext.Provider value={value}>{children}</EditaisDataContext.Provider>;
}

export function useEditaisData() {
  const context = useContext(EditaisDataContext);
  if (!context) {
    throw new Error("useEditaisData deve ser usado dentro de EditaisDataProvider");
  }
  return context;
}
