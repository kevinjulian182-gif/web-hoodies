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
  colors: string[];
}> = [
  {
    name: 'Tech Fleece Hoodie',
    slug: 'nike-tech-fleece-hoodie',
    brand: 'Nike',
    description: 'Sudadera premium en tejido tech fleece, corte relajado y acabado minimalista.',
    priceCOP: 450000,
    stock: 25,
    colors: ['Negro', 'Gris'],
  },
  {
    name: 'Windrunner Jacket',
    slug: 'nike-windrunner-jacket',
    brand: 'Nike',
    description: 'Chaqueta cortavientos icónica, silueta oversized y paneles de color en nylon ripstop.',
    priceCOP: 520000,
    stock: 18,
    colors: ['Azul', 'Blanco'],
  },
  {
    name: 'Trefoil Hoodie',
    slug: 'adidas-trefoil-hoodie',
    brand: 'Adidas',
    description: 'Hoodie en algodón French Terry con el trébol bordado al pecho, corte clásico.',
    priceCOP: 380000,
    stock: 30,
    colors: ['Negro', 'Crema'],
  },
  {
    name: 'Firebird Track Jacket',
    slug: 'adidas-firebird-track-jacket',
    brand: 'Adidas',
    description: 'Chaqueta deportiva con las tres franjas, cierre completo y forro satinado.',
    priceCOP: 410000,
    stock: 22,
    colors: ['Azul marino', 'Negro'],
  },
  {
    name: 'Box Logo Hoodie',
    slug: 'supreme-box-logo-hoodie',
    brand: 'Supreme',
    description: 'La pieza más buscada de la temporada: hoodie pesado con el box logo serigrafiado.',
    priceCOP: 890000,
    stock: 8,
    colors: ['Rojo', 'Negro'],
  },
  {
    name: 'Bandana Camo Jacket',
    slug: 'supreme-bandana-camo-jacket',
    brand: 'Supreme',
    description: 'Chaqueta acolchada con estampado bandana camo exclusivo de la colección.',
    priceCOP: 950000,
    stock: 6,
    colors: ['Camuflado'],
  },
  {
    name: 'Mascot Hoodie',
    slug: 'drew-house-mascot-hoodie',
    brand: 'Drew House',
    description: 'Hoodie oversized con la mascota bordada, algodón ultra pesado y tacto suave.',
    priceCOP: 620000,
    stock: 14,
    colors: ['Beige', 'Rosado'],
  },
  {
    name: 'Boxy Sweatshirt',
    slug: 'drew-house-boxy-sweatshirt',
    brand: 'Drew House',
    description: 'Sudadera de corte boxy en tonos pastel, manga caída y felpa premium.',
    priceCOP: 580000,
    stock: 16,
    colors: ['Rosado', 'Crema'],
  },
  {
    name: 'Essentials Hoodie',
    slug: 'essentials-core-hoodie',
    brand: 'Essentials',
    description: 'Hoodie minimalista de Fear of God Essentials, capucha 3D y logo reflectivo.',
    priceCOP: 490000,
    stock: 20,
    colors: ['Beige', 'Negro', 'Gris'],
  },
  {
    name: 'Essentials Track Jacket',
    slug: 'essentials-track-jacket',
    brand: 'Essentials',
    description: 'Chaqueta ligera de entretiempo con cierre y detalles reflectivos discretos.',
    priceCOP: 540000,
    stock: 12,
    colors: ['Gris oscuro'],
  },
  {
    name: 'Varsity Jacket',
    slug: 'tommy-hilfiger-varsity-jacket',
    brand: 'Tommy Hilfiger',
    description: 'Chaqueta varsity en lana y cuero sintético con parches bordados clásicos.',
    priceCOP: 610000,
    stock: 15,
    colors: ['Azul marino', 'Vino'],
  },
  {
    name: 'Logo Hoodie',
    slug: 'tommy-hilfiger-logo-hoodie',
    brand: 'Tommy Hilfiger',
    description: 'Hoodie de algodón orgánico con el logo bandera bordado al pecho.',
    priceCOP: 350000,
    stock: 28,
    colors: ['Blanco', 'Azul marino'],
  },
  {
    name: 'Shark Full Zip Hoodie',
    slug: 'bape-shark-full-zip-hoodie',
    brand: 'Bape',
    description: 'El icónico hoodie shark con capucha de cremallera completa y camuflaje firmado.',
    priceCOP: 980000,
    stock: 7,
    colors: ['Camuflado', 'Negro'],
  },
  {
    name: 'Camo Jacket',
    slug: 'bape-camo-jacket',
    brand: 'Bape',
    description: 'Chaqueta acolchada en camuflaje clásico de la marca, forro interno térmico.',
    priceCOP: 1050000,
    stock: 5,
    colors: ['Camuflado', 'Verde militar'],
  },
];

