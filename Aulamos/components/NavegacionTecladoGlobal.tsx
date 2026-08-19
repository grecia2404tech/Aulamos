import {
  usePathname,
  useRouter,
} from 'expo-router';

import {
  useEffect,
} from 'react';

import {
  Platform,
} from 'react-native';

import {
  useAccessibility,
} from '../contexts/AccessibilityContext';

import {
  registrarEventoInvestigacion,
} from '../services/investigacionService';


// =====================================================
// COMPONENTE GLOBAL DE NAVEGACIÓN POR TECLADO
// =====================================================

export default function NavegacionTecladoGlobal() {

  const {
    preferencias,
  } = useAccessibility();

  const router =
    useRouter();

  const pathname =
    usePathname();


  useEffect(() => {

    // =================================================
    // SOLO ACTUAR SI ESTÁ ACTIVADA
    // =================================================

    if (
      !preferencias.navegacionTeclado
    ) {
      return;
    }


    // =================================================
    // EN NATIVO NO EXISTE document
    // =================================================

    if (
      Platform.OS !== 'web'
      ||
      typeof document === 'undefined'
    ) {
      return;
    }


    const manejarTecla = (
      event: KeyboardEvent,
    ) => {

      // =================================================
      // ESCAPE = REGRESAR
      // =================================================

      if (
        event.key === 'Escape'
      ) {

        event.preventDefault();

        void registrarEventoInvestigacion({
          tipo_evento:
            'Navegacion',

          accion:
            'Regresar con teclado',

          modulo:
            'Navegación',

          pantalla:
            pathname,

          descripcion:
            'El usuario utilizó la tecla Escape para regresar.',

          tipo_interaccion:
            'Teclado',

          cantidad_clicks:
            0,

          cantidad_scroll:
            0,

          cantidad_teclas:
            1,

          duracion_segundos:
            0,
        });


        if (
          router.canGoBack()
        ) {
          router.back();
        }

        return;
      }


      // =================================================
      // TAB
      //
      // El navegador ya mueve el foco automáticamente.
      // Solo registramos el evento.
      // =================================================

      if (
        event.key === 'Tab'
      ) {

        void registrarEventoInvestigacion({
          tipo_evento:
            'Navegacion',

          accion:
            event.shiftKey
              ? 'Mover foco hacia atrás'
              : 'Mover foco hacia adelante',

          modulo:
            'Navegación',

          pantalla:
            pathname,

          descripcion:
            event.shiftKey
              ? 'El usuario utilizó Shift + Tab.'
              : 'El usuario utilizó Tab.',

          tipo_interaccion:
            'Teclado',

          cantidad_clicks:
            0,

          cantidad_scroll:
            0,

          cantidad_teclas:
            event.shiftKey
              ? 2
              : 1,

          duracion_segundos:
            0,
        });

        return;
      }


      // =================================================
      // ENTER / ESPACIO
      //
      // Los botones web ya responden al foco.
      // Registramos la interacción.
      // =================================================

      if (
        event.key === 'Enter'
        ||
        event.key === ' '
      ) {

        void registrarEventoInvestigacion({
          tipo_evento:
            'Navegacion',

          accion:
            'Activar elemento con teclado',

          modulo:
            'Navegación',

          pantalla:
            pathname,

          descripcion:
            `El usuario utilizó ${
              event.key === 'Enter'
                ? 'Enter'
                : 'Espacio'
            } sobre un elemento enfocado.`,

          tipo_interaccion:
            'Teclado',

          cantidad_clicks:
            0,

          cantidad_scroll:
            0,

          cantidad_teclas:
            1,

          duracion_segundos:
            0,
        });

        return;
      }


      // =================================================
      // FLECHAS
      // =================================================

      if (
        event.key === 'ArrowUp'
        ||
        event.key === 'ArrowDown'
        ||
        event.key === 'ArrowLeft'
        ||
        event.key === 'ArrowRight'
      ) {

        void registrarEventoInvestigacion({
          tipo_evento:
            'Navegacion',

          accion:
            'Navegar con flecha',

          modulo:
            'Navegación',

          pantalla:
            pathname,

          descripcion:
            `El usuario utilizó ${event.key}.`,

          tipo_interaccion:
            'Teclado',

          cantidad_clicks:
            0,

          cantidad_scroll:
            0,

          cantidad_teclas:
            1,

          duracion_segundos:
            0,
        });
      }
    };


    document.addEventListener(
      'keydown',
      manejarTecla,
    );


    return () => {

      document.removeEventListener(
        'keydown',
        manejarTecla,
      );
    };

  }, [
    preferencias.navegacionTeclado,
    pathname,
    router,
  ]);


  return null;
}