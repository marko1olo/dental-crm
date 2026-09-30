import * as React from "react";
import type { LucideProps } from "lucide-react";

export interface DentalIconProps extends LucideProps {}

function createDentalIcon(
  displayName: string,
  lucideClass: string,
  svgElements: React.ReactNode
): React.ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
> {
  const Component = React.forwardRef<SVGSVGElement, LucideProps>(
    (
      {
        size = 24,
        strokeWidth = 1.75,
        color = "currentColor",
        className = "",
        children,
        ...props
      },
      ref
    ) => (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          className ? `lucide ${lucideClass} ${className}` : `lucide ${lucideClass}`
        }
        {...props}
      >
        {svgElements}
        {children}
      </svg>
    )
  );

  Component.displayName = displayName;
  return Component;
}

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

// 4. DentalImplant — Дентальный имплантат со спиральной резьбой и апикальной выемкой
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

// 5. DentalCrown — Ортопедическая зубная коронка с уступом препарирования
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

// 6. DentalBridge — Мостовидный зубной протез
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

// 7. PerioProbe — Пародонтологический градуированный зонд
export const PerioProbe = createDentalIcon(
  "PerioProbe",
  "lucide-perio-probe",
  <>
    <path d="M3 3l5 5 4-1 2 3v11" />
    <circle cx="14" cy="21.5" r=".75" fill="currentColor" />
    <line x1="12" y1="12.5" x2="16" y2="12.5" />
    <line x1="12" y1="15.5" x2="16" y2="15.5" />
    <line x1="12" y1="18.5" x2="16" y2="18.5" />
    <path d="M19 4c0 3-.5 6-2 9s-2.5 5-2.5 8" />
    <path d="M21 16c-1.5 0-3-1-3.5-3" />
  </>
);

// 8. DentalSyringe — Стоматологический карпульный шприц
export const DentalSyringe = createDentalIcon(
  "DentalSyringe",
  "lucide-dental-syringe",
  <>
    <circle cx="12" cy="4" r="2" />
    <line x1="12" y1="6" x2="12" y2="8.5" />
    <path d="M6.5 9c1.5 0 2.5-.5 5.5-.5s4 .5 5.5.5" />
    <rect x="9" y="8.5" width="6" height="8.5" rx="1" />
    <rect x="10.5" y="10.5" width="3" height="4.5" rx="1" />
    <line x1="10.5" y1="12.2" x2="13.5" y2="12.2" />
    <path d="M10.5 17h3l-.5 1.5h-2z" />
    <line x1="12" y1="18.5" x2="12" y2="22.5" />
  </>
);

// 9. ToothShadeGuide — Шкала расцветки зубов VITA (эталонный образец)
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

// 10. ScanBodyMarker — Интраоральный скан-боди маркер
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

// 11. DentalArticulator — Стоматологический артикулятор
export const DentalArticulator = createDentalIcon(
  "DentalArticulator",
  "lucide-dental-articulator",
  <>
    <path d="M5 6h13" />
    <path d="M4 19h15" />
    <path d="M6 6v3" />
    <circle cx="6" cy="11" r="2" />
    <path d="M6 13v6" />
    <line x1="17" y1="6" x2="17" y2="19" />
    <path d="M10 10.5c1-1 3-1 4 0" />
    <path d="M10 14.5c1 1 3 1 4 0" />
    <line x1="9.5" y1="12.5" x2="14.5" y2="12.5" />
  </>
);

// 12. DentalChairUnit — Стоматологическая установка (кресло)
export const DentalChairUnit = createDentalIcon(
  "DentalChairUnit",
  "lucide-dental-chair-unit",
  <>
    <path d="M4 2v4l3 2" />
    <path d="M6 8h4l1 2H5z" />
    <path d="M6.5 9.5a1.5 1.5 0 0 1 3 0v1.5H6.5z" />
    <path d="M8 12l2.5 3h6l3 3" />
    <path d="M13.5 15v4" />
    <path d="M10 21h7" />
    <rect x="6" y="19.5" width="2.5" height="1.5" rx=".5" />
  </>
);

