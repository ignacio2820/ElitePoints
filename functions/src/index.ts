/**
 * Cloud Functions HTTP premium — operación desde el navegador del celular.
 *
 * Configurá el secreto antes de desplegar:
 *   firebase functions:secrets:set MASCOTPOINTS_ADMIN_HTTP_SECRET
 *
 * Ejemplos (reemplazá TU_SECRETO y codificá espacios en la URL):
 *   generarTokenAdmin:
 *     .../generarTokenAdmin?secret=TU_SECRETO&local=Veterinaria%20Elite&plan=mensual
 *   renovarMembresiaAdmin:
 *     .../renovarMembresiaAdmin?secret=TU_SECRETO&local=Veterinaria%20Elite&planExtendido=anual
 */

export { generarTokenAdmin } from "./generarTokenAdmin";
export { renovarMembresiaAdmin } from "./renovarMembresiaAdmin";
