// AFRA wordmark: geometric uniform-weight letters with both A's drawn as
// bare peaks (Λ). Pure SVG in currentColor so it stays crisp at any size
// and follows whatever text color its container sets.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 334 100" role="img" aria-label="AFRA" className={className} fill="currentColor">
      <g fill="none" stroke="currentColor" strokeWidth="9">
        <path d="M98.5 0V100M94 4.5H149M94 50H141" />
        <path d="M177.5 0V100M177.5 4.5H209a22.75 22.75 0 0 1 0 45.5H177.5" />
      </g>
      <polygon points="0,100 35,0 70,100 60.5,100 35,27.14 9.5,100" />
      <polygon points="204,50 214,50 240,100 230,100" />
      <polygon points="264,100 299,0 334,100 324.5,100 299,27.14 273.5,100" />
    </svg>
  );
}
