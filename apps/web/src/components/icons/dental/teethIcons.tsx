import * as React from "react";
import { createDentalIcon } from "./iconFactory.js";

// 1. ToothMolar — Анатомический моляр с Y-образной фиссурой
export const ToothMolar = createDentalIcon(
  "ToothMolar",
  "lucide-tooth-molar",
  <>
    <path d="M6 12c-1.5-1-2-2.2-2-4 0-2.8 2-4.5 4.5-4.5 1.5 0 2.5.5 3.5 1.5 1-1 2-1.5 3.5-1.5 2.5 0 4.5 1.7 4.5 4.5 0 1.8-.5 3-2 4-1 1.7-1.5 3.8-1.5 6.5 0 1.2-.8 2-1.8 2s-1.4-.7-1.7-2c-.5-2.2-1-3.5-1-3.5s-.5 1.3-1 3.5c-.3 1.3-.7 2-1.7 2s-1.8-.8-1.8-2c0-2.7-.5-4.8-1.5-6.5z" />
    <path d="M12 11.5v-3.5" />
    <path d="M9.5 6l2.5 2 2.5-2" />
  </>
);

// 2. ToothCaries — Зуб с кариозной полостью (полный анатомический контур моляра)
export const ToothCaries = createDentalIcon(
  "ToothCaries",
  "lucide-tooth-caries",
  <>
    <path d="M6 12c-1.5-1-2-2.2-2-4 0-2.8 2-4.5 4.5-4.5 1.5 0 2.5.5 3.5 1.5 1-1 2-1.5 3.5-1.5 2.5 0 4.5 1.7 4.5 4.5 0 1.8-.5 3-2 4-1 1.7-1.5 3.8-1.5 6.5 0 1.2-.8 2-1.8 2s-1.4-.7-1.7-2c-.5-2.2-1-3.5-1-3.5s-.5 1.3-1 3.5c-.3 1.3-.7 2-1.7 2s-1.8-.8-1.8-2c0-2.7-.5-4.8-1.5-6.5z" />
    <path d="M12 11.5v-3.5" />
    <path d="M9.5 6l2.5 2" />
    <path d="M14.5 4c0 2 1.3 3.5 3 3.5s2.2-1 2.2-2.5" />
    <ellipse cx="17.2" cy="5.6" rx="1.8" ry="1.2" />
  </>
);

// 3. EndoFileCanal — Эндодонтический файл в корневом канале
export const EndoFileCanal = createDentalIcon(
  "EndoFileCanal",
  "lucide-endo-file-canal",
  <>
    <path d="M5 4c0 5 1.5 10 4 14 1.5 2.4 2.5 3.5 3 3.5s1.5-1.1 3-3.5c2.5-4 4-9 4-14" />
    <rect x="10" y="2" width="4" height="4" rx="1" />
    <line x1="10" y1="4" x2="14" y2="4" />
    <line x1="12" y1="6" x2="12" y2="21" />
    <path d="M10.5 10l3-1.5" />
    <path d="M10.5 13l3-1.5" />
    <path d="M10.5 16l3-1.5" />
    <path d="M10.5 19l3-1.5" />
  </>
);

// 4. ToothShadeGuide — Шкала расцветки зубов VITA (эталонный образец)
export const ToothShadeGuide = createDentalIcon(
  "ToothShadeGuide",
  "lucide-tooth-shade-guide",
  <>
    <rect x="7" y="16" width="10" height="6" rx="1.5" />
    <rect x="9.5" y="18" width="5" height="2" rx=".5" />
    <line x1="12" y1="16" x2="12" y2="11.5" />
    <path d="M8 2.5h8l-.6 5c-.3 2-1.6 3.5-3.4 3.5s-3.1-1.5-3.4-3.5L8 2.5z" />
    <line x1="9" y1="4.5" x2="15" y2="4.5" />
    <line x1="12" y1="5.5" x2="12" y2="9.5" />
  </>
);

