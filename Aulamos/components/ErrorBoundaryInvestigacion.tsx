import { usePathname, useRouter } from "expo-router";
import { Component, ErrorInfo, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { registrarErrorInvestigacion } from "../services/investigacionService";

type LimiteProps = {
  children: ReactNode;
  pantalla: string;
  volverAlInicio: () => void;
};

type LimiteState = {
  ocurrioError: boolean;
};

class LimiteErrores extends Component<LimiteProps, LimiteState> {
  state: LimiteState = {
    ocurrioError: false,
  };

  static getDerivedStateFromError(): LimiteState {
    return {
      ocurrioError: true,
    };
  }

  componentDidCatch(error: Error, informacion: ErrorInfo) {
    void registrarErrorInvestigacion({
      accion: "Error inesperado en la aplicación",
      error,
      modulo: "Aplicación",
      pantalla: this.props.pantalla,
      descripcionAdicional: informacion.componentStack ?? undefined,
    });
  }

  private volverAlInicio = () => {
    this.setState({
      ocurrioError: false,
    });

    this.props.volverAlInicio();
  };

  render() {
    if (this.state.ocurrioError) {
      return (
        <View style={styles.contenedor} accessibilityRole="alert">
          <Text style={styles.titulo}>Ocurrió un problema</Text>

          <Text style={styles.descripcion}>
            El error fue registrado. Puedes volver al inicio y continuar usando
            AULAMOS.
          </Text>

          <Pressable
            style={styles.boton}
            onPress={this.volverAlInicio}
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio de AULAMOS"
          >
            <Text style={styles.textoBoton}>Volver al inicio</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

type Props = {
  children: ReactNode;
};

export default function ErrorBoundaryInvestigacion({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <LimiteErrores
      pantalla={pathname || "Desconocida"}
      volverAlInicio={() => router.replace("/")}
    >
      {children}
    </LimiteErrores>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
  },
  titulo: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  descripcion: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 480,
    textAlign: "center",
  },
  boton: {
    backgroundColor: "#2D5BFF",
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  textoBoton: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
