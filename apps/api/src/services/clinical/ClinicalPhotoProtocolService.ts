export const DENTAL_PHOTO_ANGLES = [
	"portrait_full_face_rest", // Анфас в покое
	"portrait_full_face_smile", // Анфас с широкой улыбкой
	"portrait_profile_right", // Профиль 90°
	"portrait_semiprofile_45", // Полупрофиль 45°
	"intraoral_frontal_occlusion", // Фронт с ретрактором в центральной окклюзии
	"intraoral_frontal_open", // Фронт с ретрактором с разомкнутыми зубами
	"intraoral_lateral_right_1_1", // Боковой вид справа 1:1
	"intraoral_lateral_left_1_1", // Боковой вид слева 1:1
	"intraoral_occlusal_upper", // Окклюзионный вид верхней челюсти
	"intraoral_occlusal_lower", // Окклюзионный вид нижней челюсти
	"intraoral_overjet_sagittal", // Сагиттальный профиль резцов (оверджет)
	"intraoral_anterior_closeup", // Передний сегмент крупный план 1:1
] as const;
export type DentalPhotoAngle = (typeof DENTAL_PHOTO_ANGLES)[number];

export const MANDATORY_LAB_ANGLES: readonly DentalPhotoAngle[] = [
	"portrait_full_face_smile",
	"portrait_profile_right",
	"intraoral_frontal_occlusion",
	"intraoral_lateral_right_1_1",
	"intraoral_lateral_left_1_1",
	"intraoral_occlusal_upper",
	"intraoral_occlusal_lower",
	"intraoral_overjet_sagittal",
];

export interface ClinicalPhotoItem {
	id: string;
	organizationId: string;
	patientId: string;
	angle: DentalPhotoAngle;
	fileUrl: string;
	takenAt: Date;
	capturedByDoctorId?: string | null;
}

export interface PhotoProtocolValidationResult {
	totalPhotosCount: number;
	uniqueAnglesCount: number;
	isFullProtocolComplete: boolean;
	isValidForDentalLab: boolean;
	missingMandatoryLabAngles: DentalPhotoAngle[];
	missingAllAngles: DentalPhotoAngle[];
}

export class ClinicalPhotoProtocolService {
	public static readonly MIN_LAB_PHOTOS_COUNT = 8;

	/**
	 * Формирование водяного знака для клинического экспорта
	 */
	public static generateWatermarkString(
		clinicName: string,
		patientFullName: string,
		date: Date = new Date(),
	): string {
		const dateStr = date.toISOString().split("T")[0]!;
		return `${clinicName.toUpperCase()} | Пациент: ${patientFullName} | Дата: ${dateStr}`;
	}

	/**
	 * Валидация полноты фотопротокола
	 */
	public static validatePhotoProtocol(photos: readonly ClinicalPhotoItem[]): PhotoProtocolValidationResult {
		const presentAngles = new Set<DentalPhotoAngle>(photos.map((p) => p.angle));

		const missingMandatoryLabAngles = MANDATORY_LAB_ANGLES.filter((a) => !presentAngles.has(a));
		const missingAllAngles = DENTAL_PHOTO_ANGLES.filter((a) => !presentAngles.has(a));

		const totalPhotosCount = photos.length;
		const uniqueAnglesCount = presentAngles.size;

		const isValidForDentalLab =
			missingMandatoryLabAngles.length === 0 && uniqueAnglesCount >= this.MIN_LAB_PHOTOS_COUNT;
		const isFullProtocolComplete = missingAllAngles.length === 0;

		return {
			totalPhotosCount,
			uniqueAnglesCount,
			isFullProtocolComplete,
			isValidForDentalLab,
			missingMandatoryLabAngles,
			missingAllAngles,
		};
	}
}
