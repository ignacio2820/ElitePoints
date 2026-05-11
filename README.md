# Huellitas — Motor de Fidelización para Pet Shops

Plataforma **multi-tenant** que permite a cada Pet Shop configurar su propio
programa de puntos ("Huellitas"), proteger su margen y enamorar a sus clientes
con detalles automáticos como el saludo de cumpleaños de cada mascota.

> Stack: **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Firebase
> (Auth + Firestore + Admin SDK) · Resend · Vitest**.

---

## Filosofía del motor

Tres conceptos que el dueño del local debe entender para no perder dinero:

| Concepto                | Qué representa                                                       | Ejemplo |
| ----------------------- | -------------------------------------------------------------------- | ------- |
| **Costo de Acumulación** | Cuántos pesos debe gastar el cliente para sumar **1 huellita**.      | $1.000  |
| **Valor de Canje**       | Cuánto descuenta **1 huellita** al canjearse.                        | $10     |
| **Vencimiento**          | Plazo en días desde la emisión hasta que las huellitas expiran.      | 365 días |

> El **costo efectivo** del programa es `valorCanje / costoAcumulacion`. En el
> ejemplo arriba: `10 / 1.000 = 1%`. La UI muestra una advertencia visual con
> tres estados (saludable / ajustado / peligroso) según ese porcentaje.

### Boca en boca: Referidos

Cada cliente recibe un **código único** generado con un alfabeto sin caracteres
ambiguos (sin `0`, `1`, `O`, `I`, `L`, `U`, `V`) — más legible al compartir
por voz o captura. La unicidad se garantiza vía el doc-id de
`/Locales/{localId}/Referidos/{codigo}`: el path mismo actúa de candado, dos
clientes no pueden coexistir con el mismo código.

Flujo:

1. **Registro con código** — el invitado entra a `/registro?ref=CODIGO`. El
   formulario valida el código, lo precarga y muestra los beneficios. Al
   crear la cuenta se setea `referidoPor` en el nuevo cliente.
2. **Primera compra** — el admin registra una venta; `registrarVenta` detecta
   `!primerCompraRegistrada && referidoPor && !referidoActivado` y, **dentro
   de la misma transacción**:
   - Crea un lote bonus de `bonusBienvenida` huellitas para el invitado.
   - Crea un lote bonus de `bonusReferente` huellitas para el referente.
   - Suma al `acumuladoHistorico` del referente y recalcula su nivel
     (un referido puede llegar a hacerlo subir de tier).
   - Marca `referidoActivado: true` (idempotencia).
   - Crea un evento de auditoría en `/EventosReferido`.
3. **Email transaccional** — fuera de la transacción se envía un email al
   referente: *"¡Buenas noticias! Tu amigo ya visitó la veterinaria.
   Sumaste N huellitas de regalo"*. Si el envío falla, queda
   `emailEnviado: false` para reintento posterior; el bonus ya está acreditado.

El cliente comparte su código desde el componente `InvitarAmigos.tsx` con un
botón directo a WhatsApp y un mensaje configurable por el local con
placeholders `{local}`, `{codigo}`, `{url}`.

### Gamificación: Niveles de lealtad

El sistema usa un **acumulado histórico** (suma de huellitas emitidas, nunca
decrece al canjear) para asignar un nivel a cada cliente. Defaults editables:

| Nivel              | Umbral histórico | Multiplicador | Descuento fijo |
| ------------------ | ---------------- | ------------- | -------------- |
| **Cachorro**       | 0                | 1.0×          | 0%             |
| **Explorador**     | 500              | 1.1×          | 0%             |
| **Gran Guardián**  | 2.000            | 1.5×          | 5% en todo el local |

Cada venta:
1. Aplica el **descuento fijo** del nivel actual sobre el ticket.
2. Aplica el **canje** solicitado por el cliente.
3. Emite huellitas con `huellitasBase × multiplicadorDelNivel`.
4. Suma al `acumuladoHistorico` y **recalcula automáticamente el nivel**.