// 13. DentalMirrorProbe — Стоматологическое зеркало и зонд
export const DentalMirrorProbe = createDentalIcon(
  "DentalMirrorProbe",
  "lucide-dental-mirror-probe",
  <>
    <circle cx="8" cy="8" r="4.5" />
    <path d="M6.5 6.5a2 2 0 0 1 2.5 0" />
    <line x1="11.5" y1="11.5" x2="20" y2="20" />
    <path d="M17 4c-3 1-5 3.5-5 5.5l9 9" />
    <path d="M17 4c1 0 2 .5 2.5 1.5" />
  </>
);

// 14. DentalForm043 — Амбулаторная медицинская карта ф. 043/у
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

// 15. DentalLabOrder — Наряд-заказ зуботехнической лаборатории
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

// 16. NerveCanal — Нижнеальвеолярный нерв (IAN) КЛКТ
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

// 17. DentalHandpiece — Стоматологический турбинный наконечник
export const DentalHandpiece = createDentalIcon(
  "DentalHandpiece",
  "lucide-dental-handpiece",
  <>
    <path d="M3 20l5.5-5.5c1.2-1.2 2.5-1.5 4-1.5l3.5-1" />
    <path d="M4.5 21.5l5.5-5.5c1-1 2.2-1.2 3.5-1.2l2.5-.8" />
    <path d="M3 20c-.7.7-.7 1.8 0 2.5s1.8.7 2.5 0" />
    <circle cx="7" cy="18" r=".6" fill="currentColor" />
    <rect x="16" y="5.5" width="5.5" height="6.5" rx="1.2" />
    <path d="M17.25 5.5c0-1.2.7-2 1.5-2s1.5.8 1.5 2" />
    <line x1="18.75" y1="12" x2="18.75" y2="14.5" />
    <rect x="18" y="14.5" width="1.5" height="6" rx=".75" />
  </>
);

// 18. ToothDeciduous — Молочный зуб (детский прикус)
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

// 19. BracesBracket — Ортодонтический брекет с дугой
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

// 20. AlignerTray — Прозрачный ортодонтический элайнер (каппа)
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

// 21. UltrasonicScaler — Ультразвуковой скейлер (профгигиена)
export const UltrasonicScaler = createDentalIcon(
  "UltrasonicScaler",
  "lucide-ultrasonic-scaler",
  <>
    <path d="M3 19l8-8" />
    <path d="M5 21l8-8" />
    <line x1="3" y1="19" x2="5" y2="21" />
    <line x1="11" y1="11" x2="13" y2="13" strokeWidth={2} />
    <path d="M12 12l2.5-2.5c1.5-1.5 3.5-1.5 5 0s1 3.5-.5 5l-1 1" />
    <path d="M19 13.5c1 0 2 1 2 2" />
    <path d="M20 11.5c2 0 3.5 1.5 3.5 3.5" />
  </>
);

// 22. BoneGraft — Костный трансплантат и мембрана (НКР)
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

// 23. ToothExtractForceps — Хирургические щипцы для удаления зубов
export const ToothExtractForceps = createDentalIcon(
  "ToothExtractForceps",
  "lucide-tooth-extract-forceps",
  <>
    <path d="M9 3c0 2 1 3.5 2 4.5l-6 13" />
    <path d="M15 3c0 2-1 3.5-2 4.5l6 13" />
    <circle cx="12" cy="9" r="1.8" />
    <path d="M10 4.5c1-.5 3-.5 4 0" />
    <line x1="6.5" y1="16" x2="8" y2="16.5" />
    <line x1="17.5" y1="16" x2="16" y2="16.5" />
  </>
);

// 24. Autoclave — Медицинский автоклав класса B (СанПиН)
export const Autoclave = createDentalIcon(
  "Autoclave",
  "lucide-autoclave",
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="2" />
    <line x1="12" y1="6.5" x2="12" y2="10" />
    <line x1="12" y1="14" x2="12" y2="17.5" />
    <line x1="6.5" y1="12" x2="10" y2="12" />
    <line x1="14" y1="12" x2="17.5" y2="12" />
    <line x1="6" y1="5.5" x2="8.5" y2="5.5" />
    <circle cx="17.5" cy="5.5" r="1" />
  </>
);

