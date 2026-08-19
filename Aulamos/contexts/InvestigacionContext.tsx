import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  obtenerPruebasInvestigacion,
  PruebaInvestigacion,
} from '../services/investigadorService';

type InvestigacionContextType = {
  pruebas: PruebaInvestigacion[];

  pruebaSeleccionada:
    PruebaInvestigacion | null;

  idPruebaSeleccionada:
    number | undefined;

  cargandoPruebas: boolean;

  seleccionarPrueba: (
    prueba: PruebaInvestigacion,
  ) => Promise<void>;

  recargarPruebas: () => Promise<void>;
};

const InvestigacionContext =
  createContext<InvestigacionContextType | undefined>(
    undefined,
  );

type Props = {
  children: ReactNode;
};

const STORAGE_KEY =
  'investigacion_prueba_seleccionada';

export function InvestigacionProvider({
  children,
}: Props) {
  const [pruebas, setPruebas] =
    useState<PruebaInvestigacion[]>([]);

  const [
    pruebaSeleccionada,
    setPruebaSeleccionada,
  ] =
    useState<PruebaInvestigacion | null>(
      null,
    );

  const [
    cargandoPruebas,
    setCargandoPruebas,
  ] = useState(true);

  const cargarPruebas = async () => {
    try {
      setCargandoPruebas(true);

      const lista =
        await obtenerPruebasInvestigacion();

      setPruebas(lista);

      if (lista.length === 0) {
        setPruebaSeleccionada(null);

        await AsyncStorage.removeItem(
          STORAGE_KEY,
        );

        return;
      }

      const idGuardadoTexto =
        await AsyncStorage.getItem(
          STORAGE_KEY,
        );

      const idGuardado =
        idGuardadoTexto
          ? Number(idGuardadoTexto)
          : 0;

      const pruebaGuardada =
        lista.find(
          (prueba) =>
            prueba.id_prueba ===
            idGuardado,
        );

      if (pruebaGuardada) {
        setPruebaSeleccionada(
          pruebaGuardada,
        );

        return;
      }

      const pruebaActiva =
        lista.find(
          (prueba) =>
            prueba.estado ===
            'Activa',
        );

      const pruebaInicial =
        pruebaActiva ??
        lista[0];

      setPruebaSeleccionada(
        pruebaInicial,
      );

      await AsyncStorage.setItem(
        STORAGE_KEY,
        String(
          pruebaInicial.id_prueba,
        ),
      );
    } catch (error) {
      console.error(
        'Error al cargar pruebas de investigación:',
        error,
      );
    } finally {
      setCargandoPruebas(false);
    }
  };

  useEffect(() => {
    cargarPruebas();
  }, []);

  const seleccionarPrueba = async (
    prueba: PruebaInvestigacion,
  ) => {
    setPruebaSeleccionada(prueba);

    await AsyncStorage.setItem(
      STORAGE_KEY,
      String(prueba.id_prueba),
    );
  };

  return (
    <InvestigacionContext.Provider
      value={{
        pruebas,

        pruebaSeleccionada,

        idPruebaSeleccionada:
          pruebaSeleccionada?.id_prueba,

        cargandoPruebas,

        seleccionarPrueba,

        recargarPruebas:
          cargarPruebas,
      }}
    >
      {children}
    </InvestigacionContext.Provider>
  );
}

export function useInvestigacion() {
  const context =
    useContext(
      InvestigacionContext,
    );

  if (!context) {
    throw new Error(
      'useInvestigacion debe utilizarse dentro de InvestigacionProvider.',
    );
  }

  return context;
}