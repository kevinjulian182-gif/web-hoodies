import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SIZES = ['S', 'M', 'L', 'XL'];

/** Placeholder imagery in the store's own palette — swap for real product photography from the admin panel. */
function placeholder(label: string) {
  const encoded = encodeURIComponent(label);
  return `https://placehold.co/900x1125/2A2119/FDFCFA?text=${encoded}`;
}

/** Sample stock photography standing in for real product shoots — replace per product from the admin panel. */
function stockPhotos(seed: string, count: number) {
  return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/afra-${seed}-${i}/900/1125`);
}

/** Wide stock photo for blog covers — replace with real photography from Admin > Blog once you have it. */
function blogCover(seed: string) {
  return `https://picsum.photos/seed/afra-blog-${seed}/1600/900`;
}

function materialsFor(name: string) {
  if (/jacket/i.test(name)) return '100% nylon ripstop con forro interior acolchado y costuras reforzadas.';
  return '80% algodón peinado, 20% poliéster — felpa francesa de 400 GSM, tacto suave y alta durabilidad.';
}

function detailsFor(name: string) {
  if (/jacket/i.test(name)) {
    return ['Cierre frontal completo', 'Bolsillos laterales con cremallera', 'Capucha ajustable', 'Puños y cintura elásticos'].join(
      '\n'
    );
  }
  return ['Corte oversized relajado', 'Bolsillo canguro delantero', 'Capucha forrada de doble tela', 'Puños y cintura acanalados'].join(
    '\n'
  );
}

const CARE_INSTRUCTIONS =
  'Lava en frío, del revés y con colores similares. Evita la secadora y no planches directamente sobre estampados o bordados.';

const REVIEWS: Record<string, { authorName: string; rating: number; comment: string }[]> = {
  'nike-tech-fleece-hoodie': [
    { authorName: 'Camila Restrepo', rating: 5, comment: 'La tela se siente premium de verdad y llegó en 3 días a Medellín.' },
    { authorName: 'Juan Pablo Osorio', rating: 4, comment: 'Me quedó un poco grande en M, pero la calidad es excelente.' },
  ],
  'supreme-box-logo-hoodie': [
    { authorName: 'Daniela Marulanda', rating: 5, comment: 'Original 100%, verifiqué las costuras y todo coincide con la tienda oficial.' },
    { authorName: 'Andrés Felipe Cano', rating: 5, comment: 'Pago contra entrega sin complicaciones, la pieza vale cada peso.' },
  ],
  'bape-shark-full-zip-hoodie': [
    { authorName: 'Laura Vanessa Gómez', rating: 5, comment: 'El camuflaje es idéntico al oficial, capucha bien forrada.' },
    { authorName: 'Miguel Ángel Torres', rating: 4, comment: 'Excelente hoodie, tardó 4 días en llegar a Cali pero llegó impecable.' },
  ],
  'essentials-core-hoodie': [
    { authorName: 'Valentina Zapata', rating: 5, comment: 'El logo reflectivo se nota muy bien de noche, corte perfecto.' },
    { authorName: 'Santiago Ríos', rating: 4, comment: 'Buena calidad, aunque esperaba un poco más de peso en la tela.' },
  ],
  'adidas-trefoil-hoodie': [
    { authorName: 'María José Peláez', rating: 5, comment: 'Clásico que nunca falla, el bordado quedó perfecto después de varios lavados.' },
  ],
  'tommy-hilfiger-varsity-jacket': [
    { authorName: 'Carlos Eduardo Mesa', rating: 4, comment: 'Muy buen acabado, los parches bordados se ven de calidad real.' },
  ],
};

