"use strict";

const DIRECCIONES_LOCALES =
  new Set([
    "127.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
  ]);

function soloLocalhost(
  req,
  res,
  next
) {
  const direccion =
    String(
      req.socket?.remoteAddress ||
      ""
    ).trim();

  if (
    !DIRECCIONES_LOCALES.has(
      direccion
    )
  ) {
    return res
      .status(403)
      .json({
        mensaje:
          "Esta ruta interna solamente puede utilizarse desde el servidor Web de AulaMos.",
      });
  }

  return next();
}

module.exports =
  soloLocalhost;