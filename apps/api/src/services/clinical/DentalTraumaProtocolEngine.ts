/**
 * DentalTraumaProtocolEngine.ts — Протоколирование и управление планом лечения
 * острой травмы зубов в соответствии с рекомендациями IADT 2020.
 *
 * IADT 2020 Guidelines Compliance:
 * - Avulsion (Полный вывих):
 *   - Dry time < 60 min: Replantation, flexible splinting 2 weeks.
 *   - Dry time > 60 min: Replantation, flexible splinting 2 weeks, RCT required.
 *   - Mandatory: Antibiotics, tetanus prophylaxis.
 * - Intrusion (Вколоченный вывих):
 *   - Spontaneous eruption or orthodontic extrusion.
 *
 * Dispensary Follow-up: 2w, 4w, 6-8w, 6m, 1y, 5y.
 */

export type TraumaType = "AVULSION" | "INTRUSION";

export interface TraumaProtocolInput {
  traumaType: TraumaType;
  dryTimeMinutes?: number; // Only for Avulsion
  toothIdentifier: string;
}

export interface DispensaryVisit {
  monthOffset: number;
  description: string;
  recommendedTests: string[];
}

export interface TraumaTreatmentPlan {
  protocol: string;
  splinting: string;
  medication: string[];
  followUpSchedule: DispensaryVisit[];
}

export class DentalTraumaProtocolEngine {
  public static getProtocol(input: TraumaProtocolInput): TraumaTreatmentPlan {
    if (input.traumaType === "AVULSION") {
      const dryTime = input.dryTimeMinutes ?? 0;
      const rctNeeded = dryTime > 60;
      return {
        protocol: rctNeeded
          ? "Авульсия (>60 мин): Реплантация, гибкая шина 2 недели, Эндодонтическое лечение (RCT) обязательно."
          : "Авульсия (<60 мин): Реплантация, гибкая шина 2 недели.",
        splinting: "Гибкое шинирование на 2 недели.",
        medication: ["Антибиотики (системно)", "Столбнячная профилактика (при необходимости)"],
        followUpSchedule: this.getDefaultSchedule(),
      };
    }

    if (input.traumaType === "INTRUSION") {
      return {
        protocol: "Вколоченный вывих: Тактика ожидания спонтанного прорезывания или ортодонтическая экструзия.",
        splinting: "Не требуется (или зависит от стабильности)",
        medication: ["Обезболивающие при необходимости"],
        followUpSchedule: this.getDefaultSchedule(),
      };
    }

    throw new Error("Неподдерживаемый тип травмы.");
  }

  private static getDefaultSchedule(): DispensaryVisit[] {
    return [
      { monthOffset: 0.5, description: "2 недели", recommendedTests: ["ЭОД", "Рентген"] },
      { monthOffset: 1, description: "4 недели", recommendedTests: ["ЭОД"] },
      { monthOffset: 2, description: "6-8 недель", recommendedTests: ["ЭОД", "Рентген"] },
      { monthOffset: 6, description: "6 месяцев", recommendedTests: ["ЭОД", "Рентген"] },
      { monthOffset: 12, description: "1 год", recommendedTests: ["ЭОД", "Рентген"] },
      { monthOffset: 60, description: "5 лет", recommendedTests: ["ЭОД", "Рентген"] },
    ];
  }
}
