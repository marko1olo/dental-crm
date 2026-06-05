import type {
  DicomMprProjection,
  DicomMprResourcePolicy,
  DicomSeriesViewer,
  DicomViewerLaunchManifestResponse,
  DicomWebConnectorCheckResponse,
  DicomWorkstationReadinessResponse,
  ImagingSourceKind,
  ImagingStudyKind,
  ImagingViewerWindowPreset,
  LocalImagingOrganizerRecommendedAction
} from "@dental/shared";

export type MprProjection = DicomMprProjection;
export type MprWindowPreset = Extract<ImagingViewerWindowPreset, "bone" | "soft_tissue" | "implant" | "custom">;
export type MprClinicalPreset = {
  id: "implant" | "endo" | "sinus_opg" | "mandibular_canal" | "tmj" | "airway";
  title: string;
  detail: string;
  projection: MprProjection;
  axisDeg: number;
  slabMm: number;
  sliceFraction: number;
  windowPreset: MprWindowPreset;
  crosshair: boolean;
  linkedPlanes: boolean;
};

export const imagingKindLabels: Record<ImagingStudyKind, string> = {
  periapical: "Прицельный",
  bitewing: "Интерпроксимальный",
  opg: "ОПТГ",
  ceph: "ТРГ",
  cbct: "КЛКТ / КТ",
  photo: "Фото",
  other: "Другое"
};

export const imagingSourceLabels: Record<ImagingSourceKind, string> = {
  manual_upload: "Файл",
  dicom_file: "КТ/серия",
  dicomweb: "Архив снимков",
  pacs: "Архив снимков",
  twain_wia: "TWAIN/WIA",
  sensor_bridge: "Датчик",
  folder_watch: "Папка"
};

export const imagingSourceDetails: Record<ImagingSourceKind, string> = {
  manual_upload: "ручная загрузка файла",
  dicom_file: "файл или серия КТ/снимков",
  dicomweb: "сервер архива снимков",
  pacs: "архив снимков клиники",
  twain_wia: "сканер TWAIN/WIA",
  sensor_bridge: "локальный RVG-датчик",
  folder_watch: "папка обмена"
};

export const imagingViewerToolLabels: Record<string, string> = {
  "window/level": "яркость/контраст",
  invert: "инверсия",
  rotate: "поворот",
  zoom: "масштаб",
  measure: "измерение",
  compare: "сравнение",
  landmarks: "цефалометрические точки",
  MPR: "КТ-срезы",
  axial: "аксиальная",
  coronal: "корональная",
  sagittal: "сагиттальная",
  "panoramic curve": "панорамная дуга",
  brightness: "яркость",
  contrast: "контраст"
};

export const dicomQualityModeLabels: Record<string, string> = {
  metadata_only: "только список серии",
  interactive_low: "быстрый интерактивный просмотр",
  balanced_mpr: "рабочие КТ-срезы",
  diagnostic_full: "диагностическое качество",
  external: "внешний просмотр",
  survival: "минимальный режим",
  fast_preview: "быстрый просмотр",
  balanced: "рабочий режим",
  quality: "качественный режим",
  diagnostic: "диагностический режим",
  overkill: "максимальная детализация"
};

export const dicomTextureStrategyLabels: Record<string, string> = {
  metadata_only: "без загрузки срезов",
  stack_2d_textures: "срезы по одному",
  single_3d_texture: "объем целиком",
  bricked_3d_textures: "объем частями",
  thumbnail_stack: "миниатюры срезов",
  downsampled_stack: "облегченные срезы",
  full_stack: "полные срезы",
  gpu_volume: "ускоренный объем",
  external_viewer: "внешний просмотр"
};

export const dicomRuntimeTierLabels: Record<string, string> = {
  low_end: "слабый ПК",
  standard: "обычный ПК",
  high_end: "мощный ПК",
  workstation: "рабочая станция",
  diagnostic_workstation: "диагностическая станция"
};

export const dicomExecutionLaneLabels: Record<string, string> = {
  metadata_only: "только метаданные",
  external_or_local_viewer: "внешний или локальный просмотр",
  browser_preview: "легкий просмотр в браузере",
  browser_mpr: "КТ-срезы в браузере",
  desktop_app_mpr: "настольный КТ-модуль"
};

export const dicomGpuClassLabels: Record<string, string> = {
  none: "графика недоступна",
  integrated_low: "слабая встроенная графика",
  integrated_ok: "встроенная графика",
  discrete_ok: "дискретная графика",
  diagnostic: "диагностическая графика"
};

