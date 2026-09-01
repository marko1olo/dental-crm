import { z } from "zod";

/**
 * ISO Base Media File Format (ISOBMFF) Brand Identifiers for HEIF / HEIC / AVIF
 */
export const HEIF_COMPATIBLE_BRANDS = [
	"heic", // High Efficiency Image Coding (HEVC Still Image)
	"heix", // HEIF with 10-bit or range extension
	"hevc", // HEVC intra-coded image
	"hevx", // HEVC intra-coded image sequence
	"heim", // HEIF image sequence
	"heis", // HEIF image sequence
	"hevm", // HEVC sequence
	"hevs", // HEVC sequence
	"mif1", // Multi-image file format basic brand
	"msf1", // Image sequence basic brand
	"miaf", // Multi-image application format
	"avif", // AV1 Image File Format
	"avis", // AV1 Image Sequence
] as const;

export type HeifCompatibleBrand = (typeof HEIF_COMPATIBLE_BRANDS)[number];

export const EXIF_ORIENTATIONS = {
	NORMAL: 1, // 0 deg
	FLIP_HORIZONTAL: 2,
	ROTATE_180: 3, // 180 deg
	FLIP_VERTICAL: 4,
	TRANSPOSE: 5, // 90 deg CW + flip horizontal
	ROTATE_90_CW: 6, // 90 deg CW
	TRANSVERSE: 7, // 270 deg CW + flip horizontal
	ROTATE_270_CW: 8, // 270 deg CW (90 deg CCW)
} as const;

export type ExifOrientation =
	(typeof EXIF_ORIENTATIONS)[keyof typeof EXIF_ORIENTATIONS];

export const COLOR_SPACES = {
	SRGB: "sRGB",
	DISPLAY_P3: "Display P3",
	ADOBE_RGB: "Adobe RGB (1998)",
	PRO_PHOTO_RGB: "ProPhoto RGB",
	REC2020: "Rec. 2020",
	UNKNOWN: "Unknown / Device Specific",
} as const;

export type ColorSpace = (typeof COLOR_SPACES)[keyof typeof COLOR_SPACES];

/**
 * Dental Photo Protocol Slots according to standard Russian & international dental photo protocol
 */
export const DENTAL_PHOTO_SLOT_TYPES = [
	"portrait_full_face_rest", // Внеротовой: Фас в покое
	"portrait_full_face_smile", // Внеротовой: Фас в улыбке
	"portrait_profile_rest", // Внеротовой: Профиль в покое
	"portrait_profile_smile", // Внеротовой: Профиль в улыбке
	"portrait_three_quarter", // Внеротовой: 3/4 (полупрофиль)
	"intraoral_frontal_occlusion", // Внутриротовой: Фронтальный прикус (окклюзия)
	"intraoral_frontal_open", // Внутриротовой: Фронтальный разобщенный
	"intraoral_right_lateral", // Внутриротовой: Боковой правый (клыковое/молярное соотношение)
	"intraoral_left_lateral", // Внутриротовой: Боковой левый
	"intraoral_upper_occlusal", // Внутриротовой: Окклюзионный вид верхней челюсти (зеркало)
	"intraoral_lower_occlusal", // Внутриротовой: Окклюзионный вид нижней челюсти (зеркало)
	"intraoral_anterior_overjet", // Внутриротовой: Сагиттальная щель / перекрытие
	"macro_tooth_shade", // Макросъемка: Определение цвета с расцветкой VITA
	"macro_isolated_tooth", // Макросъемка: Изолированный зуб с коффердамом
	"macro_periodontal_status", // Макросъемка: Десневой край / биотип пародонта
	"macro_surgical_field", // Хирургическое поле / шовный материал
	"other_clinical_photo", // Прочее клиническое фото
] as const;

export type DentalPhotoSlotType = (typeof DENTAL_PHOTO_SLOT_TYPES)[number];

export const DENTAL_PHOTO_SLOT_LABELS_RU: Record<DentalPhotoSlotType, string> =
	{
		portrait_full_face_rest: "Портрет: Фас в покое",
		portrait_full_face_smile: "Портрет: Фас в улыбке",
		portrait_profile_rest: "Портрет: Профиль в покое",
		portrait_profile_smile: "Портрет: Профиль в улыбке",
		portrait_three_quarter: "Портрет: 3/4 Полупрофиль",
		intraoral_frontal_occlusion: "Внутриротовой: Фронтальная окклюзия",
		intraoral_frontal_open: "Внутриротовой: Фронт с разобщением",
		intraoral_right_lateral: "Внутриротовой: Правый боковой сегмент",
		intraoral_left_lateral: "Внутриротовой: Левый боковой сегмент",
		intraoral_upper_occlusal: "Внутриротовой: Верхняя челюсть (окклюзия)",
		intraoral_lower_occlusal: "Внутриротовой: Нижняя челюсть (окклюзия)",
		intraoral_anterior_overjet: "Внутриротовой: Сагиттальное перекрытие",
		macro_tooth_shade: "Макро: Определение цвета (VITA)",
		macro_isolated_tooth: "Макро: Изоляция зуба (коффердам)",
		macro_periodontal_status: "Макро: Пародонт / краевая десна",
		macro_surgical_field: "Хирургический протокол / швы",
		other_clinical_photo: "Дополнительный клинический снимок",
	};

export interface ExifImageMetadata {
	make?: string;
	model?: string;
	lensModel?: string;
	software?: string;
	iso?: number;
	fNumber?: number;
	exposureTime?: string;
	focalLengthMm?: number;
	colorSpace: ColorSpace;
	orientation: ExifOrientation;
	captureTimestampIso?: string;
	iccProfileName?: string;
	hasWideGamutP3: boolean;
	pixelWidth: number;
	pixelHeight: number;
}

