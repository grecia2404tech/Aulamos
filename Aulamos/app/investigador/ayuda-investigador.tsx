import {
  PantallaInvestigador,
  Seccion,
  SinDatos,
  Tarjeta,
  TextoPrincipal,
  TextoSecundario,
} from '../../components/investigador/InvestigadorUI';
import { useConsultaInvestigador } from '../../hooks/useConsultaInvestigador';
import { obtenerAyudaInvestigador } from '../../services/investigadorService';

export default function AyudaInvestigadorScreen() {
  const consulta = useConsultaInvestigador(obtenerAyudaInvestigador);
  const contenidos = consulta.datos || [];

  return (
    <PantallaInvestigador
      titulo="Ayuda"
      descripcion="Contenido activo registrado en centro_ayuda."
      loading={consulta.loading}
      refreshing={consulta.refreshing}
      error={consulta.error}
      onRetry={consulta.reintentar}
      onRefresh={consulta.recargar}
    >
      <Seccion titulo={`Contenidos (${contenidos.length})`}>
        {contenidos.length ? contenidos.map((contenido) => (
          <Tarjeta key={contenido.idContenido}>
            <TextoPrincipal>{contenido.titulo}</TextoPrincipal>
            <TextoSecundario>Tipo: {contenido.tipo}</TextoSecundario>
            <TextoSecundario>{contenido.contenido}</TextoSecundario>
            {contenido.palabrasClave ? (
              <TextoSecundario>Palabras clave: {contenido.palabrasClave}</TextoSecundario>
            ) : null}
          </Tarjeta>
        )) : <SinDatos texto="No hay contenido activo en el centro de ayuda." />}
      </Seccion>
    </PantallaInvestigador>
  );
}
