import type {
  DicomMprProjection,
  ImagingViewerImplantPlan,
  ImagingViewerTool,
  ImagingViewerWindowPreset
} from "@dental/shared";

export type CtPlanningToolKey =
  | "panoramic_curve"
  | "cross_section_curve"
  | "ruler"
  | "angle"
  | "area"
  | "volume"
  | "implant_modeling"
  | "implant_library"
  | "nerve_canal"
  | "sinus_airway"
  | "bone_density"
  | "surgical_guide";

export type CtPlanningTool = {
  key: CtPlanningToolKey;
  category: string;
  title: string;
  detail: string;
  output: string;
  requiresVolume: boolean;
};

export type CtImplantLibraryItem = {
  id: string;
  system: string;
  line: string;
  diameterMm: number;
  lengthMm: number;
  platform: string;
  indication: string;
};

export function implantPlanFromLibraryItem(implant: CtImplantLibraryItem): ImagingViewerImplantPlan {
  return {
    itemId: implant.id,
    system: implant.system,
    line: implant.line,
    diameterMm: implant.diameterMm,
    lengthMm: implant.lengthMm,
    platform: implant.platform,
    indication: implant.indication,
    selectedAt: null
  };
}

export type CtPlanningMetric = {
  id: string;
  title: string;
  value: string;
  source: string;
  clinicalUse: string;
};

export type CtPlanningQuickAction = {
  id: string;
  title: string;
  detail: string;
  toolLabel: string;
  viewLabel: string;
  tool: ImagingViewerTool;
  projection: DicomMprProjection;
  windowPreset: Extract<ImagingViewerWindowPreset, "bone" | "soft_tissue" | "implant" | "custom">;
  axisDeg: number;
  slabMm: number;
  sliceFraction: number;
  requiresVolume: boolean;
  artifactCommandIds: string[];
};

export const ctPlanningQuickActions: CtPlanningQuickAction[] = [
  {
    id: "opg_curve",
    title: "ОПТГ по дуге",
    detail: "Панорамная реконструкция, слой 10 мм, связанные срезы.",
    toolLabel: "панорамная кривая",
    viewLabel: "панорама",
    tool: "panoramic_curve",
    projection: "panoramic_reconstruction",
    windowPreset: "bone",
    axisDeg: 0,
    slabMm: 10,
    sliceFraction: 0.5,
    requiresVolume: true,
    artifactCommandIds: ["opg-curve"]
  },
  {
    id: "ridge_ruler",
    title: "Линейка кости",
    detail: "Косая плоскость, тонкий слой, измерение высоты и ширины.",
    toolLabel: "линейка",
    viewLabel: "косой срез",
    tool: "measure_distance",
    projection: "oblique",
    windowPreset: "bone",
    axisDeg: 0,
    slabMm: 1,
    sliceFraction: 0.5,
    requiresVolume: true,
    artifactCommandIds: ["ridge-width-ruler", "bone-height-ruler"]
  },
  {
    id: "implant_axis",
    title: "Ось импланта",
    detail: "Косая плоскость, окно импланта, курсор и синхронные плоскости.",
    toolLabel: "ось импланта",
    viewLabel: "косой срез",
    tool: "implant_axis",
    projection: "oblique",
    windowPreset: "implant",
    axisDeg: 0,
    slabMm: 1,
    sliceFraction: 0.5,
    requiresVolume: true,
    artifactCommandIds: ["implant-axis", "angle-axis"]
  },
  {
    id: "area_roi",
    title: "Контур площади",
    detail: "Аксиальный срез и свободный контур для окна, дефекта или графта.",
    toolLabel: "контур площади",
    viewLabel: "аксиальный срез",
    tool: "measure_area",
    projection: "axial",
    windowPreset: "bone",
    axisDeg: 0,
    slabMm: 1,
    sliceFraction: 0.5,
    requiresVolume: true,
    artifactCommandIds: ["area-roi"]
  },
  {
    id: "volume_roi",
    title: "Контур объема",
    detail: "3D-объем для пазухи, дефекта, графта или дыхательных путей.",
    toolLabel: "объемный контур",
    viewLabel: "3D-объем",
    tool: "measure_volume",
    projection: "three_d_volume",
    windowPreset: "soft_tissue",
    axisDeg: 0,
    slabMm: 5,
    sliceFraction: 0.5,
    requiresVolume: true,
    artifactCommandIds: ["volume-roi"]
  },
  {
    id: "nerve_canal",
    title: "Канал НЧ",
    detail: "Панорамная дуга и кривая нижнечелюстного канала.",
    toolLabel: "кривая канала",
    viewLabel: "панорама",
    tool: "nerve_canal",
    projection: "panoramic_reconstruction",
    windowPreset: "bone",
    axisDeg: 0,
    slabMm: 3,
    sliceFraction: 0.5,
    requiresVolume: true,
    artifactCommandIds: ["nerve-canal", "canal-clearance-ruler"]
  },
  {
    id: "density_probe",
    title: "Плотность",
    detail: "Точка плотности кости в окне импланта.",
    toolLabel: "зонд плотности",
    viewLabel: "аксиальный срез",
    tool: "bone_density_probe",
    projection: "axial",
    windowPreset: "implant",
    axisDeg: 0,
    slabMm: 1,
    sliceFraction: 0.5,
    requiresVolume: true,
    artifactCommandIds: ["density-probe"]
  },
  {
    id: "surgical_guide",
    title: "Шаблон",
    detail: "3D-объем, ось и размеры для хирургического шаблона.",
    toolLabel: "план шаблона",
    viewLabel: "3D-объем",
    tool: "surgical_guide",
    projection: "three_d_volume",
    windowPreset: "bone",
    axisDeg: 0,
    slabMm: 5,
    sliceFraction: 0.5,
    requiresVolume: true,
    artifactCommandIds: ["surgical-guide"]
  },
  {
    id: "implant_library",
    title: "Библиотека",
    detail: "Выбор типоразмера без готовой КТ-серии.",
    toolLabel: "типоразмер импланта",
    viewLabel: "справочник",
    tool: "implant_library",
    projection: "axial",
    windowPreset: "implant",
    axisDeg: 0,
    slabMm: 1,
    sliceFraction: 0.5,
    requiresVolume: false,
    artifactCommandIds: []
  }
];

