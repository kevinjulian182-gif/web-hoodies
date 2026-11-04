import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tus favoritos',
  description: 'Las piezas de streetwear que estás siguiendo de cerca en AFRA.',
  robots: { index: false, follow: true },
};

export default function FavoritosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
