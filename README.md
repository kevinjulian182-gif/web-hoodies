# Hoodies Premium

E-commerce de streetwear premium (Next.js 14 App Router + TypeScript + Tailwind + Prisma/PostgreSQL).

## Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion.
- **Backend:** Next.js Route Handlers, Prisma ORM sobre PostgreSQL (compatible con Supabase).
- **Auth:** JWT en cookie httpOnly (`jose` + `bcryptjs`), RBAC con roles `SUPER_ADMIN`, `ADMIN`, `CUSTOMER`.
- **Pagos:** Wompi (widget embebido + webhook con verificación de firma).
- **Envíos:** guía de Inter Rapidísimo asociada a cada pedido.
- **Correo transaccional:** Resend, disparado al confirmar el pago.

## Esquema de base de datos (`prisma/schema.prisma`)

- `User` — cuentas con rol (RBAC).
- `Product` — catálogo (marca, precio, tallas, stock, imágenes).
- `Order` / `OrderItem` — pedidos, estado (`PENDING` → `PAID` → `SHIPPED`/`CANCELLED`), referencia Wompi, guía de envío.
- `Coupon` — descuentos porcentuales o fijos.
- `NewsletterSubscriber` — captura de correos para marketing.
- `SystemConfig` — credenciales sensibles (Wompi, Inter Rapidísimo, Resend), cifradas con AES-256-GCM, editables solo por `SUPER_ADMIN`.

## Roles

- **Super Admin**: único con acceso a `/admin/settings` (llaves de pago y envío).
- **Admin (Tienda)**: `/admin/products`, `/admin/orders`, `/admin/coupons`.
- El middleware (`src/middleware.ts`) protege `/admin/*` por rol.

## Flujo de pago (Wompi)

1. `POST /api/checkout/init` crea el pedido en `PENDING`, calcula totales/cupón y genera la referencia + firma de integridad (`src/lib/wompi.ts`).
2. El checkout (2 pasos, sin navegación) embebe el widget de Wompi con esos datos.
3. `POST /api/webhooks/wompi` verifica el checksum del evento, marca el pedido `PAID`, descuenta stock y envía el correo de confirmación.

## Puesta en marcha

```bash
cp .env.example .env   # completa DATABASE_URL y los secretos
npm install
npm run db:push
npm run db:seed        # crea Super Admin, Admin y un producto de ejemplo
npm run dev
```

Usuarios de prueba (creados por el seed):

- Super Admin: `superadmin@hoodiespremium.com` / `SuperAdmin123!`
- Admin: `admin@hoodiespremium.com` / `Admin123!`

Las llaves de Wompi/Inter Rapidísimo/Resend pueden definirse en `.env` o cargarse desde `/admin/settings` (se guardan cifradas en `SystemConfig` y tienen prioridad sobre las variables de entorno).