export function findCtPlanningQuickActionForArtifactCommand(command: {
  id: string;
  tool: ImagingViewerTool;
}): CtPlanningQuickAction | null {
  return (
    ctPlanningQuickActions.find((action) => action.artifactCommandIds.includes(command.id)) ??
    ctPlanningQuickActions.find((action) => action.tool === command.tool) ??
    null
  );
}

export const ctPlanningTools: CtPlanningTool[] = [
  {
    key: "panoramic_curve",
    category: "ОПТГ",
    title: "Панорамная дуга",
    detail: "ОПТГ по дуге с толщиной слоя и поперечными срезами.",
    output: "панорама + серия поперечных срезов",
    requiresVolume: true
  },
  {
    key: "cross_section_curve",
    category: "Кривые",
    title: "Криволинейный срез",
    detail: "Дуга, шаг срезов и быстрый переход по точкам интереса.",
    output: "дуга, шаг и направление",
    requiresVolume: true
  },
  {
    key: "ruler",
    category: "Линейка",
    title: "Расстояние",
    detail: "Высота, ширина гребня и отступы до канала или пазухи.",
    output: "мм с привязкой к плоскости",
    requiresVolume: true
  },
  {
    key: "angle",
    category: "Угол",
    title: "Ось импланта",
    detail: "Угол оси импланта к кости и ортопедической оси.",
    output: "градусы и подсказка",
    requiresVolume: true
  },
  {
    key: "area",
    category: "Площадь",
    title: "Зона интереса",
    detail: "Контур дефекта, кисты, окна синус-лифтинга или графта.",
    output: "мм2 и сохраненный контур",
    requiresVolume: true
  },
  {
    key: "volume",
    category: "Объем",
    title: "Объемная оценка",
    detail: "Сегмент объема для пазухи, дефекта, графта или дыхательных путей.",
    output: "мм3 с порогом плотности",
    requiresVolume: true
  },
  {
    key: "implant_modeling",
    category: "Имплант",
    title: "Моделирование импланта",
    detail: "Диаметр, длина, платформа, апекс и проверка отступов.",
    output: "виртуальный имплант в КТ-плане",
    requiresVolume: true
  },
  {
    key: "implant_library",
    category: "Библиотека",
    title: "Библиотека имплантов",
    detail: "Выбор типоразмера без прайсов и PDF во время приема.",
    output: "готовые диаметры и длины",
    requiresVolume: false
  },
  {
    key: "nerve_canal",
    category: "Канал",
    title: "Нижнечелюстной канал",
    detail: "Канал, предупреждение по расстоянию и контроль на срезах.",
    output: "траектория канала и отступы",
    requiresVolume: true
  },
  {
    key: "sinus_airway",
    category: "Пазуха",
    title: "Пазуха и дыхательные пути",
    detail: "Пазуха, мягкотканное окно и оценка дыхательных путей.",
    output: "просвет, контур, объем",
    requiresVolume: true
  },
  {
    key: "bone_density",
    category: "Плотность",
    title: "Карта плотности",
    detail: "HU/серые значения для качества кости и протокола сверления.",
    output: "подсказка плотности",
    requiresVolume: true
  },
  {
    key: "surgical_guide",
    category: "Шаблон",
    title: "Хирургический шаблон",
    detail: "Имплант-план, скан-модель, втулка и экспорт в лабораторию.",
    output: "план шаблона и контрольные размеры",
    requiresVolume: true
  }
];