El catálogo de **premios** filtra por `nivelMinimoId`: los premios reservados
para tiers superiores se muestran con candado e invitan a subir de rango.

---

## Esquema Firestore (multi-tenant)

```
/Locales/{localId}
  ├── ConfiguracionLocal/main           ← reglas del programa + niveles
  ├── Clientes/{clienteId}
  │     ├── (campos: nombre, email, saldoHuellitas, acumuladoHistorico, nivelId)
  │     ├── Mascotas/{mascotaId}        ← ficha completa (salud + alimentación)
  │     └── Huellitas/{loteId}          ← LOTES con vencimiento (FIFO)
  ├── Ventas/{ventaId}                  ← incluye huellitasBase, multiplicador, nivel
  ├── Canjes/{canjeId}
  └── Premios/{premioId}                ← catálogo con nivelMinimoId + categoría
```

Las **huellitas se modelan como lotes** (no como un único contador) para poder
aplicar vencimiento FIFO real: cada lote conserva `huellitasIniciales`,
`huellitasRestantes`, `fechaEmision` y `fechaVencimiento`.

Reglas de seguridad: ver `firestore.rules`. El acceso usa custom claims
(`localId`, `clienteId`) para aislar tenants.

---

## Motor de reglas (TypeScript puro)

`src/lib/huellitas/engine.ts` contiene **funciones puras, sin Firestore**, lo
que las hace 100% testeables. Lo más importante:

```ts
// Fórmula central:
huellitasBase       = Math.floor(totalVenta / montoParaUnaHuellita)
huellitasGeneradas  = round(huellitasBase * multiplicadorDelNivel)
```

Funciones expuestas:

- `calcularEmision(totalVenta, cfg, hoy?, multiplicador?)` → emite lote +
  fecha de vencimiento, con multiplicador del nivel.
- `saldoVigente(lotes)` → suma sólo los lotes no vencidos ni agotados.
- `planConsumoFIFO(lotes, cantidad)` → consume primero los que vencen antes.
- `calcularCanje(...)` → respeta mínimo, tope porcentual y saldo.
- `diagnosticarPrograma(cfg)` → estado *saludable / ajustado / peligroso*.
- `calcularNivel(acumuladoHistorico, niveles)` → tier al que pertenece.
- `progresoNivel(...)` → nivel actual + siguiente + huellitas faltantes +
  porcentajes (tramo y global) para la barra.
- `aumentarCatalogo(premios, ctx)` → marca cada premio como
  `desbloqueado / nivel / saldo / stock / inactivo` para el render.
- `esCumpleanos(mascota)`, `edadMascotaAnios(mascota)`.

Cobertura: **35 tests** en `engine.test.ts` (emisión + multiplicador, FIFO,
canje con tope, niveles default, progreso, filtrado de premios, cumpleaños).

```bash
npm test
```

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.local.example .env.local
# completá NEXT_PUBLIC_FIREBASE_*, FIREBASE_ADMIN_*, RESEND_*, CRON_SECRET

# 3. Desplegar reglas Firestore (con Firebase CLI)
firebase deploy --only firestore:rules

