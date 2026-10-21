import { NextRequest, NextResponse, after } from 'next/server';
import { sendNewsletterWelcome } from '@/lib/email';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordConsent } from '@/lib/consent';

const schema = z.object({
  email: z.string().email(),
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa tu correo y acepta los términos y la política de privacidad.' }, { status: 400 });
  }

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: parsed.data.email } });
  if (!existing) {
    await prisma.newsletterSubscriber.create({ data: { email: parsed.data.email } });
    after(() => sendNewsletterWelcome(parsed.data.email));
  }
  await recordConsent(req, { source: 'newsletter', email: parsed.data.email, acceptedTerms: true, acceptedPrivacy: true });

  return NextResponse.json({ ok: true });
}
