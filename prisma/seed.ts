import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SIZES = ['S', 'M', 'L', 'XL'];

/** Placeholder imagery in the store's own palette — swap for real product photography from the admin panel. */
function placeholder(label: string) {
  const encoded = encodeURIComponent(label);
  return `https://placehold.co/900x1125/2A2119/FDFCFA?text=${encoded}`;
}

const PRODUCTS: Array<{
  name: string;
  slug: string;
  brand: string;
  description: string;
  priceCOP: number;
  stock: number;
}> = [
  {
    name: 'Tech Fleece Hoodie',
    slug: 'nike-tech-fleece-hoodie',
    brand: 'Nike',
    description: 'Sudadera premium en tejido tech fleece, corte relajado y acabado minimalista.',
    priceCOP: 450000,
    stock: 25,
  },
  {
    name: 'Windrunner Jacket',
    slug: 'nike-windrunner-jacket',
    brand: 'Nike',
    description: 'Chaqueta cortavientos icónica, silueta oversized y paneles de color en nylon ripstop.',
    priceCOP: 520000,
    stock: 18,
  },
  {
    name: 'Trefoil Hoodie',
    slug: 'adidas-trefoil-hoodie',
    brand: 'Adidas',
    description: 'Hoodie en algodón French Terry con el trébol bordado al pecho, corte clásico.',
    priceCOP: 380000,
    stock: 30,
  },
  {
    name: 'Firebird Track Jacket',
    slug: 'adidas-firebird-track-jacket',
    brand: 'Adidas',
    description: 'Chaqueta deportiva con las tres franjas, cierre completo y forro satinado.',
    priceCOP: 410000,
    stock: 22,
  },
  {
    name: 'Box Logo Hoodie',
    slug: 'supreme-box-logo-hoodie',
    brand: 'Supreme',
    description: 'La pieza más buscada de la temporada: hoodie pesado con el box logo serigrafiado.',
    priceCOP: 890000,
    stock: 8,
  },
  {
    name: 'Bandana Camo Jacket',
    slug: 'supreme-bandana-camo-jacket',
    brand: 'Supreme',
    description: 'Chaqueta acolchada con estampado bandana camo exclusivo de la colección.',
    priceCOP: 950000,
    stock: 6,
  },
  {
    name: 'Mascot Hoodie',
    slug: 'drew-house-mascot-hoodie',
    brand: 'Drew House',
    description: 'Hoodie oversized con la mascota bordada, algodón ultra pesado y tacto suave.',
    priceCOP: 620000,
    stock: 14,
  },
  {
    name: 'Boxy Sweatshirt',
    slug: 'drew-house-boxy-sweatshirt',
    brand: 'Drew House',
    description: 'Sudadera de corte boxy en tonos pastel, manga caída y felpa premium.',
    priceCOP: 580000,
    stock: 16,
  },
  {
    name: 'Essentials Hoodie',
    slug: 'essentials-core-hoodie',
    brand: 'Essentials',
    description: 'Hoodie minimalista de Fear of God Essentials, capucha 3D y logo reflectivo.',
    priceCOP: 490000,
    stock: 20,
  },
  {
    name: 'Essentials Track Jacket',
    slug: 'essentials-track-jacket',
    brand: 'Essentials',
    description: 'Chaqueta ligera de entretiempo con cierre y detalles reflectivos discretos.',
    priceCOP: 540000,
    stock: 12,
  },
  {
    name: 'Varsity Jacket',
    slug: 'tommy-hilfiger-varsity-jacket',
    brand: 'Tommy Hilfiger',
    description: 'Chaqueta varsity en lana y cuero sintético con parches bordados clásicos.',
    priceCOP: 610000,
    stock: 15,
  },
  {
    name: 'Logo Hoodie',
    slug: 'tommy-hilfiger-logo-hoodie',
    brand: 'Tommy Hilfiger',
    description: 'Hoodie de algodón orgánico con el logo bandera bordado al pecho.',
    priceCOP: 350000,
    stock: 28,
  },
  {
    name: 'Shark Full Zip Hoodie',
    slug: 'bape-shark-full-zip-hoodie',
    brand: 'Bape',
    description: 'El icónico hoodie shark con capucha de cremallera completa y camuflaje firmado.',
    priceCOP: 980000,
    stock: 7,
  },
  {
    name: 'Camo Jacket',
    slug: 'bape-camo-jacket',
    brand: 'Bape',
    description: 'Chaqueta acolchada en camuflaje clásico de la marca, forro interno térmico.',
    priceCOP: 1050000,
    stock: 5,
  },
];

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

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        description: product.description,
        priceCents: product.priceCOP * 100,
        images: [placeholder(`${product.brand}\n${product.name}`)],
        sizes: SIZES,
        stock: product.stock,
      },
      update: {},
    });
  }

  console.log(`Seed completado: ${PRODUCTS.length} productos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