# 4. Levantar dev server
npm run dev
```

> La UI funciona **en modo demo sin Firebase**: la página `/admin/configuracion`
> y `/cliente/demo` cargan defaults y el guardado es no-op si las credenciales
> Admin no están configuradas. Esto facilita la primera prueba visual.

### Custom claims para multi-tenant

Cuando creás un usuario dueño del local desde el Admin SDK:

```ts
await adminAuth().setCustomUserClaims(uid, { localId: "petshop-rosario" });
```

Y para clientes finales:

```ts
await adminAuth().setCustomUserClaims(uid, {
  localId: "petshop-rosario",
  clienteId: "abc123"
});
```

Las reglas Firestore (`firestore.rules`) usan estos claims para garantizar
aislamiento total entre tenants.

---

## Endpoints

| Método  | Path                          | Uso                                                           |
| ------- | ----------------------------- | ------------------------------------------------------------- |
| `GET`   | `/api/configuracion?localId=` | Lee la config del programa de ese local.                      |
| `PUT`   | `/api/configuracion`          | Actualiza la config (sólo dueño del local).                   |
| `POST`  | `/api/ventas`                 | Registra una venta: emite lote, canjea, **activa bonus de referido** si corresponde. |
| `POST`  | `/api/clientes`               | Crea un cliente con código de referido único. Acepta `codigoReferido` opcional para vincular al referente. |
| `GET`   | `/api/cron/cumpleanos`        | Recorre todos los locales y manda emails. Requiere `Authorization: Bearer $CRON_SECRET`. |

### Cron de cumpleaños

El archivo `vercel.json` agenda `/api/cron/cumpleanos` todos los días a las
12:00 UTC. El endpoint:

1. Recorre los locales con `emailsCumpleanosActivos = true`.
2. Encuentra mascotas con `fechaNacimiento` cuyo mes/día = hoy.
3. Envía email vía Resend con el template HTML elegante de
   `src/lib/email/cumpleanos.ts`.
4. Marca `ultimoCumpleanosNotificado = YYYY-MM-DD` en la mascota
   (idempotente ante reintentos).

---

## Estructura del proyecto

```
src/
├── app/
│   ├── admin/
│   │   ├── configuracion/         ← sliders + advertencia de margen + referidos
│   │   ├── clientes/              ← cartera con badge de nivel
│   │   └── scan/[clienteId]/      ← ficha completa visible al escanear QR
│   ├── cliente/[clienteId]/
│   │   ├── ClienteView.tsx        ← saldo + nivel + catálogo + InvitarAmigos
│   │   └── qr/                    ← QR para mostrar al admin en caja
│   ├── registro/                  ← landing /registro?ref=CODIGO
│   └── api/
│       ├── ventas/                ← venta + activación bonus referido
│       ├── clientes/              ← crear cliente con código único
│       ├── configuracion/
│       └── cron/cumpleanos/
├── components/
│   ├── ConfiguracionForm.tsx, MargenWarning.tsx
│   ├── HuellitasBalance.tsx, HuellitaIcon.tsx
│   ├── NivelBadge.tsx, ProgressBar.tsx, NivelCard.tsx
│   ├── CatalogoPremios.tsx, FichaMascota.tsx
│   ├── MascotaFormPro.tsx, MascotaCard.tsx
│   ├── QRCliente.tsx
│   ├── InvitarAmigos.tsx          ← código + Copiar + Compartir WhatsApp + stats
│   └── ui/ (Card, Field, Slider, Badge)
└── lib/
    ├── huellitas/
    │   ├── types.ts               ← schemas Zod (Nivel, Premio, Referido, …)
    │   ├── engine.ts              ← reglas puras
    │   ├── engine.test.ts         ← 35 tests
    │   ├── referidos.ts           ← generador de códigos + WhatsApp share
    │   ├── referidos.test.ts      ← 15 tests
    │   ├── referidosService.ts    ← Firestore: crear cliente con código único
    │   └── service.ts             ← venta + nivel + activación referido
    ├── firebase/, email/ (cumpleaños + referido)
    └── utils.ts
```

## Flujo del QR

1. El cliente abre `/cliente/{id}/qr` desde su celular.
2. El QR codifica la URL absoluta `/admin/scan/{id}` del local.
3. El admin escanea con la cámara y aterriza en `/admin/scan/{id}`, que muestra:
   saldo, acumulado histórico, **nivel con multiplicador y descuento fijo
   activos en el ticket**, y la **ficha completa** de cada mascota
   (identidad + salud + alimentación + notas).

---

## Próximos pasos sugeridos

- [ ] Onboarding del dueño (alta de `/Locales/{localId}` + claims).
- [ ] PWA con scanner QR para que el cliente acumule en caja.
- [ ] Dashboard con métricas: emisión vs. canje, top mascotas, churn.
- [ ] Reglas de bonus (2x huellitas en cumpleaños de la mascota,
      primer compra, etc.) — el motor está preparado para extenderse.
# MascotPoints
