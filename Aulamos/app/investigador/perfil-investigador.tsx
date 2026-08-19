import {
  PantallaInvestigador,
  Seccion,
  Tarjeta,
  TextoPrincipal,
  TextoSecundario,
} from '../../components/investigador/InvestigadorUI';
import { useConsultaInvestigador } from '../../hooks/useConsultaInvestigador';
import { obtenerPerfilInvestigador } from '../../services/investigadorService';

const fecha = (valor?: string | null) => valor
  ? new Date(valor).toLocaleString('es-MX')
  : 'Sin registrar';

export default function PerfilInvestigadorScreen() {
  const consulta = useConsultaInvestigador(obtenerPerfilInvestigador);
  const perfil = consulta.datos;

  return (
    <PantallaInvestigador
      titulo="Mi perfil"
      descripcion="Información de la cuenta identificada por el token actual."
      loading={consulta.loading}
      refreshing={consulta.refreshing}
      error={consulta.error}
      onRetry={consulta.reintentar}
      onRefresh={consulta.recargar}
    >
      <Seccion titulo="Datos de la cuenta">
        <Tarjeta>
          <TextoPrincipal>{perfil?.nombre || ''}</TextoPrincipal>
          <TextoSecundario>Correo: {perfil?.correo || ''}</TextoSecundario>
          <TextoSecundario>Rol: {perfil?.roles || ''}</TextoSecundario>
          <TextoSecundario>Estado: {perfil?.estado || ''}</TextoSecundario>
          <TextoSecundario>Último acceso: {fecha(perfil?.ultimoAcceso)}</TextoSecundario>
          <TextoSecundario>Registro: {fecha(perfil?.fechaRegistro)}</TextoSecundario>
        </Tarjeta>
      </Seccion>
    </PantallaInvestigador>
  );
}
