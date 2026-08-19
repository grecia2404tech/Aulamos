import { useCallback, useEffect, useState } from 'react';

export function useConsultaInvestigador<T>(consulta: () => Promise<T>) {
  const [datos, setDatos] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async (esRecarga = false) => {
    if (esRecarga) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const respuesta = await consulta();
      setDatos(respuesta);
    } catch (errorConsulta) {
      setError(
        errorConsulta instanceof Error
          ? errorConsulta.message
          : 'No se pudo consultar la información.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [consulta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return {
    datos,
    loading,
    refreshing,
    error,
    reintentar: () => cargar(false),
    recargar: () => cargar(true),
  };
}
