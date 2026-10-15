// PARAMO wordmark: geometric uniform-weight letters, both A's drawn as bare
// mountain peaks (Λ). Pure SVG in currentColor so it stays crisp at any
// size and follows whatever text color its container sets.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 561 100" role="img" aria-label="Paramo" className={className} fill="currentColor">
      <g fill="none" stroke="currentColor" strokeWidth="9">
        <path d="M4.5 0V100M4.5 4.5H36a22.75 22.75 0 0 1 0 45.5H4.5" />
        <path d="M185.5 0V100M185.5 4.5H217a22.75 22.75 0 0 1 0 45.5H185.5" />
        <ellipse cx="515.5" cy="50" rx="41" ry="45.5" />
      </g>
      <polygon points="87,100 122,0 157,100 147.5,100 122,27.14 96.5,100" />
      <polygon points="212,50 222,50 248,100 238,100" />
      <polygon points="272,100 307,0 342,100 332.5,100 307,27.14 281.5,100" />
      <polygon points="366,100 366,0 377,0 406,60 435,0 446,0 446,100 437,100 437,16.55 406,80.7 375,16.55 375,100" />
    </svg>
  );
}
