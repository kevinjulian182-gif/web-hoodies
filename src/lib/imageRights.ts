// Copyright embedded in every photo the store publishes (EXIF fields that
// Google Images, photo apps and most CMSs show as the author / rights).
export function copyrightExif() {
  const year = new Date().getFullYear();
  return {
    IFD0: {
      Artist: 'AFRA',
      Copyright: `© ${year} AFRA (wearafra.com). Todos los derechos reservados. Prohibido su uso sin autorización.`,
    },
  };
}
