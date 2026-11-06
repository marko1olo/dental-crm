/**
 * DENTE Dental CRM — Patient Presentation Clinical Graphic Assets & Empty State Helpers
 *
 * Mandate 8c: Honest clinical empty state, zero cartoon mockery.
 * Clean, neutral monochromatic clinical vectors for aesthetic demonstrations.
 */

export const DEMO_BEFORE_SMILE_SVG =
	'data:image/svg+xml;utf8,' +
	encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
  <defs>
    <radialGradient id="bgClinicalBefore" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
    <linearGradient id="teethClinicalBefore" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="60%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
  </defs>
  <rect width="960" height="720" fill="url(#bgClinicalBefore)"/>
  <ellipse cx="480" cy="380" rx="280" ry="140" fill="#1e293b" opacity="0.8"/>
  <path d="M 280,360 Q 480,330 680,360 Q 640,430 480,440 Q 320,430 280,360 Z" fill="#0f172a"/>
  <!-- Анатомически выверенные контуры резцов и премоляров -->
  <rect x="425" y="340" width="48" height="65" rx="6" fill="url(#teethClinicalBefore)"/>
  <rect x="487" y="340" width="48" height="65" rx="6" fill="url(#teethClinicalBefore)"/>
  <rect x="370" y="348" width="45" height="58" rx="6" fill="url(#teethClinicalBefore)"/>
  <rect x="545" y="348" width="45" height="58" rx="6" fill="url(#teethClinicalBefore)"/>
  <rect x="320" y="355" width="42" height="54" rx="6" fill="url(#teethClinicalBefore)"/>
  <rect x="600" y="355" width="42" height="54" rx="6" fill="url(#teethClinicalBefore)"/>
</svg>
`);

export const DEMO_AFTER_SMILE_SVG =
	'data:image/svg+xml;utf8,' +
	encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
  <defs>
    <radialGradient id="bgClinicalAfter" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
    <linearGradient id="teethClinicalAfter" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="960" height="720" fill="url(#bgClinicalAfter)"/>
  <ellipse cx="480" cy="380" rx="280" ry="140" fill="#1e293b" opacity="0.8"/>
  <path d="M 280,360 Q 480,330 680,360 Q 640,430 480,440 Q 320,430 280,360 Z" fill="#0f172a"/>
  <!-- Анатомически выверенные контуры отреставрированной улыбки -->
  <rect x="428" y="338" width="50" height="68" rx="8" fill="url(#teethClinicalAfter)"/>
  <rect x="482" y="338" width="50" height="68" rx="8" fill="url(#teethClinicalAfter)"/>
  <rect x="372" y="345" width="48" height="62" rx="8" fill="url(#teethClinicalAfter)"/>
  <rect x="540" y="345" width="48" height="62" rx="8" fill="url(#teethClinicalAfter)"/>
  <rect x="320" y="352" width="44" height="56" rx="8" fill="url(#teethClinicalAfter)"/>
  <rect x="596" y="352" width="44" height="56" rx="8" fill="url(#teethClinicalAfter)"/>
</svg>
`);
