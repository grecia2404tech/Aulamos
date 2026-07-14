import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TipoRecurso = 'Video' | 'PDF' | 'Documento' | null;

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function CrearRecursoScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [tipoRecurso, setTipoRecurso] =
    useState<TipoRecurso>(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] =
    useState('');

  const [archivoSeleccionado, setArchivoSeleccionado] =
    useState(false);

  const margenHorizontal =
    width < 360 ? 14 : width < 400 ? 18 : 22;

  const anchoContenido = Math.min(
    width - margenHorizontal * 2,
    520
  );

  const seleccionarArchivo = () => {
    setArchivoSeleccionado(true);

    Alert.alert(
      'Seleccionar archivo',
      'Después puedes conectar esta sección con expo-document-picker.'
    );
  };

  const publicarRecurso = () => {
    if (!tipoRecurso) {
      Alert.alert(
        'Tipo de recurso requerido',
        'Selecciona Video, PDF o Documento.'
      );

      return;
    }

    if (!titulo.trim()) {
      Alert.alert(
        'Título requerido',
        'Escribe el título del recurso.'
      );

      return;
    }

    if (!archivoSeleccionado) {
      Alert.alert(
        'Archivo requerido',
        'Selecciona un archivo antes de publicar.'
      );

      return;
    }

    Alert.alert(
      'Recurso publicado',
      'El recurso se publicó correctamente.',
      [
        {
          text: 'Aceptar',
          onPress: () =>
            router.replace(
              '/inicio-docente' as never
            ),
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 8,
              paddingBottom:
                100 +
                Math.max(insets.bottom, 8),
            },
          ]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View
            style={[
              styles.contentContainer,
              {
                width: anchoContenido,
              },
            ]}
          >
            {/* Encabezado */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Regresar"
              >
                <Ionicons
                  name="arrow-back"
                  size={23}
                  color="#273449"
                />
              </TouchableOpacity>

              <View style={styles.headerText}>
                <Text style={styles.title}>
                  Crear Recurso
                </Text>

                <Text style={styles.subtitle}>
                  Comparte material para tus
                  estudiantes
                </Text>
              </View>

              <TouchableOpacity
                style={styles.headerButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Opciones de accesibilidad"
              >
                <Ionicons
                  name="accessibility"
                  size={24}
                  color="#7C3AED"
                />
              </TouchableOpacity>
            </View>

            {/* Tipo de recurso */}
            <Text style={styles.sectionTitle}>
              Tipo de recurso
            </Text>

            <ResourceOption
              title="Video"
              description="Sube un video"
              icon="videocam"
              iconBackground="#DDF8F4"
              iconColor="#34C8BA"
              selected={tipoRecurso === 'Video'}
              onPress={() =>
                setTipoRecurso('Video')
              }
            />

            <ResourceOption
              title="PDF"
              description="Sube un archivo PDF"
              icon="document-text"
              iconBackground="#FFE5E8"
              iconColor="#FF5263"
              selected={tipoRecurso === 'PDF'}
              onPress={() =>
                setTipoRecurso('PDF')
              }
            />

            <ResourceOption
              title="Documentos"
              description="Sube un documento Word, PDF, etc."
              icon="document"
              iconBackground="#ECE8FF"
              iconColor="#7059F5"
              selected={
                tipoRecurso === 'Documento'
              }
              onPress={() =>
                setTipoRecurso('Documento')
              }
            />

            {/* Información */}
            <Text
              style={[
                styles.sectionTitle,
                styles.informationTitle,
              ]}
            >
              Información del recurso
            </Text>

            <Text style={styles.label}>
              Título del recurso
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ej. La fotosíntesis"
              placeholderTextColor="#9CA3AF"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={150}
              returnKeyType="next"
              accessibilityLabel="Título del recurso"
            />

            <Text style={styles.label}>
              Descripción (Opcional)
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
              placeholder="Describe brevemente el contenido"
              placeholderTextColor="#9CA3AF"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              textAlignVertical="top"
              maxLength={500}
              accessibilityLabel="Descripción del recurso"
            />

            {/* Selector de archivo */}
            <TouchableOpacity
              style={[
                styles.uploadBox,
                archivoSeleccionado &&
                  styles.uploadBoxSelected,
              ]}
              onPress={seleccionarArchivo}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar archivo"
            >
              <Ionicons
                name={
                  archivoSeleccionado
                    ? 'checkmark-circle'
                    : 'cloud-upload-outline'
                }
                size={36}
                color={
                  archivoSeleccionado
                    ? '#2563EB'
                    : '#1F2937'
                }
              />

              <Text style={styles.uploadText}>
                {archivoSeleccionado
                  ? 'Archivo seleccionado correctamente'
                  : 'Toca para seleccionar o arrastra tu archivo aquí'}
              </Text>

              <Text style={styles.uploadLimit}>
                Máx. 200 MB
              </Text>
            </TouchableOpacity>

            {/* Acciones */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text
                  style={styles.cancelButtonText}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.publishButton}
                onPress={publicarRecurso}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Publicar recurso"
              >
                <Text
                  style={styles.publishButtonText}
                >
                  Publicar recurso
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Navegación inferior */}
        <View
          style={[
            styles.bottomNavigation,
            {
              height:
                66 +
                Math.max(insets.bottom, 5),

              paddingBottom: Math.max(
                insets.bottom,
                5
              ),
            },
          ]}
        >
          <View
            style={[
              styles.bottomContent,
              {
                width: anchoContenido,
              },
            ]}
          >
            <BottomItem
              icon="home-outline"
              activeIcon="home"
              label="Inicio"
              onPress={() =>
                router.replace(
                  '/inicio-docente' as never
                )
              }
            />

            <BottomItem
              icon="book-outline"
              activeIcon="book"
              label="Recursos"
              active
              onPress={() => {}}
            />

            <BottomItem
              icon="reader-outline"
              activeIcon="reader"
              label="Actividades"
              onPress={() =>
                router.push(
                  '/actividades-docente' as never
                )
              }
            />

            <BottomItem
              icon="document-text-outline"
              activeIcon="document-text"
              label="Evaluaciones"
              onPress={() =>
                router.push(
                  '/evaluaciones-docente' as never
                )
              }
            />

            <BottomItem
              icon="menu-outline"
              activeIcon="menu"
              label="Más"
              onPress={() =>
                router.push(
                  '/menu-docente' as never
                )
              }
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

type ResourceOptionProps = {
  title: string;
  description: string;
  icon: IoniconName;
  iconBackground: string;
  iconColor: string;
  selected: boolean;
  onPress: () => void;
};

function ResourceOption({
  title,
  description,
  icon,
  iconBackground,
  iconColor,
  selected,
  onPress,
}: ResourceOptionProps) {
  return (
    <TouchableOpacity
      style={[
        styles.resourceCard,
        selected &&
          styles.resourceCardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      accessibilityLabel={`${title}. ${description}`}
    >
      <View
        style={[
          styles.resourceIconBox,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={iconColor}
        />
      </View>

      <View style={styles.resourceTextContainer}>
        <Text style={styles.resourceTitle}>
          {title}
        </Text>

        <Text
          style={styles.resourceDescription}
        >
          {description}
        </Text>
      </View>

      {selected && (
        <Ionicons
          name="checkmark-circle"
          size={21}
          color="#4A7CFF"
        />
      )}
    </TouchableOpacity>
  );
}

type BottomItemProps = {
  icon: IoniconName;
  activeIcon: IoniconName;
  label: string;
  active?: boolean;
  onPress: () => void;
};

function BottomItem({
  icon,
  activeIcon,
  label,
  active = false,
  onPress,
}: BottomItemProps) {
  return (
    <TouchableOpacity
      style={styles.bottomItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{
        selected: active,
      }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.bottomIconContainer,
          active &&
            styles.bottomIconContainerActive,
        ]}
      >
        <Ionicons
          name={active ? activeIcon : icon}
          size={21}
          color={
            active
              ? '#2563EB'
              : '#8B98AA'
          }
        />
      </View>

      <Text
        style={[
          styles.bottomLabel,
          active &&
            styles.bottomLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    alignItems: 'center',
  },

  contentContainer: {
    alignSelf: 'center',
  },

  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerText: {
    flex: 1,
    paddingHorizontal: 5,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    color: '#64748B',
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 9,
  },

  resourceCard: {
    width: '100%',
    minHeight: 62,
    borderWidth: 1,
    borderColor: '#C9CED7',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },

  resourceCardSelected: {
    borderColor: '#4A7CFF',
    backgroundColor: '#F7F9FF',
  },

  resourceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },

  resourceTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  resourceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },

  resourceDescription: {
    marginTop: 3,
    fontSize: 9,
    lineHeight: 13,
    color: '#7C8798',
  },

  informationTitle: {
    marginTop: 13,
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 7,
  },

  input: {
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D5DAE2',
    borderRadius: 8,
    paddingHorizontal: 13,
    fontSize: 12,
    color: '#1F2937',
    marginBottom: 13,
    backgroundColor: '#FFFFFF',
  },

  descriptionInput: {
    minHeight: 82,
    paddingTop: 12,
  },

  uploadBox: {
    width: '100%',
    minHeight: 112,
    borderWidth: 1,
    borderColor: '#CBD2DC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
  },

  uploadBoxSelected: {
    borderColor: '#4A7CFF',
    backgroundColor: '#F7F9FF',
  },

  uploadText: {
    marginTop: 7,
    fontSize: 10,
    lineHeight: 14,
    color: '#7C8798',
    textAlign: 'center',
  },

  uploadLimit: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '800',
    color: '#7C8798',
  },

  actions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginTop: 14,
  },

  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  cancelButtonText: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
  },

  publishButton: {
    flex: 1.7,
    minHeight: 44,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A7CFF',
  },

  publishButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOffset: {
          width: 0,
          height: -4,
        },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },

      android: {
        elevation: 10,
      },
    }),
  },

  bottomContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bottomItem: {
    flex: 1,
    minWidth: 54,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomIconContainer: {
    width: 36,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomIconContainerActive: {
    backgroundColor: '#EAF1FF',
  },

  bottomLabel: {
    marginTop: 2,
    fontSize: 8,
    color: '#8B98AA',
    fontWeight: '700',
  },

  bottomLabelActive: {
    color: '#2563EB',
    fontWeight: '900',
  },
});