# ElitePoints — Motor de fidelización para comercios

Plataforma **multi-tenant** que permite a cada comercio configurar su propio
programa de **puntos**, proteger su margen y fidelizar clientes con sorteos,
referidos, encuestas y bonos configurables.

> Stack: **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Firebase
> (Auth + Firestore + Admin SDK) · Resend · Vitest**.

---

## Filosofía del motor

Tres conceptos que el dueño del comercio debe entender para no perder dinero:

| Concepto                | Qué representa                                                       | Ejemplo |
| ----------------------- | -------------------------------------------------------------------- | ------- |
| **Costo de Acumulación** | Cuántos pesos debe gastar el cliente para sumar **1 punto**.         | $1.000  |
| **Valor de Canje**       | Cuánto descuenta **1 punto** al canjearse.                           | $10     |
| **Vencimiento**          | Plazo en días desde la emisión hasta que los puntos expiran.         | 365 días |

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
   - Crea un lote bonus de `bonusBienvenida` puntos para el invitado.
   - Crea un lote bonus de `bonusReferente` puntos para el referente.
   - Suma al `acumuladoHistorico` del referente y recalcula su nivel
     (un referido puede llegar a hacerlo subir de tier).
   - Marca `referidoActivado: true` (idempotencia).
   - Crea un evento de auditoría en `/EventosReferido`.
3. **Email transaccional** — fuera de la transacción se envía un email al
   referente con el detalle del bono. Si el envío falla, queda
   registrado en logs sin revertir la venta.

---

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local   # completar credenciales Firebase + Resend
npm run dev
```

Comandos útiles:

| Comando            | Descripción                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Servidor de desarrollo Next.js       |
| `npm run typecheck`| Verificación TypeScript (`tsc`)      |
| `npm test`         | Tests Vitest                         |
| `npm run seed`     | Datos de demo en Firestore           |

**Remitente de email:** configurá `RESEND_FROM=ElitePoints <hola@elitepoints.app>` en `.env.local` (dominio verificado en Resend).

---

## Estructura relevante

- `src/components/PuntoIcon.tsx` — icono de marca (medalla lucide)
- `src/lib/huellitas/` — motor de puntos (rutas Firestore legacy `Huellitas` / `Locales`)
- `src/app/` — App Router (admin, portal cliente, onboarding, landing)

---

## Licencia

Proyecto privado — Agencia WebElite SOLUTIONS.
