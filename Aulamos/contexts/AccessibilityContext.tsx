import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type TamanoTexto =
  | 'Normal'
  | 'Grande'
  | 'Muy Grande';

// NUEVO:
// Colores que podrá seleccionar el usuario
// cuando active el alto contraste.
export type ColorContraste =
  | 'Amarillo'
  | 'Verde'
  | 'Blanco';

export type PreferenciasAccesibilidad = {
  altoContraste: boolean;

  // NUEVO
  colorContraste: ColorContraste;

  modoOscuro: boolean;
  tamanoTexto: TamanoTexto;
  lectorPantalla: boolean;
  subtitulos: boolean;
  navegacionTeclado: boolean;
};

type ColoresAccesibilidad = {
  fondo: string;
  tarjeta: string;
  texto: string;
  textoSecundario: string;
  borde: string;
  primario: string;
  fondoPrimario: string;
  exito: string;
  peligro: string;
};

type AccessibilityContextType = {
  preferencias: PreferenciasAccesibilidad;
  colores: ColoresAccesibilidad;
  escalaTexto: number;
  cargandoPreferencias: boolean;

  actualizarPreferencia: <
    K extends keyof PreferenciasAccesibilidad,
  >(
    campo: K,
    valor: PreferenciasAccesibilidad[K]
  ) => Promise<void>;

  restablecerPreferencias: () => Promise<void>;
  leerTexto: (texto: string) => void;
  detenerLectura: () => void;
};

const STORAGE_KEY =
  'aulamos_preferencias_accesibilidad';

export const PREFERENCIAS_PREDETERMINADAS: PreferenciasAccesibilidad =
  {
    altoContraste: false,

    // NUEVO:
    // Este será el color inicial cuando
    // el usuario active alto contraste.
    colorContraste: 'Amarillo',

    modoOscuro: false,
    tamanoTexto: 'Normal',
    lectorPantalla: false,
    subtitulos: false,
    navegacionTeclado: false,
  };

const AccessibilityContext =
  createContext<AccessibilityContextType | null>(
    null
  );

type Props = {
  children: ReactNode;
};