export const dicomRenderMemoryBudgetClassLabels: Record<string, string> = {
  minimum: "минимальная память",
  constrained: "ограниченная память",
  standard: "обычный ПК",
  workstation: "рабочая станция",
  diagnostic: "диагностический модуль"
};

export const dicomDiagnosticPixelPolicyLabels: Record<string, string> = {
  metadata_only_no_pixels: "без данных снимков",
  browser_preview_not_diagnostic: "плановый просмотр, не диагностика",
  desktop_app_or_external_review: "настольный или внешний диагностический просмотр"
};

export function dicomLabel(labels: Record<string, string>, value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return labels[value] ?? value.replaceAll("_", " ");
}

export const mprAxisPresetDeg = [-90, -60, -45, -30, -15, 0, 15, 30, 45, 60, 90] as const;
export const mprSlabPresetMm = [1, 2, 3, 5, 10, 20] as const;
export const mprClinicalPresets: MprClinicalPreset[] = [
  {
    id: "implant",
    title: "Имплант",
    detail: "Кость, ось 0°, слой 1 мм",
    projection: "axial",
    axisDeg: 0,
    slabMm: 1,
    sliceFraction: 0.5,
    windowPreset: "implant",
    crosshair: true,
    linkedPlanes: true
  },
  {
    id: "endo",
    title: "Эндо",
    detail: "Косая плоскость, тонкий слой",
    projection: "oblique",
    axisDeg: 15,
    slabMm: 1,
    sliceFraction: 0.5,
    windowPreset: "bone",
    crosshair: true,
    linkedPlanes: true
  },
  {
    id: "sinus_opg",
    title: "Пазуха / ОПТГ",
    detail: "Панорама или корональная, слой 10 мм",
    projection: "panoramic_reconstruction",
    axisDeg: 0,
    slabMm: 10,
    sliceFraction: 0.5,
    windowPreset: "bone",
    crosshair: false,
    linkedPlanes: true
  },
  {
    id: "mandibular_canal",
    title: "Канал НЧ",
    detail: "Панорама, слой 3 мм, курсор включен",
    projection: "panoramic_reconstruction",
    axisDeg: 0,
    slabMm: 3,
    sliceFraction: 0.5,
    windowPreset: "bone",
    crosshair: true,
    linkedPlanes: true
  },
  {
    id: "tmj",
    title: "ВНЧС",
    detail: "Сагиттальная, ось 30°, слой 2 мм",
    projection: "sagittal",
    axisDeg: 30,
    slabMm: 2,
    sliceFraction: 0.5,
    windowPreset: "bone",
    crosshair: true,
    linkedPlanes: true
  },
  {
    id: "airway",
    title: "Дыхательные пути",
    detail: "Корональная, мягкие ткани, слой 10 мм",
    projection: "coronal",
    axisDeg: 0,
    slabMm: 10,
    sliceFraction: 0.5,
    windowPreset: "soft_tissue",
    crosshair: false,
    linkedPlanes: true
  }
];

export const mprProjectionOrientationLabels: Record<MprProjection, string> = {
  axial: "сверху вниз",
  coronal: "спереди назад",
  sagittal: "слева направо",
  oblique: "косая плоскость",
  panoramic_reconstruction: "по зубной дуге",
  three_d_volume: "3D-объем",
  mip: "самые плотные структуры"
};

export const mprProjectionLabels: Record<MprProjection, string> = {
  axial: "Аксиальная",
  coronal: "Корональная",
  sagittal: "Сагиттальная",
  oblique: "Косая",
  panoramic_reconstruction: "Панорама",
  three_d_volume: "3D",
  mip: "Проекция плотности"
};

export const mprSeriesRequiredProjectionLabel = "Сначала выберите готовую серию";
export const mprUnavailableProjectionLabel = "Недоступно в этой серии";

export const mprWindowPresetLabels: Record<MprWindowPreset, string> = {
  bone: "Кость",
  soft_tissue: "Мягкие ткани",
  implant: "Имплант",
  custom: "Своя"
};

export const mprResourceTierLabels: Record<DicomMprResourcePolicy["requiredTier"], string> = {
  low_end: "слабый ПК",
  standard: "обычный ПК",
  workstation: "рабочая станция",
  diagnostic_workstation: "диагностическая станция"
};

