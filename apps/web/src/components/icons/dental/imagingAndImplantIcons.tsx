import * as React from "react";
import { createDentalIcon } from "./iconFactory.js";

// 1. DentalImplant — Дентальный имплантат со спиральной резьбой и апикальной выемкой
export const DentalImplant = createDentalIcon(
  "DentalImplant",
  "lucide-dental-implant",
  <>
    <path d="M9.5 2.5h5l1 3.5h-7z" />
    <line x1="6.5" y1="6" x2="17.5" y2="6" />
    <path d="M7.5 6h9l-1.2 13.5c-.2 1.2-1.2 2-2.5 2h-1.6c-1.3 0-2.3-.8-2.5-2L7.5 6z" />
    <line x1="7" y1="9" x2="17" y2="10" />
    <line x1="7.2" y1="12.5" x2="16.8" y2="13.5" />
    <line x1="7.6" y1="16" x2="16.4" y2="17" />
    <path d="M10.5 21.5l1.5-2.2 1.5 2.2" />
    <line x1="12" y1="17" x2="12" y2="19.3" />
  </>
);

// 2. DentalCrown — Ортопедическая зубная коронка с уступом препарирования
export const DentalCrown = createDentalIcon(
  "DentalCrown",
  "lucide-dental-crown",
  <>
    <path d="M4.5 9c0-3.5 2-5 4.5-5 1.5 0 2.3.6 3 1.5.7-.9 1.5-1.5 3-1.5 2.5 0 4.5 1.5 4.5 5 0 3-.7 6-2 8.5-2 1.5-4 2-5.5 2s-3.5-.5-5.5-2c-1.3-2.5-2-5.5-2-8.5z" />
    <path d="M5.5 15.5c2-1 4.2-1.5 6.5-1.5s4.5.5 6.5 1.5" />
    <path d="M8 19v-2c0-.6 1.8-1 4-1s4 .4 4 1v2" />
    <path d="M12 5v3" />
    <path d="M9.5 5.5l2.5 1.5 2.5-1.5" />
    <path d="M4 21c2.5-1 5.2-1.5 8-1.5s5.5.5 8 1.5" />
  </>
);

// 3. DentalBridge — Мостовидный зубной протез
export const DentalBridge = createDentalIcon(
  "DentalBridge",
  "lucide-dental-bridge",
  <>
    <path d="M3 17V9c0-2.5 1.5-4 3-4s2.5 1 3 2.5c.5-1.5 1.5-2.5 3-2.5s2.5 1 3 2.5c.5-1.5 1.5-2.5 3-2.5s3 1.5 3 4v8" />
    <line x1="3" y1="17" x2="8.5" y2="17" />
    <path d="M8.5 13.5c1 1.5 2.2 2 3.5 2s2.5-.5 3.5-2" />
    <line x1="15.5" y1="17" x2="21" y2="17" />
    <path d="M4.5 17v-3c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v3" />
    <path d="M16.5 17v-3c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v3" />
    <path d="M2 20.5c3.5-.8 6.5-1 10-1s6.5.2 10 1" />
  </>
);

// 4. ScanBodyMarker — Интраоральный скан-боди маркер
export const ScanBodyMarker = createDentalIcon(
  "ScanBodyMarker",
  "lucide-scan-body-marker",
  <>
    <path d="M7 21h10" />
    <path d="M8.5 21V10l7-3v14" />
    <path d="M8.5 10l7-3" />
    <line x1="8.5" y1="16" x2="15.5" y2="16" />
    <line x1="12" y1="8.5" x2="12" y2="13" />
    <path d="M4 4l3 3" />
    <path d="M20 4l-3 3" />
    <circle cx="12" cy="3" r="1" fill="currentColor" />
  </>
);

// 5. DentalForm043 / DentalMedicalCard — Амбулаторная медицинская карта
export const DentalForm043 = createDentalIcon(
  "DentalForm043",
  "lucide-dental-form-043",
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M10 11c-.5-.4-1-.5-1.5-.5s-1 .3-1 .8c0 .5.3.8 1 1.2.8.5 1.5 1.5 1.5 2.5 0 .5-.2 1-.5 1.5" />
    <path d="M14 11c.5-.4 1-.5 1.5-.5s1 .3 1 .8c0 .5-.3.8-1 1.2-.8.5-1.5 1.5-1.5 2.5 0 .5.2 1 .5 1.5" />
    <line x1="8" y1="19" x2="16" y2="19" />
  </>
);

export const DentalMedicalCard = DentalForm043;

// 6. DentalLabOrder — Наряд-заказ зуботехнической лаборатории
export const DentalLabOrder = createDentalIcon(
  "DentalLabOrder",
  "lucide-dental-lab-order",
  <>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <path d="M8 12c.5-1 1.5-1.5 2.5-1.5s1.5.5 2 1.5c.5-1 1.5-1.5 2.5-1.5s2 .5 2 1.5v2H8v-2z" />
    <polyline points="9 17 11 19 15 15" />
  </>
);

// 7. NerveCanal — Нижнеальвеолярный нерв (IAN) КЛКТ
export const NerveCanal = createDentalIcon(
  "NerveCanal",
  "lucide-nerve-canal",
  <>
    <path d="M3 12c3 0 7-.5 10-2.5l3-5.5 2 1.5 3-2.5v13c-1 2-2.5 3.5-5 3.5H6c-2 0-3-1-3-3v-4.5z" />
    <path d="M19 7c-1.5 3.5-3 7-6 8.5s-4 .5-5-2" />
    <path d="M19 9.5c-1 2.5-2.2 5.5-4.8 6.8S10 17 9 14.5" />
    <circle cx="8" cy="11.5" r="1.5" />
  </>
);