export function AccessibilityProvider({
  children,
}: Props) {
  const [preferencias, setPreferencias] =
    useState<PreferenciasAccesibilidad>(
      PREFERENCIAS_PREDETERMINADAS
    );

  const preferenciasRef =
    useRef<PreferenciasAccesibilidad>(
      PREFERENCIAS_PREDETERMINADAS
    );

  const [
    cargandoPreferencias,
    setCargandoPreferencias,
  ] = useState(true);

  useEffect(() => {
    cargarPreferenciasLocales();
  }, []);

  const cargarPreferenciasLocales = async () => {
    try {
      const preferenciasGuardadas =
        await AsyncStorage.getItem(STORAGE_KEY);

      if (!preferenciasGuardadas) {
        return;
      }

      const datos = JSON.parse(
        preferenciasGuardadas
      ) as Partial<PreferenciasAccesibilidad>;

      /*
       * Si el usuario ya tenía preferencias
       * guardadas antes de agregar colorContraste,
       * se combinarán con las nuevas preferencias
       * predeterminadas.
       */
      const preferenciasCompletas: PreferenciasAccesibilidad =
        {
          ...PREFERENCIAS_PREDETERMINADAS,
          ...datos,
        };

      preferenciasRef.current =
        preferenciasCompletas;

      setPreferencias(
        preferenciasCompletas
      );
    } catch (error) {
      console.error(
        'Error al cargar las preferencias:',
        error
      );
    } finally {
      setCargandoPreferencias(false);
    }
  };

  const guardarLocalmente = async (
    nuevasPreferencias: PreferenciasAccesibilidad
  ) => {
    preferenciasRef.current =
      nuevasPreferencias;

    setPreferencias(nuevasPreferencias);

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nuevasPreferencias)
    );

    /*
     * Esta marca indica que existen cambios locales
     * pendientes de enviar a la base de datos.
     */
    await AsyncStorage.setItem(
      'aulamos_accesibilidad_pendiente',
      'true'
    );
  };

  const actualizarPreferencia = async <
    K extends keyof PreferenciasAccesibilidad,
  >(
    campo: K,
    valor: PreferenciasAccesibilidad[K]
  ) => {
    try {
      const nuevasPreferencias = {
        ...preferenciasRef.current,
        [campo]: valor,
      };

      await guardarLocalmente(
        nuevasPreferencias
      );
    } catch (error) {
      console.error(
        'Error al guardar la preferencia:',
        error
      );
    }
  };

  const restablecerPreferencias =
    async () => {
      try {
        detenerLectura();

        await guardarLocalmente({
          ...PREFERENCIAS_PREDETERMINADAS,
        });
      } catch (error) {
        console.error(
          'Error al restablecer preferencias:',
          error
        );
      }
    };

  const leerTexto = (texto: string) => {
    if (!texto.trim()) {
      return;
    }

    Speech.stop();

    Speech.speak(texto, {
      language: 'es-MX',
      rate: 0.9,
      pitch: 1,
    });
  };

  const detenerLectura = () => {
    Speech.stop();
  };

  const escalaTexto = useMemo(() => {
    switch (preferencias.tamanoTexto) {
      case 'Grande':
        return 1.4;

      case 'Muy Grande':
        return 2;

      default:
        return 1;
    }
  }, [preferencias.tamanoTexto]);

  /*
   * NUEVO:
   * Obtiene el color seleccionado
   * para los elementos destacados.
   */
  const colorDestacado =
    useMemo(() => {
      switch (
        preferencias.colorContraste
      ) {
        case 'Verde':
          return '#00FF66';

        case 'Blanco':
          return '#FFFFFF';

        case 'Amarillo':
        default:
          return '#FFD600';
      }
    }, [preferencias.colorContraste]);

  const colores = useMemo(
    () => {
      /*
       * El alto contraste tiene prioridad
       * sobre el modo oscuro.
       */
      if (preferencias.altoContraste) {
        return {
          // Siempre negro
          fondo: '#000000',
          tarjeta: '#000000',

          // Siempre blanco
          texto: '#FFFFFF',
          textoSecundario: '#FFFFFF',

          // Cambia según la elección
          borde: colorDestacado,
          primario: colorDestacado,

          // Mantiene fondos destacados oscuros
          fondoPrimario: '#1A1A1A',

          // Estados
          exito: '#00FF85',
          peligro: '#FF5252',
        };
      }

      if (preferencias.modoOscuro) {
        return {
          fondo: '#111827',
          tarjeta: '#1F2937',
          texto: '#F8FAFC',
          textoSecundario: '#CBD5E1',
          borde: '#475569',
          primario: '#8B7CFF',
          fondoPrimario: '#312E81',
          exito: '#4ADE80',
          peligro: '#F87171',
        };
      }

      return {
        fondo: '#F8FAFC',
        tarjeta: '#FFFFFF',
        texto: '#111827',
        textoSecundario: '#64748B',
        borde: '#CBD5E1',
        primario: '#6D5DFB',
        fondoPrimario: '#F3E8FF',
        exito: '#16A34A',
        peligro: '#DC2626',
      };
    },
    [
      preferencias.altoContraste,
      preferencias.modoOscuro,
      colorDestacado,
    ]
  );

  return (
    <AccessibilityContext.Provider
      value={{
        preferencias,
        colores,
        escalaTexto,
        cargandoPreferencias,
        actualizarPreferencia,
        restablecerPreferencias,
        leerTexto,
        detenerLectura,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const contexto = useContext(
    AccessibilityContext
  );

  if (!contexto) {
    throw new Error(
      'useAccessibility debe utilizarse dentro de AccessibilityProvider'
    );
  }

  return contexto;
}