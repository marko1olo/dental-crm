export const SCALER_TIP_MANUFACTURERS = [
	"ems",
	"acteon_satelec",
	"woodpecker",
] as const;

export type ScalerTipManufacturer = (typeof SCALER_TIP_MANUFACTURERS)[number];

export interface ScalerTipStatus {
	manufacturer: ScalerTipManufacturer;
	wearInMm: number; // Потеря длины в мм
	efficiencyPercentage: number;
	status: "optimal" | "warning" | "discard_required";
	recommendation: string | null;
}

export class ScalerTipWearTrackerService {
	/**
	 * Рассчитывает состояние и эффективность насадки скейлера на основе износа.
	 * 0 мм: 100% эффективность.
	 * 1 мм: 75% эффективность (Предупреждение: требуется большее давление).
	 * >= 2 мм: 50% эффективность (Критический износ -> Списание).
	 */
	public static calculateStatus(
		manufacturer: ScalerTipManufacturer,
		wearInMm: number,
	): ScalerTipStatus {
		if (wearInMm < 0) {
			throw new Error("Износ не может быть отрицательным");
		}

		let efficiencyPercentage: number;
		let status: "optimal" | "warning" | "discard_required";
		let recommendation: string | null = null;

		if (wearInMm >= 2) {
			efficiencyPercentage = 50;
			status = "discard_required";
			recommendation = "Критический износ: насадка подлежит немедленной утилизации и замене.";
		} else if (wearInMm >= 1) {
			efficiencyPercentage = 75;
			status = "warning";
			recommendation = "Требуется большее давление для достижения необходимого эффекта.";
		} else {
			efficiencyPercentage = 100;
			status = "optimal";
		}

		return {
			manufacturer,
			wearInMm,
			efficiencyPercentage,
			status,
			recommendation,
		};
	}
}
