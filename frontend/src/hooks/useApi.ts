'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Query } from '@/lib/api';

interface Result<T> {
  key: string;
  version: number;
  data?: T;
  error?: string;
}

/**
 * Loads data from the API and tracks loading / error state.
 *
 *   const { data, loading, error, reload } = useApi<Paginated<Project>>('/projects', { page });
 *
 * - Pass `null` as the path to skip loading (e.g. until an id is known).
 * - `reload()` fetches again but keeps showing the current data meanwhile.
 */
export function useApi<T>(path: string | null, query: Query = {}) {
  const queryJson = JSON.stringify(query);
  const key = path ? `${path}?${queryJson}` : null;
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false; // ignore answers that arrive after the inputs changed

    api
      .get<T>(path, JSON.parse(queryJson) as Query)
      .then((data) => !cancelled && setResult({ key, version, data }))
      .catch((err: Error) => !cancelled && setResult({ key, version, error: err.message }));

    return () => {
      cancelled = true;
    };
  }, [path, key, queryJson, version]);

  const sameRequest = result !== null && result.key === key;
  const upToDate = sameRequest && result.version === version;

  return {
    data: sameRequest ? result.data : undefined,
    error: upToDate ? result.error : undefined,
    loading: key !== null && !upToDate,
    reload: useCallback(() => setVersion((v) => v + 1), []),
  };
}
