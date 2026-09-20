import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@afra.co' },
    create: {
      email: 'superadmin@afra.co',
      passwordHash: superAdminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
    update: {},
  });

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@afra.co' },
    create: {
      email: 'admin@afra.co',
      passwordHash: adminPassword,
      name: 'Tienda Admin',
      role: 'ADMIN',
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { slug: 'nike-tech-fleece-hoodie' },
    create: {
      name: 'Tech Fleece Hoodie',
      slug: 'nike-tech-fleece-hoodie',
      brand: 'Nike',
      description: 'Sudadera premium en tejido tech fleece, corte relajado y acabado minimalista.',
      priceCents: 45000000,
      images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200'],
      sizes: ['S', 'M', 'L', 'XL'],
      stock: 25,
    },
    update: {},
  });

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
