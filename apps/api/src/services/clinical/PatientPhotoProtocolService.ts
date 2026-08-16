export const MANDATORY_PHOTO_VIEWS = [
	"face_rest", // 1. Лицо в покое (фас)
	"face_smile", // 2. Улыбка (фас)
	"profile_90", // 3. Профиль 90°
	"intraoral_frontal_occlusion", // 4. Сомкнутый прикус с ретракторами (фас)
	"intraoral_right_occlusion", // 5. Сомкнутый прикус справа
	"intraoral_left_occlusion", // 6. Сомкнутый прикус слева
	"maxillary_occlusal", // 7. Верхняя челюсть в зеркало
	"mandibular_occlusal", // 8. Нижняя челюсть в зеркало
	"smile_45_right", // 9. Улыбка 45° справа
	"smile_45_left", // 10. Улыбка 45° слева
	"overjet_12_oclock", // 11. Оверджет вид 12 часов
	"rest_lip_line", // 12. Положение покоя и резцовый край
] as const;

export type PhotoViewType = (typeof MANDATORY_PHOTO_VIEWS)[number];

export interface PhotoProtocolValidationResult {
	totalRequired: number;
	presentCount: number;
	completenessPercentage: number;
	isFullyComplete: boolean;
	missingViews: PhotoViewType[];
}

export class PatientPhotoProtocolService {
	/**
	 * Оценка полноты 12-кадрового диагностического фотопротокола
	 */
	public static validateProtocol(presentViews: PhotoViewType[]): PhotoProtocolValidationResult {
		const uniquePresent = new Set(presentViews);
		const missingViews: PhotoViewType[] = [];

		for (const view of MANDATORY_PHOTO_VIEWS) {
			if (!uniquePresent.has(view)) {
				missingViews.push(view);
			}
		}

		const totalRequired = MANDATORY_PHOTO_VIEWS.length;
		const presentCount = totalRequired - missingViews.length;
		const completenessPercentage = Number(((presentCount / totalRequired) * 100).toFixed(1));

		return {
			totalRequired,
			presentCount,
			completenessPercentage,
			isFullyComplete: missingViews.length === 0,
			missingViews,
		};
	}
}