export const ctImplantLibrary: CtImplantLibraryItem[] = [
  {
    id: "generic-narrow-33-10",
    system: "Универсальная",
    line: "Узкий конусный",
    diameterMm: 3.3,
    lengthMm: 10,
    platform: "узкая платформа",
    indication: "узкий гребень, резцы, ограниченное место"
  },
  {
    id: "generic-regular-38-115",
    system: "Универсальная",
    line: "Стандартный конический",
    diameterMm: 3.8,
    lengthMm: 11.5,
    platform: "стандартная платформа",
    indication: "премоляры и стандартная первичная стабильность"
  },
  {
    id: "generic-regular-42-10",
    system: "Универсальная",
    line: "Стандартный цилиндрический",
    diameterMm: 4.2,
    lengthMm: 10,
    platform: "стандартная платформа",
    indication: "универсальный план для бокового отдела"
  },
  {
    id: "generic-wide-50-85",
    system: "Универсальная",
    line: "Широкий молярный",
    diameterMm: 5,
    lengthMm: 8.5,
    platform: "широкая платформа",
    indication: "моляры, ограничение по высоте, широкая лунка"
  }
];

export const ctPlanningMetrics: CtPlanningMetric[] = [
  {
    id: "opg_curve",
    title: "ОПТГ",
    value: "дуга + слой",
    source: "panoramic_curve",
    clinicalUse: "панорамная реконструкция и поперечные срезы"
  },
  {
    id: "ridge_width",
    title: "Ширина гребня",
    value: "мм",
    source: "measure_distance",
    clinicalUse: "подбор диаметра импланта"
  },
  {
    id: "bone_height",
    title: "Высота кости",
    value: "мм",
    source: "measure_distance",
    clinicalUse: "подбор длины и отступов"
  },
  {
    id: "implant_axis_angle",
    title: "Ось",
    value: "градусы",
    source: "implant_axis",
    clinicalUse: "контроль ортопедической оси"
  },
  {
    id: "roi_area",
    title: "Площадь",
    value: "мм2",
    source: "area_roi",
    clinicalUse: "контур дефекта или окна"
  },
  {
    id: "roi_volume",
    title: "Объем",
    value: "мм3",
    source: "volume_roi",
    clinicalUse: "пазуха, графт, дефект, дыхательные пути"
  },
  {
    id: "canal_clearance",
    title: "Канал НЧ",
    value: "мм",
    source: "nerve_canal",
    clinicalUse: "минимальный отступ до канала"
  },
  {
    id: "bone_density",
    title: "Плотность",
    value: "HU/серые",
    source: "bone_density_probe",
    clinicalUse: "ориентир протокола сверления"
  }
];
