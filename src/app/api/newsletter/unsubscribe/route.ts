import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/email';

// Unsubscribe link from marketing emails (GET from the link, POST from the
// mail client's one-click "Cancelar suscripción" button).
async function unsubscribe(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') ?? '';
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!email || !verifyUnsubscribeToken(email, token)) {
    return page('Enlace no válido', 'Este enlace para darte de baja no es válido. Escríbenos y lo hacemos por ti.', 400);
  }
  await prisma.newsletterSubscriber.deleteMany({ where: { email: { equals: email, mode: 'insensitive' } } });
  return page('Listo, te diste de baja', 'Ya no te enviaremos correos de novedades. Los correos de tus pedidos seguirán llegando.');
}

function page(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · AFRA</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FBF6EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#291C13;padding:24px">
<div style="max-width:420px;text-align:center"><div style="font-size:24px;font-weight:800;letter-spacing:.18em">AFRA</div>
<h1 style="font-size:22px;margin:24px 0 8px">${title}</h1><p style="color:#4F3624;line-height:1.6">${body}</p>
<a href="/" style="display:inline-block;margin-top:16px;background:#291C13;color:#FBF6EC;text-decoration:none;padding:12px 24px;border-radius:999px">Ir a la tienda</a></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export const GET = unsubscribe;
export const POST = unsubscribe;