export interface HeicDecodingResult {
	success: boolean;
	width: number;
	height: number;
	format: "webp" | "jpeg" | "png";
	colorSpace: ColorSpace;
	exif: ExifImageMetadata;
	dataUrl: string;
	thumbnailWebpDataUrl: string; // 200x200 instant preview
	sizeBytes: number;
	originalSizeBytes: number;
	compressionRatio: number;
	processingDurationMs: number;
	warnings: string[];
	usedFallback: boolean;
}

export interface HeicDecoderOptions {
	targetFormat?: "webp" | "jpeg" | "png";
	quality?: number; // 0.1 to 1.0 (default 0.92 for high clinical fidelity)
	maxDimension?: number; // default 3840 (4K limit for performance)
	preserveColorProfile?: boolean; // default true
	applyExifRotation?: boolean; // default true
	generateThumbnail?: boolean; // default true
	thumbnailSize?: number; // default 200
	enableWebWorker?: boolean; // default true
}

export const heicDecoderOptionsSchema = z.object({
	targetFormat: z.enum(["webp", "jpeg", "png"]).default("webp"),
	quality: z.number().min(0.1).max(1.0).default(0.92),
	maxDimension: z.number().int().min(200).max(8192).default(3840),
	preserveColorProfile: z.boolean().default(true),
	applyExifRotation: z.boolean().default(true),
	generateThumbnail: z.boolean().default(true),
	thumbnailSize: z.number().int().min(50).max(1000).default(200),
	enableWebWorker: z.boolean().default(true),
});

export const photoProtocolUploadPayloadSchema = z.object({
	patientId: z.string().uuid("Некорректный ID пациента"),
	visitId: z.string().uuid().optional().nullable(),
	slotType: z.enum(DENTAL_PHOTO_SLOT_TYPES).default("other_clinical_photo"),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	stage: z.enum(["before", "during", "after", "followup"]).default("before"),
	fileName: z.string().min(1),
	mimeType: z.string().min(1),
	colorSpace: z.string().default(COLOR_SPACES.DISPLAY_P3),
	colorCalibrationApplied: z.boolean().default(false),
	vitaShade: z.string().optional().nullable(),
	notes: z.string().max(1000).optional().nullable(),
});

export type PhotoProtocolUploadPayload = z.infer<
	typeof photoProtocolUploadPayloadSchema
>;

/**
 * Helper to check if a binary buffer begins with an ISOBMFF FTYP box for HEIC/HEIF/AVIF
 */
export function isHeicOrHeifBuffer(
	buffer: Uint8Array | ArrayBuffer | ArrayBufferView,
): boolean {
	const u8 =
		buffer instanceof Uint8Array
			? buffer
			: buffer instanceof ArrayBuffer
				? new Uint8Array(buffer)
				: ArrayBuffer.isView(buffer)
					? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
					: new Uint8Array(0);

	if (u8.length < 12) return false;

	// Check for 'ftyp' at bytes 4..7
	const isFtyp =
		u8[4] === 0x66 && // 'f'
		u8[5] === 0x74 && // 't'
		u8[6] === 0x79 && // 'y'
		u8[7] === 0x70; // 'p'

	if (!isFtyp) return false;

	// Check major brand at bytes 8..11
	const b8 = u8[8] ?? 0;
	const b9 = u8[9] ?? 0;
	const b10 = u8[10] ?? 0;
	const b11 = u8[11] ?? 0;
	const majorBrand = String.fromCharCode(b8, b9, b10, b11).toLowerCase();
	if (HEIF_COMPATIBLE_BRANDS.includes(majorBrand as HeifCompatibleBrand)) {
		return true;
	}

	// Check compatible brands starting at byte 16 up to box length
	const b0 = u8[0] ?? 0;
	const b1 = u8[1] ?? 0;
	const b2 = u8[2] ?? 0;
	const b3 = u8[3] ?? 0;
	const boxLength = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
	const maxScan = Math.min(u8.length, boxLength > 0 ? boxLength : 64);

	for (let i = 16; i + 4 <= maxScan; i += 4) {
		const compBrand = String.fromCharCode(
			u8[i] ?? 0,
			u8[i + 1] ?? 0,
			u8[i + 2] ?? 0,
			u8[i + 3] ?? 0,
		).toLowerCase();
		if (HEIF_COMPATIBLE_BRANDS.includes(compBrand as HeifCompatibleBrand)) {
			return true;
		}
	}

	return false;
}

/**
 * Check file extension or MIME type for HEIC/HEIF
 */
export function isHeicFileNameOrMime(
	fileNameOrMime: string | null | undefined,
): boolean {
	if (!fileNameOrMime) return false;
	const lower = fileNameOrMime.toLowerCase().trim();
	return (
		lower.endsWith(".heic") ||
		lower.endsWith(".heif") ||
		lower.endsWith(".heics") ||
		lower.endsWith(".heifs") ||
		lower.endsWith(".hif") ||
		lower.includes("image/heic") ||
		lower.includes("image/heif") ||
		lower.includes("image/heic-sequence") ||
		lower.includes("image/heif-sequence")
	);
}

/**
 * Transform dimensions based on EXIF orientation (e.g. 90/270 deg rotations swap W and H)
 */
export function getOrientedDimensions(
	width: number,
	height: number,
	orientation: ExifOrientation,
): { width: number; height: number } {
	if (
		orientation === EXIF_ORIENTATIONS.ROTATE_90_CW ||
		orientation === EXIF_ORIENTATIONS.ROTATE_270_CW ||
		orientation === EXIF_ORIENTATIONS.TRANSPOSE ||
		orientation === EXIF_ORIENTATIONS.TRANSVERSE
	) {
		return { width: height, height: width };
	}
	return { width, height };
}