// 5. ToothDeciduous — Молочный зуб (детский прикус)
export const ToothDeciduous = createDentalIcon(
  "ToothDeciduous",
  "lucide-tooth-deciduous",
  <>
    <path d="M6 11c-1-.8-1.5-1.8-1.5-3 0-2.5 2-4 4-4 1.2 0 2.2.5 3.5 1.5 1.3-1 2.3-1.5 3.5-1.5 2 0 4 1.5 4 4 0 1.2-.5 2.2-1.5 3-1 1-1.5 2.5-2 4.5-.4 1.6-1.5 2.5-2.8 2.5-.8 0-1.2-.4-1.2-1 0-1.5-.5-2.5-1-2.5s-1 1-1 2.5c0 .6-.4 1-1.2 1-1.3 0-2.4-.9-2.8-2.5-.5-2-1-3.5-2-4.5z" />
    <path d="M9 8c1-.5 2-.5 3 0" />
    <circle cx="9" cy="6.5" r=".7" fill="currentColor" />
    <circle cx="15" cy="6.5" r=".7" fill="currentColor" />
  </>
);

// 6. ToothPulpitis — Пульпит (сосудисто-нервный пучок)
export const ToothPulpitis = createDentalIcon(
  "ToothPulpitis",
  "lucide-tooth-pulpitis",
  <>
    <path d="M6 12c-1.5-1-2-2.2-2-4 0-2.8 2-4.5 4.5-4.5 1.5 0 2.5.5 3.5 1.5 1-1 2-1.5 3.5-1.5 2.5 0 4.5 1.7 4.5 4.5 0 1.8-.5 3-2 4-1 1.7-1.5 3.8-1.5 6.5 0 1.2-.8 2-1.8 2s-1.4-.7-1.7-2c-.5-2.2-1-3.5-1-3.5s-.5 1.3-1 3.5c-.3 1.3-.7 2-1.7 2s-1.8-.8-1.8-2c0-2.7-.5-4.8-1.5-6.5z" />
    <path d="M10 11c0-1.5.8-2.5 2-2.5s2 1 2 2.5c0 2-1 4-1 7" />
    <path d="M11 18c0-3-1-5-1-7" />
    <path d="M12 5.5l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" />
  </>
);

// 7. ToothIncisor — Анатомический фронтальный резец
export const ToothIncisor = createDentalIcon(
  "ToothIncisor",
  "lucide-tooth-incisor",
  <>
    <path d="M12 2.5c-.8 2.5-1.7 5-2 7.5-.3 1.5-1.8 2.5-2.3 4-.6 1.8-.4 4.5-.2 6.5.1.4.5.5 1 .5h7c.5 0 .9-.1 1-.5.2-2 .4-4.7-.2-6.5-.5-1.5-2-2.5-2.3-4-.3-2.5-1.2-5-2-7.5z" />
    <path d="M10 10c1-1 3-1 4 0" />
    <line x1="12" y1="14" x2="12" y2="19" strokeWidth={1} strokeDasharray="1.5 1.5" />
  </>
);

// 8. GingivaRecession — Рецессия десны (пародонтограмма)
export const GingivaRecession = createDentalIcon(
  "GingivaRecession",
  "lucide-gingiva-recession",
  <>
    <path d="M8 4c0-1.5 1.5-2 4-2s4 .5 4 2c0 2-.5 4-1 6H9c-.5-2-1-4-1-6z" />
    <path d="M9 10c0 4 .5 8 3 11 2.5-3 3-7 3-11" />
    <path d="M3 13c2.5 0 4.5 1 6 3 1.5 2 2 3 3 3s1.5-1 3-3c1.5-2 3.5-3 6-3" />
    <line x1="3" y1="10" x2="6" y2="10" strokeDasharray="1.5 1.5" />
    <line x1="18" y1="10" x2="21" y2="10" strokeDasharray="1.5 1.5" />
    <path d="M19 10v6l-1.5-1.5" />
  </>
);
