/**
 * ImplantTorqueCurveService.ts
 * Сервис для оценки торка установки имплантата и классификации кости по Мишу (Misch).
 * Шлюз немедленной нагрузки (Immediate Loading) основан на торке и типе кости.
 */

export type MischBoneDensity = "D1" | "D2" | "D3" | "D4";

export interface ImplantInstallationParams {
  readonly torqueNcm: number;
  readonly boneDensity: MischBoneDensity;
}

export interface LoadingGateResult {
  readonly isImmediateLoadingApproved: boolean;
  readonly rationale: string;
  readonly protocolRequired: "immediate_loading" | "two_stage_implantation";
}

export class ImplantTorqueCurveService {
  public static readonly MIN_TORQUE_FOR_IMMEDIATE_LOADING = 35;

  /**
   * Оценивает возможность немедленной нагрузки (immediate loading).
   * 
   * КЛИНИЧЕСКИЙ ПРОТОКОЛ:
   * Одобрение немедленной нагрузки СТРОГО при торке >= 35 Н·см и кости D1-D3.
   * При торке < 35 Н·см или кости D4 — обязательный протокол двухэтапной имплантации (3-6 мес).
   */
  public static evaluateImmediateLoadingGate(
    params: ImplantInstallationParams
  ): LoadingGateResult {
    const { torqueNcm, boneDensity } = params;

    const isTorqueSufficient = torqueNcm >= this.MIN_TORQUE_FOR_IMMEDIATE_LOADING;
    const isDensitySuitable = boneDensity !== "D4";

    const isImmediateLoadingApproved = isTorqueSufficient && isDensitySuitable;

    if (isImmediateLoadingApproved) {
      return {
        isImmediateLoadingApproved: true,
        protocolRequired: "immediate_loading",
        rationale: "Торк введения >= 35 Н·см и достаточная плотность кости (D1-D3) обеспечивают первичную стабильность, необходимую для немедленной нагрузки.",
      };
    }

    const reasons: string[] = [];
    if (!isTorqueSufficient) {
      reasons.push(`торк введения (${torqueNcm} Н·см) ниже минимального (${this.MIN_TORQUE_FOR_IMMEDIATE_LOADING} Н·см)`);
    }
    if (!isDensitySuitable) {
      reasons.push(`недостаточная плотность кости (${boneDensity})`);
    }

    return {
      isImmediateLoadingApproved: false,
      protocolRequired: "two_stage_implantation",
      rationale: `Немедленная нагрузка отклонена: ${reasons.join(" и ")}. Обязателен протокол двухэтапной имплантации (3-6 мес заживления).`,
    };
  }
}
