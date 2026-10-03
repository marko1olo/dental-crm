/**
 * dicomIngestMetadataParser.ts — Высокоскоростной парсер клинических и аппаратных метаданных DICOM.
 * Извлекает данные пациента (ФИО, номер карты, дата рождения), параметры лучевой нагрузки (DAP, kVp, mA),
 * метрики вокселя/пикселя (PixelSpacing, SliceThickness) и определяет клиническую модальность
 * (визиограф IOSensor, панорама, томография КЛКТ, ТРГ).
 */

import dicomParser from "dicom-parser";
import { formatDicomDateToIso } from "../imaging/dicomMetadataParser.js";

export type IngestModalityKind = "intraoral" | "panoramic" | "ct" | "cephalometric" | "secondary_capture" | "other";

export interface DicomIngestMetadata {
	// Идентификация пациента
	patientFullName: string | null;
	patientChartNumber: string | null; // PatientID (0010,0020)
	patientBirthDate: string | null; // ISO YYYY-MM-DD
	patientSex: "male" | "female" | null;

	// Исследование и серия
	studyDate: string | null; // ISO YYYY-MM-DD
	studyTime: string | null; // HH:mm:ss
	studyInstanceUid: string;
	seriesInstanceUid: string;
	sopInstanceUid: string;
	sopClassUid: string | null;
	studyDescription: string | null;
	seriesDescription: string | null;
	instanceNumber: number | null;

	// Аппарат и производитель
	manufacturer: string | null;
	manufacturerModelName: string | null;
	stationName: string | null;
	institutionName: string | null;

	// Лучевая нагрузка и доза
	kvp: number | null; // Напряжение на трубке (кВп, 60-90 kVp)
	ma: number | null; // Анодный ток (мА, 2-10 mA)
	exposureTimeMs: number | null; // Время экспозиции в мс
	exposureInMas: number | null; // Экспозиция в мАс (0018,115A)
	doseAreaProductDap: number | null; // Доза DAP (dGy*cm^2 / mGy*cm^2)
	ctdiVol: number | null; // CTDIvol (0018,9345)
	estimatedEffectiveDoseMsv: number | null; // Оценочная эффективная доза мЗв по СанПиН

	// Разрешение матрицы и геометрия
	rows: number | null;
	columns: number | null;
	bitsAllocated: number | null;
	bitsStored: number | null;
	pixelSpacing: [number, number] | null; // [rowSpacingMm, colSpacingMm]
	sliceThickness: number | null; // мм
	sliceLocation: number | null; // мм (0020,1041)
	spacingBetweenSlices: number | null; // мм
	windowCenter: number | null;
	windowWidth: number | null;
	rescaleIntercept: number | null;
	rescaleSlope: number | null;

	// Клинический вывод
	modalityRaw: string | null;
	modalityKind: IngestModalityKind;
	suggestedStudyTitle: string;
	warnings: string[];
}

/**
 * Очистка строкового значения DICOM
 */
