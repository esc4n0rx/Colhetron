// hooks/usePreSeparacaoData.ts (NOVO ARQUIVO)
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface PreSeparacaoItem {
  tipoSepar: string;
  material: string;
  totalGeral: number;
  [key: string]: string | number; // Para as colunas de zona dinâmicas
}

export function usePreSeparacaoData() {
  const [data, setData] = useState<PreSeparacaoItem[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('colhetron_token');
      if (!token) {
        throw new Error('Token de autorização não encontrado');
      }

      const response = await fetch('/api/separations/pre-separation-summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao buscar dados de pré-separação');
      }

      const result = await response.json();
      setData(result.data || []);
      setZones(result.zones || []);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, zones, isLoading, error, refetch: fetchData };
}