export const mprLoadStrategyLabels: Record<DicomMprResourcePolicy["loadStrategy"], string> = {
  metadata_only: "только метаданные",
  two_d_stack_stream: "послойный 2D-просмотр",
  mpr_downsampled: "быстрый предпросмотр КТ-срезов",
  mpr_full: "КТ-срезы в полном разрешении",
  external_handoff: "внешний просмотр"
};

export const mprCacheModeLabels: Record<DicomMprResourcePolicy["cacheMode"], string> = {
  none: "без предварительной подготовки",
  metadata_only: "быстрое открытие списка",
  bounded_disk: "ограниченное хранение на ПК",
  dicomweb_stream: "поток из архива снимков"
};

export const dicomSeriesViewerLabels: Record<DicomSeriesViewer, string> = {
  none: "просмотр не выбран",
  two_d_stack: "послойный 2D-просмотр",
  cbct_mpr: "КЛКТ/КТ-срезы",
  external_dicom: "внешний просмотр"
};

export const localImagingOrganizerActionLabels: Record<LocalImagingOrganizerRecommendedAction, string> = {
  open_ct_workup: "открыть разбор КТ",
  review_3d_models: "проверить 3D-модели",
  mixed_case_workup: "смешанный разбор кейса",
  manual_review: "ручная проверка"
};

export const localImagingModelRoleLabels: Record<string, string> = {
  upper_arch: "верхняя челюсть",
  lower_arch: "нижняя челюсть",
  skull_surface: "поверхность черепа",
  maxilla_surface: "костная поверхность верхней челюсти",
  mandible_surface: "костная поверхность нижней челюсти",
  ct_bone_surface: "КТ-поверхность кости",
  bite: "прикус",
  crown: "коронка",
  bridge: "мост",
  implant_guide: "имплантационный шаблон",
  surgical_guide: "хирургический шаблон",
  aligner: "элайнер",
  scan_body: "скан-боди",
  unknown: "роль не распознана"
};

export const pricelistParserModeLabels: Record<string, string> = {
  deterministic: "локальный разбор",
  groq_json: "нейросетевой разбор",
  deterministic_groq_fallback: "локальный разбор с нейро-проверкой"
};

export const policyAuditEventLabels: Record<string, string> = {
  "settings.update": "изменение настроек",
  "roles.update": "изменение ролей",
  "import.commit": "подтверждение импорта",
  "document.template.update": "изменение шаблона документа",
  "visit.sign": "подпись визита",
  "clinical.override": "клиническое исключение",
  "document.create": "создание документа",
  "appointment.update": "изменение записи",
  "payment.create": "создание оплаты",
  "communication.complete": "закрытие связи",
  "patient.update": "изменение пациента",
  "chair.prepare": "подготовка кресла",
  "imaging.attach": "прикрепление снимка",
  "rule.update": "изменение правила",
  "staff.create": "создание сотрудника",
  "chair.create": "создание кресла"
};

export const mprToolLabels: Record<string, string> = {
  window_level: "окно/уровень",
  pan: "сдвиг",
  zoom: "масштаб",
  slice_scroll: "прокрутка срезов",
  crosshair: "синхронный курсор",
  rotate_axes: "поворот осей",
  oblique_planes: "косые плоскости",
  mpr_3up: "3 окна КТ-срезов",
  panoramic_curve: "панорамная дуга",
  measurement: "измерение",
  measure_distance: "линейка",
  measure_angle: "угол",
  area_roi: "площадь",
  volume_roi: "объем",
  implant_axis: "ось импланта",
  implant_library: "библиотека имплантов",
  nerve_canal: "нижнечелюстной канал",
  bone_density_probe: "плотность кости",
  surgical_guide: "хирургический шаблон",
  reset: "сброс",
  export_snapshot: "экспорт снимка",
  external_open: "внешнее открытие"
};

export const dicomWebStatusLabels: Record<DicomWebConnectorCheckResponse["status"], string> = {
  ready: "готово",
  auth_required: "нужна авторизация",
  unreachable: "недоступно",
  misconfigured: "проверить настройки"
};

export const dicomViewerLaunchModeLabels: Record<DicomViewerLaunchManifestResponse["launchMode"], string> = {
  dicomweb_url: "внешний просмотр",
  local_manifest: "локальный план открытия",
  external_handoff: "внешний просмотр",
  blocked: "нужно действие"
};

export const dicomReadinessCheckLabels: Record<DicomWorkstationReadinessResponse["checks"][number]["status"], string> = {
  pass: "Готово",
  warn: "Проверить",
  fail: "Нет"
};