export function cleanDicomString(raw: string | null | undefined): string | null {
	if (!raw) return null;
	const cleaned = raw
		.replace(/\0+$/g, "")
		.replace(/\^/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return cleaned.length > 0 ? cleaned : null;
}

/**
 * Парсер числового значения из строки DICOM (DS/IS)
 */
function parseDicomNumber(raw: string | null | undefined): number | null {
	if (!raw) return null;
	const num = Number.parseFloat(raw.replace(/[^\d.-]/g, ""));
	return Number.isFinite(num) ? num : null;
}

/**
 * Определение нормализованной клинической модальности по тегам Modality, SOPClassUID и SeriesDescription
 */
export function classifyDicomModality(
	modality: string | null,
	sopClassUid: string | null,
	seriesDesc: string | null,
	rows: number | null,
	columns: number | null,
): IngestModalityKind {
	const mod = (modality ?? "").toUpperCase().trim();
	const desc = (seriesDesc ?? "").toLowerCase();

	// 1. КТ / КЛКТ (CBCT / CT)
	if (
		mod === "CT" ||
		mod === "CBCT" ||
		sopClassUid === "1.2.840.10008.5.1.4.1.1.2" ||
		sopClassUid === "1.2.840.10008.5.1.4.1.1.2.1" ||
		desc.includes("cbct") ||
		desc.includes("клкт") ||
		desc.includes("томограф")
	) {
		return "ct";
	}

	// 2. Интраоральный рентген / визиограф (IO, RVG, EzSensor)
	if (
		mod === "IO" ||
		sopClassUid === "1.2.840.10008.5.1.4.1.1.1.3" ||
		sopClassUid === "1.2.840.10008.5.1.4.1.1.1.3.1" ||
		desc.includes("визиограф") ||
		desc.includes("rvg") ||
		desc.includes("ezsensor") ||
		desc.includes("intraoral") ||
		desc.includes("прицельн")
	) {
		return "intraoral";
	}

	// 3. Панорамный рентген / ОПТГ (PX, Panoramic)
	if (
		mod === "PX" ||
		sopClassUid === "1.2.840.10008.5.1.4.1.1.1.4" ||
		desc.includes("pano") ||
		desc.includes("панорам") ||
		desc.includes("оптг") ||
		desc.includes("opg")
	) {
		return "panoramic";
	}

	// 4. ТРГ / Цефалометрия (Cephalometric, TRG)
	if (
		desc.includes("ceph") ||
		desc.includes("трг") ||
		desc.includes("цефало")
	) {
		return "cephalometric";
	}

	// 5. Вторичный захват (Secondary Capture)
	if (
		mod === "SC" ||
		sopClassUid === "1.2.840.10008.5.1.4.1.1.7"
	) {
		return "secondary_capture";
	}

	// 6. Эвристика по соотношению сторон матрицы
	if (rows && columns) {
		const ratio = columns / rows;
		if (ratio >= 1.6) {
			// Широкий прямоугольник — характерно для ОПТГ (панорамы)
			return "panoramic";
		}
		if (rows < 1500 && columns < 1200) {
			// Небольшой прямоугольник — стандартная матрица сенсора визиографа (например 686x906 или 1000x1400)
			return "intraoral";
		}
	}

	return "other";
}

/**
 * Парсинг буфера DICOM-файла в строгую клиническую структуру метаданных.
 */
export function parseDicomIngestBuffer(buffer: Buffer): DicomIngestMetadata {
	const warnings: string[] = [];

	if (buffer.length < 132) {
		throw new Error("Недостаточный размер буфера для формата DICOM (меньше 132 байт).");
	}

	let dataSet: dicomParser.DataSet;
	try {
		dataSet = dicomParser.parseDicom(buffer);
	} catch (err) {
		throw new Error(`Ошибка разбора заголовков DICOM: ${err instanceof Error ? err.message : String(err)}`);
	}

	const getString = (tag: string): string | null => {
		try {
			const val = dataSet.string(tag);
			return cleanDicomString(val);
		} catch {
			return null;
		}
	};

	const getNumber = (tag: string): number | null => {
		try {
			const val = dataSet.string(tag);
			return parseDicomNumber(val);
		} catch {
			return null;
		}
	};

	const getUint16 = (tag: string): number | null => {
		try {
			const val = dataSet.uint16(tag);
			return typeof val === "number" && !Number.isNaN(val) ? val : null;
		} catch {
			return null;
		}
	};

	const getInt16 = (tag: string): number | null => {
		try {
			const val = dataSet.int16(tag);
			return typeof val === "number" && !Number.isNaN(val) ? val : null;
		} catch {
			return null;
		}
	};

	// Извлечение ключевых тегов
	const rawPatientName = getString("x00100010");
	const patientChartNumber = getString("x00100020");
	const rawBirthDate = getString("x00100030");
	const patientBirthDate = formatDicomDateToIso(rawBirthDate);
	const rawSex = getString("x00100040")?.toUpperCase();
	const patientSex: "male" | "female" | null =
		rawSex === "M" || rawSex === "MALE" ? "male" : rawSex === "F" || rawSex === "FEMALE" ? "female" : null;

	const rawStudyDate = getString("x00080020");
	const studyDate = formatDicomDateToIso(rawStudyDate);
	const rawStudyTime = getString("x00080030");
	let studyTime: string | null = null;
	if (rawStudyTime && rawStudyTime.length >= 6) {
		studyTime = `${rawStudyTime.slice(0, 2)}:${rawStudyTime.slice(2, 4)}:${rawStudyTime.slice(4, 6)}`;
	}

	const studyInstanceUid = getString("x0020000d") || `generated.study.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
	const seriesInstanceUid = getString("x0020000e") || `generated.series.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
	const sopInstanceUid = getString("x00080018") || `generated.sop.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
	const sopClassUid = getString("x00080016");

	const studyDescription = getString("x00081030");
	const seriesDescription = getString("x0008103e");
	const instanceNumber = getNumber("x00200013") ?? getUint16("x00200013");

	const manufacturer = getString("x00080070");
	const manufacturerModelName = getString("x00081090");
	const stationName = getString("x00081010");
	const institutionName = getString("x00080080");

	// Параметры экспозиции и дозы (СанПиН журнал)
	const kvp = getNumber("x00180060");
	const ma = getNumber("x00181151");
	const exposureTimeMs = getNumber("x00181150");
	const exposureInMas = getNumber("x0018115a");

	// DAP (Dose Area Product) теги: (0018,115E) ImageAndFluoroscopyAreaDoseProduct
	let doseAreaProductDap = getNumber("x0018115e");
	if (doseAreaProductDap === null) {
		// Резервный тег дозы (0040,0316) OrganDose
		doseAreaProductDap = getNumber("x00400316");
	}
	const ctdiVol = getNumber("x00189345");

	// Разрешение и геометрия (поддержка двоичных VR US и строковых VR IS)
	const rows = getUint16("x00280010") ?? getNumber("x00280010");
	const columns = getUint16("x00280011") ?? getNumber("x00280011");
	const bitsAllocated = getUint16("x00280100") ?? getNumber("x00280100");
	const bitsStored = getUint16("x00280101") ?? getNumber("x00280101");
	const sliceThickness = getNumber("x00180050");
	const sliceLocation = getNumber("x00201041");
	const spacingBetweenSlices = getNumber("x00180088");
	const windowCenter = getNumber("x00281050") ?? getInt16("x00281050");
	const windowWidth = getNumber("x00281051") ?? getUint16("x00281051");
	const rescaleIntercept = getNumber("x00281052");
	const rescaleSlope = getNumber("x00281053");

	// Pixel Spacing
	let pixelSpacing: [number, number] | null = null;
	const rawPixelSpacing = getString("x00280030");
	if (rawPixelSpacing) {
		const parts = rawPixelSpacing.split(/[\\/]/).map((p) => Number.parseFloat(p.trim()));
		if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
			pixelSpacing = [parts[0]!, parts[1]!];
		}
	}

	const modalityRaw = getString("x00080060");
	const modalityKind = classifyDicomModality(
		modalityRaw,
		sopClassUid,
		seriesDescription || studyDescription,
		rows,
		columns,
	);

	// Расчет оценочной эффективной дозы по СанПиН 2.6.1.1192-03
	let estimatedEffectiveDoseMsv: number | null = null;
	if (doseAreaProductDap !== null && doseAreaProductDap > 0) {
		if (doseAreaProductDap > 100) {
			// Значение в mGy*cm^2 (перевод в мЗв через коэффициент ткани 0.0001)
			estimatedEffectiveDoseMsv = Number((doseAreaProductDap * 0.0001).toFixed(4));
		} else {
			// Значение в dGy*cm^2 (перевод в мЗв через коэффициент ткани 0.0015)
			estimatedEffectiveDoseMsv = Number((doseAreaProductDap * 0.0015).toFixed(4));
		}
	} else {
		switch (modalityKind) {
			case "ct":
				estimatedEffectiveDoseMsv = 0.055; // КЛКТ челюстей — 0.055 мЗв (55 мкЗв)
				break;
			case "intraoral":
				estimatedEffectiveDoseMsv = 0.003; // Прицельный визиограф — 0.003 мЗв (3 мкЗв)
				break;
			case "panoramic":
				estimatedEffectiveDoseMsv = 0.018; // Панорама ОПТГ — 0.018 мЗв (18 мкЗв)
				break;
			case "cephalometric":
				estimatedEffectiveDoseMsv = 0.010; // ТРГ цефалометрия — 0.010 мЗв (10 мкЗв)
				break;
			default:
				estimatedEffectiveDoseMsv = 0.005;
		}
	}

	// Генерация понятного клинического названия
	let suggestedStudyTitle = "";
	const patientLabel = rawPatientName ? ` — ${rawPatientName}` : "";
	switch (modalityKind) {
		case "ct":
			suggestedStudyTitle = `КЛКТ (3D КТ)${patientLabel}`;
			break;
		case "intraoral":
			suggestedStudyTitle = `Прицельный снимок (визиограф)${patientLabel}`;
			break;
		case "panoramic":
			suggestedStudyTitle = `Панорамный снимок (ОПТГ)${patientLabel}`;
			break;
		case "cephalometric":
			suggestedStudyTitle = `Цефалометрия (ТРГ)${patientLabel}`;
			break;
		default:
			suggestedStudyTitle = `Рентгенограмма (${modalityRaw ?? "Рентген"})${patientLabel}`;
	}

	return {
		patientFullName: rawPatientName,
		patientChartNumber,
		patientBirthDate,
		patientSex,
		studyDate,
		studyTime,
		studyInstanceUid,
		seriesInstanceUid,
		sopInstanceUid,
		sopClassUid,
		studyDescription,
		seriesDescription,
		instanceNumber,
		manufacturer,
		manufacturerModelName,
		stationName,
		institutionName,
		kvp,
		ma,
		exposureTimeMs,
		exposureInMas,
		doseAreaProductDap,
		ctdiVol,
		estimatedEffectiveDoseMsv,
		rows,
		columns,
		bitsAllocated,
		bitsStored,
		pixelSpacing,
		sliceThickness,
		sliceLocation,
		spacingBetweenSlices,
		windowCenter,
		windowWidth,
		rescaleIntercept,
		rescaleSlope,
		modalityRaw,
		modalityKind,
		suggestedStudyTitle,
		warnings,
	};
}