// 8. BracesBracket — Ортодонтический брекет с дугой
export const BracesBracket = createDentalIcon(
  "BracesBracket",
  "lucide-braces-bracket",
  <>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="12" y1="7" x2="12" y2="17" />
    <circle cx="9" cy="9" r="1" />
    <circle cx="15" cy="9" r="1" />
    <circle cx="9" cy="15" r="1" />
    <circle cx="15" cy="15" r="1" />
  </>
);

// 9. AlignerTray — Прозрачный ортодонтический элайнер (каппа)
export const AlignerTray = createDentalIcon(
  "AlignerTray",
  "lucide-aligner-tray",
  <>
    <path d="M4 17C3 13 4 8 7 5s7-2 10 0 4 8 3 12" />
    <path d="M6.5 16C5.5 13 6.5 9 9 7s6-1 8 0 3.5 6 2.5 9" />
    <line x1="7" y1="5" x2="9" y2="7" />
    <line x1="12" y1="4" x2="12" y2="6.5" />
    <line x1="17" y1="5" x2="15" y2="7" />
    <line x1="4.5" y1="11" x2="6.8" y2="11.5" />
    <line x1="19.5" y1="11" x2="17.2" y2="11.5" />
  </>
);

// 10. BoneGraft — Костный трансплантат и мембрана (НКР)
export const BoneGraft = createDentalIcon(
  "BoneGraft",
  "lucide-bone-graft",
  <>
    <path d="M4 12c3-2 6-2 8-2s5 0 8 2" />
    <line x1="5" y1="10" x2="5" y2="13" />
    <line x1="19" y1="10" x2="19" y2="13" />
    <line x1="12" y1="8" x2="12" y2="11" />
    <circle cx="8" cy="15" r="1.2" />
    <circle cx="12" cy="14.5" r="1.2" />
    <circle cx="16" cy="15" r="1.2" />
    <circle cx="10" cy="17.5" r="1.2" />
    <circle cx="14" cy="17.5" r="1.2" />
    <path d="M3 20c4-1 8-1 9-1s5 0 9 1" />
  </>
);

// 11. DentalVeneer — Керамический винир (микропротезирование)
export const DentalVeneer = createDentalIcon(
  "DentalVeneer",
  "lucide-dental-veneer",
  <>
    <path d="M9 21.5 C7 19 5.5 16 5 13.5 c-.5-2.5-.5-5 .5-8 .5-1.5 1.5-2.5 2-3 h2 l2 1.5 v9 c.8 0 2 .5 2.5 1.5 C13.5 17 11.5 19.5 9 21.5 Z" />
    <path d="M14 14.5 c1.8-3.5 1.8-8.5-.5-12 H9.5" />
    <path d="M8 19 C7.2 16 7 13 7 10" strokeDasharray="1 1.5" />
  </>
);

// 12. DentalAbutment — Ортопедический абатмент имплантата
export const DentalAbutment = createDentalIcon(
  "DentalAbutment",
  "lucide-dental-abutment",
  <>
    <path d="M9 3h6l-1 7H10L9 3z" />
    <path d="M6 13c1.5-1.5 3.5-2 6-2s4.5.5 6 2l-1.5 3H7.5L6 13z" />
    <path d="M8.5 16l1.5 5h4l1.5-5" />
    <line x1="12" y1="4" x2="12" y2="9" />
  </>
);

// 13. DentalPanoramicArch — Панорамный снимок (ОПТГ) / зубная дуга
export const DentalPanoramicArch = createDentalIcon(
  "DentalPanoramicArch",
  "lucide-dental-panoramic-arch",
  <>
    <circle cx="4" cy="5.5" r="1.5" />
    <circle cx="20" cy="5.5" r="1.5" />
    <path d="M4 7v6c0 5 3.5 8.5 8 8.5s8-3.5 8-8.5v-6" />
    <path d="M6.5 13c1 3.5 2.8 5 5.5 5s4.5-1.5 5.5-5" />
    <line x1="8.5" y1="14.5" x2="8.5" y2="16.5" />
    <line x1="10.2" y1="16" x2="10.2" y2="17.8" />
    <line x1="12" y1="16.5" x2="12" y2="18.5" />
    <line x1="13.8" y1="16" x2="13.8" y2="17.8" />
    <line x1="15.5" y1="14.5" x2="15.5" y2="16.5" />
  </>
);

// 14. DicomCube3D — Трехмерный воксельный куб КЛКТ / 3D объем
export const DicomCube3D = createDentalIcon(
  "DicomCube3D",
  "lucide-dicom-cube-3d",
  <>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
    <circle cx="12" cy="7" r="1.2" />
    <circle cx="7.5" cy="14.5" r="1" />
    <circle cx="16.5" cy="14.5" r="1" />
  </>
);

// 15. BoneDensityMisch — Плотность кости по Misch (D1-D4 / трабекулы)
export const BoneDensityMisch = createDentalIcon(
  "BoneDensityMisch",
  "lucide-bone-density-misch",
  <>
    <path d="M4 5c2-1 6-1 8 0s6 1 8 0v2c-2 1-6 1-8 0s-6-1-8 0V5z" />
    <path d="M4 19c2 1 6 1 8 0s6-1 8 0v-2c-2-1-6-1-8 0s-6 1-8 0v2z" />
    <circle cx="7" cy="11" r="1.2" />
    <circle cx="12" cy="10" r="1.5" />
    <circle cx="17" cy="11" r="1.2" />
    <circle cx="9.5" cy="14.5" r="1" />
    <circle cx="14.5" cy="14.5" r="1" />
    <line x1="7" y1="11" x2="12" y2="10" strokeDasharray="1 1.5" />
    <line x1="12" y1="10" x2="17" y2="11" strokeDasharray="1 1.5" />
  </>
);