const PRODUCTS: Array<{
  name: string;
  slug: string;
  brand: string;
  description: string;
  priceCOP: number;
  compareAtPriceCOP?: number;
  stock: number;
  colors: string[];
}> = [
  {
    name: 'Tech Fleece Hoodie',
    slug: 'nike-tech-fleece-hoodie',
    brand: 'Nike',
    description: 'Sudadera premium en tejido tech fleece, corte relajado y acabado minimalista.',
    priceCOP: 450000,
    compareAtPriceCOP: 560000,
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
    compareAtPriceCOP: 450000,
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
  {
    name: 'Tiger Camo Hoodie',
    slug: 'bape-tiger-camo-hoodie',
    brand: 'Bape',
    description: 'Hoodie en algodón pesado con estampado de camuflaje tigre y capucha forrada.',
    priceCOP: 920000,
    stock: 9,
    colors: ['Camuflado', 'Naranja'],
  },
  {
    name: 'College Zip Hoodie',
    slug: 'bape-college-zip-hoodie',
    brand: 'Bape',
    description: 'Hoodie con cierre completo, letras estilo universitario bordadas y puños acanalados.',
    priceCOP: 890000,
    stock: 11,
    colors: ['Negro', 'Amarillo'],
  },
];

const BLOG_POSTS: Array<{ title: string; slug: string; excerpt: string; content: string; coverSeed: string }> = [
  {
    title: 'Cómo distinguir streetwear original de una réplica',
    slug: 'como-distinguir-original-de-replica',
    excerpt: 'Cinco detalles que casi nadie revisa antes de comprar, y que delatan una pieza falsa al instante.',
    coverSeed: 'authenticity-check',
    content: `La diferencia entre una pieza original y una réplica casi nunca está en el logo — está en los detalles que una fábrica no autorizada no puede replicar a bajo costo.

Primero, revisa las costuras interiores. En una prenda original son parejas, sin hilos sueltos, y el refuerzo en axilas y bolsillos es visible. Segundo, el peso del algodón: el streetwear premium usa telas de gramaje alto (300-450 GSM); si se siente ligera y transparente al trasluz, desconfía.

Tercero, las etiquetas de lavado y composición deben coincidir exactamente con las del sitio oficial de la marca — tipografía, espaciado, hasta el código de barras. Cuarto, el empaque: las marcas grandes cuidan obsesivamente sus bolsas y cajas; un empaque genérico es la primera señal de alerta.

Por último, el precio. Si una pieza que normalmente cuesta el doble aparece "en oferta" muy por debajo del mercado, no es suerte: es una réplica. En AFRA trabajamos solo con distribuidores autorizados, así que cada prenda que ves en el catálogo ya pasó este filtro por ti.`,
  },
  {
    title: 'Guía de cuidado: cómo lavar tu hoodie premium sin arruinarlo',
    slug: 'guia-cuidado-hoodie-premium',
    excerpt: 'El algodón pesado y la felpa francesa necesitan un trato distinto al de una camiseta cualquiera.',
    coverSeed: 'garment-care',
    content: `Un hoodie de 400+ GSM es una inversión, y se cuida distinto a la ropa básica. La regla más importante: agua fría, siempre. El agua caliente encoge las fibras de algodón y hace que el estampado o bordado se agriete con el tiempo.

Voltea la prenda al revés antes de lavarla — esto protege el color y cualquier gráfico serigrafiado o bordado del roce directo con otras prendas. Evita la secadora en calor alto; si puedes, seca al aire libre o usa ciclo baja temperatura. El calor excesivo es la causa número uno de que un hoodie premium pierda su forma original.

No uses suavizante en exceso: deja residuo en la felpa interior y reduce esa sensación afelpada tan característica del algodón francés. Y lava del revés con colores similares para evitar transferencia de tinte, especialmente en piezas camufladas o estampadas.

Siguiendo esto, una pieza bien hecha te dura años, no temporadas.`,
  },
  {
    title: 'La historia detrás de Essentials: minimalismo que se volvió culto',
    slug: 'historia-essentials',
    excerpt: 'Cómo una sub-línea de Fear of God redefinió lo que significa "básico" en el streetwear.',
    coverSeed: 'essentials-minimal',
    content: `Cuando Jerry Lorenzo lanzó Essentials en 2018, la propuesta parecía contradictoria: streetwear de lujo, pero sin logos gigantes ni gráficos llamativos. La apuesta era el corte, la tela y la silueta — nada más.

Esa moderación fue justo lo que la volvió icónica. En un mercado saturado de estampados y colaboraciones ruidosas, Essentials ofreció algo raro: piezas que se ven caras sin gritarlo. El logo reflectivo, casi invisible a plena luz, se convirtió en una firma silenciosa que solo quien sabe, reconoce.

La marca popularizó también la silueta oversized con mangas caídas y capuchas 3D — un patrón de corte que hoy copian marcas de fast fashion en todo el mundo, casi siempre peor.

Hoy Essentials es de las colecciones más buscadas en la reventa, y en AFRA la manejamos porque representa exactamente lo que creemos: menos ruido, más calidad.`,
  },
  {
    title: 'Guía de tallas: cómo elegir el fit correcto en streetwear oversized',
    slug: 'guia-tallas-fit-oversized',
    excerpt: 'Oversized no significa "una talla más" — así se calcula el fit que realmente se ve bien.',
    coverSeed: 'sizing-fit',
    content: `El error más común al comprar streetwear oversized es simplemente pedir una talla más de lo normal. El resultado casi siempre es una prenda que se ve descuidada en vez de intencional.

La clave está en el largo de manga y el ancho de hombro. En un fit oversized correcto, la costura del hombro cae ligeramente por debajo del hombro real (2-4 cm), nunca a mitad del brazo. Si la costura llega al bíceps, la talla es demasiado grande.

Para hoodies y sudaderas, el largo ideal cubre hasta la mitad del bolsillo trasero del pantalón — ni más corto (se ve como talla normal) ni tan largo que parezca vestido. En chaquetas, deja espacio para una camiseta y un hoodie debajo sin que se vea abultado en los hombros.

Si dudas entre dos tallas, en piezas estructuradas (chaquetas varsity, cortavientos) baja una talla; en piezas de punto suelto (hoodies, sudaderas boxy) mantente en tu talla habitual o sube una. Revisa siempre la tabla de medidas específica de cada pieza en su página de producto.`,
  },
  {
    title: 'Pago contra entrega en Colombia: cómo funciona y por qué es la forma más segura de comprar streetwear online',
    slug: 'pago-contra-entrega-streetwear-colombia',
    excerpt: 'Cómo funciona el pago contra entrega paso a paso, qué pasa si algo no coincide con tu pedido, y por qué reduce el riesgo de comprar ropa por internet.',
    content: `Comprar ropa de marca por internet sin conocer la tienda genera una duda razonable: ¿y si la pieza no es lo que esperaba? El pago contra entrega existe exactamente para resolver eso, y en Colombia se ha vuelto el método preferido para compras de moda online.

El proceso es simple. Confirmas tu pedido en el sitio sin pagar nada por adelantado. La transportadora (en nuestro caso, Inter Rapidísimo) te lleva el paquete a la dirección que registraste, normalmente en 2 a 5 días hábiles según la ciudad. Antes de pagar, puedes revisar que la prenda, la talla y el color correspondan a lo que compraste. Solo entonces pagas, en efectivo o con datáfono según lo que maneje el mensajero.

¿Qué pasa si algo no cuadra? Si el pedido llega incompleto, dañado o no corresponde a lo comprado, tienes el derecho — y el momento — de no recibirlo o de contactar a la tienda antes de completar el pago. Esa es la ventaja real frente a pagar en línea de entrada: el riesgo se reduce casi a cero para el comprador.

Para la tienda también tiene sentido: reduce las devoluciones por desconfianza y genera una primera compra sin fricción para quien todavía no conoce la marca. Es, en resumen, un método pensado para un mercado donde comprar ropa de marcas internacionales por internet todavía genera dudas — y donde la confianza se construye pedido a pedido.

En AFRA ofrecemos pago contra entrega en todo el país junto con pago en línea para quien lo prefiera, precisamente para que la forma de pagar nunca sea la razón por la que alguien no se anima a comprar.`,
    coverSeed: 'cod-delivery',
  },
  {
    title: '5 formas de combinar un hoodie oversized sin verte descuidado',
    slug: 'como-combinar-hoodie-oversized',
    excerpt: 'El oversized se ve intencional o se ve descuidado según lo que le pongas debajo y al lado — estas cinco combinaciones nunca fallan.',
    content: `El hoodie oversized tiene mala fama de "ropa de quedarse en casa" cuando se combina mal. La diferencia entre verse descuidado y verse intencional está casi siempre en el contraste: si la parte de arriba es holgada, la de abajo debe dar estructura.

La combinación más segura es hoodie oversized con jean recto o slim y tenis blancos limpios. El volumen arriba y la línea recta abajo crean equilibrio sin esfuerzo — es la fórmula que más se repite en streetwear porque simplemente funciona.

Para un look más elaborado, capas: una camiseta de cuello redondo debajo del hoodie, visible solo en el cuello, y encima una chaqueta cortavientos o varsity desabrochada. Esto agrega profundidad visual sin sumar volumen real al cuerpo.

Con jogger o sweatpants, el riesgo es verse "todo suelto". Soluciónalo ajustando un extremo: si el hoodie es muy oversized, el jogger debe ser recto o ligeramente ajustado al tobillo, nunca igual de ancho arriba y abajo.

Los accesorios también cumplen su función: una gorra estructurada, un morral cruzado o una cadena visible en el cuello rompen la monotonía de una silueta grande y le devuelven ese punto de intención que hace la diferencia entre "cómodo" y "descuidado".

Por último, el color. Un hoodie oversized en un solo tono (negro, gris, beige) es más fácil de combinar que uno con estampados grandes — reserva las piezas gráficas para cuando el resto del outfit sea completamente neutro.`,
    coverSeed: 'outfit-styling',
  },
  {
    title: 'Streetwear vs. moda urbana: qué las diferencia y por qué la confusión es tan común',
    slug: 'streetwear-vs-moda-urbana-diferencias',
    excerpt: 'No es solo una etiqueta de marketing — el streetwear tiene un origen, unas reglas y una cultura detrás que la moda urbana genérica no siempre respeta.',
    content: `"Streetwear" y "moda urbana" se usan como sinónimos todo el tiempo, pero no describen lo mismo. La confusión viene de que ambas comparten siluetas — hoodies, tenis, gorras — pero el origen y las reglas detrás son distintos.

El streetwear nació en las subculturas del skate y el surf de California en los 80 y 90, y se consolidó con marcas como Supreme en Nueva York durante los 90. Su ADN incluye ediciones limitadas, colaboraciones inesperadas entre marcas de lujo y skate shops, y un componente de comunidad: quién hace fila, quién consigue el drop, quién lo revende.

La moda urbana, en cambio, es un término más amplio que describe ropa inspirada en la estética de ciudad — cómoda, casual, con influencia hip-hop — sin necesariamente tener esa estructura de ediciones limitadas ni el linaje cultural específico. Una sudadera genérica de fast fashion con un gráfico "urbano" no es streetwear solo porque se parezca.

La diferencia práctica para quien compra: el streetwear auténtico suele sostener o incluso subir su valor de reventa (un Supreme box logo o un Bape shark hoodie en buen estado se revende años después), mientras que la moda urbana genérica pierde valor como cualquier prenda de temporada.

Ninguna es "mejor" — cumplen necesidades distintas. Pero si lo que buscas es una pieza con historia, comunidad y potencial de colección detrás, ahí es donde el streetwear de marcas reconocidas se distingue de una imitación del estilo.`,
    coverSeed: 'streetwear-culture',
  },
  {
    title: 'Supreme, Bape y el culto al box logo: por qué algunas piezas suben de precio con los años',
    slug: 'supreme-bape-box-logo-valor-reventa',
    excerpt: 'Escasez, colaboraciones y comunidad: los tres factores que explican por qué un hoodie de hace cinco años vale hoy más de lo que costó nuevo.',
    content: `En la mayoría de la ropa, el valor solo baja con el tiempo. En streetwear, ciertas piezas hacen justo lo contrario — y entender por qué ayuda a comprar con criterio, no solo por moda.

El primer factor es la escasez deliberada. Supreme lanza cantidades limitadas cada "drop" y nunca reabastece; cuando se agota, se agotó. Bape trabaja de forma similar con ediciones de camuflaje y colaboraciones puntuales. Esa escasez artificial es lo que sostiene el mercado de reventa: si todos pudieran comprar la pieza cuando quisieran, nadie pagaría de más por ella después.

El segundo factor son las colaboraciones. Un box logo de Supreme con Louis Vuitton o un shark hoodie de Bape en un colorway de edición limitada valen más que la versión estándar porque combinan dos audiencias — la del streetwear y la del lujo, o dos fanbases de marca — en una sola pieza.

El tercer factor, menos obvio, es la comunidad y la verificación. Plataformas de reventa como StockX o Grailed dependen de que la pieza sea auténtica y esté en buen estado; el mercado paga una prima por algo que se puede verificar y de lo que existe consenso sobre su rareza real, no solo percibida.

Para quien compra streetwear pensando también en su valor a futuro, la recomendación es simple: prioriza piezas icónicas de marcas con historia sobre gráficos de temporada, conserva el empaque y las etiquetas originales, y evita el uso agresivo si planeas revender. El box logo no sube de precio por accidente — sube porque la pieza, la marca y el momento coincidieron.`,
    coverSeed: 'boxlogo-collectible',
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
    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        description: product.description,
        materials: materialsFor(product.name),
        details: detailsFor(product.name),
        careInstructions: CARE_INSTRUCTIONS,
        priceCents: product.priceCOP * 100,
        compareAtPriceCents: product.compareAtPriceCOP ? product.compareAtPriceCOP * 100 : null,
        images: stockPhotos(product.slug, 3),
        sizes: SIZES,
        colors: product.colors,
        stock: product.stock,
      },
      // Keep the catalog's text/attributes in sync on re-seed, but never
      // clobber stock or images an admin may have already replaced live.
      update: {
        name: product.name,
        brand: product.brand,
        description: product.description,
        materials: materialsFor(product.name),
        details: detailsFor(product.name),
        careInstructions: CARE_INSTRUCTIONS,
        priceCents: product.priceCOP * 100,
        compareAtPriceCents: product.compareAtPriceCOP ? product.compareAtPriceCOP * 100 : null,
        sizes: SIZES,
        colors: product.colors,
      },
    });

    const sampleReviews = REVIEWS[product.slug];
    if (sampleReviews) {
      const existing = await prisma.review.count({ where: { productId: saved.id } });
      if (existing === 0) {
        await prisma.review.createMany({
          data: sampleReviews.map((r) => ({ ...r, productId: saved.id })),
        });
      }
    }
  }

  for (const post of BLOG_POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: blogCover(post.coverSeed),
      },
      // coverImage is included here for this one-time swap from the old
      // text-card placeholders to sample photography — drop it from update
      // again afterward so future re-seeds stop overwriting real cover
      // photos an admin has since uploaded.
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: blogCover(post.coverSeed),
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
