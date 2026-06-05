import type {
  DicomMprProjection,
  ImagingViewerAnnotationSemanticRole,
  ImagingViewerAnnotationType,
  ImagingViewerTool
} from "@dental/shared";

export type CtPlanningArtifactStatus = "ready" | "draft" | "blocked";

export type CtPlanningArtifactCommand = {
  id: string;
  annotationType: ImagingViewerAnnotationType;
  tool: ImagingViewerTool;
  title: string;
  detail: string;
  result: string;
  projection: DicomMprProjection;
  unit: string | null;
  semanticRole?: ImagingViewerAnnotationSemanticRole;
  minimumPoints: number;
  requiresVolume: boolean;
  requiresImplant: boolean;
};

export type CtPlanningArtifactCommandState = {
  command: CtPlanningArtifactCommand;
  status: CtPlanningArtifactStatus;
  count: number;
  draftCount: number;
  statusLabel: string;
  actionLabel: string;
  blocker: string | null;
};

export type CtPlanningArtifactAnnotationRef = {
  id?: string | null;
  type: ImagingViewerAnnotationType;
  label?: string | null;
  semanticRole?: ImagingViewerAnnotationSemanticRole | null;
  note?: string | null;
  pointCount: number;
};

export const ctPlanningArtifactCommands: CtPlanningArtifactCommand[] = [
  {
    id: "opg-curve",
    annotationType: "panoramic_curve",
    tool: "panoramic_curve",
    title: "ОПТГ-дуга",
    detail: "Точки зубной дуги для панорамной реконструкции и поперечных срезов.",
    result: "структурная кривая",
    projection: "panoramic_reconstruction",
    unit: null,
    minimumPoints: 3,
    requiresVolume: true,
    requiresImplant: false
  },
  {
    id: "distance-ruler",
    annotationType: "distance",
    tool: "measure_distance",
    title: "Линейка",
    detail: "Высота кости, ширина гребня или отступ до канала на выбранном срезе.",
    result: "мм после калибровки",
    projection: "oblique",
    unit: "mm",
    minimumPoints: 2,
    requiresVolume: true,
    requiresImplant: false
  },
  {
    id: "ridge-width-ruler",
    annotationType: "distance",
    tool: "measure_distance",
    title: "Ширина гребня",
    detail: "Отдельная линейка ширины гребня для первичного скрининга диаметра импланта.",
    result: "ширина гребня в мм",
    projection: "oblique",
    unit: "mm",
    semanticRole: "ridge_width",
    minimumPoints: 2,
    requiresVolume: true,
    requiresImplant: false
  },
  {
    id: "bone-height-ruler",
    annotationType: "distance",
    tool: "measure_distance",
    title: "Высота кости",
    detail: "Отдельная линейка высоты кости для первичного скрининга длины импланта.",
    result: "высота кости в мм",
    projection: "oblique",
    unit: "mm",
    semanticRole: "bone_height",
    minimumPoints: 2,
    requiresVolume: true,
    requiresImplant: false
  },
  {
    id: "canal-clearance-ruler",
    annotationType: "distance",
    tool: "measure_distance",
    title: "Отступ до канала",
    detail: "Отдельная контрольная линейка от импланта до нижнечелюстного канала; не заменяет трассу канала и ось.",
    result: "контрольный отступ в мм",
    projection: "oblique",
    unit: "mm",
    semanticRole: "clearance",
    minimumPoints: 2,
    requiresVolume: true,
    requiresImplant: true
  },
  {
    id: "angle-axis",
    annotationType: "angle",
    tool: "measure_angle",
    title: "Угол",
    detail: "Контроль наклона оси импланта, кортикальной пластинки или ортопедической оси.",
    result: "градусы",
    projection: "oblique",
    unit: "deg",
    minimumPoints: 3,
    requiresVolume: true,
    requiresImplant: false
  },
  {
    id: "area-roi",
    annotationType: "area_roi",
    tool: "measure_area",
    title: "Контур площади",
    detail: "Контур дефекта, окна синус-лифтинга, графта или мягкотканной зоны.",
    result: "площадь после контура",
    projection: "axial",
    unit: "mm2",
    minimumPoints: 3,
    requiresVolume: true,
    requiresImplant: false
  },
  {
    id: "volume-roi",
    annotationType: "volume_roi",
    tool: "measure_volume",
    title: "Контур объема",
    detail: "Объем дефекта, пазухи, графта или дыхательных путей.",
    result: "объем после сегмента",
    projection: "three_d_volume",
    unit: "mm3",
    minimumPoints: 3,
    requiresVolume: true,
    requiresImplant: false
  },
  {
    id: "implant-axis",
    annotationType: "implant_axis",
    tool: "implant_axis",
    title: "Ось импланта",
    detail: "Черновик оси выбранного типоразмера для отступов, втулки и шаблона.",
    result: "ось + размер",
    projection: "oblique",
    unit: "mm",
    minimumPoints: 2,
    requiresVolume: true,
    requiresImplant: true
  },
  {
    id: "nerve-canal",
    annotationType: "nerve_canal",
    tool: "nerve_canal",
    title: "Канал НЧ",
    detail: "Трасса нижнечелюстного канала как кривая, а не текстовая заметка.",
    result: "кривая канала",
    projection: "panoramic_reconstruction",
    unit: "mm",
    minimumPoints: 3,
    requiresVolume: true,
    requiresImplant: false
  },
  {
    id: "density-probe",
    annotationType: "bone_density_probe",
    tool: "bone_density_probe",
    title: "Плотность",
    detail: "Точка ориентира плотности кости в зоне будущего ложа.",
    result: "HU/серые значения",
    projection: "axial",
    unit: "HU",
    minimumPoints: 1,
    requiresVolume: true,
    requiresImplant: false
  },
  {
    id: "surgical-guide",
    annotationType: "surgical_guide",
    tool: "surgical_guide",
    title: "Шаблон",
    detail: "Маршрут втулки и передачи плана в лабораторию.",
    result: "пакет шаблона",
    projection: "three_d_volume",
    unit: null,
    minimumPoints: 2,
    requiresVolume: true,
    requiresImplant: true
  }
];

