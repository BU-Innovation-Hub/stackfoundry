import { useEffect, useState } from 'react';
import { api } from '../services/apiClient';

interface HealthResponse {
  status: string;
  timestamp: string;
}

export const useHealth = () => {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<HealthResponse>('/health')
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
};
