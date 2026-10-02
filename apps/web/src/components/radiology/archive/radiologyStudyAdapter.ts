import type { ImagingStudy, DentalRadiologyStudyType } from "@dental/shared";
import type { RadiologyModality, RadiologyStudy } from "../types";

/**
 * Конвертер ImagingStudy (DTO сервера) в RadiologyStudy (для вьюеров и 3D MPR Студии).
 * Гарантирует строгую типизацию без loose any и с соблюдением всех обязательных полей.
 */
export function convertImagingStudyToRadiologyStudy(
	study: ImagingStudy,
	fallbackDoctorName = "Лечащий врач",
): RadiologyStudy {
	const isCbct = study.kind === "cbct" || (study.sliceCount !== null && study.sliceCount !== undefined && study.sliceCount > 1);
	const isOpg = study.kind === "opg";

	let modality: RadiologyModality = "intraoral_rvg";
	let studyType: DentalRadiologyStudyType = "intraoral_radiovisiography";
	let modalityLabel = "Прицельный RVG";
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

	const effectivePatientName = study.patientFullName || study.dicomPatientName || "Пациент";

	return {
		id: study.id,
		...(study.patientId ? { patientId: study.patientId } : {}),
		patientName: effectivePatientName,
		...(study.dicomBirthDate ? { patientBirthDate: study.dicomBirthDate } : {}),
		studyDate: study.capturedAt || study.studyDate || new Date().toISOString(),
		studyType,
		modality,
		modalityLabel,
		anatomicalArea: study.region || (study.toothCode ? `Зуб ${study.toothCode}` : "Челюстно-лицевая область"),
		teethFdi: study.toothCode ? [study.toothCode] : [],
		effectiveDoseMicrosv: typicalDoseMicrosv,
		effectiveDoseMsv: typicalDoseMicrosv / 1000.0,
		imageUrl: study.previewUrl,
		thumbnailUrl: study.previewUrl,
		doctorName: fallbackDoctorName,
		status: "completed",
		...(study.aiSummary ? { diagnosticNotes: study.aiSummary } : {}),
		metadata: {
			apparatusModel: study.sourceName,
			...(study.dicomStudyUid ? { dicomStudyUid: study.dicomStudyUid } : {}),
			...(study.seriesInstanceUid ? { dicomSeriesUid: study.seriesInstanceUid } : {}),
		},
	};
}