function annotationRole(annotation: CtPlanningArtifactAnnotationRef): ImagingViewerAnnotationSemanticRole {
  if (annotation.semanticRole) return annotation.semanticRole;
  const text = `${annotation.label ?? ""} ${annotation.note ?? ""}`.toLowerCase();
  if (text.includes("ridge_width") || text.includes("ширин")) return "ridge_width";
  if (text.includes("bone_height") || text.includes("высот")) return "bone_height";
  if (text.includes("clearance") || text.includes("канал") || text.includes("отступ")) return "clearance";
  return "generic";
}

export function buildCtPlanningArtifactCommandStates(input: {
  canPlan: boolean;
  hasImplantPlan: boolean;
  annotations: CtPlanningArtifactAnnotationRef[];
}): CtPlanningArtifactCommandState[] {
  return ctPlanningArtifactCommands.map((command) => {
    const matchingAnnotations: CtPlanningArtifactAnnotationRef[] = [];
    const seenAnnotationIds = new Set<string>();
    input.annotations.forEach((annotation, index) => {
      if (annotation.type !== command.annotationType) return;
      if (command.semanticRole && annotationRole(annotation) !== command.semanticRole) return;
      const annotationKey = annotation.id ? `${annotation.type}:${annotation.id}` : `${annotation.type}:local-${index}`;
      if (seenAnnotationIds.has(annotationKey)) return;
      seenAnnotationIds.add(annotationKey);
      matchingAnnotations.push(annotation);
    });
    const completedCount = matchingAnnotations.filter((annotation) => annotation.pointCount >= command.minimumPoints).length;
    const draftCount = matchingAnnotations.length - completedCount;
    const volumeBlocked = command.requiresVolume && !input.canPlan;
    const implantBlocked = command.requiresImplant && !input.hasImplantPlan;
    const status: CtPlanningArtifactStatus = completedCount > 0 ? "ready" : volumeBlocked || implantBlocked ? "blocked" : "draft";
    const blocker = volumeBlocked
      ? "нужна готовая КЛКТ/КТ-серия"
      : implantBlocked
        ? "сначала выберите имплант"
        : null;
    return {
      command,
      status,
      count: completedCount,
      draftCount,
      statusLabel: completedCount > 0 ? `${completedCount} готово` : draftCount > 0 ? `${draftCount} начато` : status === "blocked" ? "нужно действие" : "готово к разметке",
      actionLabel: completedCount > 0 || draftCount > 0 ? "Добавить еще" : "Создать",
      blocker
    };
  });
}