const BLOG_POSTS: Array<{ title: string; slug: string; excerpt: string; content: string }> = [
  {
    title: 'Cómo distinguir streetwear original de una réplica',
    slug: 'como-distinguir-original-de-replica',
    excerpt: 'Cinco detalles que casi nadie revisa antes de comprar, y que delatan una pieza falsa al instante.',
    content: `La diferencia entre una pieza original y una réplica casi nunca está en el logo — está en los detalles que una fábrica no autorizada no puede replicar a bajo costo.

Primero, revisa las costuras interiores. En una prenda original son parejas, sin hilos sueltos, y el refuerzo en axilas y bolsillos es visible. Segundo, el peso del algodón: el streetwear premium usa telas de gramaje alto (300-450 GSM); si se siente ligera y transparente al trasluz, desconfía.

Tercero, las etiquetas de lavado y composición deben coincidir exactamente con las del sitio oficial de la marca — tipografía, espaciado, hasta el código de barras. Cuarto, el empaque: las marcas grandes cuidan obsesivamente sus bolsas y cajas; un empaque genérico es la primera señal de alerta.

Por último, el precio. Si una pieza que normalmente cuesta el doble aparece "en oferta" muy por debajo del mercado, no es suerte: es una réplica. En AFRA trabajamos solo con distribuidores autorizados, así que cada prenda que ves en el catálogo ya pasó este filtro por ti.`,
  },
  {
    title: 'Guía de cuidado: cómo lavar tu hoodie premium sin arruinarlo',
    slug: 'guia-cuidado-hoodie-premium',
    excerpt: 'El algodón pesado y la felpa francesa necesitan un trato distinto al de una camiseta cualquiera.',
    content: `Un hoodie de 400+ GSM es una inversión, y se cuida distinto a la ropa básica. La regla más importante: agua fría, siempre. El agua caliente encoge las fibras de algodón y hace que el estampado o bordado se agriete con el tiempo.

Voltea la prenda al revés antes de lavarla — esto protege el color y cualquier gráfico serigrafiado o bordado del roce directo con otras prendas. Evita la secadora en calor alto; si puedes, seca al aire libre o usa ciclo baja temperatura. El calor excesivo es la causa número uno de que un hoodie premium pierda su forma original.

No uses suavizante en exceso: deja residuo en la felpa interior y reduce esa sensación afelpada tan característica del algodón francés. Y lava del revés con colores similares para evitar transferencia de tinte, especialmente en piezas camufladas o estampadas.

Siguiendo esto, una pieza bien hecha te dura años, no temporadas.`,
  },
  {
    title: 'La historia detrás de Essentials: minimalismo que se volvió culto',
    slug: 'historia-essentials',
    excerpt: 'Cómo una sub-línea de Fear of God redefinió lo que significa "básico" en el streetwear.',
    content: `Cuando Jerry Lorenzo lanzó Essentials en 2018, la propuesta parecía contradictoria: streetwear de lujo, pero sin logos gigantes ni gráficos llamativos. La apuesta era el corte, la tela y la silueta — nada más.

Esa moderación fue justo lo que la volvió icónica. En un mercado saturado de estampados y colaboraciones ruidosas, Essentials ofreció algo raro: piezas que se ven caras sin gritarlo. El logo reflectivo, casi invisible a plena luz, se convirtió en una firma silenciosa que solo quien sabe, reconoce.

La marca popularizó también la silueta oversized con mangas caídas y capuchas 3D — un patrón de corte que hoy copian marcas de fast fashion en todo el mundo, casi siempre peor.

Hoy Essentials es de las colecciones más buscadas en la reventa, y en AFRA la manejamos porque representa exactamente lo que creemos: menos ruido, más calidad.`,
  },
  {
    title: 'Guía de tallas: cómo elegir el fit correcto en streetwear oversized',
    slug: 'guia-tallas-fit-oversized',
    excerpt: 'Oversized no significa "una talla más" — así se calcula el fit que realmente se ve bien.',
    content: `El error más común al comprar streetwear oversized es simplemente pedir una talla más de lo normal. El resultado casi siempre es una prenda que se ve descuidada en vez de intencional.

La clave está en el largo de manga y el ancho de hombro. En un fit oversized correcto, la costura del hombro cae ligeramente por debajo del hombro real (2-4 cm), nunca a mitad del brazo. Si la costura llega al bíceps, la talla es demasiado grande.

Para hoodies y sudaderas, el largo ideal cubre hasta la mitad del bolsillo trasero del pantalón — ni más corto (se ve como talla normal) ni tan largo que parezca vestido. En chaquetas, deja espacio para una camiseta y un hoodie debajo sin que se vea abultado en los hombros.

Si dudas entre dos tallas, en piezas estructuradas (chaquetas varsity, cortavientos) baja una talla; en piezas de punto suelto (hoodies, sudaderas boxy) mantente en tu talla habitual o sube una. Revisa siempre la tabla de medidas específica de cada pieza en su página de producto.`,
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
        colors: product.colors,
        stock: product.stock,
      },
      // Keep the catalog's text/attributes in sync on re-seed, but never
      // clobber images/stock an admin may have already customized live.
      update: {
        name: product.name,
        brand: product.brand,
        description: product.description,
        priceCents: product.priceCOP * 100,
        sizes: SIZES,
        colors: product.colors,
      },
    });
  }

  for (const post of BLOG_POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: placeholder(post.title),
      },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
      },
    });
  }

  console.log(`Seed completado: ${PRODUCTS.length} productos, ${BLOG_POSTS.length} artículos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
