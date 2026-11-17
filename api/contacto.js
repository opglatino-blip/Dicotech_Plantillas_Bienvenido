// Servicio de Vercel: recibe el correo del cliente y ejecuta la funcion solicitudContacto de Zoho CRM.
// La direccion de la funcion (con su clave) se guarda en Vercel como variable de entorno FUNCTION_URL.
// Solo acepta POST, asi que un antivirus o filtro de correo que "visita" el enlace no la ejecuta.

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, motivo: "metodo_no_permitido" });
  }

  const correo = String((req.body && req.body.correo) || "").trim();
  if (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return res.status(400).json({ ok: false, motivo: "correo_invalido" });
  }

  if (!process.env.FUNCTION_URL) {
    return res.status(500).json({ ok: false, motivo: "falta_configuracion" });
  }

  try {
    const funcion = new URL(process.env.FUNCTION_URL);
    funcion.searchParams.set("correo", correo);

    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), 8000);
    const respuesta = await fetch(funcion.toString(), { method: "GET", signal: control.signal });
    clearTimeout(limite);

    const texto = await respuesta.text();

    if (!respuesta.ok) {
      return res.status(502).json({ ok: false, motivo: "zoho_error" });
    }
    if (/no encontrado/i.test(texto)) {
      return res.status(404).json({ ok: false, motivo: "no_encontrado" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false, motivo: "sin_respuesta" });
  }
};
