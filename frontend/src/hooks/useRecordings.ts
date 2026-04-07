import { useState, useCallback, useEffect } from "react";
import type { Recording } from "../types";
import {
  fetchRecordings,
  createRecording as apiCreate,
  updateRecording as apiUpdate,
  deleteRecording as apiDelete,
} from "../services/api";

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecordings(await fetchRecordings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (title: string) => {
    const rec = await apiCreate(title);
    setRecordings((prev) => [rec, ...prev]);
    return rec;
  }, []);

  const update = useCallback(async (id: number, title: string) => {
    const updated = await apiUpdate(id, title);
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updated } : r))
    );
  }, []);

  const remove = useCallback(async (id: number) => {
    await apiDelete(id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { recordings, loading, refresh, create, update, remove };
}
