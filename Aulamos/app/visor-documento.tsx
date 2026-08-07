import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  type ComponentProps,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  WebView,
  type WebViewMessageEvent,
} from 'react-native-webview';

import BotonAccesibilidad from '../components/BotonAccesibilidad';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { API_URL } from '../services/api';

type Parametro = string | string[] | undefined;

const obtenerParametro = (valor: Parametro) => {
  if (Array.isArray(valor)) {
    return valor[0];
  }

  return valor;
};

const construirUrlPublica = (ruta?: string) => {
  const rutaLimpia = ruta?.trim();

  if (!rutaLimpia) {
    return null;
  }

  if (/^https?:\/\//i.test(rutaLimpia)) {
    return rutaLimpia;
  }

  const servidor = API_URL.replace(/\/api\/?$/, '');

  return `${servidor}${
    rutaLimpia.startsWith('/')
      ? rutaLimpia
      : `/${rutaLimpia}`
  }`;
};

const obtenerExtension = (
  url: string | null,
  nombre: string
) => {
  const valor = `${url || ''} ${nombre}`
    .split('?')[0]
    .split('#')[0]
    .toLowerCase();

  const coincidencia = valor.match(
    /\.([a-z0-9]+)(?:\s|$)/
  );

  return coincidencia?.[1] || '';
};

const esDireccionPrivada = (url: string) => {
  try {
    const host = new URL(url).hostname.toLowerCase();

    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '10.0.2.2' ||
      host.endsWith('.local') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host)
    ) {
      return true;
    }

    const red172 = host.match(
      /^172\.(\d{1,2})\./
    );

    return red172
      ? Number(red172[1]) >= 16 &&
          Number(red172[1]) <= 31
      : false;
  } catch {
    return true;
  }
};

const crearHtmlPdf = (
  urlDocumento: string,
  colorFondo: string,
  colorTexto: string,
  colorPrimario: string
) => {
  const urlSegura = JSON.stringify(
    urlDocumento
  ).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
    />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        min-height: 100%;
        background: ${colorFondo};
        color: ${colorTexto};
        font-family: Arial, sans-serif;
      }
      #estado {
        min-height: 75vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        text-align: center;
        font-size: 16px;
        line-height: 1.5;
      }
      #paginas {
        width: 100%;
        padding: 12px;
      }
      .pagina {
        margin: 0 auto 16px;
        max-width: 1000px;
        overflow: hidden;
        border: 1px solid rgba(0, 0, 0, 0.18);
        border-radius: 8px;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
      canvas {
        display: block;
        width: 100%;
        height: auto;
      }
      .numero-pagina {
        padding: 7px;
        border-top: 1px solid #dddddd;
        background: #f7f7f7;
        color: #333333;
        text-align: center;
        font-size: 13px;
        font-weight: bold;
      }
      .error {
        color: #9b1c1c;
        border: 2px solid #9b1c1c;
        border-radius: 12px;
        background: #fff5f5;
      }
      .cargando { color: ${colorPrimario}; }
    </style>
  </head>
  <body>
    <div id="estado" class="cargando">
      Preparando el documento…
    </div>
    <main id="paginas" aria-label="Páginas del documento"></main>

    <script>
      function avisar(tipo, mensaje) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: tipo, message: mensaje || '' })
          );
        }
      }

      function mostrarError(mensaje) {
        var estado = document.getElementById('estado');
        estado.className = 'error';
        estado.textContent = mensaje;
        avisar('pdf-error', mensaje);
      }
    </script>

    <script
      src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
      onerror="mostrarError('No se pudo cargar el visor PDF. Comprueba la conexión a internet.')"
    ></script>

    <script>
      (async function () {
        try {
          if (!window.pdfjsLib) {
            throw new Error('El componente para leer PDF no está disponible.');
          }

          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          var documento = await window.pdfjsLib.getDocument({
            url: ${urlSegura},
            withCredentials: false
          }).promise;

          var contenedor = document.getElementById('paginas');
          var anchoDisponible = Math.max(
            document.documentElement.clientWidth - 26,
            280
          );

          for (var numero = 1; numero <= documento.numPages; numero += 1) {
            var pagina = await documento.getPage(numero);
            var vistaBase = pagina.getViewport({ scale: 1 });
            var escala = Math.min(
              anchoDisponible / vistaBase.width,
              2
            );
            var vista = pagina.getViewport({ scale: escala });
            var densidad = Math.min(window.devicePixelRatio || 1, 2);

            var bloque = document.createElement('section');
            bloque.className = 'pagina';
            bloque.setAttribute(
              'aria-label',
              'Página ' + numero + ' de ' + documento.numPages
            );

            var lienzo = document.createElement('canvas');
            lienzo.width = Math.floor(vista.width * densidad);
            lienzo.height = Math.floor(vista.height * densidad);
            lienzo.style.width = Math.floor(vista.width) + 'px';
            lienzo.style.height = Math.floor(vista.height) + 'px';

            var etiqueta = document.createElement('div');
            etiqueta.className = 'numero-pagina';
            etiqueta.textContent =
              'Página ' + numero + ' de ' + documento.numPages;

            bloque.appendChild(lienzo);
            bloque.appendChild(etiqueta);
            contenedor.appendChild(bloque);

            var contexto = lienzo.getContext('2d');
            await pagina.render({
              canvasContext: contexto,
              viewport: vista,
              transform: densidad === 1
                ? null
                : [densidad, 0, 0, densidad, 0, 0]
            }).promise;
          }

          document.getElementById('estado').style.display = 'none';
          avisar('pdf-ready', String(documento.numPages));
        } catch (error) {
          mostrarError(
            error && error.message
              ? error.message
              : 'No se pudo mostrar el PDF.'
          );
        }
      })();
    </script>
  </body>