// 25. ToothPulpitis — Пульпит (сосудисто-нервный пучок)
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

// 26. DentalVeneer — Керамический винир (микропротезирование)
export const DentalVeneer = createDentalIcon(
  "DentalVeneer",
  "lucide-dental-veneer",
  <>
    <path d="M9 21.5 C7 19 5.5 16 5 13.5 c-.5-2.5-.5-5 .5-8 .5-1.5 1.5-2.5 2-3 h2 l2 1.5 v9 c.8 0 2 .5 2.5 1.5 C13.5 17 11.5 19.5 9 21.5 Z" />
    <path d="M14 14.5 c1.8-3.5 1.8-8.5-.5-12 H9.5" />
    <path d="M8 19 C7.2 16 7 13 7 10" strokeDasharray="1 1.5" />
  </>
);

// 27. ToothIncisor — Анатомический фронтальный резец
export const ToothIncisor = createDentalIcon(
  "ToothIncisor",
  "lucide-tooth-incisor",
  <>
    <path d="M12 2.5c-.8 2.5-1.7 5-2 7.5-.3 1.5-1.8 2.5-2.3 4-.6 1.8-.4 4.5-.2 6.5.1.4.5.5 1 .5h7c.5 0 .9-.1 1-.5.2-2 .4-4.7-.2-6.5-.5-1.5-2-2.5-2.3-4-.3-2.5-1.2-5-2-7.5z" />
    <path d="M10 10c1-1 3-1 4 0" />
    <line x1="12" y1="14" x2="12" y2="19" strokeWidth={1} strokeDasharray="1.5 1.5" />
  </>
);

// 28. DentalAbutment — Ортопедический абатмент имплантата
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

// 29. CuringLight — Фотополимеризационная лампа
export const CuringLight = createDentalIcon(
  "CuringLight",
  "lucide-curing-light",
  <>
    <path d="M3 18c-.8.8-.8 1.8 0 2.5s1.8.8 2.5 0" />
    <line x1="3" y1="18" x2="8.5" y2="12.5" />
    <line x1="5.5" y1="20.5" x2="11" y2="15" />
    <circle cx="6.5" cy="16.5" r=".8" fill="currentColor" />
    <line x1="7.5" y1="10.5" x2="12.5" y2="15.5" strokeWidth={2.5} strokeLinecap="round" />
    <path d="M9.75 13.75 L13.5 10 c1.8-1.8 3.5-.8 4 1.5" />
    <line x1="19.5" y1="12" x2="22.5" y2="14" />
    <line x1="19.5" y1="10" x2="22.5" y2="11" />
    <line x1="18" y1="13.5" x2="19.5" y2="16.5" />
  </>
);

// 30. ApexLocator — Электронный апекслокатор
export const ApexLocator = createDentalIcon(
  "ApexLocator",
  "lucide-apex-locator",
  <>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <rect x="6.5" y="5.5" width="11" height="7.5" rx="1" />
    <line x1="8.5" y1="7" x2="8.5" y2="11" />
    <line x1="10.5" y1="8" x2="10.5" y2="11" />
    <line x1="12.5" y1="9" x2="12.5" y2="11" />
    <line x1="14.5" y1="10" x2="14.5" y2="11" />
    <circle cx="15" cy="7.5" r=".9" fill="currentColor" />
    <circle cx="8.5" cy="16.5" r="1" />
    <circle cx="15.5" cy="16.5" r="1" />
    <rect x="11" y="15.5" width="2" height="2" rx=".5" />
  </>
);

// 31. RubberDam — Коффердам (изоляция рабочего поля)
export const RubberDam = createDentalIcon(
  "RubberDam",
  "lucide-rubber-dam",
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9.5 9c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5" />
    <path d="M8.5 12c0-1.2.9-2 2-2h3c1.1 0 2 .8 2 2s-.9 2-2 2h-3c-1.1 0-2-.8-2-2z" />
    <circle cx="12" cy="12" r="1.5" />
    <line x1="3" y1="8" x2="5" y2="8" />
    <line x1="3" y1="16" x2="5" y2="16" />
    <line x1="19" y1="8" x2="21" y2="8" />
    <line x1="19" y1="16" x2="21" y2="16" />
  </>
);

