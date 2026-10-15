/**
 * DENTE Dental CRM — Patient Presentation Demo Graphic Assets & Fallbacks
 *
 * Vector smile representations for high-fidelity clinical demonstration
 * when opened without prior slot selection.
 */

export const DEMO_BEFORE_SMILE_SVG =
	'data:image/svg+xml;utf8,' +
	encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
  <defs>
    <radialGradient id="bgBefore" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="teethBefore" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f5e6cb"/>
      <stop offset="60%" stop-color="#ecd1a7"/>
      <stop offset="100%" stop-color="#d8b27d"/>
    </linearGradient>
  </defs>
  <rect width="960" height="720" fill="url(#bgBefore)"/>
  <ellipse cx="480" cy="380" rx="280" ry="140" fill="#4a1525" opacity="0.9"/>
  <path d="M 280,360 Q 480,320 680,360 Q 640,430 480,440 Q 320,430 280,360 Z" fill="#2d0b16"/>
  <rect x="425" y="340" width="48" height="65" rx="6" fill="url(#teethBefore)"/>
  <rect x="487" y="340" width="48" height="65" rx="6" fill="url(#teethBefore)"/>
  <rect x="370" y="348" width="45" height="58" rx="6" fill="url(#teethBefore)"/>
  <rect x="545" y="348" width="45" height="58" rx="6" fill="url(#teethBefore)"/>
  <rect x="320" y="355" width="42" height="54" rx="6" fill="url(#teethBefore)"/>
  <rect x="600" y="355" width="42" height="54" rx="6" fill="url(#teethBefore)"/>
</svg>
`);

export const DEMO_AFTER_SMILE_SVG =
	'data:image/svg+xml;utf8,' +
	encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
  <defs>
    <radialGradient id="bgAfter" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="teethAfter" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f0f7ff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </linearGradient>
  </defs>
  <rect width="960" height="720" fill="url(#bgAfter)"/>
  <ellipse cx="480" cy="380" rx="280" ry="140" fill="#4a1525" opacity="0.9"/>
  <path d="M 280,360 Q 480,320 680,360 Q 640,430 480,440 Q 320,430 280,360 Z" fill="#2d0b16"/>
  <rect x="428" y="338" width="50" height="68" rx="8" fill="url(#teethAfter)"/>
  <rect x="482" y="338" width="50" height="68" rx="8" fill="url(#teethAfter)"/>
  <rect x="372" y="345" width="48" height="62" rx="8" fill="url(#teethAfter)"/>
  <rect x="540" y="345" width="48" height="62" rx="8" fill="url(#teethAfter)"/>
  <rect x="320" y="352" width="44" height="56" rx="8" fill="url(#teethAfter)"/>
  <rect x="596" y="352" width="44" height="56" rx="8" fill="url(#teethAfter)"/>
</svg>
`);
