import type { ImagingStudy, DentalRadiologyStudyType } from "@dental/shared";
import type { RadiologyModality, RadiologyStudy } from "../types";

/**
 * Конвертер ImagingStudy (DTO сервера) в RadiologyStudy (для вьюеров и 3D MPR Студии).
 * Гарантирует строгую типизацию без loose any и с соблюдением всех обязательных полей.
 */
export interface AdaptableStudyInput {
	id: string;
	kind?: string | null | undefined;
	title?: string | null | undefined;
	region?: string | null | undefined;
	toothCode?: string | number | null | undefined;
	sliceCount?: number | null | undefined;
	capturedAt?: string | null | undefined;
	studyDate?: string | null | undefined;
	patientId?: string | null | undefined;
	patientFullName?: string | null | undefined;
	dicomPatientName?: string | null | undefined;
	dicomBirthDate?: string | null | undefined;
	previewUrl?: string | null | undefined;
	sourceName?: string | null | undefined;
	aiSummary?: string | null | undefined;
	dicomStudyUid?: string | null | undefined;
	seriesInstanceUid?: string | null | undefined;
	[key: string]: unknown;
}

export function convertImagingStudyToRadiologyStudy(
	study: AdaptableStudyInput,
	fallbackDoctorName = "Лечащий врач",
): RadiologyStudy {
	const isCbct = study.kind === "cbct" || (typeof study.sliceCount === "number" && study.sliceCount > 1);
	const isOpg = study.kind === "opg";

	let modality: RadiologyModality = "intraoral_rvg";
	let studyType: DentalRadiologyStudyType = "intraoral_radiovisiography";
	let modalityLabel = "Прицельный снимок";
	let typicalDoseMicrosv = 3.0;

	if (isCbct) {
		modality = "cbct_3d";
		studyType = "cbct_jaw_8x8";
		modalityLabel = "3D КЛКТ";
		typicalDoseMicrosv = 55.0;
	} else if (isOpg) {
		modality = "optg_panoramic";
		studyType = "optg_digital_panoramic";
		modalityLabel = "ОПТГ Панорама";
		typicalDoseMicrosv = 13.0;
	} else if (study.kind === "ceph") {
		modality = "trg_ceph";
		studyType = "trg_cephalometric_lateral";
		modalityLabel = "ТРГ";
		typicalDoseMicrosv = 10.0;
	}

	const effectivePatientName = (typeof study.patientFullName === "string" && study.patientFullName.trim().length > 0)
		? study.patientFullName
		: (typeof study.dicomPatientName === "string" && study.dicomPatientName.trim().length > 0)
			? study.dicomPatientName
			: "Пациент";

	const effectiveStudyDate = (typeof study.capturedAt === "string" && study.capturedAt)
		|| (typeof study.studyDate === "string" && study.studyDate)
		|| new Date().toISOString();

	return {
		id: study.id,
		...(typeof study.patientId === "string" && study.patientId ? { patientId: study.patientId } : {}),
		patientName: effectivePatientName,
		...(typeof study.dicomBirthDate === "string" && study.dicomBirthDate ? { patientBirthDate: study.dicomBirthDate } : {}),
		studyDate: effectiveStudyDate,
		studyType,
		modality,
		modalityLabel,
		anatomicalArea: (typeof study.region === "string" && study.region) || (study.toothCode ? `Зуб ${study.toothCode}` : "Челюстно-лицевая область"),
		teethFdi: study.toothCode ? [String(study.toothCode)] : [],
		effectiveDoseMicrosv: typicalDoseMicrosv,
		effectiveDoseMsv: typicalDoseMicrosv / 1000.0,
		...(typeof study.previewUrl === "string" && study.previewUrl
			? { imageUrl: study.previewUrl, thumbnailUrl: study.previewUrl }
			: {}),
		doctorName: fallbackDoctorName,
		status: "completed",
		...(typeof study.aiSummary === "string" && study.aiSummary ? { diagnosticNotes: study.aiSummary } : {}),
		metadata: {
			...(typeof study.sourceName === "string" && study.sourceName ? { apparatusModel: study.sourceName } : {}),
			...(typeof study.dicomStudyUid === "string" && study.dicomStudyUid ? { dicomStudyUid: study.dicomStudyUid } : {}),
			...(typeof study.seriesInstanceUid === "string" && study.seriesInstanceUid ? { dicomSeriesUid: study.seriesInstanceUid } : {}),
		},
	};
}