</html>`;
};

export default function VisorDocumentoScreen() {
  const parametros = useLocalSearchParams<{
    url?: Parametro;
    url_archivo?: Parametro;
    nombre_archivo?: Parametro;
    titulo?: Parametro;
  }>();

  const rutaArchivo =
    obtenerParametro(parametros.url_archivo) ||
    obtenerParametro(parametros.url);

  const nombreArchivo =
    obtenerParametro(parametros.nombre_archivo) ||
    obtenerParametro(parametros.titulo) ||
    'Documento';

  const titulo =
    obtenerParametro(parametros.titulo) ||
    'Visor de documento';

  const urlDocumento = construirUrlPublica(
    rutaArchivo
  );

  const {
    colores,
    escalaTexto,
  } = useAccessibility();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(
    null
  );
  const [claveVisor, setClaveVisor] = useState(0);

  const extension = obtenerExtension(
    urlDocumento,
    nombreArchivo
  );

  const esPdf = extension === 'pdf';

  const esOffice = [
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
  ].includes(extension);

  const officeLocalNoCompatible = Boolean(
    urlDocumento &&
      esOffice &&
      esDireccionPrivada(urlDocumento)
  );

  const urlParaWebView = useMemo(() => {
    if (!urlDocumento) {
      return null;
    }

    if (esOffice && !officeLocalNoCompatible) {
      return (
        'https://view.officeapps.live.com/op/embed.aspx?src=' +
        encodeURIComponent(urlDocumento)
      );
    }

    return urlDocumento;
  }, [
    esOffice,
    officeLocalNoCompatible,
    urlDocumento,
  ]);

  const htmlPdf = useMemo(() => {
    if (!urlDocumento || !esPdf) {
      return null;
    }

    return crearHtmlPdf(
      urlDocumento,
      colores.fondo,
      colores.texto,
      colores.primario
    );
  }, [
    colores.fondo,
    colores.primario,
    colores.texto,
    esPdf,
    urlDocumento,
  ]);

  const abrirExterno = async () => {
    if (!urlDocumento) {
      Alert.alert(
        'Documento no disponible',
        'No se recibió la ruta del archivo.'
      );
      return;
    }

    try {
      await Linking.openURL(urlDocumento);
    } catch (errorApertura) {
      console.error(
        'Error al abrir documento:',
        errorApertura
      );

      Alert.alert(
        'No se pudo abrir el documento',
        'Comprueba que el backend esté encendido y que el archivo exista.'
      );
    }
  };

  const reintentar = () => {
    setError(null);
    setCargando(true);
    setClaveVisor((valor) => valor + 1);
  };

  const recibirMensaje = (
    evento: WebViewMessageEvent
  ) => {
    try {
      const mensaje = JSON.parse(
        evento.nativeEvent.data
      ) as {
        type?: string;
        message?: string;
      };

      if (mensaje.type === 'pdf-ready') {
        setCargando(false);
        setError(null);
      }

      if (mensaje.type === 'pdf-error') {
        setCargando(false);
        setError(
          mensaje.message ||
            'No se pudo mostrar el PDF.'
        );
      }
    } catch {
      // Se ignoran mensajes que no pertenecen al visor PDF.
    }
  };

  const mostrarVisor = Boolean(
    urlParaWebView &&
      !officeLocalNoCompatible
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colores.fondo },
      ]}
    >
      <View
        style={[
          styles.encabezado,
          {
            backgroundColor: colores.fondo,
            borderBottomColor: colores.borde,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.botonEncabezado,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colores.texto}
          />
        </TouchableOpacity>

        <View style={styles.textosEncabezado}>
          <Text
            style={[
              styles.titulo,
              {
                color: colores.texto,
                fontSize: 18 * escalaTexto,
              },
            ]}
            accessibilityRole="header"
            numberOfLines={1}
          >
            {titulo}
          </Text>

          <Text
            style={[
              styles.subtitulo,
              {
                color: colores.textoSecundario,
                fontSize: 10 * escalaTexto,
              },
            ]}
            numberOfLines={1}
          >
            {nombreArchivo}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.botonEncabezado,
            {
              backgroundColor: colores.tarjeta,
              borderColor: colores.borde,
            },
          ]}
          onPress={() => void abrirExterno()}
          accessibilityRole="button"
          accessibilityLabel="Abrir documento en otra aplicación"
        >
          <Ionicons
            name="open-outline"
            size={22}
            color={colores.primario}
          />
        </TouchableOpacity>

        <BotonAccesibilidad />
      </View>

      {!urlDocumento ? (
        <EstadoDocumento
          icono="document-text-outline"
          titulo="Documento no disponible"
          mensaje="No se recibió la ruta del archivo. Regresa e intenta abrir nuevamente el recurso."
          textoBoton="Regresar"
          onPress={() => router.back()}
          colores={colores}
          escalaTexto={escalaTexto}
        />
      ) : officeLocalNoCompatible ? (
        <EstadoDocumento
          icono="desktop-outline"
          titulo="Vista previa no disponible"
          mensaje="Los archivos de Word, Excel o PowerPoint necesitan una dirección pública para mostrarse en el visor. Mientras el backend use una IP local, ábrelo con una aplicación compatible."
          textoBoton="Abrir documento"
          onPress={() => void abrirExterno()}
          colores={colores}
          escalaTexto={escalaTexto}
        />
      ) : mostrarVisor ? (
        <View style={styles.contenedorVisor}>
          <WebView
            key={claveVisor}
            source={
              esPdf && htmlPdf
                ? {
                    html: htmlPdf,
                    baseUrl: urlDocumento,
                  }
                : { uri: urlParaWebView! }
            }
            style={{ backgroundColor: colores.fondo }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            onMessage={recibirMensaje}
            onLoadStart={() => {
              setCargando(true);
              setError(null);
            }}
            onLoadEnd={() => {
              if (!esPdf) {
                setCargando(false);
              }
            }}
            onError={() => {
              setCargando(false);
              setError(
                'No se pudo cargar el documento. Comprueba que el backend esté encendido.'
              );
            }}
            onHttpError={(evento) => {
              setCargando(false);
              setError(
                `El servidor respondió con el estado ${evento.nativeEvent.statusCode}.`
              );
            }}
            accessibilityLabel={`Visor del documento ${nombreArchivo}`}
          />

          {cargando && !error ? (
            <View
              style={[
                styles.superposicion,
                { backgroundColor: colores.fondo },
              ]}
            >
              <ActivityIndicator
                size="large"
                color={colores.primario}
              />
              <Text
                style={[
                  styles.textoCarga,
                  {
                    color: colores.texto,
                    fontSize: 13 * escalaTexto,
                  },
                ]}
              >
                Cargando documento…
              </Text>
            </View>
          ) : null}

          {error ? (
            <View
              style={[
                styles.superposicion,
                { backgroundColor: colores.fondo },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={52}
                color="#B42318"
              />
              <Text
                style={[
                  styles.tituloError,
                  {
                    color: colores.texto,
                    fontSize: 17 * escalaTexto,
                  },
                ]}
              >
                No se pudo mostrar
              </Text>
              <Text
                style={[
                  styles.mensajeError,
                  {
                    color: colores.textoSecundario,
                    fontSize: 12 * escalaTexto,
                  },
                ]}
              >
                {error}
              </Text>

              <View style={styles.filaBotones}>
                <TouchableOpacity
                  style={[
                    styles.botonSecundario,
                    { borderColor: colores.primario },
                  ]}
                  onPress={reintentar}
                  accessibilityRole="button"
                  accessibilityLabel="Reintentar cargar el documento"
                >
                  <Text
                    style={[
                      styles.textoBotonSecundario,
                      {
                        color: colores.primario,
                        fontSize: 12 * escalaTexto,
                      },
                    ]}
                  >
                    Reintentar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botonPrimario,
                    { backgroundColor: colores.primario },
                  ]}
                  onPress={() => void abrirExterno()}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir documento en otra aplicación"
                >
                  <Text
                    style={[
                      styles.textoBotonPrimario,
                      { fontSize: 12 * escalaTexto },
                    ]}
                  >
                    Abrir fuera
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

type ColoresAccesibles = ReturnType<
  typeof useAccessibility
>['colores'];

function EstadoDocumento({
  icono,
  titulo,
  mensaje,
  textoBoton,
  onPress,
  colores,
  escalaTexto,
}: {
  icono: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  mensaje: string;
  textoBoton: string;
  onPress: () => void;
  colores: ColoresAccesibles;
  escalaTexto: number;
}) {
  return (
    <View style={styles.estadoDocumento}>
      <View
        style={[
          styles.iconoContenedor,
          {
            backgroundColor: colores.fondoPrimario,
            borderColor: colores.borde,
          },
        ]}
      >
        <Ionicons
          name={icono}
          size={54}
          color={colores.primario}
        />
      </View>

      <Text
        style={[
          styles.tituloEstado,
          {
            color: colores.texto,
            fontSize: 18 * escalaTexto,
          },
        ]}
      >
        {titulo}
      </Text>

      <Text
        style={[
          styles.mensajeEstado,
          {
            color: colores.textoSecundario,
            fontSize: 13 * escalaTexto,
          },
        ]}
      >
        {mensaje}
      </Text>

      <TouchableOpacity
        style={[
          styles.botonEstado,
          { backgroundColor: colores.primario },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={textoBoton}
      >
        <Text
          style={[
            styles.textoBotonPrimario,
            { fontSize: 13 * escalaTexto },
          ]}
        >
          {textoBoton}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  encabezado: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  botonEncabezado: {
    width: 44,
    height: 44,
    marginRight: 7,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textosEncabezado: {
    flex: 1,
    marginHorizontal: 4,
  },
  titulo: {
    fontWeight: '800',
  },
  subtitulo: {
    marginTop: 3,
  },
  contenedorVisor: {
    flex: 1,
    position: 'relative',
  },
  superposicion: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textoCarga: {
    marginTop: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tituloError: {
    marginTop: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  mensajeError: {
    maxWidth: 330,
    marginTop: 8,
    lineHeight: 20,
    textAlign: 'center',
  },
  filaBotones: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSecundario: {
    minHeight: 48,
    marginRight: 10,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonSecundario: {
    fontWeight: '900',
  },
  botonPrimario: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonPrimario: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  estadoDocumento: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconoContenedor: {
    width: 100,
    height: 100,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloEstado: {
    marginTop: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  mensajeEstado: {
    maxWidth: 340,
    marginTop: 9,
    lineHeight: 21,
    textAlign: 'center',
  },
  botonEstado: {
    minHeight: 50,
    marginTop: 22,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});