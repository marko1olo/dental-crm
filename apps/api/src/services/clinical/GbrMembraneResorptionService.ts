/**
 * GbrMembraneResorptionService.ts — Сервис управления таймлайном барьерных мембран при НКР.
 */

export type MembraneType = "bio_gide" | "ossix_plus" | "d_ptfe";

export interface MembraneInfo {
  readonly type: MembraneType;
  readonly nameRu: string;
  readonly isResorbable: boolean;
  readonly barrierFunctionWeeks: [number, number]; // [min, max]
  readonly removalRecommendedWeeks: [number, number] | null;
}

export const MEMBRANE_REGISTRY: Record<MembraneType, MembraneInfo> = {
  bio_gide: {
    type: "bio_gide",
    nameRu: "Нативный коллаген (Bio-Gide)",
    isResorbable: true,
    barrierFunctionWeeks: [16, 24],
    removalRecommendedWeeks: null,
  },
  ossix_plus: {
    type: "ossix_plus",
    nameRu: "Сшитый коллаген (Ossix Plus)",
    isResorbable: true, 
    barrierFunctionWeeks: [24, 36],
    removalRecommendedWeeks: null,
  },
  d_ptfe: {
    type: "d_ptfe",
    nameRu: "Нерезорбируемая (d-PTFE / титановая сетка)",
    isResorbable: false,
    barrierFunctionWeeks: [24, 36], 
    removalRecommendedWeeks: [24, 36], // 6-9 месяцев
  },
};

export interface GbrTimelinePoint {
  readonly week: number;
  readonly titleRu: string;
  readonly descriptionRu: string;
  readonly actionRequired: boolean;
}

export class GbrMembraneResorptionService {
  /**
   * Генерация контрольных точек для мембраны.
   */
  public static generateTimeline(membraneType: MembraneType): GbrTimelinePoint[] {
    const membrane = MEMBRANE_REGISTRY[membraneType];
    const points: GbrTimelinePoint[] = [
      {
        week: 2,
        titleRu: "Контроль заживления (2 недели)",
        descriptionRu: "Контроль состояния мягких тканей, швов, исключение дегисценции.",
        actionRequired: true,
      },
      {
        week: 24,
        titleRu: "КТ-контроль минерализации (6 месяцев)",
        descriptionRu: "Оценка плотности аугментата. Для резорбируемых — завершение периода барьерной функции.",
        actionRequired: !membrane.isResorbable,
      },
    ];

    if (!membrane.isResorbable && membrane.removalRecommendedWeeks) {
      points.push({
        week: membrane.removalRecommendedWeeks[0],
        titleRu: "Планирование удаления мембраны",
        descriptionRu: "Необходимо запланировать операцию по удалению нерезорбируемой мембраны.",
        actionRequired: true,
      });
    }

    return points.sort((a, b) => a.week - b.week);
  }
}
