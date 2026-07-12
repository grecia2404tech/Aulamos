const nodemailer = require('nodemailer');

const crearTransportador = () => {
  const correo = process.env.EMAIL_USER;
  const passwordAplicacion =
    process.env.EMAIL_APP_PASSWORD;

  if (!correo || !passwordAplicacion) {
    throw new Error(
      'Faltan EMAIL_USER o EMAIL_APP_PASSWORD en .env'
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: correo,
      pass: passwordAplicacion,
    },
  });
};

const enviarCodigoRecuperacion = async ({
  correo,
  nombre,
  codigo,
}) => {
  const transportador = crearTransportador();

  await transportador.sendMail({
    from: `"AULAMOS" <${process.env.EMAIL_USER}>`,
    to: correo,
    subject:
      'Código para recuperar tu contraseña de AULAMOS',

    text: `
Hola ${nombre}.

Tu código para restablecer la contraseña es:

${codigo}

Este código vence en 15 minutos.

Si no solicitaste este cambio, ignora el mensaje.
    `.trim(),

    html: `
      <div
        style="
          max-width: 520px;
          margin: 0 auto;
          padding: 28px;
          font-family: Arial, sans-serif;
          color: #1F2937;
          background-color: #F8FAFC;
          border-radius: 16px;
        "
      >
        <h1
          style="
            margin-top: 0;
            color: #2563EB;
            text-align: center;
          "
        >
          AULAMOS
        </h1>

        <h2 style="color: #111827;">
          Recuperación de contraseña
        </h2>

        <p>Hola ${nombre}:</p>

        <p>
          Recibimos una solicitud para cambiar
          tu contraseña.
        </p>

        <p>
          Utiliza el siguiente código:
        </p>

        <div
          style="
            margin: 24px 0;
            padding: 18px;
            text-align: center;
            font-size: 30px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #FFFFFF;
            background-color: #4A7CFF;
            border-radius: 12px;
          "
        >
          ${codigo}
        </div>

        <p>
          Este código vence en
          <strong>15 minutos</strong>.
        </p>

        <p
          style="
            color: #64748B;
            font-size: 13px;
          "
        >
          Si no solicitaste este cambio,
          puedes ignorar este correo.
        </p>
      </div>
    `,
  });
};

module.exports = {
  enviarCodigoRecuperacion,
};