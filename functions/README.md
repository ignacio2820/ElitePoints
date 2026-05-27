# Cloud Functions — Admin HTTP (MascotPoints)

Funciones pensadas para operar desde el navegador del celular (GET con query params).

## Configuración (una vez)

```bash
cd functions && npm install
firebase functions:secrets:set MASCOTPOINTS_ADMIN_HTTP_SECRET
# Opcional: URL base de onboarding
firebase functions:secrets:set ONBOARDING_BASE_URL
```

Para el emulador local, copiá `.env.example` a `.env` dentro de `functions/`.

## Despliegue

Desde la raíz del repo:

```bash
npm run functions:deploy
```

## Uso desde el celular

Tras desplegar, Firebase muestra las URLs. Sustituí `TU_SECRETO`, codificá espacios (`%20`) y usá GET:

### 1. `generarTokenAdmin` — alta de nuevo local

Devuelve **solo la URL** en texto plano (copiar y pegar en WhatsApp):

```
https://southamerica-east1-mascot-points-e2186.cloudfunctions.net/generarTokenAdmin?secret=TU_SECRETO&local=Veterinaria%20Elite&plan=mensual
```

Planes: `mensual`, `semestral`, `anual`.

### 2. `renovarMembresiaAdmin` — extender membresía

Muestra confirmación HTML con la nueva fecha de vencimiento:

```
https://southamerica-east1-mascot-points-e2186.cloudfunctions.net/renovarMembresiaAdmin?secret=TU_SECRETO&local=Veterinaria%20Elite&planExtendido=anual
```

- `local`: nombre **exacto** como en Firestore o el **ID/slug** del documento (`Locales/{id}`).
- Si el plan aún no venció, suma meses desde esa fecha (no pierde días).
- Si ya venció, suma desde hoy.
- Deja `estadoMembresia` y `membresiaEstado` en `"activo"`.

## Seguridad

- Sin `secret` correcto → **401**.
- El secreto vive en Secret Manager (`MASCOTPOINTS_ADMIN_HTTP_SECRET`), no en el repo.