// 32. SalivaEjector — Слюноотсос / хирургический аспиратор
export const SalivaEjector = createDentalIcon(
  "SalivaEjector",
  "lucide-saliva-ejector",
  <>
    <path d="M8 21v-9c0-3.5 2-6 5.5-6s5.5 2.5 5.5 6v2" />
    <path d="M5.5 21v-9c0-5 3-7.5 8-7.5s8 2.5 8 7.5v2" />
    <rect x="17.5" y="14" width="3.5" height="3" rx=".8" />
    <line x1="17.5" y1="15.5" x2="21" y2="15.5" />
    <path d="M19.2 19c-.4.7-.8 1-1.2 1s-.8-.3-1.2-1c0-.8 1.2-1.6 1.2-1.6s1.2.8 1.2 1.6z" />
  </>
);

// 33. DentalPanoramicArch — Панорамный снимок (ОПТГ) / зубная дуга
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

// 34. CheekRetractor — Роторасширитель (Оптрагейт OptraGate)
export const CheekRetractor = createDentalIcon(
  "CheekRetractor",
  "lucide-cheek-retractor",
  <>
    <ellipse cx="12" cy="12" rx="9" ry="7" />
    <ellipse cx="12" cy="12" rx="5.5" ry="4" />
    <path d="M11 5c.5.8 1.5.8 2 0" />
    <path d="M11 19c.5-.8 1.5-.8 2 0" />
    <line x1="3" y1="12" x2="6.5" y2="12" />
    <line x1="17.5" y1="12" x2="21" y2="12" />
  </>
);

// 35. BleachingLamp — Лампа клинического отбеливания зубов
export const BleachingLamp = createDentalIcon(
  "BleachingLamp",
  "lucide-bleaching-lamp",
  <>
    <path d="M4 2v4l4 2" />
    <path d="M7 9c1.5-1.5 3.5-2 5-2s3.5.5 5 2" />
    <path d="M6 11c2-2 4-2.5 6-2.5s4 .5 6 2.5" />
    <line x1="6" y1="11" x2="7" y2="9" />
    <line x1="18" y1="11" x2="17" y2="9" />
    <line x1="8" y1="13" x2="7.5" y2="16" />
    <line x1="10.5" y1="13.5" x2="10.5" y2="17" />
    <line x1="12" y1="13.5" x2="12" y2="18" />
    <line x1="13.5" y1="13.5" x2="13.5" y2="17" />
    <line x1="16" y1="13" x2="16.5" y2="16" />
    <path d="M12 19.5l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" />
  </>
);

// 36. GingivaRecession — Рецессия десны (пародонтограмма)
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

// Словарь и карта типов всех 36 стоматологических иконок
export const DENTAL_ICONS_MAP = {
  ToothMolar,
  ToothCaries,
  EndoFileCanal,
  DentalImplant,
  DentalCrown,
  DentalBridge,
  PerioProbe,
  DentalSyringe,
  ToothShadeGuide,
  ScanBodyMarker,
  DentalArticulator,
  DentalChairUnit,
  DentalMirrorProbe,
  DentalForm043,
  DentalLabOrder,
  NerveCanal,
  DentalHandpiece,
  ToothDeciduous,
  BracesBracket,
  AlignerTray,
  UltrasonicScaler,
  BoneGraft,
  ToothExtractForceps,
  Autoclave,
  ToothPulpitis,
  DentalVeneer,
  ToothIncisor,
  DentalAbutment,
  CuringLight,
  ApexLocator,
  RubberDam,
  SalivaEjector,
  DentalPanoramicArch,
  CheekRetractor,
  BleachingLamp,
  GingivaRecession,
} as const;

export type DentalIconName = keyof typeof DENTAL_ICONS_MAP;
