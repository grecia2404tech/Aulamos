import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type TipoRecurso = 'Video' | 'PDF' | 'Documento' | null;

export default function CrearRecursoScreen() {
  const [tipoRecurso, setTipoRecurso] = useState<TipoRecurso>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(false);

  const seleccionarTipo = (tipo: TipoRecurso) => {
    setTipoRecurso(tipo);
  };

  const seleccionarArchivo = () => {
    setArchivoSeleccionado(true);
    Alert.alert(
      'Archivo seleccionado',
      'Aquí se conectará posteriormente el selector de archivos.',
    );
  };

  const publicarRecurso = () => {
    if (!tipoRecurso) {
      Alert.alert('Campo requerido', 'Selecciona el tipo de recurso.');
      return;
    }

    if (!titulo.trim()) {
      Alert.alert('Campo requerido', 'Escribe el título del recurso.');
      return;
    }

    if (!archivoSeleccionado) {
      Alert.alert('Archivo requerido', 'Selecciona un archivo para publicar.');
      return;
    }

    Alert.alert('Éxito', 'El recurso se publicó correctamente.');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
          >
            <Ionicons name="arrow-back" size={23} color="#263142" />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Crear Recurso</Text>
            <Text style={styles.subtitle}>
              Comparte material para tus estudiantes
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Opciones de accesibilidad"
          >
            <Ionicons name="accessibility" size={24} color="#6C4DFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Tipo de recurso</Text>

        <ResourceOption
          title="Video"
          description="Sube un video"
          icon="videocam"
          iconBackground="#DDF8F4"
          iconColor="#34C8BA"
          selected={tipoRecurso === 'Video'}
          onPress={() => seleccionarTipo('Video')}
        />

        <ResourceOption
          title="PDF"
          description="Sube un archivo PDF"
          icon="document-text"
          iconBackground="#FFE5E8"
          iconColor="#FF5263"
          selected={tipoRecurso === 'PDF'}
          onPress={() => seleccionarTipo('PDF')}
        />

        <ResourceOption
          title="Documentos"
          description="Sube un documento (Word, PDF, etc.)"
          icon="document"
          iconBackground="#ECE8FF"
          iconColor="#7059F5"
          selected={tipoRecurso === 'Documento'}
          onPress={() => seleccionarTipo('Documento')}
        />

        <Text style={[styles.sectionTitle, styles.informationTitle]}>
          Información del recurso
        </Text>

        <Text style={styles.label}>Título del recurso</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. La fotosíntesis"
          placeholderTextColor="#9CA3AF"
          value={titulo}
          onChangeText={setTitulo}
          maxLength={150}
        />

        <Text style={styles.label}>Descripción (Opcional)</Text>
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Describe brevemente el contenido"
          placeholderTextColor="#9CA3AF"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />

        <TouchableOpacity
          style={[
            styles.uploadBox,
            archivoSeleccionado && styles.uploadBoxSelected,
          ]}
          onPress={seleccionarArchivo}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar archivo"
        >
          <Ionicons
            name={archivoSeleccionado ? 'checkmark-circle' : 'cloud-upload-outline'}
            size={34}
            color={archivoSeleccionado ? '#2563EB' : '#111827'}
          />

          <Text style={styles.uploadText}>
            {archivoSeleccionado
              ? 'Archivo seleccionado correctamente'
              : 'Toca para seleccionar o arrastra tu archivo aquí'}
          </Text>

          <Text style={styles.uploadLimit}>Máx. 200MB</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.publishButton}
            onPress={publicarRecurso}
          >
            <Text style={styles.publishButtonText}>Publicar recurso</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomNavigation}>
        <BottomItem icon="home" label="Inicio" />
        <BottomItem icon="folder-open" label="Recursos" active />
        <BottomItem icon="clipboard" label="Actividades" />
        <BottomItem icon="document-text" label="Evaluaciones" />
        <BottomItem icon="menu" label="Más" />
      </View>
    </View>
  );
}

type ResourceOptionProps = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
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
      style={[styles.resourceCard, selected && styles.resourceCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.resourceIconBox, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      <View style={styles.resourceTextContainer}>
        <Text style={styles.resourceTitle}>{title}</Text>
        <Text style={styles.resourceDescription}>{description}</Text>
      </View>

      {selected && (
        <Ionicons name="checkmark-circle" size={21} color="#4A7CFF" />
      )}
    </TouchableOpacity>
  );
}

type BottomItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
};

function BottomItem({ icon, label, active = false }: BottomItemProps) {
  return (
    <TouchableOpacity style={styles.bottomItem}>
      <Ionicons
        name={icon}
        size={20}
        color={active ? '#4A7CFF' : '#94A3B8'}
      />
      <Text
        style={[
          styles.bottomItemText,
          active && styles.bottomItemTextActive,
        ]}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 95,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerButton: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 9,
  },
  resourceCard: {
    minHeight: 61,
    borderWidth: 1,
    borderColor: '#C9CED7',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 9,
    backgroundColor: '#FFFFFF',
  },
  resourceCardSelected: {
    borderColor: '#4A7CFF',
    backgroundColor: '#F7F9FF',
  },
  resourceIconBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  resourceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  resourceDescription: {
    marginTop: 3,
    fontSize: 9,
    color: '#7C8798',
  },
  informationTitle: {
    marginTop: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 7,
  },
  input: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: '#D5DAE2',
    borderRadius: 7,
    paddingHorizontal: 13,
    fontSize: 11,
    color: '#1F2937',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  descriptionInput: {
    minHeight: 57,
    paddingTop: 12,
  },
  uploadBox: {
    height: 98,
    borderWidth: 1,
    borderColor: '#CBD2DC',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  uploadBoxSelected: {
    borderColor: '#4A7CFF',
    backgroundColor: '#F7F9FF',
  },
  uploadText: {
    marginTop: 5,
    fontSize: 10,
    color: '#7C8798',
    textAlign: 'center',
  },
  uploadLimit: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
    color: '#7C8798',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButton: {
    height: 36,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 11,
    color: '#111827',
  },
  publishButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A7CFF',
  },
  publishButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 65,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomItemText: {
    marginTop: 3,
    fontSize: 9,
    color: '#94A3B8',
  },
  bottomItemTextActive: {
    color: '#4A7CFF',
    fontWeight: '600',
  },
});