import * as React from "react";
import { createDentalIcon } from "./iconFactory.js";

// 1. PerioProbe — Пародонтологический градуированный зонд
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

// 2. DentalSyringe — Стоматологический карпульный шприц
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

// 3. DentalMirrorProbe — Стоматологическое зеркало и зонд
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

// 4. DentalArticulator — Стоматологический артикулятор
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

// 5. DentalChairUnit — Стоматологическая установка (кресло)
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

// 6. DentalHandpiece — Стоматологический турбинный наконечник (MK-dent Eco Line)
export const DentalHandpiece = createDentalIcon(
  "DentalHandpiece",
  "lucide-dental-handpiece",
  <>
    <line x1="9.5" y1="20" x2="14.5" y2="20" />
    <line x1="10" y1="22.5" x2="14" y2="22.5" />
    <line x1="12" y1="22.5" x2="12" y2="23.5" />
    <path d="M10 20 L10 16 C9.8 12.5 9.2 9 11 5.5" />
    <path d="M14 20 L14 16 C13.8 12.5 12.2 9 13.5 5.5" />
    <rect x="11.2" y="2.6" width="3.8" height="4.6" rx="1.2" transform="rotate(18 13.1 4.9)" />
    <line x1="14" y1="2.2" x2="15.8" y2="2.8" strokeWidth="2" />
    <line x1="11" y1="5.6" x2="7" y2="4" />
    <circle cx="6.4" cy="3.8" r="1.1" fill="currentColor" />
  </>
);

// 7. UltrasonicScaler — Ультразвуковой скейлер (профгигиена)
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

// 8. ToothExtractForceps — Хирургические щипцы для удаления зубов
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

// 9. Autoclave — Медицинский автоклав класса B (СанПиН)
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

// 10. CuringLight — Фотополимеризационная лампа
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

// 11. ApexLocator — Электронный апекслокатор
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

// 12. RubberDam — Коффердам (изоляция рабочего поля)
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

// 13. SalivaEjector — Слюноотсос / хирургический аспиратор
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

// 14. CheekRetractor — Роторасширитель (Оптрагейт OptraGate)
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

// 15. BleachingLamp — Лампа клинического отбеливания зубов
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
