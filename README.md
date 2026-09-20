# AFRA

E-commerce de streetwear premium (Next.js 16 App Router + TypeScript + Tailwind + Prisma/PostgreSQL).

## Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS, Framer Motion.
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
- El proxy (`src/proxy.ts`) protege `/admin/*` por rol.

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

- Super Admin: `superadmin@afra.co` / `SuperAdmin123!`
- Admin: `admin@afra.co` / `Admin123!`

Las llaves de Wompi/Inter Rapidísimo/Resend pueden definirse en `.env` o cargarse desde `/admin/settings` (se guardan cifradas en `SystemConfig` y tienen prioridad sobre las variables de entorno).

## Despliegue gratuito (Vercel + Supabase)

Todo el proyecto ya está listo para desplegarse sin instalar nada en tu computador.
Solo se necesitan dos cuentas (Vercel y Supabase, ambas con plan gratuito) y pegar
unos valores — el resto corre en la nube.

**1. Base de datos gratuita (Supabase)**
1. Crea una cuenta en [supabase.com](https://supabase.com) → *New Project*.
2. Ve a *Project Settings → Database → Connection string* y copia el modo
   **Transaction pooler**. Esa URL es tu `DATABASE_URL`.

**2. Configurar los secretos en GitHub**
1. En este repositorio: *Settings → Secrets and variables → Actions → New repository secret*.
2. Crea el secreto `DATABASE_URL` con el valor de Supabase.

**3. Crear las tablas y los usuarios de prueba (sin terminal, un clic)**
1. Ve a la pestaña **Actions** de este repositorio → *Configurar base de datos* → *Run workflow*.
2. Esto aplica el esquema (`prisma db push`) y crea Super Admin, Admin y un producto de ejemplo.

**4. Desplegar el sitio (Vercel)**
1. Crea una cuenta en [vercel.com](https://vercel.com) con tu GitHub → *Add New Project* → importa `web-hoodies`.
2. En *Environment Variables* pega:
   ```
   DATABASE_URL=<la misma URL de Supabase>
   AUTH_SECRET=<genera uno nuevo o pide uno>
   CONFIG_ENCRYPTION_KEY=<genera uno nuevo o pide uno>
   ```
3. Clic en *Deploy*. Vercel construye y publica el sitio automáticamente; cada
   futuro `git push` a la rama conectada vuelve a desplegar solo.

**5. Cargar las llaves de pago/envío**
Ya con el sitio en línea, entra con el usuario Super Admin a `/admin/settings`
y pega ahí las llaves de Wompi, Inter Rapidísimo y Resend — quedan cifradas
en la base de datos, no hace falta tocar Vercel de nuevo.
