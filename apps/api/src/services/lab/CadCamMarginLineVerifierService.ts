import { z } from "zod";

export const preparationValidationSchema = z.object({
	radialCementGapMicrons: z.number().min(0),
	occlusalCementGapMicrons: z.number().min(0),
	shoulderDepthMm: z.number().min(0),
	taperAngleDegrees: z.number().min(0).max(90),
	hasUndercuts: z.boolean(),
	material: z.enum(["zirconia", "other"]),
});

export type PreparationData = z.infer<typeof preparationValidationSchema>;

export interface ValidationReport {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

export class CadCamMarginLineVerifierService {
	private static readonly RADIAL_GAP_MIN = 30;
	private static readonly RADIAL_GAP_MAX = 50;
	private static readonly OCCLUSAL_GAP_MIN = 50;
	private static readonly OCCLUSAL_GAP_MAX = 70;
	private static readonly TAPER_MIN = 6;
	private static readonly TAPER_MAX = 10;
	private static readonly SHOULDER_DEPTH_MIN_OTHER = 0.5;
	private static readonly SHOULDER_DEPTH_MIN_ZIRCONIA = 0.6;

	public static verifyPreparation(data: PreparationData): ValidationReport {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (data.radialCementGapMicrons < this.RADIAL_GAP_MIN || data.radialCementGapMicrons > this.RADIAL_GAP_MAX) {
			errors.push(`Радиальный цементный зазор (${data.radialCementGapMicrons} мкм) вне допустимого диапазона (30-50 мкм).`);
		}

		if (data.occlusalCementGapMicrons < this.OCCLUSAL_GAP_MIN || data.occlusalCementGapMicrons > this.OCCLUSAL_GAP_MAX) {
			errors.push(`Окклюзионный цементный зазор (${data.occlusalCementGapMicrons} мкм) вне допустимого диапазона (50-70 мкм).`);
		}

		const minShoulder = data.material === "zirconia" ? this.SHOULDER_DEPTH_MIN_ZIRCONIA : this.SHOULDER_DEPTH_MIN_OTHER;
		if (data.shoulderDepthMm < minShoulder) {
			errors.push(`Глубина уступа (${data.shoulderDepthMm} мм) меньше минимально необходимой для материала ${data.material} (мин. ${minShoulder} мм).`);
		}

		if (data.hasUndercuts) {
			errors.push("Обнаружены поднутрения (undercuts), препятствующие точной посадке CAD/CAM коронки.");
		}

		if (data.taperAngleDegrees < this.TAPER_MIN || data.taperAngleDegrees > this.TAPER_MAX) {
			warnings.push(`Конусность препарирования (${data.taperAngleDegrees}°) отклоняется от оптимального диапазона 6-10°.`);
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}
}