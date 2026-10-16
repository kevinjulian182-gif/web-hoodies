// AFRA identity: a heavy geometric wordmark bookended by two solid peaks —
// each A is a filled triangle with a notch cut from its base instead of a
// crossbar. The notched peak alone is the brand mark (favicon, app icon,
// small spaces). Pure SVG in currentColor so it stays crisp at any size
// and follows whatever text color its container sets.
const PEAK = '0,100 46,0 92,100 62,100 46,64 30,100';

export default function Logo({ className, variant = 'full' }: { className?: string; variant?: 'full' | 'mark' }) {
  if (variant === 'mark') {
    return (
      <svg viewBox="0 0 92 100" role="img" aria-label="AFRA" className={className} fill="currentColor">
        <polygon points={PEAK} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 372 100" role="img" aria-label="AFRA" className={className} fill="currentColor">
      <polygon points={PEAK} />
      <path d="M112 0H170V18H130V41H160V59H130V100H112Z" />
      <path d="M188 0H230A30 30 0 0 1 238 58.9L264 100H243L219 60H206V100H188ZM206 18V42H230A12 12 0 0 0 230 18Z" />
      <polygon points={PEAK} transform="translate(280 0)" />
    </svg>
  );
}
