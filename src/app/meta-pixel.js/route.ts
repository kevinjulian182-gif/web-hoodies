import { META_PIXEL_ID } from '@/lib/metaPixel';
import { COOKIE_CONSENT_KEY } from '@/lib/legal';

// The Meta Pixel base code, served as one file and loaded once from the
// <head>. Inlined, Next.js also copies a script's text into the page's
// hydration data, so tools that scan the HTML saw the pixel twice.
// Nothing is sent to Meta until the visitor accepts cookies (banner); a
// guard keeps it from initializing twice.
const CODE = `(function () {
if (window.__afraPixel) return;
window.__afraPixel = true;
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
var consent = null;
try { consent = JSON.parse(localStorage.getItem('${COOKIE_CONSENT_KEY}')); } catch (e) {}
fbq('consent', consent && consent.choice === 'all' ? 'grant' : 'revoke');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
})();
`;

export function GET() {
  return new Response(CODE, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
