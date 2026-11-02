export * from "./iconFactory.js";
export * from "./teethIcons.js";
export * from "./instrumentsIcons.js";
export * from "./imagingAndImplantIcons.js";

import {
  ToothMolar,
  ToothCaries,
  EndoFileCanal,
  ToothShadeGuide,
  ToothDeciduous,
  ToothPulpitis,
  ToothIncisor,
  GingivaRecession,
} from "./teethIcons.js";
import {
  PerioProbe,
  DentalSyringe,
  DentalMirrorProbe,
  DentalArticulator,
  DentalChairUnit,
  DentalHandpiece,
  UltrasonicScaler,
  ToothExtractForceps,
  Autoclave,
  CuringLight,
  ApexLocator,
  RubberDam,
  SalivaEjector,
  CheekRetractor,
  BleachingLamp,
} from "./instrumentsIcons.js";
import {
  DentalImplant,
  DentalCrown,
  DentalBridge,
  ScanBodyMarker,
  DentalForm043,
  DentalLabOrder,
  NerveCanal,
  BracesBracket,
  AlignerTray,
  BoneGraft,
  DentalVeneer,
  DentalAbutment,
  DentalPanoramicArch,
} from "./imagingAndImplantIcons.js";

// Словарь и карта типов всех 36 канонических стоматологических иконок
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
